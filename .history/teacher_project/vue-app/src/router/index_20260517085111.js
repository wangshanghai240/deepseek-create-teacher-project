import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue')
  },
  {
    path: '/home',
    component: () => import('../views/home/HomeLayout.vue'),
    redirect: '/home/index',
    children: [
      {
        path: 'index',
        name: 'HomePage',
        component: () => import('../views/home/HomePage.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'articles',
        name: 'Articles',
        component: () => import('../views/home/ArticlesLayout.vue'),
        meta: { title: '文章' }
      },
      {
        path: 'articles/edit/:id',
        name: 'ArticleEdit',
        component: () => import('../views/home/ArticleEditor.vue'),
        meta: { title: '编辑文章' }
      },
      {
        path: 'articles/:id',
        name: 'ArticleDetail',
        component: () => import('../views/home/ArticleDetail.vue'),
        meta: { title: '文章详情' }
      },
      {
        path: 'news/:id',
        name: 'NewsDetail',
        component: () => import('../views/home/NewsDetail.vue'),
        meta: { title: '新闻详情' }
      },
      {
        path: 'teachers',
        name: 'Teachers',
        component: () => import('../views/home/TeachersPage.vue'),
        meta: { title: '教师' }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/home/ProfilePage.vue'),
        meta: { title: '我的' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/home/SettingsPage.vue'),
        meta: { title: '设置' }
      },
      {
        path: 'settings/profile',
        name: 'ProfileSettings',
        component: () => import('../views/home/ProfileSettings.vue'),
        meta: { title: '个人资料' }
      },
      {
        path: 'settings/theme',
        name: 'ThemeSettings',
        component: () => import('../views/home/ThemeSettings.vue'),
        meta: { title: '显示模式' }
      },
      {
        path: 'settings/security',
        name: 'SecuritySettings',
        component: () => import('../views/home/SecuritySettings.vue'),
        meta: { title: '账号安全' }
      },
      {
        path: 'settings/lang',
        name: 'LangSettings',
        component: () => import('../views/home/LangSettings.vue'),
        meta: { title: '语言' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：未登录用户访问主页，重定向到登录页
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  
  if (to.path.startsWith('/home') && !token) {
    next('/')
  } else if (to.path === '/' && token) {
    next('/home/index')
  } else {
    next()
  }
})

export default router