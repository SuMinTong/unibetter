
import { useUserStore } from "@/stores/user"
import { upLoadConfig } from "@/utils/config"
// 定义 UniApp 文件类型
interface UniFile {
  path: string
  size: number
  name: string
  type: string
  /** @deprecated */
  originalFileObj?: File
}

interface UploadFile {
  name: string
  size: number
  type: string
  path: string
}

interface FileItem {
  file: UploadFile
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  response?: any
  error?: string
}

interface UploadConfig {
  url: string
  header?: Record<string, string>
  formData?: Record<string, any>
  maxSize?: number // 单位MB
  accept?: string // 文件类型 如 'image/*'
  multiple?: boolean
  concurrent?: number
}

export function useFileUpload(config: UploadConfig) {
  // 上传状态
  const files: Ref<FileItem[]> = ref([])
  const isUploading = ref(false)
  const error = ref<string | null>(null)

  // 选择文件
  const chooseFile = async () => {
    try {
      const res = await uni.chooseFile({
        count: config.multiple ? 9 : 1,
        type: 'all',
        extension: config.accept ? [config.accept] : undefined
      })

      // 类型断言处理
      const tempFiles = res.tempFiles as UniFile[]

      const validFiles = tempFiles.filter((file: UniFile) => {
        const maxSizeBytes = (config.maxSize || 10) * 1024 * 1024
        if (file.size > maxSizeBytes) {
          throw new Error(`文件大小不能超过 ${config.maxSize}MB`)
        }
        return true
      })

      files.value = [
        ...files.value,
        ...validFiles.map((file: UniFile): FileItem => ({
          file: {
            name: file.name,
            size: file.size,
            type: file.type,
            path: file.path
          },
          progress: 0,
          status: 'pending'
        }))
      ]

      error.value = null
    } catch (err) {
      error.value = (err as Error).message
      throw err
    }
  }

  // 执行上传
  const upload = async () => {
    isUploading.value = true
    error.value = null

    try {
      const uploadPromises = files.value
        .filter(f => f.status === 'pending')
        .map(file => singleUpload(file))

      await Promise.all(uploadPromises)
    } catch (err) {
      error.value = (err as Error).message
      throw err
    } finally {
      isUploading.value = false
    }
  }

  // 单个文件上传
  const singleUpload = async (fileItem: FileItem) => {
    const index = files.value.findIndex(f => f === fileItem)
    if (index === -1) return
    const { token } = useUserStore()
    files.value[index].status = 'uploading'

    try {
      const task = uni.uploadFile({
        url: upLoadConfig.baseUrl,
        filePath: fileItem.file.path,
        name: 'file',
        header: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
          ...config.header
        },
        formData: config.formData,
        success: (res) => {
          if (res.statusCode >= 400) {
            throw new Error(`上传失败: ${res.data}`)
          }
          files.value[index].response = JSON.parse(res.data)
          files.value[index].status = 'success'
        },
        fail: (err) => {
          throw new Error(`上传失败: ${err.errMsg}`)
        }
      })

      // 进度监听
      task.onProgressUpdate(({ progress }) => {
        files.value[index].progress = progress
      })

      await task
    } catch (err) {
      files.value[index].status = 'error'
      files.value[index].error = (err as Error).message
      throw err
    }
  }

  // 取消上传
  const cancelUpload = () => {
    // 需要维护任务列表实现取消功能
    isUploading.value = false
  }

  // 重置状态
  const reset = () => {
    files.value = []
    isUploading.value = false
    error.value = null
  }

  return {
    files,
    isUploading,
    error,
    chooseFile,
    upload,
    cancelUpload,
    reset
  }
}