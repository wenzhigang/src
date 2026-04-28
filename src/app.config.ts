export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/explore/index',
    'pages/admin/index',
    'pages/profile/index',
    'pages/artwork/index',
    'pages/artist/index',
    'pages/museum/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1A3C34',
    navigationBarTitleText: '画说',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F8F5F0',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#1A3C34',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/index/index', text: '首页' },
      { pagePath: 'pages/explore/index', text: '探索' },
      { pagePath: 'pages/profile/index', text: '我的' },
    ],
  },
})
