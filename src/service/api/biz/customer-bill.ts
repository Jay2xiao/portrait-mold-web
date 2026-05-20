import { request } from '@/service/request';

const BASE_URL = '/biz/customer-bill';

export interface CustomerBillVO {
  id?: string | number;
  billNo?: string;
  customerId?: string | number;
  customerNameSnapshot?: string;
  customerPhoneSnapshot?: string;
  billType?: string;
  billDate?: string;
  dueDate?: string;
  totalAmount?: number;
  paidAmount?: number;
  unpaidAmount?: number;
  itemCount?: number;
  payStatus?: string;
  billStatus?: string;
  confirmTime?: string;
  operatorName?: string;
  remark?: string;
  createTime?: string;
}

export interface CustomerBillItemVO {
  id?: string | number;
  billId?: string | number;
  receivableItemId?: string | number;
  orderId?: string | number;
  orderNoSnapshot?: string;
  itemType?: string;
  itemName?: string;
  amount?: number;
  paidAmount?: number;
  unpaidAmount?: number;
  payStatus?: string;
  remark?: string;
}

export function fetchCustomerBillList(params: any) {
  return request<any>({
    url: `${BASE_URL}/list`,
    method: 'get',
    params
  });
}

export function createCustomerBill(data: any) {
  return request<any>({
    url: `${BASE_URL}/create`,
    method: 'post',
    data
  });
}

export function confirmCustomerBill(id: string | number) {
  return request<any>({
    url: `${BASE_URL}/${id}/confirm`,
    method: 'post'
  });
}

export function cancelCustomerBill(id: string | number, reason?: string) {
  return request<any>({
    url: `${BASE_URL}/${id}/cancel`,
    method: 'post',
    data: {
      reason
    }
  });
}

export function fetchCustomerBillDetail(id: string | number) {
  return request<any>({
    url: `${BASE_URL}/${id}/detail`,
    method: 'get'
  });
}
