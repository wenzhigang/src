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
  description: string
  cover_url: string
  artwork_count: number
  founded_year: number
  website: string
}

interface Artwork {
  _id: string
  title: string
  artist_name: string
  image_url: string
  year: string
  style: string
  museum_name: string
}

export default function MuseumDetail() {
  const [museum, setMuseum] = useState<Museum | null>(null)
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = ((Taro.getCurrentInstance() || {}).router || {}).params
    const id = params && params.id
    if (id) loadData(id)
  }, [])

  const loadData = async (museumId: string) => {
    try {
      const db = Taro.cloud.database()

      // 获取博物馆信息
      const museumRes = await db.collection('museums').doc(museumId).get()
      const museumData = museumRes.data as Museum
      setMuseum(museumData)
      Taro.setNavigationBarTitle({ title: museumData.name })

      // 获取该博物馆的画作（通过 museum_name 匹配）
      const artworksRes = await db.collection('artworks')
        .where({ museum_name: museumData.name })
        .limit(20)
        .get()
      setArtworks(artworksRes.data as Artwork[])
    } catch (err) {
      console.error('博物馆数据加载失败：', err)
    } finally {
      setLoading(false)
    }
  }

  const goToArtwork = (id: string) => {
    Taro.navigateTo({ url: `/pages/artwork/index?id=${id}` })
  }

  if (loading) {
    return (
      <View className='museum-page'>
        <View className='loading-container'>
          <Text className='loading-text'>加载中...</Text>
        </View>
      </View>
    )
  }

  if (!museum) {
    return (
      <View className='museum-page'>
        <View className='loading-container'>
          <Text className='loading-text'>博物馆不存在</Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView scrollY className='museum-page'>

      {/* 顶部大图 */}
      <View className='hero-section'>
        <Image className='hero-image' src={museum.cover_url} mode='aspectFill' />
        <View className='hero-overlay'>
          <Text className='museum-name'>{museum.name}</Text>
          <Text className='museum-name-en'>{museum.name_en}</Text>
          <View className='museum-meta'>
            <Text className='meta-tag'>📍 {museum.city}，{museum.country}</Text>
            <Text className='meta-tag'>🏛 {museum.founded_year}年建立</Text>
          </View>
        </View>
      </View>

      {/* 博物馆简介 */}
      <View className='section'>
        <Text className='section-title'>关于博物馆</Text>
        <Text className='desc-text'>{museum.description}</Text>
      </View>

      {/* 馆内收录画作 */}
      <View className='section'>
        <Text className='section-title'>
          馆内收录
          {artworks.length > 0 && (
            <Text className='section-count'>（{artworks.length}幅）</Text>
          )}
        </Text>
        {artworks.length > 0 ? (
          <View className='artworks-grid'>
            {artworks.map(artwork => (
              <View
                className='artwork-card'
                key={artwork._id}
                onClick={() => goToArtwork(artwork._id)}
              >
                <Image className='artwork-image' src={artwork.image_url} mode='aspectFill' />
                <View className='artwork-info'>
                  <Text className='artwork-title'>{artwork.title}</Text>
                  <Text className='artwork-artist'>{artwork.artist_name}</Text>
                  <Text className='artwork-year'>{artwork.year}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className='empty-state'>
            <Text className='empty-icon'>🖼️</Text>
            <Text className='empty-text'>暂无收录画作</Text>
            <Text className='empty-sub'>更多内容即将上线</Text>
          </View>
        )}
      </View>

      <View className='bottom-space' />
    </ScrollView>
  )
}
