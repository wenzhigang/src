export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/explore/index',
    'pages/admin/index',
    'pages/profile/index',
    'pages/artwork/index',
    'pages/artist/index',
    'pages/museum/index',
    'pages/privacy/index',
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
      { pagePath: 'pages/index/index', text: '首页', iconPath: 'assets/images/tabbar/home_normal.png', selectedIconPath: 'assets/images/tabbar/home_active.png' },
      { pagePath: 'pages/explore/index', text: '探索', iconPath: 'assets/images/tabbar/explore_normal.png', selectedIconPath: 'assets/images/tabbar/explore_active.png' },
      { pagePath: 'pages/profile/index', text: '我的', iconPath: 'assets/images/tabbar/profile_normal.png', selectedIconPath: 'assets/images/tabbar/profile_active.png' },
    ],
  },
})
