const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const all = []
  let skip = 0
  while (true) {
    const res = await db.collection('artists').skip(skip).limit(100).get()
    all.push(...res.data)
    if (res.data.length < 100) break
    skip += 100
  }
  return { success: true, data: all }
}
