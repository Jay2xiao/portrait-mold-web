import { request } from '@/service/request';

const BASE_URL = '/biz/workflowAuditorConfig';

export interface AuditorConfigQuery {
  pageNum?: number;
  pageSize?: number;
  nodeCode?: string;
  auditorType?: string;
  status?: string;
}

export interface AuditorConfigVO {
  id?: string | number;
  nodeCode?: string;
  nodeName?: string;
  auditorType?: string;
  auditorValue?: string;
  status?: string;
  isDefault?: string;
  sortNum?: number;
  remark?: string;
  createTime?: string;
}

export type AuditorConfigForm = Partial<AuditorConfigVO>;

export function fetchAuditorConfigList(params: AuditorConfigQuery) {
  return request<any>({
    url: `${BASE_URL}/list`,
    method: 'get',
    params
  });
}

export function addAuditorConfig(data: AuditorConfigForm) {
  return request<any>({
    url: BASE_URL,
    method: 'post',
    data
  });
}

export function updateAuditorConfig(data: AuditorConfigForm) {
  return request<any>({
    url: BASE_URL,
    method: 'put',
    data
  });
}

export function deleteAuditorConfig(ids: string | number | Array<string | number>) {
  return request<any>({
    url: `${BASE_URL}/${ids}`,
    method: 'delete'
  });
}

export function fetchAuditorRoleOptions() {
  return request<any>({
    url: `${BASE_URL}/role-options`,
    method: 'get'
  });
}

export function fetchAuditorUserOptions() {
  return request<any>({
    url: `${BASE_URL}/user-options`,
    method: 'get'
  });
}

export function fetchAuditorDeptOptions() {
  return request<any>({
    url: `${BASE_URL}/dept-options`,
    method: 'get'
  });
}

