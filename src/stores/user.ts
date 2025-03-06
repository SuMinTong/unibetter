// stores/user.ts
import { defineStore } from 'pinia'
import type { PersistenceOptions } from 'pinia-plugin-persistedstate'
import { wxLogin, getUser as fetchUserInfo } from '@/api/user'

// 类型定义
interface IUserInfo {
  user_id: number
  nickname: string
  avatar: string
  sex: number
  invite_code: string
}

const INITIAL_USER_STATE: IUserInfo = {
  user_id: 0,
  nickname: '',
  avatar: '',
  sex: 0,
  invite_code: ''
}

export const useUserStore = defineStore('user', () => {
  // ========== 状态 ==========
  const token = ref<string>('')
  const userInfo = ref<IUserInfo>({ ...INITIAL_USER_STATE })

  // ========== Getter ==========
  const isLoggedIn = computed(() => !!token.value)
  const currentUser = computed(() => userInfo.value)
  const currentToken = computed(() => token.value)

  // ========== Actions ==========

  // 设置Token
  const setToken = (newToken: string) => {
    token.value = newToken
  }

  // 更新用户信息
  const updateUserInfo = (info: Partial<IUserInfo>) => {
    userInfo.value = { ...userInfo.value, ...info }
  }

  // 清除用户信息
  const clearUserInfo = () => {
    userInfo.value = { ...INITIAL_USER_STATE }
  }

  // 获取用户信息
  const getUserInfo = async () => {
    try {
      const data = await fetchUserInfo()
      updateUserInfo(data)
      return data
    } catch (error) {
      clearSession()
      throw error
    }
  }

  // 微信登录
  const autoLogin = async () => {
    try {
      // 1. 获取微信code
      const { code } = await uni.login()

      // 2. 调用登录接口
      const { access_token } = await wxLogin({ code })

      // 3. 保存Token
      setToken(access_token)

      // 4. 获取用户信息
      await getUserInfo()

      return true
    } catch (error) {
      clearSession()
      throw error
    }
  }

  // 清除会话
  const clearSession = () => {
    token.value = ''
    clearUserInfo()
  }

  return {
    // State
    token,
    userInfo,

    // Getter
    isLoggedIn,
    currentUser,
    currentToken,

    // Actions
    autoLogin,
    getUserInfo,
    logout: clearSession,
  }
}, {
  // 持久化配置
  persist: {
    key: 'user-store',
    paths: ['token', 'userInfo'],
    afterRestore: (ctx: { store: { token: any; autoLogin: () => void } }) => {
      // 恢复存储后自动尝试登录
      if (ctx.store.token) {
        ctx.store.autoLogin()
      }
    }
  } as PersistenceOptions
})