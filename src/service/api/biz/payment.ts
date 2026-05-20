import { request } from '@/service/request';

const BASE_URL = '/biz/payment';

export interface PaymentRecordVO {
  id?: string | number;
  paymentNo?: string;
  customerId?: string | number;
  customerNameSnapshot?: string;
  billId?: string | number;
  billNoSnapshot?: string;
  paymentType?: string;
  payAmount?: number;
  allocatedAmount?: number;
  unusedAmount?: number;
  payMethod?: string;
  payTime?: string;
  payerName?: string;
  transactionNo?: string;
  proofFileIds?: string;
  status?: string;
  operatorName?: string;
  remark?: string;
  createTime?: string;
  cancelTime?: string;
  cancelReason?: string;
  refundedAmount?: number;
  refundStatus?: string;

}

export function payCustomerBill(billId: string | number, data: any) {
  return request<any>({
    url: `${BASE_URL}/bill/${billId}/pay`,
    method: 'post',
    data
  });
}

export function recordCustomerPrepayment(data: any) {
  return request<any>({
    url: `${BASE_URL}/prepayment`,
    method: 'post',
    data
  });
}

export function offsetCustomerBillByBalance(billId: string | number, data: any) {
  return request<any>({
    url: `${BASE_URL}/bill/${billId}/balance-offset`,
    method: 'post',
    data
  });
}

export function cancelPayment(id: string | number, data: any) {
  return request<any>({
    url: `${BASE_URL}/${id}/cancel`,
    method: 'post',
    data
  });
}
