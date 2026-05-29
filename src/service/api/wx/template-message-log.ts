import { request } from '@/service/request';

export interface WxTemplateMessageLogVO {
  id?: string | number;
  tenantId?: string;
  notificationId?: string | number;
  receiverUserId?: string | number;
  openId?: string;
  templateId?: string;
  messageUrl?: string;
  bizType?: string;
  bizId?: string | number;
  bizNo?: string;
  title?: string;
  status?: 'SUCCESS' | 'FAILED' | 'SKIPPED' | string;
  errorMsg?: string;
  responseMsgId?: string;
  remark?: string;
  createTime?: string;
}

export function fetchWxTemplateMessageLogList(params: any) {
  return request<any>({
    url: '/wx/template-message-log/list',
    method: 'get',
    params
  });
}

export function fetchResendWxTemplateMessageLog(id: string | number) {
  return request<void>({
    url: `/wx/template-message-log/${id}/resend`,
    method: 'post'
  });
}
