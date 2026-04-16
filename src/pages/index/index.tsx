import { View, Text, Image, ScrollView } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import './index.scss'

// 使用 Wikimedia 稳定图片直链（公共领域，免费）
const featuredArtwork = {
  id: '001',
  title: '星夜',
  artist: '文森特·梵高',
  museum: '纽约现代艺术博物馆',
  image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/600px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
}

const artists = [
  { id: '001', name: '梵高', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_%28454045%29.jpg/200px-Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_%28454045%29.jpg' },
  { id: '002', name: '达芬奇', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/200px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg' },
  { id: '003', name: '莫奈', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg/200px-Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg' },
  { id: '004', name: '维米尔', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Meisje_met_de_parel.jpg/200px-Meisje_met_de_parel.jpg' },
]

const museums = [
  { id: '001', name: '卢浮宫', city: '巴黎', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Louvre_Museum_Wikimedia_Commons.jpg/400px-Louvre_Museum_Wikimedia_Commons.jpg' },
  { id: '002', name: '大英博物馆', city: '伦敦', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/British_Museum_from_NE_2.JPG/400px-British_Museum_from_NE_2.JPG' },
  { id: '003', name: '故宫博物院', city: '北京', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Beijing_China_Forbidden-City-01.jpg/400px-Beijing_China_Forbidden-City-01.jpg' },
]

const recentArtworks = [
  { id: '002', title: '蒙娜丽莎', artist: '达芬奇', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/300px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg' },
  { id: '003', title: '睡莲', artist: '莫奈', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg/300px-Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg' },
  { id: '004', title: '戴珍珠耳环的少女', artist: '维米尔', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Meisje_met_de_parel.jpg/300px-Meisje_met_de_parel.jpg' },
  { id: '005', title: '星夜', artist: '梵高', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/300px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg' },
]

const goToArtwork = (id: string) => {
  Taro.navigateTo({ url: `/pages/artwork/index?id=${id}` })
}

const goToArtist = (id: string) => {
  Taro.showToast({ title: '艺术家页面开发中', icon: 'none' })
}

const goToMuseum = (id: string) => {
  Taro.showToast({ title: '博物馆页面开发中', icon: 'none' })
}

export default function Index() {
  useLoad(() => {
    console.log('首页加载完成')
  })

  return (
    <ScrollView className='home' scrollY={true}>

      {/* 顶部导航 */}
      <View className='header'>
        <Text className='header-logo'>画说</Text>
        <View className='header-search'>
          <Text className='search-icon'>🔍</Text>
          <Text className='search-placeholder'>搜索画作、艺术家...</Text>
        </View>
      </View>

      {/* 今日推荐 */}
      <View className='section'>
        <View className='section-title-row'>
          <Text className='section-title'>今日推荐</Text>
        </View>
        <View className='featured-card' onClick={() => goToArtwork(featuredArtwork.id)}>
          <Image className='featured-image' src={featuredArtwork.image} mode='aspectFill' />
          <View className='featured-overlay'>
            <Text className='featured-title'>{featuredArtwork.title}</Text>
            <Text className='featured-artist'>{featuredArtwork.artist} · {featuredArtwork.museum}</Text>
          </View>
        </View>
      </View>

      {/* 热门艺术家 */}
      <View className='section'>
        <View className='section-title-row'>
          <Text className='section-title'>热门艺术家</Text>
          <Text className='section-more'>查看全部</Text>
        </View>
        <ScrollView className='artist-scroll' scrollX={true}>
          {artists.map(artist => (
            <View className='artist-item' key={artist.id} onClick={() => goToArtist(artist.id)}>
              <Image className='artist-avatar' src={artist.image} mode='aspectFill' />
              <Text className='artist-name'>{artist.name}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 博物馆 */}
      <View className='section'>
        <View className='section-title-row'>
          <Text className='section-title'>博物馆</Text>
          <Text className='section-more'>查看全部</Text>
        </View>
        <ScrollView className='museum-scroll' scrollX={true}>
          {museums.map(museum => (
            <View className='museum-card' key={museum.id} onClick={() => goToMuseum(museum.id)}>
              <Image className='museum-image' src={museum.image} mode='aspectFill' />
              <View className='museum-overlay'>
                <Text className='museum-name'>{museum.name}</Text>
                <Text className='museum-city'>{museum.city}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 最新收录 */}
      <View className='section'>
        <View className='section-title-row'>
          <Text className='section-title'>最新收录</Text>
          <Text className='section-more'>查看全部</Text>
        </View>
        <View className='artwork-grid'>
          {recentArtworks.map(artwork => (
            <View className='artwork-card' key={artwork.id} onClick={() => goToArtwork(artwork.id)}>
              <Image className='artwork-image' src={artwork.image} mode='aspectFill' />
              <View className='artwork-info'>
                <Text className='artwork-title'>{artwork.title}</Text>
                <Text className='artwork-artist'>{artwork.artist}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className='bottom-space' />

    </ScrollView>
  )
}