import urllib.request, json, urllib.parse, re, time, subprocess

QWEN_KEY = 'sk-620074687b524de988bdafd16b9e9a70'
DEEPSEEK_KEY = 'sk-cec8c0cdc3c54db987f6d5b48289b3ea'
TCB = '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb'
ENV = 'cloudbase-d7gl3kh5vf6b71edc'
CWD = '/Users/zhigangwen/code/src/huashuo'

def nosql(cmd):
    r = subprocess.run([TCB,'db','nosql','execute','-e',ENV,'--json','--command',json.dumps(cmd)], capture_output=True, text=True, cwd=CWD)
    return json.loads(r.stdout)

def identify_image(url):
    payload = {"model":"qwen-vl-plus","messages":[{"role":"user","content":[
        {"type":"image_url","image_url":{"url":url}},
        {"type":"text","text":"What is the name and artist of this painting? Reply in English only, format: 'Title by Artist'"}
    ]}]}
    req = urllib.request.Request(
        'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        data=json.dumps(payload).encode(),
        headers={'Content-Type':'application/json','Authorization':f'Bearer {QWEN_KEY}'}
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())['choices'][0]['message']['content']

def wiki_search(query):
    params = urllib.parse.urlencode({'action':'query','list':'search','srsearch':query,'format':'json','srlimit':1,'utf8':1})
    req = urllib.request.Request(f'https://en.wikipedia.org/w/api.php?{params}', headers={'User-Agent':'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as r:
        data = json.loads(r.read())
    results = data['query']['search']
    if not results: return None, None
    title = results[0]['title']
    params2 = urllib.parse.urlencode({'action':'query','titles':title,'prop':'extracts','exintro':1,'format':'json','utf8':1})
    req2 = urllib.request.Request(f'https://en.wikipedia.org/w/api.php?{params2}', headers={'User-Agent':'Mozilla/5.0'})
    with urllib.request.urlopen(req2, timeout=10) as r:
        data2 = json.loads(r.read())
    page = list(data2['query']['pages'].values())[0]
    content = re.sub(r'<[^>]+>', '', page.get('extract',''))
    return title, content[:2000]

def deepseek(prompt, max_tokens=800):
    payload = {"model":"deepseek-chat","messages":[{"role":"user","content":prompt}],"max_tokens":max_tokens}
    req = urllib.request.Request(
        'https://api.deepseek.com/v1/chat/completions',
        data=json.dumps(payload).encode(),
        headers={'Content-Type':'application/json','Authorization':f'Bearer {DEEPSEEK_KEY}'}
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())['choices'][0]['message']['content']

# 读取待处理列表
with open('/tmp/wrong_100.json') as f:
    artworks = json.load(f)

print(f'处理 {len(artworks)} 幅不匹配画作')
fixed = []
deleted = []

for i, a in enumerate(artworks):
    print(f'\n[{i+1}/{len(artworks)}] {a["title"]} / {a["artist"]}')
    
    try:
        # 1. 千问识别
        identified = identify_image(a['url'])
        print(f'  千问识别：{identified}')
        
        # 2. 用识别结果+原标题各搜一次维基，取最相关
        wiki_title1, wiki_content1 = wiki_search(identified)
        wiki_title2, wiki_content2 = wiki_search(f'{a["title"]} {a["artist"]} painting')
        print(f'  维基1：{wiki_title1}')
        print(f'  维基2：{wiki_title2}')
        
        # 3. DeepSeek选择最合适的维基结果
        best = deepseek(
            f'原标题：《{a["title"]}》作者：{a["artist"]}\n'
            f'千问识别：{identified}\n'
            f'维基结果1：{wiki_title1}\n'
            f'维基结果2：{wiki_title2}\n'
            f'请选择哪个维基结果更准确描述了图片内容（不是原标题）？只回答"1"或"2"或"都不准确"',
            max_tokens=10
        )
        print(f'  最佳维基：{best}')
        
        wiki_content = wiki_content1 if '1' in best else wiki_content2 if '2' in best else None
        wiki_title = wiki_title1 if '1' in best else wiki_title2 if '2' in best else None
        
        if wiki_content:
            # 4. 翻译维基内容为中文描述
            new_desc = deepseek(
                f'请将以下英文画作介绍翻译成中文，语言流畅自然，直接输出正文段落，不加标题序号：\n{wiki_content}',
                max_tokens=1000
            )
            
            # 5. 更新数据库描述
            nosql([{"TableName":"artworks","CommandType":"UPDATE","Command":json.dumps({
                "update":"artworks",
                "updates":[{"q":{"_id":a['_id']},"u":{"$set":{"description":new_desc,"description_source":"wikipedia_corrected"}}}]
            })}])
            print(f'  ✅ 已更新描述（{len(new_desc)}字）')
            fixed.append({**a, 'new_wiki_title': wiki_title, 'new_desc_preview': new_desc[:100]})
        else:
            print(f'  ⚠️ 维基内容不可靠，跳过')
            
    except Exception as e:
        print(f'  ❌ 错误：{e}')
    
    time.sleep(1)

print(f'\n完成！成功修复 {len(fixed)} 幅')
with open('/tmp/fixed_artworks.json', 'w') as f:
    json.dump(fixed, f, ensure_ascii=False, indent=2)
