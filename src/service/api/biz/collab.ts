import { request } from '@/service/request';

export function fetchMyCollabProfile() {
  return request<any>({
    url: '/biz/collab/profile/my',
    method: 'get'
  });
}

export function saveMyCollabProfile(data: any) {
  return request<any>({
    url: '/biz/collab/profile/save',
    method: 'post',
    data
  });
}

export function searchCollabMerchants(params: any) {
  return request<any>({
    url: '/biz/collab/profile/search',
    method: 'get',
    params
  });
}

export function fetchMyCollabCapabilities() {
  return request<any>({
    url: '/biz/collab/capability/my',
    method: 'get'
  });
}

export function saveMyCollabCapabilities(data: any) {
  return request<any>({
    url: '/biz/collab/capability/save',
    method: 'post',
    data
  });
}

export function fetchMyPaymentQrList() {
  return request<any>({
    url: '/biz/collab/payment-qr/list',
    method: 'get'
  });
}

export function savePaymentQr(data: any) {
  return request<any>({
    url: '/biz/collab/payment-qr/save',
    method: 'post',
    data
  });
}

export function deletePaymentQr(id: string | number) {
  return request<any>({
    url: `/biz/collab/payment-qr/${id}`,
    method: 'delete'
  });
}

export function fetchCollabPartnerList(params?: any) {
  return request<any>({
    url: '/biz/collab/partner/list',
    method: 'get',
    params
  });
}

export function applyCollabPartner(data: any) {
  return request<any>({
    url: '/biz/collab/partner/apply',
    method: 'post',
    data
  });
}

export function acceptCollabPartner(id: string | number) {
  return request<any>({
    url: `/biz/collab/partner/${id}/accept`,
    method: 'post'
  });
}

export function rejectCollabPartner(id: string | number, data: any) {
  return request<any>({
    url: `/biz/collab/partner/${id}/reject`,
    method: 'post',
    data
  });
}

export function deleteCollabPartner(id: string | number) {
  return request<any>({
    url: `/biz/collab/partner/${id}`,
    method: 'delete'
  });
}
