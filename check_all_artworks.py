import urllib.request, json, time, subprocess

API_KEY = 'sk-620074687b524de988bdafd16b9e9a70'
TCB = '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb'
ENV = 'cloudbase-d7gl3kh5vf6b71edc'

def nosql(cmd):
    r = subprocess.run([TCB,'db','nosql','execute','-e',ENV,'--json','--command',json.dumps(cmd)], capture_output=True, text=True, cwd='/Users/zhigangwen/code/src/huashuo')
    return json.loads(r.stdout)

def check_image(url, title, artist):
    payload = {
        "model": "qwen-vl-plus",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": url}},
                {"type": "text", "text": f'这张图片是否是画作《{title}》（作者：{artist}）？请只回答"是"或"否"，然后用一句话说明图片实际内容。'}
            ]
        }]
    }
    try:
        req = urllib.request.Request(
            'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
            data=json.dumps(payload).encode(),
            headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {API_KEY}'}
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            result = json.loads(r.read())
        return result['choices'][0]['message']['content']
    except Exception as e:
        return f'ERROR: {e}'

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

print(f'共 {len(all_artworks)} 幅，开始检查...')

# 支持断点续传
try:
    with open('/tmp/check_all_results.json') as f:
        results = json.load(f)
    done_ids = {r['_id'] for r in results}
    print(f'已有 {len(results)} 条记录，继续从断点检查')
except:
    results = []
    done_ids = set()

wrong = [r for r in results if r.get('is_wrong')]

for i, a in enumerate(all_artworks):
    if a['_id'] in done_ids:
        continue
    
    url = a.get('image_url', '')
    if not url:
        continue
    
    answer = check_image(url, a['title'], a['artist_name'])
    is_wrong = answer.startswith('否')
    result = {
        '_id': a['_id'],
        'title': a['title'],
        'artist': a['artist_name'],
        'url': url,
        'answer': answer,
        'is_wrong': is_wrong
    }
    results.append(result)
    if is_wrong:
        wrong.append(result)
        print(f'[{i+1}/{len(all_artworks)}] ❌ {a["title"]} -> {answer[:80]}')
    else:
        if (i+1) % 100 == 0:
            print(f'[{i+1}/{len(all_artworks)}] 进度正常，发现 {len(wrong)} 幅错误')

    # 每100条保存一次
    if (i+1) % 100 == 0:
        with open('/tmp/check_all_results.json', 'w') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        with open('/tmp/wrong_artworks.json', 'w') as f:
            json.dump(wrong, f, ensure_ascii=False, indent=2)

# 最终保存
with open('/tmp/check_all_results.json', 'w') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
with open('/tmp/wrong_artworks.json', 'w') as f:
    json.dump(wrong, f, ensure_ascii=False, indent=2)

print(f'\n完成！共检查 {len(results)} 幅，发现 {len(wrong)} 幅图片与标题不匹配')
print('错误列表保存到 /tmp/wrong_artworks.json')
