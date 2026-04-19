import { View, Text, Image, ScrollView, MovableArea, MovableView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

interface Annotation {
  x: number
  y: number
  title: string
  desc: string
}

interface AiAnalysis {
  technique: string
  composition: string
  emotion: string
  influence: string
}

interface Artwork {
  _id: string
  title: string
  title_en: string
  artist_id: string
  artist_name: string
  museum_id: string
  museum_name: string
  year: string
  style: string
  medium: string
  size: string
  description: string
  image_url: string
  tags: string[]
  is_featured: boolean
  annotations: Annotation[]
  isAIGenerated?: boolean
  ai_analysis?: AiAnalysis
}

const fallbackArtwork: Artwork = {
  _id: 'artwork_002',
  title: '星夜',
  title_en: 'The Starry Night',
  artist_id: 'artist_002',
  artist_name: '文森特·梵高',
  museum_id: 'museum_001',
  museum_name: '纽约现代艺术博物馆',
  year: '1889年',
  style: '后印象派',
  medium: '油画',
  size: '73.7 × 92.1 cm',
  description: `1889年6月，梵高在法国圣雷米的精神病院中创作了这幅传世之作。那时的他，透过病房的铁窗凝望着夜空，将内心的狂喜与痛苦一并倾注在画布上。\n\n画面中，巨大的旋涡状星云主宰着整个天空，仿佛宇宙在剧烈地呼吸与律动。11颗星星和一轮明月散发出耀眼的光晕，让人感受到强烈的情感张力。\n\n远处宁静的村庄与动荡的天空形成鲜明对比，这正是梵高内心世界的写照——在混乱与不安中，寻找那一份难以触及的平静。`,
  image_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/starry_night.jpg',
  tags: ['后印象派', '油画', '风景', '夜景'],
  is_featured: true,
  annotations: [
    { x: 15, y: 20, title: '旋涡星云', desc: '梵高用夸张的旋涡笔触表现星云，充满动感与能量' },
    { x: 75, y: 15, title: '月亮', desc: '明亮的月亮散发出强烈光晕，是画面的视觉焦点之一' },
    { x: 10, y: 45, title: '柏树', desc: '高耸的柏树直冲天际，在梵高画中常象征死亡与永恒' },
    { x: 55, y: 75, title: '村庄', desc: '宁静的村庄与动荡天空形成强烈对比' },
  ],
}

export default function ArtworkDetail() {
  const [artwork, setArtwork] = useState<Artwork | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteDocId, setFavoriteDocId] = useState<string | null>(null)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showFullDesc, setShowFullDesc] = useState(false)
  const [activeAiTab, setActiveAiTab] = useState<'technique' | 'composition' | 'emotion' | 'influence'>('technique')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [artworkList, setArtworkList] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)

  useEffect(() => {
    const params = ((Taro.getCurrentInstance() || {}).router || {}).params
    const id = params && params.id || 'artwork_002'
    // 从全局变量读取画作列表
    const list = (Taro as any)._artworkList as string[] || []
    if (list.length > 0) {
      setArtworkList(list)
      const idx = list.indexOf(id)
      setCurrentIndex(idx >= 0 ? idx : 0)
    }
    loadArtwork(id)
  }, [])

  const switchArtwork = (direction: 'prev' | 'next') => {
    if (artworkList.length === 0) return
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= artworkList.length) {
      Taro.showToast({ title: direction === 'prev' ? '已是第一幅' : '已是最后一幅', icon: 'none', duration: 1000 })
      return
    }
    setCurrentIndex(newIndex)
    setLoading(true)
    setArtwork(null)
    loadArtwork(artworkList[newIndex])
  }

  const onTouchStart = (e: any) => {
    setTouchStartX(e.touches[0].clientX)
    setIsSwiping(true)
  }

  const onTouchEnd = (e: any) => {
    if (!isSwiping) return
    const deltaX = e.changedTouches[0].clientX - touchStartX
    if (Math.abs(deltaX) > 50) {
      switchArtwork(deltaX > 0 ? 'prev' : 'next')
    }
    setIsSwiping(false)
  }

  const loadArtwork = async (id: string) => {
    try {
      const db = Taro.cloud.database()
      const res = await db.collection('artworks').doc(id).get()
      const artworkData = res.data as Artwork
      setArtwork(artworkData)
      checkFavoriteStatus(id)
    } catch (err) {
      console.error('画作数据加载失败，使用备用数据：', err)
      setArtwork(fallbackArtwork)
      checkFavoriteStatus(fallbackArtwork._id)
    } finally {
      setLoading(false)
    }
  }

  const checkFavoriteStatus = async (artworkId: string) => {
    try {
      const userInfo = Taro.getStorageSync('userInfo')
      if (!userInfo || !userInfo.openid) return
      const db = Taro.cloud.database()
      const res = await db.collection('favorites')
        .where({ openid: userInfo.openid, artwork_id: artworkId })
        .get()
      if (res.data.length > 0) {
        setIsFavorited(true)
        setFavoriteDocId(res.data[0]._id)
      } else {
        setIsFavorited(false)
        setFavoriteDocId(null)
      }
    } catch (err) {
      console.error('检查收藏状态失败：', err)
    }
  }

  const toggleFavorite = async () => {
    if (favoriteLoading) return
    const userInfo = Taro.getStorageSync('userInfo')
    if (!userInfo || !userInfo.openid) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    if (!artwork) return
    setFavoriteLoading(true)
    const db = Taro.cloud.database()
    try {
      if (isFavorited && favoriteDocId) {
        await db.collection('favorites').doc(favoriteDocId).remove()
        setIsFavorited(false)
        setFavoriteDocId(null)
        Taro.showToast({ title: '已取消收藏', icon: 'none', duration: 1500 })
      } else {
        const addRes = await db.collection('favorites').add({
          data: {
            openid: userInfo.openid,
            artwork_id: artwork._id,
            title: artwork.title,
            artist_name: artwork.artist_name,
            image_url: artwork.image_url,
            created_at: db.serverDate(),
          }
        })
        setIsFavorited(true)
        setFavoriteDocId(addRes._id as string)
        Taro.showToast({ title: '收藏成功', icon: 'success', duration: 1500 })
      }
    } catch (err) {
      console.error('收藏操作失败：', err)
      Taro.showToast({ title: '操作失败，请重试', icon: 'none' })
    } finally {
      setFavoriteLoading(false)
    }
  }

  const toggleAudio = () => {
    setIsPlaying(!isPlaying)
    if (!isPlaying) {
      Taro.showToast({ title: '开始播放讲解', icon: 'none', duration: 1500 })
    }
  }

  const enterFullscreen = () => {
    setIsFullscreen(true)
    Taro.hideNavigationBarLoading()
    wx.hideHomeButton()
    Taro.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#000000',
      animation: { duration: 0 }
    })
  }

  const exitFullscreen = () => {
    setIsFullscreen(false)
    Taro.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: '#141414',
      animation: { duration: 0 }
    })
  }

  if (loading) {
    return (
      <View className='artwork-detail'>
        <View className='loading-overlay'>
          <Text className='loading-text'>加载中...</Text>
        </View>
      </View>
    )
  }

  if (!artwork) {
    return (
      <View className='artwork-detail'>
        <View className='loading-overlay'>
          <Text className='loading-text'>画作不存在</Text>
        </View>
      </View>
    )
  }

  // 全屏模式：支持双指缩放 + 左右滑动切换
  if (isFullscreen) {
    return (
      <View
        className='fullscreen-page'
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <MovableArea className='movable-area' scale>
          <MovableView
            className='movable-view'
            direction='all'
            scale
            scaleMin={1}
            scaleMax={4}
            scaleValue={1}
            damping={50}
            friction={2}
            onClick={exitFullscreen}
          >
            <Image
              className='fullscreen-image'
              src={artwork.image_url}
              mode='aspectFit'
            />
          </MovableView>
        </MovableArea>
        {artworkList.length > 1 && (
          <View className='fullscreen-nav'>
            <Text className='fullscreen-nav-text'>
              {currentIndex + 1} / {artworkList.length}
            </Text>
          </View>
        )}

      </View>
    )
  }

  // 普通模式
  return (
    <View
      className='artwork-detail'
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <ScrollView scrollY={true} className='scroll-container'>

        {/* 图片区域 - 点击进入全屏 */}
        <View className='image-container' onClick={enterFullscreen}>
          <Image
            className='artwork-image'
            src={artwork.image_url}
            mode='aspectFit'
          />
          {artworkList.length > 1 && (
            <View className='artwork-nav-dots'>
              <Text className='artwork-nav-text'>{currentIndex + 1} / {artworkList.length}</Text>
            </View>
          )}
        </View>

        {/* 画作信息 */}
        <View className='info-section'>

          {artwork.isAIGenerated && (
            <View className='ai-badge'>
              <Text className='ai-text'>⚡ AI生成内容，仅供参考</Text>
            </View>
          )}

          <View className='title-row'>
            <Text className='artwork-title'>{artwork.title}</Text>
            <View
              className={`inline-favorite-btn ${favoriteLoading ? 'loading' : ''}`}
              onClick={toggleFavorite}
            >
              <Text className='favorite-icon'>{isFavorited ? '❤️' : '🤍'}</Text>
            </View>
          </View>
          <Text className='artwork-title-en'>{artwork.title_en}</Text>

          <View className='meta-row'>
            <View className='meta-item'>
              <Text className='meta-label'>艺术家</Text>
              <Text className='meta-value artist-link'>{artwork.artist_name}</Text>
            </View>
            <View className='meta-item'>
              <Text className='meta-label'>年代</Text>
              <Text className='meta-value'>{artwork.year}</Text>
            </View>
          </View>
          <View className='meta-row'>
            <View className='meta-item'>
              <Text className='meta-label'>风格</Text>
              <Text className='meta-value'>{artwork.style}</Text>
            </View>
            <View className='meta-item'>
              <Text className='meta-label'>媒介</Text>
              <Text className='meta-value'>{artwork.medium}</Text>
            </View>
          </View>
          <View className='meta-row'>
            <View className='meta-item full-width'>
              <Text className='meta-label'>收藏于</Text>
              <Text className='meta-value'>{artwork.museum_name}</Text>
            </View>
          </View>

          {artwork.tags && (
            <View className='tags-row'>
              {artwork.tags.map(tag => (
                <Text key={tag} className='tag'>{tag}</Text>
              ))}
            </View>
          )}

          <View className='description-section'>
            <Text className='section-title'>📖 画作故事</Text>
            <Text className='description'>
              {showFullDesc
                ? artwork.description
                : artwork.description.slice(0, 120) + '...'}
            </Text>
            <Text
              className='read-more'
              onClick={() => setShowFullDesc(!showFullDesc)}
            >
              {showFullDesc ? '收起' : '阅读全文'}
            </Text>
          </View>

          {/* AI 鉴赏分析 */}
          {artwork.ai_analysis && (
            <View className='ai-section'>
              <View className='ai-section-header'>
                <Text className='ai-section-title'>🤖 AI 鉴赏</Text>
                <Text className='ai-section-sub'>由 AI 生成，仅供参考</Text>
              </View>
              <View className='ai-tabs'>
                {([
                  { key: 'technique', label: '技法' },
                  { key: 'composition', label: '构图' },
                  { key: 'emotion', label: '情感' },
                  { key: 'influence', label: '影响' },
                ] as const).map(tab => (
                  <View
                    key={tab.key}
                    className={`ai-tab ${activeAiTab === tab.key ? 'active' : ''}`}
                    onClick={() => setActiveAiTab(tab.key)}
                  >
                    <Text className='ai-tab-text'>{tab.label}</Text>
                  </View>
                ))}
              </View>
              <Text className='ai-content'>
                {artwork.ai_analysis[activeAiTab]}
              </Text>
            </View>
          )}

          <View className='artist-link-row'>
            <Text className='artist-link-text'>了解更多关于 {artwork.artist_name} →</Text>
          </View>

        </View>
        <View className='bottom-space' />
      </ScrollView>



      {/* 语音播放器 */}
      <View className='audio-player'>
        <Text className='audio-icon'>🎵</Text>
        <View className='progress-bar'>
          <View className='progress-fill' style={{ width: isPlaying ? '45%' : '0%' }} />
        </View>
        <Text className='audio-time'>{isPlaying ? '1:23 / 3:05' : '0:00 / 3:05'}</Text>
        <View className='play-btn' onClick={toggleAudio}>
          <Text className='play-icon'>{isPlaying ? '⏸' : '▶'}</Text>
        </View>
      </View>

    </View>
  )
}
