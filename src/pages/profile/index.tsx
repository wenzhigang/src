import { View, Text, Image, Button } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import './index.scss'

// 成就徽章数据
const badges = [
  { id: '001', name: '初学者', desc: '浏览第一幅画作', icon: '🎨', unlocked: true },
  { id: '002', name: '印象派迷', desc: '浏览10幅印象派作品', icon: '🌸', unlocked: true },
  { id: '003', name: '博物馆达人', desc: '探索3个博物馆', icon: '🏛️', unlocked: true },
  { id: '004', name: '艺术鉴赏家', desc: '浏览50幅画作', icon: '👁️', unlocked: false },
  { id: '005', name: '文艺复兴控', desc: '浏览全部文艺复兴作品', icon: '✨', unlocked: false },
  { id: '006', name: '收藏达人', desc: '收藏20幅画作', icon: '❤️', unlocked: false },
]

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

export default function Profile() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [activeSection, setActiveSection] = useState<'favorites' | 'badges'>('favorites')
  const [favorites, setFavorites] = useState<FavoriteArtwork[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    // 首次加载时读取登录信息
    const stored = Taro.getStorageSync('userInfo')
    if (stored && stored.openid) {
      setUserInfo(stored)
    }
  }, [])

  // 每次页面显示时都重新加载收藏列表（包括从详情页返回时）
  useDidShow(() => {
    const stored = Taro.getStorageSync('userInfo')
    if (stored && stored.openid) {
      setUserInfo(stored)
      loadFavorites(stored.openid)
    }
  })

  // 从云数据库加载收藏列表
  const loadFavorites = async (openid: string) => {
    setLoadingFavorites(true)
    try {
      const db = Taro.cloud.database()
      const res = await db.collection('favorites')
        .where({ openid })
        .orderBy('created_at', 'desc')
        .limit(20)
        .get()
      setFavorites(res.data as FavoriteArtwork[])
    } catch (err) {
      console.error('加载收藏失败：', err)
    } finally {
      setLoadingFavorites(false)
    }
  }

  // 微信授权登录（获取头像和昵称）
  const handleGetUserProfile = async () => {
    setLoginLoading(true)
    try {
      const profileRes = await Taro.getUserProfile({
        desc: '用于展示您的个人信息',
      })

      const { nickName, avatarUrl } = profileRes.userInfo

      const stored = Taro.getStorageSync('userInfo')
      if (!stored || !stored.openid) {
        Taro.showToast({ title: '请稍后再试', icon: 'none' })
        return
      }

      const newUserInfo: UserInfo = {
        openid: stored.openid,
        nickname: nickName,
        avatarUrl,
        loginTime: stored.loginTime,
      }
      Taro.setStorageSync('userInfo', newUserInfo)
      setUserInfo(newUserInfo)

      const db = Taro.cloud.database()
      await db.collection('users')
        .where({ openid: stored.openid })
        .update({
          data: {
            nickname: nickName,
            avatar_url: avatarUrl,
            last_login: db.serverDate(),
          }
        })

      Taro.showToast({ title: '登录成功', icon: 'success' })
      loadFavorites(stored.openid)
    } catch (err) {
      console.error('获取用户信息失败：', err)
      Taro.showToast({ title: '取消登录', icon: 'none' })
    } finally {
      setLoginLoading(false)
    }
  }

  const goToArtwork = (artworkId: string) => {
    Taro.navigateTo({ url: `/pages/artwork/index?id=${artworkId}` })
  }

  const handleFeedback = () => {
    Taro.showToast({ title: '感谢您的反馈！', icon: 'success' })
  }

  const isLoggedIn = userInfo && userInfo.openid && userInfo.nickname

  return (
    <View className='profile-page'>

      {/* 用户信息卡片 */}
      <View className='user-card'>
        {isLoggedIn ? (
          <>
            <Image className='avatar' src={userInfo!.avatarUrl} mode='aspectFill' />
            <View className='user-info'>
              <Text className='nickname'>{userInfo!.nickname}</Text>
              <View className='membership-badge'>
                <Text className='membership-text'>免费版</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <View className='avatar-placeholder'>
              <Text className='avatar-placeholder-text'>画</Text>
            </View>
            <View className='user-info'>
              <Text className='nickname'>
                {userInfo && userInfo.openid ? '艺术爱好者' : '未登录'}
              </Text>
              <View className='membership-badge'>
                <Text className='membership-text'>免费版</Text>
              </View>
            </View>
            <Button
              className='login-btn'
              onClick={handleGetUserProfile}
              loading={loginLoading}
            >
              <Text className='login-text'>微信登录</Text>
            </Button>
          </>
        )}
      </View>

      {/* 数据统计 */}
      <View className='stats-row'>
        <View className='stat-item' onClick={() => setActiveSection('favorites')}>
          <Text className='stat-number'>{favorites.length}</Text>
          <Text className='stat-label'>收藏</Text>
        </View>
        <View className='stat-divider' />
        <View className='stat-item'>
          <Text className='stat-number'>0</Text>
          <Text className='stat-label'>已看</Text>
        </View>
        <View className='stat-divider' />
        <View className='stat-item' onClick={() => setActiveSection('badges')}>
          <Text className='stat-number'>3</Text>
          <Text className='stat-label'>徽章</Text>
        </View>
      </View>

      {/* 内容切换标签 */}
      <View className='section-tabs'>
        <View
          className={`section-tab ${activeSection === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveSection('favorites')}
        >
          <Text className='section-tab-text'>我的收藏</Text>
        </View>
        <View
          className={`section-tab ${activeSection === 'badges' ? 'active' : ''}`}
          onClick={() => setActiveSection('badges')}
        >
          <Text className='section-tab-text'>成就徽章</Text>
        </View>
      </View>

      {/* 收藏列表 */}
      {activeSection === 'favorites' && (
        <View className='favorites-section'>
          {loadingFavorites ? (
            <View className='empty-state'>
              <Text className='empty-text'>加载中...</Text>
            </View>
          ) : favorites.length > 0 ? (
            <View className='artwork-grid'>
              {favorites.map(item => (
                <View
                  className='artwork-item'
                  key={item._id}
                  onClick={() => goToArtwork(item.artwork_id)}
                >
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

      {/* 成就徽章 */}
      {activeSection === 'badges' && (
        <View className='badges-section'>
          <View className='badges-grid'>
            {badges.map(badge => (
              <View
                className={`badge-item ${badge.unlocked ? 'unlocked' : 'locked'}`}
                key={badge.id}
              >
                <Text className='badge-icon'>{badge.icon}</Text>
                <Text className='badge-name'>{badge.name}</Text>
                <Text className='badge-desc'>{badge.desc}</Text>
                {!badge.unlocked && <View className='lock-mask'><Text className='lock-icon'>🔒</Text></View>}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 设置菜单 */}
      <View className='settings-section'>
        <Text className='settings-title'>更多</Text>
        <View className='menu-list'>
          <View className='menu-item' onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none' })}>
            <Text className='menu-icon'>⭐</Text>
            <Text className='menu-text'>升级会员</Text>
            <Text className='menu-arrow'>›</Text>
          </View>
          <View className='menu-item' onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none' })}>
            <Text className='menu-icon'>📚</Text>
            <Text className='menu-text'>学习记录</Text>
            <Text className='menu-arrow'>›</Text>
          </View>
          <View className='menu-item' onClick={handleFeedback}>
            <Text className='menu-icon'>💬</Text>
            <Text className='menu-text'>意见反馈</Text>
            <Text className='menu-arrow'>›</Text>
          </View>
          <View className='menu-item' onClick={() => Taro.showToast({ title: '画说 v1.0.0', icon: 'none' })}>
            <Text className='menu-icon'>ℹ️</Text>
            <Text className='menu-text'>关于画说</Text>
            <Text className='menu-arrow'>›</Text>
          </View>
        </View>
      </View>

      <View className='bottom-space' />
    </View>
  )
}
