import urllib.request, json, urllib.parse, time, random, subprocess
from collections import deque

DEEPSEEK_KEY = 'sk-cec8c0cdc3c54db987f6d5b48289b3ea'
TCB = '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb'
ENV = 'cloudbase-d7gl3kh5vf6b71edc'
CWD = '/Users/zhigangwen/code/src/huashuo'
PROGRESS_FILE = '/tmp/rebuild_artist_page_progress.json'

ARTISTS = [
    {'zh':'范宽','style':'宋代山水','region':'中国'},
    {'zh':'郭熙','style':'宋代山水','region':'中国'},
    {'zh':'李唐','style':'宋代山水','region':'中国'},
    {'zh':'马远','style':'宋代山水','region':'中国'},
    {'zh':'夏圭','style':'宋代山水','region':'中国'},
    {'zh':'赵孟頫','style':'元代文人画','region':'中国'},
    {'zh':'黄公望','style':'元代文人画','region':'中国'},
    {'zh':'倪瓒','style':'元代文人画','region':'中国'},
    {'zh':'吴镇','style':'元代文人画','region':'中国'},
    {'zh':'王蒙','style':'元代文人画','region':'中国'},
    {'zh':'沈周','style':'明代吴门','region':'中国'},
    {'zh':'文徵明','style':'明代吴门','region':'中国'},
    {'zh':'唐寅','style':'明代吴门','region':'中国'},
    {'zh':'仇英','style':'明代吴门','region':'中国'},
    {'zh':'徐渭','style':'明代写意','region':'中国'},
    {'zh':'郑板桥','style':'清代扬州八怪','region':'中国'},
    {'zh':'金农','style':'清代扬州八怪','region':'中国'},
    {'zh':'黄慎','style':'清代扬州八怪','region':'中国'},
    {'zh':'李鱓','style':'清代扬州八怪','region':'中国'},
    {'zh':'华嵒','style':'清代扬州八怪','region':'中国'},
    {'zh':'米开朗基罗','style':'文艺复兴','region':'西方'},
    {'zh':'约翰内斯·维米尔','style':'巴洛克','region':'西方'},
]

def log(msg):
    print(msg, flush=True)

def wiki_request(url, retries=4):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': random.choice([
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0.0.0 Safari/537.36',
                'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0',
            ])})
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read())
        except Exception as e:
            if '429' in str(e) and attempt < retries-1:
                wait = (attempt+1) * 30
                log(f'  限流等待{wait}秒...')
                time.sleep(wait)
            else:
                raise

def get_artist_page_images(artist_zh):
    """获取画家页面上的所有图片文件名"""
    params = urllib.parse.urlencode({
        'action':'query','titles':artist_zh,
        'prop':'images','imlimit':50,
        'format':'json','utf8':1
    })
    data = wiki_request(f'https://zh.wikipedia.org/w/api.php?{params}')
    page = list(data['query']['pages'].values())[0]
    images = page.get('images',[])
    # 过滤出画作图片（排除logo、图标等）
    painting_files = []
    skip_keywords = ['logo','icon','flag','map','seal','coat','commons','svg','portrait','photo',
                     '肖像','头像','签名','地图','旗','徽']
    for img in images:
        title = img['title'].lower()
        if not any(kw in title for kw in skip_keywords):
            if any(ext in title for ext in ['.jpg','.jpeg','.png']):
                painting_files.append(img['title'])
    return painting_files

def get_image_info(file_title, lang='zh'):
    """获取图片的URL和描述页链接"""
    params = urllib.parse.urlencode({
        'action':'query','titles':file_title,
        'prop':'imageinfo','iiprop':'url|descriptionurl|extmetadata',
        'format':'json','utf8':1
    })
    data = wiki_request(f'https://{lang}.wikipedia.org/w/api.php?{params}')
    page = list(data['query']['pages'].values())[0]
    infos = page.get('imageinfo',[])
    if not infos: return None, None
    info = infos[0]
    url = info.get('url','')
    # 从元数据获取画作名
    meta = info.get('extmetadata',{})
    obj_name = meta.get('ObjectName',{}).get('value','')
    artist_meta = meta.get('Artist',{}).get('value','')
    desc_url = info.get('descriptionurl','')
    return url, {'obj_name':obj_name, 'artist':artist_meta, 'desc_url':desc_url}

