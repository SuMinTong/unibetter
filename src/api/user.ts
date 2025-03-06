
import request from '@/request'
/**
 * @description: 登录
 * @param data 登录参数
 * @returns 
 */
export const wxLogin = (data: any) => {
  return request.post({ url: 'login/auto_login', data })
}
/**
 * @description: 获取用户信息
 * @returns
 */
export const getUser = () => {
  return request.get({ url: 'user/userinfo' })
}