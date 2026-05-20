import subprocess, json

TCB = '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb'
ENV = 'cloudbase-d7gl3kh5vf6b71edc'

def nosql(cmd):
    r = subprocess.run([TCB,'db','nosql','execute','-e',ENV,'--json','--command',json.dumps(cmd)], capture_output=True, text=True)
    return json.loads(r.stdout)

def get_count(n_val):
    if isinstance(n_val, dict):
        return int(n_val.get('$numberInt', n_val.get('$numberLong', 0)))
    return int(n_val)

# 获取所有艺术家
print('获取艺术家列表...')
all_artists = []
skip = 0
while True:
    res = nosql([{"TableName":"artists","CommandType":"QUERY","Command":json.dumps({"find":"artists","filter":{},"projection":{"_id":1,"name":1},"skip":skip,"limit":100})}])
    batch = res['data']['results'][0]
    if not batch: break
    all_artists.extend(batch)
    skip += len(batch)
    if len(batch) < 100: break

print(f'共 {len(all_artists)} 位艺术家，检查作品数量...')
to_delete = []
for i, artist in enumerate(all_artists):
    res = nosql([{"TableName":"artworks","CommandType":"COMMAND","Command":json.dumps({"count":"artworks","query":{"artist_id":artist['_id']}})}])
    n = res['data']['results'][0][0].get('n', 0)
    count = get_count(n)
    if count == 0:
        to_delete.append(artist)
        print(f'  无作品: {artist["name"]}')
    if (i+1) % 50 == 0:
        print(f'进度 {i+1}/{len(all_artists)}，待删除 {len(to_delete)} 位')

print(f'\n共 {len(to_delete)} 位艺术家无作品，开始删除...')
for artist in to_delete:
    nosql([{"TableName":"artists","CommandType":"DELETE","Command":json.dumps({"delete":"artists","deletes":[{"q":{"_id":artist['_id']},"limit":1}]})}])
    print(f'  已删除: {artist["name"]}')

print(f'完成！共删除 {len(to_delete)} 位无作品艺术家')
