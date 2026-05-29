import { request } from '@/service/request';

export interface BizFinanceOperationLogVO {
  id?: string | number;
  bizType?: string;
  bizId?: string | number;
  bizNo?: string;
  actionType?: string;
  title?: string;
  content?: string;
  beforeJson?: string;
  afterJson?: string;
  operatorId?: string | number;
  operatorName?: string;
  remark?: string;
  createTime?: string;
}

export function fetchFinanceOperationLogList(params: any) {
  return request<any>({
    url: '/log/financeOperationLog/list',
    method: 'get',
    params
  });
}

export function fetchFinanceOperationLogDetail(id: string | number) {
  return request<any>({
    url: `/log/financeOperationLog/${id}`,
    method: 'get'
  });
}
