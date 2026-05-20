import { request } from '@/service/request';

export interface ResourceSummaryVO {
  tenantId?: string;
  storageQuotaGb?: number;
  storageUsedBytes?: number;
  storageUsedGb?: number;
  storageBillableGb?: number;
  storageUsePercent?: number;
  trafficQuotaGb?: number;
  trafficUsedBytes?: number;
  trafficUsedGb?: number;
  trafficBillableGb?: number;
  trafficUsePercent?: number;
  trafficMonth?: string;
  status?: string;
}

export function fetchResourceSummary() {
  return request<any>({
    url: '/biz/resource/account/summary',
    method: 'get'
  });
}

export function purchaseResource(data: any) {
  return request<any>({
    url: '/biz/resource/purchase',
    method: 'post',
    data
  });
}

export function recalcStorage() {
  return request<any>({
    url: '/biz/resource/recalc-storage',
    method: 'post'
  });
}
