#!/usr/bin/env python3
import json, time, os, sys, re, hashlib, argparse, subprocess, requests
from datetime import datetime

TCB_BIN     = "/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb"
ENV_ID      = "cloudbase-d7gl3kh5vf6b71edc"
PROJECT_DIR = "/Users/zhigangwen/code/src/huashuo"
IMG_DIR     = "/tmp/supplement_images"
CLOUD_BASE  = "https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/"
TARGET      = 20

PAINTER_CONFIG = {
    "郭熙":   {"en":"Guo Xi","style":"宋代山水","keywords_zh":["郭熙"],"keywords_en":["Guo Xi"]},
    "范宽":   {"en":"Fan Kuan","style":"宋代山水","keywords_zh":["范宽"],"keywords_en":["Fan Kuan"]},
    "李唐":   {"en":"Li Tang painter","style":"宋代山水","keywords_zh":["李唐"],"keywords_en":["Li Tang"]},
    "马远":   {"en":"Ma Yuan painter","style":"宋代山水","keywords_zh":["马远"],"keywords_en":["Ma Yuan"]},
    "夏圭":   {"en":"Xia Gui","style":"宋代山水","keywords_zh":["夏圭"],"keywords_en":["Xia Gui"]},
    "吴镇":   {"en":"Wu Zhen painter","style":"元代文人画","keywords_zh":["吴镇"],"keywords_en":["Wu Zhen"]},
    "倪瓒":   {"en":"Ni Zan","style":"元代文人画","keywords_zh":["倪瓒"],"keywords_en":["Ni Zan"]},
    "王蒙":   {"en":"Wang Meng painter","style":"元代文人画","keywords_zh":["王蒙"],"keywords_en":["Wang Meng"]},
    "赵孟頫": {"en":"Zhao Mengfu","style":"元代文人画","keywords_zh":["赵孟頫"],"keywords_en":["Zhao Mengfu"]},
    "徐渭":   {"en":"Xu Wei artist","style":"明代写意","keywords_zh":["徐渭"],"keywords_en":["Xu Wei"]},
    "郑板桥": {"en":"Zheng Xie","style":"清代扬州八怪","keywords_zh":["郑板桥","郑燮"],"keywords_en":["Zheng Xie","Zheng Banqiao"]},
    "金农":   {"en":"Jin Nong","style":"清代扬州八怪","keywords_zh":["金农"],"keywords_en":["Jin Nong"]},
    "黄慎":   {"en":"Huang Shen","style":"清代扬州八怪","keywords_zh":["黄慎"],"keywords_en":["Huang Shen"]},
    "华嵒":   {"en":"Hua Yan painter","style":"清代扬州八怪","keywords_zh":["华嵒","华岩","华喦"],"keywords_en":["Hua Yan"]},
    "李鱓":   {"en":"Li Shan painter","style":"清代扬州八怪","keywords_zh":["李鱓","李复堂"],"keywords_en":["Li Shan"]},
    "米开朗基罗":     {"en":"Michelangelo","style":"文艺复兴","keywords_zh":["米开朗基罗"],"keywords_en":["Michelangelo"]},
    "约翰内斯·维米尔": {"en":"Johannes Vermeer","style":"巴洛克","keywords_zh":["维米尔"],"keywords_en":["Vermeer"]},
    "迭戈·委拉斯凯兹": {"en":"Diego Velazquez","style":"巴洛克","keywords_zh":["委拉斯凯兹","维拉斯奎兹"],"keywords_en":["Velazquez","Velázquez"]},
    "乔治·修拉":     {"en":"Georges Seurat","style":"后印象派","keywords_zh":["修拉","乔治·修拉"],"keywords_en":["Seurat"]},
    "萨尔瓦多·达利":  {"en":"Salvador Dali","style":"现代主义","keywords_zh":["达利","萨尔瓦多·达利"],"keywords_en":["Dali","Dalí"]},
    "亨利·德·图卢兹-劳特雷克": {"en":"Henri de Toulouse-Lautrec","style":"后印象派","keywords_zh":["劳特雷克","图卢兹"],"keywords_en":["Toulouse-Lautrec","Lautrec"]},
    "提香":   {"en":"Titian","style":"文艺复兴","keywords_zh":["提香"],"keywords_en":["Titian"]},
    "埃德加·德加":   {"en":"Edgar Degas","style":"印象派","keywords_zh":["德加"],"keywords_en":["Degas"]},
    "卡米耶·毕沙罗":  {"en":"Camille Pissarro","style":"印象派","keywords_zh":["毕沙罗"],"keywords_en":["Pissarro"]},
    "保罗·高更":    {"en":"Paul Gauguin","style":"后印象派","keywords_zh":["高更"],"keywords_en":["Gauguin"]},
    "巴勃罗·毕加索":  {"en":"Pablo Picasso","style":"现代主义","keywords_zh":["毕加索"],"keywords_en":["Picasso"]},
}

