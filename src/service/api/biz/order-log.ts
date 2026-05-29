import { request } from '@/service/request';

export interface BizOrderLogVO {
  id?: string | number;
  orderId?: string | number;
  actionType?: string;
  fromStatus?: string;
  toStatus?: string;
  operatorId?: string | number;
  operatorName?: string;
  content?: string;
  createTime?: string;
}

export function fetchOrderLogList(params: any) {
  return request<any>({
    url: '/biz/orderLog/list',
    method: 'get',
    params
  });
}

export function fetchOrderLogDetail(id: string | number) {
  return request<any>({
    url: `/biz/orderLog/${id}`,
    method: 'get'
  });
}
