#!/usr/bin/env python3
import os, json, subprocess, re, time, shutil
from PIL import Image

BASE    = '/Volumes/PortableSSD/画/'
TMP_DIR = '/tmp/huashuo_compress/'
TCB     = '/Users/zhigangwen/.nvm/versions/node/v24.15.0/bin/tcb'
ENV_ID  = 'cloudbase-d7gl3kh5vf6b71edc'
CDN     = 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la'
SCRIPTS = '/Users/zhigangwen/code/src/huashuo/src/scripts'
MAX_MB  = 1.5
MAX_PX  = 2400

os.makedirs(TMP_DIR, exist_ok=True)

EXISTING = {
    '塞尚':  ['穿红背心的男孩','静物苹果与梨'],
    '梵高':  ['星夜','向日葵','阿尔勒的卧室','鸢尾花','自画像'],
    '莫奈':  ['睡莲','印象·日出','干草垛','鲁昂大教堂'],
    '拉斐尔':['雅典学院','西斯廷圣母','变容','巴尔达萨雷·卡斯蒂廖内肖像','美丽的花园女神'],
    '毕加索':['格尔尼卡','亚维农的少女','哭泣的女人','镜前少女','老吉他手'],
    '达芬奇':['蒙娜丽莎','最后的晚餐','维特鲁威人','抱银鼠的女子','岩间圣母'],
    '高更':  ['我们从哪里来？我们是谁？我们往哪里去？','布道后的幻象','大溪地妇女','黄色基督'],
    '毕沙罗':[], '马奈':[], '莫兰迪':[],
}

