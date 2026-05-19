const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const https = require('https')
const crypto = require('crypto')

const SECRET_ID = 'REMOVED'
const SECRET_KEY = 'REMOVED'

function sign(secretKey, date, service) {
  const kDate = crypto.createHmac('sha256', 'TC3' + secretKey).update(date).digest()
  const kService = crypto.createHmac('sha256', kDate).update(service).digest()
  const kSigning = crypto.createHmac('sha256', kService).update('tc3_request').digest()
  return kSigning
}

async function tts(text) {
  return new Promise((resolve, reject) => {
    const host = 'tts.tencentcloudapi.com'
    const service = 'tts'
    const action = 'TextToVoice'
    const version = '2019-08-23'
    const timestamp = Math.floor(Date.now() / 1000)
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10)

    const payload = JSON.stringify({
      Text: text.slice(0, 100),
      SessionId: `session_${timestamp}`,
      VoiceType: 101001,
      Codec: 'mp3',
      SampleRate: 16000
    })

    const hashedPayload = crypto.createHash('sha256').update(payload).digest('hex')
    const canonicalRequest = `POST\n/\n\ncontent-type:application/json\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n\ncontent-type;host;x-tc-action\n${hashedPayload}`
    const credentialScope = `${date}/${service}/tc3_request`
    const hashedCanonical = crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${hashedCanonical}`
    const signingKey = sign(SECRET_KEY, date, service)
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex')
    const authorization = `TC3-HMAC-SHA256 Credential=${SECRET_ID}/${credentialScope}, SignedHeaders=content-type;host;x-tc-action, Signature=${signature}`

    const options = {
      hostname: host,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': host,
        'X-TC-Action': action,
        'X-TC-Version': version,
        'X-TC-Timestamp': timestamp.toString(),
        'Authorization': authorization
      }
    }

    const req = https.request(options, res => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(body)
          if (result.Response?.Audio) {
            resolve(result.Response.Audio)
          } else {
            reject(new Error(JSON.stringify(result.Response?.Error || result)))
          }
        } catch(e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

exports.main = async (event) => {
  const { text, fileKey } = event
  if (!text) return { success: false, error: '缺少text参数' }
  try {
    const audio = await tts(text)
    // 把 base64 写入云存储，返回 fileID
    const audioBuffer = Buffer.from(audio, 'base64')
    const key = fileKey || `tts/tts_${Date.now()}.mp3`
    const uploadRes = await cloud.uploadFile({
      cloudPath: key,
      fileContent: audioBuffer
    })
    return { success: true, fileID: uploadRes.fileID }
  } catch(e) {
    return { success: false, error: e.message }
  }
}
