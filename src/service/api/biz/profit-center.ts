import { request } from '@/service/request';

export interface ProfitSummaryVO {
  orderCount?: number;
  receivableAmount?: number;
  paidAmount?: number;
  unpaidAmount?: number;
  refundAmount?: number;
  printMaterialCostAmount?: number;
  printPerformanceAmount?: number;
  printOtherCostAmount?: number;
  printMonthlyFixedCostAmount?: number;
  repairTeamMonthlyCostAmount?: number;
  companyMonthlyCostAmount?: number;
  monthlyFixedCostAmount?: number;
  totalCostAmount?: number;
  grossProfitAmount?: number;
  paidProfitAmount?: number;
  grossProfitRate?: number;
}

export interface StaffPerformanceVO {
  userId?: string | number;
  userName?: string;
  orderCount?: number;
  performanceAmount?: number;
  relatedReceivableAmount?: number;
  relatedProfitAmount?: number;
}

export interface CustomerProfitRankVO {
  customerId?: string | number;
  customerName?: string;
  orderCount?: number;
  receivableAmount?: number;
  paidAmount?: number;
  totalCostAmount?: number;
  grossProfitAmount?: number;
  grossProfitRate?: number;
}

export interface ProfitDashboardVO {
  summary?: ProfitSummaryVO;
  repairPerformances?: StaffPerformanceVO[];
  printPerformances?: StaffPerformanceVO[];
  followPerformances?: StaffPerformanceVO[];
  customerProfitRanks?: CustomerProfitRankVO[];
}

export interface OrderProfitSnapshotVO {
  id?: string | number;
  orderId?: string | number;
  orderNoSnapshot?: string;
  orderType?: string;
  businessStatus?: string;
  orderCreateTime?: string;

  customerId?: string | number;
  customerNameSnapshot?: string;

  receivableAmount?: number;
  paidAmount?: number;
  unpaidAmount?: number;

  repairRevenueAmount?: number;
  printRevenueAmount?: number;
  otherRevenueAmount?: number;
  refundAmount?: number;

  repairCostAmount?: number;
  printMaterialCostAmount?: number;
  printPerformanceAmount?: number;
  printOtherCostAmount?: number;
  deliveryCostAmount?: number;
  followPerformanceAmount?: number;
  otherCostAmount?: number;

  totalCostAmount?: number;
  grossProfitAmount?: number;
  paidProfitAmount?: number;
  grossProfitRate?: number;

  repairUserName?: string;
  repairPerformanceAmount?: number;

  printUserName?: string;
  followUserName?: string;

  snapshotTime?: string;
}

export function fetchOrderProfitPage(params: any) {
  return request<any>({
    url: '/biz/profit-center/order/list',
    method: 'get',
    params
  });
}

export function fetchOrderProfitDetail(orderId: string | number) {
  return request<any>({
    url: `/biz/profit-center/order/${orderId}/detail`,
    method: 'get'
  });
}


export function fetchProfitDashboard(params: any) {
  return request<any>({
    url: '/biz/profit-center/dashboard',
    method: 'get',
    params
  });
}

export function refreshAllProfitSnapshot() {
  return request<any>({
    url: '/biz/profit-center/refresh-all',
    method: 'post'
  });
}

export function refreshOrderProfitSnapshot(orderId: string | number) {
  return request<any>({
    url: `/biz/profit-center/order/${orderId}/refresh`,
    method: 'post'
  });
}
