<script setup lang="ts">
import {computed, h, onMounted, reactive, ref, VNodeChild} from 'vue';
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NDropdown,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NInputNumber,
  NModal,
  NPopconfirm,
  NSelect,
  NSpace,
  NTabPane,
  NTabs,
  NTag,
  useMessage
} from 'naive-ui';

import {
  addOrder, assignOrderRepairer,
  deleteOrder,
  fetchOrderList,
  fetchOrderTimeline,
  fetchOrderDetail,
  type BizOrderStageRouteSaveItem,
  type BizOrderStageRouteVo,
  type OrderForm,
  type OrderPrintSpec,
  type OrderVO,
  updateOrder, fetchOrderStageRoutes,
  updateOrderRepairPerformance,
  updateOrderPrintRevenue
} from '@/service/api/biz/order';

import {
  completeOrder,
  deliverOrder,
  fetchDeliveryRecords,
  type DeliveryRecordVO
} from '@/service/api/biz/delivery';

import { fetchCollabPartnerList } from '@/service/api/biz/collab';
import { deliveryCollabOrder, submitCollabHdReview } from '@/service/api/biz/collab-order';


import {fetchCustomerList} from '@/service/api/biz/customer';
import {fetchRepairerOptions} from '@/service/api/biz/repairer';
import {fetchProductTypeOptions} from '@/service/api/biz/product-type';
import {previewProductCostRule} from '@/service/api/biz/product-cost-rule';
import {fetchFileList} from '@/service/api/biz/file';

import BizFileUpload from '@/views/biz/components/BizFileUpload.vue';
import BizFileViewer from '@/views/biz/components/BizFileViewer.vue';
import BizFileThumbs from '@/views/biz/components/BizFileThumbs.vue';
import OrderDetailDrawer from '@/views/biz/components/OrderDetailDrawer.vue';
import {resubmitPrintOnlyModel} from "@/service/api/biz/print-task";

import { watch } from 'vue';
import {useRoute, useRouter} from 'vue-router';
import { routeQueryString } from '@/utils/route-query';

const route = useRoute();
const router = useRouter();



defineOptions({
  name: 'BizOrder'
});

const message = useMessage();

const loading = ref(false);
const tableData = ref<OrderVO[]>([]);
const total = ref(0);

const showModal = ref(false);
const modalTitle = ref('新增订单');

const showTimelineModal = ref(false);
const timelineList = ref<any[]>([]);

const customerOptions = ref<{ label: string; value: string | number }[]>([]);
const repairerOptions = ref<any[]>([]);
const productTypeOptions = ref<any[]>([]);

const originalImageFileIds = ref<Array<string | number>>([]);
const remarkImageFileIds = ref<Array<string | number>>([]);
const aiBaseModelFileIds = ref<Array<string | number>>([]);
const printInputModelFileIds = ref<Array<string | number>>([]);

type PrintSpecFormItem = {
  id?: string | number;
  heightCm: number | null;
  quantity: number | null;
  estimatedWeightG: number | null;
  estimatedAmount: number | null;
  remark: string;
};

const printSpecs = ref<PrintSpecFormItem[]>([]);

const showDeliveryModal = ref(false);
const currentOrder = ref<OrderVO | null>(null);

const showOrderDetailDrawer = ref(false);
const detailOrderId = ref<string | number | undefined>();

function openOrderDetail(row: OrderVO) {
  detailOrderId.value = row.id;
  showOrderDetailDrawer.value = true;
}
const showHdSubmitModal = ref(false);
const currentHdOrder = ref<OrderVO | null>(null);
const hdSubmitFileIds = ref<Array<string | number>>([]);
const hdSubmitComment = ref('');
const hdSubmitting = ref(false);


const deliveryProofFileIdList = ref<Array<string | number>>([]);

const deliveryForm = reactive({
  deliveryType: 'EXPRESS',
  receiverName: '',
  receiverPhone: '',
  receiverProvince: '',
  receiverCity: '',
  receiverDistrict: '',
  receiverAddress: '',
  expressCompany: '',
  trackingNo: '',
  remark: ''
});

const deliveryTypeOptions = [
  {label: '快递发货', value: 'EXPRESS'},
  {label: '到店自取', value: 'SELF_PICKUP'},
  {label: '同城配送', value: 'LOCAL_DELIVERY'}
];

const showDeliveryRecordsModal = ref(false);
const deliveryRecords = ref<DeliveryRecordVO[]>([]);

const oldPayStatus = ref('UNPAID');

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  orderNo: '',
  orderType: '',
  customerNameSnapshot: '',
  customerPhoneSnapshot: '',
  productName: '',
  productType: '',
  repairSource: '',
  businessStatus: '',
  financeStatus: '',
  payStatus: ''
});

const form = reactive<OrderForm>({
  id: undefined,
  customerId: undefined,

  orderType: 'REPAIR_PRINT',
  productType: '',
  productName: '',
  quantity: 1,

  orderSource: 'WECHAT',
  priority: 'NORMAL',
  expectedDeliveryTime: '',

  repairSource: 'INTERNAL',
  repairAssigneeUserId: undefined,
  repairDeadlineTime: '',

  payStatus: 'UNPAID',
  applyCostRule: true,
  costRuleId: undefined,
  costRuleMode: '',

  saleAmountTotal: 0,
  depositAmount: 0,
  receivedAmount: 0,

  hdAmount: 0,
  aiModelAmount: 0,
  companyCostAmount: 0,
  followAmount: 0,
  repairManualAmount: 0,
  repairTotalAmount: 0,

  repairLimitHours: 24,
  deadlineRemindMinutes: 60,

  printEstimateAmount: 0,
  printDepositAmount: 0,

  receiverNameSnapshot: '',
  receiverPhoneSnapshot: '',
  receiverAddressSnapshot: '',

  customerNameSnapshot: '',
  customerPhoneSnapshot: '',
  remark: ''
});

const stageRoutes = ref<BizOrderStageRouteSaveItem[]>([]);

const routeModeOptions = [
  { label: '内部执行', value: 'INTERNAL' },
  { label: '外协执行', value: 'EXTERNAL' },
  { label: '跳过', value: 'SKIP' }
];

const collabPartnerOptions = ref<Array<{ label: string; value: string }>>([]);


const orderTypeOptions = [
  {label: '只修模', value: 'REPAIR_ONLY'},
  {label: '只打印', value: 'PRINT_ONLY'},
  {label: '修模 + 打印', value: 'REPAIR_PRINT'}
];

const repairSourceOptions = [
  {label: '内部修模', value: 'INTERNAL'},
  {label: '外部修模', value: 'EXTERNAL'}
];

const payStatusOptions = [
  {label: '未支付', value: 'UNPAID'},
  {label: '部分支付', value: 'PARTIAL'},
  {label: '已支付', value: 'PAID'}
];

