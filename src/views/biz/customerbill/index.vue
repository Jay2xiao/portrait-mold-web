<script setup lang="ts">
import {h, onMounted, reactive, ref, VNodeChild} from 'vue';
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
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
  NPopconfirm,
  NSelect,
  NSpace,
  NSpin,
  NTag,
  useMessage
} from 'naive-ui';

import {
  cancelCustomerBill,
  confirmCustomerBill,
  fetchCustomerBillDetail,
  fetchCustomerBillList,
  type CustomerBillItemVO,
  type CustomerBillVO
} from '@/service/api/biz/customer-bill';

import {
  fetchCollabBillDetail,
  fetchCollabBillList,
  type CollabBillBatchOrderVO,
  type CollabBillVO
} from '@/service/api/biz/collab-bill';
import {
  fetchCollabOrderDetail,
  type CollabOrderDetailVO,
  type CollabPrintSpecVO,
  type CollabPrintTaskSpecVO
} from '@/service/api/biz/collab-order';
import { buildSentCollabBillListParams } from '@/service/api/biz/collab-bill-query';
import { buildCollabMerchantOptions } from '@/service/api/biz/collab-partner-options';
import { fetchCollabPartnerList } from '@/service/api/biz/collab';

import {
  payCustomerBill,
  recordCustomerPrepayment,
  cancelPayment,
  type PaymentRecordVO
} from '@/service/api/biz/payment';

import {
  fetchCustomerAccountByCustomerId,
  type CustomerAccountVO
} from '@/service/api/biz/customer-account';

import {
  offsetCustomerBillByBalance
} from '@/service/api/biz/payment';

import { refundPayment } from '@/service/api/biz/refund';

import CustomerBillPrintDrawer from '@/views/biz/components/CustomerBillPrintDrawer.vue';
import CollabOrderDetailDrawer from '@/views/biz/components/CollabOrderDetailDrawer.vue';

import { watch } from 'vue';
import { useRoute } from 'vue-router';
import { routeQueryBoolean, routeQueryString } from '@/utils/route-query';

const route = useRoute();


import { fetchCustomerList } from '@/service/api/biz/customer';
import BizFileUpload from '@/views/biz/components/BizFileUpload.vue';
import BizFileThumbs from '@/views/biz/components/BizFileThumbs.vue';
import {exportCustomerStatementExcel} from "@/service/api/biz/customer-reconciliation";

defineOptions({
  name: 'BizCustomerBill'
});

const message = useMessage();

const loading = ref(false);
const tableData = ref<CustomerBillVO[]>([]);
const total = ref(0);

const customerOptions = ref<any[]>([]);
const collabMerchantOptions = ref<any[]>([]);

const collabBillLoading = ref(false);
const collabBillTableData = ref<CollabBillVO[]>([]);
const collabBillTotal = ref(0);
const showCollabBillDetailDrawer = ref(false);
const collabBillDetailLoading = ref(false);
const collabBillDetail = ref<CollabBillVO | null>(null);
const collabOrderDetail = ref<CollabOrderDetailVO | null>(null);
const showCollabOrderDetailDrawer = ref(false);
const currentCollabOrderId = ref<string | number | null>(null);

const showBalanceOffsetModal = ref(false);
const currentAccount = ref<CustomerAccountVO | null>(null);

const balanceOffsetForm = reactive({
  amount: 0,
  remark: ''
});

const showRefundModal = ref(false);
const currentRefundPayment = ref<PaymentRecordVO | null>(null);
const refundProofFileIds = ref<Array<string | number>>([]);


const refundForm = reactive({
  refundAmount: 0,
  refundMethod: 'WECHAT',
  receiverName: '',
  transactionNo: '',
  reason: '',
  remark: ''
});


const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  billNo: '',
  customerId: undefined as string | number | undefined,
  billDateRange: null as [number, number] | null,
  payStatus: '',
  billStatus: '',
  unpaidOnly: false,
  overdue: false
});

const collabBillQueryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  counterpartyTenantId: undefined as string | undefined,
  sendTimeRange: null as [number, number] | null,
  payStatus: '',
  billStatus: ''
});

const showDetailDrawer = ref(false);
const billDetail = ref<any>(null);

const showPayModal = ref(false);
const currentBill = ref<CustomerBillVO | null>(null);
const paymentProofFileIds = ref<Array<string | number>>([]);

const showCancelPaymentModal = ref(false);
const currentPayment = ref<PaymentRecordVO | null>(null);

const cancelPaymentForm = reactive({
  reason: ''
});

const payForm = reactive({
  payAmount: 0,
  payMethod: 'WECHAT',
  payerName: '',
  transactionNo: '',
  remark: ''
});

const showPrepayModal = ref(false);
const prepayProofFileIds = ref<Array<string | number>>([]);

const prepayForm = reactive({
  customerId: undefined as string | number | undefined,
  payAmount: 0,
  payMethod: 'WECHAT',
  payerName: '',
  transactionNo: '',
  remark: ''
});

const payStatusOptions = [
  { label: '未支付', value: 'UNPAID' },
  { label: '部分支付', value: 'PARTIAL' },
  { label: '已支付', value: 'PAID' },
  { label: '已取消', value: 'CANCELLED' }
];

const billStatusOptions = [
  { label: '草稿', value: 'DRAFT' },
  { label: '已确认', value: 'CONFIRMED' },
  { label: '已作废', value: 'CANCELLED' }
];

const payMethodOptions = [
  { label: '微信', value: 'WECHAT' },
  { label: '支付宝', value: 'ALIPAY' },
  { label: '银行转账', value: 'BANK' },
  { label: '现金', value: 'CASH' },
  { label: '其他', value: 'OTHER' }
];

function formatDateValue(value?: number | null) {
  if (!value) return undefined;

  const date = new Date(value);

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}


function money(value?: number) {
  return Number(value || 0).toFixed(2);
}

function displayValue(value?: string | number | null) {
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
}

function decimalValue(value?: string | number | null, digits = 2) {
  if (value === undefined || value === null || value === '') return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toFixed(digits);
}

function itemTypeLabel(value?: string) {
  if (value === 'REPAIR_FEE') return '修模费';
  if (value === 'PRINT_FEE') return '打印费';
  if (value === 'DELIVERY_FEE') return '发货费';
  if (value === 'ADJUSTMENT') return '调整项';
  if (value === 'DISCOUNT') return '优惠';
  if (value === 'OTHER_FEE') return '其他费用';
  return value || '-';
}

function renderRepairBillItemDetail(row: CustomerBillItemVO) {
  if (!row.repairPreviewFileIds) {
    return h('span', { class: 'muted-text' }, '暂无修模效果图');
  }

  return h(
    NSpace,
    { vertical: true, size: 6 },
    {
      default: () => [
        h('span', { class: 'muted-text' }, '修模后效果图'),
        h(BizFileThumbs, {
          fileIds: row.repairPreviewFileIds,
          max: 6,
          thumbSize: 56,
          mode: 'image'
        })
      ]
    }
  );
}

