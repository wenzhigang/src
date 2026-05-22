import urllib.request, json, urllib.parse, re, time, subprocess, datetime

QWEN_KEY = 'sk-620074687b524de988bdafd16b9e9a70'
DEEPSEEK_KEY = 'sk-cec8c0cdc3c54db987f6d5b48289b3ea'
TCB = '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb'
ENV = 'cloudbase-d7gl3kh5vf6b71edc'
CWD = '/Users/zhigangwen/code/src/huashuo'
PROGRESS_FILE = '/tmp/scan_fix_progress.json'

QWEN_MODELS = [
    'qwen-vl-max-latest',
    'qwen-vl-max',
    'qwen2.5-vl-72b-instruct',
    'qwen-vl-plus-latest',
    'qwen-vl-plus',
    'qwen2.5-vl-7b-instruct',
    'qwen2.5-vl-3b-instruct',
]
current_model_idx = 0

def log(msg):
    print(msg, flush=True)

def nosql(cmd):
    r = subprocess.run([TCB,'db','nosql','execute','-e',ENV,'--json','--command',json.dumps(cmd)],
        capture_output=True, text=True, cwd=CWD)
    return json.loads(r.stdout)

def identify_image(url):
    global current_model_idx
    while current_model_idx < len(QWEN_MODELS):
        model = QWEN_MODELS[current_model_idx]
        try:
            payload = {"model":model,"messages":[{"role":"user","content":[
                {"type":"image_url","image_url":{"url":url}},
                {"type":"text","text":"What is the name and artist of this painting? Reply in English only, format: 'Title by Artist'. If unsure, describe the main content."}
            ]}]}
            req = urllib.request.Request(
                'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
                data=json.dumps(payload).encode(),
                headers={'Content-Type':'application/json','Authorization':f'Bearer {QWEN_KEY}'}
            )
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read())['choices'][0]['message']['content'], model
        except Exception as e:
            err = str(e)
            if any(x in err for x in ['429','quota','insufficient','403','free tier']):
                log(f'  ⬇️  {model} 额度用完，降级...')
                current_model_idx += 1
                time.sleep(2)
            else:
                raise
    raise Exception('所有千问模型额度耗尽')

