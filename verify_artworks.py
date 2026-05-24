import urllib.request, json, urllib.parse, re, time, subprocess, datetime

QWEN_KEY = 'sk-620074687b524de988bdafd16b9e9a70'
DEEPSEEK_KEY = 'sk-cec8c0cdc3c54db987f6d5b48289b3ea'
TCB = '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb'
ENV = 'cloudbase-d7gl3kh5vf6b71edc'
CWD = '/Users/zhigangwen/code/src/huashuo'
PROGRESS_FILE = '/tmp/verify_progress.json'

QWEN_MODELS = [
    'qwen-vl-max-latest','qwen-vl-max','qwen2.5-vl-72b-instruct',
    'qwen-vl-plus-latest','qwen-vl-plus','qwen2.5-vl-7b-instruct','qwen2.5-vl-3b-instruct',
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
                {"type":"text","text":"What is the exact name and artist of this painting? Be specific. Reply in English only, format: 'Title by Artist'"}
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
            if any(x in err for x in ['429','quota','insufficient','403']):
                log(f'  ⬇️  {model} 额度用完，降级...')
                current_model_idx += 1
                time.sleep(2)
            else:
                raise
    raise Exception('所有千问模型额度耗尽')

def deepseek_verify(title, artist, identified, retries=3):
    """严格判断：图片识别结果是否和标题是同一幅画"""
    prompt = (
        f'画作标题：《{title}》，作者：{artist}\n'
        f'图片识别结果：{identified}\n\n'
        f'请严格判断：图片识别结果和画作标题是否是同一幅画？\n'
        f'判断规则：\n'
        f'- 同一幅画的不同译名算匹配（如"维纳斯的诞生"和"Venus Birth"）\n'
        f'- 同一画家的不同作品不算匹配（如"乌尔比诺的维纳斯"和"镜前的维纳斯"是不同作品）\n'
        f'- 只回答JSON：{{"matched": true/false, "reason": "简短说明"}}'
    )
    wait = 3
    for i in range(retries):
        try:
            payload = {"model":"deepseek-chat",
                "messages":[{"role":"user","content":prompt}],"max_tokens":100}
            req = urllib.request.Request(
                'https://api.deepseek.com/v1/chat/completions',
                data=json.dumps(payload).encode(),
                headers={'Content-Type':'application/json','Authorization':f'Bearer {DEEPSEEK_KEY}'}
            )
            with urllib.request.urlopen(req, timeout=30) as r:
                result = json.loads(r.read())
            text = result['choices'][0]['message']['content'].strip()
            text = re.sub(r'^```json\s*|\s*```$', '', text, flags=re.MULTILINE).strip()
            return json.loads(text)
        except Exception as e:
            if i < retries-1:
                time.sleep(wait); wait *= 2
            else:
                raise

def wiki_full(query):
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
        content = page.get('extract','').split('\n==')[0].strip()[:5000]
        return wiki_title, content
    except:
        return None, None

def deepseek_translate(wiki_title, wiki_content, retries=3):
    prompt = (
        f'请将以下英文画作介绍翻译成详细中文，至少400字，纯文字段落，'
        f'严禁任何Markdown格式符号，只包含画作相关内容：\n{wiki_content}'
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
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read())['choices'][0]['message']['content']
        except Exception as e:
            if i < retries-1:
                time.sleep(wait); wait *= 2
            else:
                raise

# 加载进度
try:
    with open(PROGRESS_FILE) as f:
        progress = json.load(f)
    done_ids = set(progress['done_ids'])
    wrong_list = progress['wrong_list']
    fixed_count = progress['fixed_count']
    log(f'续传：已完成{len(done_ids)}幅，发现{len(wrong_list)}幅不匹配，已修复{fixed_count}幅')
except:
    done_ids = set()
    wrong_list = []
    fixed_count = 0
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
        time.sleep(0.3)

        # 2. DeepSeek严格判断
        verify = deepseek_verify(a['title'], a['artist_name'], identified)
        matched = verify.get('matched', True)
        reason = verify.get('reason', '')

        if not matched:
            # 3. 搜索正确内容
            wiki_title, wiki_content = wiki_full(identified)
            if wiki_content:
                new_desc = deepseek_translate(wiki_title, wiki_content)
                # 从识别结果提取中文标题
                new_title_prompt = f'识别结果：{identified}\n维基标题：{wiki_title}\n请给出最准确的中文画作名称，只输出名称，不加任何符号。'
                new_title = deepseek_translate('', new_title_prompt)
                new_title = new_title.strip().replace('《','').replace('》','')

                update_data = {
                    "description": new_desc,
                    "fix_source": "verify_scan",
                    "fix_time": datetime.datetime.now().isoformat()
                }
                if new_title and new_title != a['title']:
                    update_data['title'] = new_title

                nosql([{"TableName":"artworks","CommandType":"UPDATE","Command":json.dumps({
                    "update":"artworks","updates":[{"q":{"_id":a['_id']},"u":{"$set":update_data}}]
                })}])
                fixed_count += 1
                log(f'[{i+1}/{total}] ❌→✅ [{used_model}] {a["title"]} -> {new_title} | {reason}')
                wrong_list.append({"id":a['_id'],"old_title":a['title'],"new_title":new_title,"identified":identified,"reason":reason})
            else:
                log(f'[{i+1}/{total}] ❌⚠️  [{used_model}] {a["title"]} (不匹配但维基无结果) | {reason}')
                wrong_list.append({"id":a['_id'],"old_title":a['title'],"identified":identified,"reason":reason,"fixed":False})
        else:
            if (i+1) % 100 == 0:
                log(f'[{i+1}/{total}] ✅  进度正常，发现{len(wrong_list)}幅不匹配，已修复{fixed_count}幅')

        done_ids.add(a['_id'])

        if len(done_ids) % 50 == 0:
            with open(PROGRESS_FILE, 'w') as f:
                json.dump({'done_ids':list(done_ids),'wrong_list':wrong_list,'fixed_count':fixed_count}, f)
            log(f'💾 已保存，发现{len(wrong_list)}幅不匹配，修复{fixed_count}幅')

        time.sleep(0.8)

    except Exception as e:
        log(f'[{i+1}/{total}] ⚠️  {a["title"]}: {e}')
        time.sleep(3)

with open(PROGRESS_FILE, 'w') as f:
    json.dump({'done_ids':list(done_ids),'wrong_list':wrong_list,'fixed_count':fixed_count}, f)
log(f'\n🎉 验证完成！发现{len(wrong_list)}幅不匹配，修复{fixed_count}幅')
