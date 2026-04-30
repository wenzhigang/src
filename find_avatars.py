#!/usr/bin/env python3
"""
为中国艺术家找头像：
1. 先用代表作图片作为头像（从artworks数据库取第一幅画）
2. 同步到云数据库
"""
import json, subprocess, time

ENV_ID = 'cloudbase-d7gl3kh5vf6b71edc'
TCB = '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb'

# 加载艺术家
with open('/Users/zhigangwen/code/src/huashuo/src/scripts/artists_data.json') as f:
    artists = [json.loads(l) for l in f if l.strip()]

# 加载画作
artworks = []
for fpath in [
    '/Users/zhigangwen/code/src/huashuo/src/scripts/artworks_data.json',
    '/Users/zhigangwen/code/src/huashuo/src/scripts/new_chinese_artworks.json',
]:
    with open(fpath) as f:
        for line in f:
            line = line.strip()
            if line:
                artworks.append(json.loads(line))

# 按艺术家名建索引，取第一幅画的图片
artist_artwork_map = {}
for aw in artworks:
    name = aw.get('artist_name', '')
    if name not in artist_artwork_map and aw.get('image_url'):
        artist_artwork_map[name] = aw['image_url']

# 找需要更新头像的艺术家
no_avatar = []
for a in artists:
    url = a.get('avatar_url', '')
    if not url or 'portrait_' not in url:
        no_avatar.append(a)

print(f'需要更新头像: {len(no_avatar)} 位')

# 更新本地文件
updated_local = 0
artists_map = {a['_id']: a for a in artists}

for a in no_avatar:
    name = a['name']
    if name in artist_artwork_map:
        artists_map[a['_id']]['avatar_url'] = artist_artwork_map[name]
        updated_local += 1

# 保存本地
with open('/Users/zhigangwen/code/src/huashuo/src/scripts/artists_data.json', 'w') as f:
    for a in artists_map.values():
        f.write(json.dumps(a, ensure_ascii=False) + '\n')

print(f'本地更新: {updated_local} 条')

# 只同步有变化的记录到云端
print('同步到云端...')
success = fail = 0
updated_artists = [a for a in artists_map.values()
                   if a['_id'] in {x['_id'] for x in no_avatar}
                   and a.get('avatar_url')]

for i, a in enumerate(updated_artists):
    cmd = [{"TableName": "artists", "CommandType": "COMMAND", "Command": json.dumps({
        "findAndModify": "artists",
        "query": {"_id": a['_id']},
        "update": {"$set": {"avatar_url": a['avatar_url']}},
        "upsert": False,
        "new": True
    })}]
    result = subprocess.run(
        [TCB, 'db', 'nosql', 'execute', '--env-id', ENV_ID,
         '--command', json.dumps(cmd), '--json'],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        success += 1
    else:
        fail += 1

    if (i+1) % 50 == 0:
        print(f'  [{i+1}/{len(updated_artists)}] 成功:{success} 失败:{fail}')

print(f'\n完成! 成功:{success} 失败:{fail}')
