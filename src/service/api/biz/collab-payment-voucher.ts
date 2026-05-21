import { request } from '@/service/request';

const BASE_URL = '/biz/collab/payment-voucher';

export type CollabId = string | number;

export type CollabPaymentChannel = 'WECHAT' | 'ALIPAY' | 'BANK' | 'CASH' | 'OTHER';

export type CollabVoucherReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type CollabSyncStatus = 'NOT_SYNCED' | 'SYNCED' | 'FAILED';

export interface CollabPaymentVoucherVO {
  id?: CollabId;
  voucherNo?: string;

  collabBillId?: CollabId;
  collabBillNoSnapshot?: string;

  collabOrderId?: CollabId;
  collabOrderNoSnapshot?: string;

  payerTenantId?: string;
  payerTenantNameSnapshot?: string;
  payeeTenantId?: string;
  payeeTenantNameSnapshot?: string;

  paymentAmount?: number;
  paymentChannel?: CollabPaymentChannel | string;
  paymentTime?: string;
  payerName?: string;
  transactionNo?: string;
  proofFileIds?: string;

  reviewStatus?: CollabVoucherReviewStatus | string;
  reviewRemark?: string;
  reviewerTenantId?: string;
  reviewerUserId?: CollabId;
  reviewerName?: string;
  reviewTime?: string;

  receiverInternalPaymentId?: CollabId;
  receiverInternalPaymentNoSnapshot?: string;

  internalPaymentSyncStatus?: CollabSyncStatus | string;
  internalPaymentSyncError?: string;

  collabCostSyncStatus?: CollabSyncStatus | string;
  collabCostSyncError?: string;

  remark?: string;
  createTime?: string;
  updateTime?: string;
}

export interface CollabPaymentVoucherQueryParams {
  collabBillId?: CollabId;
  collabOrderId?: CollabId;
  reviewStatus?: string;
  paymentChannel?: string;
  keyword?: string;
  pageNum?: number;
  pageSize?: number;
}

export interface CollabPaymentVoucherUploadParams {
  collabBillId: CollabId;
  paymentAmount: number;
  paymentChannel: CollabPaymentChannel;
  paymentTime?: string;
  payerName?: string;
  transactionNo?: string;
  fileIds: CollabId[];
  remark?: string;
}

export interface CollabPaymentVoucherApproveParams {
  reviewRemark?: string;
}

export interface CollabPaymentVoucherRejectParams {
  reviewRemark: string;
}

export interface CollabPaymentSyncResultVO {
  success?: boolean;
  message?: string;
  voucherId?: CollabId;
  receiverInternalPaymentId?: CollabId;
  receiverInternalPaymentNo?: string;
  internalPaymentSyncStatus?: string;
  collabCostSyncStatus?: string;
}

/**
 * 查询付款凭证列表
 */
export function fetchCollabPaymentVoucherList(params?: CollabPaymentVoucherQueryParams) {
  return request<any>({
    url: `${BASE_URL}/list`,
    method: 'get',
    params
  });
}

/**
 * 查询付款凭证详情
 */
export function fetchCollabPaymentVoucherDetail(id: CollabId) {
  return request<CollabPaymentVoucherVO>({
    url: `${BASE_URL}/${id}`,
    method: 'get'
  });
}

/**
 * 根据协作账单查询付款凭证
 */
export function fetchCollabPaymentVouchersByBill(collabBillId: CollabId) {
  return request<CollabPaymentVoucherVO[]>({
    url: `${BASE_URL}/by-bill/${collabBillId}`,
    method: 'get'
  });
}

/**
 * 发单方上传付款凭证
 */
export function uploadCollabPaymentVoucher(data: CollabPaymentVoucherUploadParams) {
  return request<CollabId>({
    url: `${BASE_URL}/upload`,
    method: 'post',
    data
  });
}

/**
 * 接单方审核通过付款凭证
 */
export function approveCollabPaymentVoucher(id: CollabId, data?: CollabPaymentVoucherApproveParams) {
  return request<boolean>({
    url: `${BASE_URL}/${id}/approve`,
    method: 'post',
    data: data || {}
  });
}

/**
 * 接单方驳回付款凭证
 */
export function rejectCollabPaymentVoucher(id: CollabId, data: CollabPaymentVoucherRejectParams) {
  return request<boolean>({
    url: `${BASE_URL}/${id}/reject`,
    method: 'post',
    data
  });
}

/**
 * 重试内部收款和外协成本同步
 */
export function resyncCollabPayment(id: CollabId) {
  return request<CollabPaymentSyncResultVO>({
    url: `${BASE_URL}/${id}/resync-payment`,
    method: 'post'
  });
}
