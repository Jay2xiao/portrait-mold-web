import { request } from '@/service/request';

export interface NotificationVO {
  id?: string | number;
  noticeType?: string;
  priority?: string;
  title?: string;
  content?: string;
  bizType?: string;
  bizId?: string | number;
  bizNo?: string;
  jumpUrl?: string;
  readFlag?: string;
  readTime?: string;
  createTime?: string;
  fromUserName?: string;
}

export function fetchNotificationList(params: any) {
  return request<any>({
    url: '/biz/notification/list',
    method: 'get',
    params
  });
}

export function fetchUnreadNotificationCount() {
  return request<any>({
    url: '/biz/notification/unread-count',
    method: 'get'
  });
}

export function markNotificationRead(id: string | number) {
  return request<any>({
    url: `/biz/notification/${id}/read`,
    method: 'post'
  });
}

export function markAllNotificationRead() {
  return request<any>({
    url: '/biz/notification/read-all',
    method: 'post'
  });
}

export function fetchNotificationTodoList(limit = 10) {
  return request<any>({
    url: '/biz/notification/todo-list',
    method: 'get',
    params: { limit }
  });
}
