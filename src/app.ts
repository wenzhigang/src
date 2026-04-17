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

    // 自动执行微信登录
    autoLogin()
  })

  return children
}

// 微信静默登录（不需要用户授权，只获取openid）
const autoLogin = async () => {
  try {
    // 检查本地是否已有登录信息
    const userInfo = Taro.getStorageSync('userInfo')
    if (userInfo) {
      console.log('已登录：', userInfo.openid)
      return
    }

    // 调用云函数获取openid
    const res = await Taro.cloud.callFunction({
      name: 'login',
    })

    const { openid } = res.result as any

    if (openid) {
      // 保存到本地存储
      Taro.setStorageSync('userInfo', { openid, loginTime: Date.now() })

      // 写入云数据库 users 集合
      const db = Taro.cloud.database()
      await db.collection('users').add({
        data: {
          openid,
          created_at: db.serverDate(),
          last_login: db.serverDate(),
        }
      })
      console.log('登录成功，openid：', openid)
    }
  } catch (err) {
    console.log('自动登录失败（不影响使用）：', err)
  }
}

export default App