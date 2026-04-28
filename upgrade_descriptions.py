#!/usr/bin/env python3
import json, time, os, sys
from openai import OpenAI

FILES = [
    '/Users/zhigangwen/code/src/huashuo/src/scripts/artworks_data.json',
    '/Users/zhigangwen/code/src/huashuo/src/scripts/new_chinese_artworks.json',
]
PROGRESS_FILE = '/Users/zhigangwen/code/src/huashuo/src/scripts/upgrade_progress.json'

client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

SKIP_KEYWORDS = ['第', '开之', '册页·', '册·', '局部', '（局部）']

def should_skip(r):
    title = r.get('title', '')
    artist = r.get('artist_name', '')
    if any(kw in title for kw in SKIP_KEYWORDS): return True
    if not title or not artist: return True
    return False

def generate_desc(artist, title, existing_desc='', dynasty='', medium=''):
    prompt = f"""你是资深中国艺术史专家，请为以下画作写一段鉴赏简介。

画家：{artist}
画作：{title}
{f"朝代/风格：{dynasty}" if dynasty else ""}
{f"材质：{medium}" if medium else ""}
{f"现有描述（仅供参考，请勿照搬）：{existing_desc}" if existing_desc else ""}

写作要求：
1. 先用1-2句话描述画作的具体内容和视觉特征（画了什么、如何构图）
2. 再用1句话介绍画家身份和艺术风格特点
3. 最后1句话点出这幅画的艺术价值或历史意义
4. 语言生动有感染力，像一位博物馆讲解员在介绍
5. 总字数100-150字，不超过150字
6. 直接输出正文，不加标题、序号、引号"""

    resp = client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=400,
        temperature=0.8,
    )
    return resp.choices[0].message.content.strip()

def load_all():
    records = {}
    for fpath in FILES:
        with open(fpath, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        r = json.loads(line)
                        _id = r.get('_id', '')
                        if _id and _id not in records:
                            records[_id] = r
                    except: pass
    return records

def load_items_by_file():
    result = {}
    for fpath in FILES:
        items = []
        with open(fpath, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    try: items.append(json.loads(line))
                    except: pass
        result[fpath] = items
    return result

def save_all(records, items_by_file):
    for fpath, items in items_by_file.items():
        with open(fpath, 'w', encoding='utf-8') as f:
            for r in items:
                _id = r.get('_id', '')
                if _id and _id in records:
                    f.write(json.dumps(records[_id], ensure_ascii=False) + '\n')
                else:
                    f.write(json.dumps(r, ensure_ascii=False) + '\n')

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_progress(p):
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(p, f, ensure_ascii=False, indent=2)

def main():
    if not os.environ.get("DEEPSEEK_API_KEY"):
        print("请先设置: export DEEPSEEK_API_KEY='your-key'")
        sys.exit(1)

    print("加载数据...")
    records = load_all()
    items_by_file = load_items_by_file()

    to_process = [(_id, r) for _id, r in records.items() if not should_skip(r)]
    print(f"总记录: {len(records)}，需要升级: {len(to_process)}")

    progress = load_progress()
    for _id, desc in progress.items():
        if _id in records:
            records[_id]['description'] = desc

    done_count = sum(1 for _id, _ in to_process if _id in progress)
    print(f"已完成: {done_count}，剩余: {len(to_process) - done_count}\n")

    updated = 0
    errors = 0

    for _id, r in to_process:
        if _id in progress:
            continue

        artist = r.get('artist_name', '')
        title = r.get('title', '')
        existing = r.get('description', '')
        dynasty = r.get('dynasty', '') or r.get('style', '')
        medium = r.get('medium', '')

        print(f"[{done_count+updated+1}/{len(to_process)}] {artist} - {title[:25]}", end=' ', flush=True)

        try:
            desc = generate_desc(artist, title, existing, dynasty, medium)
            records[_id]['description'] = desc
            progress[_id] = desc
            updated += 1
            print(f"✓ ({len(desc)}字)")
        except Exception as e:
            errors += 1
            print(f"✗ {e}")
            time.sleep(2)
            continue

        if updated % 20 == 0:
            print(f"\n保存进度 ({updated}条)...")
            save_progress(progress)
            save_all(records, items_by_file)

        time.sleep(0.2)

    print(f"\n最终保存...")
    save_progress(progress)
    save_all(records, items_by_file)
    print(f"\n完成！本次升级: {updated} 条，失败: {errors} 条")
    print(f"\n同步到云端:")
    print(f"cd /Users/zhigangwen/code/src/huashuo/src/scripts && python3 sync_to_cloud.py artworks")

if __name__ == '__main__':
    main()