# 代表作关键词（英文文件名匹配）
REPS = {
    '梵高': ['Starry Night Over','Bedroom','Irises','Potato Eaters','Night Cafe',
        'Wheatfield with Crows','Portrait of Dr. Gachet','Almond Blossom',
        'Cafe Terrace','Sower','Wheat Field with Cypress','Bandaged Ear',
        'Siesta','Boats at Saintes','Mulberry Tree','Olive Trees',
        'Yellow House','Cornfield','Harvest at La Crau','Red Vineyard',
        'Peach Tree in Bloom','Portrait of Pere Tanguy','Arlesienne',
        'Enclosed Field','Road with Cypress','Hospital at Saint',
        'Good Samaritan','At Eternity','Pietà','Resurrection of Lazarus',
        'Drinkers','Langlois Bridge','Drawbridge','View of Arles',
        'Factories at Clichy','Fishing in Spring','Undergrowth',
        'Bank of the Oise','Orchard in Blossom','Apricot Tree',
        'Blossoming Pear','Ploughed Field','Rain','Meadow',
        'Pink Peach','Bridge at Trinquetaille','Fisherman on the Beach',
        'The Mulberry','Boats','Self-Portrait 1887'],
    '莫奈': ['Water Lilies','Impression, Sunrise','Haystacks','Rouen Cathedral',
        'Japanese Bridge','Poplars','Cliffs at Etretat','Woman with a Parasol',
        'La Grenouillere','The Magpie','Houses of Parliament','Charing Cross',
        'Waterloo Bridge','San Giorgio Maggiore','Venice','Bordighera',
        'Cap Martin','Morning on the Seine','Autumn Effect','Vetheuil',
        'Lavacourt','Ice Floes','Manneporte','Grainstacks','Meadow at Giverny',
        'Artist Garden','Springtime','The Lunch','Camille','Green Park',
        'Studio Boat','Floating Ice','Windmills in Holland','Tulip Fields',
        'Antibes','Palazzo','Thames','Hyde Park','Regatta','Bank',
        'Morning Haze','The Seine','Bridge over','Pond of Water Lilies',
        'Weeping Willow','The Rose','Irises','Agapanthus'],
    '塞尚': ['Mont Sainte-Victoire','Large Bathers','Card Players',
        'Boy in Red Waistcoat','Apples and Oranges','Basket of Apples',
        'Skull','Plaster Cupid','Harlequin','Mardi Gras','Smoker',
        'Man with Pipe','Woman with Coffee Pot','Madame Cézanne',
        'Uncle Dominique','Self-Portrait','Portrait of Vallier','Gardener',
        'Boy Resting','Bibemus Quarry','Chateau Noir','Banks of the Marne',
        'Bridge of Maincy','Bend in the Road','House in Provence',
        'Gardanne','L Estaque','Gulf of Marseille','Turning Road',
        'Five Bathers','Three Bathers','Modern Olympia','Pastoral',
        'Poplars','Viaduct','Railway Cutting','Pistachio Tree',
        'Pine Tree','Rocks at Fontainebleau','Bibémus','Jas de Bouffan',
        'The Lake','Still Life with Apples','Still Life Drapery',
        'Pyramid of Skulls','Eternal Feminine','Temptation'],
    '毕沙罗': ['Boulevard Montmartre','Rue Saint-Honore','Harvest','Apple Picking',
        'Gleaners','Peasant Women','Young Peasant','Haymaking','Woman Washing',
        'Wheelbarrow','Kitchen Garden','Banks of the Oise','Pontoise',
        'Louveciennes','Red Roofs','Entrance to the Village','Crossroads',
        'Little Bridge','Hermitage','Wooded Landscape','Two Women Chatting',
        'Market at Gisors','Poultry Market','Place du Havre',
        'Gare Saint-Lazare','Boulevard des Italiens','Place du Theatre',
        'Port of Rouen','Morning Sunlight','Snow Effect','Winter Landscape',
        'Spring Landscape','Autumn Landscape','Eragny','Apple Trees',
        'Vegetable Garden','Woman Bathing','Bather','Children in a Garden',
        'Orchard','Plum Trees','Barges','Self-Portrait','View from'],
    '马奈': ['Olympia','Luncheon on the Grass','Bar at Folies','Balcony',
        'Boating','In the Boat','Argenteuil','Nana','The Plum',
        'Beer Drinkers','Music in Tuileries','Execution of Maximilian',
        'Spanish Singer','Portrait of Emile Zola','Young Lady',
        'Woman with a Parrot','Fifer','The Philosopher','Ragpicker',
        'Absinthe Drinker','Portrait of Baudelaire','Portrait of Berthe',
        'The Reader','The Artist','Rue de Berne','The Escape',
        'Steamboat','Battle of Kearsarge','Roses','Peonies','Clematis',
        'Portrait of Mallarmé','The Ham','Asparagus','Brioche','Lemon',
        'The Salmon','Cafe Concert','Waitress','Masked Ball',
        'Portrait of Faure','Spring','Roadmenders','Flags','Monet'],
    '高更': ['Tahitian Women','Where Do We Come','Vision after the Sermon',
        'Yellow Christ','Spirit of the Dead','Manao Tupapau',
        'Two Tahitian Women','Nafea Faa','Te Aa No','Hina Tefatou',
        'Parau na','Fatata te Miti','Ia Orana Maria','Siesta',
        'Riders on the Beach','White Horse','Te Matete','Mahana no Atua',
        'Nave Nave Mahana','L Appel','The Market','Tahitian Landscape',
        'Brittany Landscape','Breton Girls Dancing','Breton Women',
        'Jacob Wrestling','Christ in the Garden','Self-Portrait Les',
        'Self-Portrait with Yellow','Portrait of a Woman','Vahine',
        'The Meal','The Big Tree','When Will You Marry',
        'Three Tahitians','Mother and Child','Nave Nave Fenua',
        'Parau Parau','Otahi','Still Life with Teapot',
        'The Call','Contes Barbares','And the Gold','Maternity',
        'Two Women','Old Women','Flowers of France'],
}

# tif画家直接按序号命名
TIF_ARTISTS = {
    '拉斐尔': '文艺复兴',
    '毕加索': '立体主义',
    '莫兰迪': '现代主义',
    '达芬奇': '文艺复兴',
}

