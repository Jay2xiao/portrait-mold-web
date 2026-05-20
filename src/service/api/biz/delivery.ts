import { request } from '@/service/request';

export interface DeliveryRecordVO {
  id?: string | number;
  orderId?: string | number;
  deliveryType?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverProvince?: string;
  receiverCity?: string;
  receiverDistrict?: string;
  receiverAddress?: string;
  expressCompany?: string;
  trackingNo?: string;
  deliveryProofFileIds?: string;
  status?: string;
  deliveryTime?: string;
  completeTime?: string;
  operatorName?: string;
  remark?: string;
}

export function deliverOrder(orderId: string | number, data: any) {
  return request<any>({
    url: `/biz/delivery/order/${orderId}/deliver`,
    method: 'post',
    data
  });
}

export function completeOrder(orderId: string | number, data?: any) {
  return request<any>({
    url: `/biz/delivery/order/${orderId}/complete`,
    method: 'post',
    data
  });
}

export function fetchDeliveryRecords(orderId: string | number) {
  return request<any>({
    url: `/biz/delivery/order/${orderId}/records`,
    method: 'get'
  });
}
