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

      // 并行请求，互不影响
      const [artworksRes, artistsRes, museumsRes] = await Promise.allSettled([
        db.collection('artworks').limit(12).get(),
        db.collection('artists').limit(10).get(),
        db.collection('museums').limit(10).get(),
      ])

      if (artworksRes.status === 'fulfilled') {
        setRecentArtworks(artworksRes.value.data as Artwork[])
      }
      if (artistsRes.status === 'fulfilled') {
        setArtists(artistsRes.value.data as Artist[])
      }
      if (museumsRes.status === 'fulfilled') {
        setMuseums(museumsRes.value.data as Museum[])
      }

    } catch (err) {
      console.error('加载数据失败：', err)
      loadFallbackData()
    } finally {
      setLoading(false)
    }
  }

  // 备用静态数据（云数据库不可用时显示）
  const loadFallbackData = () => {
    setArtists([
      { _id: 'artist_001', name: '列奥纳多·达芬奇', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_davinci.jpg' },
      { _id: 'artist_002', name: '文森特·梵高', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_vangogh.jpg' },
      { _id: 'artist_003', name: '克劳德·莫奈', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_monet.jpg' },
      { _id: 'artist_004', name: '拉斐尔', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_raphael.jpg' },
      { _id: 'artist_005', name: '桑德罗·波提切利', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_botticelli.jpg' },
      { _id: 'artist_006', name: '伦勃朗·范·莱因', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_rembrandt.jpg' },
      { _id: 'artist_007', name: '乔治·修拉', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_seurat.jpg' },
      { _id: 'artist_008', name: '爱德华·蒙克', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_munch.jpg' },
      { _id: 'artist_009', name: '约翰内斯·维米尔', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_vermeer.jpg' },
      { _id: 'artist_010', name: '保罗·高更', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_gauguin.jpg' },
      { _id: 'artist_023', name: '米开朗基罗', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_michelangelo.jpg' },
      { _id: 'artist_028', name: '卡拉瓦乔', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_caravaggio.jpg' },
      { _id: 'artist_039', name: '巴勃罗·毕加索', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_picasso.jpg' },
      { _id: 'artist_038', name: '古斯塔夫·克里姆特', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_klimt.jpg' },
      { _id: 'artist_035', name: '保罗·塞尚', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_cezanne.jpg' },
      { _id: 'artist_036', name: '奥古斯特·雷诺阿', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_renoir.jpg' },
      { _id: 'artist_037', name: '埃德加·德加', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_degas.jpg' },
      { _id: 'artist_041', name: '亨利·马蒂斯', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_matisse.jpg' },
      { _id: 'artist_040', name: '萨尔瓦多·达利', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_dali.jpg' },
      { _id: 'artist_031', name: '弗朗西斯科·戈雅', avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_goya.jpg' },
    ])
    setMuseums([
      { _id: 'museum_001', name: '卢浮宫', city: '巴黎', cover_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/louvre.jpg' },
      { _id: 'museum_002', name: '大英博物馆', city: '伦敦', cover_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/british_museum.jpg' },
      { _id: 'museum_003', name: '故宫博物院', city: '北京', cover_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/forbidden_city.jpg' },
      { _id: 'museum_004', name: '乌菲兹美术馆', city: '佛罗伦萨', cover_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/uffizi.jpg' },
      { _id: 'museum_005', name: '普拉多博物馆', city: '马德里', cover_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/prado.jpg' },
      { _id: 'museum_006', name: '荷兰国立博物馆', city: '阿姆斯特丹', cover_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/rijksmuseum.jpg' },
    ])
    setRecentArtworks([
      { _id: 'artwork_001', title: '蒙娜丽莎', artist_name: '列奥纳多·达芬奇', museum_name: '卢浮宫', image_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/mona_lisa.jpg', is_featured: true },
      { _id: 'artwork_002', title: '星夜', artist_name: '文森特·梵高', museum_name: '纽约现代艺术博物馆', image_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/starry_night.jpg', is_featured: true },
      { _id: 'artwork_003', title: '睡莲', artist_name: '克劳德·莫奈', museum_name: '卢浮宫', image_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/water_lilies.jpg', is_featured: false },
      { _id: 'artwork_004', title: '戴珍珠耳环的少女', artist_name: '约翰内斯·维米尔', museum_name: '大英博物馆', image_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/pearl_earring.jpg', is_featured: true },
      { _id: 'artwork_005', title: '向日葵', artist_name: '文森特·梵高', museum_name: '大英博物馆', image_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/sunflowers.jpg', is_featured: false },
      { _id: 'artwork_006', title: '雅典学院', artist_name: '拉斐尔', museum_name: '梵蒂冈博物馆', image_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/the_school_of_athens.jpg', is_featured: true },
    ])
  }

  const goToArtwork = (id: string) => {
    Taro.navigateTo({ url: `/pages/artwork/index?id=${id}` })
  }

  const goToArtist = (id: string) => {
    Taro.navigateTo({ url: `/pages/artist/index?id=${id}` })
  }

  const goToMuseum = (id: string) => {
    Taro.navigateTo({ url: `/pages/museum/index?id=${id}` })
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
            <Text className='section-more' onClick={() => (() => { (Taro as any)._tabTarget = 'artist'; Taro.switchTab({ url: '/pages/explore/index' }); })()}>查看全部</Text>
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
            <Text className='section-more' onClick={() => (() => { (Taro as any)._tabTarget = 'museum'; Taro.switchTab({ url: '/pages/explore/index' }); })()}>查看全部</Text>
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
            <Text className='section-more' onClick={() => (() => { (Taro as any)._tabTarget = 'artwork'; Taro.switchTab({ url: '/pages/explore/index' }); })()}>查看全部</Text>
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