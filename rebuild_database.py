import urllib.request, json, urllib.parse, time, subprocess, re, random
from collections import deque

DEEPSEEK_KEY = 'sk-cec8c0cdc3c54db987f6d5b48289b3ea'
TCB = '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb'
ENV = 'cloudbase-d7gl3kh5vf6b71edc'
CWD = '/Users/zhigangwen/code/src/huashuo'
PROGRESS_FILE = '/tmp/rebuild_progress.json'

# 画家信息：中文名、英文名、流派、地区
ARTISTS = [
    # 西方-文艺复兴
    {'zh':'列奥纳多·达芬奇','en':'Leonardo da Vinci','style':'文艺复兴','region':'西方'},
    {'zh':'米开朗基罗','en':'Michelangelo','style':'文艺复兴','region':'西方'},
    {'zh':'拉斐尔','en':'Raphael','style':'文艺复兴','region':'西方'},
    {'zh':'桑德罗·波提切利','en':'Sandro Botticelli','style':'文艺复兴','region':'西方'},
    {'zh':'提香','en':'Titian','style':'文艺复兴','region':'西方'},
    # 西方-巴洛克
    {'zh':'卡拉瓦乔','en':'Caravaggio','style':'巴洛克','region':'西方'},
    {'zh':'伦勃朗','en':'Rembrandt','style':'巴洛克','region':'西方'},
    {'zh':'约翰内斯·维米尔','en':'Vermeer','style':'巴洛克','region':'西方'},
    {'zh':'彼得·保罗·鲁本斯','en':'Peter Paul Rubens','style':'巴洛克','region':'西方'},
    {'zh':'迭戈·委拉斯凯兹','en':'Diego Velázquez','style':'巴洛克','region':'西方'},
    # 西方-印象派
    {'zh':'克劳德·莫奈','en':'Claude Monet','style':'印象派','region':'西方'},
    {'zh':'皮埃尔-奥古斯特·雷诺阿','en':'Pierre-Auguste Renoir','style':'印象派','region':'西方'},
    {'zh':'埃德加·德加','en':'Edgar Degas','style':'印象派','region':'西方'},
    {'zh':'爱德华·马奈','en':'Édouard Manet','style':'印象派','region':'西方'},
    {'zh':'卡米耶·毕沙罗','en':'Camille Pissarro','style':'印象派','region':'西方'},
    # 西方-后印象派
    {'zh':'文森特·梵高','en':'Vincent van Gogh','style':'后印象派','region':'西方'},
    {'zh':'保罗·塞尚','en':'Paul Cézanne','style':'后印象派','region':'西方'},
    {'zh':'保罗·高更','en':'Paul Gauguin','style':'后印象派','region':'西方'},
    {'zh':'乔治·修拉','en':'Georges Seurat','style':'后印象派','region':'西方'},
    {'zh':'亨利·德·图卢兹-劳特雷克','en':'Henri de Toulouse-Lautrec','style':'后印象派','region':'西方'},
    # 西方-现代主义
    {'zh':'巴勃罗·毕加索','en':'Pablo Picasso','style':'现代主义','region':'西方'},
    {'zh':'亨利·马蒂斯','en':'Henri Matisse','style':'现代主义','region':'西方'},
    {'zh':'萨尔瓦多·达利','en':'Salvador Dalí','style':'现代主义','region':'西方'},
    {'zh':'爱德华·蒙克','en':'Edvard Munch','style':'现代主义','region':'西方'},
    {'zh':'古斯塔夫·克里姆特','en':'Gustav Klimt','style':'现代主义','region':'西方'},
    # 中国-宋代山水
    {'zh':'范宽','en':'Fan Kuan','style':'宋代山水','region':'中国'},
    {'zh':'郭熙','en':'Guo Xi','style':'宋代山水','region':'中国'},
    {'zh':'李唐','en':'Li Tang','style':'宋代山水','region':'中国'},
    {'zh':'马远','en':'Ma Yuan','style':'宋代山水','region':'中国'},
    {'zh':'夏圭','en':'Xia Gui','style':'宋代山水','region':'中国'},
    # 中国-元代文人画
    {'zh':'赵孟頫','en':'Zhao Mengfu','style':'元代文人画','region':'中国'},
    {'zh':'黄公望','en':'Huang Gongwang','style':'元代文人画','region':'中国'},
    {'zh':'倪瓒','en':'Ni Zan','style':'元代文人画','region':'中国'},
    {'zh':'吴镇','en':'Wu Zhen','style':'元代文人画','region':'中国'},
    {'zh':'王蒙','en':'Wang Meng','style':'元代文人画','region':'中国'},
    # 中国-明代吴门
    {'zh':'沈周','en':'Shen Zhou','style':'明代吴门','region':'中国'},
    {'zh':'文徵明','en':'Wen Zhengming','style':'明代吴门','region':'中国'},
    {'zh':'唐寅','en':'Tang Yin','style':'明代吴门','region':'中国'},
    {'zh':'仇英','en':'Qiu Ying','style':'明代吴门','region':'中国'},
    # 中国-明代写意
    {'zh':'徐渭','en':'Xu Wei','style':'明代写意','region':'中国'},
    # 中国-清代扬州八怪
    {'zh':'郑板桥','en':'Zheng Xie','style':'清代扬州八怪','region':'中国'},
    {'zh':'金农','en':'Jin Nong','style':'清代扬州八怪','region':'中国'},
    {'zh':'黄慎','en':'Huang Shen','style':'清代扬州八怪','region':'中国'},
    {'zh':'李鱓','en':'Li Shan','style':'清代扬州八怪','region':'中国'},
    {'zh':'华嵒','en':'Hua Yan','style':'清代扬州八怪','region':'中国'},
]

