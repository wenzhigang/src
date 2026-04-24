#!/usr/bin/env python3

path = '/Users/zhigangwen/code/src/huashuo/src/pages/admin/index.tsx'
with open(path, 'r') as f:
    content = f.read()

# 修复1：加 scrollTopRef
content = content.replace(
    "  const offsetRef = useRef(0)\n",
    "  const offsetRef = useRef(0)\n  const scrollTopRef = useRef(0)\n"
)

# 修复1：ScrollView 加 onScroll 和 scrollTop
content = content.replace(
    "<ScrollView scrollY className='artwork-list' style='height:calc(100vh - 160px)' onScrollToLower={() => loadArtworks()}>",
    "<ScrollView scrollY className='artwork-list' style='height:calc(100vh - 160px)' scrollTop={scrollTopRef.current} onScroll={e => { scrollTopRef.current = e.detail.scrollTop }} onScrollToLower={() => loadArtworks()}>"
)

# 修复2：删除改用云函数
old_delete = """      try {
        const db = Taro.cloud.database()
        await db.collection('artworks').doc(editing._id).remove()
        setArtworks(prev => prev.filter(a => a._id !== editing._id))
        Taro.showToast({ title: '已删除', icon: 'success' })
        setEditing(null)
      } catch { Taro.showToast({ title: '删除失败', icon: 'none' }) }"""

new_delete = """      try {
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
      } catch (e) { Taro.showToast({ title: '删除失败', icon: 'none' }) }"""

content = content.replace(old_delete, new_delete)

with open(path, 'w') as f:
    f.write(content)

print('修复完成')
