import urllib.request, json, urllib.parse, time, re, random, subprocess
from collections import deque

DEEPSEEK_KEY = 'sk-cec8c0cdc3c54db987f6d5b48289b3ea'
TCB = '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb'
ENV = 'cloudbase-d7gl3kh5vf6b71edc'
CWD = '/Users/zhigangwen/code/src/huashuo'
PROGRESS_FILE = '/tmp/rebuild_final_progress.json'

# 每位画家的已知代表作（直接查维基）
ARTIST_WORKS = {
    '范宽':    ['溪山行旅图','雪景寒林图','雪山萧寺图','临流独坐图','秋林飞瀑图'],
    '郭熙':    ['早春图','幽谷图','关山春雪图','树色平远图','窠石平远图'],
    '李唐':    ['万壑松风图','采薇图','清溪渔隐图','村医图','江山小景图','炙艾图','猎雪图','奇峰万木图','乔松图','长夏江寺图'],
    '马远':    ['踏歌图','寒江独钓图','梅石溪凫图','月下把杯图','山径春行图','水图','雪滩双鹭图','西园雅集图','观瀑图','松下闲吟图'],
    '夏圭':    ['溪山清远图','雪堂客话图','西湖柳艇图','山水十二景图','烟岫林居图','松崖客话图','雪江图','远浦归帆图','秋江渔艇图','钱塘观潮图'],
    '赵孟頫':  ['鹊华秋色图','秀石疏林图','双松平远图','红衣罗汉图','浴马图','秋郊饮马图','水村图','兰石图','竹石图','幼舆丘壑图'],
    '黄公望':  ['富春山居图','天池石壁图','九峰雪霁图','溪山雨意图','丹崖玉树图','浮峦暖翠图','快雪时晴图','洞庭奇峰图','富春大岭图','水阁清幽图'],
    '倪瓒':    ['渔庄秋霁图','容膝斋图','六君子图','幽涧寒松图','古木竹石图','秋亭嘉树图','江岸望山图','枯木竹石图','虞山林壑图','狮子林图'],
    '吴镇':    ['渔父图','双松图','洞庭渔隐图','芦花寒雁图','墨竹图','秋江渔隐图','中山图','竹谱图','松泉图','嘉禾八景图'],
    '王蒙':    ['青卞隐居图','葛稚川移居图','夏山高隐图','东山草堂图','秋山草堂图','花溪渔隐图','溪山高逸图','丹山瀛海图','太白山图','岩居高士图'],
    '沈周':    ['庐山高图','东庄图','夜坐图','卧游图','秋林话旧图','西山纪游图','盆菊幽赏图','报德英华图','仿黄公望山水图','京口送别图'],
    '文徵明':  ['真赏斋图','兰亭修禊图','石湖清胜图','古木寒泉图','江南春图','浒溪草堂图','绿荫草堂图','拙政园图','湘君湘夫人图','松壑飞泉图'],
    '唐寅':    ['骑驴归思图','秋风纨扇图','事茗图','王蜀宫妓图','山路松声图','落霞孤鹜图','春山伴侣图','枯槎鸲鹆图','孟蜀宫妓图','临溪水阁图'],
    '仇英':    ['汉宫春晓图','桃源仙境图','赤壁图','莲溪渔隐图','捣衣图','剑阁图','仙山楼阁图','竹院品古图','人物故事图','松亭试泉图'],
    '徐渭':    ['墨葡萄图','杂花图卷','黄甲图','榴实图','牡丹蕉石图','墨荷图','竹石图','梅花图','水墨花卉册','芭蕉图'],
    '郑板桥':  ['兰竹图','竹石图','墨竹图','兰花图','荷花图','竹兰石图','秋菊图','幽兰图','墨兰图','风竹图'],
    '金农':    ['梅花图','墨马图','荷花图','山水图','墨竹图','佛像图','玉壶春色图','寒香图','芭蕉图','花卉图'],
    '黄慎':    ['渔翁图','钟馗图','八仙图','仕女图','墨荷图','秋江晚渡图','携琴访友图','人物图','渔家乐图','流民图'],
    '李鱓':    ['松鼠葡萄图','芭蕉萱石图','荷花图','牡丹图','水仙图','菊花图','竹石图','葫芦图','石榴图','花卉册'],
    '华嵒':    ['桃花双绶图','秋声赋图','柳荫双骏图','猫蝶图','松鹤图','天山积雪图','离垢图','春山暖翠图','花鸟图','秋菊图'],
    '米开朗基罗': ['创造亚当','最后的审判 (米开朗基罗)','西斯廷礼拜堂天顶画','利比亚女先知','德尔斐女先知'],
    '约翰内斯·维米尔': ['戴珍珠耳环的少女','倒牛奶的女仆','读信的女子','地理学家','花边女工','音乐课','持水罐的女子'],
}

