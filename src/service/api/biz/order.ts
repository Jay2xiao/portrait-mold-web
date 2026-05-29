import { request } from '@/service/request';

export interface OrderQuery {
  pageNum?: number;
  pageSize?: number;
  orderNo?: string;
  customerNameSnapshot?: string;
  customerPhoneSnapshot?: string;
  productName?: string;
  businessStatus?: string;
  financeStatus?: string;
  priority?: string;
}

export interface OrderVO {
  id?: string | number;
  orderNo?: string;
  customerId?: string | number;

  orderType?: string;
  repairAssigneeUserId?: string | number;
  repairDeadlineTime?: string;

  customerNameSnapshot?: string;
  customerPhoneSnapshot?: string;
  customerWechatSnapshot?: string;

  productName?: string;
  quantity?: number;
  orderSource?: string;

  businessStatus?: string;
  financeStatus?: string;
  priority?: string;

  followupUserId?: string | number;
  repairUserId?: string | number;
  printUserId?: string | number;

  saleAmountTotal?: number;
  depositAmount?: number;
  receivedAmount?: number;
  refundAmount?: number;

  hdAmount?: number;
  aiModelAmount?: number;
  repairManualAmount?: number;
  repairTotalAmount?: number;

  printEstimateAmount?: number;
  printDepositAmount?: number;
  printFinalAmount?: number;
  printReceivableAmount?: number;

  receivableAmount?: number;
  paidAmount?: number;
  unpaidAmount?: number;
  totalCostAmount?: number;
  grossProfitAmount?: number;

  expectedDeliveryTime?: string;
  actualDeliveryTime?: string;

  receiverNameSnapshot?: string;
  receiverPhoneSnapshot?: string;
  receiverAddressSnapshot?: string;

  originalImageFileIds?: string;
  remarkImageFileIds?: string;
  aiBaseModelFileIds?: string;
  printInputModelFileIds?: string;

  productType?: string;
  repairSource?: string;
  payStatus?: string;
  applyCostRule?: boolean;

  costRuleId?: string | number;
  costRuleMode?: string;

  followAmount?: number;
  companyCostAmount?: number;

  repairLimitHours?: number;
  deadlineRemindMinutes?: number;


  remark?: string;
  createTime?: string;
  receiverName: string;
  receiverPhone: string;
  receiverProvince: string;
  receiverCity: string;
  receiverDistrict: string;
  receiverAddress: string;

  routeSummaryMode?: string;
  stageRoutes?: BizOrderStageRouteSaveItem[];
  printSpecs?: OrderPrintSpec[];

  sourceBizType?: string;
  sourceBizId?: string | number;
  sourceBizNo?: string;
  sourceTenantId?: string;
  sourceTenantNameSnapshot?: string;

  /**
   * 交付方式：EXPRESS / SELF_PICKUP / LOCAL_DELIVERY
   */
  deliveryType?: string;

  /**
   * 快递公司
   */
  expressCompany?: string;

  /**
   * 快递单号
   */
  trackingNo?: string;

  /**
   * 发货/交付时间
   */
  deliveryTime?: string;

  /**
   * 完成时间
   */
  completeTime?: string;

  collabSendable?: boolean;
  pendingExternalRouteCount?: number;
  dispatchedExternalRouteCount?: number;

}

export interface OrderPrintSpec {
  id?: string | number;
  orderId?: string | number;
  orderNoSnapshot?: string;
  heightCm?: number | null;
  quantity?: number | null;
  estimatedWeightG?: number | null;
  estimatedAmount?: number | null;
  sortNo?: number;
  remark?: string;
}

export type OrderForm = Partial<OrderVO>;

export function fetchOrderList(params: OrderQuery) {
  return request<any>({
    url: '/biz/order/list',
    method: 'get',
    params
  });
}

export function addOrder(data: OrderForm) {
  return request<any>({
    url: '/biz/order',
    method: 'post',
    data
  });
}

export function updateOrder(data: OrderForm) {
  return request<any>({
    url: '/biz/order',
    method: 'put',
    data
  });
}

export function deleteOrder(ids: string | number | Array<string | number>) {
  return request<any>({
    url: `/biz/order/${ids}`,
    method: 'delete'
  });
}

export function changeOrderStatus(id: string | number, data: { targetStatus: string; reason?: string; remark?: string }) {
  return request<any>({
    url: `/biz/order/${id}/change-status`,
    method: 'post',
    data
  });
}

export function fetchOrderTimeline(id: string | number) {
  return request<any>({
    url: `/biz/order/${id}/timeline`,
    method: 'get'
  });
}

export function assignOrderRepairer(id: string | number, data: any) {
  return request<any>({
    url: `/biz/order/${id}/assign-repairer`,
    method: 'post',
    data
  });
}

export function updateOrderRepairPerformance(
  id: string | number,
  data: { repairManualAmount: number; remark?: string }
) {
  return request<any>({
    url: `/biz/order/${id}/repair-performance`,
    method: 'post',
    data
  });
}

export function updateOrderPrintRevenue(
  id: string | number,
  data: { printReceivableAmount: number; remark?: string }
) {
  return request<any>({
    url: `/biz/order/${id}/print-revenue`,
    method: 'post',
    data
  });
}
export interface OrderStageRouteVO {
  id?: string | number;
  stageRouteNo?: string;
  orderId?: string | number;
  orderNoSnapshot?: string;

