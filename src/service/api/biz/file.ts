import { request } from '@/service/request';

export interface FileAssetVO {
  id?: string | number;
  originalName?: string;
  fileName?: string;
  fileExt?: string;
  contentType?: string;
  sizeBytes?: number;
  thumbSizeBytes?: number;
  bizType?: string;
  bizId?: string | number;
  orderId?: string | number;
  taskId?: string | number;
  fileStage?: string;
  fileType?: string;
  uploadTime?: string;
  storageType?: string;
}

export function uploadLocalFile(data: FormData) {
  return request<any>({
    url: '/biz/file/local/upload',
    method: 'post',
    data
  });
}

export function bindFiles(data: any) {
  return request<any>({
    url: '/biz/file/bind',
    method: 'post',
    data
  });
}

export function fetchFilesByIds(ids: string) {
  return request<any>({
    url: '/biz/file/by-ids',
    method: 'get',
    params: { ids }
  });
}

export function fetchFileList(params: any) {
  return request<any>({
    url: '/biz/file/list',
    method: 'get',
    params
  });
}

export function previewFileBlob(id: string | number) {
  return request<Blob>({
    url: `/biz/file/${id}/preview`,
    method: 'get',
    responseType: 'blob' as any
  });
}

export function thumbnailFileBlob(id: string | number) {
  return request<Blob>({
    url: `/biz/file/${id}/thumbnail`,
    method: 'get',
    responseType: 'blob' as any
  });
}

export function downloadFileBlob(id: string | number) {
  return request<Blob>({
    url: `/biz/file/${id}/download`,
    method: 'get',
    responseType: 'blob' as any
  });
}

export function fetchUploadConfig() {
  return request<any>({
    url: '/biz/file/upload-config',
    method: 'get'
  });
}

export function fetchQiniuUploadToken(data: any) {
  return request<any>({
    url: '/biz/file/qiniu/upload-token',
    method: 'post',
    data
  });
}

export function completeQiniuUpload(data: any, config: Record<string, any> = {}) {
  return request<any>({
    url: '/biz/file/qiniu/complete',
    method: 'post',
    data,
    ...config
  });
}

export function fetchFileAccessUrl(id: string | number, scene: 'THUMBNAIL' | 'PREVIEW' | 'DOWNLOAD') {
  return request<any>({
    url: `/biz/file/${id}/access-url`,
    method: 'get',
    params: { scene }
  });
}
