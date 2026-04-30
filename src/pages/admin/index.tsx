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
  const [largePic, setLargePic] = useState(false)
  const [corrections, setCorrections] = useState<Set<string>>(new Set())
  const [showCorrections, setShowCorrections] = useState(false)
  const [correctionList, setCorrectionList] = useState<Artwork[]>([])
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set())
  const [acceptingAll, setAcceptingAll] = useState(false)
  const [refreshAllProgress, setRefreshAllProgress] = useState({ running: false, done: 0, total: 0 })
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [correctionPage, setCorrectionPage] = useState(0)
  const [correctionHasMore, setCorrectionHasMore] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [importProgress, setImportProgress] = useState('')
  const [showImportOptions, setShowImportOptions] = useState(false)
  const [showPromptEditor, setShowPromptEditor] = useState(false)
  const [promptText, setPromptText] = useState('')
  const [promptSaving, setPromptSaving] = useState(false)
  const [importIncludeReviewed, setImportIncludeReviewed] = useState(false)
  const [importIncludeManual, setImportIncludeManual] = useState(false)

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

  const toggleCorrection = async (a: Artwork) => {
    const db = Taro.cloud.database()
    const isMarked = corrections.has(a._id)
    if (isMarked) {
      await db.collection('corrections').where({ artwork_id: a._id }).remove()
      setCorrections(prev => { const s = new Set(prev); s.delete(a._id); return s })
      Taro.showToast({ title: '已取消修正', icon: 'none' })
    } else {
      await db.collection('corrections').add({
        data: { artwork_id: a._id, title: a.title, artist_name: a.artist_name,
                image_url: a.image_url, description: a.description,
                status: 'pending', created_at: db.serverDate() }
      })
      setCorrections(prev => new Set(prev).add(a._id))
      Taro.showToast({ title: '已加入修正队列', icon: 'success' })
    }
  }

  const loadCorrections = async (page = 0) => {
    setShowCorrections(true)
    try {
      const skip = page * 100
      const res = await Taro.cloud.callFunction({
        name: 'getCorrections',
        data: { skip, limit: 100, statusFilter: ['pending', 'updated'] }
      }) as any
      const batch = res.result?.data || []

      if (page === 0) {
        setCorrectionList(batch)
      } else {
        setCorrectionList(prev => [...prev, ...batch])
      }
      setCorrectionPage(page)
      setCorrectionHasMore(batch.length === 100)

      if (page === 0) {
        // 用云函数获取精确总数
        try {
          const countBatches: any[] = []
          let cskip = 0
          while (true) {
            const cr = await Taro.cloud.callFunction({
              name: 'getCorrections',
              data: { skip: cskip, limit: 100, statusFilter: ['pending', 'updated'] }
            }) as any
            countBatches.push(...(cr.result?.data || []))
            if ((cr.result?.data || []).length < 100) break
            cskip += 100
            if (cskip >= 5000) break
          }
          setPendingCount(countBatches.length)
        } catch { setPendingCount(batch.length) }
      }

      // 已确认最近10条
      if (page === 0) {
        const confirmedRes = await Taro.cloud.callFunction({
          name: 'getCorrections',
          data: { skip: 0, limit: 10, statusFilter: ['confirmed'] }
        }) as any
        const confirmedData = confirmedRes.result?.data || []
        setCorrectionList(prev => [...prev, ...confirmedData])
      }

      const ids = new Set(batch.map((r: any) => r.artwork_id))
      if (page === 0) {
        setCorrections(ids as Set<string>)
      } else {
        setCorrections(prev => new Set([...prev, ...ids]))
      }
    } catch(e) {
      console.error('loadCorrections error:', e)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    }
  }
  const refreshWithDeepseek = async (item: any) => {
    const aid = item.artwork_id
    setRefreshingIds(prev => new Set(prev).add(aid))
    try {
      const res = await Taro.cloud.callFunction({
        name: 'refreshDescription',
        data: { artwork_id: aid, title: item.title, artist_name: item.artist_name }
      }) as any
      if (res.result?.success) {
        const db = Taro.cloud.database()
        await db.collection('corrections').where({ artwork_id: aid })
          .update({ data: { status: 'updated', new_description: res.result.description, updated_at: db.serverDate() } })
        // 直接更新本地 correctionList，不重新加载全部
        setCorrectionList(prev => prev.map((item: any) =>
          item.artwork_id === aid
            ? { ...item, status: 'updated', new_description: res.result.description }
            : item
        ))
      } else {
        Taro.showToast({ title: '更新失败', icon: 'none' })
      }
    } catch { Taro.showToast({ title: '更新失败', icon: 'none' }) }
    setRefreshingIds(prev => { const s = new Set(prev); s.delete(aid); return s })
  }

  const refreshAll = async () => {
    const pending = correctionList.filter((item: any) => item.status === 'pending')
    if (pending.length === 0) { Taro.showToast({ title: '没有待处理项', icon: 'none' }); return }
    // 先获取真实总数
    const totalRes = await Taro.cloud.callFunction({
      name: 'getCorrections',
      data: { skip: 0, limit: 1, statusFilter: ['pending'] }
    }) as any
    const realTotal = pendingCount > 0 ? pendingCount : pending.length
    setRefreshAllProgress({ running: true, done: 0, total: realTotal })
    setDoneIds(new Set())
    let done = 0
    for (const item of pending) {
      await refreshWithDeepseek(item)
      done++
      setDoneIds(prev => new Set(prev).add(item.artwork_id))
      setRefreshAllProgress({ running: true, done, total: pending.length })
    }
    setRefreshAllProgress({ running: false, done, total: pending.length })
    // 完成后延迟2秒清除进度
    setTimeout(() => {
      setRefreshAllProgress({ running: false, done: 0, total: 0 })
      setDoneIds(new Set())
    }, 3000)
  }

  const confirmAll = async () => {
    const updated = correctionList.filter((item: any) => item.status === 'updated' && item.new_description)
    if (updated.length === 0) { Taro.showToast({ title: '没有待确认项', icon: 'none' }); return }
    setAcceptingAll(true)
    let done = 0
    for (const item of updated) {
      try {
        await Taro.cloud.callFunction({
          name: 'confirmDescription',
          data: { artwork_id: item.artwork_id, description: item.new_description }
        })
        setCorrections(prev => { const s = new Set(prev); s.delete(item.artwork_id); return s })
        done++
      } catch {}
    }
    await loadCorrections()
    setAcceptingAll(false)
    Taro.showToast({ title: `已确认 ${done} 幅`, icon: 'success' })
  }

  const confirmCorrection = async (item: any) => {
    if (!item.new_description) {
      Taro.showToast({ title: '请先用DeepSeek生成新描述', icon: 'none' })
      return
    }
    Taro.showToast({ title: '更新中...', icon: 'loading', duration: 10000 })
    try {
      const res = await Taro.cloud.callFunction({
        name: 'confirmDescription',
        data: {
          artwork_id: item.artwork_id,
          description: item.new_description
        }
      }) as any
      Taro.hideToast()
      if (res.result?.success) {
        await loadCorrections(0)
        // 从修正集合中移除已确认的
        setCorrections(prev => { const s = new Set(prev); s.delete(item.artwork_id); return s })
        Taro.showToast({ title: '已确认并更新', icon: 'success' })
      } else {
        Taro.showToast({ title: res.result?.error || '更新失败', icon: 'none' })
      }
    } catch(e) {
      Taro.hideToast()
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  const importAll = async (includeReviewed: boolean, includeManual: boolean) => {
    setShowImportOptions(false)
    setImporting(true)
    setImportProgress('准备中...')
    let skip = 0
    let totalImported = 0
    let totalSkipped = 0
    let batchNum = 0
    try {
      while (true) {
        batchNum++
        setImportProgress(`正在处理第 ${skip + 1}-${skip + 50} 张（已处理 ${totalImported + totalSkipped} 条）...`)
        // 小延迟让UI有机会更新
        await new Promise(resolve => setTimeout(resolve, 50))
        const res = await Taro.cloud.callFunction({
          name: 'batchImportCorrections',
          data: { skip, limit: 50, includeReviewed, includeManual }
        }) as any
        const r = res.result
        if (!r?.success) {
          Taro.showToast({ title: r?.error || '导入失败', icon: 'none' })
          break
        }
        totalImported += r.imported || 0
        totalSkipped += r.skipped || 0
        if (r.done) break
        skip += 50
      }
      setImportProgress('')
      await loadCorrections()
      const msg = totalImported > 0
        ? `导入完成：新增 ${totalImported} 条`
        : `已全部存在，无需重复导入`
      Taro.showToast({ title: msg, icon: totalImported > 0 ? 'success' : 'none', duration: 3000 })
    } catch(e) {
      Taro.showToast({ title: '导入出错', icon: 'none' })
      setImportProgress('')
    }
    setImporting(false)
  }
  const openPromptEditor = async () => {
    setShowPromptEditor(true)
    try {
      const res = await Taro.cloud.callFunction({ name: 'manageSettings', data: { action: 'get' } }) as any
      setPromptText(res.result?.prompt || '')
    } catch { Taro.showToast({ title: '加载失败', icon: 'none' }) }
  }

  const savePrompt = async () => {
    if (!promptText.trim()) { Taro.showToast({ title: '提示词不能为空', icon: 'none' }); return }
    setPromptSaving(true)
    try {
      const res = await Taro.cloud.callFunction({
        name: 'manageSettings',
        data: { action: 'set', prompt: promptText }
      }) as any
      if (res.result?.success) {
        Taro.showToast({ title: '已保存', icon: 'success' })
        setShowPromptEditor(false)
      } else {
        Taro.showToast({ title: '保存失败', icon: 'none' })
      }
    } catch { Taro.showToast({ title: '保存失败', icon: 'none' }) }
    setPromptSaving(false)
  }

  const f = (field: keyof Artwork, val: string) => setEditing(prev => prev ? { ...prev, [field]: val } : null)

  return (
    <View className='admin-page'>
      <View className='admin-header'>
        <View style='display:flex;justify-content:space-between;align-items:center'>
          <Text className='admin-title'>管理后台</Text>
          <View style='display:flex;gap:8px'>
            <View className='pic-toggle' onClick={openPromptEditor}>
              <Text className='pic-toggle-text'>AI提示词</Text>
            </View>
            <View className='pic-toggle' onClick={() => loadCorrections(0)}>
              <Text className='pic-toggle-text'>修复列表</Text>
            </View>
            <View className='pic-toggle' onClick={() => setLargePic(!largePic)}>
              <Text className='pic-toggle-text'>{largePic ? '小图' : '大图'}</Text>
            </View>
          </View>
        </View>
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
          largePic ? (
            <View className='artwork-row-large' key={a._id} onClick={() => Taro.navigateTo({ url: `/pages/artwork/index?id=${a._id}` })}>
              <View className='large-img-wrap'>
                <Image className='artwork-thumb-large' src={a.image_url} mode='widthFix'
                  onClick={() => Taro.navigateTo({ url: `/pages/artwork/index?id=${a._id}` })} />
                <View className='large-overlay-top'>
                  <Text className='large-title'>{a.title}</Text>
                  <Text className='large-artist'>{a.artist_name}</Text>
                </View>
                <View className='large-overlay-bottom' style='display:flex;gap:6px'>
                  <View className='edit-btn-small' onClick={e => { e.stopPropagation(); openEdit(a) }}>
                    <Text className='edit-text-small'>编辑</Text>
                  </View>
                  <View className={corrections.has(a._id) ? 'correct-btn-small active' : 'correct-btn-small'} onClick={e => { e.stopPropagation(); toggleCorrection(a) }}>
                    <Text className='edit-text-small'>{corrections.has(a._id) ? '✓' : '修复'}</Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View className='artwork-row' key={a._id} onClick={() => Taro.navigateTo({ url: `/pages/artwork/index?id=${a._id}` })}>
              <Image className='artwork-thumb' src={a.image_url} mode='aspectFill'
                onClick={() => Taro.navigateTo({ url: `/pages/artwork/index?id=${a._id}` })} />
              <View className='artwork-info'>
                <Text className='artwork-name' onClick={() => Taro.navigateTo({ url: `/pages/artwork/index?id=${a._id}` })}>{a.title}</Text>
                <Text className='artwork-meta'>{a.artist_name} · {a.style}代 · {a.year || '年代不详'}</Text>
              </View>
              <View style='display:flex;flex-direction:row;gap:4px;align-items:center'>
                <View className='edit-btn' onClick={e => { e.stopPropagation(); openEdit(a) }}>
                  <Text className='edit-text'>编辑</Text>
                </View>
                <View className={corrections.has(a._id) ? 'correct-btn active' : 'correct-btn'} onClick={e => { e.stopPropagation(); toggleCorrection(a) }}>
                  <Text className='correct-text'>{corrections.has(a._id) ? '✓' : '修复'}</Text>
                </View>
              </View>
            </View>
          )
        ))}
        {hasMore && <View className='load-more'><Text className='load-more-text'>{loading ? '加载中...' : '上滑加载更多'}</Text></View>}
      </ScrollView>

      {showCorrections && (
        <View className='correction-overlay'>
          <View className='correction-header'>
            {refreshAllProgress.running ? (
              <Text className='correction-header-title'>修复中（{refreshAllProgress.done}/{refreshAllProgress.total}）</Text>
            ) : (
              <Text className='correction-header-title'>修复列表（{pendingCount > 0 ? `${pendingCount} 待处理` : '加载中...'}）</Text>
            )}
            <View style='display:flex;gap:8px;align-items:center'>
              {!importing && (
                <Text style='font-size:13px;color:#888;padding:4px 6px' onClick={() => setShowImportOptions(!showImportOptions)}>导入全部</Text>
              )}
              {correctionList.some((r: any) => r.status === 'pending') && !importing && (
                <Text style='font-size:13px;color:#c9a84c;padding:4px 6px' onClick={refreshAll}>全部修复</Text>
              )}
              {correctionList.some((r: any) => r.status === 'updated') && !importing && (
                <Text style='font-size:13px;color:#52c41a;padding:4px 6px' onClick={confirmAll}>{acceptingAll ? '处理中...' : '接受全部'}</Text>
              )}
              {correctionList.some((r: any) => r.status !== 'confirmed') && !importing && (
                <Text style='font-size:13px;color:#e05555;padding:4px 6px' onClick={async () => {
                  Taro.showModal({
                    title: '确认删除',
                    content: `将删除修正队列中全部待处理记录（含未加载部分），确认继续？`,
                    success: async ({ confirm }) => {
                      if (!confirm) return
                      Taro.showToast({ title: '删除中...', icon: 'loading', duration: 10000 })
                      try {
                        const res = await Taro.cloud.callFunction({
                          name: 'deleteAllCorrections',
                          data: { statusFilter: ['pending', 'updated'] }
                        }) as any
                        Taro.hideToast()
                        if (res.result?.success) {
                          await loadCorrections(0)
                          Taro.showToast({ title: `已删除 ${res.result.deleted} 条`, icon: 'success' })
                        } else {
                          Taro.showToast({ title: '删除失败', icon: 'none' })
                        }
                      } catch {
                        Taro.hideToast()
                        Taro.showToast({ title: '删除失败', icon: 'none' })
                      }
                    }
                  })
                }}>全部删除</Text>
              )}
              <Text className='correction-close' onClick={() => setShowCorrections(false)}>关闭</Text>
            </View>
          </View>
          {showImportOptions && (
            <View className='import-options-panel'>
              <Text className='import-options-title'>选择导入范围</Text>
              <Text className='import-options-desc'>未处理的画作默认全选，可额外勾选：</Text>
              <View className='import-option-row' onClick={() => setImportIncludeReviewed(!importIncludeReviewed)}>
                <View className={importIncludeReviewed ? 'import-checkbox checked' : 'import-checkbox'}>
                  {importIncludeReviewed && <Text className='import-check-icon'>✓</Text>}
                </View>
                <View style='flex:1'>
                  <Text className='import-option-label'>✓ 已修复（DeepSeek处理过）</Text>
                  <Text className='import-option-sub'>重新生成这些画作的描述</Text>
                </View>
              </View>
              <View className='import-option-row' onClick={() => setImportIncludeManual(!importIncludeManual)}>
                <View className={importIncludeManual ? 'import-checkbox checked' : 'import-checkbox'}>
                  {importIncludeManual && <Text className='import-check-icon'>✓</Text>}
                </View>
                <View style='flex:1'>
                  <Text className='import-option-label'>✎ 已编辑（手动编辑过）</Text>
                  <Text className='import-option-sub'>重新生成会覆盖手动编辑内容</Text>
                </View>
              </View>
              <View style='display:flex;gap:8px;margin-top:14px'>
                <View className='btn-cancel' style='flex:1;padding:10px' onClick={() => setShowImportOptions(false)}>
                  <Text className='btn-cancel-text'>取消</Text>
                </View>
                <View className='btn-save' style='flex:1;padding:10px' onClick={() => importAll(importIncludeReviewed, importIncludeManual)}>
                  <Text className='btn-save-text'>确认导入</Text>
                </View>
              </View>
            </View>
          )}
          <ScrollView scrollY className='correction-scroll'>
            {importing && (
              <View style='padding:20px 16px;text-align:center'>
                <Text style='display:block;font-size:15px;color:#c9a84c;margin-bottom:8px'>{importProgress}</Text>
                <Text style='display:block;font-size:12px;color:#666'>导入过程中请勿关闭</Text>
              </View>
            )}
            {!importing && correctionList.length === 0 && (
              <Text style='color:#999;font-size:14px;padding:16px;display:block'>暂无待修正画作</Text>
            )}
            {correctionList.filter((item: any) => item.status !== 'confirmed').map((item: any) => (
              <View key={item._id} className='correction-item' onClick={() => Taro.navigateTo({ url: `/pages/artwork/index?id=${item.artwork_id}` })}>
                <View style='display:flex;gap:10px;align-items:center'>
                  <Image style='width:56px;height:56px;border-radius:6px;flex-shrink:0' src={item.image_url} mode='aspectFill' />
                  <View style='flex:1;min-width:0'>
                    <Text style='display:block;font-size:14px;color:#fff;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'>{item.title}</Text>
                    <Text style='display:block;font-size:12px;color:#999;margin-top:2px'>{item.artist_name}</Text>
                    <Text style='display:block;font-size:11px;margin-top:2px;color:{item.status==="updated"?"#c9a84c":"#666"}'>{item.status === 'updated' ? '已更新待确认' : '待处理'}</Text>
                  </View>
                  <View style='display:flex;flex-direction:column;gap:4px;flex-shrink:0'>
                    {item.status === 'pending' && (
                      <View style='display:flex;gap:4px'>
                        <View className='corr-action-btn' onClick={e => { e.stopPropagation(); if (!refreshingIds.has(item.artwork_id)) refreshWithDeepseek(item) }}>
                          <Text className='corr-action-text'>{doneIds.has(item.artwork_id) ? '✅' : refreshingIds.has(item.artwork_id) ? '...' : '修复'}</Text>
                        </View>
                        <View className='corr-action-btn remove' onClick={e => { e.stopPropagation(); toggleCorrection({_id: item.artwork_id} as any) }}>
                          <Text className='corr-action-text'>移除</Text>
                        </View>
                      </View>
                    )}
                    {item.status === 'updated' && (
                      <View style='display:flex;gap:4px'>
                        <View className='corr-action-btn confirm' onClick={e => { e.stopPropagation(); confirmCorrection(item) }}>
                          <Text className='corr-action-text'>确认</Text>
                        </View>
                        <View className='corr-action-btn' onClick={e => { e.stopPropagation(); if (!refreshingIds.has(item.artwork_id)) refreshWithDeepseek(item) }}>
                          <Text className='corr-action-text'>{refreshingIds.has(item.artwork_id) ? '...' : '重修复'}</Text>
                        </View>
                        <View className='corr-action-btn remove' onClick={e => { e.stopPropagation(); toggleCorrection({_id: item.artwork_id} as any) }}>
                          <Text className='corr-action-text'>移除</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
                {item.new_description && (
                  <View style='background:rgba(255,255,255,0.05);border-radius:8px;padding:10px;margin-top:8px'>
                    <Text style='display:block;font-size:11px;color:#999;margin-bottom:6px'>新描述预览：</Text>
                    <Text style='display:block;font-size:13px;color:#ddd;line-height:1.7'>{item.new_description}</Text>
                  </View>
                )}
              </View>
            ))}
            {correctionHasMore && (
              <View style='padding:12px 16px;text-align:center' onClick={() => loadCorrections(correctionPage + 1)}>
                <Text style='font-size:14px;color:#c9a84c'>加载更多待处理...</Text>
              </View>
            )}
            {correctionList.some((item: any) => item.status === 'confirmed') && (
              <View className='correction-history'>
                <View style='display:flex;justify-content:space-between;align-items:center;padding:10px 12px 6px'>
                  <Text style='font-size:12px;color:#666'>历史记录（{correctionList.filter((r: any) => r.status === 'confirmed').length} 条已确认）</Text>
                  <Text style='font-size:12px;color:#e05555' onClick={async () => {
                    const db = Taro.cloud.database()
                    const confirmed = correctionList.filter((r: any) => r.status === 'confirmed')
                    for (const item of confirmed) {
                      await db.collection('corrections').doc(item._id).remove()
                    }
                    await loadCorrections()
                    Taro.showToast({ title: '已全部删除', icon: 'success' })
                  }}>全部删除</Text>
                </View>
                {correctionList.filter((item: any) => item.status === 'confirmed').map((item: any) => (
                  <View key={item._id} className='correction-history-item'>
                    <Image style='width:36px;height:36px;border-radius:4px;flex-shrink:0' src={item.image_url} mode='aspectFill' />
                    <View style='flex:1'>
                      <Text style='display:block;font-size:13px;color:#ccc'>{item.title}</Text>
                      <Text style='display:block;font-size:11px;color:#52c41a;margin-top:2px'>✓ 已确认</Text>
                    </View>
                    <View className='btn-delete' style='padding:6px 10px;margin:0;border:none;flex-shrink:0;width:auto' onClick={async () => {
                      const db = Taro.cloud.database()
                      await db.collection('corrections').doc(item._id).remove()
                      await loadCorrections()
                    }}>
                      <Text className='btn-delete-text' style='font-size:12px'>删除</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      )}

            {showPromptEditor && (
        <View className='modal-mask' onClick={e => { if ((e.target as any).className?.includes('modal-mask')) setShowPromptEditor(false) }}>
          <View className='modal-box'>
            <Text className='modal-title'>AI提示词设置</Text>
            <Text className='field-label'>提示词模板（用 {'{title}'} 和 {'{artist_name}'} 作为变量）</Text>
            <Textarea
              className='field-textarea'
              style='min-height:300px;font-size:13px;line-height:1.6'
              value={promptText}
              onInput={e => setPromptText(e.detail.value)}
              placeholder='输入提示词模板...'
              placeholderStyle='color:rgba(255,255,255,0.3)'
            />
            <View className='modal-btns'>
              <View className='btn-cancel' onClick={() => setShowPromptEditor(false)}>
                <Text className='btn-cancel-text'>取消</Text>
              </View>
              <View className='btn-save' onClick={savePrompt}>
                <Text className='btn-save-text'>{promptSaving ? '保存中...' : '保存'}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

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