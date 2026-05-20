import { request } from '@/service/request';

const BASE_URL = '/biz/staff-performance-settlement';

export interface StaffPerformancePendingVO {
  settlementType?: string;
  userId?: string | number;
  userName?: string;
  orderCount?: number;
  totalPerformanceAmount?: number;
  totalReceivableAmount?: number;
  totalProfitAmount?: number;
}

export interface StaffPerformanceSettlementVO {
  id?: string | number;
  settlementNo?: string;
  settlementType?: string;
  userId?: string | number;
  userName?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  itemCount?: number;
  totalPerformanceAmount?: number;
  totalReceivableAmount?: number;
  totalProfitAmount?: number;
  status?: string;
  confirmUserName?: string;
  confirmTime?: string;
  cancelReason?: string;
  createTime?: string;
  remark?: string;
  settlementSource?: string;
}

export function fetchPerformancePendingList(params: any) {
  return request<any>({
    url: `${BASE_URL}/pending-list`,
    method: 'get',
    params
  });
}

export function fetchPerformanceSettlementList(params: any) {
  return request<any>({
    url: `${BASE_URL}/list`,
    method: 'get',
    params
  });
}

export function fetchPerformanceSettlementDetail(id: string | number) {
  return request<any>({
    url: `${BASE_URL}/${id}/detail`,
    method: 'get'
  });
}

export function createPerformanceSettlement(data: any) {
  return request<any>({
    url: `${BASE_URL}/create`,
    method: 'post',
    data
  });
}

export function confirmPerformanceSettlement(id: string | number) {
  return request<any>({
    url: `${BASE_URL}/${id}/confirm`,
    method: 'post'
  });
}

export function cancelPerformanceSettlement(id: string | number, data: any) {
  return request<any>({
    url: `${BASE_URL}/${id}/cancel`,
    method: 'post',
    data
  });
}

export function exportPerformanceSettlementExcel(id: string | number) {
  return request<any>({
    url: `${BASE_URL}/${id}/export-excel`,
    method: 'get',
    responseType: 'blob'
  });
}
