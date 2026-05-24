import urllib.request, json, urllib.parse, re, time, subprocess, datetime

DEEPSEEK_KEY = 'sk-cec8c0cdc3c54db987f6d5b48289b3ea'
TCB = '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb'
ENV = 'cloudbase-d7gl3kh5vf6b71edc'
CWD = '/Users/zhigangwen/code/src/huashuo'

def log(msg):
    print(msg, flush=True)

def nosql(cmd):
    r = subprocess.run([TCB,'db','nosql','execute','-e',ENV,'--json','--command',json.dumps(cmd)],
        capture_output=True, text=True, cwd=CWD)
    return json.loads(r.stdout)

def wiki_search(query):
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
        if len(content) < 100: return None, None
        return wiki_title, content
    except:
        return None, None

def deepseek(prompt, retries=3):
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

# 读取验证结果
with open('/tmp/verify_progress.json') as f:
    p = json.load(f)

wrong = p['wrong_list']
# 只处理还没修复的（fixed字段不存在或为False）
to_fix = [a for a in wrong if not a.get('fixed', False) and a.get('id')]
log(f'待修复：{len(to_fix)}幅（用识别结果搜维基，只更新描述不改标题）')

fixed = 0
for i, a in enumerate(to_fix):
    identified = a.get('identified', '')
    if not identified:
        continue
    try:
        # 用千问识别结果搜维基
        wiki_title, wiki_content = wiki_search(identified)
        if not wiki_content:
            # 再用原标题搜
            wiki_title, wiki_content = wiki_search(a['old_title'] + ' painting')
        if not wiki_content:
            log(f'[{i+1}/{len(to_fix)}] ⏭️  {a["old_title"]} (无内容)')
            continue

        # 翻译描述，只包含画作内容
        new_desc = deepseek(
            f'请将以下英文画作介绍翻译成详细中文，至少400字，纯文字段落，'
            f'严禁任何Markdown格式符号，只包含画作相关内容：\n{wiki_content}'
        )

        if len(new_desc) < 100:
            continue

        # 只更新描述，不改标题
        nosql([{"TableName":"artworks","CommandType":"UPDATE","Command":json.dumps({
            "update":"artworks","updates":[{"q":{"_id":a['id']},"u":{"$set":{
                "description": new_desc,
                "fix_source": "verify_wiki",
                "fix_time": datetime.datetime.now().isoformat()
            }}}]
        })}])
        fixed += 1
        log(f'[{i+1}/{len(to_fix)}] ✅ {a["old_title"]} ({len(new_desc)}字)')

        if fixed % 50 == 0:
            log(f'💾 已修复{fixed}幅')

        time.sleep(0.8)

    except Exception as e:
        log(f'[{i+1}/{len(to_fix)}] ⚠️  {a["old_title"]}: {e}')
        time.sleep(3)

log(f'\n🎉 完成！共更新{fixed}幅描述')
