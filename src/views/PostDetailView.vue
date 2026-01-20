<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PostDetail from '../components/PostDetail.vue'

const route = useRoute()
const router = useRouter()

const isDetailVisible = ref(true)
const currentPostId = ref<number | null>(null)

const syncPostId = () => {
  const rawId = route.query.id
  const idValue = Array.isArray(rawId) ? rawId[0] : rawId
  const parsed = idValue ? Number(idValue) : NaN
  if (Number.isFinite(parsed)) {
    currentPostId.value = parsed
    isDetailVisible.value = true
  } else {
    currentPostId.value = null
    isDetailVisible.value = false
  }
}

watch(() => route.query.id, () => syncPostId(), { immediate: true })

watch(isDetailVisible, (val) => {
  if (!val) {
    const referrer = document.referrer
    const referrerHost = referrer ? new URL(referrer).host : ''
    const isSameSite = referrerHost === window.location.host
    if (window.history.length > 1 && isSameSite) {
      router.back()
    } else {
      router.replace('/')
    }
  }
})
</script>

<template>
  <PostDetail v-model="isDetailVisible" :postId="currentPostId" entry-mode="blank" />
</template>
