import { request } from '@/service/request';

const BASE_URL = '/biz/collab/stat';

export interface CollabStatQueryParams {
  beginTime?: string;
  endTime?: string;
  limit?: number;
  granularity?: 'DAY' | 'MONTH';
  trendDays?: number;
}


export interface CollabStatOverviewVO {
  beginTime?: string;
  endTime?: string;

  sentCount?: number;
  receivedCount?: number;

  pendingAcceptCount?: number;
  processingCount?: number;
  waitBillCount?: number;
  billedCount?: number;
  voucherUploadedCount?: number;
  paidConfirmedCount?: number;
  completedCount?: number;
  rejectedCount?: number;

  senderPendingPayCount?: number;
  receiverWaitBillCount?: number;
  receiverVoucherReviewCount?: number;

  syncFailedCount?: number;
}

export interface CollabStatAmountVO {
  beginTime?: string;
  endTime?: string;

  sentBillCount?: number;
  sentBillAmount?: number | string;
  sentPaidAmount?: number | string;
  sentUnpaidAmount?: number | string;

  receivedBillCount?: number;
  receivedBillAmount?: number | string;
  receivedPaidAmount?: number | string;
  receivedUnpaidAmount?: number | string;

  totalBillCount?: number;
  totalBillAmount?: number | string;
  totalPaidAmount?: number | string;
  totalUnpaidAmount?: number | string;
}

export interface CollabStatSyncRiskVO {
  beginTime?: string;
  endTime?: string;

  internalBillSyncFailedCount?: number;
  internalPaymentSyncFailedCount?: number;
  collabCostSyncFailedCount?: number;
  totalSyncFailedCount?: number;

  receiverInternalBillSyncFailedCount?: number;
  receiverInternalPaymentSyncFailedCount?: number;
  senderCollabCostSyncFailedCount?: number;
}

export interface CollabStatTodoItemVO {
  todoType?: string;
  todoTitle?: string;
  todoDesc?: string;
  roleType?: string;

  collabOrderId?: string | number;
  collabOrderNo?: string;
  collabOrderTitle?: string;
  orderStatus?: string;
  paymentStatus?: string;

  partnerTenantId?: string;
  partnerTenantName?: string;

  collabBillId?: string | number;
  collabBillNo?: string;
  billAmount?: number | string;
  billStatus?: string;
  payStatus?: string;

  voucherId?: string | number;
  voucherNo?: string;
  paymentAmount?: number | string;
  reviewStatus?: string;

  createTime?: string;

  actionPage?: 'RECEIVED' | 'SENT' | string;
  actionStatus?: string;
  actionHint?: string;
}

export interface CollabStatRiskItemVO {
  riskType?: string;
  riskTitle?: string;
  riskDesc?: string;
  roleType?: string;

  collabOrderId?: string | number;
  collabOrderNo?: string;
  collabOrderTitle?: string;

  partnerTenantId?: string;
  partnerTenantName?: string;

  collabBillId?: string | number;
  collabBillNo?: string;

  voucherId?: string | number;
  voucherNo?: string;

  syncStatus?: string;
  syncError?: string;

  createTime?: string;

  actionPage?: 'RECEIVED' | 'SENT' | string;
  actionStatus?: string;
  actionHint?: string;
}

export interface CollabStatTrendItemVO {
  period?: string;
  periodLabel?: string;
  beginTime?: string;
  endTime?: string;

  sentOrderCount?: number;
  receivedOrderCount?: number;

  billCount?: number;
  billAmount?: number | string;

  paidAmount?: number | string;

  internalBillSyncFailedCount?: number;
  internalPaymentSyncFailedCount?: number;
  collabCostSyncFailedCount?: number;
  syncFailedCount?: number;
}


/**
 * 协作中心总览统计
 */
export function fetchCollabStatOverview(params?: CollabStatQueryParams) {
  return request<CollabStatOverviewVO>({
    url: `${BASE_URL}/overview`,
    method: 'get',
    params
  });
}

/**
 * 协作中心金额统计
 */
export function fetchCollabStatAmount(params?: CollabStatQueryParams) {
  return request<CollabStatAmountVO>({
    url: `${BASE_URL}/amount`,
    method: 'get',
    params
  });
}

/**
 * 协作中心同步风险统计
 */
export function fetchCollabStatSyncRisk(params?: CollabStatQueryParams) {
  return request<CollabStatSyncRiskVO>({
    url: `${BASE_URL}/sync-risk`,
    method: 'get',
    params
  });
}

/**
 * 最近待办列表
 */
export function fetchCollabStatRecentTodos(params?: CollabStatQueryParams) {
  return request<CollabStatTodoItemVO[]>({
    url: `${BASE_URL}/recent-todos`,
    method: 'get',
    params
  });
}

/**
 * 最近风险列表
 */
export function fetchCollabStatRecentRisks(params?: CollabStatQueryParams) {
  return request<CollabStatRiskItemVO[]>({
    url: `${BASE_URL}/recent-risks`,
    method: 'get',
    params
  });
}

/**
 * 协作中心趋势统计
 */
export function fetchCollabStatTrend(params?: CollabStatQueryParams) {
  return request<CollabStatTrendItemVO[]>({
    url: `${BASE_URL}/trend`,
    method: 'get',
    params
  });
}

