const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const https = require('https')

const DEFAULT_PROMPT = `请为画作《{title}》（作者：{artist_name}）写一段详尽准确的介绍。

内容应包括：
1. 画作的具体内容描述（画了什么、人物/景物/场景、构图特点、色彩运用）
2. 创作背景和历史背景（创作年代、创作原因、历史事件关联）
3. 画家简介（生卒年、国籍、所属流派、艺术风格特点）
4. 该作品的艺术价值和历史地位
5. 目前收藏地点（如已知）

要求：语言客观准确，参考维基百科的介绍风格，内容详尽完整，直接输出正文，不加标题序号引号`

function callDeepSeek(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload)
    const options = {
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    }
    const req = https.request(options, res => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(body)) }
        catch(e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

exports.main = async (event) => {
  const { artwork_id, title, artist_name } = event
  try {
    // 从数据库读取提示词模板
    let promptTemplate = DEFAULT_PROMPT
    try {
      const settings = await db.collection('settings').where({ key: 'ai_prompt' }).limit(1).get()
      if (settings.data.length > 0) promptTemplate = settings.data[0].value
    } catch {}

    // 替换变量
    const prompt = promptTemplate
      .replace('{title}', title || '')
      .replace('{artist_name}', artist_name || '')

    const result = await callDeepSeek({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是专业的艺术史学者，拥有丰富的绘画知识。请基于你的知识库（包括维基百科、百度百科等权威来源的内容）提供准确详尽的画作介绍。' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.3
    })

    if (!result.choices || !result.choices[0]) {
      return { success: false, error: JSON.stringify(result) }
    }
    return { success: true, description: result.choices[0].message.content.trim() }
  } catch(e) {
    return { success: false, error: e.message }
  }
}
