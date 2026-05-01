const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { skip = 0, limit = 100, statusFilter = ['pending', 'updated'], countOnly = false } = event
  try {
    if (countOnly) {
      // 只返回总数
      const res = await db.collection('corrections')
        .where({ status: _.in(statusFilter) })
        .count()
      return { success: true, total: res.total }
    }
    const res = await db.collection('corrections')
      .where({ status: _.in(statusFilter) })
      .orderBy('created_at', 'asc')
      .skip(skip)
      .limit(limit)
      .get()
    return { success: true, data: res.data, total: res.data.length }
  } catch(e) {
    return { success: false, error: e.message }
  }
}
