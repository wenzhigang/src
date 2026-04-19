import { View, Text, Image, ScrollView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

interface Artist {
  _id: string
  name: string
  name_en: string
  birth_year: number
  death_year: number
  nationality: string
  style: string
  bio: string
  fun_facts: string[]
  avatar_url: string
  artwork_count: number
}

interface Artwork {
  _id: string
  title: string
  artist_name: string
  image_url: string
  year: string
  style: string
}

export default function ArtistDetail() {
  const [artist, setArtist] = useState<Artist | null>(null)
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)
  const [showFullBio, setShowFullBio] = useState(false)
  const [relatedArtists, setRelatedArtists] = useState<Artist[]>([])

  useEffect(() => {
    const params = ((Taro.getCurrentInstance() || {}).router || {}).params
    const id = params && params.id
    if (id) loadData(id)
  }, [])

  const loadData = async (artistId: string) => {
    try {
      const db = Taro.cloud.database()

      // 获取艺术家信息
      const artistRes = await db.collection('artists').doc(artistId).get()
      const artistData = artistRes.data as Artist
      setArtist(artistData)
      Taro.setNavigationBarTitle({ title: artistData.name })

      // 获取该艺术家的画作（通过 artist_name 匹配）
      const artworksRes = await db.collection('artworks')
        .where({ artist_name: artistData.name })
        .limit(20)
        .get()
      setArtworks(artworksRes.data as Artwork[])

      // 获取同风格艺术家（最多3位，排除自己）
      try {
        const relatedRes = await db.collection('artists')
          .where({ style: artistData.style })
          .limit(6)
          .get()
        const related = (relatedRes.data as Artist[]).filter(a => a._id !== artistId).slice(0, 3)
        setRelatedArtists(related)
      } catch (e) {}
    } catch (err) {
      console.error('艺术家数据加载失败：', err)
    } finally {
      setLoading(false)
    }
  }

  const goToArtwork = (id: string, list?: string[]) => {
    if (list && list.length > 0) {
      (Taro as any)._artworkList = list
    }
    Taro.navigateTo({ url: `/pages/artwork/index?id=${id}` })
  }

  if (loading) {
    return (
      <View className='artist-page'>
        <View className='loading-container'>
          <Text className='loading-text'>加载中...</Text>
        </View>
      </View>
    )
  }

  if (!artist) {
    return (
      <View className='artist-page'>
        <View className='loading-container'>
          <Text className='loading-text'>艺术家不存在</Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView scrollY className='artist-page'>

      {/* 顶部大图头像区域 */}
      <View className='hero-section'>
        <Image className='hero-image' src={artist.avatar_url} mode='aspectFill' />
        <View className='hero-overlay'>
          <Text className='artist-name'>{artist.name}</Text>
          <Text className='artist-name-en'>{artist.name_en}</Text>
          <View className='artist-meta'>
            <Text className='meta-tag'>{artist.nationality}</Text>
            <Text className='meta-dot'>·</Text>
            <Text className='meta-tag'>{artist.style}</Text>
            <Text className='meta-dot'>·</Text>
            <Text className='meta-tag'>{artist.birth_year} – {artist.death_year}</Text>
          </View>
        </View>
      </View>

      {/* 人物简介 */}
      <View className='section'>
        <Text className='section-title'>关于艺术家</Text>
        <Text className='bio-text'>
          {showFullBio ? artist.bio : artist.bio.slice(0, 150) + '...'}
        </Text>
        <Text className='read-more' onClick={() => setShowFullBio(!showFullBio)}>
          {showFullBio ? '收起' : '阅读全文'}
        </Text>
      </View>

      {/* 趣味事实 */}
      {artist.fun_facts && artist.fun_facts.length > 0 && (
        <View className='section'>
          <Text className='section-title'>你知道吗？</Text>
          {artist.fun_facts.map((fact, index) => (
            <View className='fact-item' key={index}>
              <Text className='fact-num'>{index + 1}</Text>
              <Text className='fact-text'>{fact}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 代表作品 */}
      <View className='section'>
        <Text className='section-title'>
          代表作品
          {artworks.length > 0 && <Text className='section-count'>（{artworks.length}幅）</Text>}
        </Text>
        {artworks.length > 0 ? (
          <View className='artworks-grid'>
            {artworks.map(artwork => (
              <View
                className='artwork-card'
                key={artwork._id}
                onClick={() => goToArtwork(artwork._id, artistArtworks.map((a: any) => a._id))}
              >
                <Image className='artwork-image' src={artwork.image_url} mode='aspectFill' />
                <View className='artwork-info'>
                  <Text className='artwork-title'>{artwork.title}</Text>
                  <Text className='artwork-year'>{artwork.year}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className='empty-state'>
            <Text className='empty-text'>暂无收录作品</Text>
          </View>
        )}
      </View>

      {/* 同时代艺术家 */}
      {relatedArtists.length > 0 && (
        <View className='section'>
          <Text className='section-title'>同时代艺术家</Text>
          <View className='related-list'>
            {relatedArtists.map(a => (
              <View
                className='related-item'
                key={a._id}
                onClick={() => Taro.redirectTo({ url: `/pages/artist/index?id=${a._id}` })}
              >
                <Image className='related-avatar' src={a.avatar_url} mode='aspectFill' />
                <View className='related-info'>
                  <Text className='related-name'>{a.name}</Text>
                  <Text className='related-style'>{a.style}</Text>
                  <Text className='related-years'>{a.birth_year} – {a.death_year}</Text>
                </View>
                <Text className='related-arrow'>›</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className='bottom-space' />
    </ScrollView>
  )
}