  stageCode?: string;
  stageNameSnapshot?: string;
  stageSeq?: number;

  routeMode?: 'INTERNAL' | 'EXTERNAL' | 'SKIP';
  routeStatus?:
    | 'PLANNED'
    | 'WAIT_TRIGGER'
    | 'DISPATCHED'
    | 'RUNNING'
    | 'WAIT_REVIEW'
    | 'COMPLETED'
    | 'REJECTED'
    | 'CANCELLED'
    | 'SKIPPED';

  triggerAfterStageCode?: string;
  routeBundleNo?: string;

  targetTenantId?: string;
  targetTenantNameSnapshot?: string;

  internalTaskId?: string | number;
  internalTaskNoSnapshot?: string;

  collabOrderId?: string | number;
  collabOrderNoSnapshot?: string;

  dispatchCount?: number;
  dispatchTime?: string;
  startTime?: string;
  completeTime?: string;

  rejectTime?: string;
  rejectReason?: string;

  lockedFlag?: string;
  enabled?: string;
  remark?: string;
}


const ORDER_BASE_URL = '/biz/order';

export type OrderStageCode = 'REPAIR' | 'PRINT' | 'DELIVERY';

export type OrderRouteMode = 'INTERNAL' | 'EXTERNAL' | 'SKIP';

export type OrderRouteStatus =
  | 'PLANNED'
  | 'WAIT_TRIGGER'
  | 'DISPATCHED'
  | 'RUNNING'
  | 'WAIT_REVIEW'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'SKIPPED';

export type OrderRouteSummaryMode =
  | 'ALL_INTERNAL'
  | 'PARTIAL_EXTERNAL'
  | 'ALL_EXTERNAL';

export interface BizOrderVo {
  id?: string | number;
  orderNo?: string;
  customerName?: string;
  customerNameSnapshot?: string;
  serviceType?: string;
  businessStatus?: string;
  routeSummaryMode?: OrderRouteSummaryMode | string;
  [key: string]: any;
}

export interface BizOrderStageRouteVo {
  id?: string | number;

  stageRouteNo?: string;

  orderId?: string | number;
  orderNoSnapshot?: string;

  stageCode?: OrderStageCode | string;
  stageNameSnapshot?: string;
  stageSeq?: number;

  routeMode?: OrderRouteMode | string;
  routeStatus?: OrderRouteStatus | string;

  triggerAfterStageCode?: OrderStageCode | string;
  routeBundleNo?: string;

  targetTenantId?: string;
  targetTenantNameSnapshot?: string;

  internalTaskId?: string | number;
  internalTaskNoSnapshot?: string;

  collabOrderId?: string | number;
  collabOrderNoSnapshot?: string;

  dispatchCount?: number;
  dispatchTime?: string;

  startTime?: string;
  completeTime?: string;

  rejectTime?: string;
  rejectReason?: string;

  lockedFlag?: string;
  enabled?: string;

  remark?: string;
  createTime?: string;
}

export interface BizOrderStageRouteSaveItem {
  id?: string | number;
  stageCode: string;
  routeMode: OrderRouteMode | string;
  targetTenantId?: string;
  targetTenantNameSnapshot?: string;
  remark?: string;
}


export interface BizOrderStageRouteSaveBo {
  routes: BizOrderStageRouteSaveItem[];
}

/**
 * 订单详情。
 *
 * 如果你项目里已经有 fetchOrderDetail/getOrderDetail，
 * 这个方法不要重复加，保持原来的即可。
 */
export function fetchOrderDetail(id: string | number) {
  return request<BizOrderVo>({
    url: `${ORDER_BASE_URL}/${id}`,
    method: 'get'
  });
}

/**
 * 查询订单工序路由。
 */
export function fetchOrderStageRoutes(orderId: string | number) {
  return request<BizOrderStageRouteVo[]>({
    url: `${ORDER_BASE_URL}/${orderId}/stage-routes`,
    method: 'get'
  });
}

/**
 * 保存订单工序路由。
 */
export function saveOrderStageRoutes(
  orderId: string | number,
  data: BizOrderStageRouteSaveBo
) {
  return request<any>({
    url: `${ORDER_BASE_URL}/${orderId}/stage-routes/save`,
    method: 'post',
    data
  });
}

export interface BizOrderDetailVo {
  order?: BizOrderVo;
  repairTasks?: any[];
  printTasks?: any[];
  deliveryRecords?: any[];
  rejectRecords?: any[];
  timeline?: any[];
  receivableItems?: any[];
  billItems?: any[];
  bills?: any[];
  paymentAllocations?: any[];
  payments?: any[];
  adjustments?: any[];
  [key: string]: any;
}

/**
 * 订单完整详情。
 *
 * 用于订单详情抽屉，包含：
 * - 订单主信息
 * - 修模任务
 * - 打印任务
 * - 发货记录
 * - 应收项目
 * - 账单 / 收款 / 调整项
 * - 时间线
 */
export function fetchOrderFullDetail(id: string | number) {
  return request<BizOrderDetailVo>({
    url: `${ORDER_BASE_URL}/${id}/detail`,
    method: 'get'
  });
}
