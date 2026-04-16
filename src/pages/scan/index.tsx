import { View, Text, Image } from '@tarojs/components'
import { useState } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

type ScanState = 'idle' | 'scanning' | 'success' | 'notfound' | 'ai'

export default function Scan() {
  const [state, setState] = useState<ScanState>('idle')
  const [scannedImage, setScannedImage] = useState<string>('')
  const [result, setResult] = useState<any>(null)

  // 模拟识别结果（后续接入真实API）
  const mockResult = {
    id: '001',
    title: '星夜',
    artist: '文森特·梵高',
    year: '1889年',
    confidence: 98,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/400px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
  }

  // 拍照
  const handleCamera = () => {
    Taro.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath
        setScannedImage(path)
        startRecognition(path)
      },
      fail: () => {
        Taro.showToast({ title: '拍照失败，请重试', icon: 'none' })
      }
    })
  }

  // 从相册选择
  const handleAlbum = () => {
    Taro.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath
        setScannedImage(path)
        startRecognition(path)
      },
      fail: () => {
        Taro.showToast({ title: '选择失败，请重试', icon: 'none' })
      }
    })
  }

  // 模拟识别过程
  const startRecognition = (path: string) => {
    setState('scanning')
    // 模拟2秒识别过程（后续替换为真实API调用）
    setTimeout(() => {
      // 模拟识别成功（随机模拟不同结果用于测试）
      const random = Math.random()
      if (random > 0.3) {
        setState('success')
        setResult(mockResult)
      } else {
        // 数据库未找到，调用AI
        setState('ai')
        setResult({
          title: '未知画作',
          artist: '未知艺术家',
          description: '根据AI分析，这幅画作具有明显的印象派风格特征，画面中大量使用短促的笔触和明亮的色彩，构图自由活泼。由于数据库暂未收录此作品，以上内容由AI生成，仅供参考。',
          isAI: true,
        })
      }
    }, 2000)
  }

  // 跳转到画作详情
  const goToDetail = () => {
    if (result?.id) {
      Taro.navigateTo({ url: `/pages/artwork/index?id=${result.id}` })
    }
  }

  // 重新识别
  const resetScan = () => {
    setState('idle')
    setScannedImage('')
    setResult(null)
  }

  return (
    <View className='scan-page'>

      {/* 待扫描状态 */}
      {state === 'idle' && (
        <View className='idle-container'>
          {/* 扫描框 */}
          <View className='scan-frame-area'>
            <View className='scan-frame'>
              <View className='corner top-left' />
              <View className='corner top-right' />
              <View className='corner bottom-left' />
              <View className='corner bottom-right' />
              <View className='scan-line' />
            </View>
            <Text className='scan-hint'>将画作置于框内拍摄</Text>
          </View>

          {/* 操作按钮 */}
          <View className='action-area'>
            <View className='camera-btn' onClick={handleCamera}>
              <Text className='camera-icon'>📷</Text>
              <Text className='camera-text'>拍照识别</Text>
            </View>
            <View className='album-btn' onClick={handleAlbum}>
              <Text className='album-text'>从相册选择</Text>
            </View>
          </View>

          {/* 使用说明 */}
          <View className='tips-area'>
            <Text className='tips-title'>使用小贴士</Text>
            <Text className='tips-item'>📌 确保画作清晰可见，光线充足</Text>
            <Text className='tips-item'>📌 正面拍摄，避免角度偏斜</Text>
            <Text className='tips-item'>📌 未收录画作将由AI智能解答</Text>
          </View>
        </View>
      )}

      {/* 识别中状态 */}
      {state === 'scanning' && (
        <View className='scanning-container'>
          {scannedImage && (
            <Image className='scanned-image' src={scannedImage} mode='aspectFit' />
          )}
          <View className='scanning-overlay'>
            <View className='scanning-spinner' />
            <Text className='scanning-text'>正在识别画作...</Text>
            <Text className='scanning-sub'>请稍候</Text>
          </View>
        </View>
      )}

      {/* 识别成功状态 */}
      {state === 'success' && result && (
        <View className='result-container'>
          <View className='result-header'>
            <Text className='result-badge success'>✓ 识别成功</Text>
            <Text className='confidence'>匹配度 {result.confidence}%</Text>
          </View>

          <Image className='result-image' src={result.image} mode='aspectFit' />

          <View className='result-info'>
            <Text className='result-title'>{result.title}</Text>
            <Text className='result-artist'>{result.artist} · {result.year}</Text>
          </View>

          <View className='result-actions'>
            <View className='btn-primary' onClick={goToDetail}>
              <Text className='btn-text'>查看完整讲解</Text>
            </View>
            <View className='btn-secondary' onClick={resetScan}>
              <Text className='btn-text-sec'>重新识别</Text>
            </View>
          </View>
        </View>
      )}

      {/* AI生成结果状态 */}
      {state === 'ai' && result && (
        <View className='result-container'>
          <View className='result-header'>
            <Text className='result-badge ai'>⚡ AI智能解答</Text>
            <Text className='ai-note'>数据库暂未收录此作品</Text>
          </View>

          {scannedImage && (
            <Image className='result-image' src={scannedImage} mode='aspectFit' />
          )}

          <View className='ai-result-info'>
            <Text className='ai-disclaimer'>以下内容由AI生成，仅供参考</Text>
            <Text className='ai-description'>{result.description}</Text>
          </View>

          <View className='result-actions'>
            <View className='btn-primary' onClick={resetScan}>
              <Text className='btn-text'>重新识别</Text>
            </View>
            <View className='btn-secondary' onClick={() => Taro.switchTab({ url: '/pages/explore/index' })}>
              <Text className='btn-text-sec'>浏览已收录画作</Text>
            </View>
          </View>
        </View>
      )}

    </View>
  )
}