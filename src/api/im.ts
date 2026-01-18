import request from './request'

// 消息类型枚举
export const MsgType = {
  TEXT: 1,
  IMAGE: 2,
  VIDEO: 3,
  AUDIO: 4,
  SYSTEM: 5
} as const

export type MsgType = (typeof MsgType)[keyof typeof MsgType]

// 消息发送参数
export interface SendMsgParams {
  conversation_id: number
  target_user_id: number
  msg_type: MsgType
  content: string
}

// 消息项接口
export interface MsgItem {
  id: string
  conversation_id: number
  sender_id: number
  msg_type: MsgType
  content: string
  payload: any | null
  seq: number
  createdAt: string
}

// 会话项接口
export interface ConversationItem {
  conversation_id: number
  type: number
  peer_id: number
  last_msg_content: string
  last_msg_type: MsgType
  last_sender_id: number
  lastMessageAt: string
  unreadCount: number
  isMuted: boolean
  isPinned: boolean
}

// 标记已读参数
export interface MarkReadParams {
  conversation_id: number
  sequence: number
}

// 历史记录参数
export interface HistoryParams {
  conv_id?: number | string
  last_seq?: number | string
}

// 同步参数
export interface SyncParams {
  conv_id?: number | string
  last_seq?: number | string
}

// Ticket 响应接口
export interface TicketResponse {
  ticket: string
}

/**
 * 获取WebSocket签名
 */
export function getWebSocketTicketApi() {
  return request<{ code: number, message: string, data: TicketResponse }>({
    url: '/im/ticket',
    method: 'get'
  })
}

/**
 * 发送消息
 */
export function sendMsgApi(data: SendMsgParams) {
  return request({
    url: '/im/send',
    method: 'post',
    data
  })
}

/**
 * 获取历史聊天记录
 */
export function getHistoryApi(params: HistoryParams) {
  return request({
    url: '/im/history',
    method: 'get',
    params
  })
}

/**
 * 同步最新聊天记录
 */
export function syncMsgApi(params: SyncParams) {
  return request({
    url: '/im/sync',
    method: 'get',
    params
  })
}

/**
 * 获取会话列表
 */
export function getConversationListApi() {
  return request({
    url: '/im/list',
    method: 'get'
  })
}

/**
 * 标记信息已读
 */
export function markReadApi(data: MarkReadParams) {
  return request({
    url: '/im/read',
    method: 'post',
    data
  })
}

// WebSocket 处理
export class IMWebSocket {
  private ws: WebSocket | null = null
  private url: string
  private heartbeatInterval: any = null
  private reconnectTimeout: any = null
  private isIntentionalClose: boolean = false
  
  public onMessage: ((data: any) => void) | null = null
  public onOpen: (() => void) | null = null
  public onClose: (() => void) | null = null
  public onError: ((error: Event) => void) | null = null

  constructor(url: string = '/api/im/connect') {
    // 自动适配 protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    // 如果传入的是相对路径，则拼接完整路径
    this.url = url.startsWith('ws') ? url : `${protocol}//${host}${url}`
  }

  public async connect() {
    this.isIntentionalClose = false
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        return;
    }

    try {
      // 获取 ticket
      // request 返回的是 Promise<any> 或 Promise<AxiosResponse>，这里我们根据 interceptor 知道它返回 response.data
      const res: any = await getWebSocketTicketApi()
      const ticket = res.data?.ticket

      if (!ticket) {
        console.error('Failed to get WebSocket ticket:', res)
        throw new Error('No ticket in response')
      }
      
      // 拼接 ticket 到 URL
      const wsUrl = this.url.includes('?') 
        ? `${this.url}&ticket=${ticket}`
        : `${this.url}?ticket=${ticket}`

      this.ws = new WebSocket(wsUrl)
      
      this.ws.onopen = () => {
        console.log('IM WebSocket Connected')
        this.startHeartbeat()
        if (this.onOpen) this.onOpen()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'pong') {
            // 心跳响应，忽略
            return
          }
          if (this.onMessage) this.onMessage(data)
        } catch (e) {
          console.error('Failed to parse IM message', e)
        }
      }

      this.ws.onclose = () => {
        console.log('IM WebSocket Closed')
        this.stopHeartbeat()
        if (!this.isIntentionalClose) {
          this.reconnect()
        }
        if (this.onClose) this.onClose()
      }

      this.ws.onerror = (error) => {
        console.error('IM WebSocket Error', error)
        if (this.onError) this.onError(error)
      }

    } catch (e) {
      console.error('IM WebSocket Connection Failed', e)
      this.reconnect()
    }
  }

  public close() {
    this.isIntentionalClose = true
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
        console.warn('WebSocket is not open. Message not sent.')
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // 30s 心跳
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private reconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    this.reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect IM WebSocket...')
      this.connect()
    }, 3000) // 3s 重连
  }
}
