import { request } from '@/service/request';

export interface BizTenantResourceOrderVO {
  id?: string | number;
  packageType?: string;
  packageGb?: number;
  amount?: number;
  periodStart?: string;
  periodEnd?: string;
  status?: string;
  remark?: string;
  createTime?: string;
}

export function fetchTenantResourceOrderList(params: any) {
  return request<any>({
    url: '/resource/tenantResourceOrder/list',
    method: 'get',
    params
  });
}

export function fetchTenantResourceOrderDetail(id: string | number) {
  return request<any>({
    url: `/resource/tenantResourceOrder/${id}`,
    method: 'get'
  });
}
