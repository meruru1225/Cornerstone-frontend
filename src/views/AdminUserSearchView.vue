<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import UserCard from '../components/UserCard.vue'
import UserDetail from '../components/UserDetail.vue'
import {
  banUserApi,
  getAllRolesApi,
  queryUserByConditionApi,
  unbanUserApi,
  type AdminUserItem,
  type RoleItem,
  type UserConditionParams,
  type UserHomeInfo
} from '../api/user'

const router = useRouter()

const form = ref({
  field: 'id',
  keyword: ''
})

const fieldOptions = [
  { label: '用户ID', value: 'id' },
  { label: '用户名', value: 'username' },
  { label: '手机号', value: 'phone' },
  { label: '昵称', value: 'nickname' }
]

const keywordPlaceholder = computed(() => {
  const match = fieldOptions.find(item => item.value === form.value.field)
  return match ? `请输入${match.label}` : '请输入查询条件'
})

const users = ref<AdminUserItem[]>([])
const selectedUser = ref<AdminUserItem | null>(null)
const loading = ref(false)
const roleOptions = ref<RoleItem[]>([])

const userCards = computed<UserHomeInfo[]>(() => {
  return users.value.map((user) => ({
    user_id: user.id,
    nickname: user.user_detail?.nickname || user.username || '未命名用户',
    avatar_url: user.user_detail?.avatar_url || '',
    bio: user.user_detail?.bio || '',
    gender: user.user_detail?.gender ?? 0,
    region: user.user_detail?.region || ''
  }))
})

const resolveAdminUser = (userId: number) => {
  return users.value.find(item => item.id === userId) || null
}

const handleSelect = (card: UserHomeInfo) => {
  selectedUser.value = resolveAdminUser(card.user_id)
}

const fetchRoles = async () => {
  try {
    const res: any = await getAllRolesApi()
    const payload = res.data || res
    roleOptions.value = payload.data || payload.list || payload || []
  } catch (error: any) {
    roleOptions.value = []
  }
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const params: UserConditionParams = {}
    const keyword = form.value.keyword.trim()
    if (keyword) {
      if (form.value.field === 'id') params.id = keyword
      if (form.value.field === 'username') params.username = keyword
      if (form.value.field === 'phone') params.phone = keyword
      if (form.value.field === 'nickname') params.nickname = keyword
    }
    const res: any = await queryUserByConditionApi(params)
    const payload = res.data || res
    const list = payload.data || payload.list || payload || []
    users.value = Array.isArray(list) ? list : []
    selectedUser.value = users.value[0] || null
  } catch (error: any) {
    users.value = []
    selectedUser.value = null
    ElMessage.error(error?.message || '查询用户失败')
  } finally {
    loading.value = false
  }
}

const confirmAction = async (text: string) => {
  await ElMessageBox.confirm(text, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
    appendTo: document.body
  })
}

const handleBan = async (user: AdminUserItem) => {
  try {
    await confirmAction('确定要封禁该用户吗？')
    await banUserApi(user.id)
    user.is_ban = true
    ElMessage.success('封禁成功')
  } catch (error: any) {
    if (error === 'cancel') return
    ElMessage.error(error?.message || '封禁失败')
  }
}

const handleUnban = async (user: AdminUserItem) => {
  try {
    await confirmAction('确定要解除封禁吗？')
    await unbanUserApi(user.id)
    user.is_ban = false
    ElMessage.success('解除封禁成功')
  } catch (error: any) {
    if (error === 'cancel') return
    ElMessage.error(error?.message || '解除封禁失败')
  }
}

const handleManageRoles = (user: AdminUserItem) => {
  router.push({ path: '/admin/roles', query: { id: user.id.toString() } })
}

onMounted(() => {
  fetchRoles()
})
</script>

<template>
  <div class="admin-view">
    <div class="admin-header">
      <div class="title-area">
        <h2>用户查询与状态</h2>
        <span class="count">{{ users.length }} 位用户</span>
      </div>
      <div class="search-form">
        <el-select v-model="form.field" class="search-select" popper-class="search-select-popper">
          <el-option
            v-for="item in fieldOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <input v-model="form.keyword" class="search-input" :placeholder="keywordPlaceholder" />
        <button class="primary-btn" @click="fetchUsers">搜索</button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else class="content-area">
      <div class="list-section">
        <div v-if="userCards.length === 0" class="empty-state">暂无用户</div>
        <div v-else class="user-list">
          <UserCard
            v-for="user in userCards"
            :key="user.user_id"
            :user="user"
            :disable-navigate="true"
            :show-action="false"
            @select="handleSelect"
          />
        </div>
      </div>
      <div class="detail-section">
        <div v-if="!selectedUser" class="empty-state">请选择用户查看详情</div>
        <UserDetail
          v-else
          :user="selectedUser"
          :role-options="roleOptions"
          @ban="handleBan"
          @unban="handleUnban"
          @manage-roles="handleManageRoles"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-view {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.admin-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-area h2 {
  font-size: 22px;
  font-weight: 800;
  margin: 0;
  color: #18191C;
}

.count {
  font-size: 13px;
  color: #9499A0;
}

.search-form {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr) auto;
  gap: 12px;
}

.search-select {
  width: 100%;
}

.search-select :deep(.el-input__wrapper) {
  border-radius: 10px;
  border: 1px solid #E3E5E7;
  box-shadow: none;
  padding: 0 12px;
  height: 40px;
}

.search-select :deep(.el-input__inner) {
  font-size: 13px;
  color: #303133;
}

.search-select :deep(.el-select__caret) {
  color: #606266;
}

.search-input {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #E3E5E7;
  background: #fff;
  font-size: 13px;
}

.primary-btn {
  padding: 10px 18px;
  border-radius: 10px;
  border: none;
  background: #00AEEC;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.content-area {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) minmax(0, 2fr);
  gap: 20px;
  align-items: start;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-section {
  position: sticky;
  top: 20px;
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

.empty-state {
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  color: #9499A0;
  border: 1px dashed #E3E5E7;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
