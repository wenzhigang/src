import { View, Text, Image, ScrollView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

interface Artwork {
  _id: string
  title: string
  artist_name: string
  museum_name: string
  image_url: string
  is_featured: boolean
}

interface Artist {
  _id: string
  name: string
  avatar_url: string
}

interface Museum {
  _id: string
  name: string
  city: string
  cover_url: string
}

export default function Index() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [museums, setMuseums] = useState<Museum[]>([])
  const [recentArtworks, setRecentArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const db = Taro.cloud.database()

      // 逐个请求，避免 Promise.all 超时
      const artworksRes = await db.collection('artworks')
        .orderBy('_id', 'asc')
        .limit(20)
        .get()
      const artworks = artworksRes.data as Artwork[]

      const artistsRes = await db.collection('artists')
        .orderBy('_id', 'asc')
        .limit(6)
        .get()
      const artistsData = artistsRes.data as Artist[]

      const museumsRes = await db.collection('museums')
        .orderBy('_id', 'asc')
        .limit(6)
        .get()
      const museumsData = museumsRes.data as Museum[]

      setRecentArtworks(artworks)
      setArtists(artistsData)
      setMuseums(museumsData)

    } catch (err) {
      console.error('加载数据失败：', err)
      // 加载失败时使用备用静态数据
      loadFallbackData()
    } finally {
      setLoading(false)
    }
  }

  // 备用静态数据（云数据库不可用时显示）
  const loadFallbackData = () => {
    setArtists([
      { _id: 'artist_001', name: '达芬奇', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/mona_lisa.jpg' },
      { _id: 'artist_002', name: '梵高', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/starry_night.jpg' },
      { _id: 'artist_003', name: '莫奈', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/water_lilies.jpg' },
    ])
    setMuseums([
      { _id: 'museum_001', name: '卢浮宫', city: '巴黎', cover_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/louvre.jpg' },
      { _id: 'museum_002', name: '大英博物馆', city: '伦敦', cover_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/british_museum.jpg' },
      { _id: 'museum_003', name: '故宫博物院', city: '北京', cover_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/forbidden_city.jpg' },
    ])
    setRecentArtworks([
      { _id: 'artwork_001', title: '蒙娜丽莎', artist_name: '达芬奇', museum_name: '卢浮宫', image_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/mona_lisa.jpg', is_featured: true },
      { _id: 'artwork_002', title: '星夜', artist_name: '梵高', museum_name: '纽约现代艺术博物馆', image_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/starry_night.jpg', is_featured: true },
      { _id: 'artwork_003', title: '睡莲', artist_name: '莫奈', museum_name: '卢浮宫', image_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/water_lilies.jpg', is_featured: false },
      { _id: 'artwork_004', title: '戴珍珠耳环的少女', artist_name: '维米尔', museum_name: '大英博物馆', image_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/pearl_earring.jpg', is_featured: true },
    ])
  }

  const goToArtwork = (id: string) => {
    Taro.navigateTo({ url: `/pages/artwork/index?id=${id}` })
  }

  const goToArtist = (id: string) => {
    Taro.showToast({ title: '艺术家页面开发中', icon: 'none' })
  }

  const goToMuseum = (id: string) => {
    Taro.showToast({ title: '博物馆页面开发中', icon: 'none' })
  }

  if (loading) {
    return (
      <View className='loading-container'>
        <Text className='loading-text'>画说正在加载...</Text>
      </View>
    )
  }

  return (
    <ScrollView className='home' scrollY={true}>

      {/* 顶部导航 */}
      <View className='header'>
        <Text className='header-logo'>画说</Text>
        <View className='header-search'>
          <Text className='search-icon'>🔍</Text>
          <Text className='search-placeholder'>搜索画作、艺术家...</Text>
        </View>
      </View>

      {/* 艺术家 */}
      {artists.length > 0 && (
        <View className='section'>
          <View className='section-title-row'>
            <Text className='section-title'>艺术家</Text>
            <Text className='section-more'>查看全部</Text>
          </View>
          <ScrollView className='artist-scroll' scrollX={true}>
            {artists.map(artist => (
              <View className='artist-item' key={artist._id} onClick={() => goToArtist(artist._id)}>
                <Image className='artist-avatar' src={artist.avatar_url} mode='aspectFill' />
                <Text className='artist-name'>{artist.name.split('·').pop()}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 博物馆 */}
      {museums.length > 0 && (
        <View className='section'>
          <View className='section-title-row'>
            <Text className='section-title'>博物馆</Text>
            <Text className='section-more'>查看全部</Text>
          </View>
          <ScrollView className='museum-scroll' scrollX={true}>
            {museums.map(museum => (
              <View className='museum-card' key={museum._id} onClick={() => goToMuseum(museum._id)}>
                <Image className='museum-image' src={museum.cover_url} mode='aspectFill' />
                <View className='museum-overlay'>
                  <Text className='museum-name'>{museum.name}</Text>
                  <Text className='museum-city'>{museum.city}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 作品 */}
      {recentArtworks.length > 0 && (
        <View className='section'>
          <View className='section-title-row'>
            <Text className='section-title'>作品</Text>
            <Text className='section-more'>查看全部</Text>
          </View>
          <View className='artwork-grid'>
            {recentArtworks.map(artwork => (
              <View className='artwork-card' key={artwork._id} onClick={() => goToArtwork(artwork._id)}>
                <Image className='artwork-image' src={artwork.image_url} mode='aspectFill' />
                <View className='artwork-info'>
                  <Text className='artwork-title'>{artwork.title}</Text>
                  <Text className='artwork-artist'>{artwork.artist_name}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className='bottom-space' />
    </ScrollView>
  )
}