import urllib.request, json, urllib.parse, re, time, subprocess, sys

QWEN_KEY = 'sk-620074687b524de988bdafd16b9e9a70'
DEEPSEEK_KEY = 'sk-cec8c0cdc3c54db987f6d5b48289b3ea'
TCB = '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb'
ENV = 'cloudbase-d7gl3kh5vf6b71edc'
CWD = '/Users/zhigangwen/code/src/huashuo'
PROGRESS_FILE = '/tmp/scan_fix_progress.json'

# 模型按优先级排列，额度用完自动降级
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
                {"type":"text","text":"What is the name and artist of this painting? Reply in English only, format: 'Title by Artist'"}
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
            if '429' in err or 'quota' in err.lower() or 'insufficient' in err.lower() or '403' in err:
                log(f'  ⬇️ {model} 额度用完，降级...')
                current_model_idx += 1
            else:
                raise
    raise Exception('所有千问模型额度耗尽')

def wiki_search_and_get(query):
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
        content = page.get('extract','')[:5000]
        return wiki_title, content
    except:
        return None, None

def deepseek_process(title, artist, identified, wiki_title, wiki_content, retries=3):
    prompt = (
        f'原画作标题：《{title}》，作者：{artist}\n'
        f'图片识别结果：{identified}\n'
        f'维基百科标题：{wiki_title}\n'
        f'维基百科内容：{wiki_content[:3000]}\n\n'
        f'请完成：\n'
        f'1. 判断图片内容是否和原标题匹配（名字相近也算匹配）\n'
        f'2. 如不匹配，给出正确的中文标题和英文标题\n'
        f'3. 将维基百科内容翻译成详细中文介绍，纯文字段落，不加任何Markdown格式符号\n\n'
        f'输出JSON：{{"matched":true/false,"title_zh":"...","title_en":"...","description":"..."}}\n'
        f'只输出JSON。'
    )
    wait = 3
    for i in range(retries):
        try:
            payload = {"model":"deepseek-chat",
                "messages":[{"role":"user","content":prompt}],"max_tokens":2000}
            req = urllib.request.Request(
                'https://api.deepseek.com/v1/chat/completions',
                data=json.dumps(payload).encode(),
                headers={'Content-Type':'application/json','Authorization':f'Bearer {DEEPSEEK_KEY}'}
            )
            with urllib.request.urlopen(req, timeout=40) as r:
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
remaining = total - len(done_ids)
log(f'共{total}幅，待处理{remaining}幅\n')

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
        
        # 2. 维基搜索
        wiki_title, wiki_content = wiki_search_and_get(identified)
        if not wiki_content:
            wiki_title, wiki_content = wiki_search_and_get(f'{a["title"]} {a["artist_name"]} painting')

        if not wiki_content:
            done_ids.add(a['_id'])
            skipped_count += 1
            log(f'[{i+1}/{total}] ⏭️  {a["title"]} (维基无结果)')
            continue

        # 3. DeepSeek判断+翻译
        result = deepseek_process(a['title'], a['artist_name'], identified, wiki_title, wiki_content)
        matched = result.get('matched', True)
        new_desc = result.get('description','')
        new_title = result.get('title_zh','')
        new_title_en = result.get('title_en','')

        if not matched and new_desc and len(new_desc) >= 100:
            update_data = {"description": new_desc}
            if new_title and new_title != a['title']:
                update_data['title'] = new_title
                update_data['title_en'] = new_title_en
            nosql([{"TableName":"artworks","CommandType":"UPDATE","Command":json.dumps({
                "update":"artworks","updates":[{"q":{"_id":a['_id']},"u":{"$set":update_data}}]
            })}])
            fixed_count += 1
            log(f'[{i+1}/{total}] ❌→✅ [{used_model}] {a["title"]} -> {new_title or "标题不变"} ({len(new_desc)}字)')
        else:
            log(f'[{i+1}/{total}] ✅  {a["title"]} (匹配)')

        done_ids.add(a['_id'])

        if len(done_ids) % 50 == 0:
            with open(PROGRESS_FILE, 'w') as f:
                json.dump({'done_ids':list(done_ids),'fixed_count':fixed_count,'skipped_count':skipped_count}, f)
            log(f'💾 进度已保存，已修复{fixed_count}幅，已跳过{skipped_count}幅')

        time.sleep(1)

    except Exception as e:
        log(f'[{i+1}/{total}] ⚠️  {a["title"]}: {e}')
        time.sleep(3)
        continue

with open(PROGRESS_FILE, 'w') as f:
    json.dump({'done_ids':list(done_ids),'fixed_count':fixed_count,'skipped_count':skipped_count}, f)
log(f'\n🎉 全部完成！共修复{fixed_count}幅，跳过{skipped_count}幅')