const businessStatusOptions = [
  { label: '高清处理中', value: 'HD_PROCESSING' },
  { label: '高清图返工', value: 'HD_REWORK' },
  { label: '待发单方确认高清图', value: 'WAIT_HD_REVIEW' },

  { label: '待修模', value: 'WAIT_REPAIR' },
  { label: '修模中', value: 'REPAIRING' },
  { label: '待效果图审核', value: 'WAIT_PREVIEW_REVIEW' },
  { label: '修模驳回', value: 'REPAIR_REJECTED' },
  { label: '待上传模型文件', value: 'WAIT_MODEL_UPLOAD' },
  { label: '待模型检测', value: 'WAIT_MODEL_CHECK' },
  { label: '待打印审核', value: 'WAIT_PRINT_QC' },
  { label: '待打印', value: 'WAIT_PRINT' },
  { label: '待发打印协作', value: 'WAIT_PRINT_COLLAB_SEND' },
  { label: '打印中', value: 'PRINTING' },
  { label: '待材料录入', value: 'WAIT_MATERIAL_RECORD' },
  { label: '待发货', value: 'WAIT_DELIVERY' },
  { label: '已发货/已交付', value: 'DELIVERED' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已关闭', value: 'CLOSED' }
];


const financeStatusOptions = [
  {label: '待收款', value: 'WAIT_RECEIVE'},
  {label: '部分收款', value: 'PART_RECEIVED'},
  {label: '已收款', value: 'PAID'},
  {label: '待退款', value: 'WAIT_REFUND'},
  {label: '已退款', value: 'REFUNDED'}
];

const priorityOptions = [
  {label: '普通', value: 'NORMAL'},
  {label: '低', value: 'LOW'},
  {label: '高', value: 'HIGH'},
  {label: '加急', value: 'URGENT'}
];

const sourceOptions = [
  {label: '微信', value: 'WECHAT'},
  {label: '到店', value: 'STORE'},
  {label: '电话', value: 'PHONE'},
  {label: '复购', value: 'REBUY'}
];

const applyCostRuleOptions = [
  {label: '是', value: true},
  {label: '否', value: false}
];

const showAssignRepairerModal = ref(false);
const assignRepairerOrder = ref<OrderVO | null>(null);
const assignRepairerOptions = ref<any[]>([]);

const assignRepairerForm = reactive({
  repairerUserId: undefined as string | number | undefined,
  remark: ''
});

const showRepairPerformanceModal = ref(false);
const repairPerformanceOrder = ref<OrderVO | null>(null);
const repairPerformanceForm = reactive({
  repairManualAmount: 0,
  remark: ''
});

const showPrintRevenueModal = ref(false);
const printRevenueOrder = ref<OrderVO | null>(null);
const printRevenueForm = reactive({
  printReceivableAmount: 0,
  remark: ''
});

async function openAssignRepairer(row: OrderVO) {
  assignRepairerOrder.value = row;
  assignRepairerForm.repairerUserId = undefined;
  assignRepairerForm.remark = '';

  const res = await fetchRepairerOptions(row.repairSource || 'INTERNAL');
  assignRepairerOptions.value = res.data || res || [];

  showAssignRepairerModal.value = true;
}

async function submitAssignRepairer() {
  if (!assignRepairerOrder.value?.id) return;

  if (!assignRepairerForm.repairerUserId) {
    message.warning('请选择修模师');
    return;
  }

  await assignOrderRepairer(assignRepairerOrder.value.id, assignRepairerForm);

  message.success('指定修模师成功');
  showAssignRepairerModal.value = false;
  getList();
}

function openRepairPerformance(row: OrderVO) {
  repairPerformanceOrder.value = row;
  repairPerformanceForm.repairManualAmount = toNumber(row.repairManualAmount);
  repairPerformanceForm.remark = '';
  showRepairPerformanceModal.value = true;
}

async function submitRepairPerformance() {
  if (!repairPerformanceOrder.value?.id) return;
  await updateOrderRepairPerformance(repairPerformanceOrder.value.id, {
    repairManualAmount: repairPerformanceForm.repairManualAmount || 0,
    remark: repairPerformanceForm.remark
  });
  message.success('修模师业绩已更新');
  showRepairPerformanceModal.value = false;
  getList();
}

function openPrintRevenue(row: OrderVO) {
  printRevenueOrder.value = row;
  printRevenueForm.printReceivableAmount = toNumber(row.printReceivableAmount ?? row.printFinalAmount ?? row.printEstimateAmount);
  printRevenueForm.remark = '';
  showPrintRevenueModal.value = true;
}

async function submitPrintRevenue() {
  if (!printRevenueOrder.value?.id) return;
  await updateOrderPrintRevenue(printRevenueOrder.value.id, {
    printReceivableAmount: printRevenueForm.printReceivableAmount || 0,
    remark: printRevenueForm.remark
  });
  message.success('打印收费已更新');
  showPrintRevenueModal.value = false;
  getList();
}
const showResubmitPrintModelModal = ref(false);
const resubmitPrintModelOrder = ref<OrderVO | null>(null);
const resubmitPrintModelFileIds = ref<Array<string | number>>([]);

const resubmitPrintModelForm = reactive({
  remark: ''
});


const isEdit = computed(() => Boolean(form.id));
const isPaidLocked = computed(() => oldPayStatus.value === 'PAID');

function needRepair() {
  return form.orderType === 'REPAIR_ONLY' || form.orderType === 'REPAIR_PRINT';
}

function needPrint() {
  return form.orderType === 'PRINT_ONLY' || form.orderType === 'REPAIR_PRINT';
}

function blankPrintSpec(): PrintSpecFormItem {
  return {
    heightCm: null,
    quantity: 1,
    estimatedWeightG: null,
    estimatedAmount: null,
    remark: ''
  };
}

function hasPrintSpecInput(item: PrintSpecFormItem) {
  return item.heightCm !== null
    || item.estimatedWeightG !== null
    || item.estimatedAmount !== null
    || Boolean(item.remark);
}

function normalizePrintSpecsForForm(specs?: OrderPrintSpec[]): PrintSpecFormItem[] {
  const rows = (specs || []).map(item => ({
    id: item.id,
    heightCm: item.heightCm === undefined || item.heightCm === null ? null : Number(item.heightCm),
    quantity: 1,
    estimatedWeightG: item.estimatedWeightG === undefined || item.estimatedWeightG === null ? null : Number(item.estimatedWeightG),
    estimatedAmount: item.estimatedAmount === undefined || item.estimatedAmount === null ? null : Number(item.estimatedAmount),
    remark: item.remark || ''
  }));

  return rows.length > 0 ? rows : [blankPrintSpec()];
}

function addPrintSpec() {
  printSpecs.value.push(blankPrintSpec());
}

function removePrintSpec(index: number) {
  if (printSpecs.value.length <= 1) {
    printSpecs.value = [blankPrintSpec()];
    return;
  }
  printSpecs.value.splice(index, 1);
}

function validateOrderPrintSpecs() {
  if (!needPrint()) {
    return true;
  }

  for (const [index, item] of printSpecs.value.entries()) {
    if (!hasPrintSpecInput(item)) {
      continue;
    }
    if (!item.heightCm || item.heightCm <= 0) {
      message.warning(`第 ${index + 1} 条打印规格高度必须大于 0`);
      return false;
    }
  }

  return true;
}

function buildPrintSpecsPayload() {
  if (!needPrint()) {
    return [];
  }

  return printSpecs.value
    .filter(hasPrintSpecInput)
    .map((item, index) => ({
      id: item.id,
      heightCm: item.heightCm,
      quantity: 1,
      estimatedWeightG: item.estimatedWeightG,
      estimatedAmount: item.estimatedAmount,
      sortNo: index,
      remark: item.remark || ''
    }));
}

function orderTypeLabel(value?: string) {
  return orderTypeOptions.find(item => item.value === value)?.label || value || '-';
}

function productTypeLabel(value?: string) {
  if (!value) return '-';

  return productTypeOptions.value.find(item => String(item.value) === String(value))?.label || '-';
}

function repairSourceLabel(value?: string) {
  return repairSourceOptions.find(item => item.value === value)?.label || value || '-';
}

function payStatusLabel(value?: string) {
  return payStatusOptions.find(item => item.value === value)?.label || value || '-';
}

function businessStatusLabel(value?: string) {
  return businessStatusOptions.find(item => item.value === value)?.label || value || '-';
}

function financeStatusLabel(value?: string) {
  return financeStatusOptions.find(item => item.value === value)?.label || value || '-';
}

function stageName(stageCode?: string) {
  if (stageCode === 'REPAIR') return '修模';
  if (stageCode === 'PRINT') return '打印';
  if (stageCode === 'DELIVERY') return '发货';
  return stageCode || '-';
}

function buildDefaultStageRoutes(orderType?: string): BizOrderStageRouteSaveItem[] {
  if (orderType === 'REPAIR_ONLY') {
    return [
      {
        stageCode: 'REPAIR',
        routeMode: form.repairSource === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL'
      }
    ];
  }

  if (orderType === 'PRINT_ONLY') {
    return [
      {
        stageCode: 'PRINT',
        routeMode: 'INTERNAL'
      }
    ];
  }

  return [
    {
      stageCode: 'REPAIR',
      routeMode: form.repairSource === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL'
    },
    {
      stageCode: 'PRINT',
      routeMode: 'INTERNAL'
    }
  ];
}

function syncStageRoutesByOrderType() {
  const oldMap = new Map(stageRoutes.value.map(item => [item.stageCode, item]));

  stageRoutes.value = buildDefaultStageRoutes(form.orderType).map(item => {
    const old = oldMap.get(item.stageCode);

    if (!old) {
      return item;
    }

    return {
      ...item,
      id: old.id,
      routeMode: old.routeMode || item.routeMode,
      targetTenantId: old.targetTenantId,
      targetTenantNameSnapshot: old.targetTenantNameSnapshot,
      remark: old.remark
    };
  });
}

function normalizeStageRoutes() {
  stageRoutes.value = stageRoutes.value.map(item => {
    if (item.routeMode !== 'EXTERNAL') {
      return {
        ...item,
        targetTenantId: undefined,
        targetTenantNameSnapshot: undefined
      };
    }

    return item;
  });
}

function buildStageRoutePayload() {
  normalizeStageRoutes();

  return stageRoutes.value.map(item => ({
    id: item.id,
    stageCode: item.stageCode,
    routeMode: item.routeMode,
    targetTenantId: item.routeMode === 'EXTERNAL' ? item.targetTenantId : undefined,
    targetTenantNameSnapshot: item.routeMode === 'EXTERNAL' ? item.targetTenantNameSnapshot : undefined,
    remark: item.remark
  }));
}

function validateStageRoutes() {
  if (!stageRoutes.value.length) {
    message.warning('请配置工序路由');
    return false;
  }

  const externalRoute = stageRoutes.value.find(item => item.routeMode === 'EXTERNAL' && !item.targetTenantId);

  if (externalRoute) {
    message.warning(`工序选择外协执行时，必须选择协作商家`);
    return false;
  }

  return true;
}

function handleStageRouteModeChange(routeItem: BizOrderStageRouteSaveItem, value: string) {
  routeItem.routeMode = value;

  if (value !== 'EXTERNAL') {
    routeItem.targetTenantId = undefined;
    routeItem.targetTenantNameSnapshot = undefined;
  }

  /*
   * 兼容旧字段 repairSource：
   * 修模工序切到外协时，同步 repairSource = EXTERNAL；
   * 修模工序切回内部时，同步 repairSource = INTERNAL。
   */
  if (routeItem.stageCode === 'REPAIR' && value !== 'SKIP') {
    form.repairSource = value === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL';
  }
}

function handleStageRoutePartnerChange(routeItem: BizOrderStageRouteSaveItem, value: string) {
  routeItem.targetTenantId = value;

  const option = collabPartnerOptions.value.find(item => item.value === value);
  routeItem.targetTenantNameSnapshot = option?.label || '';
}


function businessStatusTagType(value?: string) {
  if (value === 'COMPLETED') return 'success';
  if (value === 'CLOSED') return 'error';

  if (['HD_REWORK', 'REPAIR_REWORK', 'REPAIR_REJECTED'].includes(String(value))) {
    return 'warning';
  }

  if (['WAIT_HD_REVIEW', 'WAIT_DELIVERY', 'WAIT_PRINT_COLLAB_SEND'].includes(String(value))) {
    return 'info';
  }

  if (['HD_PROCESSING', 'REPAIRING', 'PRINTING'].includes(String(value))) {
    return 'primary';
  }

  return 'default';
}


function payStatusTagType(value?: string) {
  if (value === 'PAID') return 'success';
  if (value === 'PARTIAL') return 'warning';
  return 'default';
}

function unwrapRows(res: any) {
  const data = res?.data || res;
  if (Array.isArray(data)) return data;
  return data?.rows || [];
}

function unwrapData(res: any) {
  return res?.data || res;
}

function toNumber(value: any, defaultValue = 0) {
  if (value === null || value === undefined || value === '') return defaultValue;
  const num = Number(value);
  return Number.isNaN(num) ? defaultValue : num;
}

function money(value: any) {
  return toNumber(value).toFixed(2);
}

function profitTagType(value: any) {
  const amount = toNumber(value);
  if (amount < 0) return 'error';
  if (amount > 0) return 'success';
  return 'default';
}

function getRouteSummaryMode(row: any) {
  return row?.routeSummaryMode || '';
}

function routeSummaryLabel(value?: string) {
  const map: Record<string, string> = {
    ALL_INTERNAL: '全内部',
    PARTIAL_EXTERNAL: '部分外协',
    ALL_EXTERNAL: '全外协'
  };

  return map[value || ''] || value || '-';
}

function routeSummaryTagType(value?: string) {
  if (value === 'ALL_EXTERNAL') {
    return 'warning';
  }

  if (value === 'PARTIAL_EXTERNAL') {
    return 'info';
  }

  if (value === 'ALL_INTERNAL') {
    return 'success';
  }

  return 'default';
}

function hasExternalRoute(row: any) {
  return ['PARTIAL_EXTERNAL', 'ALL_EXTERNAL'].includes(getRouteSummaryMode(row));
}

function isFinalOrderStatus(status?: string) {
  return ['COMPLETED', 'CLOSED'].includes(String(status || ''));
}

function canSendCollab(row: OrderVO) {
  return !isCollabInternalOrder(row)
    && hasExternalRoute(row)
    && !['COMPLETED', 'CLOSED', 'DELIVERED'].includes(String(row.businessStatus || ''));
}

function canAssignRepairer(row: OrderVO) {
  return row.orderType !== 'PRINT_ONLY'
    && row.repairSource !== 'EXTERNAL'
    && ['WAIT_REPAIR', 'REPAIRING', 'REPAIR_REWORK', 'REPAIR_REJECTED'].includes(String(row.businessStatus || ''))
    && !row.repairUserId;
}

function canDelivery(row: OrderVO) {
  return row.businessStatus === 'WAIT_DELIVERY';
}

function canComplete(row: OrderVO) {
  return row.businessStatus === 'DELIVERED';
}

function canResubmitPrintModel(row: OrderVO) {
  return row.orderType === 'PRINT_ONLY'
    && ['WAIT_MODEL_UPLOAD', 'PRINT_QC_REJECTED'].includes(String(row.businessStatus || ''));
}

function canEditOrder(row: OrderVO) {
  return !isCollabInternalOrder(row)
    && !isFinalOrderStatus(row.businessStatus)
    && row.businessStatus !== 'DELIVERED';
}

function canDeleteOrder(row: OrderVO) {
  return !isCollabInternalOrder(row)
    && row.payStatus !== 'PAID'
    && ['WAIT_REPAIR', 'WAIT_MODEL_UPLOAD', 'CLOSED'].includes(String(row.businessStatus || ''));
}

function canShowDeliveryRecords(row: OrderVO) {
  const status = String(row.businessStatus || '');

  return ['WAIT_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(status)
    || Boolean(row.expressCompany)
    || Boolean(row.trackingNo)
    || Boolean(row.deliveryTime);
}

function canSubmitHd(row: OrderVO) {
  return isCollabInternalOrder(row)
    && ['HD_PROCESSING', 'HD_REWORK'].includes(String(row.businessStatus || ''))
    && Boolean(row.sourceBizId);
}

function isWaitingHdReview(row: OrderVO) {
  return isCollabInternalOrder(row)
    && row.businessStatus === 'WAIT_HD_REVIEW';
}


function isCollabInternalOrder(row: Partial<OrderVO>) {
  return row.sourceBizType === 'COLLAB_ORDER';
}

function buildMoreActionOptions(row: OrderVO) {
  const options: any[] = [];

  if (canShowDeliveryRecords(row)) {
    options.push({
      label: '发货记录',
      key: 'deliveryRecords'
    });
  }

  if (canEditOrder(row)) {
    options.push({
      label: '编辑',
      key: 'edit'
    });
  }

  if (row.orderType === 'REPAIR_ONLY' || row.orderType === 'REPAIR_PRINT' || row.repairManualAmount !== undefined) {
    options.push({
      label: '修改修模师业绩',
      key: 'repairPerformance'
    });
  }

  if (row.orderType === 'PRINT_ONLY' || row.orderType === 'REPAIR_PRINT' || row.printFinalAmount !== undefined) {
    options.push({
      label: '修改打印收费',
      key: 'printRevenue'
    });
  }

  options.push({
    label: '日志',
    key: 'timeline'
  });

  if (canDeleteOrder(row)) {
    options.push({
      label: '删除',
      key: 'delete',
      props: {
        style: 'color: #d03050;'
      }
    });
  }

  return options;
}

function handleMoreOrderAction(key: string, row: OrderVO) {
  if (key === 'deliveryRecords') {
    openDeliveryRecords(row);
    return;
  }

  if (key === 'edit') {
    handleEdit(row);
    return;
  }

  if (key === 'timeline') {
    handleTimeline(row);
    return;
  }

  if (key === 'repairPerformance') {
    openRepairPerformance(row);
    return;
  }

  if (key === 'printRevenue') {
    openPrintRevenue(row);
    return;
  }

  if (key === 'delete') {
    if (window.confirm('确认删除该订单吗？')) {
      handleDelete(row);
    }
  }
}


function goToCollabSend(row: any) {
  if (!row?.id) {
    return;
  }

  router.push({
    path: '/xiezuo/collab-order-send',
    query: {
      sourceOrderId: String(row.id)
    }
  });
}


const columns = [
  {
    title: '订单号',
    key: 'orderNo',
    width: 170,
    fixed: 'left' as const
  },
  {
    title: '客户',
    key: 'customerNameSnapshot',
    width: 120,
    fixed: 'left' as const
  },
  {
    title: '手机号',
    key: 'customerPhoneSnapshot',
    width: 130
  },
  {
    title: '订单类型',
    key: 'orderType',
    width: 120,
    render(row: OrderVO) {
      return orderTypeLabel(row.orderType);
    }
  },
  {
    title: '产品',
    key: 'productName',
    width: 160
  },
  {
    title: '产品类型',
    key: 'productType',
    width: 130,
    render(row: OrderVO) {
      if (isCollabInternalOrder(row)) {
        return '-';
      }

      return productTypeLabel(row.productType);
    }
  },
  {
    title: '工序路由',
    key: 'routeSummaryMode',
    width: 110,
    render(row: OrderVO) {
      const value = getRouteSummaryMode(row);

      return h(
        NTag,
        {
          type: routeSummaryTagType(value),
          size: 'small'
        },
        {
          default: () => routeSummaryLabel(value)
        }
      );
    }
  },
  {
    title: '修模来源',
    key: 'repairSource',
    width: 110,
    render(row: OrderVO) {
      if (row.orderType === 'PRINT_ONLY') return '-';

      return h(
        NTag,
        {type: row.repairSource === 'EXTERNAL' ? 'warning' : 'success'},
        {default: () => repairSourceLabel(row.repairSource)}
      );
    }
  },
  {
    title: '业务状态',
    key: 'businessStatus',
    width: 140,
    render(row: OrderVO) {
      return h(
        NTag,
        {type: businessStatusTagType(row.businessStatus) as any},
        {default: () => businessStatusLabelByRow(row)}
      );
    }
  },
  {
    title: '支付状态',
    key: 'payStatus',
    width: 110,
    render(row: OrderVO) {
      return h(
        NTag,
        {type: payStatusTagType(row.payStatus) as any},
        {default: () => payStatusLabel(row.payStatus)}
      );
    }
  },
  {
    title: '修模时限',
    key: 'repairLimitHours',
    width: 110,
    render(row: OrderVO) {
      return row.repairLimitHours ? `${row.repairLimitHours}小时` : '-';
    }
  },
  {
    title: '原图',
    key: 'originalImageFiles',
    width: 90,
    render(row: OrderVO) {
      return h(BizFileThumbs, {
        orderId: row.id,
        fileStage: 'REPAIR_INPUT',
        fileType: 'ORIGINAL_IMAGE',
        mode: 'image',
        max: 1,
        thumbSize: 48
      });
    }
  },
  {
    title: '备注图',
    key: 'remarkImageFiles',
    width: 90,
    render(row: OrderVO) {
      return h(BizFileThumbs, {
        orderId: row.id,
        fileStage: 'REPAIR_INPUT',
        fileType: 'REMARK_IMAGE',
        mode: 'image',
        max: 1,
        thumbSize: 48
      });
    }
  },
  {
    title: '效果图',
    key: 'previewFiles',
    width: 90,
    render(row: OrderVO) {
      return h(BizFileThumbs, {
        orderId: row.id,
        fileStage: 'REPAIR_PREVIEW',
        fileType: 'REPAIR_PREVIEW_IMAGE',
        mode: 'image',
        max: 1,
        thumbSize: 48
      });
    }
  },
  {
    title: 'AI基础模型',
    key: 'aiModelFiles',
    width: 130,
    render(row: OrderVO) {
      return h(BizFileThumbs, {
        orderId: row.id,
        fileStage: 'REPAIR_INPUT',
        fileType: 'AI_BASE_MODEL_ZIP',
        mode: 'download',
        max: 1
      });
    }
  },
  {
    title: '打印模型',
    key: 'printInputModelFiles',
    width: 130,
    render(row: OrderVO) {
      return h(BizFileThumbs, {
        orderId: row.id,
        fileStage: 'PRINT_INPUT',
        fileType: 'CUSTOMER_MODEL_FILE',
        mode: 'download',
        max: 1
      });
    }
  },
  {
    title: '最终模型',
    key: 'modelFiles',
    width: 130,
    render(row: OrderVO) {
      return h(BizFileThumbs, {
        orderId: row.id,
        fileStage: 'REPAIR_MODEL',
        fileType: 'REPAIR_MODEL_FILE',
        mode: 'download',
        max: 1
      });
    }
  },
  {
    title: '销售额',
    key: 'saleAmountTotal',
    width: 100
  },
  {
    title: '定金',
    key: 'depositAmount',
    width: 100
  },
  {
    title: '已收',
    key: 'receivedAmount',
    width: 100
  },
  {
    title: '修模业绩',
    key: 'repairManualAmount',
    width: 110
  },
  {
    title: '打印预估',
    key: 'printEstimateAmount',
    width: 110
  },
  {
    title: '打印收费',
    key: 'printReceivableAmount',
    width: 110
  },
  {
    title: '总成本',
    key: 'totalCostAmount',
    width: 110,
    render(row: OrderVO) {
      return money(row.totalCostAmount);
    }
  },
  {
    title: '毛利',
    key: 'grossProfitAmount',
    width: 110,
    render(row: OrderVO) {
      return h(
        NTag,
        { type: profitTagType(row.grossProfitAmount), bordered: false },
        { default: () => money(row.grossProfitAmount) }
      );
    }
  },
  {
    title: '预计交付',
    key: 'expectedDeliveryTime',
    width: 170
  },
  {
    title: '创建时间',
    key: 'createTime',
    width: 170
  },
  {
    title: '操作',
    key: 'actions',
    width: 210,
    fixed: 'right' as const,
    render(row: OrderVO) {
      const buttons: VNodeChild[] = [];

      /**
       * 详情：所有订单都显示
       */
      buttons.push(
        h(
          NButton,
          {
            size: 'small',
            onClick: () => openOrderDetail(row)
          },
          { default: () => '详情' }
        )
      );

      if (canSubmitHd(row)) {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => openHdSubmitModal(row)
            },
            { default: () => '提交高清图' }
          )
        );
      }

      if (isWaitingHdReview(row)) {
        buttons.push(
          h(
            NTag,
            {
              size: 'small',
              type: 'warning',
              bordered: false
            },
            { default: () => '待发单方确认高清图' }
          )
        );
      }


      /**
       * 状态主操作
       */
      if (canDelivery(row)) {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => openDelivery(row)
            },
            { default: () => '发货' }
          )
        );
      }

      if (canComplete(row)) {
        buttons.push(
          h(
            NPopconfirm,
            {
              onPositiveClick: () => handleCompleteOrder(row)
            },
            {
              trigger: () =>
                h(
                  NButton,
                  {
                    size: 'small',
                    type: 'success'
                  },
                  { default: () => '完成' }
                ),
              default: () => '确认该订单已完成吗？'
            }
          )
        );
      }

      if (canResubmitPrintModel(row)) {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'warning',
              onClick: () => openResubmitPrintModel(row)
            },
            { default: () => '重新上传模型' }
          )
        );
      }

      if (canSendCollab(row)) {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => goToCollabSend(row)
            },
            { default: () => '发起协作' }
          )
        );
      }

      if (canAssignRepairer(row)) {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => openAssignRepairer(row)
            },
            { default: () => '指定修模师' }
          )
        );
      }

      const moreOptions = buildMoreActionOptions(row);

      if (moreOptions.length > 0) {
        buttons.push(
          h(
            NDropdown,
            {
              trigger: 'click',
              options: moreOptions,
              onSelect: key => handleMoreOrderAction(String(key), row)
            },
            {
              default: () =>
                h(
                  NButton,
                  {
                    size: 'small'
                  },
                  { default: () => '更多' }
                )
            }
          )
        );
      }

      return h(
        NSpace,
        {
          size: 6,
          wrap: true
        },
        {
          default: () => buttons
        }
      );
    }
  }
];

