import { request } from '@/service/request';

export interface RepairTaskQuery {
  pageNum?: number;
  pageSize?: number;
  taskNo?: string;
  orderId?: string | number;
  orderNoSnapshot?: string;
  customerNameSnapshot?: string;
  productNameSnapshot?: string;
  orderType?: string;
  assigneeUserId?: string | number;
  status?: string;
}

export interface RepairTaskVO {
  id?: string | number;
  taskNo?: string;
  orderId?: string | number;
  orderNoSnapshot?: string;
  customerNameSnapshot?: string;
  productNameSnapshot?: string;
  orderType?: string;
  priority?: string;
  expectedDeliveryTime?: string;

  assigneeUserId?: string | number;
  assigneeName?: string;

  quoteHdAmount?: number;
  quoteAiAmount?: number;
  quoteManualAmount?: number;
  quoteTotalAmount?: number;
  acceptedAmount?: number;

  status?: string;
  reviewRound?: number;
  outputFileIds?: string;
  submitRemark?: string;
  originalImageFileIds?: string;
  remarkImageFileIds?: string;

  claimTime?: string;
  startTime?: string;
  submitTime?: string;
  completeTime?: string;
  deadlineTime?: string;
  modelFileIds?: string;
  previewFileIds?: string;
  aiBaseModelFileIds?: string;
  modelSelfCheckFileIds?: string;
  previewVideoFileIds?: string;

  deadlineRemindTime?: string;
  deadlineReminded?: string;
  timeoutFlag?: string;
  timeoutTime?: string;
  cancelType?: string;
  cancelReason?: string;
  cancelTime?: string;


  remark?: string;
  createTime?: string;
}

export interface RepairRejectRecordVO {
  id?: string | number;
  taskId?: string | number;
  orderId?: string | number;
  reviewNode?: string;
  rejectMode?: string;
  reasonCode?: string;
  comment?: string;
  attachmentIds?: string;
  reviewerName?: string;
  createTime?: string;
}

export function fetchRepairRejectRecords(taskId: string | number) {
  return request<any>({
    url: `/biz/repair-task/${taskId}/reject-records`,
    method: 'get'
  });
}


export function fetchRepairTaskList(params: RepairTaskQuery) {
  return request<any>({
    url: '/biz/repair-task/list',
    method: 'get',
    params
  });
}

export function fetchRepairHallList(params: RepairTaskQuery) {
  return request<any>({
    url: '/biz/repair-task/hall/list',
    method: 'get',
    params
  });
}

export function fetchMyRepairTaskList(params: RepairTaskQuery) {
  return request<any>({
    url: '/biz/repair-task/my/list',
    method: 'get',
    params
  });
}

export function fetchRepairTaskDetail(id: string | number) {
  return request<any>({
    url: `/biz/repair-task/${id}`,
    method: 'get'
  });
}

export function createRepairTaskFromOrder(data: any) {
  return request<any>({
    url: '/biz/repair-task/from-order',
    method: 'post',
    data
  });
}

export function claimRepairTask(id: string | number) {
  return request<any>({
    url: `/biz/repair-task/${id}/claim`,
    method: 'post'
  });
}

export function assignRepairTask(id: string | number, data: any) {
  return request<any>({
    url: `/biz/repair-task/${id}/assign`,
    method: 'post',
    data
  });
}

export function submitRepairTask(id: string | number, data: any) {
  return request<any>({
    url: `/biz/repair-task/${id}/submit`,
    method: 'post',
    data
  });
}

export function reviewRepairTask(id: string | number, data: any) {
  return request<any>({
    url: `/biz/repair-task/${id}/review`,
    method: 'post',
    data
  });
}

export function restartRepairTask(id: string | number) {
  return request<any>({
    url: `/biz/repair-task/${id}/restart`,
    method: 'post'
  });
}

export function startRepairTask(id: string | number) {
  return request<any>({
    url: `/biz/repair-task/${id}/start`,
    method: 'post'
  });
}

export function withdrawRepairTask(id: string | number, data?: any) {
  return request<any>({
    url: `/biz/repair-task/${id}/withdraw`,
    method: 'post',
    data
  });
}

export function reassignRepairTask(id: string | number, data: any) {
  return request<any>({
    url: `/biz/repair-task/${id}/reassign`,
    method: 'post',
    data
  });
}

export function submitRepairPreview(id: string | number, data: any) {
  return request<any>({
    url: `/biz/repair-task/${id}/submit-preview`,
    method: 'post',
    data
  });
}

export function reviewRepairPreview(id: string | number, data: any) {
  return request<any>({
    url: `/biz/repair-task/${id}/review-preview`,
    method: 'post',
    data
  });
}

export function uploadRepairModel(id: string | number, data: any) {
  return request<any>({
    url: `/biz/repair-task/${id}/upload-model`,
    method: 'post',
    data
  });
}

export function checkRepairModel(id: string | number, data: any) {
  return request<any>({
    url: `/biz/repair-task/${id}/check-model`,
    method: 'post',
    data
  });
}

