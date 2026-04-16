import { View, Text, Image, ScrollView } from '@tarojs/components'
import { useState } from 'react'
import './index.scss'

// 模拟数据（后续替换为真实API）
const museums = [
  {
    id: '001',
    name: '卢浮宫',
    nameEn: 'Louvre Museum',
    city: '巴黎，法国',
    count: 50,
    image: 'https://images.metmuseum.org/CRDImages/ep/original/DT1567.jpg',
  },
  {
    id: '002',
    name: '大英博物馆',
    nameEn: 'British Museum',
    city: '伦敦，英国',
    count: 40,
    image: 'https://images.metmuseum.org/CRDImages/ep/original/DT1947.jpg',
  },
  {
    id: '003',
    name: '故宫博物院',
    nameEn: 'The Palace Museum',
    city: '北京，中国',
    count: 35,
    image: 'https://images.metmuseum.org/CRDImages/ep/original/DP251139.jpg',
  },
  {
    id: '004',
    name: '大都会艺术博物馆',
    nameEn: 'The Metropolitan Museum',
    city: '纽约，美国',
    count: 60,
    image: 'https://images.metmuseum.org/CRDImages/ep/original/DT1502_cropped.jpg',
  },
]

const artists = [
  { id: '001', name: '列奥纳多·达芬奇', period: '文艺复兴', years: '1452-1519', count: 12, image: 'https://images.metmuseum.org/CRDImages/ep/original/DP-13139-001.jpg' },
  { id: '002', name: '文森特·梵高', period: '后印象派', years: '1853-1890', count: 20, image: 'https://images.metmuseum.org/CRDImages/ep/original/DT1502_cropped.jpg' },
  { id: '003', name: '克劳德·莫奈', period: '印象派', years: '1840-1926', count: 18, image: 'https://images.metmuseum.org/CRDImages/ep/original/DT1947.jpg' },
  { id: '004', name: '约翰内斯·维米尔', period: '荷兰黄金时代', years: '1632-1675', count: 8, image: 'https://images.metmuseum.org/CRDImages/ep/original/DP251139.jpg' },
  { id: '005', name: '米开朗基罗', period: '文艺复兴', years: '1475-1564', count: 10, image: 'https://images.metmuseum.org/CRDImages/ep/original/DT1567.jpg' },
  { id: '006', name: '拉斐尔', period: '文艺复兴', years: '1483-1520', count: 9, image: 'https://images.metmuseum.org/CRDImages/ep/original/DP-13139-001.jpg' },
]

export default function Explore() {
  const [activeTab, setActiveTab] = useState<'museum' | 'artist'>('museum')

  return (
    <View className='explore'>

      {/* 顶部搜索框 */}
      <View className='search-bar'>
        <Text className='search-icon'>🔍</Text>
        <Text className='search-placeholder'>搜索博物馆、艺术家...</Text>
      </View>

      {/* 切换标签 */}
      <View className='tabs'>
        <View
          className={`tab-item ${activeTab === 'museum' ? 'active' : ''}`}
          onClick={() => setActiveTab('museum')}
        >
          <Text className='tab-text'>博物馆</Text>
        </View>
        <View
          className={`tab-item ${activeTab === 'artist' ? 'active' : ''}`}
          onClick={() => setActiveTab('artist')}
        >
          <Text className='tab-text'>艺术家</Text>
        </View>
      </View>

      {/* 博物馆列表 */}
      {activeTab === 'museum' && (
        <ScrollView scrollY={true} className='list-container'>
          {museums.map(museum => (
            <View className='museum-item' key={museum.id}>
              <Image
                className='museum-image'
                src={museum.image}
                mode='aspectFill'
              />
              <View className='museum-info'>
                <Text className='museum-name'>{museum.name}</Text>
                <Text className='museum-name-en'>{museum.nameEn}</Text>
                <Text className='museum-city'>📍 {museum.city}</Text>
                <Text className='museum-count'>已收录 {museum.count} 幅画作</Text>
              </View>
              <Text className='arrow'>›</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* 艺术家列表 */}
      {activeTab === 'artist' && (
        <ScrollView scrollY={true} className='list-container'>
          <View className='artist-grid'>
            {artists.map(artist => (
              <View className='artist-item' key={artist.id}>
                <Image
                  className='artist-avatar'
                  src={artist.image}
                  mode='aspectFill'
                />
                <View className='artist-info'>
                  <Text className='artist-name'>{artist.name}</Text>
                  <Text className='artist-period'>{artist.period}</Text>
                  <Text className='artist-years'>{artist.years}</Text>
                  <Text className='artist-count'>{artist.count} 幅作品</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

    </View>
  )
}