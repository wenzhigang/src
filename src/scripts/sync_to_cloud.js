/**
 * 画说数据同步脚本 - 使用微信云开发HTTP API
 * 用法: node sync_to_cloud.js [collection]
 * 示例: node sync_to_cloud.js artworks
 *       node sync_to_cloud.js artists  
 *       node sync_to_cloud.js museums
 *       node sync_to_cloud.js all
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

const ENV_ID = 'cloudbase-d7gl3kh5vf6b71edc'
const SCRIPTS_DIR = path.dirname(__filename)

// 获取微信云开发访问token
async function getAccessToken() {
  // 从微信开发者工具的本地缓存读取token
  const tokenPath = `${process.env.HOME}/Library/Application Support/微信开发者工具/Default/.access_token`
  const tokenPath2 = `${process.env.HOME}/Library/Application Support/微信开发者工具/WeappSimulator/storage/.access_token`
  
  // 尝试从开发者工具配置读取
  const possiblePaths = [
    tokenPath,
    tokenPath2,
    `${process.env.HOME}/.wxdevtools/access_token`,
  ]
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log(`找到token: ${p}`)
      return fs.readFileSync(p, 'utf-8').trim()
    }
  }
  
  return null
}

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch(e) {
          resolve(data)
        }
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function upsertRecord(token, collection, record) {
  const body = {
    env: ENV_ID,
    query: `db.collection('${collection}').doc('${record._id}').set({data: ${JSON.stringify(record)}})`
  }
  
  const options = {
    hostname: 'api.weixin.qq.com',
    path: `/tcb/databaseupdate?access_token=${token}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }
  
  return httpsRequest(options, body)
}

async function main() {
  console.log('⚠️  此脚本需要微信access_token')
  console.log('请改用以下更简单的方式：\n')
  console.log('📋 增量更新最佳实践：')
  console.log('   新增1条记录时：直接在云开发控制台点"添加记录"')  
  console.log('   更新1条记录时：直接在云开发控制台点击记录编辑')
  console.log('   批量新增时：只导入新增的JSON行（不删除旧数据）\n')
  console.log('✅ 正确的增量导入方法：')
  console.log('   1. 只将新增的记录写入一个临时JSON文件')
  console.log('   2. 云数据库导入时冲突处理选"Insert"（跳过已存在）')
  console.log('   3. 不需要先删除旧数据！')
}

main()
