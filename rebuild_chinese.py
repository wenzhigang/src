import urllib.request, json, urllib.parse, time, subprocess, re, random
from collections import deque

DEEPSEEK_KEY = 'sk-cec8c0cdc3c54db987f6d5b48289b3ea'
TCB = '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb'
ENV = 'cloudbase-d7gl3kh5vf6b71edc'
CWD = '/Users/zhigangwen/code/src/huashuo'
PROGRESS_FILE = '/tmp/rebuild_chinese_progress.json'

# 需要补充的画家
ARTISTS = [
    # 中国画家
    {'zh':'范宽','en':'Fan Kuan','style':'宋代山水','region':'中国'},
    {'zh':'郭熙','en':'Guo Xi','style':'宋代山水','region':'中国'},
    {'zh':'李唐','en':'Li Tang (painter)','style':'宋代山水','region':'中国'},
    {'zh':'马远','en':'Ma Yuan (painter)','style':'宋代山水','region':'中国'},
    {'zh':'夏圭','en':'Xia Gui','style':'宋代山水','region':'中国'},
    {'zh':'赵孟頫','en':'Zhao Mengfu','style':'元代文人画','region':'中国'},
    {'zh':'黄公望','en':'Huang Gongwang','style':'元代文人画','region':'中国'},
    {'zh':'倪瓒','en':'Ni Zan','style':'元代文人画','region':'中国'},
    {'zh':'吴镇','en':'Wu Zhen (painter)','style':'元代文人画','region':'中国'},
    {'zh':'王蒙','en':'Wang Meng (painter)','style':'元代文人画','region':'中国'},
    {'zh':'沈周','en':'Shen Zhou','style':'明代吴门','region':'中国'},
    {'zh':'文徵明','en':'Wen Zhengming','style':'明代吴门','region':'中国'},
    {'zh':'唐寅','en':'Tang Yin','style':'明代吴门','region':'中国'},
    {'zh':'仇英','en':'Qiu Ying','style':'明代吴门','region':'中国'},
    {'zh':'徐渭','en':'Xu Wei (painter)','style':'明代写意','region':'中国'},
    {'zh':'郑板桥','en':'Zheng Xie','style':'清代扬州八怪','region':'中国'},
    {'zh':'金农','en':'Jin Nong','style':'清代扬州八怪','region':'中国'},
    {'zh':'黄慎','en':'Huang Shen (painter)','style':'清代扬州八怪','region':'中国'},
    {'zh':'李鱓','en':'Li Shan (painter)','style':'清代扬州八怪','region':'中国'},
    {'zh':'华嵒','en':'Hua Yan (painter)','style':'清代扬州八怪','region':'中国'},
    # 西方不足的
    {'zh':'米开朗基罗','en':'Michelangelo','style':'文艺复兴','region':'西方'},
    {'zh':'约翰内斯·维米尔','en':'Vermeer','style':'巴洛克','region':'西方'},
    {'zh':'乔治·修拉','en':'Georges Seurat','style':'后印象派','region':'西方'},
    {'zh':'迭戈·委拉斯凯兹','en':'Diego Velázquez','style':'巴洛克','region':'西方'},
    {'zh':'萨尔瓦多·达利','en':'Salvador Dalí','style':'现代主义','region':'西方'},
    {'zh':'亨利·德·图卢兹-劳特雷克','en':'Henri de Toulouse-Lautrec','style':'后印象派','region':'西方'},
    {'zh':'巴勃罗·毕加索','en':'Pablo Picasso','style':'现代主义','region':'西方'},
]

# 已有画作数量
with open('/tmp/rebuild_progress.json') as f:
    existing = json.load(f)
existing_counts = {}
for r in existing['results']:
    existing_counts[r['artist_name']] = existing_counts.get(r['artist_name'], 0) + 1

def log(msg):
    print(msg, flush=True)

def wiki_request(url, retries=4):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': random.choice([
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
                'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0',
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

def get_zh_artist_works(artist_zh, limit=30):
    """从中文维基获取画家的作品分类页面"""
    # 搜索"画家名 作品"或直接用分类
    results = []
    
    # 方法1：搜索画家相关页面
    params = urllib.parse.urlencode({
        'action':'query','list':'search',
        'srsearch':f'{artist_zh}',
        'format':'json','srlimit':50,'utf8':1
    })
    data = wiki_request(f'https://zh.wikipedia.org/w/api.php?{params}')
    items = data['query']['search']
    
    # 过滤出可能是画作的页面（排除画家本人传记）
    for item in items:
        title = item['title']
        snippet = item.get('snippet','')
        # 画作通常包含这些词
        if (artist_zh not in title and 
            any(w in snippet+title for w in ['图','画','图卷','图轴','册','卷','轴'])):
            results.append(title)
    
    # 方法2：获取画家页面里的链接（画作链接）
    time.sleep(random.uniform(5,8))
    try:
        page_params = urllib.parse.urlencode({
            'action':'query','titles':artist_zh,
            'prop':'links','pllimit':100,
            'format':'json','utf8':1
        })
        data2 = wiki_request(f'https://zh.wikipedia.org/w/api.php?{page_params}')
        page = list(data2['query']['pages'].values())[0]
        links = [l['title'] for l in page.get('links',[])]
        # 过滤出可能是画作的链接
        for link in links:
            if (link not in results and artist_zh not in link and
                any(w in link for w in ['图','画','图卷','图轴','册','卷','轴'])):
                results.append(link)
    except:
        pass
    
    return results[:limit]