def get_linked_article(file_title, lang='zh'):
    """找出使用这张图片的维基文章（通常是画作条目）"""
    params = urllib.parse.urlencode({
        'action':'query','titles':file_title,
        'prop':'fileusage','fulimit':10,
        'format':'json','utf8':1
    })
    data = wiki_request(f'https://{lang}.wikipedia.org/w/api.php?{params}')
    page = list(data['query']['pages'].values())[0]
    usages = page.get('fileusage',[])
    # 返回命名空间0（主条目）的页面
    articles = [u['title'] for u in usages if u.get('ns',0) == 0]
    return articles

def get_page_content(title, lang='zh'):
    """获取维基页面的内容和图片"""
    params = urllib.parse.urlencode({
        'action':'query','titles':title,
        'prop':'extracts|pageimages',
        'format':'json','utf8':1,
        'explaintext':1,'piprop':'original'
    })
    data = wiki_request(f'https://{lang}.wikipedia.org/w/api.php?{params}')
    page = list(data['query']['pages'].values())[0]
    if page.get('missing'): return None, None
    img = page.get('original',{}).get('source','')
    content = page.get('extract','').split('\n==')[0].strip()
    return img or None, content if len(content) > 30 else None

def get_zh_from_en(en_title):
    params = urllib.parse.urlencode({
        'action':'query','titles':en_title,
        'prop':'langlinks','lllang':'zh',
        'format':'json','utf8':1
    })
    data = wiki_request(f'https://en.wikipedia.org/w/api.php?{params}')
    page = list(data['query']['pages'].values())[0]
    ll = page.get('langlinks',[])
    return ll[0]['*'] if ll else None

def deepseek(text, is_en=False, retries=3):
    if is_en:
        prompt = (f'翻译成简体中文，至少400字，纯文字段落，不加格式符号，'
                  f'只保留画作相关内容（画面描述、创作背景、艺术价值、收藏地点）：\n{text[:3000]}')
    else:
        prompt = (f'处理以下文字：1.繁体转简体 2.删除维基编辑说明 3.只输出纯文字段落，'
                  f'不加格式符号：\n{text[:3000]}')
    wait = 3
    for i in range(retries):
        try:
            payload = {"model":"deepseek-chat",
                       "messages":[{"role":"user","content":prompt}],"max_tokens":1500}
            req = urllib.request.Request(
                'https://api.deepseek.com/v1/chat/completions',
                data=json.dumps(payload).encode(),
                headers={'Content-Type':'application/json','Authorization':f'Bearer {DEEPSEEK_KEY}'}
            )
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read())['choices'][0]['message']['content']
        except Exception as e:
            if i < retries-1: time.sleep(wait); wait *= 2
            else: raise

