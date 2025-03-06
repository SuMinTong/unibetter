import { merge } from 'lodash-es'
import { isFunction } from '@vue/shared'
import { HttpRequestOptions, RequestConfig, RequestOptions, UploadFileOption } from './type'
import { RequestErrMsgEnum, RequestMethodsEnum } from '@/enums/request'
import requestCancel from './cancel'

export default class HttpRequest {
    // 定义私有只读属性options，类型为HttpRequestOptions
    private readonly options: HttpRequestOptions
    // 构造函数，接收一个HttpRequestOptions类型的参数options
    constructor(options: HttpRequestOptions) {
        this.options = options
    }
    /**
     * @description 重新请求
     */
    retryRequest(options: RequestOptions, config: RequestConfig) {
        // 获取配置中的重试次数和重试超时时间
        const { retryCount, retryTimeout } = config
        // 如果没有设置重试次数或者请求方法为POST，则直接返回一个被拒绝的Promise
        if (!retryCount || options.method?.toUpperCase() == RequestMethodsEnum.POST) {
            return Promise.reject()
        }
        // 显示加载中
        uni.showLoading({ title: '加载中...' })
        // 如果已经重试的次数大于等于配置中的重试次数，则返回一个被拒绝的Promise
        config.hasRetryCount = config.hasRetryCount ?? 0
        if (config.hasRetryCount >= retryCount) {
            return Promise.reject()
        }
        // 重试次数加1
        config.hasRetryCount++
        // 设置请求拦截器
        config.requestHooks.requestInterceptorsHook = (options) => options
        // 返回一个Promise，在指定的时间后执行请求函数，并在请求完成后隐藏加载中
        return new Promise((resolve) => setTimeout(resolve, retryTimeout))
            .then(() => this.request(options, config))
            .finally(() => uni.hideLoading())
    }
    /**
     * @description get请求
     */
    get<T = any>(options: RequestOptions, config?: Partial<RequestConfig>): Promise<T> {
        // 调用request函数，传入GET请求的方法
        return this.request({ ...options, method: RequestMethodsEnum.GET }, config)
    }

    /**
     * @description post请求
     */
    post<T = any>(options: RequestOptions, config?: Partial<RequestConfig>): Promise<T> {
        return this.request({ ...options, method: RequestMethodsEnum.POST }, config)
    }

    /**
     * @description 上传图片
     */
    uploadFile(options: UploadFileOption, config?: Partial<RequestConfig>) {
        let mergeOptions: RequestOptions = merge({}, this.options.requestOptions, options)
        const mergeConfig: RequestConfig = merge({}, this.options, config)
        const { requestInterceptorsHook, responseInterceptorsHook, responseInterceptorsCatchHook } =
            mergeConfig.requestHooks || {}
        if (requestInterceptorsHook && isFunction(requestInterceptorsHook)) {
            mergeOptions = requestInterceptorsHook(mergeOptions, mergeConfig)
        }
        return new Promise((resolve, reject) => {
            uni.uploadFile({
                ...mergeOptions,
                success: async (response) => {
                    if (response.statusCode == 200) {
                        response.data = JSON.parse(response.data)
                        if (responseInterceptorsHook && isFunction(responseInterceptorsHook)) {
                            try {
                                response = await responseInterceptorsHook(response, mergeConfig)
                                resolve(response)
                            } catch (error) {
                                reject(error)
                            }
                            return
                        }
                        resolve(response)
                    }
                },
                fail: async (err) => {
                    if (
                        responseInterceptorsCatchHook &&
                        isFunction(responseInterceptorsCatchHook)
                    ) {
                        reject(await responseInterceptorsCatchHook(mergeOptions, err))
                        return
                    }
                    reject(err)
                }
            })
        })
    }
    /**
     * @description 请求函数
     */
    async request(options: RequestOptions, config?: Partial<RequestConfig>): Promise<any> {
        let mergeOptions: RequestOptions = merge({}, this.options.requestOptions, options)
        const mergeConfig: RequestConfig = merge({}, this.options, config)
        const { requestInterceptorsHook, responseInterceptorsHook, responseInterceptorsCatchHook } =
            mergeConfig.requestHooks || {}
        if (requestInterceptorsHook && isFunction(requestInterceptorsHook)) {
            mergeOptions = requestInterceptorsHook(mergeOptions, mergeConfig)
        }
        return new Promise((resolve, reject) => {
            const requestTask = uni.request({
                ...mergeOptions,
                async success(response) {
                    if (responseInterceptorsHook && isFunction(responseInterceptorsHook)) {
                        try {
                            response = await responseInterceptorsHook(response, mergeConfig)
                            resolve(response)
                        } catch (error) {
                            reject(error)
                        }
                        return
                    }
                    resolve(response)
                },
                fail: async (err) => {
                    if (err.errMsg == RequestErrMsgEnum.TIMEOUT) {
                        this.retryRequest(mergeOptions, mergeConfig)
                            .then((res) => resolve(res))
                            .catch((err) => reject(err))
                        return
                    }

                    if (
                        responseInterceptorsCatchHook &&
                        isFunction(responseInterceptorsCatchHook)
                    ) {
                        reject(await responseInterceptorsCatchHook(mergeOptions, err))
                        return
                    }
                    reject(err)
                },
                complete(err) {
                    if (err.errMsg !== RequestErrMsgEnum.ABORT) {
                        requestCancel.remove(options.url)
                    }
                }
            })
            const { ignoreCancel } = mergeConfig
            !ignoreCancel && requestCancel.add(options.url, requestTask)
        })
    }
}
