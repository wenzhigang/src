import { View, Text, Image, ScrollView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

interface Artwork { _id: string; title: string; artist_name: string; image_url: string }
interface Artist  { _id: string; name: string; avatar_url: string; style?: string }
interface Museum  { _id: string; name: string; city: string; cover_url: string }
type Tab = 'artwork' | 'artist' | 'museum'

const PAGE = 20

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>('artwork')
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [artists,  setArtists]  = useState<Artist[]>([])
  const [museums,  setMuseums]  = useState<Museum[]>([])
  const [loading,  setLoading]  = useState(true)
  const [offset,   setOffset]   = useState(0)
  const [hasMore,  setHasMore]  = useState(true)

  useEffect(() => { loadArtworks(true) }, [])

  const loadArtworks = async (reset = false) => {
    if (loading && !reset) return
    if (!reset && !hasMore) return
    setLoading(true)
    try {
      const skip = reset ? 0 : offset
      const res = await Taro.cloud.callFunction({
        name: 'getArtworks',
        data: { skip, limit: 20, type: 'artworks' }
      }) as any
      const data = (res.result?.data || []) as Artwork[]
      setArtworks(prev => reset ? data : [...prev, ...data])
      setOffset(skip + data.length)
      setHasMore(data.length === 20)
      if (reset) {
        try {
          const ar = await Taro.cloud.callFunction({ name: 'getArtists' }) as any
          setArtists(ar.result?.data || [])
        } catch {}
        try {
          const mu = await Taro.cloud.callFunction({ name: 'getArtworks', data: { skip: 0, limit: 20, type: 'museums' } }) as any
          setMuseums(mu.result?.data || [])
        } catch {}
      }
    } catch(e) {
      console.error('加载失败', e)
    } finally {
      setLoading(false)
    }
  }

  const goArtwork = (id: string) => {
    const list1 = artworks.map(a => a._id)
    ;(Taro as any)._artworkList = list1
    Taro.setStorageSync('_artworkList', list1)
    Taro.navigateTo({ url: `/pages/artwork/index?id=${id}` })
  }
  const goArtist  = (id: string) => Taro.navigateTo({ url: `/pages/artist/index?id=${id}` })
  const goMuseum  = (id: string) => Taro.navigateTo({ url: `/pages/museum/index?id=${id}` })

  // 分左右两列
  const splitCols = <T,>(arr: T[]) => {
    const left: T[] = [], right: T[] = []
    arr.forEach((item, i) => (i % 2 === 0 ? left : right).push(item))
    return [left, right]
  }

  const renderArtworkCols = () => {
    const [left, right] = splitCols(artworks)
    return (
      <View className='waterfall'>
        <View className='waterfall-col'>
          {left.map(a => (
            <View className='waterfall-item' key={a._id} onClick={() => goArtwork(a._id)}>
              <Image className='waterfall-img' src={a.image_url} mode='widthFix' lazyLoad />
              <View className='waterfall-info'>
                <Text className='waterfall-title'>{a.title}</Text>
                <Text className='waterfall-sub'>{a.artist_name}</Text>
              </View>
            </View>
          ))}
        </View>
        <View className='waterfall-col'>
          {right.map(a => (
            <View className='waterfall-item' key={a._id} onClick={() => goArtwork(a._id)}>
              <Image className='waterfall-img' src={a.image_url} mode='widthFix' lazyLoad />
              <View className='waterfall-info'>
                <Text className='waterfall-title'>{a.title}</Text>
                <Text className='waterfall-sub'>{a.artist_name}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    )
  }

  const renderArtistCols = () => {
    const [left, right] = splitCols(artists)
    return (
      <View className='waterfall'>
        <View className='waterfall-col'>
          {left.map(a => (
            <View className='waterfall-item' key={a._id} onClick={() => goArtist(a._id)}>
              <Image className='waterfall-img artist-img' src={a.avatar_url} mode='aspectFill' lazyLoad />
              <View className='waterfall-info'>
                <Text className='waterfall-title'>{a.name}</Text>
                {a.style && <Text className='waterfall-sub'>{a.style}</Text>}
              </View>
            </View>
          ))}
        </View>
        <View className='waterfall-col'>
          {right.map(a => (
            <View className='waterfall-item' key={a._id} onClick={() => goArtist(a._id)}>
              <Image className='waterfall-img artist-img' src={a.avatar_url} mode='aspectFill' lazyLoad />
              <View className='waterfall-info'>
                <Text className='waterfall-title'>{a.name}</Text>
                {a.style && <Text className='waterfall-sub'>{a.style}</Text>}
              </View>
            </View>
          ))}
        </View>
      </View>
    )
  }

  const renderMuseumCols = () => {
    const [left, right] = splitCols(museums)
    return (
      <View className='waterfall'>
        <View className='waterfall-col'>
          {left.map(m => (
            <View className='waterfall-item' key={m._id} onClick={() => goMuseum(m._id)}>
              <Image className='waterfall-img' src={m.cover_url} mode='widthFix' lazyLoad />
              <View className='waterfall-info'>
                <Text className='waterfall-title'>{m.name}</Text>
                <Text className='waterfall-sub'>{m.city}</Text>
              </View>
            </View>
          ))}
        </View>
        <View className='waterfall-col'>
          {right.map(m => (
            <View className='waterfall-item' key={m._id} onClick={() => goMuseum(m._id)}>
              <Image className='waterfall-img' src={m.cover_url} mode='widthFix' lazyLoad />
              <View className='waterfall-info'>
                <Text className='waterfall-title'>{m.name}</Text>
                <Text className='waterfall-sub'>{m.city}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    )
  }

  return (
    <View className='home'>
      <View className='tab-bar'>
        {(['artwork','artist','museum'] as Tab[]).map(tab => {
          const labels: Record<Tab,string> = { artwork:'作品', artist:'艺术家', museum:'博物馆' }
          return (
            <View key={tab} className={`tab-item ${activeTab===tab?'active':''}`} onClick={() => setActiveTab(tab)}>
              <Text className='tab-text'>{labels[tab]}</Text>
              {activeTab===tab && <View className='tab-line' />}
            </View>
          )
        })}
      </View>
      <ScrollView scrollY className='content' onScrollToLower={() => { if (activeTab === 'artwork') loadArtworks() }} lowerThreshold={200}>
        {activeTab==='artwork'  && renderArtworkCols()}
        {activeTab==='artist'   && renderArtistCols()}
        {activeTab==='museum'   && renderMuseumCols()}
        {loading && <View className='loading'><Text className='loading-text'>加载中...</Text></View>}
        <View className='bottom-space' />
      </ScrollView>
    </View>
  )
}
