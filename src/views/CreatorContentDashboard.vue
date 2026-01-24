<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import TrendDashboard from '../components/TrendDashboard.vue'
import { getUserContentMetric7d, getUserContentMetric30d, type MetricItem } from '../api/metric'

const loading = ref(true)
const weekData = ref({
  likes: [] as MetricItem[],
  comments: [] as MetricItem[],
  collects: [] as MetricItem[],
  views: [] as MetricItem[]
})

const monthData = ref({
  likes: [] as MetricItem[],
  comments: [] as MetricItem[],
  collects: [] as MetricItem[],
  views: [] as MetricItem[]
})

const currentRange = ref<'7d' | '30d'>('7d')
const currentMetric = ref<'likes' | 'comments' | 'collects' | 'views'>('likes')

const metricOptions = [
  { key: 'likes', label: '点赞' },
  { key: 'comments', label: '评论' },
  { key: 'collects', label: '收藏' },
  { key: 'views', label: '浏览' }
] as const

const currentMetricLabel = computed(() => {
  return metricOptions.find(option => option.key === currentMetric.value)?.label ?? ''
})

const currentList = computed(() => {
  const data = currentRange.value === '7d' ? weekData.value : monthData.value
  return data[currentMetric.value]
})

const loadMetrics = async () => {
  loading.value = true
  try {
    const [weekRes, monthRes] = await Promise.all([getUserContentMetric7d(), getUserContentMetric30d()])
    const week = weekRes?.data || weekRes || {}
    const month = monthRes?.data || monthRes || {}
    weekData.value = {
      likes: Array.isArray(week.likes) ? week.likes : [],
      comments: Array.isArray(week.comments) ? week.comments : [],
      collects: Array.isArray(week.collects) ? week.collects : [],
      views: Array.isArray(week.views) ? week.views : []
    }
    monthData.value = {
      likes: Array.isArray(month.likes) ? month.likes : [],
      comments: Array.isArray(month.comments) ? month.comments : [],
      collects: Array.isArray(month.collects) ? month.collects : [],
      views: Array.isArray(month.views) ? month.views : []
    }
  } catch (e) {
    weekData.value = { likes: [], comments: [], collects: [], views: [] }
    monthData.value = { likes: [], comments: [], collects: [], views: [] }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadMetrics()
})
</script>

<template>
  <div class="dashboard-view">
    <div class="header">
      <h2>内容数据</h2>
      <div class="header-actions">
        <div class="range-toggle">
          <button :class="{ active: currentRange === '7d' }" @click="currentRange = '7d'">近7天</button>
          <button :class="{ active: currentRange === '30d' }" @click="currentRange = '30d'">近30天</button>
        </div>
      </div>
    </div>

    <div class="metric-toggle">
      <button
        v-for="option in metricOptions"
        :key="option.key"
        :class="{ active: currentMetric === option.key }"
        @click="currentMetric = option.key"
      >
        {{ option.label }}
      </button>
    </div>

    <TrendDashboard
      :data="currentList"
      :loading="loading"
      :total-title="`${currentMetricLabel}总量趋势`"
      :delta-title="`${currentMetricLabel}新增趋势`"
      :total-value-label="`${currentMetricLabel}总量`"
      :delta-value-label="`新增${currentMetricLabel}`"
    />
  </div>
</template>

<style scoped>
.dashboard-view {
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
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

.metric-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border-radius: 999px;
  padding: 6px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}

.metric-toggle button {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  color: #61666D;
  cursor: pointer;
  font-weight: 600;
}

.metric-toggle button.active {
  background: #00AEEC;
  color: #ffffff;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

.spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid #E3E5E7;
  border-top-color: #00AEEC;
  animation: spin 1s linear infinite;
}

.card {
  background: #ffffff;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}

.card + .card {
  margin-top: 16px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #18191C;
  margin-bottom: 16px;
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
