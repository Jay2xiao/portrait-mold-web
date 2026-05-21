import { request } from '@/service/request';

const BASE_URL = '/biz/collab/bill';

export type CollabId = string | number;

export type CollabBillStatus = 'DRAFT' | 'SENT' | 'CANCELLED';

export type CollabBillPayStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export type CollabSyncStatus = 'NOT_SYNCED' | 'SYNCED' | 'FAILED';

export interface CollabBillVO {
  id?: CollabId;
  collabBillNo?: string;

  collabOrderId?: CollabId;
  collabOrderNoSnapshot?: string;

  senderTenantId?: string;
  senderTenantNameSnapshot?: string;
  receiverTenantId?: string;
  receiverTenantNameSnapshot?: string;

  sourceOrderId?: CollabId;
  sourceOrderNoSnapshot?: string;
  receiverOrderId?: CollabId;
  receiverOrderNoSnapshot?: string;

  billTitle?: string;
  billAmount?: number;
  paidAmount?: number;
  unpaidAmount?: number;
  billItemsJson?: string;

  billStatus?: CollabBillStatus | string;
  payStatus?: CollabBillPayStatus | string;

  dueDate?: string;

  receiverInternalCustomerId?: CollabId;
  receiverInternalReceivableItemId?: CollabId;
  receiverInternalBillId?: CollabId;
  receiverInternalBillNoSnapshot?: string;

  internalBillSyncStatus?: CollabSyncStatus | string;
  internalBillSyncError?: string;

  sendTime?: string;
  paidConfirmTime?: string;
  cancelTime?: string;
  cancelReason?: string;

  remark?: string;
  createTime?: string;
  updateTime?: string;
}

export interface CollabBillItemParams {
  itemName: string;
  itemType?: string;
  amount: number;
  remark?: string;
}

export interface CollabBillCreateParams {
  collabOrderId: CollabId;
  billAmount: number;
  billTitle?: string;
  billRemark?: string;
  dueDate?: string;
  items?: CollabBillItemParams[];
}

export interface CollabBillCancelParams {
  reason: string;
}

export interface CollabBillQueryParams {
  collabOrderId?: CollabId;
  billStatus?: string;
  payStatus?: string;
  keyword?: string;
  pageNum?: number;
  pageSize?: number;
}

export interface CollabBillSyncResultVO {
  success?: boolean;
  message?: string;
  collabBillId?: CollabId;
  receiverInternalCustomerId?: CollabId;
  receiverInternalReceivableItemId?: CollabId;
  receiverInternalBillId?: CollabId;
  receiverInternalBillNo?: string;
  syncStatus?: string;
}

/**
 * 查询协作账单列表
 */
export function fetchCollabBillList(params?: CollabBillQueryParams) {
  return request<any>({
    url: `${BASE_URL}/list`,
    method: 'get',
    params
  });
}

/**
 * 查询协作账单详情
 */
export function fetchCollabBillDetail(id: CollabId) {
  return request<CollabBillVO>({
    url: `${BASE_URL}/${id}`,
    method: 'get'
  });
}

/**
 * 根据协作单查询当前账单
 */
export function fetchCollabBillByOrder(collabOrderId: CollabId) {
  return request<CollabBillVO | null>({
    url: `${BASE_URL}/by-order/${collabOrderId}`,
    method: 'get'
  });
}

/**
 * 创建协作账单草稿
 */
export function createCollabBill(data: CollabBillCreateParams) {
  return request<CollabId>({
    url: `${BASE_URL}/create`,
    method: 'post',
    data
  });
}

/**
 * 发送协作账单
 */
export function sendCollabBill(id: CollabId) {
  return request<boolean>({
    url: `${BASE_URL}/${id}/send`,
    method: 'post'
  });
}

/**
 * 作废协作账单
 */
export function cancelCollabBill(id: CollabId, data: CollabBillCancelParams) {
  return request<boolean>({
    url: `${BASE_URL}/${id}/cancel`,
    method: 'post',
    data
  });
}

/**
 * 重试同步接单方内部客户账单
 */
export function resyncCollabInternalBill(id: CollabId) {
  return request<CollabBillSyncResultVO>({
    url: `${BASE_URL}/${id}/resync-internal-bill`,
    method: 'post'
  });
}
