import { View, Text, Image, Button } from '@tarojs/components'
import { useState, useEffect, useMemo } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import './index.scss'

interface UserInfo {
  openid: string
  nickname: string
  avatarUrl: string
  loginTime: number
}

interface FavoriteArtwork {
  _id: string
  artwork_id: string
  title: string
  artist_name: string
  image_url: string
}

interface HistoryArtwork {
  _id: string
  artwork_id: string
  title: string
  artist_name: string
  image_url: string
  viewed_at: any
  view_count: number
  museum_id?: string
  artist_id?: string
}

function computeBadges(history: HistoryArtwork[], favorites: FavoriteArtwork[]) {
  const uniqueArtworks = new Set(history.map(h => h.artwork_id)).size
  const uniqueArtists = new Set(history.map(h => h.artist_id).filter(Boolean)).size
  const uniqueMuseums = new Set(history.map(h => h.museum_id).filter(Boolean)).size
  const favCount = favorites.length

  return [
    { id: '001', name: '初心者', desc: '浏览第1幅画作', icon: '🎨', unlocked: uniqueArtworks >= 1, progress: Math.min(uniqueArtworks, 1), total: 1 },
    { id: '002', name: '探索者', desc: '累计浏览10幅画作', icon: '🌸', unlocked: uniqueArtworks >= 10, progress: Math.min(uniqueArtworks, 10), total: 10 },
    { id: '003', name: '鉴赏家', desc: '累计浏览50幅画作', icon: '👁️', unlocked: uniqueArtworks >= 50, progress: Math.min(uniqueArtworks, 50), total: 50 },
    { id: '004', name: '收藏达人', desc: '收藏10幅作品', icon: '❤️', unlocked: favCount >= 10, progress: Math.min(favCount, 10), total: 10 },
    { id: '005', name: '艺术迷', desc: '收藏30幅作品', icon: '💎', unlocked: favCount >= 30, progress: Math.min(favCount, 30), total: 30 },
    { id: '006', name: '环球旅人', desc: '探索5个博物馆', icon: '🏛️', unlocked: uniqueMuseums >= 5, progress: Math.min(uniqueMuseums, 5), total: 5 },
    { id: '007', name: '寻源问道', desc: '浏览10位艺术家作品', icon: '✨', unlocked: uniqueArtists >= 10, progress: Math.min(uniqueArtists, 10), total: 10 },
  ]
}

