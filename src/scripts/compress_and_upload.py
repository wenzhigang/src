#!/usr/bin/env python3
"""
压缩图片 + 上传云存储 + 生成 artworks/artists 数据
用法:
  python3 compress_and_upload.py --dry-run   # 仅预览，不上传
  python3 compress_and_upload.py             # 执行上传
  python3 compress_and_upload.py --start 100 # 从第100条开始（断点续传）
"""

import os, json, subprocess, sys, re, shutil, time
from pathlib import Path

# ── 配置 ──────────────────────────────────────────────
PAINTINGS_LIST  = "/Users/zhigangwen/code/src/huashuo/src/scripts/paintings_list.json"
COMPRESS_DIR    = "/tmp/huashuo_compressed"
SCRIPTS_DIR     = "/Users/zhigangwen/code/src/huashuo/src/scripts"
TCB             = "/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb"
ENV_ID          = "cloudbase-d7gl3kh5vf6b71edc"
STORAGE_BASE    = "images/artworks"
CDN_BASE        = "https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la"
EXISTING_SEQ_START = 170  # 新画作从 artwork_170 开始编号

# 上传进度文件
PROGRESS_FILE = os.path.join(SCRIPTS_DIR, "upload_progress.json")

# ── 压缩策略 ──────────────────────────────────────────
def compress_image(src_path, dst_path):
    """使用 sips 压缩图片，按尺寸自动选策略"""
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)

    # 获取原始尺寸
    r = subprocess.run(
        ["sips", "-g", "pixelWidth", "-g", "pixelHeight", src_path],
        capture_output=True, text=True
    )
    w = h = 0
    for line in r.stdout.splitlines():
        if "pixelWidth" in line:
            w = int(line.split()[-1])
        if "pixelHeight" in line:
            h = int(line.split()[-1])

    if w == 0 or h == 0:
        shutil.copy2(src_path, dst_path)
        return dst_path

    # 选压缩尺寸
    if w > h:  # 横向
        if w > 8000:
            target_w = 8000
        elif w > 3000:
            target_w = 2500
        else:
            target_w = w
        target_h = int(h * target_w / w)
    else:  # 竖向或方形
        if h > 8000:
            target_h = 4000
        elif h > 3000:
            target_h = 2500
        else:
            target_h = h
        target_w = int(w * target_h / h)

    # 执行压缩
    subprocess.run([
        "sips",
        "--resampleHeightWidth", str(target_h), str(target_w),
        "--setProperty", "formatOptions", "85",
        "-s", "format", "jpeg",
        src_path,
        "--out", dst_path
    ], capture_output=True)

    orig_mb = os.path.getsize(src_path) / 1024 / 1024
    comp_mb = os.path.getsize(dst_path) / 1024 / 1024
    return dst_path, orig_mb, comp_mb

# ── 上传云存储 ────────────────────────────────────────
def upload_to_cloud(local_path, cloud_path):
    """上传文件到微信云存储"""
    result = subprocess.run(
        [TCB, "storage", "upload", local_path, cloud_path, "--env-id", ENV_ID],
        capture_output=True, text=True
    )
    return result.returncode == 0, result.stderr

# ── 生成 artwork_id ───────────────────────────────────
def make_artwork_id(seq):
    n = EXISTING_SEQ_START + seq - 1
    return f"artwork_{n:03d}"

def make_artist_id(name):
    safe = re.sub(r'[^\w\u4e00-\u9fff]', '', name)
    return f"artist_cn_{safe}"

