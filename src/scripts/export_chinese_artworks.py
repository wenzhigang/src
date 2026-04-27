import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))

# 读取已有的同步脚本来复用云数据库连接方式
# 直接用 tcb 命令导出
import subprocess

result = subprocess.run([
    '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb',
    'db', 'query',
    '--collection', 'artworks',
    '--query', '{"style": {"$regex": ".*"}}',
    '--limit', '2000',
    '-e', 'cloudbase-d7gl3kh5vf6b71edc'
], capture_output=True, text=True)

print(result.stdout[:500] if result.stdout else result.stderr[:500])
