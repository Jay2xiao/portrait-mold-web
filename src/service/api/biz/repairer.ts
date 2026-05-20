import { request } from '@/service/request';

export interface RepairerQuery {
  pageNum?: number;
  pageSize?: number;
  repairerNo?: string;
  repairerName?: string;
  phone?: string;
  wechatNo?: string;
  canAccept?: string;
  status?: string;
  settlementMode?: string;
}

export interface RepairerVO {
  id?: string | number;
  repairerNo?: string;
  userId?: string | number;
  repairerName?: string;
  phone?: string;
  wechatNo?: string;
  skillTags?: string;
  canAccept?: string;
  status?: string;
  settlementMode?: string;
  unitPrice?: number;
  currentTaskCount?: number;
  remark?: string;
  createTime?: string;
  sourceType?: string;

}

export type RepairerForm = Partial<RepairerVO>;

export function fetchRepairerList(params: RepairerQuery) {
  return request<any>({
    url: '/biz/repairer/list',
    method: 'get',
    params
  });
}

export function fetchRepairerDetail(id: string | number) {
  return request<any>({
    url: `/biz/repairer/${id}`,
    method: 'get'
  });
}

export function addRepairer(data: RepairerForm) {
  return request<any>({
    url: '/biz/repairer',
    method: 'post',
    data
  });
}

export function updateRepairer(data: RepairerForm) {
  return request<any>({
    url: '/biz/repairer',
    method: 'put',
    data
  });
}

export function deleteRepairer(ids: string | number | Array<string | number>) {
  return request<any>({
    url: `/biz/repairer/${ids}`,
    method: 'delete'
  });
}

export function fetchRepairerOptions(sourceType?: string) {
  return request<any>({
    url: '/biz/repairer/options',
    method: 'get',
    params: {
      sourceType
    }
  });
}


export function fetchRepairerUserOptions() {
  return request<any>({
    url: '/biz/repairer/user-options',
    method: 'get'
  });
}
