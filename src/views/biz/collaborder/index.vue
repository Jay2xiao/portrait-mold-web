<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch, type VNodeChild } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NAlert,
  NBadge,
  NButton,
  NCard,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSpace,
  NSpin,
  NTabPane,
  NTabs,
  NTag,
  NTimeline,
  NTimelineItem,
  useDialog,
  useMessage,
  type DataTableColumns,
  type PaginationProps
} from 'naive-ui';

import BizFileUpload from '@/views/biz/components/BizFileUpload.vue';
import BizFileViewer from '@/views/biz/components/BizFileViewer.vue';

import CollabBillingPanel from '@/views/biz/components/CollabBillingPanel.vue';

import {
  acceptCollabOrder,
  completeCollabOrder,
  deliveryCollabOrder,
  fetchCollabOrderDetail,
  fetchCollabOrderEvents,
  fetchReceivedCollabOrders,
  fetchSentCollabOrders,
  rejectCollabOrder,
  reviewCollabEffect,
  reviewCollabHd,
  submitCollabEffectReview,
  submitCollabHdReview,
  syncCollabDeliveryInfo,
  syncCollabPrintStatus
} from '@/service/api/biz/collab-order';
import { COLLAB_ORDER_SEND_PATH } from '@/service/api/biz/collab-bill-detail-link';

import {
  cancelCollabBill,
  createBatchCollabBill,
  createCollabBill,
  fetchCollabBillByOrder,
  resyncCollabInternalBill,
  sendCollabBill,
  type CollabBillVO
} from '@/service/api/biz/collab-bill';
import { resolveCollabBillId } from '@/service/api/biz/collab-bill-utils';

import {
  approveCollabPaymentVoucher,
  fetchCollabPaymentVouchersByBill,
  rejectCollabPaymentVoucher,
  resyncCollabPayment,
  uploadCollabPaymentVoucher,
  type CollabPaymentVoucherVO
} from '@/service/api/biz/collab-payment-voucher';

defineOptions({
  name: 'BizCollabOrder'
});

type CollabId = string | number;
type RoleType = 'SENT' | 'RECEIVED';

interface CollabOrderRow {
  id?: CollabId;
  collabOrderNo?: string;
  sourceOrderNoSnapshot?: string;
  sourceCustomerNameSnapshot?: string;
  senderTenantNameSnapshot?: string;
  receiverTenantNameSnapshot?: string;
  serviceType?: string;
  materialPackageType?: string;
  senderRepairFeeAmount?: number | string;
  printFeeAmount?: number | string;
  collabAmount?: number | string;
  receiverPrintTask?: Record<string, any> | null;
  status?: string;
  paymentStatus?: string;
  printStatus?: string;
  deliveryStatus?: string;
  internalBillSyncStatus?: string;
  internalPaymentSyncStatus?: string;
  collabCostSyncStatus?: string;
  createTime?: string;
  [key: string]: any;
}

interface CollabFileRow {
  id?: CollabId;
  fileId?: CollabId;
  fileType?: string;
  fileStage?: string;
  createTime?: string;
  [key: string]: any;
}

interface CollabEventRow {
  id?: CollabId;
  eventType?: string;
  eventName?: string;
  eventContent?: string;
  content?: string;
  attachmentsJson?: string;
  operatorTenantNameSnapshot?: string;
  operatorUserName?: string;
  createTime?: string;
  [key: string]: any;
}

const router = useRouter();
const route = useRoute();
const dialog = useDialog();
const message = useMessage();

const activeTab = ref<RoleType>('RECEIVED');

const loadingSent = ref(false);
const loadingReceived = ref(false);
const loadingDetail = ref(false);
const loadingEvents = ref(false);

const sentRows = ref<CollabOrderRow[]>([]);
const receivedRows = ref<CollabOrderRow[]>([]);
const checkedReceivedRowKeys = ref<CollabId[]>([]);

const showDetailDrawer = ref(false);
const detail = ref<any>(null);
const eventRows = ref<CollabEventRow[]>([]);

const activeDetailTab = ref('base');

const showRejectModal = ref(false);
const rejectTarget = ref<CollabOrderRow | null>(null);

const showHdReviewModal = ref(false);
const showEffectReviewModal = ref(false);
const showBillCreateModal = ref(false);
const showBatchBillCreateModal = ref(false);
const showBillCancelModal = ref(false);
const showVoucherUploadModal = ref(false);
const showVoucherReviewModal = ref(false);

const currentReviewVoucher = ref<CollabPaymentVoucherVO | null>(null);
const voucherReviewMode = ref<'approve' | 'reject'>('approve');

const processedHdFileIds = ref<CollabId[]>([]);
const effectFileIds = ref<CollabId[]>([]);
const effectRejectAttachmentFileIds = ref<CollabId[]>([]);
const deliveryFileIds = ref<CollabId[]>([]);
const voucherFileIds = ref<CollabId[]>([]);

const hdSubmitComment = ref('');
const effectSubmitComment = ref('');


const queryForm = reactive({
  status: '',
  serviceType: '',
  materialPackageType: '',
  keyword: ''
});

const sentPagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  prefix({ itemCount }) {
    return `共 ${itemCount} 条`;
  }
});

const receivedPagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  prefix({ itemCount }) {
    return `共 ${itemCount} 条`;
  }
});

const rejectForm = reactive({
  reason: ''
});

const hdReviewForm = reactive({
  result: '' as '' | 'APPROVE' | 'REJECT',
  comment: ''
});

const effectReviewForm = reactive({
  result: 'APPROVE' as 'APPROVE' | 'REJECT',
  comment: ''
});

const printForm = reactive({
  printStatus: 'WAIT_PRINT' as 'WAIT_PRINT' | 'PRINTING' | 'PRINT_COMPLETED',
  remark: ''
});

const deliveryForm = reactive({
  logisticsCompany: '',
  logisticsNo: '',
  remark: ''
});

const deliveryInfoForm = reactive({
  deliveryType: 'EXPRESS',
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
  remark: ''
});

const completeForm = reactive({
  remark: ''
});

const deliveryTypeOptions = [
  { label: '快递发货', value: 'EXPRESS' },
  { label: '同城配送', value: 'LOCAL_DELIVERY' }
];

const billCreateForm = reactive({
  billAmount: null as number | null,
  billTitle: '',
  billRemark: '',
  itemName: '协作服务费',
  itemType: 'COLLAB_SERVICE_FEE'
});

const batchBillCreateForm = reactive({
  billTitle: '',
  billRemark: ''
});

const billCancelForm = reactive({
  reason: ''
});

const voucherUploadForm = reactive({
  paymentAmount: null as number | null,
  paymentChannel: 'WECHAT' as 'WECHAT' | 'ALIPAY' | 'BANK' | 'CASH' | 'OTHER',
  payerName: '',
  transactionNo: '',
  remark: ''
});

const voucherReviewForm = reactive({
  reviewRemark: ''
});

const submittingReject = ref(false);
const submittingHd = ref(false);
const submittingEffect = ref(false);
const submittingPrint = ref(false);
const submittingDeliveryInfo = ref(false);
const submittingDelivery = ref(false);
const submittingBill = ref(false);
const submittingBatchBill = ref(false);
const submittingVoucher = ref(false);
const submittingReview = ref(false);
const submittingComplete = ref(false);

const statusOptions = [
  { label: '待接单', value: 'PENDING_ACCEPT' },
  { label: '已接单', value: 'ACCEPTED' },
  { label: '已拒单', value: 'REJECTED' },
  { label: '已取消', value: 'CANCELLED' },
  { label: '高清图处理中', value: 'MATERIAL_PROCESSING' },
  { label: '待高清图确认', value: 'WAIT_HD_REVIEW' },
  { label: '高清图驳回', value: 'HD_REJECTED' },
  { label: '修模中', value: 'REPAIRING' },
  { label: '待发单方审核', value: 'WAIT_SENDER_REVIEW' },
  { label: '修模效果图驳回', value: 'SENDER_REJECTED' },
  { label: '打印中', value: 'PRINTING' },
  { label: '待发货', value: 'WAIT_DELIVERY' },
  { label: '已发货', value: 'DELIVERED' },
  { label: '待出账', value: 'WAIT_BILL' },
  { label: '已出账', value: 'BILLED' },
  { label: '已上传凭证', value: 'VOUCHER_UPLOADED' },
  { label: '已确认收款', value: 'PAID_CONFIRMED' },
  { label: '已完成', value: 'COMPLETED' }
];

const serviceTypeOptions = [
  { label: '只修模', value: 'REPAIR_ONLY' },
  { label: '只打印', value: 'PRINT_ONLY' },
  { label: '修模 + 打印', value: 'REPAIR_PRINT' }
];

const materialTypeOptions = [
  { label: '原始照片', value: 'RAW_PHOTO' },
  { label: '高清照片', value: 'HD_PHOTO' },
  { label: '高清照片 + AI模型', value: 'HD_PHOTO_AI_MODEL' }
];

const printStatusOptions = [
  { label: '待打印', value: 'WAIT_PRINT' },
  { label: '打印中', value: 'PRINTING' },
  { label: '打印完成', value: 'PRINT_COMPLETED' }
];

const paymentChannelOptions = [
  { label: '微信', value: 'WECHAT' },
  { label: '支付宝', value: 'ALIPAY' },
  { label: '银行转账', value: 'BANK' },
  { label: '现金', value: 'CASH' },
  { label: '其他', value: 'OTHER' }
];

const billItemTypeOptions = [
  { label: '协作服务费', value: 'COLLAB_SERVICE_FEE' },
  { label: '修模费', value: 'REPAIR_FEE' },
  { label: '打印费', value: 'PRINT_FEE' },
  { label: '发货费', value: 'DELIVERY_FEE' },
  { label: '其他费用', value: 'OTHER_FEE' }
];

const imageAccept = 'image/*';
const modelAccept = '.stl,.obj,.3mf,.zip,.rar,.7z,.step,.stp';

const currentRole = computed<RoleType>(() => activeTab.value);
const isSentRole = computed(() => currentRole.value === 'SENT');
const isReceivedRole = computed(() => currentRole.value === 'RECEIVED');

const currentOrder = computed<CollabOrderRow>(() => detail.value?.order || {});
const receiverPrintTask = computed(() => detail.value?.receiverPrintTask || null);
const receiverPrintSpecs = computed(() => {
  const taskSpecs = receiverPrintTask.value?.printSpecs;
  if (Array.isArray(taskSpecs) && taskSpecs.length > 0) {
    return taskSpecs;
  }

  return detail.value?.printSpecs || [];
});
const currentBill = computed<CollabBillVO | null>(() => detail.value?.bill || null);
const selectedReceivedBillRows = computed(() => {
  const ids = new Set(checkedReceivedRowKeys.value.map(item => String(item)));
  return receivedRows.value.filter(row => row.id && ids.has(String(row.id)));
});
const paymentVouchers = computed<CollabPaymentVoucherVO[]>(() =>
  Array.isArray(detail.value?.paymentVouchers) ? detail.value.paymentVouchers : []
);

function normalizeCollabFileType(value?: string) {
  return String(value || '').trim().toUpperCase();
}

/**
 * 高清图确认相关附件类型。
 *
 * PROCESSED_HD_PHOTO 是协作单附件表里正式保存的类型；
 * PROCESSED_HD 是旧上传组件里可能残留的类型，先兼容。
 */
const hdReviewFileTypes = ['PROCESSED_HD_PHOTO', 'PROCESSED_HD'];

const detailFiles = computed<CollabFileRow[]>(() => {
  const value: any = detail.value;

  if (!value) {
    return [];
  }

  if (Array.isArray(value.files)) {
    return value.files;
  }

  if (Array.isArray(value.data?.files)) {
    return value.data.files;
  }

  return [];
});

const currentFiles = computed<CollabFileRow[]>(() => detailFiles.value);

/**
 * 接单方提交给发单方确认的高清图。
 */
const processedHdReviewFiles = computed<CollabFileRow[]>(() => {
  return currentFiles.value.filter(item => {
    return hdReviewFileTypes.includes(normalizeCollabFileType(item.fileType)) && item.fileId;
  });
});

const processedHdReviewFileIds = computed<CollabId[]>(() => {
  const ids = processedHdReviewFiles.value
    .map(item => item.fileId)
    .filter(item => item !== undefined && item !== null && item !== '')
    .map(item => String(item));

  return Array.from(new Set(ids));
});

