import { request } from '@/service/request';

const BASE_URL = '/biz/customer-account';

export interface CustomerAccountVO {
  id?: string | number;
  customerId?: string | number;
  customerNameSnapshot?: string;
  balanceAmount?: number;
  totalPrepayAmount?: number;
  totalConsumeAmount?: number;
  totalRefundAmount?: number;
  status?: string;
  createTime?: string;
  remark?: string;
}

export interface CustomerAccountLedgerVO {
  id?: string | number;
  customerId?: string | number;
  changeType?: string;
  changeAmount?: number;
  beforeBalance?: number;
  afterBalance?: number;
  sourceType?: string;
  sourceId?: string | number;
  sourceNo?: string;
  createTime?: string;
  remark?: string;
}

export function fetchCustomerAccountList(params: any) {
  return request<any>({
    url: `${BASE_URL}/list`,
    method: 'get',
    params
  });
}

export function fetchCustomerAccountByCustomerId(customerId: string | number) {
  return request<any>({
    url: `${BASE_URL}/customer/${customerId}`,
    method: 'get'
  });
}

export function fetchCustomerAccountLedgerList(params: any) {
  return request<any>({
    url: `${BASE_URL}/ledger-list`,
    method: 'get',
    params
  });
}
