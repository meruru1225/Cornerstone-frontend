<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getUserMetric7d, getUserMetric30d, type MetricItem } from '../api/metric'

const loading = ref(true)
const weekData = ref<MetricItem[]>([])
const monthData = ref<MetricItem[]>([])
const currentRange = ref<'7d' | '30d'>('7d')
const totalPanelRef = ref<HTMLDivElement | null>(null)
const deltaPanelRef = ref<HTMLDivElement | null>(null)
const totalTooltipRef = ref<HTMLDivElement | null>(null)
const deltaTooltipRef = ref<HTMLDivElement | null>(null)
const chartContainerWidth = ref(0)
const totalScrollLeft = ref(0)
const deltaScrollLeft = ref(0)
const tooltipSize = ref({
  total: { width: 0, height: 0 },
  delta: { width: 0, height: 0 }
})
const hoverInfo = ref<{
  type: 'total' | 'delta' | null
  x: number
  y: number
  date: string
  value: number
}>({
  type: null,
  x: 0,
  y: 0,
  date: '',
  value: 0
})

const currentData = computed(() => currentRange.value === '7d' ? weekData.value : monthData.value)
const totalSeries = computed(() => currentData.value.map(item => item.value))
const deltaSeries = computed(() => currentData.value.map((item, index) => {
  if (index === 0) return Math.max(0, item.value)
  const prev = currentData.value[index - 1]?.value ?? 0
  return Math.max(0, item.value - prev)
}))

const buildBounds = (values: number[]) => {
  if (values.length === 0) {
    return { min: 0, max: 1 }
  }
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const baseMin = Math.min(rawMin, 0)
  const baseMax = Math.max(rawMax, 0)
  const range = baseMax - baseMin
  if (range === 0) {
    const padding = Math.max(1, Math.abs(baseMax) * 0.2)
    return { min: Math.max(0, baseMin - padding), max: baseMax + padding }
  }
  const padding = range * 0.1
  return { min: Math.max(0, baseMin - padding), max: baseMax + padding }
}

const totalBounds = computed(() => buildBounds(totalSeries.value))
const deltaBounds = computed(() => buildBounds(deltaSeries.value))
const totalMinValue = computed(() => totalBounds.value.min)
const totalMaxValue = computed(() => totalBounds.value.max)
const deltaMinValue = computed(() => deltaBounds.value.min)
const deltaMaxValue = computed(() => deltaBounds.value.max)
const chartHeight = 180
const chartPadding = 24
const perPointWidth = 64
const chartWidth = computed(() => {
  const baseWidth = Math.max(480, chartContainerWidth.value)
  return Math.max(baseWidth, currentData.value.length * perPointWidth)
})

const formatDate = (date: string) => date ? date.slice(5) : ''
const formatValue = (value: number) => value.toLocaleString()

const getY = (value: number, min: number, max: number) => {
  if (max === min) {
    return chartPadding + (chartHeight - chartPadding * 2) / 2
  }
  const range = max - min
  const ratio = (value - min) / range
  return chartPadding + (1 - ratio) * (chartHeight - chartPadding * 2)
}

const buildPoints = (values: number[], min: number, max: number) => {
  if (values.length === 0) return ''
  const step = values.length > 1 ? (chartWidth.value - chartPadding * 2) / (values.length - 1) : 0
  return values.map((value, index) => {
    const x = chartPadding + index * step
    const y = getY(value, min, max)
    return `${x},${y}`
  }).join(' ')
}

const totalPoints = computed(() => buildPoints(totalSeries.value, totalMinValue.value, totalMaxValue.value))
const deltaPoints = computed(() => buildPoints(deltaSeries.value, deltaMinValue.value, deltaMaxValue.value))

const buildTicks = (values: number[]) => {
  const unique = Array.from(new Set(values.map(value => Math.round(value))))
  if (!unique.includes(0)) unique.push(0)
  return unique.sort((a, b) => b - a)
}

