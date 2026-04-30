const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { artwork_id, description } = event
  if (!artwork_id || !description) {
    return { success: false, error: '参数缺失' }
  }
  try {
    await db.collection('artworks').doc(artwork_id).update({
      data: { description }
    })
    await db.collection('corrections').where({ artwork_id }).update({
      data: { status: 'confirmed', updated_at: db.serverDate() }
    })
    return { success: true }
  } catch(e) {
    return { success: false, error: e.message }
  }
}