# 画家信息
ARTIST_INFO = {
    '范宽':   {'style':'宋代山水','region':'中国'},
    '郭熙':   {'style':'宋代山水','region':'中国'},
    '李唐':   {'style':'宋代山水','region':'中国'},
    '马远':   {'style':'宋代山水','region':'中国'},
    '夏圭':   {'style':'宋代山水','region':'中国'},
    '赵孟頫': {'style':'元代文人画','region':'中国'},
    '黄公望': {'style':'元代文人画','region':'中国'},
    '倪瓒':   {'style':'元代文人画','region':'中国'},
    '吴镇':   {'style':'元代文人画','region':'中国'},
    '王蒙':   {'style':'元代文人画','region':'中国'},
    '沈周':   {'style':'明代吴门','region':'中国'},
    '文徵明': {'style':'明代吴门','region':'中国'},
    '唐寅':   {'style':'明代吴门','region':'中国'},
    '仇英':   {'style':'明代吴门','region':'中国'},
    '徐渭':   {'style':'明代写意','region':'中国'},
    '郑板桥': {'style':'清代扬州八怪','region':'中国'},
    '金农':   {'style':'清代扬州八怪','region':'中国'},
    '黄慎':   {'style':'清代扬州八怪','region':'中国'},
    '李鱓':   {'style':'清代扬州八怪','region':'中国'},
    '华嵒':   {'style':'清代扬州八怪','region':'中国'},
    '米开朗基罗':     {'style':'文艺复兴','region':'西方'},
    '约翰内斯·维米尔':{'style':'巴洛克','region':'西方'},
}

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

def get_page(title, lang='zh'):
    """获取维基页面图片+内容，自动处理重定向"""
    params = urllib.parse.urlencode({
        'action':'query','titles':title,
        'prop':'extracts|pageimages',
        'redirects':1,
        'format':'json','utf8':1,
        'explaintext':1,'piprop':'original'
    })
    data = wiki_request(f'https://{lang}.wikipedia.org/w/api.php?{params}')
    page = list(data['query']['pages'].values())[0]
    if page.get('missing'): return None, None, None
    real_title = page.get('title', title)
    img = page.get('original',{}).get('source','')
    content = page.get('extract','').split('\n==')[0].strip()
    return img or None, content if len(content) > 30 else None, real_title

def get_zh_from_en(en_title):
    params = urllib.parse.urlencode({
        'action':'query','titles':en_title,'redirects':1,
        'prop':'langlinks','lllang':'zh',
        'format':'json','utf8':1
    })
    data = wiki_request(f'https://en.wikipedia.org/w/api.php?{params}')
    page = list(data['query']['pages'].values())[0]
    ll = page.get('langlinks',[])
    return ll[0]['*'] if ll else None

def get_artist_page_works(artist_zh):
    """从画家页面wikitext提取画作链接"""
    params = urllib.parse.urlencode({
        'action':'query','titles':artist_zh,
        'prop':'revisions','rvprop':'content',
        'redirects':1,'format':'json','utf8':1,'formatversion':2
    })
    data = wiki_request(f'https://zh.wikipedia.org/w/api.php?{params}')
    pages = data['query']['pages']
    if not pages: return []
    content = pages[0].get('revisions',[{}])[0].get('content','')
    # 提取所有[[画作名]]链接
    all_links = re.findall(r'\[\[([^\]|#]+?)(?:\|[^\]]+)?\]\]', content)
    painting_links = list(set([l.strip() for l in all_links
                     if any(w in l for w in ['图','画册','图卷','图轴','图页','行旅','山居','春图'])
                     and len(l) < 25 and artist_zh not in l]))
    return painting_links

