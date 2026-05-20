const cloud = require('wx-server-sdk')
const https = require('https')
const http = require('http')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 获取图片尺寸（只读取PNG/JPEG头部）
function getImageSize(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, (res) => {
      const chunks = []
      let size = 0
      res.on('data', (chunk) => {
        chunks.push(chunk)
        size += chunk.length
        if (size > 65536) req.abort() // 只需要头部64KB
      })
      res.on('end', () => {
        try {
          const buf = Buffer.concat(chunks)
          // JPEG
          if (buf[0] === 0xFF && buf[1] === 0xD8) {
            for (let i = 2; i < buf.length - 8; i++) {
              if (buf[i] === 0xFF && (buf[i+1] === 0xC0 || buf[i+1] === 0xC2)) {
                const h = buf.readUInt16BE(i+5)
                const w = buf.readUInt16BE(i+7)
                return resolve({ w, h })
              }
            }
          }
          // PNG
          if (buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
            const w = buf.readUInt32BE(16)
            const h = buf.readUInt32BE(20)
            return resolve({ w, h })
          }
          resolve(null)
        } catch(e) { resolve(null) }
      })
      res.on('error', () => resolve(null))
    })
    req.on('error', () => resolve(null))
    req.setTimeout(10000, () => { req.abort(); resolve(null) })
  })
}

exports.main = async (event) => {
  const { action = 'scan', dryRun = true } = event
  const { OPENID } = cloud.getWXContext()

  // 验证管理员
  const userRes = await db.collection('users').where({ openid: OPENID, role: 'admin' }).get()
  if (!userRes.data || userRes.data.length === 0) {
    return { success: false, error: '无管理员权限' }
  }

  if (action === 'scan') {
    // 分批获取所有画作
    const longImages = []
    let skip = 0
    const limit = 20
    
    while (true) {
      const res = await db.collection('artworks').skip(skip).limit(limit).get()
      if (!res.data || res.data.length === 0) break
      
      // 并发检测每批图片尺寸
      await Promise.all(res.data.map(async (artwork) => {
        if (!artwork.image_url) return
        const size = await getImageSize(artwork.image_url)
        if (!size) return
        const ratio = Math.max(size.w, size.h) / Math.min(size.w, size.h)
        if (ratio > 10) {
          longImages.push({
            _id: artwork._id,
            title: artwork.title,
            artist_name: artwork.artist_name,
            artist_id: artwork.artist_id,
            image_url: artwork.image_url,
            width: size.w,
            height: size.h,
            ratio: ratio.toFixed(1)
          })
        }
      }))
      
      skip += res.data.length
      if (res.data.length < limit) break
    }
    
    return { success: true, count: longImages.length, artworks: longImages }
  }

  if (action === 'delete') {
    const { ids } = event // 要删除的artwork id列表
    if (!ids || ids.length === 0) return { success: false, error: '未提供id列表' }
    
    const deleted = []
    const artistsToCheck = new Set()
    
    for (const id of ids) {
      const artwork = await db.collection('artworks').doc(id).get()
      if (artwork.data?.artist_id) artistsToCheck.add(artwork.data.artist_id)
      await db.collection('artworks').doc(id).remove()
      deleted.push(id)
    }
    
    // 检查艺术家是否还有其他作品
    const deletedArtists = []
    for (const artistId of artistsToCheck) {
      const remaining = await db.collection('artworks').where({ artist_id: artistId }).count()
      if (remaining.total === 0) {
        await db.collection('artists').doc(artistId).remove()
        deletedArtists.push(artistId)
      }
    }
    
    return { success: true, deletedArtworks: deleted.length, deletedArtists: deletedArtists.length }
  }
}
