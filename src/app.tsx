import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import './app.scss'
import { FontScaleContext, getSavedScale } from './utils/fontScale'

// 全局字体缩放 Context

function App({ children }: PropsWithChildren<any>) {
  const savedScale = getSavedScale()
  const [scale, setScaleState] = useState(savedScale)

  const setScale = (s: number) => {
    setScaleState(s)
    Taro.setStorageSync('fontScale', String(s))
  }

  useLaunch(() => {
    if (Taro.cloud) {
      Taro.cloud.init({ env: 'cloudbase-d7gl3kh5vf6b71edc', traceUser: true })
      console.log('云开发环境初始化成功')
    }
    autoLogin()
  })

  return (
    <FontScaleContext.Provider value={{ scale, setScale }}>
      {children}
    </FontScaleContext.Provider>
  )
}

const autoLogin = async () => {
  try {
    const userInfo = Taro.getStorageSync('userInfo')
    if (userInfo && userInfo.openid && userInfo.role) {
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      if (Date.now() - userInfo.loginTime < sevenDays) {
        console.log('已有有效登录信息，openid：', userInfo.openid)
        return
      }
    }
    const res = await Taro.cloud.callFunction({ name: 'login' })
    const { openid } = res.result as any
    if (openid) {
      Taro.setStorageSync('userInfo', { openid, loginTime: Date.now() })
      const db = Taro.cloud.database()
      const existRes = await db.collection('users').where({ openid }).get()
      if (existRes.data.length > 0) {
        await db.collection('users').where({ openid }).update({ data: { last_login: db.serverDate() } })
        const role = existRes.data[0].role || 'user'
        const stored2 = Taro.getStorageSync('userInfo') || {}
        Taro.setStorageSync('userInfo', { ...stored2, openid, role })
      } else {
        await db.collection('users').add({
          data: { openid, nickname: '', avatar_url: '', role: 'user', created_at: db.serverDate(), last_login: db.serverDate() }
        })
        const stored2 = Taro.getStorageSync('userInfo') || {}
        Taro.setStorageSync('userInfo', { ...stored2, openid, role: 'user' })
      }
    }
  } catch (err) {
    console.log('自动登录失败（不影响使用）：', err)
  }
}

export default App
