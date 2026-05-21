import { request } from '@/service/request';

const BASE_URL = '/biz/reconciliation';

export interface CustomerReconciliationSummaryVO {
  customerId?: string | number;
  customerName?: string;
  phone?: string;
  settlementType?: string;
  allowUnpaidDelivery?: string;
  settlementCycleDays?: number;
  creditLimit?: number;
  balanceAmount?: number;
  receivableAmount?: number;
  paidAmount?: number;
  unpaidAmount?: number;
  unbilledAmount?: number;
  unbilledItemCount?: number;
  unpaidBillAmount?: number;
  unpaidBillCount?: number;
  refundAmount?: number;
  latestPayTime?: string;
  latestDeliveryTime?: string;
  latestBillTime?: string;
  lastSettlementDate?: string;
  nextSettlementDate?: string;
  currentPeriodStartDate?: string;
  currentPeriodEndDate?: string;
  currentPeriodAmount?: number;
  currentPeriodItemCount?: number;
  settlementDue?: boolean;
  settlementDueReason?: string;

}

export function fetchCustomerReconciliationList(params: any) {
  return request<any>({
    url: `${BASE_URL}/query`,
    method: 'get',
    params
  });
}

export function fetchCustomerReconciliationDetail(customerId: string | number) {
  return request<any>({
    url: `${BASE_URL}/${customerId}/detail`,
    method: 'get'
  });
}

export function createCustomerSettlementBill(data: any) {
  return request<any>({
    url: `${BASE_URL}/settlement-bill`,
    method: 'post',
    data
  });
}

export function exportCustomerStatementExcel(billId: string | number) {
  return request<any>({
    url: `${BASE_URL}/bill/${billId}/export-excel`,
    method: 'get',
    responseType: 'blob' as any
  });
}

