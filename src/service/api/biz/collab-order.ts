import { request } from '@/service/request';

const BASE_URL = '/biz/collab/order';

export interface CollabOrderFileVO {
  id?: string | number;
  fileType?: string;
  fileId?: string | number;
  visibleToSender?: string | boolean;
  visibleToReceiver?: string | boolean;
}

export type CollabFileId = string | number;

export type CollabPrintStatus = 'WAIT_PRINT' | 'PRINTING' | 'PRINT_COMPLETED';

export interface CollabPrintStatusSyncParams {
  printStatus: CollabPrintStatus;
  remark?: string;
}

export interface CollabDeliveryParams {
  logisticsCompany: string;
  logisticsNo: string;
  fileIds?: CollabFileId[];
  remark?: string;
}


export interface CollabOrderVO {
  id?: string | number;
  collabOrderNo?: string;

  sourceType?: string;
  publicPoolFlag?: string | boolean;

  senderTenantId?: string;
  senderTenantNameSnapshot?: string;
  receiverTenantId?: string;
  receiverTenantNameSnapshot?: string;

  serviceType?: string;
  materialPackageType?: string;

  sourceOrderId?: string | number;
  sourceOrderNoSnapshot?: string;
  sourceCustomerNameSnapshot?: string;
  sourceOrderStatusSnapshot?: string;

  senderRepairFeeAmount?: string | number | null;
  title?: string;
  requirementDesc?: string;

  status?: string;
  materialStatus?: string;
  senderReviewStatus?: string;
  receiverInternalReviewStatus?: string;
  printStatus?: string;
  deliveryStatus?: string;
  paymentStatus?: string;

  internalBillSyncStatus?: string;
  internalPaymentSyncStatus?: string;
  collabCostSyncStatus?: string;

  receiverOrderId?: string | number;
  receiverOrderNoSnapshot?: string;

  acceptTime?: string;
  rejectTime?: string;
  rejectReason?: string;
  deliveredTime?: string;
  logisticsCompany?: string;
  logisticsNo?: string;
  completedTime?: string;
  createTime?: string;

  printStatusUpdateTime?: string;
  printCompletedTime?: string;
  printRemark?: string;

  deliveryRemark?: string;

}

export interface CollabOrderDetailVO {
  order?: CollabOrderVO;
  files?: CollabOrderFileVO[];
}

export interface CollabOrderSendBO {
  sourceOrderId?: string | number;
  receiverTenantId?: string;
  serviceType?: string;
  materialPackageType?: string;
  senderRepairFeeAmount?: number | string | null;
  title?: string;
  requirementDesc?: string;
  remark?: string;
  files?: CollabOrderFileVO[];
}


export interface CollabOrderEventVO {
  id?: string | number;
  collabOrderId?: string | number;
  collabOrderNoSnapshot?: string;

  eventType?: string;
  eventName?: string;
  eventContent?: string;
  attachmentsJson?: string;

  operatorTenantId?: string;
  operatorTenantNameSnapshot?: string;
  operatorUserId?: string | number;
  operatorUserName?: string;

  createTime?: string;
}

export interface CollabPrintStatusSyncParams {
  printStatus: 'WAIT_PRINT' | 'PRINTING' | 'PRINT_COMPLETED';
  remark?: string;
}

export interface CollabDeliveryParams {
  logisticsCompany: string;
  logisticsNo: string;
  fileIds?: CollabFileId[];
  remark?: string;
}


export function sendCollabOrder(data: CollabOrderSendBO) {
  return request<any>({
    url: `${BASE_URL}/send`,
    method: 'post',
    data
  });
}

export function fetchSentCollabOrders(params: any) {
  return request<any>({
    url: `${BASE_URL}/sent/list`,
    method: 'get',
    params
  });
}

export function fetchReceivedCollabOrders(params: any) {
  return request<any>({
    url: `${BASE_URL}/received/list`,
    method: 'get',
    params
  });
}

export function fetchCollabOrderDetail(id: string | number) {
  return request<any>({
    url: `${BASE_URL}/${id}`,
    method: 'get'
  });
}

