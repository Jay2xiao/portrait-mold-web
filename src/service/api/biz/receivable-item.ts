import { request } from '@/service/request';

const BASE_URL = '/biz/receivable-item';

export interface ReceivableItemVO {
  id?: string | number;
  customerId?: string | number;
  customerNameSnapshot?: string;
  orderId?: string | number;
  orderNoSnapshot?: string;
  itemType?: string;
  itemName?: string;
  sourceType?: string;
  sourceId?: string | number;
  amount?: number;
  paidAmount?: number;
  unpaidAmount?: number;
  confirmStatus?: string;
  billStatus?: string;
  payStatus?: string;
  status?: string;
  billId?: string | number;
  billNoSnapshot?: string;
  confirmTime?: string;
  createTime?: string;
  remark?: string;
}

export function fetchReceivableItemList(params: any) {
  return request<any>({
    url: `${BASE_URL}/list`,
    method: 'get',
    params
  });
}

export function fetchUnbilledReceivableItems(params: any) {
  return request<any>({
    url: `${BASE_URL}/unbilled`,
    method: 'get',
    params
  });
}
