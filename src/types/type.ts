
type IUserInfo = {
  user_id: number
  sex: number
  avatar: string
  nickname: string
  invite_code: string
  [key: string]: any
}

type IResData<T> = {
  code: number
  msg: string
  data: T
}
type IUseRequestOptions<T> = {
  /** 是否立即执行 */
  immediate?: boolean
  /** 初始化数据 */
  initialData?: T
}
