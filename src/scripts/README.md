# 画说数据管理说明

## 新增画作流程
1. `python3 fetch_artwork.py "Wikipedia英文标题" "中文名" "艺术家" "风格" "年代" "媒介" "博物馆"`
2. 图片压缩（如超过5MB）
3. 上传图片到云存储 images/artworks/
4. 补充 new_artwork_XXX.json 的 description 和 ai_analysis
5. `python3 merge_artwork.py new_artwork_XXX.json`
6. 云数据库 artworks 集合 → 导入 artworks_data.json → 冲突处理选 **Upsert**（无需删除旧数据）

## 新增艺术家流程
1. 在 artists_data.json 末尾添加新记录
2. 云数据库 artists 集合 → 导入 artists_data.json → 冲突处理选 **Upsert**

## 新增博物馆流程
1. 在 museums_data.json 末尾添加新记录
2. 云数据库 museums 集合 → 导入 museums_data.json → 冲突处理选 **Upsert**

## 冲突处理说明
- **Insert**：跳过已存在的记录（只新增）
- **Upsert**：覆盖已存在的记录（新增+更新）
- 日常使用选 **Upsert**，安全高效，无需删除旧数据