function renderPrintSpecLine(spec: NonNullable<CustomerBillItemVO['printSpecs']>[number], index: number) {
  const parts = [
    `规格${index + 1}`,
    `${decimalValue(spec.heightCm)}cm`,
    `数量${spec.quantity || 1}`,
    `实体${decimalValue(spec.actualEntityWeightG)}g × ${decimalValue(spec.actualEntityUnitPrice, 4)}`,
    `支撑${decimalValue(spec.actualSupportWeightG)}g × ${decimalValue(spec.actualSupportUnitPrice, 4)}`,
    `小计${decimalValue(spec.actualAmount)}元`
  ];
  return h('div', { class: 'bill-print-spec-line' }, parts.join('，'));
}

function renderPrintBillItemDetail(row: CustomerBillItemVO) {
  const specs = row.printSpecs || [];
  if (!specs.length) {
    return h('span', { class: 'muted-text' }, '暂无打印规格明细');
  }

  return h(
    NSpace,
    { vertical: true, size: 4 },
    {
      default: () => specs.map((spec, index) => renderPrintSpecLine(spec, index))
    }
  );
}

function renderBillItemDetail(row: CustomerBillItemVO) {
  if (row.itemType === 'REPAIR_FEE') {
    return renderRepairBillItemDetail(row);
  }
  if (row.itemType === 'PRINT_FEE') {
    return renderPrintBillItemDetail(row);
  }
  return h('span', { class: 'muted-text' }, row.remark || '-');
}

function payStatusLabel(value?: string) {
  return payStatusOptions.find(item => item.value === value)?.label || value || '-';
}

function billStatusLabel(value?: string) {
  return billStatusOptions.find(item => item.value === value)?.label || value || '-';
}

function payStatusTagType(value?: string) {
  if (value === 'PAID') return 'success';
  if (value === 'PARTIAL') return 'warning';
  if (value === 'CANCELLED') return 'error';
  return 'default';
}

function billStatusTagType(value?: string) {
  if (value === 'CONFIRMED') return 'success';
  if (value === 'CANCELLED') return 'error';
  return 'warning';
}

function collabBillStatusLabel(value?: string) {
  const map: Record<string, string> = {
    DRAFT: '草稿',
    SENT: '已发送',
    CANCELLED: '已作废'
  };

  return map[value || ''] || value || '-';
}

function collabBillStatusTagType(value?: string) {
  if (value === 'SENT') return 'success';
  if (value === 'CANCELLED') return 'error';
  return 'warning';
}

