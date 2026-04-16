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

      // 逐个请求，避免 Promise.all 超时
      const artworksRes = await db.collection('artworks')
        .orderBy('_id', 'asc')
        .limit(6)
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

      // 设置今日推荐
      const featured = artworks.find(a => a.is_featured) || artworks[0]
      setFeaturedArtwork(featured || null)
      setRecentArtworks(artworks.slice(0, 4))
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
    setFeaturedArtwork({
      _id: 'artwork_002',
      title: '星夜',
      artist_name: '文森特·梵高',
      museum_name: '纽约现代艺术博物馆',
      image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/600px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
      is_featured: true,
    })
    setArtists([
      { _id: 'artist_001', name: '达芬奇', avatar_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/200px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg' },
      { _id: 'artist_002', name: '梵高', avatar_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/200px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg' },
      { _id: 'artist_003', name: '莫奈', avatar_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg/200px-Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg' },
    ])
    setMuseums([
      { _id: 'museum_001', name: '卢浮宫', city: '巴黎', cover_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Louvre_Museum_Wikimedia_Commons.jpg/400px-Louvre_Museum_Wikimedia_Commons.jpg' },
      { _id: 'museum_002', name: '大英博物馆', city: '伦敦', cover_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/British_Museum_from_NE_2.JPG/400px-British_Museum_from_NE_2.JPG' },
      { _id: 'museum_003', name: '故宫博物院', city: '北京', cover_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Beijing_China_Forbidden-City-01.jpg/400px-Beijing_China_Forbidden-City-01.jpg' },
    ])
    setRecentArtworks([
      { _id: 'artwork_001', title: '蒙娜丽莎', artist_name: '达芬奇', museum_name: '卢浮宫', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/300px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg', is_featured: true },
      { _id: 'artwork_002', title: '星夜', artist_name: '梵高', museum_name: '纽约现代艺术博物馆', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/300px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg', is_featured: true },
      { _id: 'artwork_003', title: '睡莲', artist_name: '莫奈', museum_name: '卢浮宫', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg/300px-Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg', is_featured: false },
      { _id: 'artwork_004', title: '戴珍珠耳环的少女', artist_name: '维米尔', museum_name: '大英博物馆', image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Meisje_met_de_parel.jpg/300px-Meisje_met_de_parel.jpg', is_featured: true },
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