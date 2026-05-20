import { request } from '@/service/request';

export interface PrinterQuery {
  pageNum?: number;
  pageSize?: number;
  printerNo?: string;
  printerName?: string;
  phone?: string;
  canAccept?: string;
  status?: string;
}

export interface PrinterVO {
  id?: string | number;
  printerNo?: string;
  userId?: string | number;
  printerName?: string;
  phone?: string;
  skillTags?: string;
  canAccept?: string;
  status?: string;
  currentTaskCount?: number;
  printingTaskCount?: number;
  maxPrintingCount?: number;
  remark?: string;
  createTime?: string;
}

export type PrinterForm = Partial<PrinterVO>;

export function fetchPrinterList(params: PrinterQuery) {
  return request<any>({
    url: '/biz/printer/list',
    method: 'get',
    params
  });
}

export function fetchPrinterDetail(id: string | number) {
  return request<any>({
    url: `/biz/printer/${id}`,
    method: 'get'
  });
}

export function addPrinter(data: PrinterForm) {
  return request<any>({
    url: '/biz/printer',
    method: 'post',
    data
  });
}

export function updatePrinter(data: PrinterForm) {
  return request<any>({
    url: '/biz/printer',
    method: 'put',
    data
  });
}

export function deletePrinter(ids: string | number | Array<string | number>) {
  return request<any>({
    url: `/biz/printer/${ids}`,
    method: 'delete'
  });
}

export function fetchPrinterOptions() {
  return request<any>({
    url: '/biz/printer/options',
    method: 'get'
  });
}

export function fetchPrinterUserOptions() {
  return request<any>({
    url: '/biz/printer/user-options',
    method: 'get'
  });
}
