import {defineStore} from 'pinia'
import {ref} from 'vue'
import {getUnreadCountSSE} from '../api/sysbox'

export const useSysboxStore = defineStore('sysbox', () => {
    const unreadCount = ref(0)
    let eventSource: EventSource | null = null

    const connectUnreadCountSSE = () => {
        disconnectUnreadCountSSE()
        
        try {
            eventSource = getUnreadCountSSE()
            
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    if (typeof data === 'object' && data !== null && 'unread_count' in data) {
                        unreadCount.value = data.unread_count
                    } else if (typeof data === 'number') {
                        unreadCount.value = data
                    }
                } catch (parseError) {
                    console.error('解析 SSE 消息失败:', parseError)
                }
            }

            eventSource.addEventListener('ping', () => {
                // 心跳保持连接
            })
            
            eventSource.onerror = (error) => {
                console.error('SSE 连接错误:', error)
                setTimeout(() => {
                    connectUnreadCountSSE()
                }, 5000)
            }
        } catch (error) {
            console.error('建立 SSE 连接失败:', error)
        }
    }

    const disconnectUnreadCountSSE = () => {
        if (eventSource) {
            eventSource.close()
            eventSource = null
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
        connectUnreadCountSSE,
        disconnectUnreadCountSSE,
        decreaseCount,
        clearCount
    }
})