import { request } from '@/service/request';

const BASE_URL = '/biz/data-health';

export interface DataHealthRuleVO {
  ruleCode?: string;
  ruleName?: string;
  description?: string;
  severity?: string;
  repairSupported?: boolean;
}

export interface DataHealthBatchVO {
  id?: string | number;
  batchNo?: string;
  status?: string;
  ruleCount?: number;
  abnormalCount?: number;
  errorCount?: number;
  warningCount?: number;
  startTime?: string;
  endTime?: string;
  durationMs?: number;
  operatorName?: string;
  errorMsg?: string;
}

export interface DataHealthItemVO {
  id?: string | number;
  batchId?: string | number;
  batchNoSnapshot?: string;
  ruleCode?: string;
  ruleName?: string;
  severity?: string;
  bizType?: string;
  bizId?: string | number;
  bizNo?: string;
  bizName?: string;
  expectedData?: string;
  actualData?: string;
  diffData?: string;
  repairSupported?: string;
  repaired?: string;
  repairResult?: string;
  repairMsg?: string;
  repairTime?: string;
  createTime?: string;
}

export interface DataHealthDashboardVO {
  latestBatch?: DataHealthBatchVO;
  rules?: DataHealthRuleVO[];
  latestAbnormalCount?: number;
  unrepairedCount?: number;
  errorCount?: number;
  warningCount?: number;
}

export function fetchDataHealthDashboard() {
  return request<any>({
    url: `${BASE_URL}/dashboard`,
    method: 'get'
  });
}

export function fetchDataHealthRules() {
  return request<any>({
    url: `${BASE_URL}/rules`,
    method: 'get'
  });
}

export function runDataHealthCheck(data: any) {
  return request<any>({
    url: `${BASE_URL}/run`,
    method: 'post',
    data
  });
}

export function fetchDataHealthItemList(params: any) {
  return request<any>({
    url: `${BASE_URL}/item/list`,
    method: 'get',
    params
  });
}

export function fetchDataHealthItemDetail(id: string | number) {
  return request<any>({
    url: `${BASE_URL}/item/${id}`,
    method: 'get'
  });
}

export function repairDataHealthItem(id: string | number) {
  return request<any>({
    url: `${BASE_URL}/item/${id}/repair`,
    method: 'post'
  });
}
