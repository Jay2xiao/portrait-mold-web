import { request } from '@/service/request';

const BASE_URL = '/biz/repairReview';

export type RepairReviewId = string | number;

export interface RepairReviewQuery {
  pageNum?: number;
  pageSize?: number;
  taskId?: RepairReviewId;
  orderId?: RepairReviewId;
  reviewerName?: string;
  reviewResult?: string;
  reviewType?: string;
  reviewNode?: string;
}

export interface RepairReviewVO {
  id?: RepairReviewId;
  taskId?: RepairReviewId;
  orderId?: RepairReviewId;
  reviewRound?: number;
  reviewerId?: RepairReviewId;
  reviewerName?: string;
  reviewResult?: string;
  reviewType?: string;
  reviewNode?: string;
  rejectMode?: string;
  reasonCode?: string;
  comment?: string;
  attachmentIds?: string;
  createTime?: string;
  updateTime?: string;
}

export function fetchRepairReviewList(params: RepairReviewQuery) {
  return request<any>({
    url: `${BASE_URL}/list`,
    method: 'get',
    params
  });
}

export function fetchRepairReviewDetail(id: RepairReviewId) {
  return request<RepairReviewVO>({
    url: `${BASE_URL}/${id}`,
    method: 'get'
  });
}
