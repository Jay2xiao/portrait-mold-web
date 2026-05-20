import { request } from '@/service/request';

const BASE_URL = '/biz/refund';

export interface RefundRecordVO {
  id?: string | number;
  refundNo?: string;
  customerId?: string | number;
  customerNameSnapshot?: string;
  paymentId?: string | number;
  paymentNoSnapshot?: string;
  billId?: string | number;
  billNoSnapshot?: string;
  refundType?: string;
  refundAmount?: number;
  refundMethod?: string;
  refundTime?: string;
  receiverName?: string;
  transactionNo?: string;
  proofFileIds?: string;
  status?: string;
  reason?: string;
  operatorName?: string;
  createTime?: string;
  remark?: string;
}

export function refundPayment(paymentId: string | number, data: any) {
  return request<any>({
    url: `${BASE_URL}/payment/${paymentId}`,
    method: 'post',
    data
  });
}

export function refundCustomerBalance(data: any) {
  return request<any>({
    url: `${BASE_URL}/customer-balance`,
    method: 'post',
    data
  });
}