def process_artist(artist, max_works=20):
    artist_zh = artist['zh']
    style = artist['style']
    region = artist['region']
    results = []
    seen_titles = set()

    log(f'\n{"="*50}')
    log(f'画家：{artist_zh} / {style}')

    # Step1: 获取画家页面上的图片
    lang = 'zh' if region == '中国' else 'en'
    artist_en_map = {
        '米开朗基罗':'Michelangelo','约翰内斯·维米尔':'Johannes Vermeer',
    }
    artist_page = artist_zh if region == '中国' else artist_en_map.get(artist_zh, artist_zh)
    
    log(f'  Step1: 获取画家页面图片...')
    try:
        files = get_artist_page_images(artist_zh) if region == '中国' else []
        # 西方画家也用中文维基
        if not files:
            files = get_artist_page_images(artist_zh)
        log(f'  找到{len(files)}个图片文件')
    except Exception as e:
        log(f'  ❌ 获取图片列表失败: {e}')
        files = []
    time.sleep(random.uniform(8,12))

    # Step2: 对每张图片，找对应的画作条目
    for file_title in files:
        if len(results) >= max_works: break
        log(f'  → {file_title[:60]}')
        try:
            # 获取图片URL
            img_url, meta = get_image_info(file_title, 'zh')
            time.sleep(random.uniform(5,8))
            if not img_url: continue

            # 找使用这张图片的文章
            articles = get_linked_article(file_title, 'zh')
            time.sleep(random.uniform(5,8))

            if articles:
                # 获取第一篇文章的内容
                article_title = articles[0]
                if article_title in seen_titles or article_title == artist_zh:
                    continue
                seen_titles.add(article_title)
                
                _, content = get_page_content(article_title, 'zh')
                time.sleep(random.uniform(8,12))
                
                if content and len(content) > 50:
                    desc = deepseek(content, is_en=False)
                    results.append({
                        'title': article_title,
                        'title_en': '',
                        'artist_name': artist_zh,
                        'style': style,
                        'region': region,
                        'image_url': img_url,
                        'description': desc,
                    })
                    log(f'  ✅ [{len(results)}] {article_title} | {len(desc)}字')
                else:
                    # 没有中文内容，试英文维基
                    # 先获取英文标题
                    params = urllib.parse.urlencode({
                        'action':'query','titles':article_title,
                        'prop':'langlinks','lllang':'en',
                        'format':'json','utf8':1
                    })
                    data = wiki_request(f'https://zh.wikipedia.org/w/api.php?{params}')
                    page = list(data['query']['pages'].values())[0]
                    ll = page.get('langlinks',[])
                    if ll:
                        en_title = ll[0]['*']
                        _, en_content = get_page_content(en_title, 'en')
                        time.sleep(random.uniform(8,12))
                        if en_content:
                            desc = deepseek(en_content, is_en=True)
                            results.append({
                                'title': article_title,
                                'title_en': en_title,
                                'artist_name': artist_zh,
                                'style': style,
                                'region': region,
                                'image_url': img_url,
                                'description': desc,
                            })
                            log(f'  ✅ [{len(results)}] {article_title}(英文) | {len(desc)}字')
                        else:
                            log(f'  ⚠️ {article_title} 无内容')
                    else:
                        # 直接用图片放入，无描述先跳过
                        log(f'  ⚠️ {article_title} 无英文对应页')
            else:
                # 图片没有对应文章，用文件名推断画作名
                file_name = file_title.replace('File:','').replace('文件:','')
                file_name = file_name.rsplit('.',1)[0]
                if file_name not in seen_titles:
                    seen_titles.add(file_name)
                    log(f'  ⚠️ 无对应文章，使用文件名: {file_name}')

            time.sleep(random.uniform(3,5))

        except Exception as e:
            log(f'  ❌ {e}')
            time.sleep(5)

    # Step3: 如果作品不足，补充搜索
    if len(results) < max_works:
        log(f'  Step3: 补充搜索（已有{len(results)}幅，还需{max_works-len(results)}幅）...')
        try:
            # 英文维基分类
            cat_name = {
                '米开朗基罗':'Paintings by Michelangelo',
                '约翰内斯·维米尔':'Paintings by Vermeer',
            }.get(artist_zh, '')
            
            if not cat_name and region == '中国':
                # 中国画家用英文维基搜索
                artist_en_search = {
                    '范宽':'Fan Kuan','郭熙':'Guo Xi','李唐':'Li Tang painter',
                    '马远':'Ma Yuan painter','夏圭':'Xia Gui','赵孟頫':'Zhao Mengfu',
                    '黄公望':'Huang Gongwang','倪瓒':'Ni Zan','吴镇':'Wu Zhen painter',
                    '王蒙':'Wang Meng painter','沈周':'Shen Zhou','文徵明':'Wen Zhengming',
                    '唐寅':'Tang Yin','仇英':'Qiu Ying','徐渭':'Xu Wei painter',
                    '郑板桥':'Zheng Xie','金农':'Jin Nong','黄慎':'Huang Shen painter',
                    '李鱓':'Li Shan painter','华嵒':'Hua Yan painter',
                }.get(artist_zh,'')
                if artist_en_search:
                    cat_name = f'Paintings by {artist_en_search}'

            if cat_name:
                params = urllib.parse.urlencode({
                    'action':'query','list':'categorymembers',
                    'cmtitle':f'Category:{cat_name}',
                    'cmlimit':30,'cmnamespace':0,
                    'format':'json','utf8':1
                })
                data = wiki_request(f'https://en.wikipedia.org/w/api.php?{params}')
                members = [m['title'] for m in data['query']['categorymembers']]
                log(f'  英文分类找到{len(members)}幅')
                time.sleep(random.uniform(8,12))

                for en_title in members:
                    if len(results) >= max_works: break
                    try:
                        img, content = get_page_content(en_title, 'en')
                        time.sleep(random.uniform(8,12))
                        if not img or not content: continue
                        
                        zh_title = get_zh_from_en(en_title)
                        time.sleep(random.uniform(5,8))
                        
                        zh_content = None
                        if zh_title and zh_title not in seen_titles:
                            _, zh_raw = get_page_content(zh_title, 'zh')
                            if zh_raw and len(zh_raw) > 50:
                                zh_content = zh_raw
                            time.sleep(random.uniform(8,12))
                        
                        final_title = zh_title or en_title
                        if final_title in seen_titles: continue
                        seen_titles.add(final_title)
                        
                        desc = deepseek(zh_content or content, is_en=not bool(zh_content))
                        results.append({
                            'title': final_title,'title_en': en_title,
                            'artist_name': artist_zh,'style': style,
                            'region': region,'image_url': img,'description': desc,
                        })
                        log(f'  ✅ [{len(results)}] {final_title} | {len(desc)}字')
                        time.sleep(random.uniform(3,5))
                    except Exception as e:
                        log(f'  ❌ {en_title}: {e}')
                        time.sleep(5)
        except Exception as e:
            log(f'  补充搜索失败: {e}')

    log(f'  {artist_zh} 完成：{len(results)}幅')
    return results