def deepseek(text, is_en=False, retries=3):
    if is_en:
        prompt = (f'翻译成简体中文，至少400字，纯文字段落，不加格式符号，'
                  f'只保留画作相关内容（画面描述、创作背景、艺术价值、收藏地点）：\n{text[:3000]}')
    else:
        prompt = (f'处理以下文字：1.繁体转简体 2.删除维基编辑说明和无关内容 '
                  f'3.只输出纯文字段落，不加格式符号：\n{text[:3000]}')
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

def search_zh_title(query, artwork_title):
    """搜索中文维基，只返回和画作名高度匹配的结果"""
    params = urllib.parse.urlencode({
        'action':'query','list':'search','srsearch':query,
        'format':'json','srlimit':3,'utf8':1
    })
    data = wiki_request(f'https://zh.wikipedia.org/w/api.php?{params}')
    results = data['query']['search']
    if not results: return None
    
    # 验证：返回标题必须包含画作名的核心词，或画作名包含返回标题
    core = artwork_title.replace('图','').replace('卷','').replace('轴','').replace('册','')
    for r in results:
        title = r['title']
        # 标题和画作名有足够重叠
        if (artwork_title in title or title in artwork_title or
            core in title or 
            # 繁简转换：检查主要字符是否匹配
            sum(1 for c in core if c in title) >= len(core)*0.6):
            return title
    return None  # 没有足够匹配的结果

def get_page_full(title, lang='zh'):
    """获取页面图片+内容+语言链接，使用缩略图"""
    params = urllib.parse.urlencode({
        'action':'query','titles':title,
        'prop':'extracts|pageimages|langlinks',
        'redirects':1,'lllimit':20,
        'format':'json','utf8':1,'explaintext':1,
        'piprop':'thumbnail|original','pithumbsize':960
    })
    data = wiki_request(f'https://{lang}.wikipedia.org/w/api.php?{params}')
    page = list(data['query']['pages'].values())[0]
    if page.get('missing'): return None, None, None, {}
    real_title = page.get('title', title)
    # 优先用缩略图，没有缩略图用原图
    img = (page.get('thumbnail',{}).get('source','') or 
           page.get('original',{}).get('source',''))
    content = page.get('extract','').split('\n==')[0].strip()
    langlinks = {ll['lang']:ll['*'] for ll in page.get('langlinks',[])}
    return img or None, content if len(content)>30 else None, real_title, langlinks

def try_get_artwork(zh_title, artist_zh, style, region):
    """获取画作数据：中文内容+最优图片来源"""
    # Step1: 搜索正确的中文标题
    real_zh_title = (search_zh_title(f'{zh_title} {artist_zh}', zh_title) or 
                     search_zh_title(zh_title, zh_title))
    if not real_zh_title:
        real_zh_title = zh_title
    time.sleep(random.uniform(5,8))

    # Step2: 获取中文页面
    img, zh_content, real_title, langlinks = get_page_full(real_zh_title, 'zh')
    time.sleep(random.uniform(8,12))

    # Step3: 如果中文无图，从英文维基获取图片
    en_title = langlinks.get('en')
    en_content = None
    if not img:
        if not en_title:
            # 在英文维基搜索
            params = urllib.parse.urlencode({
                'action':'query','list':'search',
                'srsearch':f'{real_zh_title} painting',
                'format':'json','srlimit':1,'utf8':1
            })
            data = wiki_request(f'https://en.wikipedia.org/w/api.php?{params}')
            sr = data['query']['search']
            if sr: en_title = sr[0]['title']
            time.sleep(random.uniform(5,8))
        
        if en_title:
            img_en, en_content, _, _ = get_page_full(en_title, 'en')
            time.sleep(random.uniform(8,12))
            if img_en: img = img_en

    # Step4: 如果中文无内容，用英文翻译
    if not zh_content:
        if not en_content and en_title:
            _, en_content, _, _ = get_page_full(en_title, 'en')
            time.sleep(random.uniform(8,12))
        if en_content:
            zh_content = en_content  # 后面deepseek会翻译
            is_en = True
        else:
            return None
    else:
        is_en = False

    if not img:
        return None

    # Step5: DeepSeek处理内容
    desc = deepseek(zh_content, is_en=is_en)

    return {
        'title': real_title or zh_title,
        'title_en': en_title or '',
        'artist_name': artist_zh,
        'style': style,
        'region': region,
        'image_url': img,
        'description': desc,
    }

