import { createContext, useContext } from 'react'
import Taro from '@tarojs/taro'

export const FontScaleContext = createContext({
  scale: 1.0,
  setScale: (_s: number) => {}
})

export const useFontScale = () => useContext(FontScaleContext)

export const getSavedScale = (): number => {
  try {
    const v = Taro.getStorageSync('fontScale')
    return v ? parseFloat(v) : 1.0
  } catch { return 1.0 }
}
