import { View, Text, ScrollView } from '@tarojs/components'
import './index.scss'

export default function Privacy() {
  return (
    <ScrollView scrollY className='privacy-page'>
      <View className='section'>
        <Text className='title'>隐私政策</Text>
        <Text className='date'>更新日期：2026年5月1日</Text>
      </View>
      <View className='section'>
        <Text className='heading'>一、我们收集的信息</Text>
        <Text className='content'>我们仅收集以下必要信息以提供服务：{'\n'}1. 微信昵称和头像（经您授权后获取）{'\n'}2. 您的收藏记录和浏览历史（存储于您的账号下）</Text>
      </View>
      <View className='section'>
        <Text className='heading'>二、信息的使用</Text>
        <Text className='content'>我们收集的信息仅用于：{'\n'}1. 为您提供个性化的艺术作品推荐{'\n'}2. 保存您的收藏和浏览记录{'\n'}3. 改善我们的服务质量</Text>
      </View>
      <View className='section'>
        <Text className='heading'>三、信息的存储与保护</Text>
        <Text className='content'>您的信息存储在腾讯云服务器中，我们采取合理的安全措施保护您的个人信息，不会向第三方出售或共享您的个人信息。</Text>
      </View>
      <View className='section'>
        <Text className='heading'>四、您的权利</Text>
        <Text className='content'>您有权随时：{'\n'}1. 查看和修改您的个人信息{'\n'}2. 删除您的收藏和浏览记录{'\n'}3. 注销您的账号</Text>
      </View>
      <View className='section'>
        <Text className='heading'>五、联系我们</Text>
        <Text className='content'>如您对本隐私政策有任何疑问，请通过小程序内的反馈功能联系我们。</Text>
      </View>
    </ScrollView>
  )
}