const repairEffectReviewFiles = computed<CollabFileRow[]>(() => {
  return currentFiles.value.filter(item => {
    return ['REPAIR_EFFECT_IMAGE', 'EFFECT'].includes(normalizeCollabFileType(item.fileType)) && item.fileId;
  });
});

const repairEffectReviewFileIds = computed<CollabId[]>(() => {
  const ids = repairEffectReviewFiles.value
    .map(item => item.fileId)
    .filter(item => item !== undefined && item !== null && item !== '')
    .map(item => String(item));

  return Array.from(new Set(ids));
});


const currentOrderId = computed(() => currentOrder.value?.id);
const orderStatus = computed(() => currentOrder.value?.status || '');
const paymentStatus = computed(() => currentOrder.value?.paymentStatus || '');
const receiverPrintTotalWeight = computed(() => {
  const task = receiverPrintTask.value;
  if (!task) return null;
  return Number(task.entityWeightG || 0) + Number(task.supportWeightG || 0);
});

function formatPrintWeight(task?: Record<string, any> | null) {
  if (!task) return '-';

  const entity = Number(task.entityWeightG || 0);
  const support = Number(task.supportWeightG || 0);
  const total = entity + support;

  if (total <= 0) return '-';

  return `${total.toFixed(2)}g`;
}

function formatPrintMaterial(task?: Record<string, any> | null) {
  if (!task) return '-';

  const entityPrice = Number(task.entityUnitPrice || 0);
  const supportPrice = Number(task.supportUnitPrice || 0);

  if (entityPrice <= 0 && supportPrice <= 0) return '-';

  return `实体${money(entityPrice)}/g 支撑${money(supportPrice)}/g`;
}

const billItems = computed(() => parseBillItems(currentBill.value?.billItemsJson || ''));

const canAcceptOrReject = computed(() => isReceivedRole.value && orderStatus.value === 'PENDING_ACCEPT');

const canSubmitHd = computed(() => {
  return (
    isReceivedRole.value &&
    currentOrder.value?.materialPackageType === 'RAW_PHOTO' &&
    ['ACCEPTED', 'MATERIAL_PROCESSING', 'HD_REJECTED'].includes(orderStatus.value)
  );
});

const canReviewHd = computed(() => {
  return isSentRole.value && orderStatus.value === 'WAIT_HD_REVIEW';
});

const canSubmitEffect = computed(() => {
  return (
    isReceivedRole.value &&
    currentOrder.value?.serviceType !== 'PRINT_ONLY' &&
    ['REPAIRING', 'SENDER_REJECTED'].includes(orderStatus.value)
  );
});

function normalizePrintStatus(value?: string): 'WAIT_PRINT' | 'PRINTING' | 'PRINT_COMPLETED' {
  if (value === 'WAIT_PRINT' || value === 'PRINTING' || value === 'PRINT_COMPLETED') {
    return value;
  }

  return 'WAIT_PRINT';
}


const canReviewEffect = computed(() => {
  return isSentRole.value && orderStatus.value === 'WAIT_SENDER_REVIEW';
});

const canSyncPrint = computed(() => {
  return isReceivedRole.value && orderStatus.value === 'PRINTING' && currentOrder.value?.serviceType !== 'REPAIR_ONLY';
});

const canDelivery = computed(() => {
  return isReceivedRole.value && orderStatus.value === 'WAIT_DELIVERY' && currentOrder.value?.printStatus === 'PRINT_COMPLETED';
});

const canSyncDeliveryInfo = computed(() => {
  return (
    isSentRole.value &&
    orderStatus.value === 'WAIT_DELIVERY' &&
    currentOrder.value?.printStatus === 'PRINT_COMPLETED' &&
    currentOrder.value?.receiverDeliveryRequired === '1' &&
    currentOrder.value?.deliveryStatus !== 'DELIVERED'
  );
});

const canCreateBill = computed(() => {
  return isReceivedRole.value && orderStatus.value === 'WAIT_BILL' && !currentBill.value;
});

const canSendBill = computed(() => {
  return isReceivedRole.value && currentBill.value?.billStatus === 'DRAFT';
});

const canCancelBill = computed(() => {
  if (!isReceivedRole.value || !currentBill.value) return false;
  if (!['DRAFT', 'SENT'].includes(String(currentBill.value.billStatus))) return false;
  if (currentBill.value.payStatus === 'PAID') return false;
  return ['WAIT_BILL', 'BILLED'].includes(orderStatus.value);
});

const canUploadVoucher = computed(() => {
  if (!isSentRole.value || !currentBill.value) return false;
  if (currentBill.value.billStatus !== 'SENT') return false;
  if (currentBill.value.payStatus !== 'UNPAID') return false;
  return orderStatus.value === 'BILLED' || paymentStatus.value === 'VOUCHER_REJECTED';
});

const canCompleteCollab = computed(() => {
  const order = currentOrder.value;
  if (!order) return false;

  return (
    isSentRole.value &&
    order.status === 'PAID_CONFIRMED' &&
    order.paymentStatus === 'PAID_CONFIRMED' &&
    order.internalBillSyncStatus === 'SYNCED' &&
    order.internalPaymentSyncStatus === 'SYNCED' &&
    order.collabCostSyncStatus === 'SYNCED'
  );
});

const canResyncBill = computed(() => {
  return isReceivedRole.value && currentBill.value?.internalBillSyncStatus === 'FAILED';
});

const syncFailedCount = computed(() => {
  let count = 0;

  if (currentBill.value?.internalBillSyncStatus === 'FAILED') count += 1;

  paymentVouchers.value.forEach(item => {
    if (item.internalPaymentSyncStatus === 'FAILED') count += 1;
    if (item.collabCostSyncStatus === 'FAILED') count += 1;
  });

  return count;
});

const baseColumns: DataTableColumns<CollabOrderRow> = [
  {
    title: '协作单号',
    key: 'collabOrderNo',
    width: 180,
    fixed: 'left' as const
  },
  {
    title: '源订单号',
    key: 'sourceOrderNoSnapshot',
    width: 160,
    render(row) {
      return row.sourceOrderNoSnapshot || '-';
    }
  },
  {
    title: '客户',
    key: 'sourceCustomerNameSnapshot',
    width: 150,
    render(row) {
      if (activeTab.value === 'RECEIVED') {
        return '-';
      }
      return row.sourceCustomerNameSnapshot || '-';
    }
  },
  {
    title: '发单方',
    key: 'senderTenantNameSnapshot',
    width: 160,
    render(row) {
      return row.senderTenantNameSnapshot || '-';
    }
  },
  {
    title: '接单方',
    key: 'receiverTenantNameSnapshot',
    width: 160,
    render(row) {
      return row.receiverTenantNameSnapshot || '-';
    }
  },
  {
    title: '服务类型',
    key: 'serviceType',
    width: 120,
    render(row) {
      return serviceTypeText(row.serviceType);
    }
  },
  {
    title: '资料类型',
    key: 'materialPackageType',
    width: 160,
    render(row) {
      return materialTypeText(row.materialPackageType);
    }
  },
  {
    title: '费用',
    key: 'collabAmount',
    width: 260,
    render(row) {
      return h(
        'div',
        { class: 'amount-cell' },
        [
          h('div', { class: 'amount-total' }, `合计 ${money(row.collabAmount ?? row.senderRepairFeeAmount)}`),
          h('div', { class: 'amount-sub' }, `修模 ${money(row.senderRepairFeeAmount)}`),
          h('div', { class: 'amount-sub' }, `打印 ${money(row.receiverPrintTask?.finalAmount || row.printFeeAmount)}`),
          h('div', { class: 'amount-sub' }, `克数 ${formatPrintWeight(row.receiverPrintTask)}`),
          h('div', { class: 'amount-sub' }, `材料 ${formatPrintMaterial(row.receiverPrintTask)}`)
        ]
      );
    }
  },
  {
    title: '协作状态',
    key: 'status',
    width: 140,
    render(row) {
      return h(
        NTag,
        { type: statusTagType(row.status) as any },
        { default: () => statusText(row.status) }
      );
    }
  },
  {
    title: '付款状态',
    key: 'paymentStatus',
    width: 140,
    render(row) {
      return h(
        NTag,
        { type: paymentStatusTagType(row.paymentStatus) as any },
        { default: () => paymentStatusText(row.paymentStatus) }
      );
    }
  },
  {
    title: '账务同步',
    key: 'accountingSync',
    width: 260,
    render(row) {
      return renderAccountingSync(row);
    }
  },
  {
    title: '创建时间',
    key: 'createTime',
    width: 170
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    fixed: 'right' as const,
    render(row) {
      const buttons = [
        h(
          NButton,
          {
            size: 'small',
            onClick: () => openDetail(row, activeTab.value)
          },
          { default: () => '详情' }
        )
      ];

      if (activeTab.value === 'RECEIVED' && row.status === 'PENDING_ACCEPT') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => handleAccept(row)
            },
            { default: () => '接单' }
          ),
          h(
            NButton,
            {
              size: 'small',
              type: 'error',
              ghost: true,
              onClick: () => openRejectModal(row)
            },
            { default: () => '拒单' }
          )
        );
      }
      if (activeTab.value === 'SENT' && row.status === 'WAIT_HD_REVIEW') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => openHdReviewFromRow(row)
            },
            { default: () => '确认高清图' }
          )
        );
      }
      if (activeTab.value === 'SENT' && row.status === 'WAIT_SENDER_REVIEW') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => openEffectReviewFromRow(row)
            },
            { default: () => '审核效果图' }
          )
        );
      }


      return h(NSpace, { size: 8 }, { default: () => buttons });
    }
  }
];

const receivedColumns = computed<DataTableColumns<CollabOrderRow>>(() => [
  {
    type: 'selection',
    disabled(row: CollabOrderRow) {
      return !canBatchBillRow(row);
    }
  },
  ...baseColumns
]);

const fileColumns: DataTableColumns<CollabFileRow> = [
  {
    title: '文件类型',
    key: 'fileType',
    width: 160,
    render(row) {
      return fileTypeText(row.fileType);
    }
  },
  {
    title: '文件ID',
    key: 'fileId',
    width: 120,
    render(row) {
      return row.fileId || '-';
    }
  },
  {
    title: '预览',
    key: 'viewer',
    minWidth: 180,
    render(row) {
      return row.fileId
        ? h(BizFileViewer, {
          fileIds: [row.fileId],
          mode: isImageFileType(row.fileType) ? 'image' : 'download',
          max: 1,
          thumbSize: 60,
          showName: true
        })
        : '-';
    }
  },
  {
    title: '创建时间',
    key: 'createTime',
    width: 170
  }
];

const billItemColumns: DataTableColumns<any> = [
  {
    title: '项目名称',
    key: 'itemName',
    minWidth: 160,
    render(row) {
      return row.itemName || '-';
    }
  },
  {
    title: '项目类型',
    key: 'itemType',
    width: 140,
    render(row) {
      return billItemTypeText(row.itemType);
    }
  },
  {
    title: '金额',
    key: 'amount',
    width: 120,
    render(row) {
      return money(row.amount);
    }
  },
  {
    title: '备注',
    key: 'remark',
    minWidth: 180,
    render(row) {
      return row.remark || '-';
    }
  }
];