const totalTicks = computed(() => buildTicks(totalSeries.value))
const deltaTicks = computed(() => buildTicks(deltaSeries.value))

const getX = (index: number, length: number) => {
  if (length <= 1) return chartWidth.value / 2
  return chartPadding + index * ((chartWidth.value - chartPadding * 2) / (length - 1))
}

const updateTooltipSize = async (type: 'total' | 'delta') => {
  await nextTick()
  const el = type === 'total' ? totalTooltipRef.value : deltaTooltipRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  tooltipSize.value = {
    ...tooltipSize.value,
    [type]: { width: rect.width, height: rect.height }
  }
}

const setHover = (
  type: 'total' | 'delta',
  item: MetricItem,
  value: number,
  index: number
) => {
  const min = type === 'total' ? totalMinValue.value : deltaMinValue.value
  const max = type === 'total' ? totalMaxValue.value : deltaMaxValue.value
  hoverInfo.value = {
    type,
    x: getX(index, currentData.value.length),
    y: getY(value, min, max),
    date: item.date,
    value
  }
  updateTooltipSize(type)
}

const clearHover = (type: 'total' | 'delta') => {
  if (hoverInfo.value.type === type) {
    hoverInfo.value.type = null
  }
}

const updateScrollLeft = (type: 'total' | 'delta') => {
  if (type === 'total') {
    totalScrollLeft.value = totalPanelRef.value?.scrollLeft ?? 0
  } else {
    deltaScrollLeft.value = deltaPanelRef.value?.scrollLeft ?? 0
  }
}

const getTooltipStyle = (type: 'total' | 'delta') => {
  const panel = type === 'total' ? totalPanelRef.value : deltaPanelRef.value
  if (!panel) return {}
  const scrollLeft = type === 'total' ? totalScrollLeft.value : deltaScrollLeft.value
  const size = tooltipSize.value[type]
  const padding = 12
  const minLeft = scrollLeft + padding
  const maxLeft = scrollLeft + panel.clientWidth - padding - size.width
  const desiredLeft = hoverInfo.value.x - size.width / 2 + 16
  const clampedLeft = Math.min(Math.max(desiredLeft, minLeft), maxLeft)
  const aboveTop = hoverInfo.value.y - size.height - 16
  const belowTop = hoverInfo.value.y + 16
  const minTop = padding
  const maxTop = panel.clientHeight - padding - size.height
  const desiredTop = aboveTop >= minTop ? aboveTop : belowTop
  const clampedTop = Math.min(Math.max(desiredTop, minTop), maxTop)
  return {
    left: `${clampedLeft}px`,
    top: `${clampedTop}px`
  }
}

const updateContainerWidth = () => {
  const totalWidth = totalPanelRef.value?.clientWidth ?? 0
  const deltaWidth = deltaPanelRef.value?.clientWidth ?? 0
  chartContainerWidth.value = Math.max(totalWidth, deltaWidth)
}

const loadMetrics = async () => {
  loading.value = true
  try {
    const [weekRes, monthRes] = await Promise.all([getUserMetric7d(), getUserMetric30d()])
    const normalizeList = (res: any) => {
      const body = res?.data ?? res
      if (Array.isArray(body)) return body
      if (Array.isArray(body?.data)) return body.data
      if (Array.isArray(body?.fans)) return body.fans
      return []
    }
    weekData.value = normalizeList(weekRes)
    monthData.value = normalizeList(monthRes)
  } catch (e) {
    weekData.value = []
    monthData.value = []
  } finally {
    loading.value = false
  }
}

let resizeObserver: ResizeObserver | null = null
const observePanels = () => {
  if (!resizeObserver) return
  resizeObserver.disconnect()
  if (totalPanelRef.value) resizeObserver.observe(totalPanelRef.value)
  if (deltaPanelRef.value) resizeObserver.observe(deltaPanelRef.value)
}

