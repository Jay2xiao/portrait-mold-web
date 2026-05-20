import { request } from '@/service/request';

export interface CustomerQuery {
  pageNum?: number;
  pageSize?: number;
  customerNo?: string;
  customerName?: string;
  phone?: string;
  wechatNo?: string;
  sourceType?: string;
  status?: string;
}

export interface CustomerVO {
  id?: string | number;
  customerNo?: string;
  customerName?: string;
  phone?: string;
  wechatNo?: string;
  address?: string;
  sourceType?: string;
  tags?: string;
  totalOrderCount?: number;
  totalAmount?: number;
  unpaidAmount?: number;
  status?: string;
  remark?: string;
  createTime?: string;

  settlementType?: string;
  allowUnpaidDelivery?: string;
  settlementCycleDays?: number;
  creditLimit?: number;
}

export type CustomerForm = Partial<CustomerVO>;

export function fetchCustomerList(params: CustomerQuery) {
  return request<any>({
    url: '/biz/customer/list',
    method: 'get',
    params
  });
}

export function fetchCustomerDetail(id: string | number) {
  return request<any>({
    url: `/biz/customer/${id}`,
    method: 'get'
  });
}

export function addCustomer(data: CustomerForm) {
  return request<any>({
    url: '/biz/customer',
    method: 'post',
    data
  });
}

export function updateCustomer(data: CustomerForm) {
  return request<any>({
    url: '/biz/customer',
    method: 'put',
    data
  });
}

export function deleteCustomer(ids: string | number | Array<string | number>) {
  return request<any>({
    url: `/biz/customer/${ids}`,
    method: 'delete'
  });
}

export function fetchDuplicateCustomer(params: CustomerForm) {
  return request<any>({
    url: '/biz/customer/duplicate',
    method: 'get',
    params
  });
}
