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

interface Artwork {
  _id: string
  title: string
  artist_name: string
  style: string
  image_url: string
  year: string
}

const fallbackMuseums: Museum[] = [
  { _id: 'museum_001', name: '卢浮宫', name_en: 'Louvre Museum', city: '巴黎', country: '法国', cover_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/louvre.jpg', artwork_count: 5 },
  { _id: 'museum_002', name: '大英博物馆', name_en: 'British Museum', city: '伦敦', country: '英国', cover_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/british_museum.jpg', artwork_count: 3 },
  { _id: 'museum_003', name: '故宫博物院', name_en: 'The Palace Museum', city: '北京', country: '中国', cover_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/forbidden_city.jpg', artwork_count: 3 },
]

const fallbackArtists: Artist[] = [
  { _id: 'artist_001', name: '列奥纳多·达芬奇', name_en: 'Leonardo da Vinci', style: '文艺复兴', birth_year: 1452, death_year: 1519, avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_davinci.jpg', artwork_count: 3 },
  { _id: 'artist_002', name: '文森特·梵高', name_en: 'Vincent van Gogh', style: '后印象派', birth_year: 1853, death_year: 1890, avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_vangogh.jpg', artwork_count: 2 },
  { _id: 'artist_003', name: '克劳德·莫奈', name_en: 'Claude Monet', style: '印象派', birth_year: 1840, death_year: 1926, avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_monet.jpg', artwork_count: 2 },
  { _id: 'artist_004', name: '拉斐尔', name_en: 'Raphael', style: '文艺复兴', birth_year: 1483, death_year: 1520, avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_raphael.jpg', artwork_count: 1 },
  { _id: 'artist_005', name: '桑德罗·波提切利', name_en: 'Sandro Botticelli', style: '早期文艺复兴', birth_year: 1445, death_year: 1510, avatar_url: 'https://636c-cloudbase-d7gl3kh5vf6b71edc-1422923265.tcb.qcloud.la/images/artworks/portrait_botticelli.jpg', artwork_count: 1 },
]

export default function Explore() {
  const [activeTab, setActiveTab] = useState<'artwork' | 'artist' | 'museum'>('artwork')
  const [museums, setMuseums] = useState<Museum[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])

  useEffect(() => {
    // 读取全局 tab 目标
    const target = (Taro as any)._tabTarget
    if (target) {
      const tabMap: Record<string, 'artwork' | 'artist' | 'museum'> = {
        artwork: 'artwork', artist: 'artist', museum: 'museum'
      }
      if (tabMap[target]) setActiveTab(tabMap[target])
      ;(Taro as any)._tabTarget = null
    }
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const db = Taro.cloud.database()
      const _ = db.command
      // 第一批：博物馆、艺术家、画作1-60
      const [museumsRes, artists1Res, artists2Res, artists3Res, artworks1Res, artworks2Res, artworks3Res] = await Promise.allSettled([
        db.collection('museums').limit(20).get(),
        db.collection('artists').limit(20).get(),
        db.collection('artists').skip(20).limit(20).get(),
        db.collection('artists').skip(40).limit(20).get(),
        db.collection('artworks').where({ seq: _.gte(1).and(_.lte(20)) }).limit(20).get(),
        db.collection('artworks').where({ seq: _.gte(21).and(_.lte(40)) }).limit(20).get(),
        db.collection('artworks').where({ seq: _.gte(41).and(_.lte(60)) }).limit(20).get(),
      ])
      if (museumsRes.status === 'fulfilled') setMuseums(museumsRes.value.data as Museum[])
      else setMuseums(fallbackMuseums)
      const allArtists = [
        ...(artists1Res.status === 'fulfilled' ? artists1Res.value.data as Artist[] : []),
        ...(artists2Res.status === 'fulfilled' ? artists2Res.value.data as Artist[] : []),
        ...(artists3Res.status === 'fulfilled' ? artists3Res.value.data as Artist[] : []),
      ]
      setArtists(allArtists.length > 0 ? allArtists : fallbackArtists)
      console.log('batch1 status:', artworks1Res.status, artworks2Res.status, artworks3Res.status)
      const batch1 = [
        ...(artworks1Res.status === 'fulfilled' ? artworks1Res.value.data as Artwork[] : []),
        ...(artworks2Res.status === 'fulfilled' ? artworks2Res.value.data as Artwork[] : []),
        ...(artworks3Res.status === 'fulfilled' ? artworks3Res.value.data as Artwork[] : []),
      ]
      console.log('batch1 count:', batch1.length)
      setArtworks(batch1)

      // 第二批：画作61-190
      const [artworks4Res, artworks5Res, artworks6Res, artworks7Res] = await Promise.allSettled([
        db.collection('artworks').where({ seq: _.gte(61).and(_.lte(90)) }).limit(30).get(),
        db.collection('artworks').where({ seq: _.gte(91).and(_.lte(120)) }).limit(30).get(),
        db.collection('artworks').where({ seq: _.gte(121).and(_.lte(155)) }).limit(35).get(),
        db.collection('artworks').where({ seq: _.gte(156).and(_.lte(190)) }).limit(35).get(),
      ])
      console.log('batch2 status:', artworks4Res.status, artworks5Res.status, artworks6Res.status, artworks7Res.status)
      const allArtworks = [
        ...batch1,
        ...(artworks4Res.status === 'fulfilled' ? artworks4Res.value.data as Artwork[] : []),
        ...(artworks5Res.status === 'fulfilled' ? artworks5Res.value.data as Artwork[] : []),
        ...(artworks6Res.status === 'fulfilled' ? artworks6Res.value.data as Artwork[] : []),
        ...(artworks7Res.status === 'fulfilled' ? artworks7Res.value.data as Artwork[] : []),
      ]
      console.log('total artworks:', allArtworks.length)
      setArtworks(allArtworks)
    } catch (err) {
      console.error('探索页数据加载失败：', err)
      setMuseums(fallbackMuseums)
      setArtists(fallbackArtists)
    } finally {
      setLoading(false)
    }
  }

  // 本地搜索
  const handleSearch = (val: string) => {
    setSearchText(val)
    if (!val.trim()) {
      setSearching(false)
      setSearchResults([])
      return
    }
    setSearching(true)
    const keyword = val.trim().toLowerCase()
    const results: any[] = []

    artworks.forEach(a => {
      if (
        a.title.toLowerCase().includes(keyword) ||
        a.artist_name.toLowerCase().includes(keyword) ||
        (a.style && a.style.toLowerCase().includes(keyword))
      ) {
        results.push({ ...a, type: 'artwork' })
      }
    })
    artists.forEach(a => {
      if (
        a.name.toLowerCase().includes(keyword) ||
        a.name_en.toLowerCase().includes(keyword) ||
        (a.style && a.style.toLowerCase().includes(keyword))
      ) {
        results.push({ ...a, type: 'artist' })
      }
    })
    museums.forEach(m => {
      if (
        m.name.toLowerCase().includes(keyword) ||
        m.name_en.toLowerCase().includes(keyword) ||
        m.city.toLowerCase().includes(keyword)
      ) {
        results.push({ ...m, type: 'museum' })
      }
    })
    setSearchResults(results)
  }

  const goToArtwork = (id: string) => {
    Taro.navigateTo({ url: `/pages/artwork/index?id=${id}` })
  }

  const goToMuseum = (id: string) => {
    Taro.navigateTo({ url: `/pages/museum/index?id=${id}` })
  }

  const goToArtist = (id: string) => {
    Taro.navigateTo({ url: `/pages/artist/index?id=${id}` })
  }

  const clearSearch = () => {
    setSearchText('')
    setSearching(false)
    setSearchResults([])
  }

  return (
    <View className='explore'>

      {/* 搜索框 */}
      <View className='search-bar'>
        <Text className='search-icon'>🔍</Text>
        <input
          className='search-input'
          placeholder='搜索作品、艺术家、博物馆...'
          value={searchText}
          onInput={(e: any) => handleSearch(e.detail.value)}
        />
        {searchText.length > 0 && (
          <Text className='search-clear' onClick={clearSearch}>✕</Text>
        )}
      </View>

      {/* 搜索结果 */}
      {searching && (
        <ScrollView scrollY className='list-container'>
          {searchResults.length === 0 ? (
            <View className='empty-state'>
              <Text className='empty-text'>未找到相关内容</Text>
            </View>
          ) : (
            searchResults.map(item => {
              if (item.type === 'artwork') {
                return (
                  <View className='search-item' key={item._id} onClick={() => goToArtwork(item._id)}>
                    <Image className='search-thumb' src={item.image_url} mode='aspectFill' />
                    <View className='search-info'>
                      <Text className='search-title'>{item.title}</Text>
                      <Text className='search-sub'>{item.artist_name} · {item.style}</Text>
                    </View>
                    <Text className='search-tag artwork-tag'>作品</Text>
                  </View>
                )
              }
              if (item.type === 'artist') {
                return (
                  <View className='search-item' key={item._id} onClick={() => goToArtist(item._id)}>
                    <Image className='search-thumb' src={item.avatar_url} mode='aspectFill' />
                    <View className='search-info'>
                      <Text className='search-title'>{item.name}</Text>
                      <Text className='search-sub'>{item.style} · {item.birth_year}-{item.death_year}</Text>
                    </View>
                    <Text className='search-tag artist-tag'>艺术家</Text>
                  </View>
                )
              }
              return (
                <View className='search-item' key={item._id} onClick={() => goToMuseum(item._id)}>
                  <Image className='search-thumb' src={item.cover_url} mode='aspectFill' />
                  <View className='search-info'>
                    <Text className='search-title'>{item.name}</Text>
                    <Text className='search-sub'>{item.city}，{item.country}</Text>
                  </View>
                  <Text className='search-tag museum-tag'>博物馆</Text>
                </View>
              )
            })
          )}
        </ScrollView>
      )}

      {/* 正常浏览模式 */}
      {!searching && (
        <>
          {/* 切换标签 */}
          <View className='tabs'>
            <View
              className={`tab-item ${activeTab === 'artwork' ? 'active' : ''}`}
              onClick={() => setActiveTab('artwork')}
            >
              <Text className='tab-text'>作品</Text>
            </View>
            <View
              className={`tab-item ${activeTab === 'artist' ? 'active' : ''}`}
              onClick={() => setActiveTab('artist')}
            >
              <Text className='tab-text'>艺术家</Text>
            </View>
            <View
              className={`tab-item ${activeTab === 'museum' ? 'active' : ''}`}
              onClick={() => setActiveTab('museum')}
            >
              <Text className='tab-text'>博物馆</Text>
            </View>
          </View>

          {loading && (
            <View className='loading-row'>
              <Text className='loading-text'>加载中...</Text>
            </View>
          )}

          {/* 作品列表 */}
          {!loading && activeTab === 'artwork' && (
            <ScrollView scrollY className='list-container'>
              <View className='artwork-grid'>
                {artworks.map(artwork => (
                  <View className='artwork-card' key={artwork._id} onClick={() => goToArtwork(artwork._id)}>
                    <Image className='artwork-image' src={artwork.image_url} mode='aspectFill' />
                    <View className='artwork-info'>
                      <Text className='artwork-title'>{artwork.title}</Text>
                      <Text className='artwork-artist'>{artwork.artist_name}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {/* 艺术家列表 */}
          {!loading && activeTab === 'artist' && (
            <ScrollView scrollY className='list-container'>
              {artists.map(artist => (
                <View className='museum-item' key={artist._id} onClick={() => goToArtist(artist._id)}>
                  <Image className='museum-image' src={artist.avatar_url} mode='aspectFill' />
                  <View className='museum-info'>
                    <Text className='museum-name'>{artist.name}</Text>
                    <Text className='museum-name-en'>{artist.name_en}</Text>
                    <Text className='museum-city'>{artist.style}</Text>
                    <Text className='museum-count'>{artist.birth_year} – {artist.death_year} · {artist.artwork_count} 幅作品</Text>
                  </View>
                  <Text className='arrow'>›</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* 博物馆列表 */}
          {!loading && activeTab === 'museum' && (
            <ScrollView scrollY className='list-container'>
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
        </>
      )}

    </View>
  )
}
