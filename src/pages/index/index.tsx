import { View, Text, Image } from '@tarojs/components'
import { useState, useEffect, useRef } from 'react'
import Taro, { useDidShow, useReachBottom } from '@tarojs/taro'
import './index.scss'

interface Artwork { _id: string; title: string; artist_name: string; image_url: string }
interface Artist  { _id: string; name: string; avatar_url: string; style?: string }
interface Museum  { _id: string; name: string; city: string; cover_url: string }
type Tab = 'artwork' | 'artist' | 'museum'

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>('artwork')
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [artists,  setArtists]  = useState<Artist[]>([])
  const [museums,  setMuseums]  = useState<Museum[]>([])
  const [loading,  setLoading]  = useState(false)
  const [offset,   setOffset]   = useState(0)
  const [hasMore,  setHasMore]  = useState(true)
  const [largePic, setLargePic] = useState(false)

  // 记录最后点击的元素id，返回时滚动到该元素
  const lastClickedId = useRef<string>('')
  const activeTabRef = useRef<Tab>('artwork')
  const largePicRef = useRef(false)
  const isFirstShow = useRef(true)

  useEffect(() => { loadData(true) }, [])

  useReachBottom(() => {
    if (activeTabRef.current === 'artwork') loadData()
  })

  useDidShow(() => {
    console.log('[useDidShow] fired')
  })

  useEffect(() => {
    // 监听从子页面返回的事件
    Taro.eventCenter.on('backToIndex', () => {
      const id = Taro.getStorageSync('_lastClickedId') || lastClickedId.current
      console.log('[backToIndex] scroll to:', id)
      if (!id) return
      setTimeout(() => scrollToElement(id), 150)
      setTimeout(() => scrollToElement(id), 500)
      setTimeout(() => scrollToElement(id), 1000)
    })
    return () => {
      Taro.eventCenter.off('backToIndex')
    }
  }, [])

  const scrollToElement = (id: string) => {
    const query = Taro.createSelectorQuery()
    query.select(`#item-${id}`).boundingClientRect().exec((res: any) => {
      if (res && res[0]) {
        const rect = res[0]
        // boundingClientRect 返回相对于视口的位置，需要加上当前滚动位置
        Taro.createSelectorQuery().selectViewport().scrollOffset().exec((scrollRes: any) => {
          if (scrollRes && scrollRes[0]) {
            const scrollTop = scrollRes[0].scrollTop + rect.top - 60 // 60是tab-bar高度
            Taro.pageScrollTo({ scrollTop: Math.max(0, scrollTop), duration: 0 })
          }
        })
      }
    })
  }

  const loadData = async (reset = false) => {
    if (loading) return
    if (!reset && !hasMore) return
    setLoading(true)
    try {
      const skip = reset ? 0 : offset
      const res = await Taro.cloud.callFunction({
        name: 'getArtworks', data: { skip, limit: 20, type: 'artworks' }
      }) as any
      const data = (res.result?.data || []) as Artwork[]
      const newArtworks = reset ? data : [...artworks, ...data]
      setArtworks(newArtworks)
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
    } catch(e) { console.error('加载失败', e)
    } finally { setLoading(false) }
  }

  const goArtwork = (id: string) => {
    lastClickedId.current = id
    Taro.setStorageSync('_lastClickedId', id)
    Taro.setStorageSync('_artworkList', artworks.map(a => a._id))
    Taro.navigateTo({ url: `/pages/artwork/index?id=${id}` })
  }
  const goArtist = (id: string) => {
    lastClickedId.current = id
    Taro.setStorageSync('_lastClickedId', id)
    Taro.navigateTo({ url: `/pages/artist/index?id=${id}` })
  }
  const goMuseum = (id: string) => {
    lastClickedId.current = id
    Taro.setStorageSync('_lastClickedId', id)
    Taro.navigateTo({ url: `/pages/museum/index?id=${id}` })
  }

  const switchTab = (tab: Tab) => {
    setActiveTab(tab)
    activeTabRef.current = tab
    lastClickedId.current = ''
    Taro.pageScrollTo({ scrollTop: 0, duration: 0 })
  }

  const toggleLarge = () => {
    const next = !largePicRef.current
    largePicRef.current = next
    setLargePic(next)
    // 切换大小图后滚回顶部（因位置无法准确还原）
    setTimeout(() => Taro.pageScrollTo({ scrollTop: 0, duration: 0 }), 50)
  }

  const splitCols = <T,>(arr: T[]) => {
    const left: T[] = [], right: T[] = []
    arr.forEach((item, i) => (i % 2 === 0 ? left : right).push(item))
    return [left, right]
  }

  const renderArtworkLarge = () => (
    <View>
      {artworks.map(a => (
        <View id={`item-${a._id}`} key={a._id} className='large-item' onClick={() => goArtwork(a._id)}>
          <Image className='large-img' src={a.image_url} mode='widthFix' lazyLoad />
          <View className='large-overlay'>
            <Text className='large-title'>{a.title}</Text>
            <Text className='large-sub'>{a.artist_name}</Text>
          </View>
        </View>
      ))}
      {hasMore && !loading && (
        <View style='padding:20px;text-align:center;color:#c9a84c;font-size:14px' onClick={() => loadData()}>
          ↓ 点击或继续滑动加载更多
        </View>
      )}
    </View>
  )

  const renderArtworkCols = () => {
    const [left, right] = splitCols(artworks)
    return (
      <View className='waterfall'>
        <View className='waterfall-col'>
          {left.map(a => (
            <View id={`item-${a._id}`} className='waterfall-item' key={a._id} onClick={() => goArtwork(a._id)}>
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
            <View id={`item-${a._id}`} className='waterfall-item' key={a._id} onClick={() => goArtwork(a._id)}>
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

  const renderArtistLarge = () => (
    <View>
      {artists.map(a => (
        <View id={`item-${a._id}`} key={a._id} className='large-item' onClick={() => goArtist(a._id)}>
          <Image className='large-img' src={a.avatar_url} mode='aspectFill' lazyLoad />
          <View className='large-overlay'>
            <Text className='large-title'>{a.name}</Text>
            {a.style && <Text className='large-sub'>{a.style}</Text>}
          </View>
        </View>
      ))}
    </View>
  )

  const renderArtistCols = () => {
    const [left, right] = splitCols(artists)
    return (
      <View className='waterfall'>
        <View className='waterfall-col'>
          {left.map(a => (
            <View id={`item-${a._id}`} className='waterfall-item' key={a._id} onClick={() => goArtist(a._id)}>
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
            <View id={`item-${a._id}`} className='waterfall-item' key={a._id} onClick={() => goArtist(a._id)}>
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

  const renderMuseumLarge = () => (
    <View>
      {museums.map(m => (
        <View id={`item-${m._id}`} key={m._id} className='large-item' onClick={() => goMuseum(m._id)}>
          <Image className='large-img' src={m.cover_url} mode='widthFix' lazyLoad />
          <View className='large-overlay'>
            <Text className='large-title'>{m.name}</Text>
            <Text className='large-sub'>{m.city}</Text>
          </View>
        </View>
      ))}
    </View>
  )

  const renderMuseumCols = () => {
    const [left, right] = splitCols(museums)
    return (
      <View className='waterfall'>
        <View className='waterfall-col'>
          {left.map(m => (
            <View id={`item-${m._id}`} className='waterfall-item' key={m._id} onClick={() => goMuseum(m._id)}>
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
            <View id={`item-${m._id}`} className='waterfall-item' key={m._id} onClick={() => goMuseum(m._id)}>
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
        <View className='tab-group'>
          {(['artwork','artist','museum'] as Tab[]).map(tab => {
            const labels: Record<Tab,string> = { artwork:'作品', artist:'艺术家', museum:'博物馆' }
            return (
              <View key={tab} className={`tab-item ${activeTab===tab?'active':''}`} onClick={() => switchTab(tab)}>
                <Text className='tab-text'>{labels[tab]}</Text>
              </View>
            )
          })}
        </View>
        <View style='padding:0 12px;display:flex;align-items:center' onClick={toggleLarge}>
          <Text className='tab-text' style='color:#1076FF'>{largePic ? '小图' : '大图'}</Text>
        </View>
      </View>
      <View className='content'>
        {activeTab==='artwork' && (largePic ? renderArtworkLarge() : renderArtworkCols())}
        {activeTab==='artist'  && (largePic ? renderArtistLarge()  : renderArtistCols())}
        {activeTab==='museum'  && (largePic ? renderMuseumLarge()  : renderMuseumCols())}
        {loading && <View className='loading'><Text className='loading-text'>加载中...</Text></View>}
        <View className='bottom-space' />
      </View>
    </View>
  )
}
