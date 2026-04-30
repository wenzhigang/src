const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const DEFAULT_PROMPT = `请为画作《{title}》（作者：{artist_name}）写一段详尽准确的介绍。

内容应包括：
1. 画作的具体内容描述（画了什么、人物/景物/场景、构图特点、色彩运用）
2. 创作背景和历史背景（创作年代、创作原因、历史事件关联）
3. 画家简介（生卒年、国籍、所属流派、艺术风格特点）
4. 该作品的艺术价值和历史地位
5. 目前收藏地点（如已知）

要求：语言客观准确，参考维基百科的介绍风格，内容详尽完整，直接输出正文，不加标题序号引号`

exports.main = async (event) => {
  const { action, prompt } = event
  try {
    if (action === 'get') {
      const res = await db.collection('settings').where({ key: 'ai_prompt' }).limit(1).get()
      if (res.data.length > 0) {
        return { success: true, prompt: res.data[0].value }
      }
      return { success: true, prompt: DEFAULT_PROMPT }
    }
    if (action === 'set') {
      const res = await db.collection('settings').where({ key: 'ai_prompt' }).limit(1).get()
      if (res.data.length > 0) {
        await db.collection('settings').doc(res.data[0]._id).update({
          data: { value: prompt, updated_at: db.serverDate() }
        })
      } else {
        await db.collection('settings').add({
          data: { key: 'ai_prompt', value: prompt, updated_at: db.serverDate() }
        })
      }
      return { success: true }
    }
    return { success: false, error: '未知操作' }
  } catch(e) {
    return { success: false, error: e.message }
  }
}
