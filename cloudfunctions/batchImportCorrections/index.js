const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { skip = 0, limit = 50, includeReviewed = false, includeManual = false } = event
  try {
    // 构建查询：字段不存在 OR 字段为空 OR 字段为'ai' + 根据选项包含reviewed/manual
    const allowedQualities = [null, undefined, '', 'ai']
    if (includeReviewed) allowedQualities.push('reviewed')
    if (includeManual) allowedQualities.push('manual')

    const res = await db.collection('artworks')
      .where(_.or([
        { desc_quality: _.exists(false) },
        { desc_quality: _.in(allowedQualities.filter(v => v !== null && v !== undefined)) },
      ]))
      .orderBy('seq', 'asc')
      .skip(skip)
      .limit(limit)
      .get()

    if (res.data.length === 0) {
      return { success: true, imported: 0, skipped: 0, done: true }
    }

    const ids = res.data.map(a => a._id)
    const existing = await db.collection('corrections')
      .where({ artwork_id: _.in(ids) })
      .field({ artwork_id: true })
      .get()
    const existingIds = new Set(existing.data.map(r => r.artwork_id))

    const toInsert = res.data.filter(a => !existingIds.has(a._id))
    let imported = 0
    for (const a of toInsert) {
      await db.collection('corrections').add({
        data: {
          artwork_id: a._id,
          title: a.title || '',
          artist_name: a.artist_name || '',
          image_url: a.image_url || '',
          description: a.description || '',
          status: 'pending',
          created_at: db.serverDate()
        }
      })
      imported++
    }

    return {
      success: true,
      imported,
      skipped: existingIds.size,
      total_in_batch: res.data.length,
      done: res.data.length < limit
    }
  } catch(e) {
    return { success: false, error: e.message }
  }
}
