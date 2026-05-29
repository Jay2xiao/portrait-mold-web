import { request } from '@/service/request';

export interface BizTenantResourceUsageLogVO {
  id?: string | number;
  fileId?: string | number;
  usageType?: string;
  bytes?: number;
  periodMonth?: string;
  bizType?: string;
  bizId?: string | number;
  operatorId?: string | number;
  remark?: string;
  createTime?: string;
}

export function fetchTenantResourceUsageLogList(params: any) {
  return request<any>({
    url: '/resource/tenantResourceUsageLog/list',
    method: 'get',
    params
  });
}

export function fetchTenantResourceUsageLogDetail(id: string | number) {
  return request<any>({
    url: `/resource/tenantResourceUsageLog/${id}`,
    method: 'get'
  });
}
