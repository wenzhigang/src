#!/usr/bin/env python3
"""
用 Claude API 批量补全中国画信息
用法: python3 enrich_artworks.py
支持断点续传：已处理的跳过
"""
import json, os, asyncio, aiohttp, time
from pathlib import Path

ARTWORKS   = "/Users/zhigangwen/code/src/huashuo/src/scripts/artworks_data.json"
PROGRESS   = "/Users/zhigangwen/code/src/huashuo/src/scripts/enrich_progress.json"
API_URL    = "https://api.anthropic.com/v1/messages"
BATCH_SIZE = 5   # 每批并发数
CONCURRENCY = 5  # 同时请求数

DYNASTY_PERIOD = {
    "战国": "约公元前475-221年",
    "北齐": "550-577年",
    "晋": "265-420年",
    "隋": "581-618年",
    "唐": "618-907年",
    "五代": "907-960年",
    "宋": "960-1279年",
    "辽": "916-1125年",
    "金": "1115-1234年",
    "元": "1271-1368年",
    "明": "1368-1644年",
    "清": "1644-1912年",
}

async def enrich_one(session, artwork):
    dynasty = artwork.get('style', '')
    artist  = artwork.get('artist_name', '')
    title   = artwork.get('title', '')
    period  = DYNASTY_PERIOD.get(dynasty, '')

    prompt = f"""你是中国艺术史专家。请为以下中国画作品生成简洁准确的信息，以JSON格式返回。

画作信息：
- 朝代：{dynasty}代（{period}）
- 画家：{artist}
- 画名：{title}

请返回如下JSON（只返回JSON，不要其他文字）：
{{
  "year": "创作年代，如'约12世纪'或'1644年'，不确定写朝代范围",
  "medium": "材质技法，如'绢本设色'、'纸本水墨'、'绢本工笔'等",
  "description": "150字左右的画作介绍，包括：画面内容描述、艺术特点、历史价值，语言生动有趣",
  "tags": ["标签1","标签2","标签3","标签4"],
  "ai_analysis": {{
    "technique": "技法分析，60字",
    "composition": "构图分析，60字",
    "emotion": "意境情感，60字",
    "influence": "艺术影响，60字"
  }}
}}"""

    headers = {
        "Content-Type": "application/json",
        "x-api-key": os.environ.get("ANTHROPIC_API_KEY", ""),
        "anthropic-version": "2023-06-01"
    }
    body = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 1000,
        "messages": [{"role": "user", "content": prompt}]
    }

    for attempt in range(3):
        try:
            async with session.post(API_URL, headers=headers, json=body, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    text = data['content'][0]['text'].strip()
                    # 清理 markdown
                    if text.startswith('```'):
                        text = '\n'.join(text.split('\n')[1:-1])
                    return json.loads(text)
                elif resp.status == 429:
                    await asyncio.sleep(10 * (attempt + 1))
                else:
                    await asyncio.sleep(2)
        except Exception as e:
            await asyncio.sleep(3)
    return None

async def main():
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        print("❌ 请设置 ANTHROPIC_API_KEY 环境变量")
        return

    with open(ARTWORKS) as f:
        artworks = [json.loads(l) for l in f if l.strip()]

    # 加载进度
    done_ids = set()
    if os.path.exists(PROGRESS):
        with open(PROGRESS) as f:
            done_ids = set(json.load(f).get("done", []))
    print(f"已完成: {len(done_ids)} 幅，待处理: {sum(1 for a in artworks if a['_id'] not in done_ids and (a.get('is_chinese') or int(a['_id'].replace('artwork_','')) >= 170))} 幅")

    # 待处理列表
    todo = [a for a in artworks
            if a['_id'] not in done_ids
            and (a.get('is_chinese') or int(a['_id'].replace('artwork_','')) >= 170)
            and (not a.get('year'))]

    artwork_map = {a['_id']: a for a in artworks}
    sem = asyncio.Semaphore(CONCURRENCY)
    total = len(todo)

    async def process(session, artwork, idx):
        async with sem:
            result = await enrich_one(session, artwork)
            if result:
                artwork_map[artwork['_id']].update({
                    'year':        result.get('year', ''),
                    'medium':      result.get('medium', ''),
                    'description': result.get('description', ''),
                    'tags':        result.get('tags', [artwork.get('style',''), artwork.get('artist_name','')]),
                    'ai_analysis': result.get('ai_analysis', {}),
                })
                done_ids.add(artwork['_id'])
                print(f"  ✅ [{idx}/{total}] {artwork['artist_name']}-{artwork['title']}")
            else:
                print(f"  ❌ [{idx}/{total}] {artwork['artist_name']}-{artwork['title']}")

            # 每50条保存一次
            if len(done_ids) % 50 == 0:
                save(artwork_map, done_ids, artworks)

    async with aiohttp.ClientSession() as session:
        tasks = [process(session, a, i+1) for i, a in enumerate(todo)]
        # 分批执行
        for i in range(0, len(tasks), BATCH_SIZE * 10):
            batch = tasks[i:i + BATCH_SIZE * 10]
            await asyncio.gather(*batch)
            save(artwork_map, done_ids, artworks)
            print(f"\n💾 进度保存: {len(done_ids)} 幅已完成\n")

    save(artwork_map, done_ids, artworks)
    print(f"\n✅ 全部完成！共处理 {len(done_ids)} 幅")

def save(artwork_map, done_ids, original_list):
    with open(ARTWORKS, 'w', encoding='utf-8') as f:
        for a in original_list:
            f.write(json.dumps(artwork_map[a['_id']], ensure_ascii=False) + '\n')
    with open(PROGRESS, 'w') as f:
        json.dump({"done": list(done_ids)}, f)

if __name__ == '__main__':
    asyncio.run(main())