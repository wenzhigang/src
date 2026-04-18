#!/usr/bin/env python3
"""
画说 - 画作自动获取脚本
用法: python3 fetch_artwork.py "画作英文Wikipedia标题" "画作中文名" "艺术家中文名" "风格" "年代" "媒介" "博物馆"

示例:
python3 fetch_artwork.py "Girl_with_a_Pearl_Earring" "戴珍珠耳环的少女" "约翰内斯·维米尔" "荷兰黄金时代" "1665年" "油画" "海牙莫瑞泰斯皇家美术馆"
"""

import sys
import os
import json
import urllib.request
import urllib.parse
import subprocess

# 云存储配置
CLOUD_BASE_URL = "https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks"
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOAD_DIR = os.path.join(os.path.dirname(OUTPUT_DIR), '..', 'temp_images')

def get_wiki_info(wiki_title):
    """从 Wikipedia API 获取画作信息和图片链接"""
    print(f"📡 获取 Wikipedia 信息: {wiki_title}")
    
    # 获取页面摘要
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(wiki_title)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'HuaShuoApp/1.0'})
    
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
    except Exception as e:
        print(f"❌ 获取失败: {e}")
        return None
    
    original = data.get('originalimage', {})
    orig_url = original.get('source', '')
    orig_width = original.get('width', 0)
    
    if not orig_url:
        print("❌ 未找到图片")
        return None
    
    # 根据原图宽度决定下载尺寸（目标宽度1200px，保证清晰且不超10MB）
    # 直接用原图，完全不走 /thumb/ 路径
    img_url = orig_url
    print(f"✅ 使用原图: {img_url[:80]}...")
    
    print(f"✅ 原图尺寸: {original.get('width')}x{original.get('height')}")
    print(f"✅ 下载链接: {img_url}")
    
    return {
        'img_url': img_url,
        'description_en': data.get('extract', '')[:500],
    }

def download_image(img_url, filename):
    """下载图片到 temp_images 目录"""
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    filepath = os.path.join(DOWNLOAD_DIR, filename)
    
    print(f"⬇️  下载图片...")
    import time
    time.sleep(2)  # 避免限速
    
    req = urllib.request.Request(img_url, headers={
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://en.wikipedia.org/',
    })
    
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
        
        size_mb = len(data) / 1024 / 1024
        print(f"✅ 下载完成: {size_mb:.1f} MB")
        
        if size_mb > 10:
            print(f"⚠️  图片超过10MB ({size_mb:.1f}MB)，建议手动压缩")
        
        with open(filepath, 'wb') as f:
            f.write(data)
        
        return filepath
    except Exception as e:
        print(f"❌ 下载失败: {e}")
        return None

def upload_to_cloud(filepath, filename):
    """使用微信开发者工具CLI上传到云存储（需要手动操作）"""
    print(f"\n📤 图片已下载到: {filepath}")
    print(f"\n请在微信云开发控制台手动上传:")
    print(f"  1. 打开云开发控制台 → 存储 → images/artworks/")
    print(f"  2. 上传文件: {filepath}")
    print(f"  3. 上传后云存储URL为:")
    cloud_url = f"{CLOUD_BASE_URL}/{filename}"
    print(f"     {cloud_url}")
    return cloud_url

def generate_artwork_json(artwork_id, title_zh, title_en, artist_name, artist_id,
                           museum_name, museum_id, year, style, medium, 
                           description_zh, image_url, tags):
    """生成画作JSON数据"""
    return {
        "_id": artwork_id,
        "title": title_zh,
        "title_en": title_en,
        "artist_id": artist_id,
        "artist_name": artist_name,
        "museum_id": museum_id,
        "museum_name": museum_name,
        "year": year,
        "style": style,
        "medium": medium,
        "size": "",
        "description": description_zh,
        "image_url": image_url,
        "tags": tags,
        "is_featured": False,
        "view_count": 0,
        "annotations": [],
        "ai_analysis": {
            "technique": f"（待补充）{title_zh}的技法分析",
            "composition": f"（待补充）{title_zh}的构图分析",
            "emotion": f"（待补充）{title_zh}的情感解读",
            "influence": f"（待补充）{title_zh}的历史影响"
        }
    }

def main():
    if len(sys.argv) < 8:
        print(__doc__)
        print("\n参数不足，请按格式输入")
        return
    
    wiki_title = sys.argv[1]   # Wikipedia英文标题
    title_zh   = sys.argv[2]   # 中文名
    artist_zh  = sys.argv[3]   # 艺术家中文名
    style      = sys.argv[4]   # 风格
    year       = sys.argv[5]   # 年代
    medium     = sys.argv[6]   # 媒介
    museum_zh  = sys.argv[7]   # 博物馆名
    
    # 生成文件名和ID
    filename = wiki_title.lower().replace(' ', '_').replace('-', '_') + '.jpg'
    # 读取现有数据，确定下一个ID
    json_path = os.path.join(OUTPUT_DIR, 'artworks_data.json')
    existing = []
    if os.path.exists(json_path):
        with open(json_path) as f:
            for line in f:
                line = line.strip()
                if line:
                    existing.append(json.loads(line))
    
    # 同时考虑已生成但未合并的 new_artwork_XXX.json 文件
    import glob
    pending = glob.glob(os.path.join(OUTPUT_DIR, 'new_artwork_*.json'))
    next_num = len(existing) + len(pending) + 1
    artwork_id = f"artwork_{next_num:03d}"
    
    print(f"\n🎨 开始处理: {title_zh} ({wiki_title})")
    print(f"   ID: {artwork_id}, 文件名: {filename}")
    
    # 获取 Wikipedia 信息
    wiki_info = get_wiki_info(wiki_title)
    if not wiki_info:
        print("❌ 无法获取Wikipedia信息，退出")
        return
    
    # 下载图片
    filepath = download_image(wiki_info['img_url'], filename)
    if not filepath:
        print("❌ 图片下载失败，退出")
        return
    
    # 提示上传到云存储
    cloud_url = upload_to_cloud(filepath, filename)
    
    # 生成JSON（使用中文描述占位，需要后续手动补充）
    desc_placeholder = f"{title_zh}是{artist_zh}的代表作之一。（请补充详细描述）"
    
    tags = [style, medium]
    
    artwork_json = generate_artwork_json(
        artwork_id=artwork_id,
        title_zh=title_zh,
        title_en=wiki_title.replace('_', ' '),
        artist_name=artist_zh,
        artist_id="",  # 需要手动填写
        museum_name=museum_zh,
        museum_id="",  # 需要手动填写
        year=year,
        style=style,
        medium=medium,
        description_zh=desc_placeholder,
        image_url=cloud_url,
        tags=tags
    )
    
    # 输出JSON供参考
    print(f"\n📋 生成的JSON数据:")
    print(json.dumps(artwork_json, ensure_ascii=False, indent=2))
    
    # 保存到临时文件
    tmp_path = os.path.join(OUTPUT_DIR, f'new_{artwork_id}.json')
    with open(tmp_path, 'w', encoding='utf-8') as f:
        json.dump(artwork_json, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ JSON已保存到: {tmp_path}")
    print(f"\n下一步:")
    print(f"  1. 上传图片到云存储: {filepath}")
    print(f"  2. 补充description和ai_analysis内容")
    print(f"  3. 运行 merge_artwork.py 合并到artworks_data.json")
    print(f"  4. 重新导入云数据库")

if __name__ == '__main__':
    main()