export default function Profile() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [favorites, setFavorites] = useState<FavoriteArtwork[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [history, setHistory] = useState<HistoryArtwork[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [activeSection, setActiveSection] = useState<'favorites' | 'history' | 'badges'>('favorites')

  const badges = useMemo(() => computeBadges(history, favorites), [history, favorites])
  const unlockedCount = badges.filter(b => b.unlocked).length

  useEffect(() => {
    const stored = Taro.getStorageSync('userInfo')
    if (stored && stored.openid) setUserInfo(stored)
  }, [])

  useDidShow(() => {
    const stored = Taro.getStorageSync('userInfo')
    if (stored && stored.openid) {
      setUserInfo(stored)
      loadFavorites(stored.openid)
      loadHistory(stored.openid)
    }
  })

  const loadFavorites = async (openid: string) => {
    setLoadingFavorites(true)
    try {
      const db = Taro.cloud.database()
      const res = await db.collection('favorites')
        .where({ openid })
        .orderBy('created_at', 'desc')
        .limit(50)
        .get()
      setFavorites(res.data as FavoriteArtwork[])
    } catch (err) {
      console.error('加载收藏失败：', err)
    } finally {
      setLoadingFavorites(false)
    }
  }

  const loadHistory = async (openid: string) => {
    setLoadingHistory(true)
    try {
      const db = Taro.cloud.database()
      const res = await db.collection('history')
        .where({ openid })
        .orderBy('viewed_at', 'desc')
        .limit(100)
        .get()
      setHistory(res.data as HistoryArtwork[])
    } catch (err) {
      console.error('加载历史失败：', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleGetUserProfile = async () => {
    setLoginLoading(true)
    try {
      const profileRes = await Taro.getUserProfile({ desc: '用于展示您的个人信息' })
      const { nickName, avatarUrl } = profileRes.userInfo
      const stored = Taro.getStorageSync('userInfo')
      if (!stored || !stored.openid) { Taro.showToast({ title: '请稍后再试', icon: 'none' }); return }
      const newUserInfo: UserInfo = { openid: stored.openid, nickname: nickName, avatarUrl, loginTime: stored.loginTime }
      Taro.setStorageSync('userInfo', newUserInfo)
      setUserInfo(newUserInfo)
      const db = Taro.cloud.database()
      await db.collection('users').where({ openid: stored.openid }).update({
        data: { nickname: nickName, avatar_url: avatarUrl, last_login: db.serverDate() }
      })
      Taro.showToast({ title: '登录成功', icon: 'success' })
      loadFavorites(stored.openid)
    } catch (err) {
      Taro.showToast({ title: '取消登录', icon: 'none' })
    } finally {
      setLoginLoading(false)
    }
  }

  const goToArtwork = (artworkId: string, list: string[]) => {
    ;(Taro as any)._artworkList = list
    Taro.navigateTo({ url: `/pages/artwork/index?id=${artworkId}` })
  }

  const isLoggedIn = userInfo && userInfo.openid && userInfo.nickname

  return (
    <View className='profile-page'>

      <View className='user-card'>
        {isLoggedIn ? (
          <>
            <Image className='avatar' src={userInfo!.avatarUrl} mode='aspectFill' />
            <View className='user-info'>
              <Text className='nickname'>{userInfo!.nickname}</Text>
              <View className='membership-badge'><Text className='membership-text'>免费版</Text></View>
            </View>
          </>
        ) : (
          <>
            <View className='avatar-placeholder'><Text className='avatar-placeholder-text'>画</Text></View>
            <View className='user-info'>
              <Text className='nickname'>{userInfo && userInfo.openid ? '艺术爱好者' : '未登录'}</Text>
              <View className='membership-badge'><Text className='membership-text'>免费版</Text></View>
            </View>
            <Button className='login-btn' onClick={handleGetUserProfile} loading={loginLoading}>
              <Text className='login-text'>微信登录</Text>
            </Button>
          </>
        )}
      </View>

      <View className='stats-row'>
        <View className='stat-item' onClick={() => setActiveSection('favorites')}>
          <Text className='stat-number'>{favorites.length}</Text>
          <Text className='stat-label'>收藏</Text>
        </View>
        <View className='stat-divider' />
        <View className='stat-item' onClick={() => setActiveSection('history')}>
          <Text className='stat-number'>{new Set(history.map(h => h.artwork_id)).size}</Text>
          <Text className='stat-label'>已看</Text>
        </View>
        <View className='stat-divider' />
        <View className='stat-item' onClick={() => setActiveSection('badges')}>
          <Text className='stat-number'>{unlockedCount}</Text>
          <Text className='stat-label'>徽章</Text>
        </View>
      </View>

      <View className='section-tabs'>
        {(['favorites', 'history', 'badges'] as const).map(tab => (
          <View key={tab} className={`section-tab ${activeSection === tab ? 'active' : ''}`} onClick={() => setActiveSection(tab)}>
            <Text className='section-tab-text'>
              {tab === 'favorites' ? '我的收藏' : tab === 'history' ? '浏览历史' : '成就徽章'}
            </Text>
          </View>
        ))}
      </View>

      {activeSection === 'favorites' && (
        <View className='favorites-section'>
          {loadingFavorites ? (
            <View className='empty-state'><Text className='empty-text'>加载中...</Text></View>
          ) : favorites.length > 0 ? (
            <View className='artwork-grid'>
              {favorites.map(item => (
                <View className='artwork-item' key={item._id} onClick={() => goToArtwork(item.artwork_id, favorites.map(f => f.artwork_id))}>
                  <Image className='artwork-img' src={item.image_url} mode='aspectFill' />
                  <View className='artwork-info'>
                    <Text className='artwork-title'>{item.title}</Text>
                    <Text className='artwork-artist'>{item.artist_name}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className='empty-state'>
              <Text className='empty-icon'>🖼️</Text>
              <Text className='empty-text'>还没有收藏画作</Text>
              <Text className='empty-sub'>去探索喜欢的画作吧</Text>
            </View>
          )}
        </View>
      )}

      {activeSection === 'history' && (
        <View className='favorites-section'>
          {loadingHistory ? (
            <View className='empty-state'><Text className='empty-text'>加载中...</Text></View>
          ) : history.length > 0 ? (
            <View className='artwork-grid'>
              {history.map(item => (
                <View className='artwork-item' key={item._id} onClick={() => goToArtwork(item.artwork_id, history.map(h => h.artwork_id))}>
                  <Image className='artwork-img' src={item.image_url} mode='aspectFill' />
                  <View className='artwork-info'>
                    <Text className='artwork-title'>{item.title}</Text>
                    <Text className='artwork-artist'>{item.artist_name}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className='empty-state'>
              <Text className='empty-icon'>👁️</Text>
              <Text className='empty-text'>还没有浏览记录</Text>
              <Text className='empty-sub'>去探索画作吧</Text>
            </View>
          )}
        </View>
      )}

      {activeSection === 'badges' && (
        <View className='badges-section'>
          <View className='badges-summary'>
            <Text className='badges-summary-text'>已解锁 {unlockedCount} / {badges.length} 个徽章</Text>
          </View>
          <View className='badges-grid'>
            {badges.map(badge => (
              <View className={`badge-item ${badge.unlocked ? 'unlocked' : 'locked'}`} key={badge.id}>
                <Text className='badge-icon'>{badge.icon}</Text>
                <Text className='badge-name'>{badge.name}</Text>
                <Text className='badge-desc'>{badge.desc}</Text>
                {badge.unlocked ? (
                  <View className='badge-unlocked-tag'><Text className='badge-unlocked-text'>已解锁</Text></View>
                ) : (
                  <>
                    <View className='badge-progress-bar'>
                      <View className='badge-progress-fill' style={{ width: `${Math.round(badge.progress / badge.total * 100)}%` }} />
                    </View>
                    <Text className='badge-progress-text'>{badge.progress}/{badge.total}</Text>
                    <View className='lock-mask'><Text className='lock-icon'>🔒</Text></View>
                  </>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      <View className='settings-section'>
        <Text className='settings-title'>更多</Text>
        <View className='menu-list'>
          {userInfo && (Taro.getStorageSync('userInfo') as any)?.role === 'admin' && (
            <View className='menu-item' onClick={() => Taro.navigateTo({ url: '/pages/admin/index' })}>
              <Text className='menu-icon'>⚙️</Text>
              <Text className='menu-text'>管理后台</Text>
              <Text className='menu-arrow'>›</Text>
            </View>
          )}
          <View className='menu-item' onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none' })}>
            <Text className='menu-icon'>⭐</Text><Text className='menu-text'>升级会员</Text><Text className='menu-arrow'>›</Text>
          </View>
          <View className='menu-item' onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none' })}>
            <Text className='menu-icon'>📚</Text><Text className='menu-text'>学习记录</Text><Text className='menu-arrow'>›</Text>
          </View>
          <View className='menu-item' onClick={() => Taro.showToast({ title: '感谢您的反馈！', icon: 'success' })}>
            <Text className='menu-icon'>💬</Text><Text className='menu-text'>意见反馈</Text><Text className='menu-arrow'>›</Text>
          </View>
          <View className='menu-item' onClick={() => Taro.showToast({ title: '画说 v1.0.0', icon: 'none' })}>
            <Text className='menu-icon'>ℹ️</Text><Text className='menu-text'>关于画说</Text><Text className='menu-arrow'>›</Text>
          </View>
        </View>
      </View>

      <View className='bottom-space' />
    </View>
  )
}