# 加载进度
try:
    with open(PROGRESS_FILE) as f:
        progress = json.load(f)
    done_keys = set(progress['done_keys'])
    results = progress['results']
    log(f'续传：已完成{len(done_keys)}幅')
except:
    done_keys = set()
    results = []
    log('全新开始')

retry_queue = deque()

for artist_zh, works in ARTIST_WORKS.items():
    info = ARTIST_INFO.get(artist_zh, {'style':'','region':'中国'})
    style = info['style']
    region = info['region']
    
    log(f'\n{"="*50}')
    log(f'画家：{artist_zh} / {style}')
    
    # 先从画家页面提取额外画作
    try:
        extra = get_artist_page_works(artist_zh)
        extra_new = [e for e in extra if e not in works]
        if extra_new:
            log(f'  从画家页面额外找到: {extra_new[:5]}')
            works = works + extra_new[:5]
        time.sleep(random.uniform(5,8))
    except:
        pass
    
    artist_results = []
    for zh_title in works:
        key = f'{artist_zh}_{zh_title}'
        if key in done_keys:
            log(f'  跳过：{zh_title}')
            continue
        
        log(f'  → {zh_title}')
        try:
            data = try_get_artwork(zh_title, artist_zh, style, region)
            if data:
                results.append(data)
                done_keys.add(key)
                artist_results.append(zh_title)
                log(f'  ✅ {data["title"]} | {len(data["description"])}字')
            else:
                log(f'  ❌ 无图或无文，加入重试')
                retry_queue.append((artist_zh, zh_title, style, region))
            time.sleep(random.uniform(3,5))
        except Exception as e:
            log(f'  ❌ {e}，加入重试')
            retry_queue.append((artist_zh, zh_title, style, region))
            time.sleep(5)
    
    log(f'  {artist_zh} 完成：{len(artist_results)}幅')
    
    if len(results) % 10 == 0:
        with open(PROGRESS_FILE,'w') as f:
            json.dump({'done_keys':list(done_keys),'results':results},f,ensure_ascii=False)
        log(f'💾 已保存{len(results)}幅')
    
    time.sleep(random.uniform(10,18))

# 重试
if retry_queue:
    log(f'\n开始重试{len(retry_queue)}幅（等30秒）...')
    time.sleep(30)
    while retry_queue:
        artist_zh, zh_title, style, region = retry_queue.popleft()
        key = f'{artist_zh}_{zh_title}'
        if key in done_keys: continue
        log(f'  重试: {artist_zh}《{zh_title}》')
        try:
            data = try_get_artwork(zh_title, artist_zh, style, region)
            if data:
                results.append(data)
                done_keys.add(key)
                log(f'  ✅ 重试成功: {data["title"]}')
            else:
                log(f'  ❌ 重试失败: {zh_title}')
        except Exception as e:
            log(f'  ❌ 重试失败: {e}')
        time.sleep(random.uniform(10,15))

# 保存并合并
with open(PROGRESS_FILE,'w') as f:
    json.dump({'done_keys':list(done_keys),'results':results},f,ensure_ascii=False)

with open('/tmp/rebuild_progress.json') as f:
    main = json.load(f)
main['results'].extend(results)
with open('/tmp/rebuild_progress.json','w') as f:
    json.dump(main, f, ensure_ascii=False)

log(f'\n🎉 完成！新增{len(results)}幅，主库共{len(main["results"])}幅')
