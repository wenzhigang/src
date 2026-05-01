const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const DEFAULT_PROMPT = `请为画作《{title}》（作者：{artist_name}）写一段详尽准确的介绍。

内容应包括：画作的具体内容描述、创作背景和历史背景、画家简介、该作品的艺术价值和历史地位、目前收藏地点。

要求：用连续自然段落写作，语言客观准确，内容详尽完整，直接输出纯文字正文，严禁使用任何Markdown格式`

exports.main = async (event) => {
  const { action, prompt, done, total, last_artwork_id } = event
  try {
    if (action === 'get') {
      const res = await db.collection('settings').where({ key: 'ai_prompt' }).limit(1).get()
      return { success: true, prompt: res.data.length > 0 ? res.data[0].value : DEFAULT_PROMPT }
    }
    if (action === 'set') {
      const res = await db.collection('settings').where({ key: 'ai_prompt' }).limit(1).get()
      if (res.data.length > 0) {
        await db.collection('settings').doc(res.data[0]._id).update({ data: { value: prompt, updated_at: db.serverDate() } })
      } else {
        await db.collection('settings').add({ data: { key: 'ai_prompt', value: prompt, updated_at: db.serverDate() } })
      }
      return { success: true }
    }
    if (action === 'set_progress') {
      const res = await db.collection('settings').where({ key: 'batch_progress' }).limit(1).get()
      const data = { key: 'batch_progress', done, total, last_artwork_id, updated_at: db.serverDate() }
      if (res.data.length > 0) {
        await db.collection('settings').doc(res.data[0]._id).update({ data })
      } else {
        await db.collection('settings').add({ data })
      }
      return { success: true }
    }
    return { success: false, error: '未知操作' }
  } catch(e) {
    return { success: false, error: e.message }
  }
}
