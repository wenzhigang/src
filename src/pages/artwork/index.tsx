import { View, Text, Image, ScrollView } from '@tarojs/components'
import { useState, useEffect, useRef } from 'react'
import Taro from '@tarojs/taro'
import { useFontScale } from '../../utils/fontScale'
import './index.scss'

interface Artwork {
  _id: string
  title: string
  title_en?: string
  artist_id?: string
  artist_name: string
  museum_name?: string
  year?: string
  style?: string
  medium?: string
  size?: string
  description: string
  image_url: string
  tags?: string[]
}

export default function ArtworkDetail() {
  const [artwork, setArtwork] = useState<Artwork | null>(null)
  const [loading, setLoading]         = useState(true)
  const [isFavorited, setIsFavorited] = useState(false)
  const [favDocId, setFavDocId]       = useState<string | null>(null)
  const [favLoading, setFavLoading]   = useState(false)
  const [artworkList, setArtworkList] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState(0)
  const { scale, setScale } = useFontScale()
  const [showFontMenu, setShowFontMenu] = useState(false)
  const [touchStartY, setTouchStartY] = useState(0)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioPaused, setAudioPaused] = useState(false)
  const audioCtxRef = useRef<any>(null)
  const audioStopRef = useRef(false)
  const audioPausedRef = useRef(false)
  const audioSegmentsRef = useRef<string[]>([])
  const audioSegIdxRef = useRef(0)
  const currentIndexRef = useRef(0)
  const switchingRef = useRef(false)
  const lastSwitchTimeRef = useRef(0)
  const artworkListRef = useRef<string[]>([])

  useEffect(() => {
    return () => {
      audioStopRef.current = true
      if (audioCtxRef.current) {
        try { audioCtxRef.current.stop(); audioCtxRef.current.destroy() } catch {}
        audioCtxRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const params = ((Taro.getCurrentInstance() || {}).router || {}).params
    const id = (params && params.id) || 'artwork_002'
    const list = (Taro as any)._artworkList as string[] || []
    if (list.length > 0) {
      setArtworkList(list)
      artworkListRef.current = list
      const idx = list.indexOf(id)
      const initIdx = idx >= 0 ? idx : 0
      setCurrentIndex(initIdx)
      currentIndexRef.current = initIdx
    } else {
      // 没有列表时，尝试从存储里恢复
      try {
        const saved = Taro.getStorageSync('_artworkList')
        if (saved && saved.length > 0) {
          setArtworkList(saved)
          artworkListRef.current = saved
          const idx = saved.indexOf(id)
          const initIdx = idx >= 0 ? idx : 0
          setCurrentIndex(initIdx)
          currentIndexRef.current = initIdx
        }
      } catch {}
    }
    loadArtwork(id)
  }, [])

  const loadArtwork = async (id: string) => {
    try {
      const db = Taro.cloud.database()
      const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error('超时')), 15000))
      const res = await Promise.race([db.collection('artworks').doc(id).get(), timeoutP]) as any
      if (res.data) {
        setArtwork(res.data as Artwork)
        checkFav(id)
        recordHistory(res.data as Artwork)
      } else {
        setArtwork(null)
      }
    } catch(e) {
      const msg = String(e).slice(0, 30)
      Taro.showToast({ title: `失败:${msg}`, icon: 'none', duration: 5000 })
      setArtwork(null)
    } finally {
      setLoading(false)
    }
  }


  const checkFav = async (id: string) => {
    try {
      const ui = Taro.getStorageSync('userInfo')
      if (!ui?.openid) return
      const db = Taro.cloud.database()
      const res = await db.collection('favorites')
        .where({ openid: ui.openid, artwork_id: id }).limit(1).get()
      if (res.data.length > 0) { setIsFavorited(true); setFavDocId(res.data[0]._id) }
    } catch {}
  }

  const recordHistory = async (a: Artwork) => {
    try {
      const ui = Taro.getStorageSync('userInfo')
      if (!ui?.openid) return
      const db = Taro.cloud.database()
      const ex = await db.collection('history')
        .where({ openid: ui.openid, artwork_id: a._id }).limit(1).get()
      if (ex.data.length > 0) {
        await db.collection('history').doc(ex.data[0]._id).update({
          data: { viewed_at: db.serverDate(), view_count: db.command.inc(1) }
        })
      } else {
        await db.collection('history').add({
          data: { openid: ui.openid, artwork_id: a._id, title: a.title,
                  artist_name: a.artist_name, image_url: a.image_url,
                  viewed_at: db.serverDate(), view_count: 1 }
        })
      }
    } catch {}
  }

  // 获取TTS临时URL
  const getTtsUrl = async (text: string, idx: number): Promise<string | null> => {
    try {
      const res = await Taro.cloud.callFunction({
        name: 'textToSpeech',
        data: { text, fileKey: `tts/tts_${Date.now()}_${idx}.mp3` }
      }) as any
      if (!res.result?.success) return null
      const tempRes = await Taro.cloud.getTempFileURL({ fileList: [res.result.fileID] }) as any
      return tempRes.fileList[0].tempFileURL
    } catch { return null }
  }

  // 从指定段开始播放
  const playFromIdx = async (startIdx: number) => {
    const segs = audioSegmentsRef.current
    let nextUrl = getTtsUrl(segs[startIdx], startIdx)
    for (let i = startIdx; i < segs.length; i++) {
      if (audioStopRef.current) break
      const url = await nextUrl
      if (audioStopRef.current) break
      if (!url) {
        if (i + 1 < segs.length) nextUrl = getTtsUrl(segs[i + 1], i + 1)
        continue
      }
      if (i + 1 < segs.length) nextUrl = getTtsUrl(segs[i + 1], i + 1)
      audioSegIdxRef.current = i
      await new Promise<void>((resolve) => {
        const ctx = Taro.createInnerAudioContext()
        audioCtxRef.current = ctx
        ctx.src = url
        if (i === startIdx) { setAudioLoading(false); setAudioPlaying(true) }
        ctx.onEnded(() => { ctx.destroy(); audioCtxRef.current = null; resolve() })
        ctx.onError(() => { ctx.destroy(); audioCtxRef.current = null; resolve() })
        ctx.play()
      })
    }
    if (!audioPausedRef.current) {
      setAudioPlaying(false)
      audioSegIdxRef.current = 0
      audioSegmentsRef.current = []
    }
  }

  const toggleAudio = async () => {
    // 停止/暂停
    if (audioPlaying) {
      audioPausedRef.current = true
      audioStopRef.current = true
      setAudioPaused(true)
      setAudioPlaying(false)
      if (audioCtxRef.current) {
        audioCtxRef.current.stop()
        audioCtxRef.current.destroy()
        audioCtxRef.current = null
      }
      return
    }
    // 继续
    if (audioPausedRef.current && audioSegmentsRef.current.length > 0) {
      audioPausedRef.current = false
      audioStopRef.current = false
      setAudioPaused(false)
      setAudioLoading(true)
      playFromIdx(audioSegIdxRef.current)
      return
    }
    // 全新播放
    audioStopRef.current = false
    audioPausedRef.current = false
    setAudioPaused(false)
    setAudioLoading(true)

    // 预处理文本
    const cleaned = desc
      .replace(/列奥纳多·达·芬奇/g, '达芬奇')
      .replace(/米开朗基罗·博那罗蒂/g, '米开朗基罗')
      .replace(/拉斐尔·桑西/g, '拉斐尔')
      .replace(/伦勃朗·范·莱因/g, '伦勃朗')
      .replace(/扬·维米尔/g, '维米尔')
      .replace(/约翰内斯·维米尔/g, '维米尔')
      .replace(/文森特·梵高/g, '梵高')
      .replace(/克劳德·莫奈/g, '莫奈')
      .replace(/保罗·塞尚/g, '塞尚')
      .replace(/保罗·高更/g, '高更')
      .replace(/桑德罗·波提切利/g, '波提切利')
      .replace(/彼得·保罗·鲁本斯/g, '鲁本斯')
      .replace(/[A-Za-z]+/g, '')
      .replace(/·/g, '')
      .replace(/[（(][^）)]*[）)]/g, '')
      .replace(/\n+/g, '。')
      .replace(/\s+/g, ' ')
      .trim()

    // 按句号分段，每段不超过90字
    const segs: string[] = []
    const sentences = cleaned.split(/(?<=[。！？])/)
    let cur = ''
    for (const s of sentences) {
      if ((cur + s).length > 90 && cur) { segs.push(cur.trim()); cur = s }
      else cur += s
    }
    if (cur.trim()) segs.push(cur.trim())

    audioSegmentsRef.current = segs
    audioSegIdxRef.current = 0
    playFromIdx(0)
  }

  const switchArtwork = (dir: 'prev' | 'next') => {
    const list = artworkListRef.current
    if (list.length === 0) {
      Taro.showToast({ title: '请从列表页进入以支持切换', icon: 'none', duration: 1500 })
      return
    }
    const curIdx = currentIndexRef.current
    const newIdx = dir === 'prev' ? curIdx - 1 : curIdx + 1
    if (newIdx < 0 || newIdx >= list.length) {
      Taro.showToast({ title: dir === 'prev' ? '已是第一幅' : '已是最后一幅', icon: 'none', duration: 1000 })
      return
    }
    const nextId = list[newIdx]
    // 切换前停止音频
    audioStopRef.current = true
    if (audioCtxRef.current) {
      audioCtxRef.current.stop()
      audioCtxRef.current.destroy()
      audioCtxRef.current = null
    }
    // 用redirectTo替换当前页面，避免state异步问题
    ;(Taro as any)._artworkList = list
    Taro.redirectTo({ url: `/pages/artwork/index?id=${nextId}` })
  }

  const toggleFav = async () => {
    const ui = Taro.getStorageSync('userInfo')
    if (!ui?.openid) { Taro.showToast({ title: '请先登录', icon: 'none' }); return }
    if (favLoading || !artwork) return
    setFavLoading(true)
    try {
      const db = Taro.cloud.database()
      if (isFavorited && favDocId) {
        await db.collection('favorites').doc(favDocId).remove()
        setIsFavorited(false); setFavDocId(null)
        Taro.showToast({ title: '已取消收藏', icon: 'none' })
      } else {
        const res = await db.collection('favorites').add({
          data: { openid: ui.openid, artwork_id: artwork._id, title: artwork.title,
                  artist_name: artwork.artist_name, image_url: artwork.image_url,
                  created_at: db.serverDate() }
        })
        setIsFavorited(true); setFavDocId(res._id as string)
        Taro.showToast({ title: '已收藏', icon: 'success' })
      }
    } catch { Taro.showToast({ title: '操作失败', icon: 'none' }) }
    finally { setFavLoading(false) }
  }

  if (loading || !artwork) return (
    <View className='loading-wrap'>
      <Text className='loading-text'>{loading ? '加载中...' : '画作不存在'}</Text>
    </View>
  )
  const rawDesc = artwork.description || ''
  const desc = rawDesc
    .replace(/#{1,6}\s+[^\n]*/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return (
    <View className='page-wrap'>
    <ScrollView scrollY className='page'>
      <View>
        <View
          onTouchStart={(e: any) => {
            setTouchStartX(e.touches[0].clientX)
            setTouchStartY(e.touches[0].clientY)
          }}
          onTouchEnd={(e: any) => {
            const deltaX = e.changedTouches[0].clientX - touchStartX
            const deltaY = e.changedTouches[0].clientY - touchStartY
            if (Math.abs(deltaY) > Math.abs(deltaX) + 10) return
            if (Math.abs(deltaX) > 60) {
              switchArtwork(deltaX > 0 ? 'prev' : 'next')
            } else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
              Taro.previewImage({ urls: [artwork!.image_url], current: artwork!.image_url })
            }
          }}
        >
          <Image className='hero-img' src={artwork.image_url} mode='widthFix' />
        </View>
      </View>
      <View className='content'>
        <View className='title-row'>
          <View className='title-left'>
            <Text className='title'>{artwork.title}</Text>
            {artwork.title_en && <Text className='title-en'>{artwork.title_en}</Text>}
          </View>
          <View className='fav-btn' onClick={toggleFav}>
            <Text className='fav-icon'>{isFavorited ? '❤️' : '🤍'}</Text>
          </View>
        </View>
        <View className='author-row' onClick={(e: any) => { e.stopPropagation(); if (artwork.artist_id) { Taro.navigateTo({ url: `/pages/artist/index?id=${artwork.artist_id}` }) } else if (artwork.artist_name) { Taro.navigateTo({ url: `/pages/artist/index?name=${encodeURIComponent(artwork.artist_name)}` }) } }}>
          <Text className='author-name'>{artwork.artist_name}</Text>
          <Text className='author-arrow'> &gt;</Text>
        </View>
        <View className='meta-grid'>
          {artwork.year        && <View className='meta-item'><Text className='meta-label'>年代</Text><Text className='meta-val'>{artwork.year}</Text></View>}
          {artwork.style       && <View className='meta-item'><Text className='meta-label'>风格</Text><Text className='meta-val'>{artwork.style}</Text></View>}
          {artwork.medium      && <View className='meta-item'><Text className='meta-label'>材质</Text><Text className='meta-val'>{artwork.medium}</Text></View>}
          {artwork.size        && <View className='meta-item'><Text className='meta-label'>尺寸</Text><Text className='meta-val'>{artwork.size}</Text></View>}
          {artwork.museum_name && <View className='meta-item meta-full'><Text className='meta-label'>收藏于</Text><Text className='meta-val'>{artwork.museum_name}</Text></View>}
        </View>
        {artwork.tags && artwork.tags.length > 0 && (
          <View className='tags'>
            {artwork.tags.map(t => <Text key={t} className='tag'>#{t}</Text>)}
          </View>
        )}
        <View className='divider' />
        <View className='desc-section'>
          <View style='display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #f0f0f0;position:relative'>
            <View style='display:flex;align-items:center;gap:8px'>
              <Text style='font-size:20px;font-weight:600;color:#1a1a1a'>📖 介绍</Text>
              <View
                style={`display:flex;align-items:center;gap:4px;background:${audioPlaying?'#1A3C34':audioPaused?'#c9a84c':'#f5f5f5'};padding:6px 12px;border-radius:16px`}
                onTouchStart={(e: any) => e.stopPropagation()}
                onTouchEnd={(e: any) => e.stopPropagation()}
                onClick={(e: any) => { e.stopPropagation(); toggleAudio() }}
              >
                <Text style={`font-size:14px;color:${(audioPlaying||audioPaused)?'#fff':'#333'}`}>
                  {audioLoading ? '加载中' : audioPlaying ? '⏸ 暂停' : audioPaused ? '▶ 继续' : '🔊 语音'}
                </Text>
              </View>
            </View>
            <View onTouchStart={(e: any) => e.stopPropagation()} onTouchEnd={(e: any) => e.stopPropagation()}>
              <View
                style='display:flex;align-items:center;gap:4px;background:#f5f5f5;padding:6px 12px;border-radius:16px'
                onClick={(e: any) => { e.stopPropagation(); setShowFontMenu(!showFontMenu) }}
              >
                <Text style='font-size:14px;color:#333'>字体</Text>
                <Text style='font-size:10px;color:#666'>{showFontMenu ? '▲' : '▼'}</Text>
              </View>
              {showFontMenu && (
                <View style='position:absolute;right:0;top:36px;background:#fff;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.15);z-index:100;overflow:hidden;min-width:80px'>
                  {[{label:'小', val:0.85},{label:'中', val:1.0},{label:'大', val:1.15},{label:'特大', val:1.3}].map(item => (
                    <View
                      key={item.label}
                      style={`padding:12px 20px;background:${scale===item.val?'#f0f5f0':'#fff'};border-bottom:1px solid #f5f5f5`}
                      onClick={(e: any) => { e.stopPropagation(); setScale(item.val); setShowFontMenu(false) }}
                    >
                      <Text style={`font-size:${13+item.val*2}px;color:${scale===item.val?'#1A3C34':'#333'};font-weight:${scale===item.val?'600':'400'}`}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
          {desc.split('\n').filter((p: string) => p.trim()).map((para: string, i: number) => {
            const trimmed = para.trim()
            const isHeading = trimmed.length < 20 && !trimmed.endsWith('。') && !trimmed.endsWith('.')
            return isHeading
              ? <Text key={i} className='desc-heading' style={`font-size:${Math.round(18*scale)}px`}>{trimmed}</Text>
              : <Text key={i} className='desc-text' style={`font-size:${Math.round(19*scale)}px;line-height:2.1;margin-bottom:${Math.round(28*scale)}px`}>{trimmed}</Text>
          })}
        </View>
      </View>
      <View className='bottom-space' />
    </ScrollView>

    </View>
  )
}
