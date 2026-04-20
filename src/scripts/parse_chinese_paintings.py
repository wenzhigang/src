import os, json, re
from pathlib import Path
from collections import defaultdict

SOURCE_DIR = "/Volumes/PortableSSD/历代中国画"
OUTPUT_FILE = "/Users/zhigangwen/code/src/huashuo/src/scripts/paintings_list.json"

SKIP_FILENAMES = {"更多美术资源.jpg", "观音 标签.jpg"}
SKIP_FILENAME_PATTERNS = [r"^\._", r"^img\d+", r"^\d+[-\d]*\.jpg$", r"^ceye\d", r"^标題\.jpg$", r"^[A-Z]{2}-MAK"]
DYNASTY_MAP = {"战国":"战国","北齐":"北齐","晋":"晋","隋":"隋","唐":"唐","五代":"五代","宋":"宋","辽":"辽","金":"金","元":"元","明":"明","清":"清"}
ALBUM_DIRS_KEYWORDS = ["册页","册","图册","十开","八开","十二开","六开","十六开","图卷","长卷","手卷","水浒人物","山水花卉","扇面"]

def parse_filename(filename, parent_dir_name, dynasty, artist_hint=None):
    stem = Path(filename).stem
    if filename in SKIP_FILENAMES: return None
    for pat in SKIP_FILENAME_PATTERNS:
        if re.search(pat, filename, re.IGNORECASE): return None
    for kw in ["书法","行草","楷书","行书","草书","题跋","拓本","拓片","字副本"]:
        if kw in stem and "图" not in stem and "画" not in stem: return None
    if re.match(r"^\d+(\s*\(\d+\))?$", stem):
        return (artist_hint, parent_dir_name) if artist_hint else None
    if re.match(r"^[a-zA-Z]{1,3}\s*[\(\[]\s*\d+\s*[\)\]](\s*副本)?$", stem):
        return (artist_hint, parent_dir_name) if artist_hint else None
    patterns = [
        r"^(?:北宋|南宋|明末清初|明清|明末|清末|[唐宋元明清晋隋辽金战国五代北齐东晋]+)\s+([^\s\d（(【]{2,5})\s+(.+?)(?:\s*[\d×xX\(（【].*)?$",
        r"^([^\s\d（(【]{2,4})\s+(.+?)(?:\s*[\d×xX\(（【].*)?$",
    ]
    for pat in patterns:
        m = re.match(pat, stem.strip())
        if m:
            artist = m.group(1).strip()
            title_raw = m.group(2).strip()
            title = re.sub(r'\s*(绢本|纸本|立轴|手卷|全卷|画心|画芯|副本|最清晰|最佳|最佳版|二版|一版|ok|OK|新版|旧版|hx|李斌).*$', '', title_raw, flags=re.IGNORECASE).strip()
            title = re.sub(r'\s*[\d.]+[xX×]\d+.*$', '', title).strip()
            title = title.rstrip('（(【- _')
            if len(artist) >= 2 and len(title) >= 2:
                return (artist, title)
    if artist_hint:
        clean = re.sub(r'^(?:北宋|南宋|明末清初|明清|明末|清末|[唐宋元明清晋隋辽金战国五代北齐东晋]+)\s*', '', stem)
        clean = re.sub(r'^' + re.escape(artist_hint), '', clean).strip()
        clean = re.sub(r'\s*(绢本|纸本|全卷|副本|最佳|OK|ok).*$', '', clean, flags=re.IGNORECASE).strip()
        clean = re.sub(r'\s*[\d.]+[xX×]\d+.*$', '', clean).strip()
        clean = clean.rstrip('（(【- _')
        if len(clean) >= 2:
            return (artist_hint, clean)
        return (artist_hint, parent_dir_name)
    return None

