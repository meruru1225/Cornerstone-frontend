<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import UserLine from '../components/UserLine.vue'
import {
  addUserRoleApi,
  deleteUserRoleApi,
  getAllRolesApi,
  queryUserByConditionApi,
  type AdminUserItem,
  type RoleItem,
  type UserConditionParams
} from '../api/user'

const route = useRoute()

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
const loading = ref(false)
const roleOptions = ref<RoleItem[]>([])

const rolePanelVisible = ref(false)
const selectedUser = ref<AdminUserItem | null>(null)
const selectedRoleIds = ref<number[]>([])
const originalRoleIds = ref<number[]>([])

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
  } catch (error: any) {
    users.value = []
    ElMessage.error(error?.message || '查询用户失败')
  } finally {
    loading.value = false
  }
}

const openRolePanel = (user: AdminUserItem) => {
  selectedUser.value = user
  const ids = (user.user_roles || []).map(item => item.role_id)
  selectedRoleIds.value = [...ids]
  originalRoleIds.value = [...ids]
  rolePanelVisible.value = true
}

const closeRolePanel = () => {
  rolePanelVisible.value = false
  selectedUser.value = null
  selectedRoleIds.value = []
  originalRoleIds.value = []
}

const toggleRole = (roleId: number) => {
  if (selectedRoleIds.value.includes(roleId)) {
    selectedRoleIds.value = selectedRoleIds.value.filter(id => id !== roleId)
  } else {
    selectedRoleIds.value = [...selectedRoleIds.value, roleId]
  }
}

const saveRoles = async () => {
  if (!selectedUser.value) return
  const userId = selectedUser.value.id
  const toAdd = selectedRoleIds.value.filter(id => !originalRoleIds.value.includes(id))
  const toRemove = originalRoleIds.value.filter(id => !selectedRoleIds.value.includes(id))
  if (!toAdd.length && !toRemove.length) {
    ElMessage.info('角色未发生变化')
    return
  }
  try {
    await Promise.all([
      ...toAdd.map(roleId => addUserRoleApi({ user_id: userId, role_id: roleId })),
      ...toRemove.map(roleId => deleteUserRoleApi({ user_id: userId, role_id: roleId }))
    ])
    selectedUser.value.user_roles = selectedRoleIds.value.map(roleId => ({
      user_id: userId,
      role_id: roleId
    }))
    originalRoleIds.value = [...selectedRoleIds.value]
    ElMessage.success('角色更新成功')
    closeRolePanel()
  } catch (error: any) {
    ElMessage.error(error?.message || '角色更新失败')
  }
}

onMounted(async () => {
  await fetchRoles()
  const targetId = route.query.id
  if (targetId) {
    form.value.field = 'id'
    form.value.keyword = String(targetId)
    await fetchUsers()
    if (users.value[0]) {
      openRolePanel(users.value[0])
    }
  }
})
</script>

<template>
  <div class="admin-view">
    <div class="admin-header">
      <div class="title-area">
        <h2>角色权限分配</h2>
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

    <div v-else class="list-section">
      <div v-if="users.length === 0" class="empty-state">暂无用户</div>
      <div v-else class="user-list">
        <UserLine
          v-for="user in users"
          :key="user.id"
          :user="user"
          @assign="openRolePanel"
        />
      </div>
    </div>

    <div v-if="rolePanelVisible" class="role-modal">
      <div class="modal-mask" @click="closeRolePanel"></div>
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title">分配角色</div>
          <button class="close-btn" @click="closeRolePanel">×</button>
        </div>
        <div class="modal-body">
          <div v-if="!selectedUser" class="empty-state">未选择用户</div>
          <div v-else class="role-list">
            <div
              v-for="role in roleOptions"
              :key="role.ID"
              class="role-item"
              :class="{ active: selectedRoleIds.includes(role.ID) }"
              @click="toggleRole(role.ID)"
            >
              <div class="role-name">{{ role.Name }}</div>
              <div class="role-desc">{{ role.Description }}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="ghost-btn" @click="closeRolePanel">取消</button>
          <button class="primary-btn" @click="saveRoles">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-view {
  width: 100%;
  max-width: 1100px;
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

.list-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.role-modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
}

.modal-card {
  position: relative;
  width: 520px;
  max-width: 90%;
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 2001;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 18px;
  font-weight: 800;
  color: #18191C;
}

.close-btn {
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  color: #9499A0;
}

.role-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.role-item {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #E3E5E7;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.2s;
}

.role-item.active {
  border-color: #00AEEC;
  background: rgba(0, 174, 236, 0.08);
}

.role-name {
  font-size: 14px;
  font-weight: 700;
  color: #18191C;
}

.role-desc {
  font-size: 12px;
  color: #9499A0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.ghost-btn {
  background: #F4F6F8;
  color: #61666D;
  border: none;
  padding: 10px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
