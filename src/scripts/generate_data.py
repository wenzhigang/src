"""
画说 - 初始数据生成脚本
生成博物馆、艺术家、画作的JSON数据文件
用于导入微信云开发数据库
"""

import json
import os

# =====================
# 博物馆数据
# =====================
museums = [
    {
        "_id": "museum_001",
        "name": "卢浮宫",
        "name_en": "Louvre Museum",
        "city": "巴黎",
        "country": "法国",
        "description": "世界上最大、参观人数最多的艺术博物馆，收藏了约38万件艺术品，其中展出约35000件。馆内珍藏着达芬奇的《蒙娜丽莎》、米洛斯的《维纳斯》等旷世名作。",
        "cover_url": "https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/louvre.jpg",
        "artwork_count": 5,
        "founded_year": 1793,
        "website": "https://www.louvre.fr"
    },
    {
        "_id": "museum_002",
        "name": "大英博物馆",
        "name_en": "British Museum",
        "city": "伦敦",
        "country": "英国",
        "description": "世界上历史最悠久、规模最宏伟的综合性博物馆之一，收藏来自全球各地超过800万件藏品，涵盖人类文明史两百万年。",
        "cover_url": "https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/british_museum.jpg",
        "artwork_count": 3,
        "founded_year": 1753,
        "website": "https://www.britishmuseum.org"
    },
    {
        "_id": "museum_003",
        "name": "故宫博物院",
        "name_en": "The Palace Museum",
        "city": "北京",
        "country": "中国",
        "description": "中国最大的古代文化艺术博物馆，建立在明清两朝皇宫紫禁城的基础上，收藏有超过186万件珍贵文物，是中华文明的瑰宝。",
        "cover_url": "https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/forbidden_city.jpg",
        "artwork_count": 3,
        "founded_year": 1925,
        "website": "https://www.dpm.org.cn"
    }
]

# =====================
# 艺术家数据
# =====================
artists = [
    {
        "_id": "artist_001",
        "name": "列奥纳多·达芬奇",
        "name_en": "Leonardo da Vinci",
        "birth_year": 1452,
        "death_year": 1519,
        "nationality": "意大利",
        "style": "文艺复兴",
        "bio": "达芬奇是人类历史上最伟大的全才之一。他不仅是画家，还是雕塑家、建筑师、音乐家、数学家、工程师和科学家。在他的画室里，解剖图纸与画布并排放置，因为他相信，只有真正了解人体，才能画出最真实的人物。传说他左手写字、右手作画，睡眠极少，永远处于创作状态。",
        "fun_facts": [
            "达芬奇从未完成过多数作品，因为他总在追求更完美的表现",
            "他的笔记本中有超过13000页的素描和文字，大多用镜像文字写成",
            "他设计了最早的飞行器、太阳能装置和计算器草图"
        ],
        "avatar_url": "https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/mona_lisa.jpg",
        "artwork_count": 3
    },
    {
        "_id": "artist_002",
        "name": "文森特·梵高",
        "name_en": "Vincent van Gogh",
        "birth_year": 1853,
        "death_year": 1890,
        "nationality": "荷兰",
        "style": "后印象派",
        "bio": "梵高在世时几乎默默无闻，仅售出过一幅画。他一生饱受精神疾病折磨，却在短短十年的创作生涯中留下了超过900幅画作。他的画充满了强烈的情感和旋涡般的笔触，仿佛把整个灵魂都倾注在了画布上。37岁时在麦田中离世，身边只有弟弟提奥——他一生中最重要的支持者。",
        "fun_facts": [
            "梵高在世时只卖出了一幅画《红色葡萄园》",
            "他和弟弟提奥共通信超过650封，现已成为艺术史最重要的文献之一",
            "《星夜》创作于精神病院，透过铁窗看见的夜空"
        ],
        "avatar_url": "https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/starry_night.jpg",
        "artwork_count": 2
    },
    {
        "_id": "artist_003",
        "name": "克劳德·莫奈",
        "name_en": "Claude Monet",
        "birth_year": 1840,
        "death_year": 1926,
        "nationality": "法国",
        "style": "印象派",
        "bio": "莫奈是印象派的奠基人，他对光线和色彩的痴迷改变了整个西方绘画史。他在诺曼底吉维尼建造了一座著名的花园，其中的睡莲池成为他晚年创作的主题。令人动容的是，即便在视力几乎丧失的晚年，他仍坚持作画，用感觉和记忆继续描绘那片他深爱的水面。",
        "fun_facts": [
            "印象派这个名字来源于对莫奈画作《印象·日出》的嘲讽，后被艺术家们骄傲接受",
            "莫奈晚年患有严重的白内障，但仍坚持创作睡莲系列",
            "他的吉维尼花园完全按照绘画需求设计，是'先有画后有园'"
        ],
        "avatar_url": "https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/water_lilies.jpg",
        "artwork_count": 2
    }
]

