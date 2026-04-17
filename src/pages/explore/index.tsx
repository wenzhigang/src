import { View, Text, Image, ScrollView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

interface Museum {
  _id: string
  name: string
  name_en: string
  city: string
  country: string
  cover_url: string
  artwork_count: number
}

interface Artist {
  _id: string
  name: string
  name_en: string
  style: string
  birth_year: number
  death_year: number
  avatar_url: string
  artwork_count: number
}

// 备用静态数据
const fallbackMuseums: Museum[] = [
  { _id: 'museum_001', name: '卢浮宫', name_en: 'Louvre Museum', city: '巴黎', country: '法国', cover_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Louvre_Museum_Wikimedia_Commons.jpg/400px-Louvre_Museum_Wikimedia_Commons.jpg', artwork_count: 5 },
  { _id: 'museum_002', name: '大英博物馆', name_en: 'British Museum', city: '伦敦', country: '英国', cover_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/British_Museum_from_NE_2.JPG/400px-British_Museum_from_NE_2.JPG', artwork_count: 3 },
  { _id: 'museum_003', name: '故宫博物院', name_en: 'The Palace Museum', city: '北京', country: '中国', cover_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Beijing_China_Forbidden-City-01.jpg/400px-Beijing_China_Forbidden-City-01.jpg', artwork_count: 3 },
]

const fallbackArtists: Artist[] = [
  { _id: 'artist_001', name: '列奥纳多·达芬奇', name_en: 'Leonardo da Vinci', style: '文艺复兴', birth_year: 1452, death_year: 1519, avatar_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/200px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg', artwork_count: 3 },
  { _id: 'artist_002', name: '文森特·梵高', name_en: 'Vincent van Gogh', style: '后印象派', birth_year: 1853, death_year: 1890, avatar_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/200px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg', artwork_count: 2 },
  { _id: 'artist_003', name: '克劳德·莫奈', name_en: 'Claude Monet', style: '印象派', birth_year: 1840, death_year: 1926, avatar_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg/200px-Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg', artwork_count: 2 },
]

export default function Explore() {
  const [activeTab, setActiveTab] = useState<'museum' | 'artist'>('museum')
  const [museums, setMuseums] = useState<Museum[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const db = Taro.cloud.database()

      const [museumsRes, artistsRes] = await Promise.all([
        db.collection('museums').orderBy('_id', 'asc').limit(20).get(),
        db.collection('artists').orderBy('_id', 'asc').limit(20).get(),
      ])

      setMuseums(museumsRes.data as Museum[])
      setArtists(artistsRes.data as Artist[])

    } catch (err) {
      console.error('探索页数据加载失败，使用备用数据：', err)
      setMuseums(fallbackMuseums)
      setArtists(fallbackArtists)
    } finally {
      setLoading(false)
    }
  }

  const goToMuseum = (id: string) => {
    Taro.showToast({ title: '博物馆详情页开发中', icon: 'none', duration: 1500 })
  }

  const goToArtist = (id: string) => {
    Taro.showToast({ title: '艺术家详情页开发中', icon: 'none', duration: 1500 })
  }

  return (
    <View className='explore'>

      {/* 搜索框 */}
      <View className='search-bar'>
        <Text className='search-icon'>🔍</Text>
        <Text className='search-placeholder'>搜索博物馆、艺术家...</Text>
      </View>

      {/* 切换标签 */}
      <View className='tabs'>
        <View
          className={`tab-item ${activeTab === 'museum' ? 'active' : ''}`}
          onClick={() => setActiveTab('museum')}
        >
          <Text className='tab-text'>博物馆</Text>
        </View>
        <View
          className={`tab-item ${activeTab === 'artist' ? 'active' : ''}`}
          onClick={() => setActiveTab('artist')}
        >
          <Text className='tab-text'>艺术家</Text>
        </View>
      </View>

      {/* 加载中 */}
      {loading && (
        <View className='loading-row'>
          <Text className='loading-text'>加载中...</Text>
        </View>
      )}

      {/* 博物馆列表 */}
      {!loading && activeTab === 'museum' && (
        <ScrollView scrollY={true} className='list-container'>
          {museums.map(museum => (
            <View className='museum-item' key={museum._id} onClick={() => goToMuseum(museum._id)}>
              <Image className='museum-image' src={museum.cover_url} mode='aspectFill' />
              <View className='museum-info'>
                <Text className='museum-name'>{museum.name}</Text>
                <Text className='museum-name-en'>{museum.name_en}</Text>
                <Text className='museum-city'>📍 {museum.city}，{museum.country}</Text>
                <Text className='museum-count'>已收录 {museum.artwork_count} 幅画作</Text>
              </View>
              <Text className='arrow'>›</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* 艺术家列表 */}
      {!loading && activeTab === 'artist' && (
        <ScrollView scrollY={true} className='list-container'>
          <View className='artist-grid'>
            {artists.map(artist => (
              <View className='artist-item' key={artist._id} onClick={() => goToArtist(artist._id)}>
                <Image className='artist-avatar' src={artist.avatar_url} mode='aspectFill' />
                <View className='artist-info'>
                  <Text className='artist-name'>{artist.name}</Text>
                  <Text className='artist-period'>{artist.style}</Text>
                  <Text className='artist-years'>{artist.birth_year}-{artist.death_year}</Text>
                  <Text className='artist-count'>{artist.artwork_count} 幅作品</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

    </View>
  )
}