export function acceptCollabOrder(id: string | number) {
  return request<any>({
    url: `${BASE_URL}/${id}/accept`,
    method: 'post'
  });
}

export function rejectCollabOrder(id: string | number, data: { reason: string }) {
  return request<any>({
    url: `${BASE_URL}/${id}/reject`,
    method: 'post',
    data
  });
}
export function submitCollabHdReview(id: string | number, data: { fileIds: CollabFileId[]; comment?: string }) {
  return request<any>({
    url: `${BASE_URL}/${id}/submit-hd-review`,
    method: 'post',
    data
  });
}

export function reviewCollabHd(
  id: string | number,
  data: {
    result: 'APPROVE' | 'REJECT';
    comment?: string;
  }
) {
  return request<any>({
    url: `${BASE_URL}/${id}/hd-review`,
    method: 'post',
    data
  });
}

export function submitCollabEffectReview(id: string | number, data: { fileIds: CollabFileId[]; comment?: string }) {
  return request<any>({
    url: `${BASE_URL}/${id}/submit-effect-review`,
    method: 'post',
    data
  });
}

export function reviewCollabEffect(
  id: string | number,
  data: {
    result: 'APPROVE' | 'REJECT';
    comment?: string;
  }
) {
  return request<any>({
    url: `${BASE_URL}/${id}/effect-review`,
    method: 'post',
    data
  });
}

export function fetchCollabOrderEvents(id: string | number) {
  return request<any>({
    url: `${BASE_URL}/${id}/events`,
    method: 'get'
  });
}


export function syncCollabPrintStatus(id: string | number, data: CollabPrintStatusSyncParams) {
  return request({
    url: `${BASE_URL}/${id}/sync-print-status`,
    method: 'post',
    data
  });
}


export function deliveryCollabOrder(id: string | number, data: CollabDeliveryParams) {
  return request({
    url: `${BASE_URL}/${id}/delivery`,
    method: 'post',
    data
  });
}

const COLLAB_ORDER_BASE_URL = '/biz/collab/order';

export interface CollabSourceOrderQuery {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
  routeSummaryMode?: string;
  [key: string]: any;
}

export interface CollabSourceOrderVo {
  id?: string | number;
  orderNo?: string;
  orderNoSnapshot?: string;
  customerName?: string;
  customerNameSnapshot?: string;
  serviceType?: string;
  businessStatus?: string;
  routeSummaryMode?: string;
  [key: string]: any;
}

export interface CollabOrderFileParam {
  fileType: string;
  fileId: string | number;
}

export interface SendCollabOrderByStageRouteParams {
  sourceOrderId: string | number;
  sourceStageRouteIds: Array<string | number>;

  /**
   * REPAIR_STAGE / PRINT_STAGE / REPAIR_PRINT_STAGE
   */
  collabScope: string;

  receiverTenantId: string;

  /**
   * REPAIR_ONLY / PRINT_ONLY / REPAIR_PRINT
   */
  serviceType: string;

  /**
   * RAW_PHOTO / HD_PHOTO / HD_PHOTO_AI_MODEL
   */
  materialPackageType: string;

  senderRepairFeeAmount?: number | null;
  title?: string;
  requirementDesc?: string;

  files?: CollabOrderFileParam[];
}

/**
 * 协作发单源订单列表。
 *
 * 如果你后端旧接口不是 /source-orders，
 * 把这里 url 改成你已有的源订单接口即可。
 */
export function fetchCollabSourceOrders(params?: CollabSourceOrderQuery) {
  return request<any>({
    url: `${COLLAB_ORDER_BASE_URL}/source-orders`,
    method: 'get',
    params
  });
}

/**
 * 按工序路由发起协作单。
 */
export function sendCollabOrderByStageRoute(data: SendCollabOrderByStageRouteParams) {
  return request<any>({
    url: `${COLLAB_ORDER_BASE_URL}/send-by-stage-route`,
    method: 'post',
    data
  });
}