TIF_NAME_MAP = {
    '拉斐尔': ['圣母的婚礼','雅典学院（习作）','圣母加冕','草地上的圣母','美丽的女园丁',
        '金翅雀圣母','圣母子与施洗约翰','神学的胜利','哲学的胜利','诗歌的胜利',
        '法学的胜利','帕纳索斯山','火灾','波尔戈火灾','奥斯提亚海战',
        '波尔戈火灾（局部）','赫利奥多罗斯被逐出神殿','圣彼得从监狱获释',
        '波里纳罗战役','阿提拉与教皇利奥的会面','签字厅壁画全景',
        '巴尔达萨雷肖像（习作）','卡斯蒂廖内肖像（草稿）','教皇朱利叶斯二世',
        '教皇利奥十世','福利尼奥圣母','西斯廷圣母（草稿）','圣人塞西利亚',
        '变容（草稿）','基督显圣容','圣乔治与龙','圣米迦勒','三美神',
        '圣母子（卡塞托版）','圣母子（安塞德伊版）','圣母子（科内斯塔比莱版）',
        '圣母子与圣安娜','带帷幔的圣母','洛雷托圣母','带面纱的女子',
        '拉费纳的圣母','小考伯圣母','阿尔巴圣母','圣母子与施洗约翰（草图）',
        '素描人物习作','素描头像习作','素描手部研究','圣人头像研究'],
    '毕加索': ['亚维农少女（草图）','格尔尼卡（习作）','哭泣的女人（草图）','三个音乐家',
        '坐着的女人','躺着的女人','镜子前的女人','读书的女人','梦','沉睡者',
        '女人与乌鸦','多拉·玛尔肖像','奥尔加肖像','马里-特雷莎肖像',
        '自画像','蓝色时期自画像','科学与慈善','第一次圣餐',
        '老吉他手（草图）','失明者用餐','杂技演员家庭','马戏团家庭',
        '斗牛士','斗牛场景','鸽子与豌豆','有蜡烛的静物','曼陀林',
        '小提琴','吉他','报纸与葡萄酒杯','咖啡馆里的男人',
        '阿尔勒风格女人','坐着的女人（立体）','站着的女人','裸体习作',
        '两个女人跑步','海边的浴者','海滩上的人','母与子','亲吻',
        '鸽子','和平鸽','牛头','公牛系列','山羊','猫头鹰',
        '花束','花与蜜蜂','地中海风景'],
    '莫兰迪': [f'静物 No.{i+1}' for i in range(50)],
    '达芬奇': ['蒙娜丽莎（草图）','最后的晚餐（草图）','维特鲁威人（习作）',
        '抱银鼠的女子（草图）','岩间圣母（习作）','圣安娜与圣母子（草图）',
        '施洗约翰','天使报喜','东方博士来朝','圣杰罗姆','贝诺瓦的圣母',
        '圣母加冕','救世主','持花圣母','卡内吉圣母','利塔圣母',
        '美丽的费隆妮叶','音乐家肖像','格尼维拉·班琪肖像',
        '老人与水流研究','人体比例研究','骨骼解剖图','肌肉解剖图',
        '心脏解剖研究','胎儿研究','植物研究','岩石地质研究',
        '战马习作','头部素描','手部素描'],
}

def compress_image(src_path, dst_path, max_mb=MAX_MB, max_px=MAX_PX):
    img = Image.open(src_path).convert('RGB')
    w, h = img.size
    if max(w, h) > max_px:
        ratio = max_px / max(w, h)
        img = img.resize((int(w*ratio), int(h*ratio)), Image.LANCZOS)
    quality = 88
    while quality >= 40:
        img.save(dst_path, 'JPEG', quality=quality, optimize=True)
        if os.path.getsize(dst_path) / 1024 / 1024 <= max_mb:
            break
        quality -= 8
    return os.path.getsize(dst_path) / 1024 / 1024