# =====================
# 画作数据
# =====================
artworks = [
    {
        "_id": "artwork_001",
        "title": "蒙娜丽莎",
        "title_en": "Mona Lisa",
        "artist_id": "artist_001",
        "artist_name": "列奥纳多·达芬奇",
        "museum_id": "museum_001",
        "museum_name": "卢浮宫",
        "year": "1503-1519年",
        "style": "文艺复兴",
        "medium": "木板油画",
        "size": "77 × 53 cm",
        "description": "500多年来，她的微笑从未停止让人着迷。达芬奇为这幅画耗费了整整16年，传说他随身携带着它，直到生命的最后一刻。画中女子究竟是谁？为何她的表情既似微笑又似忧愁？这个谜至今无解，却让她成为世界上被复制最多、被研究最多、被参观最多的画作。\n\n达芬奇在这幅画中运用了他发明的'晕涂法'——用极细腻的过渡处理光影，使人物面部没有任何清晰的轮廓线，如同笼罩在朦胧的雾气中。这种技法让蒙娜丽莎的微笑在不同角度、不同距离观看时，呈现出截然不同的情绪。\n\n有趣的是，这幅画最初并不出名。1911年，一名意大利工人将其从卢浮宫盗走，两年后的追寻与发现，才让全世界开始关注这位神秘的女士。",
        "image_url": "https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/mona_lisa.jpg",
        "tags": ["文艺复兴", "肖像画", "油画", "卢浮宫"],
        "is_featured": True,
        "view_count": 0,
        "annotations": [
            {"x": 45, "y": 35, "title": "神秘的微笑", "desc": "达芬奇用晕涂法处理嘴角，使微笑在不同角度呈现不同情绪"},
            {"x": 30, "y": 55, "title": "双手交叠", "desc": "优雅的手部姿态被誉为绘画史上最美的双手"},
            {"x": 70, "y": 40, "title": "背景风景", "desc": "左右两侧的风景刻意画在不同高度，创造出奇妙的深度感"}
        ]
    },
    {
        "_id": "artwork_002",
        "title": "星夜",
        "title_en": "The Starry Night",
        "artist_id": "artist_002",
        "artist_name": "文森特·梵高",
        "museum_id": "museum_001",
        "museum_name": "纽约现代艺术博物馆",
        "year": "1889年",
        "style": "后印象派",
        "medium": "油画",
        "size": "73.7 × 92.1 cm",
        "description": "1889年6月，梵高在法国圣雷米的精神病院中创作了这幅传世之作。那时的他，透过病房的铁窗凝望着夜空，将内心的狂喜与痛苦一并倾注在画布上。\n\n画面中，巨大的旋涡状星云主宰着整个天空，仿佛宇宙在剧烈地呼吸与律动。11颗星星和一轮明月散发出耀眼的光晕，让人感受到强烈的情感张力。左侧那棵直冲云霄的柏树，如同一道连接天地的火焰，既象征着死亡，也暗示着对永恒的渴望。\n\n远处宁静的村庄与动荡的天空形成鲜明对比，这正是梵高内心世界的写照——在混乱与不安中，寻找那一份难以触及的平静。",
        "image_url": "https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/starry_night.jpg",
        "tags": ["后印象派", "油画", "风景", "夜景"],
        "is_featured": True,
        "view_count": 0,
        "annotations": [
            {"x": 15, "y": 20, "title": "旋涡星云", "desc": "梵高用夸张的旋涡笔触表现星云，充满动感与能量"},
            {"x": 75, "y": 15, "title": "月亮", "desc": "明亮的月亮散发出强烈光晕，是画面的视觉焦点之一"},
            {"x": 10, "y": 45, "title": "柏树", "desc": "高耸的柏树直冲天际，在梵高画中常象征死亡与永恒"},
            {"x": 55, "y": 75, "title": "村庄", "desc": "宁静的村庄与动荡天空形成强烈对比"}
        ]
    },
    {
        "_id": "artwork_003",
        "title": "睡莲",
        "title_en": "Water Lilies",
        "artist_id": "artist_003",
        "artist_name": "克劳德·莫奈",
        "museum_id": "museum_001",
        "museum_name": "卢浮宫",
        "year": "1906年",
        "style": "印象派",
        "medium": "油画",
        "size": "89.9 × 94.1 cm",
        "description": "这是莫奈晚年最重要的系列作品之一。在诺曼底吉维尼的花园里，莫奈亲手挖掘了一个池塘，引入睡莲，搭建了那座著名的日式拱桥。从1896年直到去世，他持续描绘这片水面长达30年，留下了超过250幅睡莲画作。\n\n与早期作品不同，这一时期的莫奈已不再追求精确的形态，而是专注于光线在水面上的瞬息变化。画面中，睡莲、水草和天空的倒影融为一体，界限模糊，仿佛进入了一种冥想的状态。\n\n即便在视力几乎丧失的晚年，莫奈仍凭借记忆和感觉坚持创作。他曾说：'我的眼睛终于看见了真正的颜色。'",
        "image_url": "https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/water_lilies.jpg",
        "tags": ["印象派", "油画", "风景", "自然"],
        "is_featured": False,
        "view_count": 0,
        "annotations": [
            {"x": 50, "y": 60, "title": "睡莲", "desc": "莫奈亲手种植的睡莲，每天观察光线变化"},
            {"x": 30, "y": 30, "title": "水面倒影", "desc": "天空与植物的倒影融合在水面，界限消失"},
            {"x": 70, "y": 45, "title": "笔触", "desc": "短促的笔触捕捉光线的瞬间变化，这是印象派的核心技法"}
        ]
    },
    {
        "_id": "artwork_004",
        "title": "戴珍珠耳环的少女",
        "title_en": "Girl with a Pearl Earring",
        "artist_id": "artist_004",
        "artist_name": "约翰内斯·维米尔",
        "museum_id": "museum_002",
        "museum_name": "大英博物馆",
        "year": "1665年",
        "style": "荷兰黄金时代",
        "medium": "油画",
        "size": "44.5 × 39 cm",
        "description": "她被称为'北方的蒙娜丽莎'。与蒙娜丽莎不同，这位少女直视着观者，嘴唇微启，仿佛正要开口说话，又或者刚刚说完了什么。那颗硕大的珍珠耳环在黑暗背景中发出柔和的光，成为整幅画的视觉焦点。\n\n维米尔是17世纪荷兰最神秘的画家之一。他留下的画作不足40幅，关于他的生平几乎无从考证。这幅画的女主角是谁？至今成谜。有人说是他的女儿，有人说是主顾的女儿，也有人说完全是虚构人物。\n\n画中那颗珍珠其实可能根本不是珍珠——经过科学分析，它更像是玻璃或锡制的耳坠，但这并不影响它成为艺术史上最迷人的细节之一。",
        "image_url": "https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/pearl_earring.jpg",
        "tags": ["荷兰黄金时代", "肖像画", "油画"],
        "is_featured": True,
        "view_count": 0,
        "annotations": [
            {"x": 65, "y": 60, "title": "珍珠耳环", "desc": "经科学分析可能是玻璃制品，却成为艺术史最著名的配饰"},
            {"x": 45, "y": 40, "title": "眼神", "desc": "少女直视观者的眼神制造强烈的情感连接"},
            {"x": 48, "y": 52, "title": "微启的嘴唇", "desc": "暗示她正在或即将说话，留给观者无限想象"}
        ]
    },
    {
        "_id": "artwork_005",
        "title": "向日葵",
        "title_en": "Sunflowers",
        "artist_id": "artist_002",
        "artist_name": "文森特·梵高",
        "museum_id": "museum_002",
        "museum_name": "大英博物馆",
        "year": "1888年",
        "style": "后印象派",
        "medium": "油画",
        "size": "92.1 × 73 cm",
        "description": "1888年，梵高在法国南部的阿尔勒迎接好友高更的到来。为了装饰他们将要共同生活的'黄屋'，他创作了一系列向日葵。那个夏天，阳光炙热，向日葵盛开，梵高用他特有的旋转笔触和明亮的黄色，将对友谊和光明的渴望全部倾注于画布之上。\n\n梵高的黄色不只是一种颜色，更是一种情感。他在信中写道：'黄色代表阳光，代表爱，代表我对生活的全部热情。'这一系列作品在他去世后成为全球最知名的画作之一。\n\n1987年，其中一幅《向日葵》以3990万美元在伦敦拍卖，刷新了当时世界纪录，让全世界再次震惊于这位生前贫困潦倒的天才。",
        "image_url": "https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/sunflowers.jpg",
        "tags": ["后印象派", "静物画", "油画"],
        "is_featured": False,
        "view_count": 0,
        "annotations": [
            {"x": 50, "y": 30, "title": "中心向日葵", "desc": "完全盛开的向日葵，象征着生命力的顶点"},
            {"x": 20, "y": 50, "title": "枯萎的花", "desc": "凋谢的花朵与盛开的并排，暗示生命的轮回"},
            {"x": 50, "y": 80, "title": "花瓶", "desc": "简单的陶瓷花瓶，与华丽的花朵形成对比"}
        ]
    }
]

# =====================
# 生成 JSON Lines 文件（微信云开发要求格式）
# 每行一个JSON对象，不是数组
# =====================
output_dir = os.path.dirname(os.path.abspath(__file__))

# 生成博物馆数据
with open(os.path.join(output_dir, 'museums_data.json'), 'w', encoding='utf-8') as f:
    for item in museums:
        f.write(json.dumps(item, ensure_ascii=False) + '\n')
print(f"✅ 已生成 museums_data.json ({len(museums)} 条)")

# 生成艺术家数据
with open(os.path.join(output_dir, 'artists_data.json'), 'w', encoding='utf-8') as f:
    for item in artists:
        f.write(json.dumps(item, ensure_ascii=False) + '\n')
print(f"✅ 已生成 artists_data.json ({len(artists)} 条)")

# 生成画作数据
with open(os.path.join(output_dir, 'artworks_data.json'), 'w', encoding='utf-8') as f:
    for item in artworks:
        f.write(json.dumps(item, ensure_ascii=False) + '\n')
print(f"✅ 已生成 artworks_data.json ({len(artworks)} 条)")

print("\n🎉 数据生成完成！请将以上JSON文件导入微信云开发数据库。")
print("导入路径：云开发控制台 → 数据库 → 对应集合 → 导入")