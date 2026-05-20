import { request } from '@/service/request';

const BASE_URL = '/biz/order-adjustment';

export interface OrderAdjustmentVO {
  id?: string | number;
  adjustNo?: string;
  orderId?: string | number;
  orderNoSnapshot?: string;
  customerId?: string | number;
  customerNameSnapshot?: string;
  adjustType?: string;
  itemType?: string;
  adjustAmount?: number;
  beforeJson?: string;
  afterJson?: string;
  reason?: string;
  approveStatus?: string;
  effectStatus?: string;
  operatorName?: string;
  approveUserName?: string;
  approveTime?: string;
  createTime?: string;
  remark?: string;
  beforeAmount?: number;
  afterAmount?: number;
  diffAmount?: number;
}

export function fetchOrderAdjustmentList(params: any) {
  return request<any>({
    url: `${BASE_URL}/list`,
    method: 'get',
    params
  });
}

export function createOrderAmountAdjustment(data: any) {
  return request<any>({
    url: `${BASE_URL}/amount`,
    method: 'post',
    data
  });
}

export function adjustOrderReceivableToAmount(data: any) {
  return request<any>({
    url: `${BASE_URL}/adjust-to`,
    method: 'post',
    data
  });
}
