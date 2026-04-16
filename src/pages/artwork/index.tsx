import { View, Text, Image, ScrollView } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

// 模拟画作数据（后续从API获取）
const artworkData = {
  id: '001',
  title: '星夜',
  titleEn: 'The Starry Night',
  artist: '文森特·梵高',
  artistId: '002',
  year: '1889年',
  style: '后印象派',
  medium: '油画',
  size: '73.7 × 92.1 cm',
  museum: '纽约现代艺术博物馆',
  image: 'https://images.metmuseum.org/CRDImages/ep/original/DT1567.jpg',
  isAIGenerated: false,
  description: `1889年6月，梵高在法国圣雷米的精神病院中创作了这幅传世之作。那时的他，透过病房的铁窗凝望着夜空，将内心的狂喜与痛苦一并倾注在画布上。

画面中，巨大的旋涡状星云主宰着整个天空，仿佛宇宙在剧烈地呼吸与律动。11颗星星和一轮明月散发出耀眼的光晕，让人感受到强烈的情感张力。左侧那棵直冲云霄的柏树，如同一道连接天地的火焰，既象征着死亡，也暗示着对永恒的渴望。

远处宁静的村庄与动荡的天空形成鲜明对比，这正是梵高内心世界的写照——在混乱与不安中，寻找那一份难以触及的平静。

有趣的是，梵高在写给弟弟提奥的信中曾说，他在夜晚感受到比白天更强烈的生命力。这幅画，正是那些不眠之夜里，他与宇宙对话的珍贵记录。`,
  tags: ['后印象派', '油画', '风景', '夜景'],
  annotations: [
    { x: 15, y: 20, title: '旋涡星云', desc: '梵高用夸张的旋涡笔触表现星云，充满动感与能量' },
    { x: 75, y: 15, title: '月亮', desc: '明亮的月亮散发出强烈光晕，是画面的视觉焦点之一' },
    { x: 10, y: 45, title: '柏树', desc: '高耸的柏树直冲天际，在梵高画中常象征死亡与永恒' },
    { x: 55, y: 75, title: '村庄', desc: '宁静的村庄与动荡天空形成强烈对比' },
  ],
}

export default function ArtworkDetail() {
  const [isFavorited, setIsFavorited] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeAnnotation, setActiveAnnotation] = useState<number | null>(null)
  const [showFullDesc, setShowFullDesc] = useState(false)

  // 收藏切换
  const toggleFavorite = () => {
    setIsFavorited(!isFavorited)
    Taro.showToast({
      title: isFavorited ? '已取消收藏' : '收藏成功',
      icon: 'success',
      duration: 1500,
    })
  }

  // 语音播放切换（模拟）
  const toggleAudio = () => {
    setIsPlaying(!isPlaying)
    if (!isPlaying) {
      Taro.showToast({ title: '开始播放讲解', icon: 'none', duration: 1500 })
    }
  }

  // 点击标注
  const handleAnnotation = (index: number) => {
    setActiveAnnotation(activeAnnotation === index ? null : index)
  }

  return (
    <View className='artwork-detail'>
      <ScrollView scrollY={true} className='scroll-container'>

        {/* 画作图片区域 */}
        <View className='image-container'>
          <Image
            className='artwork-image'
            src={artworkData.image}
            mode='aspectFit'
          />

          {/* 画作细节标注点 */}
          {artworkData.annotations.map((ann, index) => (
            <View
              key={index}
              className={`annotation-dot ${activeAnnotation === index ? 'active' : ''}`}
              style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
              onClick={() => handleAnnotation(index)}
            >
              <Text className='dot-text'>+</Text>
            </View>
          ))}

          {/* 标注弹窗 */}
          {activeAnnotation !== null && (
            <View className='annotation-popup'>
              <Text className='popup-title'>{artworkData.annotations[activeAnnotation].title}</Text>
              <Text className='popup-desc'>{artworkData.annotations[activeAnnotation].desc}</Text>
            </View>
          )}
        </View>

        {/* 画作基本信息 */}
        <View className='info-section'>

          {/* AI生成标识 */}
          {artworkData.isAIGenerated && (
            <View className='ai-badge'>
              <Text className='ai-text'>⚡ AI生成内容，仅供参考</Text>
            </View>
          )}

          {/* 标题 */}
          <Text className='artwork-title'>{artworkData.title}</Text>
          <Text className='artwork-title-en'>{artworkData.titleEn}</Text>

          {/* 基本信息行 */}
          <View className='meta-row'>
            <View className='meta-item'>
              <Text className='meta-label'>艺术家</Text>
              <Text className='meta-value artist-link'>{artworkData.artist}</Text>
            </View>
            <View className='meta-item'>
              <Text className='meta-label'>年代</Text>
              <Text className='meta-value'>{artworkData.year}</Text>
            </View>
          </View>
          <View className='meta-row'>
            <View className='meta-item'>
              <Text className='meta-label'>风格</Text>
              <Text className='meta-value'>{artworkData.style}</Text>
            </View>
            <View className='meta-item'>
              <Text className='meta-label'>媒介</Text>
              <Text className='meta-value'>{artworkData.medium}</Text>
            </View>
          </View>
          <View className='meta-row'>
            <View className='meta-item full-width'>
              <Text className='meta-label'>收藏于</Text>
              <Text className='meta-value'>{artworkData.museum}</Text>
            </View>
          </View>

          {/* 标签 */}
          <View className='tags-row'>
            {artworkData.tags.map(tag => (
              <Text key={tag} className='tag'>{tag}</Text>
            ))}
          </View>

          {/* 讲解内容 */}
          <View className='description-section'>
            <Text className='section-title'>📖 画作故事</Text>
            <Text className='description'>
              {showFullDesc
                ? artworkData.description
                : artworkData.description.slice(0, 120) + '...'}
            </Text>
            <Text
              className='read-more'
              onClick={() => setShowFullDesc(!showFullDesc)}
            >
              {showFullDesc ? '收起' : '阅读全文'}
            </Text>
          </View>

          {/* 前往艺术家页面 */}
          <View className='artist-link-row'>
            <Text className='artist-link-text'>了解更多关于 {artworkData.artist} →</Text>
          </View>

        </View>

        {/* 底部留白（为播放器留空间） */}
        <View className='bottom-space' />

      </ScrollView>

      {/* 顶部操作栏（收藏按钮） */}
      <View className='top-actions'>
        <View className='favorite-btn' onClick={toggleFavorite}>
          <Text className='favorite-icon'>{isFavorited ? '❤️' : '🤍'}</Text>
        </View>
      </View>

      {/* 底部语音播放器 */}
      <View className='audio-player'>
        <Text className='audio-icon'>🎵</Text>
        <View className='progress-bar'>
          <View className='progress-fill' style={{ width: isPlaying ? '45%' : '0%' }} />
        </View>
        <Text className='audio-time'>{isPlaying ? '1:23 / 3:05' : '0:00 / 3:05'}</Text>
        <View className='play-btn' onClick={toggleAudio}>
          <Text className='play-icon'>{isPlaying ? '⏸' : '▶'}</Text>
        </View>
      </View>

    </View>
  )
}