onMounted(() => {
  loadMetrics()
  updateContainerWidth()
  updateScrollLeft('total')
  updateScrollLeft('delta')
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => updateContainerWidth())
    observePanels()
  } else {
    window.addEventListener('resize', updateContainerWidth)
  }
})

watch([totalPanelRef, deltaPanelRef, loading, currentRange], async () => {
  await nextTick()
  updateContainerWidth()
  updateScrollLeft('total')
  updateScrollLeft('delta')
  observePanels()
}, { immediate: true })

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  window.removeEventListener('resize', updateContainerWidth)
})
</script>

<template>
  <div class="dashboard-view">
    <div class="header">
      <h2>粉丝数据</h2>
      <div class="header-actions">
        <div class="range-toggle">
          <button :class="{ active: currentRange === '7d' }" @click="currentRange = '7d'">近7天</button>
          <button :class="{ active: currentRange === '30d' }" @click="currentRange = '30d'">近30天</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">粉丝总量趋势</div>
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>
      <div v-else-if="currentData.length === 0" class="empty-state">暂无数据</div>
      <div v-else class="chart-panel">
        <div class="chart-body">
          <div class="y-axis">
            <span
              v-for="tick in totalTicks"
              :key="`t-${tick}`"
              class="y-axis-label"
              :style="{ top: `${getY(tick, totalMinValue, totalMaxValue)}px` }"
            >
              {{ formatValue(tick) }}
            </span>
          </div>
          <div class="chart-scroll" ref="totalPanelRef" @scroll="() => updateScrollLeft('total')">
            <svg
              class="trend-chart"
              :style="{ width: `${chartWidth}px`, height: `${chartHeight}px` }"
              :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
              preserveAspectRatio="xMinYMin meet"
            >
              <g class="grid-lines">
                <line
                  v-for="tick in totalTicks"
                  :key="`grid-${tick}`"
                  :x1="0"
                  :x2="chartWidth"
                  :y1="getY(tick, totalMinValue, totalMaxValue)"
                  :y2="getY(tick, totalMinValue, totalMaxValue)"
                />
              </g>
              <polyline class="trend-line" :points="totalPoints" />
              <circle
                v-for="(item, index) in currentData"
                :key="item.date"
                class="trend-point"
                :cx="getX(index, currentData.length)"
                :cy="getY(totalSeries[index] ?? 0, totalMinValue, totalMaxValue)"
                r="4"
                @mouseenter="() => setHover('total', item, totalSeries[index] ?? 0, index)"
                @mousemove="() => setHover('total', item, totalSeries[index] ?? 0, index)"
                @mouseleave="() => clearHover('total')"
              />
            </svg>
            <div class="axis-labels" :style="{ width: `${chartWidth}px`, height: '16px' }">
              <span
                v-for="(item, index) in currentData"
                :key="item.date"
                class="axis-label"
                :style="{ left: `${getX(index, currentData.length)}px` }"
              >
                {{ formatDate(item.date) }}
              </span>
            </div>
            <div
              v-if="hoverInfo.type === 'total'"
              class="tooltip"
              :style="getTooltipStyle('total')"
              ref="totalTooltipRef"
            >
              <div class="tooltip-date">{{ hoverInfo.date }}</div>
              <div class="tooltip-value">粉丝总量 {{ formatValue(hoverInfo.value) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">粉丝新增趋势</div>
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
      </div>
      <div v-else-if="currentData.length === 0" class="empty-state">暂无数据</div>
      <div v-else class="chart-panel">
        <div class="chart-body">
          <div class="y-axis">
            <span
              v-for="tick in deltaTicks"
              :key="`d-${tick}`"
              class="y-axis-label"
              :style="{ top: `${getY(tick, deltaMinValue, deltaMaxValue)}px` }"
            >
              {{ formatValue(tick) }}
            </span>
          </div>
          <div class="chart-scroll" ref="deltaPanelRef" @scroll="() => updateScrollLeft('delta')">
            <svg
              class="trend-chart"
              :style="{ width: `${chartWidth}px`, height: `${chartHeight}px` }"
              :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
              preserveAspectRatio="xMinYMin meet"
            >
              <g class="grid-lines">
                <line
                  v-for="tick in deltaTicks"
                  :key="`grid-d-${tick}`"
                  :x1="0"
                  :x2="chartWidth"
                  :y1="getY(tick, deltaMinValue, deltaMaxValue)"
                  :y2="getY(tick, deltaMinValue, deltaMaxValue)"
                />
              </g>
              <polyline class="trend-line" :points="deltaPoints" />
              <circle
                v-for="(item, index) in currentData"
                :key="item.date"
                class="trend-point"
                :cx="getX(index, currentData.length)"
                :cy="getY(deltaSeries[index] ?? 0, deltaMinValue, deltaMaxValue)"
                r="4"
                @mouseenter="() => setHover('delta', item, deltaSeries[index] ?? 0, index)"
                @mousemove="() => setHover('delta', item, deltaSeries[index] ?? 0, index)"
                @mouseleave="() => clearHover('delta')"
              />
            </svg>
            <div class="axis-labels" :style="{ width: `${chartWidth}px`, height: '16px' }">
              <span
                v-for="(item, index) in currentData"
                :key="item.date"
                class="axis-label"
                :style="{ left: `${getX(index, currentData.length)}px` }"
              >
                {{ formatDate(item.date) }}
              </span>
            </div>
            <div
              v-if="hoverInfo.type === 'delta'"
              class="tooltip"
              :style="getTooltipStyle('delta')"
              ref="deltaTooltipRef"
            >
              <div class="tooltip-date">{{ hoverInfo.date }}</div>
              <div class="tooltip-value">新增粉丝 {{ formatValue(hoverInfo.value) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-view {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #18191C;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}


.card {
  background: #ffffff;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #18191C;
  margin-bottom: 16px;
}

.range-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #F4F6F8;
  padding: 4px;
  border-radius: 999px;
}

.range-toggle button {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  color: #61666D;
  cursor: pointer;
  font-weight: 600;
}

.range-toggle button.active {
  background: #ffffff;
  color: #18191C;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.chart-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-body {
  display: flex;
  align-items: stretch;
  gap: 12px;
}

.y-axis {
  width: 48px;
  position: relative;
  color: #8A9099;
  font-size: 11px;
}

.y-axis-label {
  position: absolute;
  right: 4px;
  transform: translateY(-50%);
}

.chart-scroll {
  position: relative;
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1;
  padding-bottom: 8px;
  scroll-behavior: smooth;
}

.chart-scroll::-webkit-scrollbar {
  height: 6px;
}

.chart-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.16);
  border-radius: 999px;
}

.chart-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.trend-chart {
  min-width: 480px;
}

.grid-lines line {
  stroke: rgba(0, 0, 0, 0.06);
  stroke-width: 1;
}

.trend-line {
  fill: none;
  stroke: #00AEEC;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-point {
  fill: #00AEEC;
  stroke: #ffffff;
  stroke-width: 1.5;
}

.axis-labels {
  position: relative;
  font-size: 11px;
  color: #8A9099;
  text-align: center;
  min-width: 480px;
}

.axis-label {
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
}

.tooltip {
  position: absolute;
  transform: translate(0, 0);
  background: rgba(24, 25, 28, 0.92);
  color: #ffffff;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
  pointer-events: none;
  white-space: nowrap;
}

.tooltip-date {
  opacity: 0.8;
  font-size: 11px;
}

.tooltip-value {
  font-weight: 600;
  margin-top: 2px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.spinner {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 3px solid #E3E5E7;
  border-top-color: #00AEEC;
  animation: spin 1s linear infinite;
}

.empty-state {
  text-align: center;
  color: #9499A0;
  padding: 20px 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
