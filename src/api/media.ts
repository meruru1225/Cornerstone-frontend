import request from './request'

export interface MediaUploadData {
  duration: number
  height: number
  mime: string
  original: string
  size: number
  url: string
  width: number
}

/**
 * 上传媒体文件（帖子/评论）
 * @param file 文件对象
 */
export function uploadMediaApi(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  
  return request({
    url: '/media/upload',
    method: 'post',
    data: formData,
    timeout: 60000,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
