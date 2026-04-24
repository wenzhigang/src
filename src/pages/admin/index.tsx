import { View, Text, Image, Input, Textarea, ScrollView } from '@tarojs/components'
import { useState, useRef } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import './index.scss'

interface Artwork {
  _id: string
  title: string
  artist_name: string
  style: string
  year: string
  medium: string
  size: string
  description: string
  image_url: string
  tags: string[]
}

const PAGE = 20

export default function Admin() {
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const offsetRef = useRef(0)
  const scrollTopRef = useRef(0)
  const initialLoadedRef = useRef(false)
  const [hasMore, setHasMore] = useState(true)
  const [editing, setEditing] = useState<Artwork | null>(null)
  const [saving, setSaving] = useState(false)

  useDidShow(() => {
    const ui = Taro.getStorageSync('userInfo')
    if (!ui || ui.role !== 'admin') {
      Taro.showToast({ title: '无管理员权限', icon: 'none' })
      Taro.navigateBack()
      return
    }
    if (!initialLoadedRef.current) {
      initialLoadedRef.current = true
      loadArtworks(true)
    }
  })

  const loadArtworks = async (reset = false) => {
    if (loading) return
    setLoading(true)
    try {
      const db = Taro.cloud.database()
      const offset = reset ? 0 : offsetRef.current
      let query = db.collection('artworks').orderBy('seq', 'asc').skip(offset).limit(PAGE)
      const res = await query.get()
      const data = res.data as Artwork[]
      if (reset) {
        setArtworks(data)
        offsetRef.current = data.length
      } else {
        setArtworks(prev => [...prev, ...data])
        offsetRef.current = offset + data.length
      }
      setHasMore(data.length === PAGE)
    } catch (err) {
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!keyword.trim()) { loadArtworks(true); return }
    setLoading(true)
    try {
      const db = Taro.cloud.database()
      const _ = db.command
      const [r1, r2] = await Promise.all([
        db.collection('artworks').where({ title: db.RegExp({ regexp: keyword, flags: 'i' }) }).limit(20).get(),
        db.collection('artworks').where({ artist_name: db.RegExp({ regexp: keyword, flags: 'i' }) }).limit(20).get(),
      ])
      const seen = new Set<string>()
      const combined = [...r1.data, ...r2.data].filter(a => { if (seen.has(a._id)) return false; seen.add(a._id); return true })
      setArtworks(combined as Artwork[])
      setHasMore(false)
    } catch { Taro.showToast({ title: '搜索失败', icon: 'none' }) }
    finally { setLoading(false) }
  }

  const openEdit = (a: Artwork) => setEditing({ ...a })

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const res = await Taro.cloud.callFunction({
        name: 'manageArtwork',
        data: {
          action: 'update',
          id: editing._id,
          data: {
            title:       editing.title,
            artist_name: editing.artist_name,
            year:        editing.year,
            medium:      editing.medium,
            size:        editing.size,
            description: editing.description,
            tags:        editing.tags,
          }
        }
      }) as any
      if (!res.result || !res.result.success) {
        Taro.showToast({ title: res.result?.error || '保存失败', icon: 'none' })
        return
      }
      setArtworks(prev => prev.map(a => a._id === editing._id ? { ...a, ...editing } : a))
      Taro.showToast({ title: '保存成功', icon: 'success' })
      setEditing(null)
    } catch { Taro.showToast({ title: '保存失败', icon: 'none' }) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!editing) return
    Taro.showModal({ title: '确认删除', content: `删除《${editing.title}》？此操作不可恢复`, success: async ({ confirm }) => {
      if (!confirm) return
      try {
        const res = await Taro.cloud.callFunction({
          name: 'manageArtwork',
          data: { action: 'delete', id: editing._id }
        }) as any
        if (res.result && res.result.success) {
          setArtworks(prev => prev.filter(a => a._id !== editing._id))
          Taro.showToast({ title: '已删除', icon: 'success' })
          setEditing(null)
        } else {
          Taro.showToast({ title: res.result?.error || '删除失败', icon: 'none' })
        }
      } catch (e) { Taro.showToast({ title: '删除失败', icon: 'none' }) }
    }})
  }

  const f = (field: keyof Artwork, val: string) => setEditing(prev => prev ? { ...prev, [field]: val } : null)

  return (
    <View className='admin-page'>
      <View className='admin-header'>
        <Text className='admin-title'>管理后台</Text>
        <Text className='admin-sub'>共 {artworks.length} 幅画作已加载</Text>
      </View>

      <View className='search-bar'>
        <Input className='search-input' placeholder='搜索画作或画家...' placeholderStyle='color:rgba(255,255,255,0.3)'
          value={keyword} onInput={e => setKeyword(e.detail.value)} onConfirm={handleSearch} />
        <View className='filter-btn' onClick={handleSearch}>
          <Text className='filter-text'>搜索</Text>
        </View>
      </View>

      <ScrollView scrollY className='artwork-list' style='height:calc(100vh - 160px)' scrollTop={scrollTopRef.current} onScroll={e => { scrollTopRef.current = e.detail.scrollTop }} onScrollToLower={() => loadArtworks()}>
        {artworks.map(a => (
          <View className='artwork-row' key={a._id}>
            <Image className='artwork-thumb' src={a.image_url} mode='aspectFill' onClick={() => Taro.navigateTo({ url: `/pages/artwork/index?id=${a._id}` })} />
            <View className='artwork-info'>
              <Text className='artwork-name' onClick={() => Taro.navigateTo({ url: `/pages/artwork/index?id=${a._id}` })}>{a.title}</Text>
              <Text className='artwork-meta'>{a.artist_name} · {a.style}代 · {a.year || '年代不详'}</Text>
            </View>
            <View className='edit-btn' onClick={() => openEdit(a)}>
              <Text className='edit-text'>编辑</Text>
            </View>
          </View>
        ))}
        {hasMore && <View className='load-more'><Text className='load-more-text'>{loading ? '加载中...' : '上滑加载更多'}</Text></View>}
      </ScrollView>

      {editing && (
        <View className='modal-mask' onClick={e => { if ((e.target as any).className?.includes('modal-mask')) setEditing(null) }}>
          <View className='modal-box'>
            <Text className='modal-title'>编辑画作</Text>
            <Text className='field-label'>画作名称</Text>
            <Input className='field-input' value={editing.title} onInput={e => f('title', e.detail.value)} />
            <Text className='field-label'>画家</Text>
            <Input className='field-input' value={editing.artist_name} onInput={e => f('artist_name', e.detail.value)} />
            <Text className='field-label'>年代</Text>
            <Input className='field-input' value={editing.year} placeholder='如：约12世纪' placeholderStyle='color:rgba(255,255,255,0.3)' onInput={e => f('year', e.detail.value)} />
            <Text className='field-label'>材质</Text>
            <Input className='field-input' value={editing.medium} placeholder='如：绢本设色' placeholderStyle='color:rgba(255,255,255,0.3)' onInput={e => f('medium', e.detail.value)} />
            <Text className='field-label'>尺寸</Text>
            <Input className='field-input' value={editing.size} placeholder='如：68 × 42 cm' placeholderStyle='color:rgba(255,255,255,0.3)' onInput={e => f('size', e.detail.value)} />
            <Text className='field-label'>描述</Text>
            <Textarea className='field-textarea' value={editing.description} onInput={e => f('description', e.detail.value)} />
            <View className='modal-btns'>
              <View className='btn-cancel' onClick={() => setEditing(null)}><Text className='btn-cancel-text'>取消</Text></View>
              <View className='btn-save' onClick={handleSave}><Text className='btn-save-text'>{saving ? '保存中...' : '保存'}</Text></View>
            </View>
            <View className='btn-delete' onClick={handleDelete}><Text className='btn-delete-text'>删除此画作</Text></View>
          </View>
        </View>
      )}
    </View>
  )
}