function parseCollabBillItems(row?: CollabBillVO | null) {
  const raw = (row as any)?.itemsJson || (row as any)?.billItemsJson;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function collabBillItemTypeLabel(value?: string) {
  if (value === 'REPAIR_FEE') return '修模费';
  if (value === 'PRINT_FEE') return '打印费';
  if (value === 'DELIVERY_FEE') return '发货费';
  if (value === 'ADJUSTMENT') return '调整项';
  if (value === 'DISCOUNT') return '优惠';
  if (value === 'OTHER_FEE') return '其他费用';
  return value || '-';
}

function collabReceiverPrintTask() {
  return collabOrderDetail.value?.receiverPrintTask || null;
}

function billModeLabel(value?: string) {
  if (value === 'BATCH') return '批量账单';
  if (value === 'SINGLE') return '单笔账单';
  return value || '-';
}

function collabServiceTypeLabel(value?: string) {
  if (value === 'REPAIR_ONLY') return '只修模';
  if (value === 'PRINT_ONLY') return '只打印';
  if (value === 'REPAIR_PRINT') return '修模 + 打印';
  return value || '-';
}

function collabBillOrders() {
  return collabBillDetail.value?.orders || [];
}

function openCollabOrderDetailFromBillOrder(row: CollabBillBatchOrderVO) {
  if (!row.collabOrderId) {
    message.warning('协作账单明细未关联协作单');
    return;
  }

  currentCollabOrderId.value = row.collabOrderId;
  showCollabOrderDetailDrawer.value = true;
}

function collabPlannedPrintSpecs() {
  return collabOrderDetail.value?.printSpecs || [];
}

function collabActualPrintSpecs() {
  return collabReceiverPrintTask()?.printSpecs || [];
}

function hasCollabPrintInfo() {
  return Boolean(
    collabReceiverPrintTask()
    || collabPlannedPrintSpecs().length > 0
    || collabActualPrintSpecs().length > 0
  );
}

const billItemDetailColumns = [
  { title: '订单号', key: 'orderNoSnapshot', width: 160 },
  {
    title: '产品名称',
    key: 'productName',
    width: 150,
    render(row: CustomerBillItemVO) {
      return displayValue(row.productName);
    }
  },
  {
    title: '产品类型',
    key: 'productTypeName',
    width: 120,
    render(row: CustomerBillItemVO) {
      return row.productTypeName || row.productType || '-';
    }
  },
  {
    title: '费用类型',
    key: 'itemType',
    width: 110,
    render(row: CustomerBillItemVO) {
      return itemTypeLabel(row.itemType);
    }
  },
  { title: '费用名称', key: 'itemName', width: 130 },
  {
    title: '费用说明',
    key: 'billItemDetail',
    minWidth: 420,
    render(row: CustomerBillItemVO) {
      return renderBillItemDetail(row);
    }
  },
  {
    title: '金额',
    key: 'amount',
    width: 100,
    render(row: CustomerBillItemVO) {
      return money(row.amount);
    }
  },
  {
    title: '已收',
    key: 'paidAmount',
    width: 100,
    render(row: CustomerBillItemVO) {
      return money(row.paidAmount);
    }
  },
  {
    title: '未收',
    key: 'unpaidAmount',
    width: 100,
    render(row: CustomerBillItemVO) {
      return money(row.unpaidAmount);
    }
  },
  {
    title: '支付状态',
    key: 'payStatus',
    width: 110,
    render(row: CustomerBillItemVO) {
      return h(
        NTag,
        { type: payStatusTagType(row.payStatus) as any },
        { default: () => payStatusLabel(row.payStatus) }
      );
    }
  }
];

function unwrapRows(res: any) {
  const data = res?.data || res;
  if (Array.isArray(data)) return data;
  return data?.rows || [];
}

function unwrapTotal(res: any) {
  const data = res?.data || res;
  return data?.total || 0;
}

function unwrapData(res: any) {
  return res?.data || res;
}

function openCancelPayment(payment: PaymentRecordVO) {
  currentPayment.value = payment;
  cancelPaymentForm.reason = '';
  showCancelPaymentModal.value = true;
}

async function submitCancelPayment() {
  if (!currentPayment.value?.id) return;

  if (!cancelPaymentForm.reason) {
    message.warning('请输入作废原因');
    return;
  }

  await cancelPayment(currentPayment.value.id, {
    reason: cancelPaymentForm.reason
  });

  message.success('收款已作废');

  showCancelPaymentModal.value = false;

  await getList();
  await refreshBillDetail();
}

function getRefundedAmount(payment: PaymentRecordVO) {
  return Number(payment.refundedAmount || 0);
}

function hasRefund(payment: PaymentRecordVO) {
  return getRefundedAmount(payment) > 0 || ['PARTIAL_REFUND', 'REFUNDED'].includes(payment.refundStatus || '');
}


function paymentRefundableAmount(payment: PaymentRecordVO) {
  if (payment.paymentType === 'BILL_PAYMENT') {
    return Math.max(Number(payment.allocatedAmount || 0) - Number(payment.refundedAmount || 0), 0);
  }

  if (payment.paymentType === 'PREPAYMENT') {
    return Math.max(Number(payment.payAmount || 0) - Number(payment.refundedAmount || 0), 0);
  }

  return 0;
}

function canCancelPayment(payment: PaymentRecordVO) {
  return payment.status === 'SUCCESS' && !hasRefund(payment);
}

function canRefundPayment(payment: PaymentRecordVO) {
  return payment.status === 'SUCCESS'
    && payment.paymentType === 'BILL_PAYMENT'
    && paymentRefundableAmount(payment) > 0;
}

function refundStatusLabel(value?: string) {
  if (value === 'NO_REFUND') return '未退款';
  if (value === 'PARTIAL_REFUND') return '部分退款';
  if (value === 'REFUNDED') return '已退款';
  return value || '未退款';
}


function paymentStatusLabel(value?: string) {
  if (value === 'SUCCESS') return '成功';
  if (value === 'CANCELLED') return '已作废';
  return value || '-';
}

function paymentStatusTagType(value?: string) {
  if (value === 'SUCCESS') return 'success';
  if (value === 'CANCELLED') return 'error';
  return 'default';
}


async function openBalanceOffset(row: CustomerBillVO) {
  if (!row.customerId) {
    message.warning('账单客户为空');
    return;
  }

  currentBill.value = row;

  const res = await fetchCustomerAccountByCustomerId(row.customerId);
  currentAccount.value = res.data || res || null;

  const balance = Number(currentAccount.value?.balanceAmount || 0);
  const unpaid = Number(row.unpaidAmount || 0);

  if (balance <= 0) {
    message.warning('该客户没有可用预收余额');
    return;
  }

  balanceOffsetForm.amount = Math.min(balance, unpaid);
  balanceOffsetForm.remark = '';

  showBalanceOffsetModal.value = true;
}

async function submitBalanceOffset() {
  if (!currentBill.value?.id) return;

  if (!balanceOffsetForm.amount || balanceOffsetForm.amount <= 0) {
    message.warning('请输入抵扣金额');
    return;
  }

  await offsetCustomerBillByBalance(currentBill.value.id, balanceOffsetForm);

  message.success('余额抵扣成功');
  showBalanceOffsetModal.value = false;

  getList();

  if (showDetailDrawer.value && currentBill.value.id) {
    await openDetail(currentBill.value);
  }
}


function openRefundPayment(payment: PaymentRecordVO) {
  const refundable = paymentRefundableAmount(payment);

  if (refundable <= 0) {
    message.warning('该收款没有可退款金额');
    return;
  }

  currentRefundPayment.value = payment;

  refundForm.refundAmount = refundable;
  refundForm.refundMethod = 'WECHAT';
  refundForm.receiverName = '';
  refundForm.transactionNo = '';
  refundForm.reason = '';
  refundForm.remark = '';
  refundProofFileIds.value = [];

  showRefundModal.value = true;
}

async function submitRefundPayment() {
  if (!currentRefundPayment.value?.id) return;

  if (!refundForm.refundAmount || refundForm.refundAmount <= 0) {
    message.warning('请输入退款金额');
    return;
  }

  if (!refundForm.reason) {
    message.warning('请输入退款原因');
    return;
  }

  await refundPayment(currentRefundPayment.value.id, {
    ...refundForm,
    proofFileIds: refundProofFileIds.value.join(',')
  });

  message.success('退款成功');
  showRefundModal.value = false;

  await getList();
  await refreshBillDetail();
}




const columns = [
  {
    title: '账单号',
    key: 'billNo',
    width: 180,
    fixed: 'left' as const
  },
  {
    title: '客户',
    key: 'customerNameSnapshot',
    width: 140,
    fixed: 'left' as const
  },
  {
    title: '账单类型',
    key: 'billType',
    width: 120
  },
  {
    title: '账单日期',
    key: 'billDate',
    width: 120
  },
  {
    title: '到期日期',
    key: 'dueDate',
    width: 120
  },
  {
    title: '总金额',
    key: 'totalAmount',
    width: 110,
    render(row: CustomerBillVO) {
      return money(row.totalAmount);
    }
  },
  {
    title: '已收',
    key: 'paidAmount',
    width: 100,
    render(row: CustomerBillVO) {
      return money(row.paidAmount);
    }
  },
  {
    title: '未收',
    key: 'unpaidAmount',
    width: 100,
    render(row: CustomerBillVO) {
      return money(row.unpaidAmount);
    }
  },
  {
    title: '支付状态',
    key: 'payStatus',
    width: 110,
    render(row: CustomerBillVO) {
      return h(
        NTag,
        { type: payStatusTagType(row.payStatus) as any },
        { default: () => payStatusLabel(row.payStatus) }
      );
    }
  },
  {
    title: '账单状态',
    key: 'billStatus',
    width: 110,
    render(row: CustomerBillVO) {
      return h(
        NTag,
        { type: billStatusTagType(row.billStatus) as any },
        { default: () => billStatusLabel(row.billStatus) }
      );
    }
  },
  {
    title: '明细数',
    key: 'itemCount',
    width: 90
  },
  {
    title: '创建时间',
    key: 'createTime',
    width: 170
  },
  {
    title: '操作',
    key: 'actions',
    width: 300,
    fixed: 'right' as const,
    render(row: CustomerBillVO) {
      const buttons: VNodeChild[] = [];

      buttons.push(
        h(
          NButton,
          {
            size: 'small',
            onClick: () => openDetail(row)
          },
          { default: () => '详情' }
        )
      );

      if (row.billStatus === 'DRAFT') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => handleConfirm(row)
            },
            { default: () => '确认' }
          )
        );
      }

      if (row.billStatus === 'CONFIRMED' && row.payStatus !== 'PAID') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'success',
              onClick: () => openPay(row)
            },
            { default: () => '收款' }
          )
        );
      }

      if (row.billStatus === 'CONFIRMED' && row.payStatus !== 'PAID') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'info',
              onClick: () => openBalanceOffset(row)
            },
            { default: () => '余额抵扣' }
          )
        );
      }

      if (row.payStatus === 'UNPAID' && row.billStatus !== 'CANCELLED') {
        buttons.push(
          h(
            NPopconfirm,
            {
              onPositiveClick: () => handleCancel(row)
            },
            {
              trigger: () =>
                h(
                  NButton,
                  {
                    size: 'small',
                    type: 'error'
                  },
                  { default: () => '作废' }
                ),
              default: () => '确认作废该账单吗？'
            }
          )
        );
      }

      buttons.push(
        h(
          NButton,
          {
            size: 'small',
            onClick: () => exportBillExcel(row)
          },
          { default: () => '导出Excel' }
        )
      );

      buttons.push(
        h(
          NButton,
          {
            size: 'small',
            type: 'info',
            onClick: () => printBillPdf(row)
          },
          { default: () => '打印PDF' }
        )
      );


      return h(NSpace, {}, { default: () => buttons });
    }
  }
];

