import request from './request'

// --- 类型定义 ---
// [修复]: 补全前端使用的 TEXT/IMAGE/VIDEO 等常量，映射到后端协议
export const MsgType = {
    // 后端核心类型
    NORMAL: 1,
    AUDIO: 2,
    RECALL: 3,

    // 前端逻辑辅助类型 (全部映射为 1/NORMAL)
    // 这样前端代码写 MsgType.TEXT 不会报错，且逻辑上等同于 NORMAL
    TEXT: 1,
    IMAGE: 1,
    VIDEO: 1,
    FILE: 1
} as const

export type MsgType = typeof MsgType[keyof typeof MsgType]

export interface MsgPayload {
    mime_type: string
    url: string
    width?: number
    height?: number
    duration?: number
}

export interface MsgItem {
    id: string
    conversation_id: number
    sender_id: number
    msg_type: MsgType
    content: string
    payload: MsgPayload[] | null
    seq: number
    created_at: string
    status?: 'sending' | 'success' | 'fail'
}

export interface ConversationItem {
    conversation_id: number
    type: number
    peer_id: number
    last_msg_content: string
    last_msg_type: MsgType
    last_sender_id: number
    last_message_at: string
    unread_count: number
    is_muted: boolean
    is_pinned: boolean
    cover_url: string
    title: string
    my_read_seq: number
    peer_read_seq: number
    max_seq: number
}

// --- HTTP 接口 ---
export const getImTicketApi = () => request({url: '/im/ticket', method: 'get'})
export const getConversationsApi = () => request({url: '/im/list', method: 'get'})

export const syncMsgsApi = (params: { conv_id: number; last_seq: number; page_size?: number }) => request({
    url: '/im/sync',
    method: 'get',
    params
})

export const getHistoryMsgsApi = (params: { conv_id: number; last_seq: number; page_size?: number }) => request({
    url: '/im/history',
    method: 'get',
    params
})

export const sendMsgApi = (data: {
    conversation_id: number;
    target_user_id?: number;
    msg_type: number;
    content: string;
    payload?: MsgPayload[] | null;
}) => request({url: '/im/send', method: 'post', data})

export const markMsgReadApi = (data: { conversation_id: number; sequence: number }) => request({
    url: '/im/read',
    method: 'post',
    data
})

// --- WebSocket 客户端 ---
class IMClient {
    private ws: WebSocket | null = null
    private baseUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8080/api/im`
    private handlers: Set<(data: any) => void> = new Set()
    private reconnectTimer: number | null = null
    private isConnecting = false
    private shouldReconnect = true

    private scheduleReconnect() {
        if (this.reconnectTimer !== null) return
        this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null
            if (this.shouldReconnect) this.connect()
        }, 5000)
    }

    async connect() {
        if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING || this.isConnecting) return
        const { useUserStore } = await import('../stores/user')
        const userStore = useUserStore()
        if (!userStore.isLoggedIn) {
            this.disconnect()
            return
        }
        this.shouldReconnect = true
        this.isConnecting = true
        try {
            const res: any = await getImTicketApi()
            const ticket = res.data?.ticket
            if (!ticket) {
                this.isConnecting = false
                return
            }
            this.ws = new WebSocket(`${this.baseUrl}?ticket=${ticket}`)
            this.ws.onopen = () => {
                this.isConnecting = false
            }
            this.ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data)
                    this.handlers.forEach(handler => handler(data))
                } catch (error) {
                    console.error('IM消息解析失败', error)
                }
            }
            this.ws.onerror = () => {
                this.isConnecting = false
            }
            this.ws.onclose = () => {
                this.ws = null
                this.isConnecting = false
                if (this.shouldReconnect) this.scheduleReconnect()
            }
        } catch (e) {
            this.isConnecting = false
            console.error('IM连接失败', e)
            const { useUserStore } = await import('../stores/user')
            const userStore = useUserStore()
            if (!userStore.isLoggedIn) {
                this.disconnect()
                return
            }
            if (this.shouldReconnect) this.scheduleReconnect()
        }
    }

    disconnect() {
        this.shouldReconnect = false
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
        }
        if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
            this.ws.close()
        }
        this.ws = null
        this.isConnecting = false
    }

    subscribe(handler: (data: any) => void) {
        this.handlers.add(handler)
        return () => this.handlers.delete(handler)
    }
}

export const imClient = new IMClient()
