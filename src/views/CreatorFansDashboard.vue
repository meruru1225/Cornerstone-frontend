<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import TrendDashboard from '../components/TrendDashboard.vue'
import { getUserMetric7d, getUserMetric30d, type MetricItem } from '../api/metric'

const loading = ref(true)
const weekData = ref<MetricItem[]>([])
const monthData = ref<MetricItem[]>([])
const currentRange = ref<'7d' | '30d'>('7d')

const currentData = computed(() => currentRange.value === '7d' ? weekData.value : monthData.value)
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

onMounted(() => {
  loadMetrics()
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

    <TrendDashboard
      :data="currentData"
      :loading="loading"
      total-title="粉丝总量趋势"
      delta-title="粉丝新增趋势"
      total-value-label="粉丝总量"
      delta-value-label="新增粉丝"
    />
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
