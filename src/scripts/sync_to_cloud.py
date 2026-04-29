#!/usr/bin/env python3
import sys, os, json, subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed

ENV_ID = 'cloudbase-d7gl3kh5vf6b71edc'
TCB = '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb'
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
WORKERS = 10  # 并发数

def upsert_record(collection, record):
    cmd = [{"TableName": collection, "CommandType": "COMMAND", "Command": json.dumps({
        "findAndModify": collection,
        "query": {"_id": record['_id']},
        "update": {"$set": record},
        "upsert": True,
        "new": True
    })}]
    result = subprocess.run(
        [TCB, 'db', 'nosql', 'execute', '--env-id', ENV_ID,
         '--command', json.dumps(cmd), '--json'],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return False, record['_id'], result.stdout[:80]
    try:
        out = json.loads(result.stdout)
        if 'error' in out:
            return False, record['_id'], out['error'].get('message', '')
    except:
        pass
    return True, record['_id'], None

def sync_collection(collection, json_file):
    print(f'\n📦 同步集合: {collection}')
    records = []
    with open(json_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    print(f'   本地数据: {len(records)} 条')

    # 断点续传
    progress_file = os.path.join(SCRIPTS_DIR, f'.progress_{collection}.json')
    done_ids = set()
    if os.path.exists(progress_file):
        with open(progress_file, 'r') as f:
            done_ids = set(json.load(f))
        print(f'   续传: 已完成 {len(done_ids)} 条，剩余 {len(records)-len(done_ids)} 条')

    # 过滤未完成的
    pending = [r for r in records if r.get('_id') not in done_ids]
    print(f'   并发数: {WORKERS}，开始同步...\n')

    success = len(done_ids)
    fail = 0
    total = len(records)

    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {executor.submit(upsert_record, collection, r): r for r in pending}
        for i, future in enumerate(as_completed(futures)):
            ok, _id, err = future.result()
            if ok:
                success += 1
                done_ids.add(_id)
            else:
                fail += 1
                print(f'   ❌ {_id}: {err}')

            if (i+1) % 100 == 0:
                # 保存进度
                with open(progress_file, 'w') as f:
                    json.dump(list(done_ids), f)
                print(f'   [{success}/{total}] 成功:{success} 失败:{fail}', flush=True)

    # 完成
    if os.path.exists(progress_file):
        os.remove(progress_file)

    print(f'\n完成: 成功 {success}, 失败 {fail}')
    print('✅ 同步完成')

DATA_FILES = {
    'artworks': os.path.join(SCRIPTS_DIR, 'artworks_data.json'),
    'artists':  os.path.join(SCRIPTS_DIR, 'artists_data.json'),
    'museums':  os.path.join(SCRIPTS_DIR, 'museums_data.json'),
}

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if target == 'all':
        for col, f in DATA_FILES.items():
            if os.path.exists(f):
                sync_collection(col, f)
    elif target in DATA_FILES:
        sync_collection(target, DATA_FILES[target])
    else:
        print(f'未知: {target}')

if __name__ == '__main__':
    main()