def get_artist_from_dir(dirpath):
    parts = Path(dirpath).parts
    source_parts = Path(SOURCE_DIR).parts
    rel = parts[len(source_parts):]
    if len(rel) >= 2:
        candidate = rel[1]
        skip_dirs = {"团扇","名家","图页","十人册页","佚名","淘宝：名画资源店","元 佚名","宋 佚名","南宋赵芾江山万里图卷","雪渔图","仙萼长春图最佳版","明-清 佚名(李公麟款)","八大山人 朱耷"}
        if candidate not in skip_dirs and "淘宝" not in candidate and "佚名" not in candidate:
            clean = re.sub(r'[\d\s（(【].*$', '', candidate).strip()
            if 2 <= len(clean) <= 8:
                return clean
    return None

def scan():
    results = []
    seen = defaultdict(list)

    for root, dirs, files in os.walk(SOURCE_DIR):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        rel_root = os.path.relpath(root, SOURCE_DIR)
        parts = Path(rel_root).parts
        dynasty = parts[0] if parts and parts[0] in DYNASTY_MAP else "未知"
        artist_hint = get_artist_from_dir(root)
        parent_dir_name = Path(root).name
        is_album_dir = any(kw in parent_dir_name for kw in ALBUM_DIRS_KEYWORDS)
        jpg_files = [f for f in sorted(files) if f.lower().endswith(('.jpg','.jpeg','.png')) and not f.startswith('._')]
        if not jpg_files: continue

        all_numbered = all(
            re.match(r'^\d+(\s*[\(\（]\d+[\)\）])?(\s*副本)?$', Path(f).stem) or
            re.match(r'^[a-zA-Z]{1,4}\s*[\(\[]\s*\d+\s*[\)\]](\s*副本)?$', Path(f).stem) or
            re.match(r'^(rx|df|hss|SD\d|DP-|AK-|gx)\s*[\(\[（]?\d+[\)\]）]?(\s*副本)?$', Path(f).stem)
            for f in jpg_files
        )

        if is_album_dir and all_numbered and artist_hint:
            sorted_files = sorted(jpg_files, key=lambda f: [int(x) if x.isdigit() else x for x in re.findall(r'\d+|\D+', f)])
            primary = os.path.join(root, sorted_files[0])
            extras = [os.path.join(root, f) for f in sorted_files[1:]]
            key = (artist_hint, parent_dir_name)
            seen[key].append({"primary":primary,"extras":extras,"dynasty":dynasty,"artist":artist_hint,"title":parent_dir_name,"is_album":True})
            continue

        for fname in jpg_files:
            if "旧版" in fname: continue
            fpath = os.path.join(root, fname)
            parsed = parse_filename(fname, parent_dir_name, dynasty, artist_hint)
            if not parsed:
                print(f"  ⚠️  跳过: {os.path.relpath(fpath, SOURCE_DIR)}")
                continue
            artist, title = parsed
            key = (artist, title)
            seen[key].append({"primary":fpath,"extras":[],"dynasty":dynasty,"artist":artist,"title":title,"is_album":False})

    for key, versions in seen.items():
        if len(versions) == 1:
            results.append(versions[0])
        else:
            def score(v):
                p = v["primary"]
                s = 0
                if "最佳" in p or "最清晰" in p: s += 10
                if "新版" in p: s += 5
                if "旧版" in p: s -= 5
                if "副本" in p and "最佳" not in p: s -= 2
                return s
            best = max(versions, key=score)
            for v in versions:
                if v is not best and ("分段" in v["primary"] or re.search(r'卷[12]', v["primary"])):
                    best["extras"].append(v["primary"])
            results.append(best)

    output = [{"seq":i,"dynasty":item["dynasty"],"artist":item["artist"],"title":item["title"],"is_album":item["is_album"],"primary_path":item["primary"],"extra_paths":item["extras"][:15]} for i,item in enumerate(results,1)]

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    dynasties = defaultdict(int)
    artists = set()
    for item in output:
        dynasties[item["dynasty"]] += 1
        artists.add(item["artist"])

    print(f"\n✅ 解析完成: {len(output)} 幅画作 / {len(artists)} 位画家")
    print("\n朝代分布:")
    for d, c in sorted(dynasties.items()):
        print(f"  {d}: {c} 幅")

scan()