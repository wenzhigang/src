#!/usr/bin/env python3
import json, subprocess, sys

ENV_ID = 'cloudbase-d7gl3kh5vf6b71edc'
TCB = '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb'

def query(skip=0):
    cmd = [{"TableName": "artworks", "CommandType": "COMMAND", "Command": json.dumps({
        "find": "artworks",
        "filter": {"origin": "chinese"},
        "projection": {"_id": 1, "title": 1, "artist_name": 1},
        "skip": skip,
        "limit": 100
    })}]
    r = subprocess.run([TCB, 'db', 'nosql', 'execute', '--env-id', ENV_ID, '--command', json.dumps(cmd), '--json'],
                       capture_output=True, text=True)
    try:
        out = json.loads(r.stdout)
        return out.get('result', {}).get('result', [])
    except:
        print(r.stdout[:300])
        return []

all_data = []
skip = 0
while True:
    batch = query(skip)
    if not batch:
        break
    all_data.extend(batch)
    skip += 100
    sys.stderr.write(f'已获取 {len(all_data)} 条\n')

# 输出列表
print(f'共 {len(all_data)} 幅中国画\n')
for i, a in enumerate(all_data, 1):
    print(f'{i}. {a.get("artist_name","未知")} - {a.get("title","未知")}')
