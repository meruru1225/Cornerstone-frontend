import { stringify } from 'qs'

export interface AgentSearchParams {
  query?: string
}

export interface AgentConverseRequest {
  question?: string
  chat_id?: string
}

export interface StreamCallbacks {
  onMessage?: (data: string) => void
  onError?: (error: Error) => void
  onFinish?: () => void
}

async function streamRequest(
  url: string,
  options: RequestInit,
  callbacks?: StreamCallbacks
) {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // 携带 Cookie
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is unavailable')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        if (buffer.trim()) {
           // 处理剩余的 buffer
           processBuffer(buffer, callbacks?.onMessage)
        }
        callbacks?.onFinish?.()
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk

      // 处理完整的消息块 (以 \n\n 分隔)
      const parts = buffer.split('\n\n')
      // 保留最后一个可能不完整的部分
      buffer = parts.pop() || ''

      for (const part of parts) {
        processBuffer(part, callbacks?.onMessage)
      }
    }
  } catch (error: any) {
    callbacks?.onError?.(error)
  }
}

function processBuffer(block: string, onMessage?: (data: string) => void) {
  const lines = block.split('\n')
  for (const line of lines) {
    if (line.startsWith('data:')) {
      const data = line.slice(5).trim()
      // 如果是 '[DONE]' 则忽略或作为结束标志，这里主要传回有效数据
      if (data !== '[DONE]') {
        onMessage?.(data)
      }
    }
  }
}

/**
 * Agent搜索 (SSE)
 * GET /api/agent/search
 */
export function searchAgentApi(
  params: AgentSearchParams,
  callbacks?: StreamCallbacks,
  signal?: AbortSignal
) {
  // 构建 Query String
  const queryString = stringify(params, { addQueryPrefix: true })
  const url = `/api/agent/search${queryString}`

  return streamRequest(
    url,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal
    },
    callbacks
  )
}

/**
 * Agent对话 (SSE)
 * POST /api/agent/converse
 */
export function converseAgentApi(
  data: AgentConverseRequest,
  callbacks?: StreamCallbacks,
  signal?: AbortSignal
) {
  return streamRequest(
    '/api/agent/converse',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
      signal
    },
    callbacks
  )
}
