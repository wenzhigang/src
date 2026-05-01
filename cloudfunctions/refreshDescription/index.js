const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const https = require('https')

const DEFAULT_PROMPT = `请为画作《{title}》（作者：{artist_name}）写一段详尽准确的介绍。

内容应包括：画作的具体内容描述、创作背景和历史背景、画家简介、该作品的艺术价值和历史地位、目前收藏地点。

要求：用连续自然段落写作，语言客观准确，内容详尽完整，直接输出纯文字正文，严禁使用任何Markdown格式`

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

function cleanMarkdown(text) {
  return text
    .replace(/#{1,6}\s+[^\n]*/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

exports.main = async (event) => {
  const { title, artist_name } = event
  try {
    let promptTemplate = DEFAULT_PROMPT
    try {
      const settings = await db.collection('settings').where({ key: 'ai_prompt' }).limit(1).get()
      if (settings.data.length > 0) promptTemplate = settings.data[0].value
    } catch {}

    const prompt = promptTemplate
      .replace('{title}', title || '')
      .replace('{artist_name}', artist_name || '')

    const result = await callDeepSeek({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是专业的艺术史学者，拥有丰富的中西方绘画知识。请基于你的知识库提供准确详尽的画作介绍。输出纯文字，绝对不使用任何Markdown格式。'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.3
    })

    if (!result.choices || !result.choices[0]) {
      return { success: false, error: JSON.stringify(result) }
    }

    return { success: true, description: cleanMarkdown(result.choices[0].message.content) }
  } catch(e) {
    return { success: false, error: e.message }
  }
}
