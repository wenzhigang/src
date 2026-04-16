import { View, Text, Image, ScrollView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

// 数据类型定义
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
  const [featuredArtwork, setFeaturedArtwork] = useState<Artwork | null>(null)
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

      // 并行请求所有数据
      const [artworksRes, artistsRes, museumsRes] = await Promise.all([
        db.collection('artworks').limit(10).get(),
        db.collection('artists').limit(10).get(),
        db.collection('museums').limit(10).get(),
      ])

      const artworks = artworksRes.data as Artwork[]
      const artistsData = artistsRes.data as Artist[]
      const museumsData = museumsRes.data as Museum[]

      // 设置今日推荐（取第一条is_featured为true的画作）
      const featured = artworks.find(a => a.is_featured) || artworks[0]
      setFeaturedArtwork(featured)

      // 设置最新收录
      setRecentArtworks(artworks.slice(0, 4))

      // 设置艺术家和博物馆
      setArtists(artistsData)
      setMuseums(museumsData)

    } catch (err) {
      console.error('加载数据失败：', err)
      Taro.showToast({ title: '数据加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
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

      {/* 今日推荐 */}
      {featuredArtwork && (
        <View className='section'>
          <View className='section-title-row'>
            <Text className='section-title'>今日推荐</Text>
          </View>
          <View className='featured-card' onClick={() => goToArtwork(featuredArtwork._id)}>
            <Image className='featured-image' src={featuredArtwork.image_url} mode='aspectFill' />
            <View className='featured-overlay'>
              <Text className='featured-title'>{featuredArtwork.title}</Text>
              <Text className='featured-artist'>{featuredArtwork.artist_name} · {featuredArtwork.museum_name}</Text>
            </View>
          </View>
        </View>
      )}

      {/* 热门艺术家 */}
      {artists.length > 0 && (
        <View className='section'>
          <View className='section-title-row'>
            <Text className='section-title'>热门艺术家</Text>
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

      {/* 最新收录 */}
      {recentArtworks.length > 0 && (
        <View className='section'>
          <View className='section-title-row'>
            <Text className='section-title'>最新收录</Text>
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