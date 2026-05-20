import subprocess, json

TCB = '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb'
ENV = 'cloudbase-d7gl3kh5vf6b71edc'

with open('/tmp/long_images.json') as f:
    long_images = json.load(f)

print(f'准备删除 {len(long_images)} 张超长图片...')

# 收集artist_id
artist_ids = set(a['artist_id'] for a in long_images if a.get('artist_id'))

# 删除画作
deleted = 0
for a in long_images:
    cmd_str = json.dumps([{"TableName":"artworks","CommandType":"DELETE","Command":json.dumps({"delete":"artworks","deletes":[{"q":{"_id":a['_id']},"limit":1}]})}])
    r = subprocess.run([TCB,'db','nosql','execute','-e',ENV,'--json','--command',cmd_str], capture_output=True, text=True)
    deleted += 1
    if deleted % 20 == 0:
        print(f'已删除 {deleted}/{len(long_images)}...')

print(f'画作删除完成，共 {deleted} 幅')

# 检查艺术家是否还有其他作品
print(f'检查 {len(artist_ids)} 位艺术家...')
deleted_artists = []
for artist_id in artist_ids:
    cmd_str = json.dumps([{"TableName":"artworks","CommandType":"COMMAND","Command":json.dumps({"count":"artworks","query":{"artist_id":artist_id}})}])
    r = subprocess.run([TCB,'db','nosql','execute','-e',ENV,'--json','--command',cmd_str], capture_output=True, text=True)
    try:
        result = json.loads(r.stdout)
        count = result['data']['results'][0].get('n', 0)
        if count == 0:
            # 删除艺术家
            cmd_str2 = json.dumps([{"TableName":"artists","CommandType":"DELETE","Command":json.dumps({"delete":"artists","deletes":[{"q":{"_id":artist_id},"limit":1}]})}])
            subprocess.run([TCB,'db','nosql','execute','-e',ENV,'--json','--command',cmd_str2], capture_output=True, text=True)
            deleted_artists.append(artist_id)
    except: pass

print(f'完成！删除 {deleted} 幅画作，{len(deleted_artists)} 位艺术家')
