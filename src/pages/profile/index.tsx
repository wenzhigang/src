import { View, Text, Image } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

// 模拟用户数据
const mockUser = {
  nickname: '艺术爱好者',
  avatar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/200px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
  membership: 'free',
  stats: {
    favorites: 12,
    viewed: 38,
    badges: 3,
  }
}

// 成就徽章数据
const badges = [
  { id: '001', name: '初学者', desc: '浏览第一幅画作', icon: '🎨', unlocked: true },
  { id: '002', name: '印象派迷', desc: '浏览10幅印象派作品', icon: '🌸', unlocked: true },
  { id: '003', name: '博物馆达人', desc: '探索3个博物馆', icon: '🏛️', unlocked: true },
  { id: '004', name: '艺术鉴赏家', desc: '浏览50幅画作', icon: '👁️', unlocked: false },
  { id: '005', name: '文艺复兴控', desc: '浏览全部文艺复兴作品', icon: '✨', unlocked: false },
  { id: '006', name: '收藏达人', desc: '收藏20幅画作', icon: '❤️', unlocked: false },
]

// 收藏的画作（模拟数据）
const favoritedArtworks = [
  { id: '001', title: '星夜', artist: '梵高', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/200px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg' },
  { id: '002', title: '蒙娜丽莎', artist: '达芬奇', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/200px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg' },
  { id: '003', title: '睡莲', artist: '莫奈', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg/200px-Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg' },
]

export default function Profile() {
  const [activeSection, setActiveSection] = useState<'favorites' | 'badges'>('favorites')

  const handleLogin = () => {
    Taro.showToast({ title: '微信登录功能开发中', icon: 'none' })
  }

  const goToArtwork = (id: string) => {
    Taro.navigateTo({ url: `/pages/artwork/index?id=${id}` })
  }

  const handleFeedback = () => {
    Taro.showToast({ title: '感谢您的反馈！', icon: 'success' })
  }

  return (
    <View className='profile-page'>

      {/* 用户信息卡片 */}
      <View className='user-card'>
        <Image className='avatar' src={mockUser.avatar} mode='aspectFill' />
        <View className='user-info'>
          <Text className='nickname'>{mockUser.nickname}</Text>
          <View className='membership-badge'>
            <Text className='membership-text'>免费版</Text>
          </View>
        </View>
        <View className='login-btn' onClick={handleLogin}>
          <Text className='login-text'>微信登录</Text>
        </View>
      </View>

      {/* 数据统计 */}
      <View className='stats-row'>
        <View className='stat-item' onClick={() => setActiveSection('favorites')}>
          <Text className='stat-number'>{mockUser.stats.favorites}</Text>
          <Text className='stat-label'>收藏</Text>
        </View>
        <View className='stat-divider' />
        <View className='stat-item'>
          <Text className='stat-number'>{mockUser.stats.viewed}</Text>
          <Text className='stat-label'>已看</Text>
        </View>
        <View className='stat-divider' />
        <View className='stat-item' onClick={() => setActiveSection('badges')}>
          <Text className='stat-number'>{mockUser.stats.badges}</Text>
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
          {favoritedArtworks.length > 0 ? (
            <View className='artwork-grid'>
              {favoritedArtworks.map(artwork => (
                <View
                  className='artwork-item'
                  key={artwork.id}
                  onClick={() => goToArtwork(artwork.id)}
                >
                  <Image className='artwork-img' src={artwork.image} mode='aspectFill' />
                  <View className='artwork-info'>
                    <Text className='artwork-title'>{artwork.title}</Text>
                    <Text className='artwork-artist'>{artwork.artist}</Text>
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