WIKI_ZH = "https://zh.wikipedia.org/w/api.php"
WIKI_EN = "https://en.wikipedia.org/w/api.php"

HEADERS = {"User-Agent": "Mozilla/5.0 ArtBot/1.0"}

def wiki_search(query, lang="en", limit=20):
    api = WIKI_ZH if lang=="zh" else WIKI_EN
    try:
        r = requests.get(api, params={"action":"query","format":"json","list":"search","srsearch":query,"srlimit":limit}, headers=HEADERS, timeout=15)
        return [x["title"] for x in r.json().get("query",{}).get("search",[])]
    except: return []

def wiki_thumbnail(title, lang="en", size=960):
    api = WIKI_ZH if lang=="zh" else WIKI_EN
    other_lang = "zh" if lang=="en" else "en"
    try:
        r = requests.get(api, params={"action":"query","format":"json","titles":title,
            "prop":"pageimages|langlinks","piprop":"thumbnail","pithumbsize":size,
            "lllimit":5,"lllang":other_lang}, headers=HEADERS, timeout=15)
        pages = r.json().get("query",{}).get("pages",{})
        for pid,page in pages.items():
            if pid=="-1": continue
            img = page.get("thumbnail",{}).get("source","")
            other = next((ll.get("*","") for ll in page.get("langlinks",[])), "")
            return img, other
    except: pass
    return "", ""

def wiki_extract(title, lang="zh"):
    api = WIKI_ZH if lang=="zh" else WIKI_EN
    try:
        r = requests.get(api, params={"action":"query","format":"json","titles":title,
            "prop":"extracts","exintro":True,"explaintext":True,"exchars":300}, headers=HEADERS, timeout=15)
        pages = r.json().get("query",{}).get("pages",{})
        for pid,page in pages.items():
            if pid!="-1": return page.get("extract","").strip()
    except: pass
    return ""

def tcb_query_titles(artist_name):
    cmd = [TCB_BIN,"db","nosql","execute","-e",ENV_ID,"--json","--command",
           json.dumps([{"TableName":"artworks","CommandType":"QUERY",
                        "Command":json.dumps({"find":"artworks","filter":{"artist_name":artist_name},
                                              "projection":{"title":1},"limit":200})}])]
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=PROJECT_DIR)
    if r.returncode!=0: return set()
    data = json.loads(r.stdout)
    results = data.get("data",{}).get("results",[[]])[0]
    return {rec.get("title","") for rec in results} - {""}

def tcb_count(artist_name):
    cmd = [TCB_BIN,"db","nosql","execute","-e",ENV_ID,"--json","--command",
           json.dumps([{"TableName":"artworks","CommandType":"QUERY",
                        "Command":json.dumps({"find":"artworks","filter":{"artist_name":artist_name},
                                              "projection":{"_id":1},"limit":200})}])]
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=PROJECT_DIR)
    if r.returncode!=0: return 0
    return len(json.loads(r.stdout).get("data",{}).get("results",[[]])[0])

def tcb_insert(records):
    for i in range(0,len(records),20):
        batch=records[i:i+20]
        cmd=[TCB_BIN,"db","nosql","execute","-e",ENV_ID,"--json","--command",
             json.dumps([{"TableName":"artworks","CommandType":"INSERT",
                          "Command":json.dumps({"insert":"artworks","documents":batch})}])]
        r=subprocess.run(cmd,capture_output=True,text=True,cwd=PROJECT_DIR)
        print(f"  {'✓' if r.returncode==0 else '✗'} 写入 {len(batch)} 条")
        time.sleep(0.5)

def process_image(wiki_url, artist_name, title):
    os.makedirs(IMG_DIR, exist_ok=True)
    h = hashlib.md5((artist_name+title).encode()).hexdigest()[:6]
    safe = re.sub(r'[^\w\u4e00-\u9fff]','_',artist_name)[:20]
    fname = f"{safe}_{h}.jpg"
    local = os.path.join(IMG_DIR, fname)
    if not os.path.exists(local):
        try:
            resp = requests.get(wiki_url, headers={"User-Agent":"ArtBot/1.0"}, timeout=30)
            if resp.status_code==200 and len(resp.content)>5000:
                with open(local,"wb") as f: f.write(resp.content)
            else: return None
        except: return None
    # 压缩到<1MB
    try:
        from PIL import Image as PILImage
        with PILImage.open(local) as img:
            if os.path.getsize(local) > 1024*1024:
                if img.mode != 'RGB': img = img.convert('RGB')
                w,h = img.size
                if max(w,h)>1920:
                    scale=1920/max(w,h)
                    img=img.resize((int(w*scale),int(h*scale)),PILImage.LANCZOS)
                for q in [85,75,65,55]:
                    img.save(local,'JPEG',quality=q,optimize=True)
                    if os.path.getsize(local)<1024*1024: break
    except: pass
    cmd=[TCB_BIN,"storage","upload","-e",ENV_ID,local,f"images/artworks/{fname}"]
    r=subprocess.run(cmd,capture_output=True,text=True,cwd=PROJECT_DIR)
    return (CLOUD_BASE+fname) if r.returncode==0 else None

