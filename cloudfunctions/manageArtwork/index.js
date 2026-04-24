const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { action, id, data } = event
  const { OPENID } = cloud.getWXContext()

  const userRes = await db.collection('users').where({ openid: OPENID, role: 'admin' }).get()
  if (!userRes.data || userRes.data.length === 0) {
    return { success: false, error: '无管理员权限' }
  }

  try {
    if (action === 'delete') {
      await db.collection('artworks').doc(id).remove()
      return { success: true }
    }
    if (action === 'update') {
      await db.collection('artworks').doc(id).update({ data })
      return { success: true }
    }
    return { success: false, error: '未知操作' }
  } catch (e) {
    return { success: false, error: e.message }
  }
}
