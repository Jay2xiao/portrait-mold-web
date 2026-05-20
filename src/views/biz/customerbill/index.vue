<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
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
  NTag,
  useMessage
} from 'naive-ui';

import {
  cancelCustomerBill,
  confirmCustomerBill,
  fetchCustomerBillDetail,
  fetchCustomerBillList,
  type CustomerBillVO
} from '@/service/api/biz/customer-bill';

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
  payStatus: '',
  billStatus: '',
  unpaidOnly: false,
  overdue: false
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

function unwrapRows(res: any) {
  const data = res?.data || res;
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
    fixed: 'left'
  },
  {
    title: '客户',
    key: 'customerNameSnapshot',
    width: 140,
    fixed: 'left'
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
    fixed: 'right',
    render(row: CustomerBillVO) {
      const buttons: any[] = [];

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

async function getList() {
  loading.value = true;
  try {
    const res = await fetchCustomerBillList(queryParams);
    tableData.value = unwrapRows(res);
    total.value = unwrapTotal(res);
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.billNo = '';
  queryParams.customerId = undefined;
  queryParams.payStatus = '';
  queryParams.billStatus = '';
  queryParams.pageNum = 1;
  queryParams.unpaidOnly = false;
  getList();
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
  await loadCustomers();
  applyRouteQuery();
  getList();
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
    </NSpace>

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
              :columns="[
                { title: '订单号', key: 'orderNoSnapshot', width: 170 },
                { title: '费用类型', key: 'itemType', width: 120 },
                { title: '费用名称', key: 'itemName', width: 140 },
                { title: '金额', key: 'amount', width: 100 },
                { title: '已收', key: 'paidAmount', width: 100 },
                { title: '未收', key: 'unpaidAmount', width: 100 },
                { title: '支付状态', key: 'payStatus', width: 120 }
              ]"
              :data="billDetail.items"
              :scroll-x="900"
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
