import { request } from '@/service/request';

export interface WorkbenchSummaryVO {
  myUnreadNoticeCount?: number;
  myRepairTaskCount?: number;
  myPrintTaskCount?: number;
  myOverdueRepairCount?: number;

  tenantWaitClaimRepairCount?: number;
  tenantRepairingCount?: number;
  tenantWaitPreviewReviewCount?: number;
  tenantWaitModelCheckCount?: number;
  tenantWaitPrintQcCount?: number;
  tenantWaitClaimPrintCount?: number;
  tenantPrintingCount?: number;
  tenantWaitMaterialRecordCount?: number;
  tenantWaitDeliveryCount?: number;
  tenantOverdueRepairCount?: number;
}

export function fetchWorkbenchSummary() {
  return request<any>({
    url: '/biz/workbench/summary',
    method: 'get'
  });
}

export function fetchWorkbenchTodoList(limit = 10) {
  return request<any>({
    url: '/biz/workbench/todo-list',
    method: 'get',
    params: { limit }
  });
}