const collabBillColumns = [
  {
    title: '协作账单号',
    key: 'collabBillNo',
    width: 180,
    fixed: 'left' as const
  },
  {
    title: '源订单号',
    key: 'sourceOrderNoSnapshot',
    width: 170,
    fixed: 'left' as const
  },
  {
    title: '协作单号',
    key: 'collabOrderNoSnapshot',
    width: 190
  },
  {
    title: '接单商家',
    key: 'receiverTenantNameSnapshot',
    width: 140
  },
  {
    title: '账单标题',
    key: 'billTitle',
    width: 180,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '应付金额',
    key: 'billAmount',
    width: 110,
    render(row: CollabBillVO) {
      return money(row.billAmount);
    }
  },
  {
    title: '已付',
    key: 'paidAmount',
    width: 100,
    render(row: CollabBillVO) {
      return money(row.paidAmount);
    }
  },
  {
    title: '未付',
    key: 'unpaidAmount',
    width: 100,
    render(row: CollabBillVO) {
      return money(row.unpaidAmount);
    }
  },
  {
    title: '支付状态',
    key: 'payStatus',
    width: 110,
    render(row: CollabBillVO) {
      return h(
        NTag,
        { type: payStatusTagType(row.payStatus) as any },
        { default: () => payStatusLabel(row.payStatus) }
      );
    }
  },
  {
    title: '账单状态',
    key: 'billStatus',
    width: 110,
    render(row: CollabBillVO) {
      return h(
        NTag,
        { type: collabBillStatusTagType(row.billStatus) as any },
        { default: () => collabBillStatusLabel(row.billStatus) }
      );
    }
  },
  {
    title: '发送时间',
    key: 'sendTime',
    width: 170
  },
  {
    title: '付款确认时间',
    key: 'paidConfirmTime',
    width: 170
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    fixed: 'right' as const,
    render(row: CollabBillVO) {
      return h(NSpace, { size: 8 }, {
        default: () => [
          h(
            NButton,
            {
              size: 'small',
              onClick: () => openCollabBillDetail(row)
            },
            { default: () => '账单详情' }
          ),
          h(
            NButton,
            {
              size: 'small',
	              type: 'primary',
	              secondary: true,
	              disabled: !row.collabOrderId,
	              onClick: () => openCollabOrderDetailDrawer(row)
	            },
            { default: () => '协作单详情' }
          )
        ]
      });
    }
  }
];

