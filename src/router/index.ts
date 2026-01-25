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
            component: () => import('../layouts/AdminLayout.vue'),
            children: [
                {
                    path: '',
                    name: 'admin-home',
                    component: () => import('../views/AdminHomeView.vue'),
                    meta: { title: '管理员首页' }
                },
                {
                    path: 'users',
                    name: 'admin-users',
                    component: () => import('../views/AdminUserSearchView.vue'),
                    meta: { title: '用户查询与状态' }
                },
                {
                    path: 'roles',
                    name: 'admin-roles',
                    component: () => import('../views/AdminUserRoleView.vue'),
                    meta: { title: '角色权限分配' }
                },
                {
                    path: 'posts',
                    name: 'admin-posts',
                    component: () => import('../views/AdminPostAuditView.vue'),
                    meta: { title: '帖子审核队列' }
                }
            ]
        },
        {
            path: '/creator',
            component: () => import('../layouts/CreatorLayout.vue'),
            children: [
                {
                    path: '',
                    name: 'creator-home',
                    component: () => import('../views/CreatorHomeView.vue'),
                    meta: { title: '创作首页' }
                },
                {
                    path: 'publish',
                    name: 'creator-publish',
                    component: () => import('../views/CreatorPublishView.vue'),
                    meta: { title: '发布帖子' }
                },
                {
                    path: 'dashboard',
                    redirect: '/creator/dashboard/fans',
                    meta: { title: '数据看板' }
                },
                {
                    path: 'dashboard/fans',
                    name: 'creator-dashboard-fans',
                    component: () => import('../views/CreatorFansDashboard.vue'),
                    meta: { title: '粉丝数据' }
                },
                {
                    path: 'dashboard/content',
                    name: 'creator-dashboard-content',
                    component: () => import('../views/CreatorContentDashboard.vue'),
                    meta: { title: '内容数据' }
                },
                {
                    path: 'dashboard/posts',
                    name: 'creator-dashboard-posts',
                    component: () => import('../views/CreatorPostDashboard.vue'),
                    meta: { title: '帖子数据' }
                },
                {
                    path: 'manage',
                    name: 'creator-manage',
                    component: () => import('../views/CreatorPostManageView.vue'),
                    meta: { title: '帖子管理' }
                }
            ]
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

router.afterEach((to) => {
    const baseTitle = 'Cornerstone'
    const metaTitle = to.meta?.title as string | undefined
    document.title = metaTitle ? `${metaTitle} - ${baseTitle}` : baseTitle
})

export default router
