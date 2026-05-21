import urllib.request, json, time, subprocess

QWEN_KEY = 'sk-620074687b524de988bdafd16b9e9a70'
DEEPSEEK_KEY = 'sk-cec8c0cdc3c54db987f6d5b48289b3ea'
TCB = '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb'
ENV = 'cloudbase-d7gl3kh5vf6b71edc'
CWD = '/Users/zhigangwen/code/src/huashuo'

def nosql(cmd):
    r = subprocess.run([TCB,'db','nosql','execute','-e',ENV,'--json','--command',json.dumps(cmd)], capture_output=True, text=True, cwd=CWD)
    return json.loads(r.stdout)

def identify_image(url, model='qwen-vl-max'):
    payload = {
        "model": model,
        "messages": [{"role":"user","content":[
            {"type":"image_url","image_url":{"url":url}},
            {"type":"text","text":"请识别这幅画作的名称和作者，用中文回答。如不确定请描述画面主要内容。"}
        ]}]
    }
    req = urllib.request.Request(
        'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        data=json.dumps(payload).encode(),
        headers={'Content-Type':'application/json','Authorization':f'Bearer {QWEN_KEY}'},
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())['choices'][0]['message']['content']

def check_match(title, artist, image_desc):
    payload = {
        "model": "deepseek-chat",
        "messages": [{"role":"user","content":
            f'画作标题：《{title}》，作者：{artist}\n图片识别结果：{image_desc}\n\n判断图片识别结果是否和画作标题/作者匹配（名字稍有不同但意思相同也算匹配）。只回答"匹配"或"不匹配"。'
        }],
        "max_tokens": 10
    }
    req = urllib.request.Request(
        'https://api.deepseek.com/v1/chat/completions',
        data=json.dumps(payload).encode(),
        headers={'Content-Type':'application/json','Authorization':f'Bearer {DEEPSEEK_KEY}'},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())['choices'][0]['message']['content']

# 获取所有画作
print('获取画作列表...')
all_artworks = []
skip = 0
while True:
    res = nosql([{"TableName":"artworks","CommandType":"QUERY","Command":json.dumps({"find":"artworks","filter":{},"projection":{"_id":1,"title":1,"artist_name":1,"image_url":1},"skip":skip,"limit":100})}])
    batch = res['data']['results'][0]
    if not batch: break
    all_artworks.extend(batch)
    skip += len(batch)
    if len(batch) < 100: break
print(f'共 {len(all_artworks)} 幅')

# 断点续传
try:
    with open('/tmp/check_v2_results.json') as f:
        results = json.load(f)
    done_ids = {r['_id'] for r in results}
    print(f'续传：已完成 {len(done_ids)} 幅')
except:
    results = []
    done_ids = set()

wrong = [r for r in results if r.get('is_wrong')]
current_model = 'qwen-vl-max'

for i, a in enumerate(all_artworks):
    if a['_id'] in done_ids:
        continue
    url = a.get('image_url','')
    if not url:
        continue

    # 识别图片，额度不足自动降级
    image_desc = None
    for model in ['qwen-vl-max','qwen-vl-plus']:
        try:
            image_desc = identify_image(url, model)
            current_model = model
            break
        except Exception as e:
            if '429' in str(e) or '403' in str(e):
                print(f'  {model} 额度不足，降级...')
                continue
            break

    if not image_desc:
        continue

    # DeepSeek判断匹配
    try:
        match = check_match(a['title'], a['artist_name'], image_desc)
        is_wrong = '不匹配' in match
    except Exception as e:
        is_wrong = False
        match = f'ERROR:{e}'

    result = {'_id':a['_id'],'title':a['title'],'artist':a['artist_name'],
              'url':url,'image_desc':image_desc,'match':match,'is_wrong':is_wrong,'model':current_model}
    results.append(result)
    if is_wrong:
        wrong.append(result)
        print(f'[{i+1}/{len(all_artworks)}] ❌ {a["title"]} | {image_desc[:60]}')
    elif (i+1) % 100 == 0:
        print(f'[{i+1}/{len(all_artworks)}] 进度正常，发现{len(wrong)}幅错误，模型:{current_model}')

    if (i+1) % 50 == 0:
        with open('/tmp/check_v2_results.json','w') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        with open('/tmp/wrong_v2.json','w') as f:
            json.dump(wrong, f, ensure_ascii=False, indent=2)
    time.sleep(0.3)

with open('/tmp/check_v2_results.json','w') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
with open('/tmp/wrong_v2.json','w') as f:
    json.dump(wrong, f, ensure_ascii=False, indent=2)
print(f'\n完成！检查{len(results)}幅，发现{len(wrong)}幅不匹配')