def upload_to_cloud(local_path, cloud_path):
    result = subprocess.run(
        [TCB, 'storage', 'upload', local_path, cloud_path, '-e', ENV_ID],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise Exception(result.stderr[:200])
    return f'{CDN}/{cloud_path}'

out_file = os.path.join(SCRIPTS, 'new_western_artworks2.json')
if os.path.exists(out_file): os.remove(out_file)

seq_base = 3000
total_uploaded = 0

# ── 处理有英文文件名的画家 ─────────────────────
JPG_ARTISTS = {
    '梵高': '后印象派', '莫奈': '印象派', '塞尚': '后印象派',
    '毕沙罗': '印象派', '马奈': '印象派', '高更': '后印象派',
}

for artist_cn, style in JPG_ARTISTS.items():
    print(f'\n{"="*50}\n处理: {artist_cn}')
    folder = os.path.join(BASE, artist_cn)
    reps = REPS[artist_cn]
    existing_titles = EXISTING.get(artist_cn, [])

    # 收集所有图片
    all_files = []
    for root, dirs, fnames in os.walk(folder):
        for f in fnames:
            if not f.startswith('._') and f.lower().endswith(('.jpg','.jpeg','.png')):
                all_files.append(os.path.join(root, f))

    # 按代表作关键词匹配
    selected = []
    used_paths = set()
    for kw in reps:
        if len(selected) >= 50: break
        kw_l = kw.lower()
        for fp in all_files:
            if fp in used_paths: continue
            if kw_l[:12] in os.path.basename(fp).lower():
                used_paths.add(fp)
                # 提取英文名作为标题
                title_en = re.sub(r',?\s*\d{4}.*$', '', os.path.splitext(os.path.basename(fp))[0]).strip()
                title_en = re.sub(r'\s+淘宝.*$', '', title_en).strip()
                selected.append((fp, title_en))
                break

    # 补足50幅
    for fp in all_files:
        if len(selected) >= 50: break
        if fp not in used_paths:
            used_paths.add(fp)
            title_en = re.sub(r',?\s*\d{4}.*$', '', os.path.splitext(os.path.basename(fp))[0]).strip()
            title_en = re.sub(r'\s+淘宝.*$', '', title_en).strip()
            selected.append((fp, title_en))

    print(f'选出 {len(selected)} 幅，开始压缩上传...')

    for i, (src, title) in enumerate(selected):
        dst = os.path.join(TMP_DIR, f'{artist_cn}_{i:03d}.jpg')
        try:
            size_mb = compress_image(src, dst)
            cloud_path = f'images/artworks/western2/{artist_cn}_{i:03d}.jpg'
            url = upload_to_cloud(dst, cloud_path)
            record = {
                '_id': f'w2_{artist_cn}_{i:04d}',
                'title': title,
                'artist_name': artist_cn,
                'style': style,
                'image_url': url,
                'description': '',
                'tags': [style, artist_cn],
                'is_featured': False,
                'seq': seq_base + total_uploaded,
            }
            with open(out_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(record, ensure_ascii=False) + '\n')
            total_uploaded += 1
            print(f'  [{i+1}/{len(selected)}] ✓ {title[:25]} ({size_mb:.2f}MB)')
        except Exception as e:
            print(f'  [{i+1}] ✗ {e}')

# ── 处理编号命名的画家（tif）─────────────────
for artist_cn, style in TIF_ARTISTS.items():
    print(f'\n{"="*50}\n处理: {artist_cn}')
    folder = os.path.join(BASE, artist_cn)
    name_map = TIF_NAME_MAP[artist_cn]
    files = sorted([f for f in os.listdir(folder) if f.endswith('.tif')])[:50]
    print(f'选出 {len(files)} 幅，开始压缩上传...')

    for i, fname in enumerate(files):
        src = os.path.join(folder, fname)
        dst = os.path.join(TMP_DIR, f'{artist_cn}_{i:03d}.jpg')
        title = name_map[i] if i < len(name_map) else f'{artist_cn}作品 No.{i+1}'
        try:
            size_mb = compress_image(src, dst)
            cloud_path = f'images/artworks/western2/{artist_cn}_{i:03d}.jpg'
            url = upload_to_cloud(dst, cloud_path)
            record = {
                '_id': f'w2_{artist_cn}_{i:04d}',
                'title': title,
                'artist_name': artist_cn,
                'style': style,
                'image_url': url,
                'description': '',
                'tags': [style, artist_cn],
                'is_featured': False,
                'seq': seq_base + total_uploaded,
            }
            with open(out_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(record, ensure_ascii=False) + '\n')
            total_uploaded += 1
            print(f'  [{i+1}/{len(files)}] ✓ {title[:25]} ({size_mb:.2f}MB)')
        except Exception as e:
            print(f'  [{i+1}] ✗ {e}')

print(f'\n全部完成！共上传 {total_uploaded} 幅')
print(f'输出文件: {out_file}')
print('下一步同步数据库:')
print('cd /Users/zhigangwen/code/src/huashuo/src/scripts && python3 sync_to_cloud.py artworks')