# ── 主流程 ────────────────────────────────────────────
def main():
    dry_run = "--dry-run" in sys.argv
    start_from = 1
    for arg in sys.argv:
        if arg.startswith("--start="):
            start_from = int(arg.split("=")[1])

    with open(PAINTINGS_LIST) as f:
        paintings = json.load(f)

    # 加载进度
    uploaded = set()
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            uploaded = set(json.load(f).get("uploaded", []))
    print(f"已上传: {len(uploaded)} 幅，本次从第 {start_from} 条开始")

    # 收集所有画家
    artists_map = {}  # artist_name -> {id, name, artworks:[]}

    # 新 artwork 数据
    new_artworks = []

    total = len(paintings)
    for i, item in enumerate(paintings, 1):
        if i < start_from:
            continue

        artwork_id = make_artwork_id(i)

        if artwork_id in uploaded:
            print(f"  ⏭️  [{i}/{total}] 已上传，跳过: {item['artist']} - {item['title']}")
            continue

        artist_name = item['artist']
        title       = item['title']
        dynasty     = item['dynasty']
        src_path    = item['primary_path']
        extra_paths = item.get('extra_paths', [])

        if not os.path.exists(src_path):
            print(f"  ⚠️  [{i}/{total}] 文件不存在: {src_path}")
            continue

        print(f"\n  [{i}/{total}] {artist_name} - {title}")

        # 生成云存储路径
        safe_id = artwork_id
        ext = Path(src_path).suffix.lower() or ".jpg"
        cloud_path = f"{STORAGE_BASE}/{safe_id}{ext}"
        image_url  = f"{CDN_BASE}/{cloud_path}"

        if not dry_run:
            # 压缩
            dst_path = os.path.join(COMPRESS_DIR, f"{safe_id}{ext}")
            result = compress_image(src_path, dst_path)
            if isinstance(result, tuple):
                _, orig_mb, comp_mb = result
                print(f"    压缩: {orig_mb:.1f}MB → {comp_mb:.1f}MB")
            else:
                dst_path = result

            # 上传主图
            ok, err = upload_to_cloud(dst_path, cloud_path)
            if not ok:
                print(f"    ❌ 上传失败: {err[:100]}")
                continue
            print(f"    ✅ 上传: {cloud_path}")

            # 上传 extra 图（长卷分段）
            extra_urls = []
            for j, ep in enumerate(extra_paths[:8]):
                if not os.path.exists(ep): continue
                eext = Path(ep).suffix.lower() or ".jpg"
                ec_path = f"{STORAGE_BASE}/{safe_id}_p{j+2}{eext}"
                edst = os.path.join(COMPRESS_DIR, f"{safe_id}_p{j+2}{eext}")
                compress_image(ep, edst)
                eok, _ = upload_to_cloud(edst, ec_path)
                if eok:
                    extra_urls.append(f"{CDN_BASE}/{ec_path}")

            # 更新进度
            uploaded.add(artwork_id)
            with open(PROGRESS_FILE, 'w') as f:
                json.dump({"uploaded": list(uploaded)}, f)
        else:
            extra_urls = []
            print(f"    [DRY RUN] {src_path} → {cloud_path}")

        # 构建 artwork 数据
        artist_id = make_artist_id(artist_name)
        artwork = {
            "_id": artwork_id,
            "title": title,
            "title_en": "",
            "artist_id": artist_id,
            "artist_name": artist_name,
            "museum_id": "",
            "museum_name": "",
            "year": "",
            "style": dynasty,
            "medium": "",
            "size": "",
            "description": f"{dynasty}代画家{artist_name}所作《{title}》。",
            "image_url": image_url,
            "extra_image_urls": extra_urls,
            "tags": [dynasty, artist_name],
            "is_featured": False,
            "view_count": 0,
            "annotations": [],
            "ai_analysis": {},
            "seq": EXISTING_SEQ_START + i - 1,
            "is_chinese": True,
        }
        new_artworks.append(artwork)

        # 收集画家
        if artist_name not in artists_map:
            artists_map[artist_name] = {
                "_id": artist_id,
                "name": artist_name,
                "name_en": "",
                "birth_year": None,
                "death_year": None,
                "nationality": "中国",
                "style": dynasty,
                "bio": f"{dynasty}代画家{artist_name}。",
                "fun_facts": [],
                "avatar_url": "",
                "artwork_count": 0,
                "dynasty": dynasty,
            }
        artists_map[artist_name]["artwork_count"] += 1

    # 写出 JSON 数据
    artworks_file = os.path.join(SCRIPTS_DIR, "new_chinese_artworks.json")
    artists_file  = os.path.join(SCRIPTS_DIR, "new_chinese_artists.json")

    with open(artworks_file, 'w', encoding='utf-8') as f:
        for aw in new_artworks:
            f.write(json.dumps(aw, ensure_ascii=False) + "\n")

    with open(artists_file, 'w', encoding='utf-8') as f:
        for ar in artists_map.values():
            f.write(json.dumps(ar, ensure_ascii=False) + "\n")

    print(f"\n{'='*50}")
    print(f"✅ {'DRY RUN 完成' if dry_run else '上传完成'}")
    print(f"   artwork 数据: {len(new_artworks)} 条 → {artworks_file}")
    print(f"   artist  数据: {len(artists_map)} 条 → {artists_file}")

if __name__ == '__main__':
    main()