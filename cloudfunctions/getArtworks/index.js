const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { skip = 0, limit = 20, type = 'artworks' } = event
  try {
    const res = await db.collection(type)
      .orderBy('seq', 'asc')
      .skip(skip)
      .limit(limit)
      .get()
    return { success: true, data: res.data }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