# ============ 主程序 ============
try:
    with open(PROGRESS_FILE) as f:
        progress = json.load(f)
    done_artists = set(progress['done_artists'])
    all_results = progress['results']
    log(f'续传：已完成{len(done_artists)}位，共{len(all_results)}幅')
except:
    done_artists = set()
    all_results = []
    log('全新开始')

for idx, artist in enumerate(ARTISTS):
    if artist['zh'] in done_artists:
        log(f'[{idx+1}/{len(ARTISTS)}] 跳过：{artist["zh"]}')
        continue
    log(f'[{idx+1}/{len(ARTISTS)}] 处理：{artist["zh"]}')
    try:
        works = process_artist(artist, max_works=20)
        all_results.extend(works)
        done_artists.add(artist['zh'])
        with open(PROGRESS_FILE,'w') as f:
            json.dump({'done_artists':list(done_artists),'results':all_results},
                f, ensure_ascii=False)
        log(f'💾 已保存，共{len(all_results)}幅')
        time.sleep(random.uniform(15,25))
    except Exception as e:
        log(f'❌ {artist["zh"]}: {e}')
        time.sleep(15)

# 合并到主文件
with open('/tmp/rebuild_progress.json') as f:
    main = json.load(f)
main['results'].extend(all_results)
with open('/tmp/rebuild_progress.json','w') as f:
    json.dump(main, f, ensure_ascii=False)
log(f'\n🎉 完成！新增{len(all_results)}幅，主库共{len(main["results"])}幅')
