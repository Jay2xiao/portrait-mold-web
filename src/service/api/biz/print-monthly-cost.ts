import { request } from '@/service/request';

const BASE_URL = '/biz/printMonthlyCost';

export interface PrintMonthlyCostQuery {
  pageNum?: number;
  pageSize?: number;
  costMonth?: string;
  costCategory?: string;
  status?: string;
}

export interface PrintMonthlyCostVO {
  id?: string | number;
  costMonth?: string;
  costCategory?: string;
  laborCostAmount?: number;
  electricityCostAmount?: number;
  rentCostAmount?: number;
  depreciationCostAmount?: number;
  maintenanceCostAmount?: number;
  otherCostAmount?: number;
  repairRentCostAmount?: number;
  repairElectricityCostAmount?: number;
  repairFollowSalaryAmount?: number;
  repairAiPlatformCostAmount?: number;
  repairOtherCostAmount?: number;
  companyNetworkCostAmount?: number;
  companyMealCostAmount?: number;
  companyOtherCostAmount?: number;
  totalCostAmount?: number;
  status?: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

export type PrintMonthlyCostForm = Partial<PrintMonthlyCostVO>;

export function fetchPrintMonthlyCostList(params: PrintMonthlyCostQuery) {
  return request<any>({
    url: `${BASE_URL}/list`,
    method: 'get',
    params
  });
}

export function fetchPrintMonthlyCostDetail(id: string | number) {
  return request<any>({
    url: `${BASE_URL}/${id}`,
    method: 'get'
  });
}

export function addPrintMonthlyCost(data: PrintMonthlyCostForm) {
  return request<any>({
    url: BASE_URL,
    method: 'post',
    data
  });
}

export function updatePrintMonthlyCost(data: PrintMonthlyCostForm) {
  return request<any>({
    url: BASE_URL,
    method: 'put',
    data
  });
}

export function deletePrintMonthlyCost(ids: string | number | Array<string | number>) {
  return request<any>({
    url: `${BASE_URL}/${ids}`,
    method: 'delete'
  });
}