def supplement_one(painter_name):
    if painter_name not in PAINTER_CONFIG:
        print(f"未找到配置: {painter_name}"); return
    cfg = PAINTER_CONFIG[painter_name]
    style = cfg["style"]
    current = tcb_count(painter_name)
    need = TARGET - current
    print(f"\n{'='*50}\n{painter_name} | {style} | 当前{current}幅 需补{need}幅")
    if need<=0: print("  已达标"); return

    existing = tcb_query_titles(painter_name)
    seen = set(existing)
    candidates = []  # (title, lang)

    # 英文搜索（西方画家优先英文）
    for kw in cfg["keywords_en"]:
        for t in wiki_search(f"{kw} painting", "en"):
            key=f"en:{t}"
            if key not in seen and any(k.lower() in t.lower() for k in cfg["keywords_en"]):
                seen.add(key); candidates.append((t,"en"))
        time.sleep(0.3)
        for t in wiki_search(kw, "en"):
            key=f"en:{t}"
            if key not in seen and any(k.lower() in t.lower() for k in cfg["keywords_en"]):
                seen.add(key); candidates.append((t,"en"))
        time.sleep(0.3)

    # 中文搜索
    for kw in cfg["keywords_zh"]:
        for t in wiki_search(kw, "zh"):
            if t not in seen and any(k in t for k in cfg["keywords_zh"]):
                seen.add(t); candidates.append((t,"zh"))
        time.sleep(0.3)

    print(f"  候选: {len(candidates)}")
    new_records = []

    for title, lang in candidates:
        if len(new_records)>=need: break
        print(f"  [{lang}] {title}")
        img_url, other = wiki_thumbnail(title, lang)
        if not img_url and other:
            other_lang = "zh" if lang=="en" else "en"
            img_url, _ = wiki_thumbnail(other, other_lang)
        if not img_url:
            print("    → 无图"); time.sleep(0.3); continue

        # 中文显示标题
        if lang=="zh":
            display = title
        else:
            display = other if other else title

        if display in existing:
            print("    → 重复"); continue

        desc = wiki_extract(display,"zh") if lang=="zh" or other else ""
        if not desc and lang=="en":
            desc = wiki_extract(title,"en")
        if not desc: desc = f"{painter_name}的作品《{display}》"

        cloud_url = process_image(img_url, painter_name, display)
        if not cloud_url:
            print("    → 上传失败"); continue

        rec = {"title":display,"artist_name":painter_name,"style":style,
               "image_url":cloud_url,"description":desc[:500],
               "source":"wikipedia","created_at":datetime.now().isoformat()}
        if lang=="en": rec["wiki_title_en"]=title
        new_records.append(rec)
        existing.add(display)
        print(f"    ✓ {display}")
        time.sleep(0.5)

    if new_records:
        tcb_insert(new_records)
        print(f"  完成！当前: {tcb_count(painter_name)} 幅")

def print_stats():
    cmd=[TCB_BIN,"db","nosql","execute","-e",ENV_ID,"--json","--command",
         json.dumps([{"TableName":"artworks","CommandType":"QUERY",
                      "Command":json.dumps({"find":"artworks","filter":{},
                                            "projection":{"artist_name":1},"limit":2000})}])]
    r=subprocess.run(cmd,capture_output=True,text=True,cwd=PROJECT_DIR)
    data=json.loads(r.stdout)
    results=data.get("data",{}).get("results",[[]])[0]
    from collections import Counter
    counts=Counter(x["artist_name"] for x in results)
    print(f"\n{'='*50}\n  共 {sum(counts.values())} 幅 / {len(counts)} 位画家\n{'='*50}")
    for a,c in sorted(counts.items(),key=lambda x:x[1]):
        print(f"  {a:15s} {c:3d} {'█'*(c//2)} {'✓' if c>=TARGET else f'↑{TARGET-c}'}")

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--painter")
    parser.add_argument("--all",action="store_true")
    parser.add_argument("--stats",action="store_true")
    args=parser.parse_args()
    os.makedirs(IMG_DIR,exist_ok=True)
    if args.stats: print_stats(); exit()
    if args.painter:
        for name in args.painter.split(","):
            try: supplement_one(name.strip())
            except Exception as e: print(f"[ERROR] {name}: {e}")
        print_stats()
    elif args.all:
        print_stats()
        for name in PAINTER_CONFIG:
            try: supplement_one(name); time.sleep(1)
            except KeyboardInterrupt: break
            except Exception as e: print(f"[ERROR] {name}: {e}")
        print_stats()