def get_en_artist_works_search(artist_en, limit=30):
    """用英文维基搜索画家作品"""
    params = urllib.parse.urlencode({
        'action':'query','list':'search',
        'srsearch':f'{artist_en} painting',
        'format':'json','srlimit':limit,'utf8':1
    })
    data = wiki_request(f'https://en.wikipedia.org/w/api.php?{params}')
    results = data['query']['search']
    # 过滤掉画家传记
    titles = []
    for r in results:
        title = r['title']
        if artist_en.split()[0] not in title or 'painting' in title.lower() or 'work' in title.lower():
            titles.append(title)
    return titles[:limit]

def get_painting_zh(title):
    params = urllib.parse.urlencode({
        'action':'query','titles':title,'prop':'extracts|pageimages',
        'format':'json','utf8':1,'explaintext':1,'piprop':'original'
    })
    data = wiki_request(f'https://zh.wikipedia.org/w/api.php?{params}')
    page = list(data['query']['pages'].values())[0]
    if page.get('missing'): return None, None
    img = page.get('original',{}).get('source','')
    content = page.get('extract','').split('\n==')[0].strip()
    return img or None, content if len(content)>50 else None

def get_painting_en(title):
    params = urllib.parse.urlencode({
        'action':'query','titles':title,'prop':'extracts|pageimages',
        'format':'json','utf8':1,'explaintext':1,'piprop':'original'
    })
    data = wiki_request(f'https://en.wikipedia.org/w/api.php?{params}')
    page = list(data['query']['pages'].values())[0]
    if page.get('missing'): return None, None
    img = page.get('original',{}).get('source','')
    content = page.get('extract','').split('\n==')[0].strip()
    return img or None, content if len(content)>50 else None

def get_zh_title_from_en(en_title):
    params = urllib.parse.urlencode({
        'action':'query','titles':en_title,
        'prop':'langlinks','lllang':'zh',
        'format':'json','utf8':1
    })
    data = wiki_request(f'https://en.wikipedia.org/w/api.php?{params}')
    page = list(data['query']['pages'].values())[0]
    langlinks = page.get('langlinks',[])
    return langlinks[0]['*'] if langlinks else None

def deepseek_process(text, is_english=False, retries=3):
    if is_english:
        prompt = (
            f'请将以下英文画作介绍翻译成简体中文：\n'
            f'要求：至少400字，纯文字段落，不加格式符号，\n'
            f'只保留画作相关内容（画面描述、创作背景、艺术价值、收藏地点），\n'
            f'删除所有维基编辑说明。\n\n{text[:3000]}'
        )
    else:
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
                headers={'Content-Type':'application/json','Authorization':f'Bearer {DEEPSEEK_KEY}'}
            )
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read())['choices'][0]['message']['content']
        except Exception as e:
            if i < retries-1:
                time.sleep(wait); wait *= 2
            else:
                raise

