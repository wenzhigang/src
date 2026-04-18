#!/usr/bin/env python3
"""
画说数据同步脚本
用法: python3 sync_to_cloud.py [artworks|artists|museums|all]
"""

import sys, os, json, subprocess

ENV_ID = 'cloudbase-d7gl3kh5vf6b71edc'
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))

def upsert_record(collection, record):
    cmd = [{
        "TableName": collection,
        "CommandType": "COMMAND",
        "Command": json.dumps({
            "findAndModify": collection,
            "query": {"_id": record['_id']},
            "update": {"$set": record},
            "upsert": True,
            "new": True
        })
    }]
    result = subprocess.run(
        ['tcb', 'db', 'nosql', 'execute',
         '--env-id', ENV_ID,
         '--command', json.dumps(cmd),
         '--json'],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return False, result.stdout
    out = json.loads(result.stdout)
    if 'error' in out:
        return False, out['error'].get('message', '')
    return True, None

def sync_collection(collection, json_file):
    print(f'\n📦 同步集合: {collection}')
    records = []
    with open(json_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    print(f'   本地数据: {len(records)} 条')
    success = failed = 0
    for i, record in enumerate(records):
        ok, err = upsert_record(collection, record)
        if ok:
            success += 1
            print(f'   ✅ [{i+1}/{len(records)}] {record["_id"]}')
        else:
            failed += 1
            print(f'   ❌ [{i+1}/{len(records)}] {record["_id"]}: {err}')
    print(f'\n   完成: 成功 {success}, 失败 {failed}')

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else 'all'
    collections = {
        'artworks': os.path.join(SCRIPTS_DIR, 'artworks_data.json'),
        'artists':  os.path.join(SCRIPTS_DIR, 'artists_data.json'),
        'museums':  os.path.join(SCRIPTS_DIR, 'museums_data.json'),
    }
    if target == 'all':
        for name, path in collections.items():
            sync_collection(name, path)
    elif target in collections:
        sync_collection(target, collections[target])
    else:
        print(f'❌ 未知: {target}，可用: artworks, artists, museums, all')
        sys.exit(1)
    print('\n✅ 同步完成')

if __name__ == '__main__':
    main()
