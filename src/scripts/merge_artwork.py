#!/usr/bin/env python3
"""
将 new_artwork_XXX.json 合并到 artworks_data.json
用法: python3 merge_artwork.py new_artwork_006.json
"""
import sys, os, json

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    
    new_file = sys.argv[1]
    if not os.path.isabs(new_file):
        new_file = os.path.join(OUTPUT_DIR, new_file)
    
    with open(new_file) as f:
        new_artwork = json.load(f)
    
    json_path = os.path.join(OUTPUT_DIR, 'artworks_data.json')
    existing = []
    with open(json_path) as f:
        for line in f:
            line = line.strip()
            if line:
                existing.append(json.loads(line))
    
    # 检查是否已存在
    ids = [a['_id'] for a in existing]
    if new_artwork['_id'] in ids:
        print(f"⚠️  {new_artwork['_id']} 已存在，更新中...")
        existing = [a for a in existing if a['_id'] != new_artwork['_id']]
    
    existing.append(new_artwork)
    existing.sort(key=lambda x: x['_id'])
    
    with open(json_path, 'w', encoding='utf-8') as f:
        for a in existing:
            f.write(json.dumps(a, ensure_ascii=False) + '\n')
    
    print(f"✅ 合并完成，当前共 {len(existing)} 幅画作")
    for a in existing:
        print(f"   {a['_id']}: {a['title']} - {a['artist_name']}")

if __name__ == '__main__':
    main()