def log(msg):
    print(msg, flush=True)

def wiki_request(url, retries=4):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url,
                headers={'User-Agent': random.choice([
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'HuaShuoApp/1.0 (educational; contact@huashuo.app)',
        ])})
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read())
        except Exception as e:
            if '429' in str(e) and attempt < retries-1:
                wait = (attempt+1) * 30
                log(f'  限流等待{wait}秒...')
                time.sleep(wait)
            else:
                raise

def get_paintings_from_category(artist_en, limit=25):
    """从英文维基分类获取画家作品列表"""
    # 尝试多个分类名格式
    categories = [
        f'Paintings by {artist_en}',
        f'{artist_en} paintings',
    ]
    for cat in categories:
        try:
            params = urllib.parse.urlencode({
                'action':'query','list':'categorymembers',
                'cmtitle':f'Category:{cat}',
                'cmlimit':limit,'cmnamespace':0,
                'format':'json','utf8':1
            })
            data = wiki_request(f'https://en.wikipedia.org/w/api.php?{params}')
            members = data['query']['categorymembers']
            if members:
                return [m['title'] for m in members]
        except:
            pass
        time.sleep(random.uniform(5,8))
    return []

def get_painting_en(en_title):
    """获取英文维基画作图片+内容"""
    params = urllib.parse.urlencode({
        'action':'query','titles':en_title,
        'prop':'extracts|pageimages',
        'format':'json','utf8':1,
        'explaintext':1,'piprop':'original'
    })
    data = wiki_request(f'https://en.wikipedia.org/w/api.php?{params}')
    page = list(data['query']['pages'].values())[0]
    if page.get('missing'): return None, None
    img = page.get('original',{}).get('source','')
    content = page.get('extract','').split('\n==')[0].strip()
    return img or None, content if len(content)>50 else None

def get_painting_zh(zh_title):
    """获取中文维基画作图片+内容"""
    params = urllib.parse.urlencode({
        'action':'query','titles':zh_title,
        'prop':'extracts|pageimages',
        'format':'json','utf8':1,
        'explaintext':1,'piprop':'original'
    })
    data = wiki_request(f'https://zh.wikipedia.org/w/api.php?{params}')
    page = list(data['query']['pages'].values())[0]
    if page.get('missing'): return None, None
    img = page.get('original',{}).get('source','')
    content = page.get('extract','').split('\n==')[0].strip()
    return img or None, content if len(content)>50 else None

def get_zh_title(en_title):
    """获取英文维基页面对应的中文标题"""
    params = urllib.parse.urlencode({
        'action':'query','titles':en_title,
        'prop':'langlinks','lllang':'zh',
        'format':'json','utf8':1
    })
    data = wiki_request(f'https://en.wikipedia.org/w/api.php?{params}')
    page = list(data['query']['pages'].values())[0]
    langlinks = page.get('langlinks',[])
    if langlinks:
        return langlinks[0]['*']
    return None

def deepseek_translate(text, retries=3):
    """英文翻译成中文+清理"""
    prompt = (
        f'请将以下英文画作介绍翻译成简体中文：\n'
        f'要求：至少300字，纯文字段落，不加任何格式符号，'
        f'只保留画作相关内容（画面描述、创作背景、艺术价值、收藏地点），'
        f'删除所有维基编辑说明。\n\n{text[:3000]}'
    )
    wait = 3
    for i in range(retries):
        try:
            payload = {"model":"deepseek-chat",
                "messages":[{"role":"user","content":prompt}],"max_tokens":1500}
            req = urllib.request.Request(
                'https://api.deepseek.com/v1/chat/completions',
                data=json.dumps(payload).encode(),
                headers={'Content-Type':'application/json',
                    'Authorization':f'Bearer {DEEPSEEK_KEY}'}
            )
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read())['choices'][0]['message']['content']
        except Exception as e:
            if i < retries-1:
                time.sleep(wait); wait *= 2
            else:
                raise

