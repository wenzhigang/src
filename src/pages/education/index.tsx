import { View, Text, Image } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

// 课程包数据
const courses = [
  {
    id: '001',
    title: '文艺复兴入门',
    desc: '从达芬奇到米开朗基罗，探索文艺复兴的艺术世界',
    count: 12,
    level: '入门',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/200px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
    tag: '热门',
  },
  {
    id: '002',
    title: '印象派的光与色',
    desc: '跟随莫奈和雷诺阿，感受印象派捕捉光影的独特魅力',
    count: 10,
    level: '进阶',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg/200px-Claude_Monet_-_Water_Lilies_-_1906%2C_Ryerson.jpg',
    tag: '新课',
  },
  {
    id: '003',
    title: '梵高的内心世界',
    desc: '深入了解梵高充满情感张力的艺术创作与人生故事',
    count: 8,
    level: '入门',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/200px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
    tag: '',
  },
  {
    id: '004',
    title: '中国古代绘画精粹',
    desc: '从故宫珍藏出发，领略中国传统绘画的意境之美',
    count: 15,
    level: '入门',
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Meisje_met_de_parel.jpg/200px-Meisje_met_de_parel.jpg',
    tag: '',
  },
]

// 互动测验数据
const quizzes = [
  { id: '001', title: '看图猜艺术家', desc: '根据画作风格猜测是哪位艺术家', icon: '🎨', count: 10 },
  { id: '002', title: '画作年代排序', desc: '将画作按照创作年代正确排序', icon: '📅', count: 8 },
  { id: '003', title: '风格配对挑战', desc: '将画作与对应的艺术流派配对', icon: '🔗', count: 12 },
  { id: '004', title: '真假名画辨别', desc: '在相似图片中找出真正的名画', icon: '🔍', count: 6 },
]

export default function Education() {
  const [activeTab, setActiveTab] = useState<'courses' | 'quiz'>('courses')

  const handleCourse = (id: string) => {
    Taro.showToast({ title: '课程功能即将上线', icon: 'none', duration: 1500 })
  }

  const handleQuiz = (id: string) => {
    Taro.showToast({ title: '测验功能即将上线', icon: 'none', duration: 1500 })
  }

  const handleInstitution = () => {
    Taro.showToast({ title: '机构合作请联系我们', icon: 'none', duration: 1500 })
  }

  return (
    <View className='education-page'>

      {/* 顶部Banner */}
      <View className='banner'>
        <View className='banner-content'>
          <Text className='banner-title'>艺术教育</Text>
          <Text className='banner-sub'>专为学校与机构设计的艺术课程</Text>
        </View>
        <Text className='banner-icon'>🎓</Text>
      </View>

      {/* 机构入口 */}
      <View className='institution-card' onClick={handleInstitution}>
        <Text className='institution-icon'>🏫</Text>
        <View className='institution-info'>
          <Text className='institution-title'>学校 / 机构专属版</Text>
          <Text className='institution-desc'>批量授权 · 课程定制 · 学习报告</Text>
        </View>
        <Text className='institution-arrow'>›</Text>
      </View>

      {/* 切换标签 */}
      <View className='tabs'>
        <View
          className={`tab-item ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          <Text className='tab-text'>课程包</Text>
        </View>
        <View
          className={`tab-item ${activeTab === 'quiz' ? 'active' : ''}`}
          onClick={() => setActiveTab('quiz')}
        >
          <Text className='tab-text'>互动测验</Text>
        </View>
      </View>

      {/* 课程包列表 */}
      {activeTab === 'courses' && (
        <View className='courses-list'>
          {courses.map(course => (
            <View className='course-card' key={course.id} onClick={() => handleCourse(course.id)}>
              <Image className='course-image' src={course.image} mode='aspectFill' />
              <View className='course-info'>
                <View className='course-header'>
                  <Text className='course-title'>{course.title}</Text>
                  {course.tag !== '' && (
                    <Text className='course-tag'>{course.tag}</Text>
                  )}
                </View>
                <Text className='course-desc'>{course.desc}</Text>
                <View className='course-meta'>
                  <Text className='course-level'>{course.level}</Text>
                  <Text className='course-count'>{course.count} 幅画作</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 互动测验列表 */}
      {activeTab === 'quiz' && (
        <View className='quiz-list'>
          {quizzes.map(quiz => (
            <View className='quiz-card' key={quiz.id} onClick={() => handleQuiz(quiz.id)}>
              <Text className='quiz-icon'>{quiz.icon}</Text>
              <View className='quiz-info'>
                <Text className='quiz-title'>{quiz.title}</Text>
                <Text className='quiz-desc'>{quiz.desc}</Text>
                <Text className='quiz-count'>{quiz.count} 题</Text>
              </View>
              <View className='quiz-start'>
                <Text className='quiz-start-text'>开始</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View className='bottom-space' />
    </View>
  )
}