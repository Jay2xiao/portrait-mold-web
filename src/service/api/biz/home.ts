import { request } from '@/service/request';

export interface HomeKpiVO {
  key?: string;
  title?: string;
  value?: string | number;
  unit?: string;
  type?: string;
  route?: string;
  query?: Record<string, any>;
}

export interface HomeTodoVO {
  key?: string;
  title?: string;
  count?: number;
  type?: string;
  route?: string;
  query?: Record<string, any>;
}

export interface HomeAlertVO {
  key?: string;
  title?: string;
  content?: string;
  count?: number;
  level?: string;
  route?: string;
  query?: Record<string, any>;
}

export interface HomeShortcutVO {
  key?: string;
  title?: string;
  description?: string;
  type?: string;
  route?: string;
  permission?: string;
}

export interface HomeSummaryVO {
  homeType?: string;
  tenantId?: string;
  tenantName?: string;
  userId?: string | number;
  userName?: string;
  roleNames?: string[];
  kpis?: HomeKpiVO[];
  todos?: HomeTodoVO[];
  alerts?: HomeAlertVO[];
  shortcuts?: HomeShortcutVO[];
}

export function fetchHomeSummary() {
  return request<any>({
    url: '/biz/home/summary',
    method: 'get'
  });
}