const voucherColumns: DataTableColumns<CollabPaymentVoucherVO> = [
  {
    title: '凭证号',
    key: 'voucherNo',
    minWidth: 160
  },
  {
    title: '付款金额',
    key: 'paymentAmount',
    width: 120,
    render(row) {
      return money(row.paymentAmount);
    }
  },
  {
    title: '付款渠道',
    key: 'paymentChannel',
    width: 110,
    render(row) {
      return paymentChannelText(row.paymentChannel);
    }
  },
  {
    title: '凭证文件',
    key: 'proofFileIds',
    minWidth: 220,
    render(row) {
      const ids = parseProofFileIds(row.proofFileIds);
      return ids.length
        ? h(BizFileViewer, {
          fileIds: ids,
          mode: 'auto',
          max: 4,
          thumbSize: 54,
          showName: true
        })
        : '-';
    }
  },
  {
    title: '审核状态',
    key: 'reviewStatus',
    width: 110,
    render(row) {
      return h(
        NTag,
        { type: reviewStatusTagType(row.reviewStatus) as any },
        { default: () => reviewStatusText(row.reviewStatus) }
      );
    }
  },
  {
    title: '内部收款',
    key: 'internalPaymentSyncStatus',
    width: 140,
    render(row) {
      return renderSyncStatus(row.internalPaymentSyncStatus, row.internalPaymentSyncError);
    }
  },
  {
    title: '外协成本',
    key: 'collabCostSyncStatus',
    width: 140,
    render(row) {
      return renderSyncStatus(row.collabCostSyncStatus, row.collabCostSyncError);
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    fixed: 'right' as const,
    render(row) {
      const buttons: VNodeChild[] = [];

      if (isReceivedRole.value && row.reviewStatus === 'PENDING' && orderStatus.value === 'VOUCHER_UPLOADED') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'success',
              ghost: true,
              onClick: () => openVoucherReviewModal(row, 'approve')
            },
            { default: () => '通过' }
          ),
          h(
            NButton,
            {
              size: 'small',
              type: 'error',
              ghost: true,
              onClick: () => openVoucherReviewModal(row, 'reject')
            },
            { default: () => '驳回' }
          )
        );
      }

      if (
        isReceivedRole.value &&
        row.reviewStatus === 'APPROVED' &&
        (row.internalPaymentSyncStatus === 'FAILED' || row.collabCostSyncStatus === 'FAILED')
      ) {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'warning',
              ghost: true,
              onClick: () => confirmResyncPayment(row)
            },
            { default: () => '重试同步' }
          )
        );
      }

      return buttons.length ? h(NSpace, { size: 8 }, { default: () => buttons }) : '-';
    }
  }
];

onMounted(async () => {
  applyRouteQuery();
  await loadCurrentTab();

  const collabOrderId = route.query.collabOrderId as string | undefined;
  if (collabOrderId) {
    await openDetailById(collabOrderId, activeTab.value);
  }
});

watch(
  () => route.query,
  async () => {
    applyRouteQuery();
    await loadCurrentTab();

    const collabOrderId = route.query.collabOrderId as string | undefined;
    if (collabOrderId) {
      await openDetailById(collabOrderId, activeTab.value);
    }
  }
);

function applyRouteQuery() {
  const tab = String(route.query.tab || '').toUpperCase();
  if (tab === 'SENT' || tab === 'RECEIVED') {
    activeTab.value = tab;
  }

  const status = route.query.status;
  if (typeof status === 'string') {
    queryForm.status = status;
  }
}

async function handleTabChange(value: string | number) {
  activeTab.value = value as RoleType;
  await loadCurrentTab();
}

async function loadCurrentTab() {
  if (activeTab.value === 'SENT') {
    await loadSent();
  } else {
    await loadReceived();
  }
}

async function loadSent() {
  loadingSent.value = true;

  try {
    const res = await fetchSentCollabOrders({
      ...queryForm,
      pageNum: sentPagination.page,
      pageSize: sentPagination.pageSize
    });

    const table = unwrapTable(res);
    sentRows.value = table.rows;
    sentPagination.itemCount = table.total;
  } finally {
    loadingSent.value = false;
  }
}

async function loadReceived() {
  loadingReceived.value = true;

  try {
    const res = await fetchReceivedCollabOrders({
      ...queryForm,
      pageNum: receivedPagination.page,
      pageSize: receivedPagination.pageSize
    });

    const table = unwrapTable(res);
    receivedRows.value = table.rows;
    receivedPagination.itemCount = table.total;
  } finally {
    loadingReceived.value = false;
  }
}

async function search() {
  sentPagination.page = 1;
  receivedPagination.page = 1;
  await loadCurrentTab();
}

async function reset() {
  queryForm.status = '';
  queryForm.serviceType = '';
  queryForm.materialPackageType = '';
  queryForm.keyword = '';
  sentPagination.page = 1;
  receivedPagination.page = 1;
  await loadCurrentTab();
}

async function handleSentPageChange(page: number) {
  sentPagination.page = page;
  await loadSent();
}

async function handleSentPageSizeChange(pageSize: number) {
  sentPagination.pageSize = pageSize;
  sentPagination.page = 1;
  await loadSent();
}

async function handleReceivedPageChange(page: number) {
  receivedPagination.page = page;
  await loadReceived();
}

async function handleReceivedPageSizeChange(pageSize: number) {
  receivedPagination.pageSize = pageSize;
  receivedPagination.page = 1;
  await loadReceived();
}

async function openDetail(row: CollabOrderRow, role: RoleType) {
  if (!row.id) return;
  await openDetailById(row.id, role);
}

async function openDetailById(id: CollabId, role: RoleType) {
  activeTab.value = role;
  showDetailDrawer.value = true;
  activeDetailTab.value = 'base';
  loadingDetail.value = true;
  detail.value = null;
  eventRows.value = [];

  resetActionForms();

  try {
    const res = await fetchCollabOrderDetail(id);
    const data = unwrapData<any>(res) || {};

    detail.value = {
      ...data,
      bill: data.bill || null,
      paymentVouchers: Array.isArray(data.paymentVouchers) ? data.paymentVouchers : []
    };


    console.log('[协作单详情]', data);
    console.log('[协作单附件 files]', data?.files);
    console.log(
      '[接单方提交高清图]',
      (data?.files || []).filter((item: any) => item.fileType === 'PROCESSED_HD_PHOTO')
    );

    await syncBillingData(id);
    await loadEvents(id);
    initActionForms();
  } finally {
    loadingDetail.value = false;
  }
}

async function handleBillingRefresh() {
  await reloadDetail(true);
}


async function reloadDetail(refreshList = true) {
  const id = currentOrderId.value;
  if (!id) return;

  const res = await fetchCollabOrderDetail(id);
  const data = unwrapData<any>(res) || {};

  detail.value = {
    ...data,
    bill: data.bill || null,
    paymentVouchers: Array.isArray(data.paymentVouchers) ? data.paymentVouchers : []
  };

  await syncBillingData(id);
  await loadEvents(id);
  initActionForms();

  if (refreshList) {
    await loadCurrentTab();
  }
}

async function syncBillingData(orderId: CollabId) {
  try {
    const billRes = await fetchCollabBillByOrder(orderId);
    const bill = unwrapData<CollabBillVO | null>(billRes);
    detail.value.bill = bill || null;

    if (bill?.id) {
      const voucherRes = await fetchCollabPaymentVouchersByBill(bill.id);
      detail.value.paymentVouchers = unwrapData<CollabPaymentVoucherVO[]>(voucherRes) || [];
    } else {
      detail.value.paymentVouchers = [];
    }
  } catch {
    detail.value.bill = detail.value.bill || null;
    detail.value.paymentVouchers = detail.value.paymentVouchers || [];
  }
}

async function loadEvents(id: CollabId) {
  loadingEvents.value = true;

  try {
    const res = await fetchCollabOrderEvents(id);
    eventRows.value = unwrapData<CollabEventRow[]>(res) || [];
  } finally {
    loadingEvents.value = false;
  }
}

function resetActionForms() {
  processedHdFileIds.value = [];
  effectFileIds.value = [];
  deliveryFileIds.value = [];
  voucherFileIds.value = [];

  hdSubmitComment.value = '';
  effectSubmitComment.value = '';

  printForm.printStatus = 'WAIT_PRINT';
  printForm.remark = '';

  deliveryForm.logisticsCompany = '';
  deliveryForm.logisticsNo = '';
  deliveryForm.remark = '';

  deliveryInfoForm.deliveryType = 'EXPRESS';
  deliveryInfoForm.receiverName = '';
  deliveryInfoForm.receiverPhone = '';
  deliveryInfoForm.receiverAddress = '';
  deliveryInfoForm.remark = '';
  completeForm.remark = '';

  billCreateForm.billAmount = null;
  billCreateForm.billTitle = '';
  billCreateForm.billRemark = '';
  billCreateForm.itemName = '协作服务费';
  billCreateForm.itemType = 'COLLAB_SERVICE_FEE';

  voucherUploadForm.paymentAmount = null;
  voucherUploadForm.paymentChannel = 'WECHAT';
  voucherUploadForm.payerName = '';
  voucherUploadForm.transactionNo = '';
  voucherUploadForm.remark = '';
}

function initActionForms() {
  const order = currentOrder.value;
  printForm.printStatus = normalizePrintStatus(order.printStatus);

  deliveryForm.logisticsCompany = order.logisticsCompany || '';
  deliveryForm.logisticsNo = order.logisticsNo || '';
  deliveryInfoForm.deliveryType = order.deliveryTypeSnapshot || 'EXPRESS';
  deliveryInfoForm.receiverName = order.receiverNameSnapshot || '';
  deliveryInfoForm.receiverPhone = order.receiverPhoneSnapshot || '';
  deliveryInfoForm.receiverAddress = order.receiverAddressSnapshot || '';

  if (currentBill.value) {
    const amount = Number(currentBill.value.unpaidAmount || currentBill.value.billAmount || 0);
    voucherUploadForm.paymentAmount = amount > 0 ? Number(amount.toFixed(2)) : null;
  }
}

function handleAccept(row: CollabOrderRow) {
  if (!row.id) return;

  dialog.warning({
    title: '确认接单',
    content: `确认接收协作单 ${row.collabOrderNo || ''} 吗？`,
    positiveText: '接单',
    negativeText: '取消',
    onPositiveClick: async () => {
      await acceptCollabOrder(row.id!);
      message.success('接单成功');
      await loadReceived();
    }
  });
}

function openRejectModal(row: CollabOrderRow) {
  rejectTarget.value = row;
  rejectForm.reason = '';
  showRejectModal.value = true;
}

async function submitReject() {
  if (!rejectTarget.value?.id) return;

  if (!rejectForm.reason.trim()) {
    message.warning('请输入拒单原因');
    return;
  }

  submittingReject.value = true;

  try {
    await rejectCollabOrder(rejectTarget.value.id, {
      reason: rejectForm.reason.trim()
    });
    message.success('已拒单');
    showRejectModal.value = false;
    await loadReceived();
  } finally {
    submittingReject.value = false;
  }
}

async function submitHdReview() {
  if (!currentOrderId.value) return;

  if (!processedHdFileIds.value.length) {
    message.warning('请上传处理后的高清图');
    return;
  }

  submittingHd.value = true;

  try {
    await submitCollabHdReview(currentOrderId.value, {
      fileIds: processedHdFileIds.value,
      comment: hdSubmitComment.value
    });

    message.success('高清图已提交给发单方确认');
    processedHdFileIds.value = [];
    hdSubmitComment.value = '';
    await reloadDetail();
  } finally {
    submittingHd.value = false;
  }
}

function openHdReviewModal(_result: 'APPROVE' | 'REJECT' = 'APPROVE') {
  hdReviewForm.result = '';
  hdReviewForm.comment = '';
  showHdReviewModal.value = true;
}


async function submitEffectReview() {
  if (!currentOrderId.value) return;

  if (!effectFileIds.value.length) {
    message.warning('请上传修模效果图');
    return;
  }

  submittingEffect.value = true;

  try {
    await submitCollabEffectReview(currentOrderId.value, {
      fileIds: effectFileIds.value,
      comment: effectSubmitComment.value
    });

    message.success('修模效果图已提交给发单方审核');
    effectFileIds.value = [];
    effectSubmitComment.value = '';
    await reloadDetail();
  } finally {
    submittingEffect.value = false;
  }
}

function openEffectReviewModal(result: 'APPROVE' | 'REJECT') {
  effectReviewForm.result = result;
  effectReviewForm.comment = '';
  effectRejectAttachmentFileIds.value = [];
  showEffectReviewModal.value = true;
}

function switchEffectReviewResult(result: 'APPROVE' | 'REJECT') {
  effectReviewForm.result = result;
  if (result === 'APPROVE') {
    effectRejectAttachmentFileIds.value = [];
  }
}