const collabBillOrderColumns = [
  {
    title: '协作单号',
    key: 'collabOrderNoSnapshot',
    width: 180,
    fixed: 'left' as const
  },
  {
    title: '源订单号',
    key: 'sourceOrderNoSnapshot',
    width: 150
  },
  {
    title: '接单方订单',
    key: 'receiverOrderNoSnapshot',
    width: 150
  },
  {
    title: '服务类型',
    key: 'serviceType',
    width: 120,
    render(row: CollabBillBatchOrderVO) {
      return collabServiceTypeLabel(row.serviceType);
    }
  },
  {
    title: '修模费',
    key: 'repairFeeAmount',
    width: 100,
    render(row: CollabBillBatchOrderVO) {
      return money(row.repairFeeAmount as number);
    }
  },
  {
    title: '打印费',
    key: 'printFeeAmount',
    width: 100,
    render(row: CollabBillBatchOrderVO) {
      return money(row.printFeeAmount as number);
    }
  },
  {
    title: '账单金额',
    key: 'billAmount',
    width: 110,
    render(row: CollabBillBatchOrderVO) {
      return money(row.billAmount as number);
    }
  },
  {
    title: '备注',
    key: 'remark',
    minWidth: 160,
    render(row: CollabBillBatchOrderVO) {
      return row.remark || '-';
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right' as const,
    render(row: CollabBillBatchOrderVO) {
      return h(
        NButton,
        {
          size: 'small',
          type: 'primary',
          secondary: true,
          disabled: !row.collabOrderId,
          onClick: () => openCollabOrderDetailFromBillOrder(row)
        },
        { default: () => '协作单详情' }
      );
    }
  }
];

const collabPlannedPrintSpecColumns = [
  {
    title: '规格',
    key: 'heightCm',
    width: 120,
    render(row: CollabPrintSpecVO) {
      return `${decimalValue(row.heightCm)}cm`;
    }
  },
  {
    title: '数量',
    key: 'quantity',
    width: 80,
    render(row: CollabPrintSpecVO) {
      return row.quantity || 1;
    }
  },
  {
    title: '预估重量',
    key: 'estimatedWeightG',
    width: 120,
    render(row: CollabPrintSpecVO) {
      return `${decimalValue(row.estimatedWeightG)}g`;
    }
  },
  {
    title: '预估金额',
    key: 'estimatedAmount',
    width: 120,
    render(row: CollabPrintSpecVO) {
      return money(row.estimatedAmount as number);
    }
  },
  {
    title: '备注',
    key: 'remark',
    minWidth: 180,
    render(row: CollabPrintSpecVO) {
      return row.remark || '-';
    }
  }
];

const collabActualPrintSpecColumns = [
  {
    title: '规格',
    key: 'heightCm',
    width: 100,
    render(row: CollabPrintTaskSpecVO) {
      return `${decimalValue(row.heightCm)}cm`;
    }
  },
  {
    title: '实体克数',
    key: 'actualEntityWeightG',
    width: 110,
    render(row: CollabPrintTaskSpecVO) {
      return `${decimalValue(row.actualEntityWeightG)}g`;
    }
  },
  {
    title: '实体单价',
    key: 'actualEntityUnitPrice',
    width: 110,
    render(row: CollabPrintTaskSpecVO) {
      return decimalValue(row.actualEntityUnitPrice, 4);
    }
  },
  {
    title: '支撑克数',
    key: 'actualSupportWeightG',
    width: 110,
    render(row: CollabPrintTaskSpecVO) {
      return `${decimalValue(row.actualSupportWeightG)}g`;
    }
  },
  {
    title: '支撑单价',
    key: 'actualSupportUnitPrice',
    width: 110,
    render(row: CollabPrintTaskSpecVO) {
      return decimalValue(row.actualSupportUnitPrice, 4);
    }
  },
  {
    title: '小计',
    key: 'actualAmount',
    width: 110,
    render(row: CollabPrintTaskSpecVO) {
      return money(row.actualAmount as number);
    }
  },
  {
    title: '实体称重照片',
    key: 'actualEntityWeightPhotoFileIds',
    width: 160,
    render(row: CollabPrintTaskSpecVO) {
      return h(BizFileThumbs, {
        fileIds: row.actualEntityWeightPhotoFileIds,
        mode: 'image',
        max: 3,
        thumbSize: 48
      });
    }
  },
  {
    title: '支撑称重照片',
    key: 'actualSupportWeightPhotoFileIds',
    width: 160,
    render(row: CollabPrintTaskSpecVO) {
      return h(BizFileThumbs, {
        fileIds: row.actualSupportWeightPhotoFileIds,
        mode: 'image',
        max: 3,
        thumbSize: 48
      });
    }
  },
  {
    title: '备注',
    key: 'materialRemark',
    minWidth: 160,
    render(row: CollabPrintTaskSpecVO) {
      return row.materialRemark || row.remark || '-';
    }
  }
];

async function loadCustomers() {
  const res = await fetchCustomerList({
    pageNum: 1,
    pageSize: 999
  } as any);

  customerOptions.value = unwrapRows(res).map((item: any) => ({
    label: `${item.customerName || ''} ${item.phone || ''}`,
    value: item.id
  }));
}

async function loadCollabMerchants() {
  const res = await fetchCollabPartnerList({
    status: 'ACCEPTED'
  });

  collabMerchantOptions.value = buildCollabMerchantOptions(res);
}

async function getList() {
  loading.value = true;
  try {
    const res = await fetchCustomerBillList(buildCustomerBillListParams());
    tableData.value = unwrapRows(res);
    total.value = unwrapTotal(res);
  } finally {
    loading.value = false;
  }
}

async function getCollabBillList() {
  collabBillLoading.value = true;
  try {
    const res = await fetchCollabBillList(buildCollabBillListParams());
    collabBillTableData.value = unwrapRows(res);
    collabBillTotal.value = unwrapTotal(res);
  } finally {
    collabBillLoading.value = false;
  }
}

function buildCustomerBillListParams() {
  const params: any = { ...queryParams };
  const [billDateStart, billDateEnd] = queryParams.billDateRange || [];

  delete params.billDateRange;
  params.billDateStart = formatDateValue(billDateStart);
  params.billDateEnd = formatDateValue(billDateEnd);

  return params;
}

function buildCollabBillListParams() {
  const params: any = { ...collabBillQueryParams };
  const [sendTimeStart, sendTimeEnd] = collabBillQueryParams.sendTimeRange || [];

  delete params.sendTimeRange;
  params.sendTimeStart = formatDateValue(sendTimeStart);
  params.sendTimeEnd = formatDateValue(sendTimeEnd);

  return buildSentCollabBillListParams(params);
}

async function openCollabBillDetail(row: CollabBillVO) {
  if (!row.id) return;
  showCollabBillDetailDrawer.value = true;
  collabBillDetailLoading.value = true;
  collabBillDetail.value = null;
  collabOrderDetail.value = null;
  try {
    const res = await fetchCollabBillDetail(row.id);
    const bill = unwrapData(res);
    collabBillDetail.value = bill;

    const collabOrderId = bill?.collabOrderId || row.collabOrderId;
    if (collabOrderId) {
      try {
        const detailRes = await fetchCollabOrderDetail(collabOrderId);
        collabOrderDetail.value = unwrapData(detailRes);
      } catch {
        message.warning('协作账单已加载，但协作单打印明细加载失败');
      }
    }
  } finally {
    collabBillDetailLoading.value = false;
  }
}

function openCollabOrderDetailDrawer(row: CollabBillVO) {
  if (!row.collabOrderId) {
    message.warning('协作账单未关联协作单');
    return;
  }
  currentCollabOrderId.value = row.collabOrderId;
  showCollabOrderDetailDrawer.value = true;
}

function resetQuery() {
  queryParams.billNo = '';
  queryParams.customerId = undefined;
  queryParams.billDateRange = null;
  queryParams.payStatus = '';
  queryParams.billStatus = '';
  queryParams.pageNum = 1;
  queryParams.unpaidOnly = false;
  getList();
}

function resetCollabBillQuery() {
  collabBillQueryParams.keyword = '';
  collabBillQueryParams.counterpartyTenantId = undefined;
  collabBillQueryParams.sendTimeRange = null;
  collabBillQueryParams.payStatus = '';
  collabBillQueryParams.billStatus = '';
  collabBillQueryParams.pageNum = 1;
  getCollabBillList();
}

async function openDetail(row: CustomerBillVO) {
  if (!row.id) return;

  currentBill.value = row;

  const res = await fetchCustomerBillDetail(row.id);
  billDetail.value = res.data || res;
  showDetailDrawer.value = true;
}


async function handleConfirm(row: CustomerBillVO) {
  if (!row.id) return;

  await confirmCustomerBill(row.id);
  message.success('账单已确认');
  getList();
}

async function handleCancel(row: CustomerBillVO) {
  if (!row.id) return;

  await cancelCustomerBill(row.id, '管理员作废账单');
  message.success('账单已作废');
  getList();
}

function openPay(row: CustomerBillVO) {
  currentBill.value = row;

  payForm.payAmount = Number(row.unpaidAmount || 0);
  payForm.payMethod = 'WECHAT';
  payForm.payerName = '';
  payForm.transactionNo = '';
  payForm.remark = '';

  paymentProofFileIds.value = [];
  showPayModal.value = true;
}

async function submitPay() {
  if (!currentBill.value?.id) return;

  if (!payForm.payAmount || payForm.payAmount <= 0) {
    message.warning('请输入收款金额');
    return;
  }

  await payCustomerBill(currentBill.value.id, {
    ...payForm,
    proofFileIds: paymentProofFileIds.value.join(',')
  });

  message.success('收款成功');
  showPayModal.value = false;
  getList();

  if (showDetailDrawer.value && currentBill.value.id) {
    await openDetail(currentBill.value);
  }
}

function openPrepay() {
  prepayForm.customerId = undefined;
  prepayForm.payAmount = 0;
  prepayForm.payMethod = 'WECHAT';
  prepayForm.payerName = '';
  prepayForm.transactionNo = '';
  prepayForm.remark = '';
  prepayProofFileIds.value = [];
  showPrepayModal.value = true;
}

async function submitPrepay() {
  if (!prepayForm.customerId) {
    message.warning('请选择客户');
    return;
  }

  if (!prepayForm.payAmount || prepayForm.payAmount <= 0) {
    message.warning('请输入预收金额');
    return;
  }

  await recordCustomerPrepayment({
    ...prepayForm,
    proofFileIds: prepayProofFileIds.value.join(',')
  });

  message.success('预收款登记成功');
  showPrepayModal.value = false;
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

function handleCollabBillPageChange(page: number) {
  collabBillQueryParams.pageNum = page;
  getCollabBillList();
}

function handleCollabBillPageSizeChange(pageSize: number) {
  collabBillQueryParams.pageSize = pageSize;
  collabBillQueryParams.pageNum = 1;
  getCollabBillList();
}

async function refreshBillDetail() {
  const billId = billDetail.value?.bill?.id || currentBill.value?.id;

  if (!billId) return;

  const res = await fetchCustomerBillDetail(billId);
  billDetail.value = res.data || res;
}

const showBillPrintDrawer = ref(false);
const printBillId = ref<string | number | null>(null);

function printBillPdf(row: any) {
  if (!row?.id) {
    message.warning('账单ID为空');
    return;
  }

  printBillId.value = row.id;
  showBillPrintDrawer.value = true;
}


async function exportBillExcel(row: any) {
  if (!row?.id) {
    message.warning('账单ID为空');
    return;
  }

  const res = await exportCustomerStatementExcel(row.id);
  const blob = getBlobFromResponse(res);

  downloadBlob(blob, `客户对账单-${row.billNo || row.id}.xlsx`);
}

function getBlobFromResponse(res: any) {
  if (res instanceof Blob) {
    return res;
  }

  if (res?.data instanceof Blob) {
    return res.data;
  }

  return new Blob([res]);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function applyRouteQuery() {
  const q = route.query;

  if ('payStatus' in q) {
    queryParams.payStatus = routeQueryString(q.payStatus);
  }

  if ('billStatus' in q) {
    queryParams.billStatus = routeQueryString(q.billStatus);
  }

  if ('unpaidOnly' in q) {
    queryParams.unpaidOnly = routeQueryBoolean(q.unpaidOnly);
  }

  if ('overdue' in q) {
    queryParams.overdue = routeQueryBoolean(q.overdue);
  }

  queryParams.pageNum = 1;
}


onMounted(async () => {
  await Promise.all([
    loadCustomers(),
    loadCollabMerchants()
  ]);
  applyRouteQuery();
  getList();
  getCollabBillList();
});

watch(
  () => route.fullPath,
  () => {
    applyRouteQuery();
    getList();
    getCollabBillList();
  }
);
</script>

<template>
  <NCard title="客户账单管理" :bordered="false">
    <NSpace vertical :size="16">
      <NAlert type="info">
        客户账单可包含多个订单、多个应收项目。账单确认后可以登记收款，系统会自动核销并回写订单支付状态。
      </NAlert>

      <NForm inline label-placement="left">
        <NFormItem label="账单号">
          <NInput v-model:value="queryParams.billNo" clearable placeholder="请输入账单号" />
        </NFormItem>

        <NFormItem label="客户">
          <NSelect
            v-model:value="queryParams.customerId"
            :options="customerOptions"
            filterable
            clearable
            style="width: 220px"
          />
        </NFormItem>

        <NFormItem label="账单日期">
          <NDatePicker
            v-model:value="queryParams.billDateRange"
            type="daterange"
            clearable
            style="width: 240px"
          />
        </NFormItem>

        <NFormItem label="支付状态">
          <NSelect
            v-model:value="queryParams.payStatus"
            :options="payStatusOptions"
            clearable
            style="width: 130px"
          />
        </NFormItem>

        <NFormItem label="账单状态">
          <NSelect
            v-model:value="queryParams.billStatus"
            :options="billStatusOptions"
            clearable
            style="width: 130px"
          />
        </NFormItem>

        <NFormItem>
          <NSpace>
            <NButton type="primary" @click="getList">查询</NButton>
            <NButton @click="resetQuery">重置</NButton>
            <NButton type="success" @click="openPrepay">登记预收款</NButton>
          </NSpace>
        </NFormItem>
      </NForm>

      <NDataTable
        remote
        size="small"
        :loading="loading"
        :columns="columns"
        :data="tableData"
        :scroll-x="1800"
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

      <div class="section-title">协作账单（外协应付）</div>

      <NAlert type="info">
        这里展示当前商家作为发单方收到的协作账单，属于外协应付/协作成本，不混入客户应收账单。
      </NAlert>

      <NForm inline label-placement="left">
        <NFormItem label="关键词">
          <NInput
            v-model:value="collabBillQueryParams.keyword"
            clearable
            placeholder="账单号 / 协作单号 / 源订单号"
            style="width: 240px"
          />
        </NFormItem>

        <NFormItem label="协作商家">
          <NSelect
            v-model:value="collabBillQueryParams.counterpartyTenantId"
            :options="collabMerchantOptions"
            filterable
            clearable
            style="width: 220px"
          />
        </NFormItem>

        <NFormItem label="发送日期">
          <NDatePicker
            v-model:value="collabBillQueryParams.sendTimeRange"
            type="daterange"
            clearable
            style="width: 240px"
          />
        </NFormItem>

        <NFormItem label="支付状态">
          <NSelect
            v-model:value="collabBillQueryParams.payStatus"
            :options="payStatusOptions"
            clearable
            style="width: 130px"
          />
        </NFormItem>

        <NFormItem label="账单状态">
          <NSelect
            v-model:value="collabBillQueryParams.billStatus"
            :options="[
              { label: '草稿', value: 'DRAFT' },
              { label: '已发送', value: 'SENT' },
              { label: '已作废', value: 'CANCELLED' }
            ]"
            clearable
            style="width: 130px"
          />
        </NFormItem>

        <NFormItem>
          <NSpace>
            <NButton type="primary" @click="getCollabBillList">查询</NButton>
            <NButton @click="resetCollabBillQuery">重置</NButton>
          </NSpace>
        </NFormItem>
      </NForm>

      <NDataTable
        remote
        size="small"
        :loading="collabBillLoading"
        :columns="collabBillColumns"
        :data="collabBillTableData"
        :scroll-x="1800"
        :pagination="{
          page: collabBillQueryParams.pageNum,
          pageSize: collabBillQueryParams.pageSize,
          itemCount: collabBillTotal,
          showSizePicker: true,
          pageSizes: [10, 20, 50, 100],
          onUpdatePage: handleCollabBillPageChange,
          onUpdatePageSize: handleCollabBillPageSizeChange
        }"
      />
    </NSpace>

    <CollabOrderDetailDrawer
      v-model:show="showCollabOrderDetailDrawer"
      :collab-order-id="currentCollabOrderId"
      readonly
    />

    <NDrawer v-model:show="showCollabBillDetailDrawer" width="860" placement="right">
      <NDrawerContent title="协作账单详情" closable>
        <NSpin :show="collabBillDetailLoading">
          <NSpace v-if="collabBillDetail" vertical :size="16">
            <NCard title="账单信息" size="small">
              <NDescriptions bordered :column="2" size="small">
                <NDescriptionsItem label="协作账单号">
                  {{ collabBillDetail.collabBillNo || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="账单标题">
                  {{ collabBillDetail.billTitle || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="账单模式">
                  {{ billModeLabel(collabBillDetail.billMode) }}
                </NDescriptionsItem>
                <NDescriptionsItem label="协作单数">
                  {{ collabBillDetail.orderCount || collabBillOrders().length || 1 }}
                </NDescriptionsItem>
                <NDescriptionsItem label="账期">
                  {{ collabBillDetail.billPeriodStart || '-' }} 至 {{ collabBillDetail.billPeriodEnd || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="源订单号">
                  {{ collabBillDetail.sourceOrderNoSnapshot || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="协作单号">
                  {{ collabBillDetail.collabOrderNoSnapshot || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="发单方">
                  {{ collabBillDetail.senderTenantNameSnapshot || collabBillDetail.senderTenantId || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="接单方">
                  {{ collabBillDetail.receiverTenantNameSnapshot || collabBillDetail.receiverTenantId || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="应付金额">
                  {{ money(collabBillDetail.billAmount) }}
                </NDescriptionsItem>
                <NDescriptionsItem label="支付状态">
                  {{ payStatusLabel(collabBillDetail.payStatus) }}
                </NDescriptionsItem>
                <NDescriptionsItem label="账单状态">
                  {{ collabBillStatusLabel(collabBillDetail.billStatus) }}
                </NDescriptionsItem>
                <NDescriptionsItem label="发送时间">
                  {{ collabBillDetail.sendTime || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="付款确认时间">
                  {{ collabBillDetail.paidConfirmTime || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="内部账单">
                  {{ collabBillDetail.receiverInternalBillNoSnapshot || '-' }}
                </NDescriptionsItem>
                <NDescriptionsItem label="备注" :span="2">
                  {{ collabBillDetail.remark || '-' }}
                </NDescriptionsItem>
              </NDescriptions>
            </NCard>

            <NCard v-if="collabBillOrders().length" title="账单包含协作单" size="small">
              <NDataTable
                size="small"
                :columns="collabBillOrderColumns"
                :data="collabBillOrders()"
                :scroll-x="1280"
                :pagination="false"
              />
            </NCard>

            <NCard title="账单明细" size="small">
              <NEmpty v-if="parseCollabBillItems(collabBillDetail).length === 0" description="暂无账单明细" />
              <NDataTable
                v-else
                size="small"
                :columns="[
                  { title: '费用名称', key: 'itemName', width: 180 },
                  {
                    title: '费用类型',
                    key: 'itemType',
                    width: 140,
                    render: (row: any) => collabBillItemTypeLabel(row.itemType)
                  },
                  {
                    title: '金额',
                    key: 'amount',
                    width: 120,
                    render: (row: any) => money(row.amount)
                  },
                  { title: '备注', key: 'remark', minWidth: 220 }
                ]"
                :data="parseCollabBillItems(collabBillDetail)"
                :pagination="false"
              />
            </NCard>

            <NCard v-if="hasCollabPrintInfo()" title="协作打印信息" size="small">
              <NSpace vertical :size="12">
                <NDescriptions v-if="collabReceiverPrintTask()" bordered :column="3" size="small">
                  <NDescriptionsItem label="打印任务号">
                    {{ collabReceiverPrintTask()?.taskNo || '-' }}
                  </NDescriptionsItem>
                  <NDescriptionsItem label="打印状态">
                    {{ collabReceiverPrintTask()?.status || '-' }}
                  </NDescriptionsItem>
                  <NDescriptionsItem label="打印费用">
                    {{ money(collabReceiverPrintTask()?.finalAmount as number) }}
                  </NDescriptionsItem>
                  <NDescriptionsItem label="实体克数">
                    {{ decimalValue(collabReceiverPrintTask()?.entityWeightG) }}g
                  </NDescriptionsItem>
                  <NDescriptionsItem label="支撑克数">
                    {{ decimalValue(collabReceiverPrintTask()?.supportWeightG) }}g
                  </NDescriptionsItem>
                  <NDescriptionsItem label="材料录入时间">
                    {{ collabReceiverPrintTask()?.materialRecordTime || '-' }}
                  </NDescriptionsItem>
                  <NDescriptionsItem label="打印完成照片" :span="3">
                    <BizFileThumbs
                      :file-ids="collabReceiverPrintTask()?.finishPhotoFileIds"
                      mode="image"
                      :max="8"
                      :thumb-size="56"
                    />
                  </NDescriptionsItem>
                  <NDescriptionsItem label="汇总实体称重照片" :span="3">
                    <BizFileThumbs
                      :file-ids="collabReceiverPrintTask()?.entityWeightPhotoFileIds"
                      mode="image"
                      :max="8"
                      :thumb-size="56"
                    />
                  </NDescriptionsItem>
                  <NDescriptionsItem label="汇总支撑称重照片" :span="3">
                    <BizFileThumbs
                      :file-ids="collabReceiverPrintTask()?.supportWeightPhotoFileIds"
                      mode="image"
                      :max="8"
                      :thumb-size="56"
                    />
                  </NDescriptionsItem>
                </NDescriptions>

                <div v-if="collabPlannedPrintSpecs().length">
                  <div class="subsection-title">发单打印规格</div>
                  <NDataTable
                    size="small"
                    :columns="collabPlannedPrintSpecColumns"
                    :data="collabPlannedPrintSpecs()"
                    :pagination="false"
                  />
                </div>

                <div v-if="collabActualPrintSpecs().length">
                  <div class="subsection-title">实际材料明细</div>
                  <NDataTable
                    size="small"
                    :columns="collabActualPrintSpecColumns"
                    :data="collabActualPrintSpecs()"
                    :scroll-x="1180"
                    :pagination="false"
                  />
                </div>
              </NSpace>
            </NCard>
          </NSpace>
        </NSpin>
      </NDrawerContent>
    </NDrawer>

    <NDrawer v-model:show="showDetailDrawer" width="960" placement="right">
      <NDrawerContent title="账单详情" closable>
        <NSpace v-if="billDetail" vertical :size="16">
          <NCard title="账单信息" size="small">
            <NDescriptions bordered :column="2" size="small">
              <NDescriptionsItem label="账单号">
                {{ billDetail.bill?.billNo || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="客户">
                {{ billDetail.bill?.customerNameSnapshot || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="总金额">
                {{ money(billDetail.bill?.totalAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="未收金额">
                {{ money(billDetail.bill?.unpaidAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="支付状态">
                {{ payStatusLabel(billDetail.bill?.payStatus) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="账单状态">
                {{ billStatusLabel(billDetail.bill?.billStatus) }}
              </NDescriptionsItem>

            </NDescriptions>
          </NCard>

          <NCard title="账单明细" size="small">
            <NEmpty v-if="!billDetail.items?.length" description="暂无明细" />

            <NDataTable
              v-else
              size="small"
              :columns="billItemDetailColumns"
              :data="billDetail.items"
              :scroll-x="1500"
            />
          </NCard>

          <NCard
            v-for="payment in billDetail.payments as PaymentRecordVO[]"
            :key="payment.id"
            size="small"
          >
            <template #header>
              <NSpace justify="space-between" align="center">
                <span>收款单：{{ payment.paymentNo }}</span>

                <NSpace align="center">
                  <NTag :type="paymentStatusTagType(payment.status)">
                    {{ paymentStatusLabel(payment.status) }}
                  </NTag>

                  <NButton
                    v-if="canCancelPayment(payment)"
                    size="small"
                    type="error"
                    @click="openCancelPayment(payment)"
                  >
                    作废收款
                  </NButton>

                  <NButton
                    v-if="canRefundPayment(payment)"
                    size="small"
                    type="warning"
                    @click="openRefundPayment(payment)"
                  >
                    退款
                  </NButton>


                </NSpace>
              </NSpace>
            </template>

            <NDescriptions bordered :column="2" size="small">
              <NDescriptionsItem label="收款金额">
                {{ money(payment.payAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="已核销">
                {{ money(payment.allocatedAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="未使用">
                {{ money(payment.unusedAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="支付方式">
                {{ payment.payMethod || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="支付时间">
                {{ payment.payTime || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="交易流水">
                {{ payment.transactionNo || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="已退款">
                {{ money(payment.refundedAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="退款状态">
                {{ payment.refundStatus || 'NO_REFUND' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="作废时间" v-if="payment.status === 'CANCELLED'">
                {{ payment.cancelTime || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="作废原因" v-if="payment.status === 'CANCELLED'">
                {{ payment.cancelReason || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="凭证">
                <BizFileThumbs
                  :file-ids="payment.proofFileIds"
                  mode="auto"
                  :max="5"
                />
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

        </NSpace>
      </NDrawerContent>
    </NDrawer>

    <NModal v-model:show="showPayModal" preset="card" title="账单收款" style="width: 680px">
      <NForm label-placement="left" label-width="120">
        <NFormItem label="账单号">
          <NInput :value="currentBill?.billNo" disabled />
        </NFormItem>

        <NFormItem label="未收金额">
          <strong>{{ money(currentBill?.unpaidAmount) }}</strong>
        </NFormItem>

        <NFormItem label="收款金额" required>
          <NInputNumber v-model:value="payForm.payAmount" :min="0" style="width: 220px" />
        </NFormItem>

        <NFormItem label="支付方式">
          <NSelect v-model:value="payForm.payMethod" :options="payMethodOptions" />
        </NFormItem>

        <NFormItem label="付款人">
          <NInput v-model:value="payForm.payerName" />
        </NFormItem>

        <NFormItem label="支付凭证">
          <BizFileUpload
            v-model="paymentProofFileIds"
            biz-type="TEMP"
            file-stage="PAYMENT"
            file-type="PAYMENT_PROOF"
            :max="5"
          />
        </NFormItem>

        <NFormItem label="备注">
          <NInput v-model:value="payForm.remark" type="textarea" />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showPayModal = false">取消</NButton>
          <NButton type="primary" @click="submitPay">确认收款</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showPrepayModal" preset="card" title="登记客户预收款" style="width: 680px">
      <NForm label-placement="left" label-width="120">
        <NFormItem label="客户" required>
          <NSelect
            v-model:value="prepayForm.customerId"
            :options="customerOptions"
            filterable
            clearable
          />
        </NFormItem>

        <NFormItem label="预收金额" required>
          <NInputNumber v-model:value="prepayForm.payAmount" :min="0" style="width: 220px" />
        </NFormItem>

        <NFormItem label="支付方式">
          <NSelect v-model:value="prepayForm.payMethod" :options="payMethodOptions" />
        </NFormItem>

        <NFormItem label="付款人">
          <NInput v-model:value="prepayForm.payerName" />
        </NFormItem>

        <NFormItem label="支付凭证">
          <BizFileUpload
            v-model="prepayProofFileIds"
            biz-type="TEMP"
            file-stage="PAYMENT"
            file-type="PAYMENT_PROOF"
            :max="5"
          />
        </NFormItem>

        <NFormItem label="备注">
          <NInput v-model:value="prepayForm.remark" type="textarea" />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showPrepayModal = false">取消</NButton>
          <NButton type="primary" @click="submitPrepay">确认登记</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showBalanceOffsetModal" preset="card" title="预收余额抵扣账单" style="width: 620px">
      <NForm label-placement="left" label-width="130">
        <NFormItem label="账单号">
          <NInput :value="currentBill?.billNo" disabled />
        </NFormItem>

        <NFormItem label="账单未收金额">
          <strong>{{ money(currentBill?.unpaidAmount) }}</strong>
        </NFormItem>

        <NFormItem label="客户预收余额">
          <strong>{{ money(currentAccount?.balanceAmount) }}</strong>
        </NFormItem>

        <NFormItem label="抵扣金额" required>
          <NInputNumber
            v-model:value="balanceOffsetForm.amount"
            :min="0"
            :max="Math.min(Number(currentBill?.unpaidAmount || 0), Number(currentAccount?.balanceAmount || 0))"
            style="width: 220px"
          />
        </NFormItem>

        <NFormItem label="备注">
          <NInput
            v-model:value="balanceOffsetForm.remark"
            type="textarea"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showBalanceOffsetModal = false">取消</NButton>
          <NButton type="primary" @click="submitBalanceOffset">确认抵扣</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal
      v-model:show="showCancelPaymentModal"
      preset="card"
      title="作废收款"
      style="width: 560px"
    >
      <NForm label-placement="left" label-width="110">
        <NFormItem label="收款单号">
          <NInput :value="currentPayment?.paymentNo" disabled />
        </NFormItem>

        <NFormItem label="收款金额">
          <strong>{{ money(currentPayment?.payAmount) }}</strong>
        </NFormItem>

        <NFormItem label="作废原因" required>
          <NInput
            v-model:value="cancelPaymentForm.reason"
            type="textarea"
            placeholder="请输入作废原因"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showCancelPaymentModal = false">取消</NButton>
          <NButton type="error" @click="submitCancelPayment">
            确认作废
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal
      v-model:show="showRefundModal"
      preset="card"
      title="收款退款"
      style="width: 640px"
    >
      <NForm label-placement="left" label-width="120">
        <NFormItem label="收款单号">
          <NInput :value="currentRefundPayment?.paymentNo" disabled />
        </NFormItem>

        <NFormItem label="可退款金额">
          <strong>{{ money(paymentRefundableAmount(currentRefundPayment || {})) }}</strong>
        </NFormItem>

        <NFormItem label="退款金额" required>
          <NInputNumber
            v-model:value="refundForm.refundAmount"
            :min="0"
            :max="paymentRefundableAmount(currentRefundPayment || {})"
            style="width: 220px"
          />
        </NFormItem>

        <NFormItem label="退款方式">
          <NSelect
            v-model:value="refundForm.refundMethod"
            :options="payMethodOptions"
          />
        </NFormItem>

        <NFormItem label="退款接收人">
          <NInput v-model:value="refundForm.receiverName" />
        </NFormItem>

        <NFormItem label="退款流水号">
          <NInput v-model:value="refundForm.transactionNo" />
        </NFormItem>

        <NFormItem label="退款凭证">
          <BizFileUpload
            v-model="refundProofFileIds"
            biz-type="TEMP"
            file-stage="REFUND"
            file-type="REFUND_PROOF"
            :max="5"
          />
        </NFormItem>

        <NFormItem label="退款原因" required>
          <NInput
            v-model:value="refundForm.reason"
            type="textarea"
            placeholder="请输入退款原因"
          />
        </NFormItem>

        <NFormItem label="备注">
          <NInput
            v-model:value="refundForm.remark"
            type="textarea"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showRefundModal = false">取消</NButton>
          <NButton type="warning" @click="submitRefundPayment">
            确认退款
          </NButton>
        </NSpace>
      </template>
    </NModal>


    <CustomerBillPrintDrawer
      v-model:show="showBillPrintDrawer"
      :bill-id="printBillId"
    />


  </NCard>
</template>

<style scoped>
.muted-text {
  color: var(--n-text-color-disabled);
}

.bill-print-spec-line {
  line-height: 1.6;
  white-space: normal;
}

.section-title {
  margin-top: 12px;
  font-size: 16px;
  font-weight: 600;
}

.subsection-title {
  margin-bottom: 8px;
  font-weight: 600;
}
</style>
