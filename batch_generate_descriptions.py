#!/usr/bin/env python3
import json, time, os, sys

try:
    from openai import OpenAI
except ImportError:
    print("请先安装: pip install openai")
    sys.exit(1)

FILES = [
    '/Users/zhigangwen/code/src/huashuo/src/scripts/artworks_data.json',
    '/Users/zhigangwen/code/src/huashuo/src/scripts/new_chinese_artworks.json',
]
PROGRESS_FILE = '/Users/zhigangwen/code/src/huashuo/src/scripts/desc_progress.json'

client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

SKIP_KEYWORDS = ['第', '开之', '册页·', '册·', '局部', '（局部）']

def needs_good_desc(r):
    title = r.get('title', '')
    artist = r.get('artist_name', '')
    if any(kw in title for kw in SKIP_KEYWORDS): return False
    if not title or not artist: return False
    return True

def is_already_good(r):
    desc = r.get('description', '')
    if len(desc) > 80:
        if desc[:30].count('，') >= 2 and ('字' in desc[:15] or '号' in desc[:15]):
            return False
        return True
    return False

def generate_desc(artist, title, dynasty='', medium=''):
    ctx = f"朝代/风格：{dynasty}，" if dynasty else ""
    ctx += f"材质：{medium}" if medium else ""
    prompt = f"""你是中国艺术史专家。请为以下画作写一段简介：

画家：{artist}
画作：{title}
{ctx}

要求：
1. 内容包含画作主要内容/题材 + 画家简要背景（朝代、画风特点）
2. 不超过100字
3. 语言简洁准确，适合艺术鉴赏App
4. 直接输出正文，不加标题、引号、序号"""

    resp = client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=300,
        temperature=0.7,
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
        print("获取地址: https://platform.deepseek.com/api_keys")
        sys.exit(1)

    print("加载数据...")
    records = load_all()
    items_by_file = load_items_by_file()

    to_process = [(_id, r) for _id, r in records.items()
                  if needs_good_desc(r) and not is_already_good(r)]
    print(f"总记录: {len(records)}，需要生成: {len(to_process)}")

    progress = load_progress()
    # 把已有进度写回records
    for _id, desc in progress.items():
        if _id in records:
            records[_id]['description'] = desc

    done_count = sum(1 for _id, _ in to_process if _id in progress)
    print(f"已完成: {done_count}，剩余: {len(to_process) - done_count}\n")

    updated = 0
    errors = 0

    for i, (_id, r) in enumerate(to_process):
        if _id in progress:
            continue

        artist = r.get('artist_name', '')
        title = r.get('title', '')
        dynasty = r.get('dynasty', '') or r.get('style', '')
        medium = r.get('medium', '')

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
    print(f"\n完成！本次生成: {updated} 条，失败: {errors} 条")
    print(f"\n同步到云端:")
    print(f"cd /Users/zhigangwen/code/src/huashuo/src/scripts && python3 sync_to_cloud.py artworks")

if __name__ == '__main__':
    main()
