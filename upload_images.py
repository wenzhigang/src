import urllib.request, json, time, random, subprocess, os, re
from PIL import Image
import io

TCB = '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb'
ENV = 'cloudbase-d7gl3kh5vf6b71edc'
CWD = '/Users/zhigangwen/code/src/huashuo'
BASE_URL = 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la'
PROGRESS_FILE = '/tmp/upload_progress.json'
TMP_DIR = '/tmp/artwork_images'
os.makedirs(TMP_DIR, exist_ok=True)

def log(msg):
    print(msg, flush=True)

# Step1: 清空云存储
def clear_storage():
    log('清空云存储...')
    result = subprocess.run(
        [TCB, 'storage', 'rm', 'images/', '-e', ENV, '--force'],
        capture_output=True, text=True, cwd=CWD
    )
    log(f'清空结果：{result.stdout[:200]}')

# Step2: 下载Wikimedia图片并压缩
def get_thumbnail_url(wiki_url, width=1200):
    """将Wikimedia原图URL转为缩略图URL"""
    # https://upload.wikimedia.org/wikipedia/commons/a/ab/filename.jpg
    # -> https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/filename.jpg/1200px-filename.jpg
    if '/thumb/' in wiki_url:
        return wiki_url  # 已经是缩略图
    
    import re
    match = re.match(r'(https://upload\.wikimedia\.org/wikipedia/(?:commons|[a-z]+)/)([\w]/[\w]{2})/(.+)', wiki_url)
    if match:
        base = match.group(1)
        hash_path = match.group(2)
        filename = match.group(3)
        # 处理文件名中的特殊字符
        thumb_url = f"{base}thumb/{hash_path}/{filename}/{width}px-{filename}"
        # 如果是svg，缩略图是png
        if filename.lower().endswith('.svg'):
            thumb_url = thumb_url + '.png'
        elif filename.lower().endswith('.tif') or filename.lower().endswith('.tiff'):
            thumb_url = thumb_url.rsplit('.',1)[0] + '.jpg'
            thumb_url = thumb_url.replace(filename, filename.rsplit('.',1)[0]+'.jpg')
        return thumb_url
    return wiki_url

def download_and_compress(url, save_path, max_size_kb=500, max_width=1200):
    from urllib.parse import urlsplit, urlunsplit, quote
    parts = urlsplit(url)
    url = urlunsplit(parts._replace(path=quote(parts.path, safe='/%')))
    req = urllib.request.Request(url, headers={
        'User-Agent': random.choice([
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0.0.0',
        ])
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    
    # 用PIL压缩
    img = Image.open(io.BytesIO(data))
    
    # 转为RGB（去掉alpha通道）
    if img.mode in ('RGBA', 'P', 'LA'):
        img = img.convert('RGB')
    
    # 限制最大宽度
    w, h = img.size
    if w > max_width:
        ratio = max_width / w
        img = img.resize((max_width, int(h*ratio)), Image.LANCZOS)
    
    # 压缩质量
    quality = 85
    while True:
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=quality, optimize=True)
        size_kb = len(buf.getvalue()) / 1024
        if size_kb <= max_size_kb or quality <= 60:
            break
        quality -= 10
    
    with open(save_path, 'wb') as f:
        f.write(buf.getvalue())
    
    return len(buf.getvalue()) / 1024

# Step3: 上传到云存储
def upload_to_cloud(local_path, cloud_path):
    result = subprocess.run(
        [TCB, 'storage', 'upload', local_path, cloud_path, '-e', ENV],
        capture_output=True, text=True, cwd=CWD
    )
    return result.returncode == 0

# 主程序
with open('/tmp/rebuild_clean.json') as f:
    artworks = json.load(f)

# 加载进度
try:
    with open(PROGRESS_FILE) as f:
        progress = json.load(f)
    done = set(progress['done'])
    url_map = progress['url_map']  # wiki_url -> cloud_url
    log(f'续传：已完成{len(done)}幅')
except:
    done = set()
    url_map = {}
    log('全新开始')
    # 清空云存储
    clear_storage()
    time.sleep(3)

total = len(artworks)
success = 0

for idx, a in enumerate(artworks):
    wiki_url = a.get('image_url', '')
    if not wiki_url or idx in done:
        continue
    
    title = a['title']
    # 生成云存储路径
    safe_name = re.sub(r'[^\w\u4e00-\u9fff]', '_', title)[:30]
    cloud_path = f'images/artworks/{idx+1:04d}_{safe_name}.jpg'
    local_path = f'{TMP_DIR}/{idx+1:04d}.jpg'
    
    log(f'[{idx+1}/{total}] {title}')
    
    try:
        # 直接下载（已经是缩略图URL）
        size_kb = download_and_compress(wiki_url, local_path)
        log(f'  下载压缩: {size_kb:.0f}KB')
        time.sleep(random.uniform(4,8))
        
        # 上传
        ok = upload_to_cloud(local_path, cloud_path)
        if ok:
            cloud_url = f'{BASE_URL}/{cloud_path}'
            url_map[wiki_url] = cloud_url
            done.add(idx)
            success += 1
            log(f'  ✅ 上传成功')
            # 删除本地临时文件
            os.remove(local_path)
        else:
            log(f'  ❌ 上传失败')
        
        if success % 20 == 0:
            with open(PROGRESS_FILE, 'w') as f:
                json.dump({'done': list(done), 'url_map': url_map}, f)
            log(f'💾 已保存进度，完成{success}幅')
        
        time.sleep(random.uniform(3,5))
        
    except Exception as e:
        log(f'  ❌ {e}')
        time.sleep(5)

# 保存最终进度
with open(PROGRESS_FILE, 'w') as f:
    json.dump({'done': list(done), 'url_map': url_map}, f)

# 更新rebuild_clean.json里的图片URL
log('\n更新图片URL...')
updated = 0
for a in artworks:
    wiki_url = a.get('image_url', '')
    if wiki_url in url_map:
        a['image_url'] = url_map[wiki_url]
        updated += 1

with open('/tmp/rebuild_clean.json', 'w') as f:
    json.dump(artworks, f, ensure_ascii=False, indent=2)

log(f'\n🎉 完成！上传{success}幅，更新URL{updated}个')
