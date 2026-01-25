export function formatRFC3339ToLocal(input: string, timeZone = 'Asia/Shanghai') {
  if (!input) return ''
  const date = new Date(input)
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value || ''
  const y = get('year')
  const m = get('month')
  const d = get('day')
  const h = get('hour')
  const mi = get('minute')
  const s = get('second')
  return `${y}-${m}-${d} ${h}:${mi}:${s}`
}
