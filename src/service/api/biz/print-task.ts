import { request } from '@/service/request';

export interface PrintTaskQuery {
  pageNum?: number;
  pageSize?: number;
  taskNo?: string;
  orderId?: string | number;
  orderNoSnapshot?: string;
  customerNameSnapshot?: string;
  productNameSnapshot?: string;
  orderType?: string;
  printerUserId?: string | number;
  status?: string;
}

export interface PrintTaskVO {
  id?: string | number;
  taskNo?: string;
  orderId?: string | number;
  orderNoSnapshot?: string;
  customerNameSnapshot?: string;
  productNameSnapshot?: string;
  orderType?: string;
  priority?: string;
  expectedDeliveryTime?: string;

  inputModelFileIds?: string;

  printerUserId?: string | number;
  printerName?: string;

  status?: string;

  qcResult?: string;
  qcReason?: string;
  qcAttachmentFileIds?: string;

  estimateAmount?: number;
  depositAmount?: number;
  finalAmount?: number;

  finishPhotoFileIds?: string;

  claimTime?: string;
  startTime?: string;
  finishTime?: string;

  remark?: string;
  createTime?: string;

  entityWeightG?: number;
  supportWeightG?: number;
  entityUnitPrice?: number;
  supportUnitPrice?: number;
  basePrintFee?: number;
  postProcessFee?: number;
  entityWeightPhotoFileIds?: string;
  supportWeightPhotoFileIds?: string;
  materialRecordTime?: string;

}

export function fetchPrintTaskList(params: PrintTaskQuery) {
  return request<any>({
    url: '/biz/print-task/list',
    method: 'get',
    params
  });
}

export function fetchPrintHallList(params: PrintTaskQuery) {
  return request<any>({
    url: '/biz/print-task/hall/list',
    method: 'get',
    params
  });
}

export function fetchMyPrintTaskList(params: PrintTaskQuery) {
  return request<any>({
    url: '/biz/print-task/my/list',
    method: 'get',
    params
  });
}

export function fetchPrintTaskDetail(id: string | number) {
  return request<any>({
    url: `/biz/print-task/${id}`,
    method: 'get'
  });
}

export function createPrintTaskFromOrder(data: any) {
  return request<any>({
    url: '/biz/print-task/from-order',
    method: 'post',
    data
  });
}

export function qcPrintTask(id: string | number, data: any) {
  return request<any>({
    url: `/biz/print-task/${id}/qc`,
    method: 'post',
    data
  });
}

export function assignPrintTask(id: string | number, data: any) {
  return request<any>({
    url: `/biz/print-task/${id}/assign`,
    method: 'post',
    data
  });
}

export function reassignPrintTask(id: string | number, data: any) {
  return request<any>({
    url: `/biz/print-task/${id}/reassign`,
    method: 'post',
    data
  });
}

export function withdrawPrintTask(id: string | number, data?: any) {
  return request<any>({
    url: `/biz/print-task/${id}/withdraw`,
    method: 'post',
    data
  });
}

export function claimPrintTask(id: string | number) {
  return request<any>({
    url: `/biz/print-task/${id}/claim`,
    method: 'post'
  });
}

export function startPrintTask(id: string | number) {
  return request<any>({
    url: `/biz/print-task/${id}/start`,
    method: 'post'
  });
}

export function finishPrintTask(id: string | number, data?: any) {
  return request<any>({
    url: `/biz/print-task/${id}/finish`,
    method: 'post',
    data
  });
}

export function recordPrintMaterial(id: string | number, data: any) {
  return request<any>({
    url: `/biz/print-task/${id}/material-record`,
    method: 'post',
    data
  });
}

export function resubmitPrintOnlyModel(orderId: string | number, data: any) {
  return request<any>({
    url: `/biz/print-task/order/${orderId}/resubmit-print-model`,
    method: 'post',
    data
  });
}