async function loadCustomers() {
  const res = await fetchCustomerList({
    pageNum: 1,
    pageSize: 200
  } as any);

  const rows = unwrapRows(res);

  customerOptions.value = rows.map((item: any) => ({
    label: `${item.customerName || ''} ${item.phone || ''} ${item.wechatNo || ''}`,
    value: item.id
  }));
}

async function loadProductTypes() {
  productTypeOptions.value = await fetchProductTypeOptions();
}

async function loadCollabPartners() {
  const res = await fetchCollabPartnerList({ status: 'ACCEPTED' } as any);
  const rows = unwrapRows(res);

  collabPartnerOptions.value = rows
    .map((item: any) => ({
      label: item.partnerTenantName || item.targetTenantNameSnapshot || item.applyTenantNameSnapshot || item.partnerName || '',
      value: item.partnerTenantId || item.targetTenantId || item.applyTenantId || ''
    }))
    .filter((item: { label: string; value: string }) => item.label && item.value);
}


async function loadRepairersBySource() {
  const res = await fetchRepairerOptions(form.repairSource || 'INTERNAL');
  const data = unwrapData(res);
  repairerOptions.value = data || [];
}

async function getList() {
  loading.value = true;
  try {
    const res = await fetchOrderList(queryParams);
    const data = unwrapData(res);
    tableData.value = data.rows || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

async function fetchFileIdsByOrder(orderId: string | number, fileStage: string, fileType: string) {
  const res = await fetchFileList({
    orderId,
    fileStage,
    fileType
  });

  const data = unwrapData(res);
  const list = Array.isArray(data) ? data : data.rows || [];

  return list.map((item: any) => item.id).filter(Boolean);
}

async function loadOrderFileIds(orderId?: string | number) {
  originalImageFileIds.value = [];
  remarkImageFileIds.value = [];
  aiBaseModelFileIds.value = [];
  printInputModelFileIds.value = [];

  if (!orderId) return;

  const [originalIds, remarkIds, aiIds, printModelIds] = await Promise.all([
    fetchFileIdsByOrder(orderId, 'REPAIR_INPUT', 'ORIGINAL_IMAGE'),
    fetchFileIdsByOrder(orderId, 'REPAIR_INPUT', 'REMARK_IMAGE'),
    fetchFileIdsByOrder(orderId, 'REPAIR_INPUT', 'AI_BASE_MODEL_ZIP'),
    fetchFileIdsByOrder(orderId, 'PRINT_INPUT', 'CUSTOMER_MODEL_FILE')
  ]);

  originalImageFileIds.value = originalIds;
  remarkImageFileIds.value = remarkIds;
  aiBaseModelFileIds.value = aiIds;
  printInputModelFileIds.value = printModelIds;
}

function calcRepairTotal() {
  form.repairTotalAmount = Number(
    (
      toNumber(form.hdAmount) +
      toNumber(form.aiModelAmount) +
      toNumber(form.repairManualAmount)
    ).toFixed(2)
  );
}

async function handlePreviewCostRule() {
  if (isPaidLocked.value) return;

  if (!needRepair()) {
    return;
  }

  if (!form.productType) {
    return;
  }

  const res = await previewProductCostRule({
    productType: form.productType,
    repairSource: form.repairSource || 'INTERNAL',
    saleAmountTotal: form.saleAmountTotal || 0,
    repairTotalAmount: form.repairTotalAmount || 0
  });

  const data = unwrapData(res);

  form.costRuleId = data.costRuleId;
  form.costRuleMode = data.costRuleMode;

  form.hdAmount = toNumber(data.hdAmount);
  form.aiModelAmount = toNumber(data.aiModelAmount);
  form.companyCostAmount = toNumber(data.companyCostAmount);
  form.followAmount = toNumber(data.followAmount);
  form.repairManualAmount = toNumber(data.repairManualAmount);
  form.repairTotalAmount = toNumber(data.repairTotalAmount);

  form.repairLimitHours = toNumber(data.repairLimitHours, 24);
  form.deadlineRemindMinutes = toNumber(data.deadlineRemindMinutes, 60);

  form.applyCostRule = true;

  message.success('已套用产品成本规则');
}

async function handleRepairSourceChange() {
  const repairRoute = stageRoutes.value.find(item => item.stageCode === 'REPAIR');

  if (repairRoute && repairRoute.routeMode !== 'SKIP') {
    repairRoute.routeMode = form.repairSource === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL';

    if (repairRoute.routeMode !== 'EXTERNAL') {
      repairRoute.targetTenantId = undefined;
      repairRoute.targetTenantNameSnapshot = undefined;
    }
  }

  form.repairAssigneeUserId = undefined;
  await loadRepairersBySource();

  if (form.productType) {
    await handlePreviewCostRule();
  }
}


async function handleOrderTypeChange() {
  syncStageRoutesByOrderType();
  if (needPrint() && printSpecs.value.length === 0) {
    printSpecs.value = [blankPrintSpec()];
  }

  if (!needRepair()) {
    form.repairAssigneeUserId = undefined;
    form.repairSource = 'INTERNAL';
  } else {
    await loadRepairersBySource();

    if (form.productType) {
      await handlePreviewCostRule();
    }
  }
}


async function submitResubmitPrintModel() {
  if (!resubmitPrintModelOrder.value?.id) return;

  if (resubmitPrintModelFileIds.value.length === 0) {
    message.warning('请上传客户模型文件');
    return;
  }

  await resubmitPrintOnlyModel(resubmitPrintModelOrder.value.id, {
    printInputModelFileIds: resubmitPrintModelFileIds.value.join(','),
    remark: resubmitPrintModelForm.remark
  });

  message.success('客户模型已重新提交，等待打印检测');
  showResubmitPrintModelModal.value = false;
  getList();
}


function openResubmitPrintModel(row: OrderVO) {
  resubmitPrintModelOrder.value = row;
  resubmitPrintModelFileIds.value = [];
  resubmitPrintModelForm.remark = '';
  showResubmitPrintModelModal.value = true;
}

function openHdSubmitModal(row: OrderVO) {
  if (!row.sourceBizId) {
    message.warning('当前订单缺少来源协作单ID');
    return;
  }

  currentHdOrder.value = row;
  hdSubmitFileIds.value = [];
  hdSubmitComment.value = '';
  showHdSubmitModal.value = true;
}

async function submitHdFiles() {
  if (!currentHdOrder.value?.sourceBizId) {
    message.warning('当前订单缺少来源协作单ID');
    return;
  }

  if (hdSubmitFileIds.value.length === 0) {
    message.warning('请上传处理后的高清图');
    return;
  }

  hdSubmitting.value = true;

  try {
    await submitCollabHdReview(currentHdOrder.value.sourceBizId, {
      fileIds: hdSubmitFileIds.value,
      comment: hdSubmitComment.value
    });

    message.success('高清图已提交，等待发单方确认');
    showHdSubmitModal.value = false;
    await getList();
  } finally {
    hdSubmitting.value = false;
  }
}


function resetQuery() {
  queryParams.orderNo = '';
  queryParams.customerNameSnapshot = '';
  queryParams.customerPhoneSnapshot = '';
  queryParams.orderType = '';
  queryParams.productName = '';
  queryParams.productType = '';
  queryParams.repairSource = '';
  queryParams.businessStatus = '';
  queryParams.financeStatus = '';
  queryParams.payStatus = '';
  queryParams.pageNum = 1;
  getList();
}

function resetForm() {
  Object.assign(form, {
    id: undefined,
    customerId: undefined,

    orderType: 'REPAIR_PRINT',
    productType: '',
    productName: '',
    quantity: 1,

    orderSource: 'WECHAT',
    priority: 'NORMAL',
    expectedDeliveryTime: '',

    repairSource: 'INTERNAL',
    repairAssigneeUserId: undefined,
    repairDeadlineTime: '',

    payStatus: 'UNPAID',
    applyCostRule: true,
    costRuleId: undefined,
    costRuleMode: '',

    saleAmountTotal: 0,
    depositAmount: 0,
    receivedAmount: 0,

    hdAmount: 0,
    aiModelAmount: 0,
    companyCostAmount: 0,
    followAmount: 0,
    repairManualAmount: 0,
    repairTotalAmount: 0,

    repairLimitHours: 24,
    deadlineRemindMinutes: 60,

    printEstimateAmount: 0,
    printDepositAmount: 0,

    receiverNameSnapshot: '',
    receiverPhoneSnapshot: '',
    receiverAddressSnapshot: '',
    customerNameSnapshot: '',
    customerPhoneSnapshot: '',

    remark: ''
  });

  originalImageFileIds.value = [];
  remarkImageFileIds.value = [];
  aiBaseModelFileIds.value = [];
  printInputModelFileIds.value = [];
  printSpecs.value = [blankPrintSpec()];
  stageRoutes.value = buildDefaultStageRoutes('REPAIR_PRINT');

}

function assignOrderToForm(row: OrderVO) {
  Object.assign(form, row);

  form.saleAmountTotal = toNumber(row.saleAmountTotal);
  form.depositAmount = toNumber(row.depositAmount);
  form.receivedAmount = toNumber(row.receivedAmount);

  form.hdAmount = toNumber(row.hdAmount);
  form.aiModelAmount = toNumber(row.aiModelAmount);
  form.companyCostAmount = toNumber(row.companyCostAmount);
  form.followAmount = toNumber(row.followAmount);
  form.repairManualAmount = toNumber(row.repairManualAmount);
  form.repairTotalAmount = toNumber(row.repairTotalAmount);

  form.printEstimateAmount = toNumber(row.printEstimateAmount);
  form.printDepositAmount = toNumber(row.printDepositAmount);

  form.repairLimitHours = toNumber(row.repairLimitHours, 24);
  form.deadlineRemindMinutes = toNumber(row.deadlineRemindMinutes, 60);

  form.repairSource = row.repairSource || 'INTERNAL';
  form.payStatus = row.payStatus || 'UNPAID';
  form.applyCostRule = false;
  printSpecs.value = normalizePrintSpecsForForm(row.printSpecs);
}

async function handleAdd() {
  resetForm();

  await Promise.all([
    loadCustomers(),
    loadProductTypes()
  ]);

  await loadRepairersBySource();

  syncStageRoutesByOrderType();

  oldPayStatus.value = 'UNPAID';

  modalTitle.value = '新增订单';
  showModal.value = true;
}

async function handleEdit(row: OrderVO) {
  resetForm();

  await Promise.all([
    loadCustomers(),
    loadProductTypes()
  ]);

  const detailRes = row.id ? await fetchOrderDetail(row.id) : null;
  const detailData = detailRes ? unwrapData(detailRes) : null;
  const detailOrder = detailData?.order || detailData || row;

  assignOrderToForm(detailOrder);

  oldPayStatus.value = detailOrder.payStatus || 'UNPAID';

  await Promise.all([
    loadRepairersBySource(),
    loadOrderFileIds(row.id)
  ]);

  await loadOrderStageRoutesForEdit(row.id, row.orderType);


  modalTitle.value = '编辑订单';
  showModal.value = true;
}

async function handleSubmit() {
  if (isPaidLocked.value) {
    message.warning('订单已支付，不能修改');
    return;
  }

  if (!form.customerId) {
    message.warning('请选择客户');
    return;
  }

  if (!form.productName) {
    message.warning('请输入产品名称');
    return;
  }

  if (needRepair() && !form.productType) {
    message.warning('需要修模的订单请选择产品类型');
    return;
  }

  if (form.orderType === 'PRINT_ONLY' && printInputModelFileIds.value.length === 0) {
    message.warning('只打印订单请上传客户模型文件');
    return;
  }

  if (!validateStageRoutes()) {
    return;
  }

  if (!validateOrderPrintSpecs()) {
    return;
  }

  const submitData = {
    ...form,
    originalImageFileIds: originalImageFileIds.value.join(','),
    remarkImageFileIds: remarkImageFileIds.value.join(','),
    aiBaseModelFileIds: aiBaseModelFileIds.value.join(','),
    printInputModelFileIds: printInputModelFileIds.value.join(','),
    stageRoutes: buildStageRoutePayload(),
    printSpecs: buildPrintSpecsPayload()
  };

  if (form.id) {
    await updateOrder(submitData);
    message.success('修改成功');
  } else {
    await addOrder(submitData);
    message.success('新增成功');
  }

  showModal.value = false;
  getList();
}

async function handleDelete(row: OrderVO) {
  if (!row.id) return;

  await deleteOrder(row.id);
  message.success('删除成功');
  getList();
}

async function handleTimeline(row: OrderVO) {
  if (!row.id) return;

  const res = await fetchOrderTimeline(row.id);
  const data = unwrapData(res);

  timelineList.value = data || [];
  showTimelineModal.value = true;
}

function handlePageChange(page: number) {
  queryParams.pageNum = page;
  getList();
}

function handlePageSizeChange(pageSize: number) {
  queryParams.pageSize = pageSize;
  queryParams.pageNum = 1;
  getList();
}

function openDelivery(row: OrderVO) {
  currentOrder.value = row;

  deliveryForm.deliveryType = 'EXPRESS';

  deliveryForm.receiverName = row.receiverName || row.receiverNameSnapshot || row.customerNameSnapshot || '';
  deliveryForm.receiverPhone = row.receiverPhone || row.receiverPhoneSnapshot || row.customerPhoneSnapshot || '';
  deliveryForm.receiverProvince = row.receiverProvince || '';
  deliveryForm.receiverCity = row.receiverCity || '';
  deliveryForm.receiverDistrict = row.receiverDistrict || '';
  deliveryForm.receiverAddress = row.receiverAddress || row.receiverAddressSnapshot || '';

  deliveryForm.expressCompany = '';
  deliveryForm.trackingNo = '';
  deliveryForm.remark = '';

  deliveryProofFileIdList.value = [];

  showDeliveryModal.value = true;
}

async function submitDelivery() {
  if (!currentOrder.value?.id) return;

  if (deliveryForm.deliveryType === 'EXPRESS') {
    if (!deliveryForm.receiverName) {
      message.warning('请填写收件人');
      return;
    }

    if (!deliveryForm.receiverPhone) {
      message.warning('请填写收件人手机号');
      return;
    }

    if (!deliveryForm.receiverAddress) {
      message.warning('请填写收件地址');
      return;
    }

    if (!deliveryForm.expressCompany) {
      message.warning('请填写快递公司');
      return;
    }

    if (!deliveryForm.trackingNo) {
      message.warning('请填写快递单号');
      return;
    }
  }

  if (isCollabInternalOrder(currentOrder.value) && !currentOrder.value.sourceBizId) {
    message.error('协作单ID缺失，无法同步发货');
    return;
  }

  if (isCollabInternalOrder(currentOrder.value)) {
    const collabOrderId = currentOrder.value.sourceBizId!;
    await deliveryCollabOrder(collabOrderId, {
      logisticsCompany: deliveryForm.expressCompany,
      logisticsNo: deliveryForm.trackingNo,
      fileIds: deliveryProofFileIdList.value,
      remark: deliveryForm.remark
    });
  } else {
    await deliverOrder(currentOrder.value.id, {
      ...deliveryForm,
      deliveryProofFileIds: deliveryProofFileIdList.value.join(',')
    });
  }

  message.success('发货/交付成功');
  showDeliveryModal.value = false;
  getList();
}

async function handleCompleteOrder(row: OrderVO) {
  if (!row.id) return;

  await completeOrder(row.id, {
    remark: '管理员确认订单完成'
  });

  message.success('订单已完成');
  getList();
}

async function openDeliveryRecords(row: OrderVO) {
  if (!row.id) return;

  const res = await fetchDeliveryRecords(row.id);
  const data = res.data || res;

  deliveryRecords.value = data || [];
  showDeliveryRecordsModal.value = true;
}

function businessStatusLabelByRow(row: OrderVO) {
  if (row.businessStatus === 'WAIT_MODEL_UPLOAD' && row.orderType === 'PRINT_ONLY') {
    return '待重新上传客户模型';
  }

  return businessStatusLabel(row.businessStatus);
}

async function loadOrderStageRoutesForEdit(orderId?: string | number, orderType?: string) {
  if (!orderId) {
    stageRoutes.value = buildDefaultStageRoutes(orderType || form.orderType);
    return;
  }

  const res = await fetchOrderStageRoutes(orderId);
  const rows = unwrapData(res) as BizOrderStageRouteVo[];

  if (!Array.isArray(rows) || rows.length === 0) {
    stageRoutes.value = buildDefaultStageRoutes(orderType || form.orderType);
    return;
  }

  stageRoutes.value = rows.map(item => ({
    id: item.id,
    stageCode: item.stageCode || '',
    routeMode: item.routeMode || 'INTERNAL',
    targetTenantId: item.targetTenantId,
    targetTenantNameSnapshot: item.targetTenantNameSnapshot,
    remark: item.remark
  }));
}


function applyRouteQuery() {
  const q = route.query;

  if ('businessStatus' in q) {
    queryParams.businessStatus = routeQueryString(q.businessStatus);
  }

  queryParams.pageNum = 1;
}


onMounted(() => {
  applyRouteQuery();
  getList();
  loadCustomers();
  loadProductTypes();
  loadCollabPartners();
});


watch(
  () => route.fullPath,
  () => {
    applyRouteQuery();
    getList();
  }
);

</script>

<template>
  <NCard title="订单管理" :bordered="false" >
    <NSpace vertical :size="16">
      <NForm inline label-placement="left">
        <NFormItem label="订单号">
          <NInput v-model:value="queryParams.orderNo" placeholder="请输入订单号" clearable/>
        </NFormItem>

        <NFormItem label="订单类型">
          <NSelect
            v-model:value="queryParams.orderType"
            :options="orderTypeOptions"
            clearable
            style="width: 150px"
          />
        </NFormItem>

        <NFormItem label="客户">
          <NInput v-model:value="queryParams.customerNameSnapshot" placeholder="请输入客户名" clearable/>
        </NFormItem>

        <NFormItem label="手机号">
          <NInput v-model:value="queryParams.customerPhoneSnapshot" placeholder="请输入手机号" clearable/>
        </NFormItem>

        <NFormItem label="产品类型">
          <NSelect
            v-model:value="queryParams.productType"
            :options="productTypeOptions"
            clearable
            filterable
            style="width: 150px"
          />
        </NFormItem>

        <NFormItem label="状态">
          <NSelect
            v-model:value="queryParams.businessStatus"
            :options="businessStatusOptions"
            clearable
            style="width: 150px"
          />
        </NFormItem>

        <NFormItem label="支付">
          <NSelect
            v-model:value="queryParams.payStatus"
            :options="payStatusOptions"
            clearable
            style="width: 120px"
          />
        </NFormItem>

        <NFormItem>
          <NSpace>
            <NButton type="primary" @click="getList">查询</NButton>
            <NButton @click="resetQuery">重置</NButton>
            <NButton type="success" @click="handleAdd">新增订单</NButton>
          </NSpace>
        </NFormItem>
      </NForm>

      <NDataTable
        remote
        :loading="loading"
        :columns="columns"
        :data="tableData"
        :scroll-x="3600"
        :pagination="{
          page: queryParams.pageNum,
          pageSize: queryParams.pageSize,
          itemCount: total,
          showSizePicker: true,
          pageSizes: [10, 20, 50, 100],
          onUpdatePage: handlePageChange,
          onUpdatePageSize: handlePageSizeChange
        }"
      />
    </NSpace>

    <NModal v-model:show="showModal" preset="card" :title="modalTitle" style="width: min(1180px, 96vw)">
      <NSpace vertical :size="12">
        <NAlert v-if="isPaidLocked" type="warning" title="订单已支付">
          当前订单已支付，普通编辑已锁定。如需修改，请后续走订单调整流程。
        </NAlert>

        <NTabs type="line" animated>
          <NTabPane name="base" tab="订单基础">
            <NForm label-placement="left" label-width="120">
              <NGrid :cols="2" :x-gap="16" :y-gap="4">
                <NGridItem>
                  <NFormItem label="选择客户" required>
                    <NSelect
                      v-model:value="form.customerId"
                      :options="customerOptions"
                      filterable
                      clearable
                      :disabled="isPaidLocked"
                      placeholder="请选择客户"
                    />
                  </NFormItem>
                </NGridItem>

                <NGridItem>
                  <NFormItem label="订单类型" required>
                    <NSelect
                      v-model:value="form.orderType"
                      :options="orderTypeOptions"
                      :disabled="isPaidLocked"
                      @update:value="handleOrderTypeChange"
                    />
                  </NFormItem>
                </NGridItem>

                <NGridItem>
                  <NFormItem label="产品名称" required>
                    <NInput
                      v-model:value="form.productName"
                      :disabled="isPaidLocked"
                      placeholder="例如：真人手办全彩打印"
                    />
                  </NFormItem>
                </NGridItem>

                <NGridItem>
                  <NFormItem label="数量">
                    <NInputNumber
                      v-model:value="form.quantity"
                      :min="1"
                      :disabled="isPaidLocked"
                      style="width: 200px"
                    />
                  </NFormItem>
                </NGridItem>

                <NGridItem>
                  <NFormItem label="产品类型" required>
                    <NSelect
                      v-model:value="form.productType"
                      :options="productTypeOptions"
                      filterable
                      clearable
                      :disabled="isPaidLocked"
                      placeholder="请选择产品类型"
                      @update:value="handlePreviewCostRule"
                    />
                  </NFormItem>
                </NGridItem>

                <NGridItem>
                  <NFormItem label="订单来源">
                    <NSelect
                      v-model:value="form.orderSource"
                      :options="sourceOptions"
                      :disabled="isPaidLocked"
                    />
                  </NFormItem>
                </NGridItem>

                <NGridItem>
                  <NFormItem label="优先级">
                    <NSelect
                      v-model:value="form.priority"
                      :options="priorityOptions"
                      :disabled="isPaidLocked"
                    />
                  </NFormItem>
                </NGridItem>

                <NGridItem>
                  <NFormItem label="预计交付">
                    <NInput
                      v-model:value="form.expectedDeliveryTime"
                      :disabled="isPaidLocked"
                      placeholder="例如：2026-05-20 18:00:00"
                    />
                  </NFormItem>
                </NGridItem>
              </NGrid>

              <NCard title="工序路由" size="small" class="mb-16px">
                <NAlert type="info" show-icon class="mb-12px">
                  工序路由决定该订单后续是否可以从协作中心按工序派单。选择“外协执行”时必须选择好友协作商家。
                </NAlert>

                <NSpace vertical>
                  <NGrid
                    v-for="routeItem in stageRoutes"
                    :key="routeItem.stageCode"
                    :cols="24"
                    :x-gap="12"
                    :y-gap="8"
                    responsive="screen"
                  >
                    <NGridItem :span="4">
                      <NFormItem label="工序">
                        <NTag type="info">
                          {{ stageName(routeItem.stageCode) }}
                        </NTag>
                      </NFormItem>
                    </NGridItem>

                    <NGridItem :span="6">
                      <NFormItem label="执行方式">
                        <NSelect
                          v-model:value="routeItem.routeMode"
                          :options="routeModeOptions"
                          :disabled="isPaidLocked"
                          @update:value="value => handleStageRouteModeChange(routeItem, value)"
                        />
                      </NFormItem>
                    </NGridItem>

                    <NGridItem :span="8">
                      <NFormItem label="协作商家">
                        <NSelect
                          v-model:value="routeItem.targetTenantId"
                          :options="collabPartnerOptions"
                          :disabled="isPaidLocked || routeItem.routeMode !== 'EXTERNAL'"
                          filterable
                          clearable
                          placeholder="选择外协执行商家"
                          @update:value="value => handleStageRoutePartnerChange(routeItem, value)"
                        />
                      </NFormItem>
                    </NGridItem>

                    <NGridItem :span="6">
                      <NFormItem label="备注">
                        <NInput
                          v-model:value="routeItem.remark"
                          :disabled="isPaidLocked"
                          placeholder="工序备注"
                        />
                      </NFormItem>
                    </NGridItem>
                  </NGrid>
                </NSpace>
              </NCard>

            </NForm>
          </NTabPane>

          <NTabPane name="price" tab="费用与规则">
            <NForm label-placement="left" label-width="130">
              <NGrid :cols="2" :x-gap="16" :y-gap="4">
                <NGridItem>
                  <NFormItem label="销售金额">
                    <NInputNumber
                      v-model:value="form.saleAmountTotal"
                      :min="0"
                      :disabled="isPaidLocked"
                      style="width: 220px"
                    />

                  </NFormItem>
                  <NAlert type="info">
                    销售金额是公司向客户收取的订单总金额，包含对外收取的修模费用和打印费用；内部修模成本、修模师业绩不作为客户应收金额。
                  </NAlert>
                </NGridItem>

                <NGridItem>
                  <NFormItem label="支付状态">
                    <NTag>
                      {{ payStatusLabel(form.payStatus) }}
                    </NTag>
                  </NFormItem>

                </NGridItem>

                <NGridItem>
                  <NFormItem label="定金">
                    <NInputNumber
                      v-model:value="form.depositAmount"
                      :min="0"
                      :disabled="isPaidLocked"
                      style="width: 220px"
                    />
                  </NFormItem>
                </NGridItem>

                <NGridItem>
                  <NFormItem label="已收金额">
                    <NInputNumber
                      v-model:value="form.receivedAmount"
                      :min="0"
                      :disabled="isPaidLocked"
                      style="width: 220px"
                    />
                  </NFormItem>
                </NGridItem>
              </NGrid>

              <template v-if="needRepair()">
                <NAlert type="info" style="margin-bottom: 12px">
                  修模费用、修模时限会根据产品类型和修模来源自动套规则；订单未支付前允许修改并同步到修模任务。
                </NAlert>

                <NGrid :cols="2" :x-gap="16" :y-gap="4">
                  <NGridItem>
                    <NFormItem label="修模来源">
                      <NSelect
                        v-model:value="form.repairSource"
                        :options="repairSourceOptions"
                        :disabled="isPaidLocked"
                        @update:value="handleRepairSourceChange"
                      />
                    </NFormItem>
                  </NGridItem>

                  <NGridItem>
                    <NFormItem label="指定修模师">
                      <NSelect
                        v-model:value="form.repairAssigneeUserId"
                        :options="repairerOptions"
                        filterable
                        clearable
                        :disabled="isPaidLocked"
                        placeholder="不选择则进入任务大厅"
                      />
                    </NFormItem>
                  </NGridItem>

                  <NGridItem>
                    <NFormItem label="高清处理费">
                      <NInputNumber
                        v-model:value="form.hdAmount"
                        :min="0"
                        :disabled="isPaidLocked"
                        style="width: 220px"
                        @update:value="calcRepairTotal"
                      />
                    </NFormItem>
                  </NGridItem>

                  <NGridItem>
                    <NFormItem label="AI建模费">
                      <NInputNumber
                        v-model:value="form.aiModelAmount"
                        :min="0"
                        :disabled="isPaidLocked"
                        style="width: 220px"
                        @update:value="calcRepairTotal"
                      />
                    </NFormItem>
                  </NGridItem>

                  <NGridItem>
                    <NFormItem label="公司成本">
                      <NInputNumber
                        v-model:value="form.companyCostAmount"
                        :min="0"
                        :disabled="isPaidLocked"
                        style="width: 220px"
                      />
                    </NFormItem>
                  </NGridItem>

                  <NGridItem>
                    <NFormItem label="跟单业绩">
                      <NInputNumber
                        v-model:value="form.followAmount"
                        :min="0"
                        :disabled="isPaidLocked"
                        style="width: 220px"
                      />
                    </NFormItem>
                  </NGridItem>

                  <NGridItem>
                    <NFormItem label="修模师业绩">
                      <NInputNumber
                        v-model:value="form.repairManualAmount"
                        :min="0"
                        :disabled="isPaidLocked"
                        style="width: 220px"
                        @update:value="calcRepairTotal"
                      />
                    </NFormItem>
                  </NGridItem>

                  <NGridItem>
                    <NFormItem label="修模总额">
                      <NInputNumber
                        v-model:value="form.repairTotalAmount"
                        :min="0"
                        :disabled="isPaidLocked"
                        style="width: 220px"
                      />
                    </NFormItem>
                  </NGridItem>

                  <NGridItem>
                    <NFormItem label="修模时限/h">
                      <NInputNumber
                        v-model:value="form.repairLimitHours"
                        :min="1"
                        :disabled="isPaidLocked"
                        style="width: 220px"
                      />
                    </NFormItem>
                  </NGridItem>

                  <NGridItem>
                    <NFormItem label="提前提醒/min">
                      <NInputNumber
                        v-model:value="form.deadlineRemindMinutes"
                        :min="1"
                        :disabled="isPaidLocked"
                        style="width: 220px"
                      />
                    </NFormItem>
                  </NGridItem>
                </NGrid>

                <NSpace>
                  <NButton type="primary" :disabled="isPaidLocked" @click="handlePreviewCostRule">
                    重新套用产品规则
                  </NButton>
                </NSpace>
              </template>

              <template v-if="needPrint()">
                <NAlert type="info" style="margin: 12px 0">
                  打印预估价和打印押金在订单未支付前允许修改，并同步到打印任务。
                </NAlert>

                <NGrid :cols="2" :x-gap="16" :y-gap="4">
                  <NGridItem>
                    <NFormItem label="打印预估价">
                      <NInputNumber
                        v-model:value="form.printEstimateAmount"
                        :min="0"
                        :disabled="isPaidLocked"
                        style="width: 220px"
                      />
                    </NFormItem>
                  </NGridItem>

                  <NGridItem>
                    <NFormItem label="打印押金">
                      <NInputNumber
                        v-model:value="form.printDepositAmount"
                        :min="0"
                        :disabled="isPaidLocked"
                        style="width: 220px"
                      />
                    </NFormItem>
                  </NGridItem>
                </NGrid>

                <NCard title="打印规格" size="small" style="margin-top: 12px">
                  <NSpace vertical :size="10">
                    <NAlert type="info">
                      每条打印规格代表 1 件打印物；同样大小需要多打时也请新增多条规格，便于后续逐件录入真实克重。
                    </NAlert>

                    <NGrid
                      v-for="(item, index) in printSpecs"
                      :key="index"
                      :cols="24"
                      :x-gap="12"
                      :y-gap="8"
                      responsive="screen"
                    >
                      <NGridItem :span="6">
                        <NFormItem label="高度/cm">
                          <NInputNumber
                            v-model:value="item.heightCm"
                            :min="0"
                            :precision="2"
                            :show-button="false"
                            :disabled="isPaidLocked"
                            style="width: 100%"
                          />
                        </NFormItem>
                      </NGridItem>

                      <NGridItem :span="4">
                        <NFormItem label="数量">
                          <NInputNumber
                            v-model:value="item.quantity"
                            :min="1"
                            :precision="0"
                            :show-button="false"
                            disabled
                            style="width: 100%"
                          />
                        </NFormItem>
                      </NGridItem>

                      <NGridItem :span="7">
                        <NFormItem label="预估克重/g">
                          <NInputNumber
                            v-model:value="item.estimatedWeightG"
                            :min="0"
                            :precision="2"
                            :show-button="false"
                            :disabled="isPaidLocked"
                            style="width: 100%"
                          />
                        </NFormItem>
                      </NGridItem>

                      <NGridItem :span="7">
                        <NFormItem label="预估金额">
                          <NInputNumber
                            v-model:value="item.estimatedAmount"
                            :min="0"
                            :precision="2"
                            :show-button="false"
                            :disabled="isPaidLocked"
                            style="width: 100%"
                          />
                        </NFormItem>
                      </NGridItem>

                      <NGridItem :span="20">
                        <NFormItem label="备注">
                          <NInput
                            v-model:value="item.remark"
                            :disabled="isPaidLocked"
                            placeholder="规格说明"
                          />
                        </NFormItem>
                      </NGridItem>

                      <NGridItem :span="4">
                        <NFormItem label="操作">
                          <NButton
                            size="small"
                            tertiary
                            type="error"
                            :disabled="isPaidLocked"
                            @click="removePrintSpec(index)"
                          >
                            删除
                          </NButton>
                        </NFormItem>
                      </NGridItem>
                    </NGrid>

                    <NButton size="small" type="primary" ghost :disabled="isPaidLocked" @click="addPrintSpec">
                      新增打印规格
                    </NButton>
                  </NSpace>
                </NCard>
              </template>
            </NForm>
          </NTabPane>

          <NTabPane name="files" tab="业务文件">
            <NForm label-placement="left" label-width="130">
              <template v-if="needRepair()">
                <NGrid :cols="1" :x-gap="16" :y-gap="12">
                  <NGridItem>
                    <NFormItem label="原图">
                      <NSpace vertical>
                        <BizFileUpload
                          v-if="!isPaidLocked"
                          v-model="originalImageFileIds"
                          biz-type="TEMP"
                          file-stage="REPAIR_INPUT"
                          file-type="ORIGINAL_IMAGE"
                          :max="10"
                        />
                        <BizFileViewer
                          v-if="originalImageFileIds.length > 0"
                          :file-ids="originalImageFileIds"
                          mode="image"
                          :max="10"
                          :thumb-size="80"
                          show-name
                        />
                      </NSpace>
                    </NFormItem>
                  </NGridItem>

                  <NGridItem>
                    <NFormItem label="备注图">
                      <NSpace vertical>
                        <BizFileUpload
                          v-if="!isPaidLocked"
                          v-model="remarkImageFileIds"
                          biz-type="TEMP"
                          file-stage="REPAIR_INPUT"
                          file-type="REMARK_IMAGE"
                          :max="10"
                        />
                        <BizFileViewer
                          v-if="remarkImageFileIds.length > 0"
                          :file-ids="remarkImageFileIds"
                          mode="image"
                          :max="10"
                          :thumb-size="80"
                          show-name
                        />
                      </NSpace>
                    </NFormItem>
                  </NGridItem>

                  <NGridItem>
                    <NFormItem label="AI基础模型">
                      <NSpace vertical>
                        <BizFileUpload
                          v-if="!isPaidLocked"
                          v-model="aiBaseModelFileIds"
                          biz-type="TEMP"
                          file-stage="REPAIR_INPUT"
                          file-type="AI_BASE_MODEL_ZIP"
                          :max="10"
                        />
                        <BizFileViewer
                          v-if="aiBaseModelFileIds.length > 0"
                          :file-ids="aiBaseModelFileIds"
                          mode="download"
                          :max="10"
                          show-name
                        />
                      </NSpace>
                    </NFormItem>
                  </NGridItem>
                </NGrid>
              </template>

              <template v-if="form.orderType === 'PRINT_ONLY'">
                <NFormItem label="客户模型文件" required>
                  <NSpace vertical>
                    <BizFileUpload
                      v-if="!isPaidLocked"
                      v-model="printInputModelFileIds"
                      biz-type="TEMP"
                      file-stage="PRINT_INPUT"
                      file-type="CUSTOMER_MODEL_FILE"
                      :max="10"
                    />
                    <BizFileViewer
                      v-if="printInputModelFileIds.length > 0"
                      :file-ids="printInputModelFileIds"
                      mode="download"
                      :max="10"
                      show-name
                    />
                  </NSpace>
                </NFormItem>
              </template>

              <template v-if="!needRepair() && form.orderType !== 'PRINT_ONLY'">
                <NAlert type="default">当前订单类型暂无需要上传的业务文件。</NAlert>
              </template>
            </NForm>
          </NTabPane>

          <NTabPane name="address" tab="收货地址">
            <NForm label-placement="left" label-width="120">
              <NGrid :cols="2" :x-gap="16" :y-gap="4">
                <NGridItem>
                  <NFormItem label="收件人">
                    <NInput
                      v-model:value="form.receiverNameSnapshot"
                      :disabled="isPaidLocked"
                      placeholder="不填则默认客户姓名"
                    />
                  </NFormItem>
                </NGridItem>

                <NGridItem>
                  <NFormItem label="收件电话">
                    <NInput
                      v-model:value="form.receiverPhoneSnapshot"
                      :disabled="isPaidLocked"
                      placeholder="不填则默认客户手机号"
                    />
                  </NFormItem>
                </NGridItem>

                <NGridItem :span="2">
                  <NFormItem label="收件地址">
                    <NInput
                      v-model:value="form.receiverAddressSnapshot"
                      :disabled="isPaidLocked"
                      type="textarea"
                      placeholder="不填则默认客户地址"
                    />
                  </NFormItem>
                </NGridItem>

                <NGridItem :span="2">
                  <NFormItem label="订单备注">
                    <NInput
                      v-model:value="form.remark"
                      :disabled="isPaidLocked"
                      type="textarea"
                      placeholder="请输入订单备注"
                    />
                  </NFormItem>
                </NGridItem>
              </NGrid>
            </NForm>
          </NTabPane>
        </NTabs>
      </NSpace>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showModal = false">取消</NButton>
          <NButton type="primary" :disabled="isPaidLocked" @click="handleSubmit">保存</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showTimelineModal" preset="card" title="订单日志" style="width: 680px">
      <div v-if="timelineList.length === 0">暂无日志</div>

      <NSpace v-else vertical>
        <div v-for="item in timelineList" :key="item.id" style="border-bottom: 1px solid #eee; padding: 8px 0">
          <div>
            <strong>{{ item.actionType }}</strong>
            <span style="margin-left: 12px">{{ item.createTime }}</span>
          </div>
          <div>{{ item.content }}</div>
          <div style="color: #999">操作人：{{ item.operatorName || '-' }}</div>
        </div>
      </NSpace>
    </NModal>
    <NModal v-model:show="showDeliveryModal" preset="card" title="订单发货/交付" style="width: 760px">
      <NForm label-placement="left" label-width="120">
        <NFormItem label="交付方式" required>
          <NSelect
            v-model:value="deliveryForm.deliveryType"
            :options="deliveryTypeOptions"
          />
        </NFormItem>

        <template v-if="deliveryForm.deliveryType === 'EXPRESS' || deliveryForm.deliveryType === 'LOCAL_DELIVERY'">
          <NFormItem label="收件人" required>
            <NInput v-model:value="deliveryForm.receiverName" placeholder="请输入收件人"/>
          </NFormItem>

          <NFormItem label="收件电话" required>
            <NInput v-model:value="deliveryForm.receiverPhone" placeholder="请输入收件电话"/>
          </NFormItem>

          <NFormItem label="省">
            <NInput v-model:value="deliveryForm.receiverProvince" placeholder="省"/>
          </NFormItem>

          <NFormItem label="市">
            <NInput v-model:value="deliveryForm.receiverCity" placeholder="市"/>
          </NFormItem>

          <NFormItem label="区县">
            <NInput v-model:value="deliveryForm.receiverDistrict" placeholder="区县"/>
          </NFormItem>

          <NFormItem label="详细地址" required>
            <NInput
              v-model:value="deliveryForm.receiverAddress"
              type="textarea"
              placeholder="请输入详细地址"
            />
          </NFormItem>
        </template>

        <template v-if="deliveryForm.deliveryType === 'EXPRESS'">
          <NFormItem label="快递公司" required>
            <NInput v-model:value="deliveryForm.expressCompany" placeholder="例如 顺丰 / 中通 / 京东"/>
          </NFormItem>

          <NFormItem label="快递单号" required>
            <NInput v-model:value="deliveryForm.trackingNo" placeholder="请输入快递单号"/>
          </NFormItem>
        </template>

        <NFormItem label="发货凭证">
          <BizFileUpload
            v-model="deliveryProofFileIdList"
            biz-type="TEMP"
            file-stage="DELIVERY"
            file-type="DELIVERY_PROOF"
            :max="5"
          />
        </NFormItem>

        <NFormItem label="备注">
          <NInput
            v-model:value="deliveryForm.remark"
            type="textarea"
            placeholder="请输入备注"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showDeliveryModal = false">取消</NButton>
          <NButton type="primary" @click="submitDelivery">确认发货</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showDeliveryRecordsModal" preset="card" title="发货/交付记录" style="width: 820px">
      <div v-if="deliveryRecords.length === 0">暂无发货记录</div>

      <NSpace v-else vertical>
        <NCard
          v-for="record in deliveryRecords"
          :key="record.id"
          size="small"
          :bordered="true"
        >
          <div style="margin-bottom: 6px">
            <strong>交付方式：</strong>{{ record.deliveryType }}
          </div>

          <div style="margin-bottom: 6px">
            <strong>收件人：</strong>{{ record.receiverName || '-' }}
            <span style="margin-left: 16px">
          <strong>电话：</strong>{{ record.receiverPhone || '-' }}
        </span>
          </div>

          <div style="margin-bottom: 6px">
            <strong>地址：</strong>
            {{ record.receiverProvince || '' }}
            {{ record.receiverCity || '' }}
            {{ record.receiverDistrict || '' }}
            {{ record.receiverAddress || '' }}
          </div>

          <div style="margin-bottom: 6px">
            <strong>快递：</strong>{{ record.expressCompany || '-' }}
            <span style="margin-left: 16px">
          <strong>单号：</strong>{{ record.trackingNo || '-' }}
        </span>
          </div>

          <div style="margin-bottom: 6px">
            <strong>发货时间：</strong>{{ record.deliveryTime || '-' }}
          </div>

          <div style="margin-bottom: 6px">
            <strong>操作人：</strong>{{ record.operatorName || '-' }}
          </div>

          <div style="margin-bottom: 6px">
            <strong>凭证：</strong>
            <BizFileViewer
              :file-ids="record.deliveryProofFileIds"
              mode="auto"
              :max="5"
              :thumb-size="64"
              show-name
            />
          </div>

          <div>
            <strong>备注：</strong>{{ record.remark || '-' }}
          </div>
        </NCard>
      </NSpace>
    </NModal>

    <NModal v-model:show="showAssignRepairerModal" preset="card" title="指定修模师" style="width: 560px">
      <NForm label-placement="left" label-width="110">
        <NFormItem label="修模师" required>
          <NSelect
            v-model:value="assignRepairerForm.repairerUserId"
            :options="assignRepairerOptions"
            filterable
            clearable
            placeholder="请选择修模师"
          />
        </NFormItem>

        <NFormItem label="备注">
          <NInput
            v-model:value="assignRepairerForm.remark"
            type="textarea"
            placeholder="请输入备注"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showAssignRepairerModal = false">取消</NButton>
          <NButton type="primary" @click="submitAssignRepairer">确认指定</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showRepairPerformanceModal" preset="card" title="修改修模师业绩" style="width: 520px">
      <NForm label-placement="left" label-width="120">
        <NFormItem label="订单号">
          <NInput :value="repairPerformanceOrder?.orderNo || '-'" disabled />
        </NFormItem>

        <NFormItem label="修模师业绩" required>
          <NInputNumber
            v-model:value="repairPerformanceForm.repairManualAmount"
            :min="0"
            :precision="2"
            style="width: 220px"
          />
        </NFormItem>

        <NFormItem label="备注">
          <NInput
            v-model:value="repairPerformanceForm.remark"
            type="textarea"
            placeholder="请输入调整原因"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showRepairPerformanceModal = false">取消</NButton>
          <NButton type="primary" @click="submitRepairPerformance">确认修改</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showPrintRevenueModal" preset="card" title="修改打印收费" style="width: 520px">
      <NForm label-placement="left" label-width="120">
        <NFormItem label="订单号">
          <NInput :value="printRevenueOrder?.orderNo || '-'" disabled />
        </NFormItem>

        <NFormItem label="打印收费" required>
          <NInputNumber
            v-model:value="printRevenueForm.printReceivableAmount"
            :min="0"
            :precision="2"
            style="width: 220px"
          />
        </NFormItem>

        <NFormItem label="备注">
          <NInput
            v-model:value="printRevenueForm.remark"
            type="textarea"
            placeholder="请输入调整原因"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showPrintRevenueModal = false">取消</NButton>
          <NButton type="primary" @click="submitPrintRevenue">确认修改</NButton>
        </NSpace>
      </template>
    </NModal>

    <OrderDetailDrawer
      v-model:show="showOrderDetailDrawer"
      :order-id="detailOrderId"
      @edit="handleEdit"
    />

    <NModal
      v-model:show="showResubmitPrintModelModal"
      preset="card"
      title="重新上传客户模型"
      style="width: 720px"
    >
      <NForm label-placement="left" label-width="130">
        <NFormItem label="订单号">
          <NInput :value="resubmitPrintModelOrder?.orderNo" disabled />
        </NFormItem>

        <NFormItem label="客户模型文件" required>
          <BizFileUpload
            v-model="resubmitPrintModelFileIds"
            biz-type="TEMP"
            file-stage="PRINT_INPUT"
            file-type="CUSTOMER_MODEL_FILE"
            :max="10"
          />
        </NFormItem>

        <NFormItem label="备注">
          <NInput
            v-model:value="resubmitPrintModelForm.remark"
            type="textarea"
            placeholder="请输入重新上传说明"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showResubmitPrintModelModal = false">取消</NButton>
          <NButton type="primary" @click="submitResubmitPrintModel">提交检测</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal
      v-model:show="showHdSubmitModal"
      preset="card"
      title="提交高清图"
      style="width: 640px"
    >
      <NSpace vertical :size="12">
        <NAlert type="info" show-icon>
          当前订单来自协作单。请上传处理后的高清图，提交后将由发单方确认。
        </NAlert>

        <NFormItem label="处理后的高清图" required>
          <BizFileUpload
            v-model="hdSubmitFileIds"
            biz-type="COLLAB_ORDER"
            file-stage="HD_REVIEW"
            file-type="PROCESSED_HD_PHOTO"
            :max="20"
            accept="image/*"
          />
        </NFormItem>

        <BizFileViewer
          v-if="hdSubmitFileIds.length"
          :file-ids="hdSubmitFileIds"
          mode="image"
          :max="20"
          show-name
        />

        <NFormItem label="提交说明">
          <NInput
            v-model:value="hdSubmitComment"
            type="textarea"
            placeholder="可填写高清处理说明"
          />
        </NFormItem>

        <NSpace justify="end">
          <NButton @click="showHdSubmitModal = false">
            取消
          </NButton>

          <NButton
            type="primary"
            :loading="hdSubmitting"
            @click="submitHdFiles"
          >
            提交高清图
          </NButton>
        </NSpace>
      </NSpace>
    </NModal>

  </NCard>

</template>
