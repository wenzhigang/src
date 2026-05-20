import subprocess, json, urllib.request, struct

TCB = '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb'
ENV = 'cloudbase-d7gl3kh5vf6b71edc'

def query(skip, limit):
    cmd_str = json.dumps([{"TableName":"artworks","CommandType":"QUERY","Command":json.dumps({"find":"artworks","filter":{},"projection":{"_id":1,"title":1,"artist_name":1,"artist_id":1,"image_url":1},"skip":skip,"limit":limit})}])
    r = subprocess.run([TCB,'db','nosql','execute','-e',ENV,'--json','--command',cmd_str], capture_output=True, text=True)
    data = json.loads(r.stdout)
    return data['data']['results'][0]

def get_size(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = r.read(65536)
        if data[:2] == b'\xff\xd8':
            i = 2
            while i < len(data)-8:
                if data[i]==0xff and data[i+1] in (0xc0,0xc2):
                    h,w = struct.unpack('>HH', data[i+5:i+9])
                    return w,h
                i+=1
        if data[1:4] == b'PNG':
            return struct.unpack('>II', data[16:24])
    except: pass
    return None,None

all_artworks, skip = [], 0
while True:
    batch = query(skip, 100)
    if not batch: break
    all_artworks.extend(batch)
    skip += len(batch)
    print(f'已获取 {len(all_artworks)} 幅...')
    if len(batch) < 100: break

print(f'共 {len(all_artworks)} 幅，开始检测...')
found = []
for i, a in enumerate(all_artworks):
    url = a.get('image_url','')
    if not url: continue
    w,h = get_size(url)
    if w and h:
        ratio = max(w,h)/min(w,h)
        if ratio > 10:
            found.append({**a, 'width':w, 'height':h, 'ratio':round(ratio,1)})
            print(f'  超长: {a["title"]} ({w}x{h} 比例{ratio:.1f})')
    if (i+1)%100==0: print(f'进度 {i+1}/{len(all_artworks)} 找到{len(found)}张')

print(f'\n完成！共 {len(found)} 张超长图片')
with open('/tmp/long_images.json','w') as f:
    json.dump(found, f, ensure_ascii=False, indent=2)
print('结果保存到 /tmp/long_images.json')
