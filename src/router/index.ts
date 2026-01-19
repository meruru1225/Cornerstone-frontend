import {createRouter, createWebHistory} from 'vue-router'
import {useUserStore} from '../stores/user'

// 引入布局和页面
import MainLayout from '../layouts/MainLayout.vue'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            component: MainLayout,
            children: [
                {
                    path: '', // 默认首页
                    name: 'home',
                    component: HomeView
                },
                {
                    path: '/search',
                    name: 'search',
                    component: () => import('../views/SearchView.vue')
                },
                {
                    path: 'ai',
                    name: 'ai',
                    component: () => import('../views/AIView.vue')
                },
                {
                    path: 'chat',
                    name: 'chat',
                    component: () => import('../views/ChatView.vue')
                },
                {
                    path: 'inbox',
                    name: 'inbox',
                    component: () => import('../views/ChatView.vue') // 复用消息中心结构
                },
                {
                    path: 'profile',
                    name: 'profile',
                    component: () => import('../views/HomeView.vue') // 暂时占位
                }
            ]
        },
        {
            path: '/admin',
            component: () => import('../layouts/AdminLayout.vue')
        }
    ]
})

// 路由守卫：实现“软处理”逻辑
router.beforeEach(async (_to, _from, next) => {
    const userStore = useUserStore()

    // 仅在已登录但没有本地用户信息时才尝试获取
    if (!userStore.userInfo && userStore.isLoggedIn) {
        await userStore.fetchUserInfo()
    }

    next()
})

export default router