import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import './app.scss'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    // 初始化云开发环境
    if (Taro.cloud) {
      Taro.cloud.init({
        env: 'cloudbase-d7gl3kh5vf6b71edc',
        traceUser: true,
      })
      console.log('云开发环境初始化成功')
    }
  })

  return children
}

export default App