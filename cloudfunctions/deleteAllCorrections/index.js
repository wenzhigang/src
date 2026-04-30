const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { statusFilter = ['pending', 'updated'] } = event
  try {
    let deleted = 0
    // 持续删除直到没有记录为止
    for (let i = 0; i < 100; i++) {
      const res = await db.collection('corrections')
        .where({ status: _.in(statusFilter) })
        .remove()
      const removed = res.stats?.removed || 0
      deleted += removed
      if (removed === 0) break
    }
    return { success: true, deleted }
  } catch(e) {
    return { success: false, error: e.message }
  }
}
