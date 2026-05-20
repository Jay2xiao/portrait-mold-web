import { request } from '@/service/request';

const BASE_URL = '/biz/staff-performance-adjustment';

export interface StaffPerformanceAdjustmentVO {
  id?: string | number;
  adjustmentNo?: string;
  settlementType?: string;
  adjustSource?: string;
  adjustmentDate?: string;

  userId?: string | number;
  userName?: string;

  orderId?: string | number;
  orderNoSnapshot?: string;

  beforePerformanceAmount?: number;
  afterPerformanceAmount?: number;
  adjustAmount?: number;

  relatedReceivableAmount?: number;
  relatedProfitAmount?: number;

  settleStatus?: string;
  settlementId?: string | number;
  settlementNoSnapshot?: string;

  status?: string;
  reason?: string;
  createTime?: string;
}

export interface StaffPerformanceUserOptionVO {
  settlementType?: string;
  userId?: string | number;
  userName?: string;
}

export function fetchPerformanceAdjustmentPendingList(params: any) {
  return request<any>({
    url: `${BASE_URL}/pending-list`,
    method: 'get',
    params
  });
}

export function fetchPerformanceAdjustmentList(params: any) {
  return request<any>({
    url: `${BASE_URL}/list`,
    method: 'get',
    params
  });
}

export function createManualPerformanceAdjustment(data: any) {
  return request<any>({
    url: `${BASE_URL}/manual`,
    method: 'post',
    data
  });
}

export function cancelPerformanceAdjustment(id: string | number, data: any) {
  return request<any>({
    url: `${BASE_URL}/${id}/cancel`,
    method: 'post',
    data
  });
}

export function createAdjustmentPerformanceSettlement(data: any) {
  return request<any>({
    url: `${BASE_URL}/settlement/create`,
    method: 'post',
    data
  });
}

export function fetchPerformanceUserOptions(params: { settlementType: string }) {
  return request<any>({
    url: `${BASE_URL}/user-options`,
    method: 'get',
    params
  });
}
