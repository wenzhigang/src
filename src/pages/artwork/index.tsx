import { View, Text, Image, ScrollView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
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

  useEffect(() => {
    const params = ((Taro.getCurrentInstance() || {}).router || {}).params
    const id = (params && params.id) || 'artwork_002'
    console.log('artwork id:', id)
    const list = (Taro as any)._artworkList as string[] || []
    if (list.length > 0) {
      setArtworkList(list)
      const idx = list.indexOf(id)
      setCurrentIndex(idx >= 0 ? idx : 0)
    }
    loadArtwork(id)
  }, [])

  const loadArtwork = async (id: string) => {
    try {
      const db = Taro.cloud.database()
      const res = await db.collection('artworks').doc(id).get()
      if (res.data) {
        setArtwork(res.data as Artwork)
        checkFav(id)
        recordHistory(res.data as Artwork)
      } else {
        setArtwork(null)
      }
    } catch(e) {
      console.error('loadArtwork error:', e)
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

  const switchArtwork = (dir: 'prev' | 'next') => {
    if (artworkList.length === 0) return
    const newIdx = dir === 'prev' ? currentIndex - 1 : currentIndex + 1
    if (newIdx < 0 || newIdx >= artworkList.length) {
      Taro.showToast({ title: dir === 'prev' ? '已是第一幅' : '已是最后一幅', icon: 'none', duration: 1000 })
      return
    }
    setCurrentIndex(newIdx)
    setLoading(true)
    setArtwork(null)
    setExpanded(false)
    loadArtwork(artworkList[newIdx])
  }

  const onTouchStart = (e: any) => setTouchStartX(e.touches[0].clientX)

  const onTouchEnd = (e: any) => {
    const delta = e.changedTouches[0].clientX - touchStartX
    if (Math.abs(delta) > 80) switchArtwork(delta > 0 ? 'prev' : 'next')
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

  if (loading) return (
    <View className='loading-wrap'><Text className='loading-text'>加载中...</Text></View>
  )
  if (!artwork) return (
    <View className='loading-wrap'><Text className='loading-text'>画作不存在</Text></View>
  )

  const desc = artwork.description || ''

  return (
    <View className='page-wrap'>
    <ScrollView scrollY className='page'>
      <View
        onTouchStart={onTouchStart}
        onTouchEnd={(e: any) => {
          const delta = e.changedTouches[0].clientX - touchStartX
          if (Math.abs(delta) > 60) {
            switchArtwork(delta > 0 ? 'prev' : 'next')
          } else {
            Taro.previewImage({ current: artwork.image_url, urls: [artwork.image_url] })
          }
        }}
      >
        <Image className='hero-img' src={artwork.image_url} mode='widthFix' />
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
        <View className='author-row' onClick={() => artwork.artist_id && Taro.navigateTo({ url: `/pages/artist/index?id=${artwork.artist_id}` })}>
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
          <Text className='desc-title'>📖 介绍</Text>
          <Text className='desc-text'>{desc}</Text>
        </View>
      </View>
      <View className='bottom-space' />
    </ScrollView>

    </View>
  )
}