def collect_artist(artist, need=20):
    artist_zh = artist['zh']
    artist_en = artist['en']
    style = artist['style']
    region = artist['region']
    
    have = existing_counts.get(artist_zh, 0)
    still_need = need - have
    if still_need <= 0:
        log(f'  {artist_zh} 已有{have}幅，跳过')
        return []
    
    log(f'\n{"="*50}')
    log(f'画家：{artist_zh} | 已有{have}幅，还需{still_need}幅')
    results = []
    retry_queue = deque()

    # 获取作品列表
    if region == '中国':
        log('  → 中文维基搜索...')
        candidates = get_zh_artist_works(artist_zh, 40)
        log(f'  找到{len(candidates)}个候选')
        time.sleep(random.uniform(8,12))
        # 也用英文维基补充
        en_candidates = []
        try:
            from_en_cat = get_en_category(artist_en, 20)
            en_candidates = from_en_cat
            log(f'  英文维基补充{len(en_candidates)}个')
        except:
            pass
    else:
        log('  → 英文维基分类搜索...')
        candidates_en = get_en_category(artist_en, 40)
        candidates = candidates_en
        en_candidates = []
        log(f'  找到{len(candidates)}个候选')
    time.sleep(random.uniform(8,12))

    def get_en_category(artist_en, limit):
        categories = [f'Paintings by {artist_en}', f'{artist_en} paintings']
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

    def process_zh_candidate(zh_title):
        nonlocal results
        if len(results) >= still_need: return
        try:
            img, content = get_painting_zh(zh_title)
            time.sleep(random.uniform(8,12))
            if img and content:
                desc = deepseek_process(content, is_english=False)
                results.append({
                    'title': zh_title, 'title_en': '',
                    'artist_name': artist_zh, 'artist_name_en': artist_en,
                    'style': style, 'region': region,
                    'image_url': img, 'description': desc,
                })
                log(f'  ✅ [{len(results)}] {zh_title} | {len(desc)}字')
            elif img:
                log(f'  ⚠️ {zh_title} 有图无文')
            else:
                log(f'  ⚠️ {zh_title} 无图')
        except Exception as e:
            retry_queue.append(('zh', zh_title))
            log(f'  ❌ {zh_title}: {e}')
        time.sleep(random.uniform(5,8))

    def process_en_candidate(en_title):
        nonlocal results
        if len(results) >= still_need: return
        try:
            img, content = get_painting_en(en_title)
            time.sleep(random.uniform(8,12))
            if not img and not content: return
            
            zh_title = get_zh_title_from_en(en_title)
            time.sleep(random.uniform(5,8))
            
            zh_content = None
            if zh_title:
                _, zh_raw = get_painting_zh(zh_title)
                if zh_raw and len(zh_raw) > 100:
                    zh_content = deepseek_process(zh_raw, is_english=False)
                time.sleep(random.uniform(8,12))
            
            final_title = zh_title or en_title
            if zh_content:
                final_desc = zh_content
            elif content:
                final_desc = deepseek_process(content, is_english=True)
            else:
                return
            if not img: return
            
            results.append({
                'title': final_title, 'title_en': en_title,
                'artist_name': artist_zh, 'artist_name_en': artist_en,
                'style': style, 'region': region,
                'image_url': img, 'description': final_desc,
            })
            log(f'  ✅ [{len(results)}] {final_title} | {len(final_desc)}字')
        except Exception as e:
            retry_queue.append(('en', en_title))
            log(f'  ❌ {en_title}: {e}')
        time.sleep(random.uniform(5,8))

    # 处理候选
    if region == '中国':
        for c in candidates:
            if len(results) >= still_need: break
            process_zh_candidate(c)
        for c in en_candidates:
            if len(results) >= still_need: break
            process_en_candidate(c)
    else:
        for c in candidates:
            if len(results) >= still_need: break
            process_en_candidate(c)

    # 重试
    if retry_queue and len(results) < still_need:
        log(f'  重试{len(retry_queue)}幅（等30秒）...')
        time.sleep(30)
        while retry_queue and len(results) < still_need:
            kind, title = retry_queue.popleft()
            if kind == 'zh':
                process_zh_candidate(title)
            else:
                process_en_candidate(title)

    log(f'  {artist_zh} 新增：{len(results)}幅')
    return results

# ============ 主程序 ============
try:
    with open(PROGRESS_FILE) as f:
        progress = json.load(f)
    done_artists = set(progress['done_artists'])
    new_results = progress['results']
    log(f'续传：已完成{len(done_artists)}位，共{len(new_results)}幅')
except:
    done_artists = set()
    new_results = []
    log('全新开始')

for idx, artist in enumerate(ARTISTS):
    if artist['zh'] in done_artists:
        log(f'[{idx+1}/{len(ARTISTS)}] 跳过：{artist["zh"]}')
        continue
    
    log(f'[{idx+1}/{len(ARTISTS)}] 处理：{artist["zh"]}')
    try:
        works = collect_artist(artist, need=20)
        new_results.extend(works)
        done_artists.add(artist['zh'])
        
        with open(PROGRESS_FILE,'w') as f:
            json.dump({'done_artists':list(done_artists),'results':new_results},
                f, ensure_ascii=False)
        log(f'💾 已保存，新增共{len(new_results)}幅')
        time.sleep(random.uniform(15,25))
    except Exception as e:
        log(f'❌ {artist["zh"]}: {e}')
        time.sleep(15)

# 合并到主进度文件
with open('/tmp/rebuild_progress.json') as f:
    main = json.load(f)
main['results'].extend(new_results)
with open('/tmp/rebuild_progress.json','w') as f:
    json.dump(main, f, ensure_ascii=False)

total = len(main['results'])
log(f'\n🎉 完成！主库现有{total}幅画作')
