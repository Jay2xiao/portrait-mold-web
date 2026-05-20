import { request } from '@/service/request';

const BASE_URL = '/biz/operation-log';

export interface BizOperationLogVO {
  id?: string | number;

  bizType?: string;
  bizId?: string | number;
  bizNo?: string;
  bizName?: string;

  operationType?: string;
  operationName?: string;
  title?: string;

  beforeData?: string;
  afterData?: string;
  diffData?: string;

  reason?: string;
  resultStatus?: string;
  errorMsg?: string;

  operatorId?: string | number;
  operatorName?: string;

  requestMethod?: string;
  requestUri?: string;
  requestIp?: string;
  userAgent?: string;

  operationTime?: string;
  createTime?: string;
  remark?: string;
}

export function fetchOperationLogList(params: any) {
  return request<any>({
    url: `${BASE_URL}/list`,
    method: 'get',
    params
  });
}

export function fetchOperationLogDetail(id: string | number) {
  return request<any>({
    url: `${BASE_URL}/${id}`,
    method: 'get'
  });
}
