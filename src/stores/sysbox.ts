import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getUnreadCountApi } from '../api/sysbox'

export const useSysboxStore = defineStore('sysbox', () => {
    const unreadCount = ref(0)

    const fetchUnreadCount = async () => {
        try {
            const res: any = await getUnreadCountApi()
            if (typeof res === 'number') {
                unreadCount.value = res
            } else {
                const data = res.data || res
                unreadCount.value = data?.unread_count ?? data?.unreadCount ?? 0
            }
        } catch (error) {
            console.error('获取未读数失败', error)
        }
    }

    const decreaseCount = (amount = 1) => {
        unreadCount.value = Math.max(0, unreadCount.value - amount)
    }

    const clearCount = () => {
        unreadCount.value = 0
    }

    return {
        unreadCount,
        fetchUnreadCount,
        decreaseCount,
        clearCount
    }
})