def deepseek_clean_zh(text, retries=3):
    """繁转简+清理中文内容"""
    prompt = (
        f'请处理以下画作介绍：\n'
        f'1. 繁体中文转简体中文\n'
        f'2. 删除维基编辑说明、"此条目"、"本文"等无关内容\n'
        f'3. 只输出纯文字段落，不加格式符号\n\n{text[:3000]}'
    )
    wait = 3
    for i in range(retries):
        try:
            payload = {"model":"deepseek-chat",
                "messages":[{"role":"user","content":prompt}],"max_tokens":1500}
            req = urllib.request.Request(
                'https://api.deepseek.com/v1/chat/completions',
                data=json.dumps(payload).encode(),
                headers={'Content-Type':'application/json',
                    'Authorization':f'Bearer {DEEPSEEK_KEY}'}
            )
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read())['choices'][0]['message']['content']
        except Exception as e:
            if i < retries-1:
                time.sleep(wait); wait *= 2
            else:
                raise

def collect_artist_paintings(artist, max_works=20):
    """收集一位画家的作品数据"""
    artist_zh = artist['zh']
    artist_en = artist['en']
    style = artist['style']
    region = artist['region']
    results = []

    log(f'{"="*50}')
    log(f'画家：{artist_zh}（{artist_en}）/ {style}')

    # 1. 获取作品列表
    log(f'  获取作品列表...')
    paintings_en = get_paintings_from_category(artist_en, max_works+15)
    log(f'  找到{len(paintings_en)}幅英文条目')
    time.sleep(random.uniform(10,18))

    # 2. 处理每幅画，失败加入重试队列
    retry_queue = deque()
    processed = set()

    def try_get_painting(en_title, attempt=1):
        nonlocal results
        if len(results) >= max_works:
            return
        try:
            img, en_content = get_painting_en(en_title)
            time.sleep(random.uniform(8,15))

            if not img and not en_content:
                return

            zh_title = get_zh_title(en_title)
            time.sleep(random.uniform(6,10))

            zh_content = None
            if zh_title:
                _, zh_content_raw = get_painting_zh(zh_title)
                if zh_content_raw and len(zh_content_raw) > 100:
                    zh_content = deepseek_clean_zh(zh_content_raw)
                time.sleep(random.uniform(8,15))

            final_title = zh_title or en_title
            if zh_content:
                final_desc = zh_content
            elif en_content:
                final_desc = deepseek_translate(en_content)
            else:
                return

            if not img:
                return

            results.append({
                'title': final_title,
                'title_en': en_title,
                'artist_name': artist_zh,
                'artist_name_en': artist_en,
                'style': style,
                'region': region,
                'image_url': img,
                'description': final_desc,
            })
            log(f'  ✅ [{len(results)}] {final_title} | {len(final_desc)}字')

        except Exception as e:
            if attempt <= 2:
                log(f'  ⚠️ [{attempt}次] {en_title}: {e}')
                retry_queue.append((en_title, attempt+1))
            else:
                log(f'  ❌ 放弃 {en_title}: {e}')

    # 首次处理
    for en_title in paintings_en:
        if len(results) >= max_works:
            break
        if en_title not in processed:
            processed.add(en_title)
            log(f'  → {en_title}')
            try_get_painting(en_title)
            time.sleep(random.uniform(5,8))

    # 重试失败的
    if retry_queue:
        log(f'  重试{len(retry_queue)}幅失败画作（等待30秒）...')
        time.sleep(30)
        while retry_queue and len(results) < max_works:
            en_title, attempt = retry_queue.popleft()
            log(f'  重试[{attempt}] {en_title}')
            try_get_painting(en_title, attempt)
            time.sleep(random.uniform(10,18))

    log(f'  {artist_zh} 完成：{len(results)}幅')
    return results


# ============ 主程序 ============
try:
    with open(PROGRESS_FILE) as f:
        progress = json.load(f)
    done_artists = set(progress['done_artists'])
    all_results = progress['results']
    log(f'续传：已完成{len(done_artists)}位画家，共{len(all_results)}幅')
except:
    done_artists = set()
    all_results = []
    log('全新开始')

total_artists = len(ARTISTS)
for idx, artist in enumerate(ARTISTS):
    if artist['zh'] in done_artists:
        log(f'[{idx+1}/{total_artists}] 跳过：{artist["zh"]}（已完成）')
        continue

    log(f'[{idx+1}/{total_artists}] 处理：{artist["zh"]}')
    try:
        works = collect_artist_paintings(artist, max_works=20)
        all_results.extend(works)
        done_artists.add(artist['zh'])

        with open(PROGRESS_FILE,'w') as f:
            json.dump({'done_artists':list(done_artists),'results':all_results},
                f, ensure_ascii=False)
        log(f'💾 已保存，共{len(all_results)}幅')

        time.sleep(random.uniform(15,25))  # 画家之间休息更长

    except Exception as e:
        log(f'❌ {artist["zh"]} 失败: {e}')
        time.sleep(15)

log(f'\n🎉 全部完成！共{len(all_results)}幅画作')
log(f'结果保存在 {PROGRESS_FILE}')