def get_wiki_content(query):
    """搜索维基百科，返回完整正文（只取intro段，去掉章节标题）"""
    try:
        params = urllib.parse.urlencode({'action':'query','list':'search','srsearch':query,
            'format':'json','srlimit':1,'utf8':1})
        req = urllib.request.Request(f'https://en.wikipedia.org/w/api.php?{params}',
            headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        results = data['query']['search']
        if not results: return None, None
        wiki_title = results[0]['title']
        params2 = urllib.parse.urlencode({'action':'query','titles':wiki_title,'prop':'extracts',
            'format':'json','utf8':1,'explaintext':1})
        req2 = urllib.request.Request(f'https://en.wikipedia.org/w/api.php?{params2}',
            headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req2, timeout=10) as r:
            data2 = json.loads(r.read())
        page = list(data2['query']['pages'].values())[0]
        content = page.get('extract','')
        # 取第一个==之前的intro，最多5000字
        intro = content.split('\n==')[0].strip()[:5000]
        if len(intro) < 100: return None, None
        return wiki_title, intro
    except:
        return None, None

def get_met_content(query):
    """大都会博物馆API搜索"""
    try:
        params = urllib.parse.urlencode({'q': query, 'hasImages': 'true'})
        req = urllib.request.Request(f'https://collectionapi.metmuseum.org/public/collection/v1/search?{params}',
            headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        ids = data.get('objectIDs', [])
        if not ids: return None, None
        req2 = urllib.request.Request(f'https://collectionapi.metmuseum.org/public/collection/v1/objects/{ids[0]}',
            headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req2, timeout=10) as r:
            obj = json.loads(r.read())
        title = obj.get('title','')
        artist = obj.get('artistDisplayName','')
        date = obj.get('objectDate','')
        medium = obj.get('medium','')
        dept = obj.get('department','')
        museum = obj.get('repository','')
        content = f"{title} by {artist}. Date: {date}. Medium: {medium}. Department: {dept}. Collection: {museum}."
        if len(content) < 30: return None, None
        return title, content
    except:
        return None, None

def get_wikiart_content(query):
    """WikiArt搜索"""
    try:
        params = urllib.parse.urlencode({'term': query, 'json': '2', 'layout': 'new'})
        req = urllib.request.Request(f'https://www.wikiart.org/en/search/{urllib.parse.quote(query)}/1?json=2',
            headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        paintings = data.get('Paintings', [])
        if not paintings: return None, None
        p = paintings[0]
        title = p.get('title','')
        artist = p.get('artistName','')
        year = p.get('year','')
        content = f"{title} by {artist}, {year}. A painting from WikiArt collection."
        return title, content
    except:
        return None, None


def get_smithsonian_content(query):
    """史密森尼博物馆API"""
    try:
        params = urllib.parse.urlencode({'q': query, 'api_key': 'DEMO_KEY', 'rows': 1})
        req = urllib.request.Request(
            f'https://api.si.edu/openaccess/api/v1.0/search?{params}',
            headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        rows = data.get('response',{}).get('rows',[])
        if not rows: return None, None
        item = rows[0]
        title = item.get('title','')
        desc = item.get('content',{}).get('descriptiveNonRepeating',{})
        notes = str(desc.get('notes',''))[:2000]
        if len(notes) < 50: return None, None
        return title, notes
    except:
        return None, None

def get_wiki_zh_content(query):
    """中文维基百科（适合中国画）"""
    try:
        params = urllib.parse.urlencode({'action':'query','list':'search','srsearch':query,
            'format':'json','srlimit':1,'utf8':1})
        req = urllib.request.Request(f'https://zh.wikipedia.org/w/api.php?{params}',
            headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        results = data['query']['search']
        if not results: return None, None
        wiki_title = results[0]['title']
        params2 = urllib.parse.urlencode({'action':'query','titles':wiki_title,'prop':'extracts',
            'format':'json','utf8':1,'explaintext':1})
        req2 = urllib.request.Request(f'https://zh.wikipedia.org/w/api.php?{params2}',
            headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req2, timeout=10) as r:
            data2 = json.loads(r.read())
        page = list(data2['query']['pages'].values())[0]
        content = page.get('extract','')
        intro = content.split('\n==')[0].strip()[:5000]
        if len(intro) < 100: return None, None
        return wiki_title, intro
    except:
        return None, None

def get_aic_content(query):
    """芝加哥艺术博物馆API"""
    try:
        params = urllib.parse.urlencode({'q': query, 'limit': 1, 'fields': 'title,artist_title,date_display,medium_display,description,place_of_origin,artwork_type_title'})
        req = urllib.request.Request(
            f'https://api.artic.edu/api/v1/artworks/search?{params}',
            headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        items = data.get('data',[])
        if not items: return None, None
        item = items[0]
        title = item.get('title','')
        artist = item.get('artist_title','')
        date = item.get('date_display','')
        medium = item.get('medium_display','')
        desc = item.get('description','') or ''
        desc = re.sub(r'<[^>]+>', '', desc)
        origin = item.get('place_of_origin','')
        art_type = item.get('artwork_type_title','')
        full = f"{title} by {artist}. {date}. {medium}. {art_type}. Origin: {origin}. {desc}"
        if len(full) < 50: return None, None
        return title, full[:3000]
    except:
        return None, None

def search_all_sources(identified, title, artist):
    """按优先级搜索多个来源"""
    sources = [
        ('Wikipedia英文(识别)', lambda: get_wiki_content(identified)),
        ('Wikipedia英文(标题)', lambda: get_wiki_content(f'{title} {artist} painting')),
        ('Wikipedia中文', lambda: get_wiki_zh_content(title)),
        ('Wikipedia中文(艺术家)', lambda: get_wiki_zh_content(f'{title} {artist}')),
        ('大都会博物馆', lambda: get_met_content(identified)),
        ('芝加哥艺术博物馆', lambda: get_aic_content(identified)),
        ('芝加哥艺术博物馆(标题)', lambda: get_aic_content(title)),
        ('WikiArt', lambda: get_wikiart_content(identified)),
        ('史密森尼博物馆', lambda: get_smithsonian_content(identified)),
    ]
    for source_name, fn in sources:
        try:
            wiki_title, content = fn()
            if content and len(content) >= 100:
                return wiki_title, content, source_name
        except:
            continue
    return None, None, None

def deepseek_process(title, artist, identified, wiki_title, wiki_content, source, retries=3):
    prompt = (
        f'原画作标题：{title}，作者：{artist}\n'
        f'图片AI识别结果：{identified}\n'
        f'参考资料来源：{source}，标题：{wiki_title}\n'
        f'参考内容：{wiki_content[:3500]}\n\n'
        f'请完成以下任务并输出JSON：\n'
        f'1. matched：判断图片识别结果和原标题是否一致（同一作品的不同译名、别名也算一致，返回true；图片是完全不同的作品才返回false）\n'
        f'2. title_zh：如不一致，给出正确中文标题；一致则保持原标题\n'
        f'3. title_en：对应英文标题\n'
        f'4. description：根据参考内容写一段完整的中文画作介绍，要求：\n'
        f'   - 至少400字，内容完整不截断\n'
        f'   - 只包含画作本身的信息：画面内容、创作背景、艺术价值、收藏地点\n'
        f'   - 不包含任何与画作无关的内容（如维基百科的编辑说明、参考资料等）\n'
        f'   - 纯文字段落，严禁任何Markdown格式符号（**、##、==等）\n\n'
        f'只输出JSON，格式：{{"matched":true/false,"title_zh":"...","title_en":"...","description":"..."}}'
    )
    wait = 3
    for i in range(retries):
        try:
            payload = {"model":"deepseek-chat",
                "messages":[{"role":"user","content":prompt}],"max_tokens":3000}
            req = urllib.request.Request(
                'https://api.deepseek.com/v1/chat/completions',
                data=json.dumps(payload).encode(),
                headers={'Content-Type':'application/json','Authorization':f'Bearer {DEEPSEEK_KEY}'}
            )
            with urllib.request.urlopen(req, timeout=60) as r:
                result = json.loads(r.read())
            text = result['choices'][0]['message']['content'].strip()
            text = re.sub(r'^```json\s*|\s*```$', '', text, flags=re.MULTILINE).strip()
            return json.loads(text)
        except Exception as e:
            if i < retries-1:
                log(f'  DeepSeek重试{i+1}/{retries}: {e}')
                time.sleep(wait)
                wait *= 2
            else:
                raise

# 加载进度
try:
    with open(PROGRESS_FILE) as f:
        progress = json.load(f)
    done_ids = set(progress['done_ids'])
    fixed_count = progress['fixed_count']
    skipped_count = progress['skipped_count']
    log(f'续传：已完成{len(done_ids)}幅，已修复{fixed_count}幅')
except:
    done_ids = set()
    fixed_count = 0
    skipped_count = 0
    log('全新开始')

# 获取所有画作
log('获取画作列表...')
all_artworks = []
skip = 0
while True:
    res = nosql([{"TableName":"artworks","CommandType":"QUERY","Command":json.dumps({
        "find":"artworks","filter":{},"projection":{"_id":1,"title":1,"artist_name":1,"image_url":1},
        "skip":skip,"limit":100
    })}])
    batch = res['data']['results'][0]
    if not batch: break
    all_artworks.extend(batch)
    skip += len(batch)
    if len(batch) < 100: break

total = len(all_artworks)
log(f'共{total}幅，待处理{total-len(done_ids)}幅\n')

for i, a in enumerate(all_artworks):
    if a['_id'] in done_ids:
        continue
    url = a.get('image_url','')
    if not url:
        done_ids.add(a['_id'])
        continue

    try:
        # 1. 千问识别
        identified, used_model = identify_image(url)

        # 2. 多源搜索
        wiki_title, wiki_content, source = search_all_sources(identified, a['title'], a['artist_name'])

        if not wiki_content:
            done_ids.add(a['_id'])
            skipped_count += 1
            log(f'[{i+1}/{total}] ⏭️  {a["title"]} (所有来源无结果)')
            continue

        # 3. DeepSeek判断+翻译
        result = deepseek_process(a['title'], a['artist_name'], identified, wiki_title, wiki_content, source)
        matched = result.get('matched', True)
        new_desc = result.get('description','')
        new_title = result.get('title_zh', a['title'])
        new_title_en = result.get('title_en','')

        if not matched and new_desc and len(new_desc) >= 100:
            update_data = {
                "description": new_desc,
                "fix_source": source,
                "fix_time": datetime.datetime.now().isoformat(),
                "fix_model": used_model
            }
            if new_title and new_title != a['title']:
                update_data['title'] = new_title
                update_data['title_en'] = new_title_en
            nosql([{"TableName":"artworks","CommandType":"UPDATE","Command":json.dumps({
                "update":"artworks","updates":[{"q":{"_id":a['_id']},"u":{"$set":update_data}}]
            })}])
            fixed_count += 1
            log(f'[{i+1}/{total}] ❌→✅ [{used_model}/{source}] {a["title"]} -> {new_title} ({len(new_desc)}字)')
        else:
            log(f'[{i+1}/{total}] ✅  [{used_model}] {a["title"]}')

        done_ids.add(a['_id'])

        if len(done_ids) % 50 == 0:
            with open(PROGRESS_FILE, 'w') as f:
                json.dump({'done_ids':list(done_ids),'fixed_count':fixed_count,'skipped_count':skipped_count}, f)
            log(f'💾 进度已保存，已修复{fixed_count}幅，跳过{skipped_count}幅')

        time.sleep(0.5)

    except Exception as e:
        log(f'[{i+1}/{total}] ⚠️  {a["title"]}: {e}')
        time.sleep(3)

with open(PROGRESS_FILE, 'w') as f:
    json.dump({'done_ids':list(done_ids),'fixed_count':fixed_count,'skipped_count':skipped_count}, f)
log(f'\n🎉 全部完成！共修复{fixed_count}幅，跳过{skipped_count}幅')
