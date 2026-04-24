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

    // 自动执行微信静默登录
    autoLogin()
  })

  return children
}

// 微信静默登录（不需要用户授权，只获取openid）
const autoLogin = async () => {
  try {
    // 检查本地是否已有登录信息，且未过期（7天内）
    const userInfo = Taro.getStorageSync('userInfo')
    if (userInfo && userInfo.openid && userInfo.role) {
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      if (Date.now() - userInfo.loginTime < sevenDays) {
        console.log('已有有效登录信息，openid：', userInfo.openid)
        return
      }
    }

    // 调用云函数获取 openid
    const res = await Taro.cloud.callFunction({
      name: 'login',
    })

    const { openid } = res.result as any

    if (openid) {
      // 保存到本地存储
      Taro.setStorageSync('userInfo', {
        openid,
        loginTime: Date.now(),
      })

      // 写入云数据库 users 集合：用 where + get 判断是否存在，存在则更新，不存在则新建
      const db = Taro.cloud.database()
      const existRes = await db.collection('users')
        .where({ openid })
        .get()

      if (existRes.data.length > 0) {
        // 已存在，更新最后登录时间，同时读取 role
        await db.collection('users').where({ openid }).update({
          data: { last_login: db.serverDate() }
        })
        const role = existRes.data[0].role || 'user'
        const stored2 = Taro.getStorageSync('userInfo') || {}
        Taro.setStorageSync('userInfo', { ...stored2, openid, role })
        console.log('用户已存在，role：', role)
      } else {
        // 不存在，新建用户记录
        await db.collection('users').add({
          data: {
            openid,
            nickname: '',
            avatar_url: '',
            role: 'user',
            created_at: db.serverDate(),
            last_login: db.serverDate(),
          }
        })
        const stored2 = Taro.getStorageSync('userInfo') || {}
        Taro.setStorageSync('userInfo', { ...stored2, openid, role: 'user' })
        console.log('新用户创建成功，openid：', openid)
      }
    }
  } catch (err) {
    console.log('自动登录失败（不影响使用）：', err)
  }
}

export default App
