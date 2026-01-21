import {createRouter, createWebHistory} from 'vue-router'
import {useUserStore} from '../stores/user'

// 引入布局和页面
import MainLayout from '../layouts/MainLayout.vue'
import HomeView from '../views/HomeView.vue'
import BlankLayout from '../layouts/BlankLayout.vue'

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
                    component: HomeView,
                    meta: { title: '首页' }
                },
                {
                    path: '/search',
                    name: 'search',
                    component: () => import('../views/SearchView.vue'),
                    meta: { title: '搜索' }
                },
                {
                    path: '/user-tags',
                    name: 'user-tags',
                    component: () => import('../views/UserTagView.vue'),
                    meta: { title: '话题' }
                },
                {
                    path: '/ai',
                    name: 'ai',
                    component: () => import('../views/AIView.vue'),
                    meta: { title: '灵感AI' }
                },
                {
                    path: '/chat',
                    name: 'chat',
                    component: () => import('../views/ChatView.vue'),
                    meta: { title: '聊天' }
                },
                {
                    path: '/notify',
                    name: 'notify',
                    component: () => import('../views/NotifyView.vue'),
                    meta: { title: '消息中心' }
                },
                {
                    path: '/settings/account',
                    name: 'settings-account',
                    component: () => import('../views/UserSetting.vue'),
                    meta: { title: '账号设置' }
                },
                {
                    path: '/settings/profile',
                    name: 'settings-profile',
                    component: () => import('../views/UserInfoModifyView.vue'),
                    meta: { title: '编辑资料' }
                },
                {
                    path: '/space',
                    name: 'space',
                    component: () => import('../views/SpaceView.vue'),
                    meta: { title: '个人空间' }
                }
            ]
        },
        {
            path: '/admin',
            component: () => import('../layouts/AdminLayout.vue')
        },
        {
            path: '/post',
            component: BlankLayout,
            children: [
                {
                    path: '',
                    name: 'post',
                    component: () => import('../views/PostDetailView.vue'),
                    meta: { title: '帖子详情' }
                }
            ]
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
