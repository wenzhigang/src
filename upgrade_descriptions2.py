#!/usr/bin/env python3
import json, time, os, sys, re
from openai import OpenAI

FILES = [
    '/Users/zhigangwen/code/src/huashuo/src/scripts/artworks_data.json',
    '/Users/zhigangwen/code/src/huashuo/src/scripts/new_chinese_artworks.json',
]
PROGRESS_FILE = '/Users/zhigangwen/code/src/huashuo/src/scripts/desc_progress2.json'

client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

SKIP_KEYWORDS = ['第', '开之', '册页·', '册·', '局部', '（局部）']
NO_NAME_PATTERNS = ['静物 No.', '作品 No.', 'No.', '习作', '草图', '研究', '素描']

ARTIST_BIO_CACHE = {}

def should_skip(r):
    title = r.get('title', '')
    artist = r.get('artist_name', '')
    if any(kw in title for kw in SKIP_KEYWORDS): return True
    if not title or not artist: return True
    return False

def is_no_name(title):
    return any(p in title for p in NO_NAME_PATTERNS)

def generate_desc(artist, title, dynasty='', medium=''):
    if is_no_name(title):
        if artist in ARTIST_BIO_CACHE:
            return ARTIST_BIO_CACHE[artist]
        prompt = f"""请为画家{artist}写一段百科全书式简介。
要求：
1. 客观简洁，直接陈述事实
2. 包含：生卒年、国籍、所属流派、主要艺术成就和风格特点
3. 总字数80-120字
4. 直接输出正文，不加标题、序号、引号"""
    else:
        ctx = f"朝代/风格：{dynasty}，" if dynasty else ""
        ctx += f"材质：{medium}" if medium else ""
        prompt = f"""请为以下画作写一段百科全书式简介。

画家：{artist}
画作：{title}
{ctx}

要求：
1. 客观简洁，直接陈述事实，不用第二人称，不用"请看"、"让我们"等引导语
2. 第一句描述画作的主要内容和构图
3. 第二句介绍画家的流派和艺术风格
4. 第三句说明该作品的艺术价值或历史意义
5. 总字数80-120字
6. 直接输出正文，不加标题、序号、引号"""

    resp = client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=300,
        temperature=0.3,
    )
    result = resp.choices[0].message.content.strip()
    if is_no_name(title):
        ARTIST_BIO_CACHE[artist] = result
    return result

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
    print(f"总记录: {len(records)}，需要处理: {len(to_process)}")

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
        artist  = r.get('artist_name', '')
        title   = r.get('title', '')
        dynasty = r.get('dynasty', '') or r.get('style', '')
        medium  = r.get('medium', '')

        print(f"[{done_count+updated+1}/{len(to_process)}] {artist} - {title[:25]}", end=' ', flush=True)

        try:
            desc = generate_desc(artist, title, dynasty, medium)
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
    print(f"\n完成！本次处理: {updated} 条，失败: {errors} 条")
    print(f"\n同步到云端:")
    print(f"cd /Users/zhigangwen/code/src/huashuo/src/scripts && python3 sync_to_cloud.py artworks")

if __name__ == '__main__':
    main()