async function submitEffectReviewResult() {
  if (!currentOrderId.value) return;

  if (effectReviewForm.result === 'REJECT') {
    if (!effectReviewForm.comment.trim()) {
      message.warning('请输入驳回原因');
      return;
    }
    if (effectRejectAttachmentFileIds.value.length === 0) {
      message.warning('请上传驳回附件');
      return;
    }
  }

  submittingReview.value = true;

  try {
    await reviewCollabEffect(currentOrderId.value, {
      result: effectReviewForm.result,
      comment: effectReviewForm.comment,
      attachmentIds: effectReviewForm.result === 'REJECT' ? effectRejectAttachmentFileIds.value.join(',') : undefined
    });

    message.success(effectReviewForm.result === 'APPROVE' ? '效果图已审核通过' : '效果图已驳回');
    showEffectReviewModal.value = false;
    effectRejectAttachmentFileIds.value = [];
    await reloadDetail();
  } finally {
    submittingReview.value = false;
  }
}

async function submitPrintStatus() {
  if (!currentOrderId.value) return;

  dialog.warning({
    title: '同步打印状态',
    content: `确认同步为「${printStatusText(printForm.printStatus)}」吗？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      submittingPrint.value = true;

      try {
        await syncCollabPrintStatus(currentOrderId.value!, {
          printStatus: printForm.printStatus,
          remark: printForm.remark
        });

        message.success('打印状态已同步');
        await reloadDetail();
      } finally {
        submittingPrint.value = false;
      }
    }
  });
}

async function submitDelivery() {
  if (!currentOrderId.value) return;

  if (!deliveryForm.logisticsCompany.trim()) {
    message.warning('请输入物流公司');
    return;
  }

  if (!deliveryForm.logisticsNo.trim()) {
    message.warning('请输入物流单号');
    return;
  }

  dialog.warning({
    title: '确认发货',
    content: `确认同步发货信息？物流公司：${deliveryForm.logisticsCompany}，物流单号：${deliveryForm.logisticsNo}`,
    positiveText: '确认发货',
    negativeText: '取消',
    onPositiveClick: async () => {
      submittingDelivery.value = true;

      try {
        await deliveryCollabOrder(currentOrderId.value!, {
          logisticsCompany: deliveryForm.logisticsCompany,
          logisticsNo: deliveryForm.logisticsNo,
          fileIds: deliveryFileIds.value,
          remark: deliveryForm.remark
        });

        message.success('发货信息已同步');
        deliveryFileIds.value = [];
        deliveryForm.remark = '';
        await reloadDetail();
      } finally {
        submittingDelivery.value = false;
      }
    }
  });
}

async function submitDeliveryInfo() {
  if (!currentOrderId.value) return;

  if (!deliveryInfoForm.receiverName.trim()) {
    message.warning('请输入收件人');
    return;
  }

  if (!deliveryInfoForm.receiverPhone.trim()) {
    message.warning('请输入收件电话');
    return;
  }

  if (!deliveryInfoForm.receiverAddress.trim()) {
    message.warning('请输入收件地址');
    return;
  }

  dialog.warning({
    title: '同步收货信息',
    content: `确认把收货信息同步给接单方？收件人：${deliveryInfoForm.receiverName}，电话：${deliveryInfoForm.receiverPhone}`,
    positiveText: '确认同步',
    negativeText: '取消',
    onPositiveClick: async () => {
      submittingDeliveryInfo.value = true;

      try {
        await syncCollabDeliveryInfo(currentOrderId.value!, {
          deliveryType: deliveryInfoForm.deliveryType,
          receiverName: deliveryInfoForm.receiverName,
          receiverPhone: deliveryInfoForm.receiverPhone,
          receiverAddress: deliveryInfoForm.receiverAddress,
          remark: deliveryInfoForm.remark
        });

        message.success('收货信息已同步给接单方');
        await reloadDetail();
      } finally {
        submittingDeliveryInfo.value = false;
      }
    }
  });
}

async function submitCompleteCollab() {
  if (!currentOrderId.value) return;

  dialog.warning({
    title: '归档完成协作单',
    content: '确认归档完成后，协作单将进入已完成状态，不会再次触发账单、收款或成本同步。',
    positiveText: '确认归档',
    negativeText: '取消',
    onPositiveClick: async () => {
      submittingComplete.value = true;

      try {
        await completeCollabOrder(currentOrderId.value!, {
          remark: completeForm.remark
        });

        message.success('协作单已归档完成');
        completeForm.remark = '';
        await reloadDetail();
      } finally {
        submittingComplete.value = false;
      }
    }
  });
}

function openCreateBillModal() {
  const amount = Number(currentOrder.value?.collabAmount || currentOrder.value?.senderRepairFeeAmount || 0);
  billCreateForm.billAmount = amount > 0 ? Number(amount.toFixed(2)) : null;
  billCreateForm.billTitle = `${currentOrder.value?.collabOrderNo || '协作单'} 协作账单`;
  billCreateForm.billRemark = '';
  billCreateForm.itemName = '协作服务费';
  billCreateForm.itemType = 'COLLAB_SERVICE_FEE';
  showBillCreateModal.value = true;
}

async function submitCreateBill() {
  if (!currentOrderId.value) return;

  if (!billCreateForm.billAmount || billCreateForm.billAmount <= 0) {
    message.warning('账单金额必须大于0');
    return;
  }

  submittingBill.value = true;

  try {
    const amount = Number(billCreateForm.billAmount.toFixed(2));

    await createCollabBill({
      collabOrderId: currentOrderId.value,
      billAmount: amount,
      billTitle: billCreateForm.billTitle || undefined,
      billRemark: billCreateForm.billRemark || undefined,
      items: [
        {
          itemName: billCreateForm.itemName || '协作服务费',
          itemType: billCreateForm.itemType,
          amount,
          remark: billCreateForm.billRemark || undefined
        }
      ]
    });

    message.success('协作账单创建成功');
    showBillCreateModal.value = false;
    await reloadDetail();
  } finally {
    submittingBill.value = false;
  }
}

function canBatchBillRow(row: CollabOrderRow) {
  return activeTab.value === 'RECEIVED' && row.status === 'WAIT_BILL';
}

function openBatchCreateBillModal() {
  const rows = selectedReceivedBillRows.value;
  if (rows.length < 2) {
    message.warning('请至少选择2条待出账协作单');
    return;
  }

  const invalid = rows.find(row => !canBatchBillRow(row));
  if (invalid) {
    message.warning('只能批量选择待出账的收到协作单');
    return;
  }

  const senderIds = new Set(rows.map(row => String(row.senderTenantId || '')));
  if (senderIds.size !== 1) {
    message.warning('批量协作账单只能合并同一发单方的协作单');
    return;
  }

  batchBillCreateForm.billTitle = `${rows[0].senderTenantNameSnapshot || '协作商家'} 批量协作账单`;
  batchBillCreateForm.billRemark = '';
  showBatchBillCreateModal.value = true;
}

async function submitBatchCreateBill() {
  const rows = selectedReceivedBillRows.value;
  if (rows.length < 2) {
    message.warning('请至少选择2条待出账协作单');
    return;
  }

  submittingBatchBill.value = true;

  try {
    const billId = await createBatchCollabBill({
      billTitle: batchBillCreateForm.billTitle || undefined,
      billRemark: batchBillCreateForm.billRemark || undefined,
      orders: rows.map(row => {
        const repairFeeAmount = Number(row.senderRepairFeeAmount || 0);
        const printFeeAmount = Number(row.receiverPrintTask?.finalAmount || row.printFeeAmount || 0);
        const billAmount = Number(row.collabAmount || repairFeeAmount + printFeeAmount);
        return {
          collabOrderId: row.id!,
          billAmount: Number(billAmount.toFixed(2)),
          repairFeeAmount: Number(repairFeeAmount.toFixed(2)),
          printFeeAmount: Number(printFeeAmount.toFixed(2)),
          items: [
            {
              itemName: '协作服务费',
              itemType: 'COLLAB_SERVICE_FEE',
              amount: Number(billAmount.toFixed(2)),
              remark: row.collabOrderNo
            }
          ]
        };
      })
    });

    const id = resolveCollabBillId(billId);
    if (!id) {
      throw new Error('批量协作账单创建失败，未返回账单ID');
    }
    await sendCollabBill(id);
    message.success('批量协作账单已创建并发送');
    showBatchBillCreateModal.value = false;
    checkedReceivedRowKeys.value = [];
    await loadReceived();
  } finally {
    submittingBatchBill.value = false;
  }
}

function confirmSendBill() {
  if (!currentBill.value?.id) return;

  dialog.warning({
    title: '发送协作账单',
    content: '发送后发单方可查看账单并上传付款凭证，是否继续？',
    positiveText: '发送',
    negativeText: '取消',
    onPositiveClick: async () => {
      submittingBill.value = true;

      try {
        await sendCollabBill(currentBill.value!.id!);
        message.success('协作账单已发送');
        await reloadDetail();
      } finally {
        submittingBill.value = false;
      }
    }
  });
}

async function submitHdReviewResult() {
  const id = currentOrderId.value;

  if (!id) {
    message.warning('协作单ID不能为空');
    return;
  }

  if (!hdReviewForm.result) {
    message.warning('请选择审核结果');
    return;
  }

  if (hdReviewForm.result === 'REJECT' && !hdReviewForm.comment.trim()) {
    message.warning('驳回时请填写驳回原因');
    return;
  }

  submittingReview.value = true;

  try {
    const result = hdReviewForm.result as 'APPROVE' | 'REJECT';
    await reviewCollabHd(id, {
      result,
      comment: hdReviewForm.comment
    });

    message.success(hdReviewForm.result === 'APPROVE' ? '高清图已确认' : '高清图已驳回');

    showHdReviewModal.value = false;

    await reloadDetail(true);
  } finally {
    submittingReview.value = false;
  }
}


const shouldShowProcessedHdBlock = computed(() => {
  return processedHdReviewFileIds.value.length > 0
    || ['WAIT_HD_REVIEW', 'HD_REJECTED'].includes(orderStatus.value);
});

const processedHdBlockTitle = computed(() => {
  if (orderStatus.value === 'WAIT_HD_REVIEW') {
    return '接单方提交的高清图';
  }

  if (orderStatus.value === 'HD_REJECTED') {
    return '已驳回的高清图';
  }

  return '处理后的高清图';
});


function openCancelBillModal() {
  billCancelForm.reason = '';
  showBillCancelModal.value = true;
}

async function submitCancelBill() {
  if (!currentBill.value?.id) return;

  if (!billCancelForm.reason.trim()) {
    message.warning('请输入作废原因');
    return;
  }

  submittingBill.value = true;

  try {
    await cancelCollabBill(currentBill.value.id, {
      reason: billCancelForm.reason.trim()
    });

    message.success('协作账单已作废');
    showBillCancelModal.value = false;
    await reloadDetail();
  } finally {
    submittingBill.value = false;
  }
}

function confirmResyncBill() {
  if (!currentBill.value?.id) return;

  dialog.warning({
    title: '重试内部账单同步',
    content: '将重新尝试同步接单方内部客户账单，是否继续？',
    positiveText: '重试',
    negativeText: '取消',
    onPositiveClick: async () => {
      submittingBill.value = true;

      try {
        const res = await resyncCollabInternalBill(currentBill.value!.id!);
        const data = unwrapData<any>(res);
        if (data?.success === false) {
          message.error(data.message || '内部账单同步失败');
        } else {
          message.success(data?.message || '内部账单同步成功');
        }
        await reloadDetail();
      } finally {
        submittingBill.value = false;
      }
    }
  });
}

function openVoucherUploadModal() {
  if (!currentBill.value) return;

  const amount = Number(currentBill.value.unpaidAmount || currentBill.value.billAmount || 0);
  voucherUploadForm.paymentAmount = amount > 0 ? Number(amount.toFixed(2)) : null;
  voucherUploadForm.paymentChannel = 'WECHAT';
  voucherUploadForm.payerName = '';
  voucherUploadForm.transactionNo = '';
  voucherUploadForm.remark = '';
  voucherFileIds.value = [];
  showVoucherUploadModal.value = true;
}

async function submitUploadVoucher() {
  if (!currentBill.value?.id) return;

  if (!voucherUploadForm.paymentAmount || voucherUploadForm.paymentAmount <= 0) {
    message.warning('付款金额必须大于0');
    return;
  }

  if (!voucherFileIds.value.length) {
    message.warning('请上传付款凭证文件');
    return;
  }

  submittingVoucher.value = true;

  try {
    await uploadCollabPaymentVoucher({
      collabBillId: currentBill.value.id,
      paymentAmount: Number(voucherUploadForm.paymentAmount.toFixed(2)),
      paymentChannel: voucherUploadForm.paymentChannel,
      payerName: voucherUploadForm.payerName || undefined,
      transactionNo: voucherUploadForm.transactionNo || undefined,
      fileIds: voucherFileIds.value,
      remark: voucherUploadForm.remark || undefined
    });

    message.success('付款凭证已上传');
    showVoucherUploadModal.value = false;
    voucherFileIds.value = [];
    await reloadDetail();
  } finally {
    submittingVoucher.value = false;
  }
}

function openVoucherReviewModal(row: CollabPaymentVoucherVO, mode: 'approve' | 'reject') {
  currentReviewVoucher.value = row;
  voucherReviewMode.value = mode;
  voucherReviewForm.reviewRemark = '';
  showVoucherReviewModal.value = true;
}

async function submitVoucherReview() {
  if (!currentReviewVoucher.value?.id) return;

  if (voucherReviewMode.value === 'reject' && !voucherReviewForm.reviewRemark.trim()) {
    message.warning('请输入驳回原因');
    return;
  }

  submittingReview.value = true;

  try {
    if (voucherReviewMode.value === 'approve') {
      await approveCollabPaymentVoucher(currentReviewVoucher.value.id, {
        reviewRemark: voucherReviewForm.reviewRemark || undefined
      });
      message.success('付款凭证已审核通过');
    } else {
      await rejectCollabPaymentVoucher(currentReviewVoucher.value.id, {
        reviewRemark: voucherReviewForm.reviewRemark.trim()
      });
      message.success('付款凭证已驳回');
    }

    showVoucherReviewModal.value = false;
    await reloadDetail();
  } finally {
    submittingReview.value = false;
  }
}

async function openHdReviewFromRow(row: CollabOrderRow) {
  if (!row.id) {
    message.warning('协作单ID不能为空');
    return;
  }

  /*
   * 先打开详情，加载附件。
   * 因为高清图文件在详情 files 里。
   */
  await openDetailById(row.id, 'SENT');

  hdReviewForm.result = '';
  hdReviewForm.comment = '';

  showHdReviewModal.value = true;
}

async function openEffectReviewFromRow(row: CollabOrderRow) {
  if (!row.id) {
    message.warning('协作单ID不能为空');
    return;
  }

  await openDetailById(row.id, 'SENT');
  openEffectReviewModal('APPROVE');
}

function confirmResyncPayment(row: CollabPaymentVoucherVO) {
  if (!row.id) return;

  dialog.warning({
    title: '重试付款同步',
    content: '将重新尝试同步内部收款和外协成本，是否继续？',
    positiveText: '重试',
    negativeText: '取消',
    onPositiveClick: async () => {
      submittingVoucher.value = true;

      try {
        const res = await resyncCollabPayment(row.id!);
        const data = unwrapData<any>(res);
        if (data?.success === false) {
          message.error(data.message || '付款同步失败');
        } else {
          message.success(data?.message || '付款同步成功');
        }
        await reloadDetail();
      } finally {
        submittingVoucher.value = false;
      }
    }
  });
}

function goToSend() {
  router.push(COLLAB_ORDER_SEND_PATH);
}

function renderAccountingSync(row: CollabOrderRow) {
  const failed =
    row.internalBillSyncStatus === 'FAILED' ||
    row.internalPaymentSyncStatus === 'FAILED' ||
    row.collabCostSyncStatus === 'FAILED';

  const content = h(
    NSpace,
    { size: 4 },
    {
      default: () => [
        h(
          NTag,
          { size: 'small', type: syncStatusTagType(row.internalBillSyncStatus) as any },
          { default: () => `账单:${syncStatusText(row.internalBillSyncStatus)}` }
        ),
        h(
          NTag,
          { size: 'small', type: syncStatusTagType(row.internalPaymentSyncStatus) as any },
          { default: () => `收款:${syncStatusText(row.internalPaymentSyncStatus)}` }
        ),
        h(
          NTag,
          { size: 'small', type: syncStatusTagType(row.collabCostSyncStatus) as any },
          { default: () => `成本:${syncStatusText(row.collabCostSyncStatus)}` }
        )
      ]
    }
  );

  return failed
    ? h(NBadge, { dot: true, type: 'error' }, { default: () => content })
    : content;
}

function renderSyncStatus(status?: string, error?: string) {
  const tag = h(
    NTag,
    { type: syncStatusTagType(status) as any },
    { default: () => syncStatusText(status) }
  );

  if (status !== 'FAILED') return tag;

  return h(
    NSpace,
    { vertical: true, size: 4 },
    {
      default: () => [
        tag,
        h('span', { class: 'sync-error' }, error || '未知错误')
      ]
    }
  );
}

function parseBillItems(value?: string | null) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseProofFileIds(value?: string | null): CollabId[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }

  return String(value)
    .split(/[,，\s\n]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function eventFileIds(row: CollabEventRow): CollabId[] {
  if (!row.attachmentsJson) return [];

  try {
    const parsed = JSON.parse(row.attachmentsJson);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.fileIds)) return parsed.fileIds;
  } catch {
    return [];
  }

  return [];
}

function latestEventOf(eventTypes: string[]) {
  const list = eventRows.value
    .filter(item => eventTypes.includes(String(item.eventType || '')))
    .slice()
    .sort((a, b) => {
      const at = new Date(a.createTime || '').getTime();
      const bt = new Date(b.createTime || '').getTime();
      return bt - at;
    });

  return list[0] || null;
}

const latestHdRejectEvent = computed(() => {
  return latestEventOf(['HD_REJECT']);
});

const latestHdSubmitEvent = computed(() => {
  return latestEventOf(['HD_SUBMIT']);
});

const hdRejectReason = computed(() => {
  const event = latestHdRejectEvent.value;

  return event?.eventContent || event?.content || '';
});


function unwrapData<T = any>(res: any): T {
  return res?.data ?? res;
}

function unwrapTable(res: any) {
  const data = unwrapData<any>(res);

  if (Array.isArray(data)) {
    return {
      rows: data,
      total: data.length
    };
  }

  const rows = data?.rows || data?.records || data?.list || [];
  const total = Number(data?.total ?? data?.itemCount ?? rows.length ?? 0);

  return {
    rows,
    total
  };
}

function money(value?: number | string | null) {
  if (value === undefined || value === null || value === '') return '-';

  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return String(value);

  return `¥${numberValue.toFixed(2)}`;
}

function serviceTypeText(value?: string) {
  const map: Record<string, string> = {
    REPAIR_ONLY: '只修模',
    PRINT_ONLY: '只打印',
    REPAIR_PRINT: '修模 + 打印'
  };
  return value ? map[value] || value : '-';
}

function materialTypeText(value?: string) {
  const map: Record<string, string> = {
    RAW_PHOTO: '原始照片',
    HD_PHOTO: '高清照片',
    HD_PHOTO_AI_MODEL: '高清照片 + AI模型'
  };
  return value ? map[value] || value : '-';
}

function statusText(value?: string) {
  const map: Record<string, string> = {
    PENDING_ACCEPT: '待接单',
    ACCEPTED: '已接单',
    REJECTED: '已拒单',
    CANCELLED: '已取消',
    MATERIAL_PROCESSING: '高清图处理中',
    WAIT_HD_REVIEW: '待高清图确认',
    HD_REJECTED: '高清图驳回',
    REPAIRING: '修模中',
    WAIT_SENDER_REVIEW: '待发单方审核',
    SENDER_REJECTED: '修模效果图驳回',
    PRINTING: '打印中',
    WAIT_DELIVERY: '待发货',
    DELIVERED: '已发货',
    WAIT_BILL: '待出账',
    BILLED: '已出账',
    VOUCHER_UPLOADED: '已上传凭证',
    PAID_CONFIRMED: '已确认收款',
    COMPLETED: '已完成'
  };
  return value ? map[value] || value : '-';
}

function statusTagType(value?: string) {
  if (['COMPLETED', 'PAID_CONFIRMED', 'DELIVERED', 'ACCEPTED'].includes(value || '')) return 'success';
  if (['REJECTED', 'CANCELLED', 'HD_REJECTED', 'SENDER_REJECTED'].includes(value || '')) return 'error';
  if (['PENDING_ACCEPT', 'WAIT_HD_REVIEW', 'WAIT_SENDER_REVIEW', 'WAIT_DELIVERY', 'WAIT_BILL', 'VOUCHER_UPLOADED'].includes(value || '')) {
    return 'warning';
  }
  return 'info';
}

function paymentStatusText(value?: string) {
  const map: Record<string, string> = {
    UNBILLED: '未出账',
    BILLED: '已出账',
    VOUCHER_UPLOADED: '已上传凭证',
    VOUCHER_REJECTED: '凭证被驳回',
    PAID_CONFIRMED: '已确认收款'
  };
  return value ? map[value] || value : '-';
}

function paymentStatusTagType(value?: string) {
  if (value === 'PAID_CONFIRMED') return 'success';
  if (value === 'VOUCHER_UPLOADED') return 'warning';
  if (value === 'VOUCHER_REJECTED') return 'error';
  if (value === 'BILLED') return 'info';
  return 'default';
}

function billStatusText(value?: string) {
  const map: Record<string, string> = {
    DRAFT: '草稿',
    SENT: '已发送',
    CANCELLED: '已作废'
  };
  return value ? map[value] || value : '-';
}

function billStatusTagType(value?: string) {
  if (value === 'SENT') return 'success';
  if (value === 'CANCELLED') return 'error';
  if (value === 'DRAFT') return 'warning';
  return 'default';
}

function payStatusText(value?: string) {
  const map: Record<string, string> = {
    UNPAID: '未付款',
    PARTIAL: '部分付款',
    PAID: '已付款'
  };
  return value ? map[value] || value : '-';
}

function payStatusTagType(value?: string) {
  if (value === 'PAID') return 'success';
  if (value === 'PARTIAL') return 'warning';
  if (value === 'UNPAID') return 'error';
  return 'default';
}

function syncStatusText(value?: string) {
  const map: Record<string, string> = {
    NOT_SYNCED: '未同步',
    SYNCED: '已同步',
    FAILED: '同步失败'
  };
  return value ? map[value] || value : '-';
}

function syncStatusTagType(value?: string) {
  if (value === 'SYNCED') return 'success';
  if (value === 'FAILED') return 'error';
  if (value === 'NOT_SYNCED') return 'warning';
  return 'default';
}

function reviewStatusText(value?: string) {
  const map: Record<string, string> = {
    PENDING: '待审核',
    APPROVED: '已通过',
    REJECTED: '已驳回'
  };
  return value ? map[value] || value : '-';
}

function reviewStatusTagType(value?: string) {
  if (value === 'APPROVED') return 'success';
  if (value === 'REJECTED') return 'error';
  if (value === 'PENDING') return 'warning';
  return 'default';
}

function paymentChannelText(value?: string) {
  const map: Record<string, string> = {
    WECHAT: '微信',
    ALIPAY: '支付宝',
    BANK: '银行转账',
    CASH: '现金',
    OTHER: '其他'
  };
  return value ? map[value] || value : '-';
}

function billItemTypeText(value?: string) {
  const map: Record<string, string> = {
    COLLAB_SERVICE_FEE: '协作服务费',
    REPAIR_FEE: '修模费',
    PRINT_FEE: '打印费',
    DELIVERY_FEE: '发货费',
    OTHER_FEE: '其他费用'
  };
  return value ? map[value] || value : '-';
}

function printStatusText(value?: string) {
  const map: Record<string, string> = {
    NONE: '无',
    WAIT_PRINT: '待打印',
    PRINTING: '打印中',
    PRINT_COMPLETED: '打印完成'
  };
  return value ? map[value] || value : '-';
}

function deliveryStatusText(value?: string) {
  const map: Record<string, string> = {
    NONE: '无',
    WAIT_DELIVERY: '待发货',
    DELIVERED: '已发货',
    RECEIVED: '已签收'
  };
  return value ? map[value] || value : '-';
}

function deliveryTypeText(value?: string) {
  const map: Record<string, string> = {
    EXPRESS: '快递发货',
    LOCAL_DELIVERY: '同城配送',
    SELF_PICKUP: '到店自取'
  };
  return value ? map[value] || value : '-';
}

function fileTypeText(value?: string) {
  const map: Record<string, string> = {
    RAW_PHOTO: '原图',
    REMARK_IMAGE: '备注图',
    HD_PHOTO: '高清图',
    PROCESSED_HD_PHOTO: '接单方处理高清图',
    AI_MODEL_FILE: 'AI模型文件',
    REPAIR_EFFECT_IMAGE: '修模效果图',
    PRINT_MODEL_FILE: '打印模型文件',
    PRINT_MODEL_ARCHIVE: '打印模型压缩包',
    DELIVERY_ATTACHMENT: '发货附件',
    PAYMENT_VOUCHER: '付款凭证',
    PAYMENT_QR: '收款码'
  };

  return value ? map[value] || value : '-';
}


function isImageFileType(value?: string) {
  return ['RAW_PHOTO', 'HD_PHOTO', 'PROCESSED_HD', 'EFFECT', 'DELIVERY_ATTACHMENT', 'PAYMENT_VOUCHER', 'REMARK_IMAGE','REPAIR_EFFECT_IMAGE','PROCESSED_HD_PHOTO'].includes(value || '');
}

function eventTypeText(value?: string) {
  const map: Record<string, string> = {
    SEND: '发单',
    ACCEPT: '接单',
    REJECT: '拒单',
    HD_SUBMIT: '提交高清图',
    HD_APPROVE: '高清图通过',
    HD_REJECT: '高清图驳回',
    EFFECT_SUBMIT: '提交效果图',
    EFFECT_APPROVE: '效果图通过',
    EFFECT_REJECT: '效果图驳回',
    PRINT_STATUS_SYNC: '打印状态同步',
    DELIVERY_SYNC: '发货同步',
    BILL_CREATE: '创建协作账单',
    BILL_SEND: '发送协作账单',
    BILL_CANCEL: '作废协作账单',
    PAYMENT_VOUCHER_UPLOAD: '上传付款凭证',
    PAYMENT_VOUCHER_APPROVE: '付款凭证审核通过',
    PAYMENT_VOUCHER_REJECT: '付款凭证被驳回',
    INTERNAL_BILL_SYNC: '内部账单同步',
    INTERNAL_PAYMENT_SYNC: '内部收款同步',
    COLLAB_COST_SYNC: '外协成本同步'
  };
  return value ? map[value] || value : '-';
}

function timelineType(value?: string) {
  if (!value) return 'default';
  if (value.includes('REJECT') || value.includes('FAILED')) return 'error';
  if (value.includes('APPROVE') || value === 'ACCEPT' || value === 'DELIVERY_SYNC') return 'success';
  if (value.includes('SYNC') || value.includes('BILL') || value.includes('PAYMENT')) return 'info';
  return 'default';
}
</script>

<template>
  <NSpace vertical :size="16">
    <NCard title="协作单处理中心" :bordered="false">
      <NSpace justify="space-between" align="center">
        <div>
          <strong>协作单处理中心</strong>
          <div class="page-desc">
            统一查看发出的协作单和收到的协作单，处理接单、审核、打印、发货、账单和付款凭证。
          </div>
        </div>

        <NSpace>
          <NButton @click="loadCurrentTab">刷新</NButton>
          <NButton type="primary" @click="goToSend">发起协作</NButton>
        </NSpace>
      </NSpace>
    </NCard>

    <NCard :bordered="false">
      <NForm inline label-placement="left">
        <NFormItem label="状态">
          <NSelect v-model:value="queryForm.status" :options="statusOptions" clearable style="width: 180px" />
        </NFormItem>

        <NFormItem label="服务类型">
          <NSelect v-model:value="queryForm.serviceType" :options="serviceTypeOptions" clearable style="width: 150px" />
        </NFormItem>

        <NFormItem label="资料类型">
          <NSelect v-model:value="queryForm.materialPackageType" :options="materialTypeOptions" clearable style="width: 180px" />
        </NFormItem>

        <NFormItem label="关键词">
          <NInput
            v-model:value="queryForm.keyword"
            clearable
            placeholder="协作单号 / 源订单号 / 商家名称"
            style="width: 280px"
            @keyup.enter="search"
          />
        </NFormItem>

        <NFormItem>
          <NSpace>
            <NButton type="primary" @click="search">查询</NButton>
            <NButton @click="reset">重置</NButton>
          </NSpace>
        </NFormItem>
      </NForm>
    </NCard>

    <NCard :bordered="false">
      <NTabs :value="activeTab" type="line" animated @update:value="handleTabChange">
        <NTabPane name="RECEIVED" tab="收到的协作单">
          <NSpace justify="end" class="table-toolbar">
            <NButton
              type="primary"
              :disabled="selectedReceivedBillRows.length < 2"
              @click="openBatchCreateBillModal"
            >
              批量生成协作账单
            </NButton>
          </NSpace>
          <NDataTable
            remote
            size="small"
            :loading="loadingReceived"
            :columns="receivedColumns"
            :data="receivedRows"
            :checked-row-keys="checkedReceivedRowKeys"
            :row-checkable="canBatchBillRow"
            @update:checked-row-keys="checkedReceivedRowKeys = $event"
            :pagination="receivedPagination"
            :scroll-x="1900"
            :row-key="row => row.id"
            @update:page="handleReceivedPageChange"
            @update:page-size="handleReceivedPageSizeChange"
          />
        </NTabPane>

        <NTabPane name="SENT" tab="发出的协作单">
          <NDataTable
            remote
            size="small"
            :loading="loadingSent"
            :columns="baseColumns"
            :data="sentRows"
            :pagination="sentPagination"
            :scroll-x="1900"
            :row-key="row => row.id"
            @update:page="handleSentPageChange"
            @update:page-size="handleSentPageSizeChange"
          />
        </NTabPane>
      </NTabs>
    </NCard>

    <NDrawer v-model:show="showDetailDrawer" :width="1120" placement="right">
      <NDrawerContent title="协作单详情" closable>
        <NSpin :show="loadingDetail">
          <NSpace v-if="detail" vertical :size="16">
            <NAlert v-if="syncFailedCount > 0" type="error" show-icon>
              当前协作单存在 {{ syncFailedCount }} 项账务同步异常，请在“账单与支付”中查看失败原因并重试。
            </NAlert>

            <NCard title="基础信息" size="small">
              <NDescriptions bordered size="small" :column="3">
                <NDescriptionsItem label="协作单号">
                  {{ currentOrder.collabOrderNo || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="源订单号">
                  {{ currentOrder.sourceOrderNoSnapshot || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="客户">
                  {{ currentOrder.sourceCustomerNameSnapshot || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="发单方">
                  {{ currentOrder.senderTenantNameSnapshot || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="接单方">
                  {{ currentOrder.receiverTenantNameSnapshot || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="服务类型">
                  {{ serviceTypeText(currentOrder.serviceType) }}
                </NDescriptionsItem>
                <NDescriptionsItem label="资料类型">
                  {{ materialTypeText(currentOrder.materialPackageType) }}
                </NDescriptionsItem>
                <NDescriptionsItem label="协作状态">
                  <NTag :type="statusTagType(currentOrder.status) as any">
                    {{ statusText(currentOrder.status) }}
                  </NTag>
                </NDescriptionsItem>
                <NDescriptionsItem label="付款状态">
                  <NTag :type="paymentStatusTagType(currentOrder.paymentStatus) as any">
                    {{ paymentStatusText(currentOrder.paymentStatus) }}
                  </NTag>
                </NDescriptionsItem>
                <NDescriptionsItem label="修模费用">
                  {{ money(currentOrder.senderRepairFeeAmount) }}
                </NDescriptionsItem>
                <NDescriptionsItem label="打印费用">
                  {{ money(currentOrder.printFeeAmount) }}
                </NDescriptionsItem>
                <NDescriptionsItem label="协作合计">
                  {{ money(currentOrder.collabAmount) }}
                </NDescriptionsItem>
                <NDescriptionsItem label="创建时间">
                  {{ currentOrder.createTime || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="标题">
                  {{ currentOrder.title || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="需求说明">
                  {{ currentOrder.requirementDesc || '-' }}
                </NDescriptionsItem>
              </NDescriptions>

              <NDataTable
                v-if="receiverPrintSpecs.length > 0"
                size="small"
                style="margin-top: 12px"
                :columns="[
                  { title: '高度/cm', key: 'heightCm', width: 100, render: row => money(row.heightCm) },
                  { title: '件数', key: 'quantity', width: 80, render: () => '1件' },
                  { title: '实体克数', key: 'actualEntityWeightG', width: 110, render: row => row.actualEntityWeightG ?? '-' },
                  { title: '支撑克数', key: 'actualSupportWeightG', width: 110, render: row => row.actualSupportWeightG ?? '-' },
                  { title: '实体单价', key: 'actualEntityUnitPrice', width: 110, render: row => money(row.actualEntityUnitPrice) },
                  { title: '支撑单价', key: 'actualSupportUnitPrice', width: 110, render: row => money(row.actualSupportUnitPrice) },
                  { title: '小计', key: 'actualAmount', width: 110, render: row => money(row.actualAmount) },
                  { title: '实体称重照片', key: 'actualEntityWeightPhotoFileIds', width: 150, render: row => h(BizFileViewer, { fileIds: row.actualEntityWeightPhotoFileIds, mode: 'image', max: 3, thumbSize: 48 }) },
                  { title: '支撑称重照片', key: 'actualSupportWeightPhotoFileIds', width: 150, render: row => h(BizFileViewer, { fileIds: row.actualSupportWeightPhotoFileIds, mode: 'image', max: 3, thumbSize: 48 }) },
                  { title: '备注', key: 'materialRemark', minWidth: 160, render: row => row.materialRemark || row.remark || '-' }
                ]"
                :data="receiverPrintSpecs"
                :scroll-x="1190"
              />
            </NCard>

            <NCard title="打印 / 发货信息" size="small">
              <NDescriptions bordered size="small" :column="3">
                <NDescriptionsItem label="打印状态">
                  {{ printStatusText(currentOrder.printStatus) }}
                </NDescriptionsItem>
                <NDescriptionsItem label="打印完成时间">
                  {{ currentOrder.printCompletedTime || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="打印任务">
                  {{ receiverPrintTask?.taskNo || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="打印费用">
                  {{ money(receiverPrintTask?.finalAmount || currentOrder.printFeeAmount) }}
                </NDescriptionsItem>
                <NDescriptionsItem label="实体克数">
                  {{ receiverPrintTask?.entityWeightG ?? '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="支撑克数">
                  {{ receiverPrintTask?.supportWeightG ?? '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="总克数">
                  {{ receiverPrintTotalWeight === null ? '-' : receiverPrintTotalWeight }}
                </NDescriptionsItem>
                <NDescriptionsItem label="实体单克价">
                  {{ money(receiverPrintTask?.entityUnitPrice) }}
                </NDescriptionsItem>
                <NDescriptionsItem label="支撑单克价">
                  {{ money(receiverPrintTask?.supportUnitPrice) }}
                </NDescriptionsItem>
                <NDescriptionsItem label="基础打印费">
                  {{ money(receiverPrintTask?.basePrintFee) }}
                </NDescriptionsItem>
                <NDescriptionsItem label="后处理费">
                  {{ money(receiverPrintTask?.postProcessFee) }}
                </NDescriptionsItem>
                <NDescriptionsItem label="材料录入时间">
                  {{ receiverPrintTask?.materialRecordTime || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="打印完成照片" :span="3">
                  <BizFileViewer
                    v-if="receiverPrintTask?.finishPhotoFileIds"
                    :file-ids="receiverPrintTask.finishPhotoFileIds"
                    mode="image"
                    :max="10"
                    :thumb-size="72"
                    show-name
                  />
                  <span v-else>-</span>
                </NDescriptionsItem>
                <NDescriptionsItem label="发货状态">
                  {{ deliveryStatusText(currentOrder.deliveryStatus) }}
                </NDescriptionsItem>
                <NDescriptionsItem label="物流公司">
                  {{ currentOrder.logisticsCompany || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="物流单号">
                  {{ currentOrder.logisticsNo || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="发货时间">
                  {{ currentOrder.deliveredTime || '-' }}
                </NDescriptionsItem>
              </NDescriptions>
            </NCard>

            <NCard title="打印规格与材料明细" size="small">
              <NDataTable
                v-if="receiverPrintSpecs.length > 0"
                size="small"
                :columns="[
                  { title: '高度/cm', key: 'heightCm', width: 100, render: row => money(row.heightCm) },
                  { title: '件数', key: 'quantity', width: 80, render: () => '1件' },
                  { title: '预估克数', key: 'estimatedWeightG', width: 110, render: row => row.estimatedWeightG ?? '-' },
                  { title: '预估金额', key: 'estimatedAmount', width: 110, render: row => money(row.estimatedAmount) },
                  { title: '实体克数', key: 'actualEntityWeightG', width: 110, render: row => row.actualEntityWeightG ?? '-' },
                  { title: '支撑克数', key: 'actualSupportWeightG', width: 110, render: row => row.actualSupportWeightG ?? '-' },
                  { title: '实体单价', key: 'actualEntityUnitPrice', width: 110, render: row => money(row.actualEntityUnitPrice) },
                  { title: '支撑单价', key: 'actualSupportUnitPrice', width: 110, render: row => money(row.actualSupportUnitPrice) },
                  { title: '打印费用', key: 'actualAmount', width: 110, render: row => money(row.actualAmount) },
                  { title: '实体称重照片', key: 'actualEntityWeightPhotoFileIds', width: 150, render: row => h(BizFileViewer, { fileIds: row.actualEntityWeightPhotoFileIds, mode: 'image', max: 3, thumbSize: 48 }) },
                  { title: '支撑称重照片', key: 'actualSupportWeightPhotoFileIds', width: 150, render: row => h(BizFileViewer, { fileIds: row.actualSupportWeightPhotoFileIds, mode: 'image', max: 3, thumbSize: 48 }) },
                  { title: '备注', key: 'materialRemark', minWidth: 160, render: row => row.materialRemark || row.remark || '-' }
                ]"
                :data="receiverPrintSpecs"
                :scroll-x="1430"
              />
              <NEmpty v-else description="暂无打印规格与材料明细" />
            </NCard>

            <NCard
              v-if="shouldShowProcessedHdBlock"
              title="接单方提交的高清图"
              size="small"
            >
              <NSpace vertical :size="12">
                <NAlert
                  v-if="orderStatus === 'WAIT_HD_REVIEW'"
                  type="warning"
                  show-icon
                >
                  接单方已提交处理后的高清图，请确认是否通过。通过后协作单将进入修模流程；驳回后接单方需要重新处理高清图。
                </NAlert>

                <NAlert
                  v-else-if="orderStatus === 'HD_REJECTED'"
                  type="error"
                  show-icon
                >
                  高清图已被发单方驳回，接单方需要重新处理后再次提交。
                </NAlert>

                <BizFileViewer
                  v-if="processedHdReviewFileIds.length"
                  :file-ids="processedHdReviewFileIds"
                  mode="image"
                  :max="20"
                  :thumb-size="96"
                  show-name
                />

                <NEmpty
                  v-else
                  description="暂无接单方提交的高清图"
                />

                <NSpace v-if="canReviewHd">
                  <NButton
                    type="primary"
                    @click="openHdReviewModal('APPROVE')"
                  >
                    确认 / 驳回高清图
                  </NButton>
                </NSpace>
              </NSpace>
            </NCard>


            <NCard title="处理动作" size="small">
              <NSpace vertical :size="16">
                <NAlert v-if="canAcceptOrReject" type="warning" show-icon>
                  当前协作单待接单，请确认后选择接单或拒单。
                </NAlert>

                <NSpace v-if="canAcceptOrReject">
                  <NButton type="primary" @click="handleAccept(currentOrder)">接单</NButton>
                  <NButton type="error" ghost @click="openRejectModal(currentOrder)">拒单</NButton>
                </NSpace>

                <NCard
                  v-if="isReceivedRole && orderStatus === 'HD_REJECTED'"
                  title="上次提交的高清图"
                  size="small"
                >
                  <NSpace vertical :size="12">
                    <NAlert type="error" show-icon>
                      发单方已驳回高清图，请根据驳回原因重新处理后提交。
                      <template v-if="hdRejectReason">
                        驳回原因：{{ hdRejectReason }}
                      </template>
                    </NAlert>

                    <BizFileViewer
                      v-if="processedHdReviewFileIds.length"
                      :file-ids="processedHdReviewFileIds"
                      mode="image"
                      :max="20"
                      show-name
                    />

                    <NEmpty
                      v-else
                      description="未找到上次提交的高清图"
                    />
                  </NSpace>
                </NCard>

                <NCard v-if="canSubmitHd" title="提交处理后的高清图" embedded size="small">
                  <NForm label-placement="left" label-width="120px">
                    <NFormItem label="高清图文件" required>
                      <BizFileUpload
                        v-model="processedHdFileIds"
                        biz-type="COLLAB_ORDER"
                        :biz-id="currentOrderId"
                        file-stage="COLLAB_PROCESS"
                        file-type="PROCESSED_HD_PHOTO"
                        :max="10"
                        :accept="imageAccept"
                      />

                    </NFormItem>
                    <NFormItem v-if="processedHdFileIds.length" label="已上传">
                      <BizFileViewer :file-ids="processedHdFileIds" mode="image" :max="10" :thumb-size="80" show-name />
                    </NFormItem>
                    <NFormItem label="备注">
                      <NInput v-model:value="hdSubmitComment" type="textarea" placeholder="请输入备注" />
                    </NFormItem>
                    <NFormItem>
                      <NButton type="primary" :loading="submittingHd" @click="submitHdReview">提交高清图</NButton>
                    </NFormItem>
                  </NForm>
                </NCard>


                <NCard v-if="canSubmitEffect" title="提交修模效果图" embedded size="small">
                  <NForm label-placement="left" label-width="120px">
                    <NFormItem label="效果图文件" required>
                      <BizFileUpload
                        v-model="effectFileIds"
                        biz-type="COLLAB_ORDER"
                        :biz-id="currentOrderId"
                        file-stage="REPAIR_EFFECT"
                        file-type="EFFECT"
                        :max="10"
                        :accept="imageAccept"
                      />
                    </NFormItem>
                    <NFormItem v-if="effectFileIds.length" label="已上传">
                      <BizFileViewer :file-ids="effectFileIds" mode="image" :max="10" :thumb-size="80" show-name />
                    </NFormItem>
                    <NFormItem label="备注">
                      <NInput v-model:value="effectSubmitComment" type="textarea" placeholder="请输入备注" />
                    </NFormItem>
                    <NFormItem>
                      <NButton type="primary" :loading="submittingEffect" @click="submitEffectReview">提交效果图</NButton>
                    </NFormItem>
                  </NForm>
                </NCard>

                <NCard v-if="canReviewEffect" title="修模效果图审核" embedded size="small">
                  <NSpace vertical :size="12">
                    <BizFileViewer
                      v-if="repairEffectReviewFileIds.length"
                      :file-ids="repairEffectReviewFileIds"
                      mode="auto"
                      :max="20"
                      :thumb-size="96"
                      show-name
                    />

                    <NEmpty
                      v-else
                      description="暂无接单方提交的效果图或效果视频"
                    />

                    <NSpace>
                      <NButton type="success" @click="openEffectReviewModal('APPROVE')">审核通过</NButton>
                      <NButton type="error" ghost @click="openEffectReviewModal('REJECT')">驳回</NButton>
                    </NSpace>
                  </NSpace>
                </NCard>

                <NCard v-if="canSyncPrint" title="同步打印状态" embedded size="small">
                  <NForm label-placement="left" label-width="120px">
                    <NFormItem label="打印状态" required>
                      <NSelect v-model:value="printForm.printStatus" :options="printStatusOptions" style="width: 220px" />
                    </NFormItem>
                    <NFormItem label="备注">
                      <NInput v-model:value="printForm.remark" type="textarea" placeholder="请输入备注" />
                    </NFormItem>
                    <NFormItem>
                      <NButton type="primary" :loading="submittingPrint" @click="submitPrintStatus">同步打印状态</NButton>
                    </NFormItem>
                  </NForm>
                </NCard>

                <NCard v-if="canSyncDeliveryInfo" title="同步收货信息" embedded size="small">
                  <NForm label-placement="left" label-width="120px">
                    <NFormItem label="发货方式" required>
                      <NSelect v-model:value="deliveryInfoForm.deliveryType" :options="deliveryTypeOptions" />
                    </NFormItem>
                    <NFormItem label="收件人" required>
                      <NInput v-model:value="deliveryInfoForm.receiverName" placeholder="请输入收件人" />
                    </NFormItem>
                    <NFormItem label="收件电话" required>
                      <NInput v-model:value="deliveryInfoForm.receiverPhone" placeholder="请输入收件电话" />
                    </NFormItem>
                    <NFormItem label="收件地址" required>
                      <NInput v-model:value="deliveryInfoForm.receiverAddress" type="textarea" placeholder="请输入收件地址" />
                    </NFormItem>
                    <NFormItem label="备注">
                      <NInput v-model:value="deliveryInfoForm.remark" type="textarea" placeholder="请输入备注" />
                    </NFormItem>
                    <NFormItem>
                      <NButton type="primary" :loading="submittingDeliveryInfo" @click="submitDeliveryInfo">同步给接单方</NButton>
                    </NFormItem>
                  </NForm>
                </NCard>

                <NCard v-if="canDelivery" title="同步发货信息" embedded size="small">
                  <NDescriptions bordered size="small" :column="1" style="margin-bottom: 12px">
                    <NDescriptionsItem label="发货方式">
                      {{ deliveryTypeText(currentOrder.deliveryTypeSnapshot) }}
                    </NDescriptionsItem>
                    <NDescriptionsItem label="收件人">
                      {{ currentOrder.receiverNameSnapshot || '-' }}
                    </NDescriptionsItem>
                    <NDescriptionsItem label="收件电话">
                      {{ currentOrder.receiverPhoneSnapshot || '-' }}
                    </NDescriptionsItem>
                    <NDescriptionsItem label="收件地址">
                      {{ currentOrder.receiverAddressSnapshot || '-' }}
                    </NDescriptionsItem>
                  </NDescriptions>
                  <NForm label-placement="left" label-width="120px">
                    <NFormItem label="物流公司" required>
                      <NInput v-model:value="deliveryForm.logisticsCompany" placeholder="请输入物流公司" />
                    </NFormItem>
                    <NFormItem label="物流单号" required>
                      <NInput v-model:value="deliveryForm.logisticsNo" placeholder="请输入物流单号" />
                    </NFormItem>
                    <NFormItem label="发货附件">
                      <BizFileUpload
                        v-model="deliveryFileIds"
                        biz-type="COLLAB_ORDER"
                        :biz-id="currentOrderId"
                        file-stage="DELIVERY"
                        file-type="DELIVERY_ATTACHMENT"
                        :max="10"
                        :accept="imageAccept"
                      />
                    </NFormItem>
                    <NFormItem v-if="deliveryFileIds.length" label="已上传">
                      <BizFileViewer :file-ids="deliveryFileIds" mode="auto" :max="10" :thumb-size="80" show-name />
                    </NFormItem>
                    <NFormItem label="备注">
                      <NInput v-model:value="deliveryForm.remark" type="textarea" placeholder="请输入备注" />
                    </NFormItem>
                    <NFormItem>
                      <NButton type="primary" :loading="submittingDelivery" @click="submitDelivery">确认发货</NButton>
                    </NFormItem>
                  </NForm>
                </NCard>

                <NCard v-if="canCompleteCollab" title="归档完成" embedded size="small">
                  <NForm label-placement="left" label-width="120px">
                    <NFormItem label="归档备注">
                      <NInput v-model:value="completeForm.remark" type="textarea" placeholder="可填写归档说明" />
                    </NFormItem>
                    <NFormItem>
                      <NButton type="primary" :loading="submittingComplete" @click="submitCompleteCollab">归档完成</NButton>
                    </NFormItem>
                  </NForm>
                </NCard>

                <NAlert
                  v-if="!canAcceptOrReject && !canSubmitHd && !canReviewHd && !canSubmitEffect && !canReviewEffect && !canSyncPrint && !canSyncDeliveryInfo && !canDelivery && !canCompleteCollab"
                  type="info"
                  show-icon
                >
                  当前状态暂无工序处理动作。
                </NAlert>
              </NSpace>
            </NCard>

            <CollabBillingPanel
              v-if="detail"
              :detail="detail"
              :role="activeTab === 'SENT' ? 'sender' : 'receiver'"
              @refresh="handleBillingRefresh"
            />


            <NCard title="附件与时间线" size="small">
              <NTabs v-model:value="activeDetailTab" type="line" animated>
                <NTabPane name="base" tab="附件">
                  <NDataTable
                    v-if="currentFiles.length"
                    size="small"
                    :columns="fileColumns"
                    :data="currentFiles"
                    :pagination="false"
                    bordered
                  />
                  <NEmpty v-else description="暂无附件" />
                </NTabPane>

                <NTabPane name="events" tab="时间线">
                  <NSpin :show="loadingEvents">
                    <NTimeline v-if="eventRows.length">
                      <NTimelineItem
                        v-for="item in eventRows"
                        :key="item.id"
                        :type="timelineType(item.eventType) as any"
                        :title="item.eventName || eventTypeText(item.eventType)"
                        :time="item.createTime"
                      >
                        <div class="timeline-content">
                          <div>{{ item.eventContent || item.content || '-' }}</div>
                          <div class="timeline-meta">
                            操作方：{{ item.operatorTenantNameSnapshot || '-' }} / {{ item.operatorUserName || '-' }}
                          </div>
                          <div v-if="eventFileIds(item).length" class="mt-8px">
                            <BizFileViewer :file-ids="eventFileIds(item)" mode="auto" :max="8" :thumb-size="54" show-name />
                          </div>
                        </div>
                      </NTimelineItem>
                    </NTimeline>
                    <NEmpty v-else description="暂无时间线" />
                  </NSpin>
                </NTabPane>
              </NTabs>
            </NCard>
          </NSpace>

          <NEmpty v-else description="暂无详情" />
        </NSpin>
      </NDrawerContent>
    </NDrawer>

    <NModal v-model:show="showRejectModal" preset="card" title="拒绝协作单" :style="{ width: '520px' }">
      <NForm label-placement="left" label-width="90px">
        <NFormItem label="拒单原因" required>
          <NInput v-model:value="rejectForm.reason" type="textarea" placeholder="请输入拒单原因" />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showRejectModal = false">取消</NButton>
          <NButton type="error" :loading="submittingReject" @click="submitReject">确认拒单</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showEffectReviewModal" preset="card" :title="effectReviewForm.result === 'APPROVE' ? '审核通过效果图' : '驳回效果图'" :style="{ width: '520px' }">
      <NSpace vertical :size="12">
        <BizFileViewer
          v-if="repairEffectReviewFileIds.length"
          :file-ids="repairEffectReviewFileIds"
          mode="auto"
          :max="20"
          :thumb-size="88"
          show-name
        />

        <NEmpty
          v-else
          description="暂无接单方提交的效果图或效果视频"
        />
      </NSpace>

      <NForm label-placement="left" label-width="90px">
        <NFormItem label="审核备注">
          <NInput v-model:value="effectReviewForm.comment" type="textarea" placeholder="请输入审核备注" />
        </NFormItem>
        <NFormItem v-if="effectReviewForm.result === 'REJECT'" label="驳回附件" required>
          <BizFileUpload
            v-model="effectRejectAttachmentFileIds"
            biz-type="COLLAB_ORDER"
            :biz-id="currentOrderId"
            file-stage="REPAIR_REVIEW"
            file-type="PREVIEW_REVIEW_ATTACHMENT"
            accept="image/*"
            :max="10"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showEffectReviewModal = false">取消</NButton>
          <NButton
            v-if="effectReviewForm.result === 'APPROVE'"
            type="error"
            ghost
            @click="switchEffectReviewResult('REJECT')"
          >
            驳回
          </NButton>
          <NButton
            v-else
            ghost
            @click="switchEffectReviewResult('APPROVE')"
          >
            改为通过
          </NButton>
          <NButton :type="effectReviewForm.result === 'APPROVE' ? 'success' : 'error'" :loading="submittingReview" @click="submitEffectReviewResult">
            {{ effectReviewForm.result === 'APPROVE' ? '审核通过' : '确认驳回' }}
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showBatchBillCreateModal" preset="card" title="批量生成协作账单" :style="{ width: '720px' }">
      <NSpace vertical :size="12">
        <NAlert type="info">
          已选择 {{ selectedReceivedBillRows.length }} 条待出账协作单。批量账单只能合并同一发单方，提交后会自动发送给发单方付款。
        </NAlert>
        <NForm label-placement="left" label-width="100px">
          <NFormItem label="账单标题">
            <NInput v-model:value="batchBillCreateForm.billTitle" placeholder="请输入账单标题" />
          </NFormItem>
          <NFormItem label="备注">
            <NInput v-model:value="batchBillCreateForm.billRemark" type="textarea" />
          </NFormItem>
        </NForm>
        <NDataTable
          size="small"
          :columns="[
            { title: '协作单号', key: 'collabOrderNo', width: 160 },
            { title: '源订单号', key: 'sourceOrderNoSnapshot', width: 160 },
            { title: '服务类型', key: 'serviceType', width: 120, render: (row: any) => serviceTypeText(row.serviceType) },
            { title: '修模费', key: 'senderRepairFeeAmount', width: 100, render: (row: any) => money(row.senderRepairFeeAmount) },
            { title: '打印费', key: 'printFeeAmount', width: 100, render: (row: any) => money(row.receiverPrintTask?.finalAmount || row.printFeeAmount) },
            { title: '账单金额', key: 'collabAmount', width: 110, render: (row: any) => money(row.collabAmount || Number(row.senderRepairFeeAmount || 0) + Number(row.receiverPrintTask?.finalAmount || row.printFeeAmount || 0)) }
          ]"
          :data="selectedReceivedBillRows"
          :pagination="false"
        />
      </NSpace>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showBatchBillCreateModal = false">取消</NButton>
          <NButton type="primary" :loading="submittingBatchBill" @click="submitBatchCreateBill">
            创建并发送
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showBillCreateModal" preset="card" title="创建协作账单" :style="{ width: '560px' }">
      <NForm label-placement="left" label-width="100px">
        <NFormItem label="账单金额" required>
          <NInputNumber v-model:value="billCreateForm.billAmount" :min="0.01" :precision="2" class="w-full" />
        </NFormItem>
        <NFormItem label="账单标题">
          <NInput v-model:value="billCreateForm.billTitle" placeholder="请输入账单标题" />
        </NFormItem>
        <NFormItem label="明细名称">
          <NInput v-model:value="billCreateForm.itemName" placeholder="例如：协作服务费 / 打印费 / 修模费" />
        </NFormItem>
        <NFormItem label="明细类型">
          <NSelect v-model:value="billCreateForm.itemType" :options="billItemTypeOptions" />
        </NFormItem>
        <NFormItem label="备注">
          <NInput v-model:value="billCreateForm.billRemark" type="textarea" />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showBillCreateModal = false">取消</NButton>
          <NButton type="primary" :loading="submittingBill" @click="submitCreateBill">创建</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showBillCancelModal" preset="card" title="作废协作账单" :style="{ width: '520px' }">
      <NForm label-placement="left" label-width="90px">
        <NFormItem label="作废原因" required>
          <NInput v-model:value="billCancelForm.reason" type="textarea" placeholder="请输入作废原因" />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showBillCancelModal = false">取消</NButton>
          <NButton type="error" :loading="submittingBill" @click="submitCancelBill">确认作废</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showVoucherUploadModal" preset="card" title="上传付款凭证" :style="{ width: '620px' }">
      <NForm label-placement="left" label-width="110px">
        <NFormItem label="付款金额" required>
          <NInputNumber v-model:value="voucherUploadForm.paymentAmount" :min="0.01" :precision="2" class="w-full" />
        </NFormItem>
        <NFormItem label="付款渠道" required>
          <NSelect v-model:value="voucherUploadForm.paymentChannel" :options="paymentChannelOptions" />
        </NFormItem>
        <NFormItem label="付款人">
          <NInput v-model:value="voucherUploadForm.payerName" placeholder="请输入付款人" />
        </NFormItem>
        <NFormItem label="交易流水号">
          <NInput v-model:value="voucherUploadForm.transactionNo" placeholder="请输入交易流水号" />
        </NFormItem>
        <NFormItem label="付款凭证" required>
          <BizFileUpload
            v-model="voucherFileIds"
            biz-type="COLLAB_ORDER"
            :biz-id="currentOrderId"
            file-stage="PAYMENT"
            file-type="PAYMENT_VOUCHER"
            :max="10"
            :accept="imageAccept"
          />
        </NFormItem>
        <NFormItem v-if="voucherFileIds.length" label="已上传">
          <BizFileViewer :file-ids="voucherFileIds" mode="image" :max="10" :thumb-size="80" show-name />
        </NFormItem>
        <NFormItem label="备注">
          <NInput v-model:value="voucherUploadForm.remark" type="textarea" />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showVoucherUploadModal = false">取消</NButton>
          <NButton type="primary" :loading="submittingVoucher" @click="submitUploadVoucher">上传</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal
      v-model:show="showVoucherReviewModal"
      preset="card"
      :title="voucherReviewMode === 'approve' ? '审核通过付款凭证' : '驳回付款凭证'"
      :style="{ width: '520px' }"
    >
      <NForm label-placement="left" label-width="90px">
        <NFormItem label="审核备注" :required="voucherReviewMode === 'reject'">
          <NInput v-model:value="voucherReviewForm.reviewRemark" type="textarea" placeholder="请输入审核备注" />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showVoucherReviewModal = false">取消</NButton>
          <NButton
            :type="voucherReviewMode === 'approve' ? 'success' : 'error'"
            :loading="submittingReview"
            @click="submitVoucherReview"
          >
            {{ voucherReviewMode === 'approve' ? '审核通过' : '确认驳回' }}
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal
      v-model:show="showHdReviewModal"
      preset="card"
      title="确认高清图"
      style="width: 720px"
    >
      <NSpace vertical :size="12">
        <NAlert type="info" show-icon>
          请查看接单方提交的高清图。确认通过后，接单方将进入内部修模流程；如果驳回，接单方需要重新处理并提交。
        </NAlert>
        <div style="color: #999; font-size: 12px">
          调试：高清图文件ID：{{ processedHdReviewFileIds.join(',') || '-' }}
        </div>

        <NCard title="接单方提交的高清图" size="small">
          <BizFileViewer
            v-if="processedHdReviewFileIds.length"
            :file-ids="processedHdReviewFileIds"
            mode="image"
            :max="20"
            :thumb-size="96"
            show-name
          />

          <NEmpty
            v-else
            description="暂无高清图文件"
          />
        </NCard>

        <NForm label-placement="left" label-width="90">
          <NFormItem label="审核结果" required>
            <NSelect
              v-model:value="hdReviewForm.result"
              :options="[
            { label: '确认通过', value: 'APPROVE' },
            { label: '驳回重做', value: 'REJECT' }
          ]"
              style="width: 220px"
            />
          </NFormItem>

          <NFormItem
            :label="hdReviewForm.result === 'REJECT' ? '驳回原因' : '审核备注'"
            :required="hdReviewForm.result === 'REJECT'"
          >
            <NInput
              v-model:value="hdReviewForm.comment"
              type="textarea"
              placeholder="通过可填写备注；驳回时请填写原因"
            />
          </NFormItem>
        </NForm>

        <NSpace justify="end">
          <NButton @click="showHdReviewModal = false">
            取消
          </NButton>

          <NButton
            type="primary"
            :loading="submittingReview"
            @click="submitHdReviewResult"
          >
            提交审核
          </NButton>
        </NSpace>
      </NSpace>
    </NModal>

  </NSpace>
</template>

<style scoped>
.page-desc {
  margin-top: 6px;
  color: #888;
  font-size: 13px;
}

.timeline-content {
  line-height: 1.6;
}

.timeline-meta {
  margin-top: 4px;
  color: #888;
  font-size: 12px;
}

.sync-error {
  color: #d03050;
  font-size: 12px;
  line-height: 1.4;
  word-break: break-all;
}

.amount-cell {
  line-height: 1.5;
}

.amount-total {
  font-weight: 600;
}

.amount-sub {
  color: #666;
  font-size: 12px;
}

.mt-8px {
  margin-top: 8px;
}

.mt-12px {
  margin-top: 12px;
}

.mb-8px {
  margin-bottom: 8px;
}

.w-full {
  width: 100%;
}
</style>
