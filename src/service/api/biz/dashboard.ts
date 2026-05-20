import { request } from '@/service/request';

export interface DashboardKpiVO {
  todayOrderCount?: number;
  monthOrderCount?: number;

  todayReceivableAmount?: number;
  monthReceivableAmount?: number;

  todayPaymentAmount?: number;
  monthPaymentAmount?: number;

  todayRefundAmount?: number;
  monthRefundAmount?: number;

  todayNetIncomeAmount?: number;
  monthNetIncomeAmount?: number;

  currentUnpaidReceivableAmount?: number;
  currentUnbilledAmount?: number;
  currentUnpaidBillAmount?: number;
  currentCustomerBalanceAmount?: number;
}

export interface DashboardTodoVO {
  unbilledItemCount?: number;
  unpaidBillCount?: number;
  overdueBillCount?: number;
  waitDeliveryOrderCount?: number;
  waitPrintQcOrderCount?: number;
  printQcRejectedOrderCount?: number;
}

export interface DashboardDailyTrendVO {
  bizDate?: string;
  orderCount?: number;
  receivableAmount?: number;
  paymentAmount?: number;
  refundAmount?: number;
  netIncomeAmount?: number;
}

export interface DashboardCustomerDebtRankVO {
  customerId?: string | number;
  customerName?: string;
  unpaidAmount?: number;
  itemCount?: number;
}

export interface DashboardStatusCountVO {
  status?: string;
  count?: number;
}

export interface BusinessDashboardVO {
  kpi?: DashboardKpiVO;
  todo?: DashboardTodoVO;
  dailyTrends?: DashboardDailyTrendVO[];
  customerDebtRanks?: DashboardCustomerDebtRankVO[];
  orderStatusCounts?: DashboardStatusCountVO[];
  billPayStatusCounts?: DashboardStatusCountVO[];
}

export function fetchBusinessDashboard(params?: { days?: number }) {
  return request<any>({
    url: '/biz/dashboard/business',
    method: 'get',
    params
  });
}
