<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import {
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
  NModal,
  NSelect,
  NSpace,
  NStatistic,
  NTag,
  useMessage
} from 'naive-ui';

import {
  createCustomerSettlementBill,
  fetchCustomerReconciliationDetail,
  fetchCustomerReconciliationList,
  type CustomerReconciliationSummaryVO, exportCustomerStatementExcel
} from '@/service/api/biz/customer-reconciliation';

import CustomerBillPrintDrawer from '@/views/biz/components/CustomerBillPrintDrawer.vue';

import { watch } from 'vue';
import { useRoute } from 'vue-router';
import { routeQueryBoolean } from '@/utils/route-query';

const route = useRoute();


defineOptions({
  name: 'BizCustomerReconciliation'
});

const message = useMessage();

const loading = ref(false);
const tableData = ref<CustomerReconciliationSummaryVO[]>([]);
const total = ref(0);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  customerName: '',
  phone: '',
  settlementType: '',
  onlyDebt: false,
  settlementDueOnly: false,
  unbilledOnly: false,
  overCreditOnly: false,
  periodEndDateValue: Date.now() as number | null
});

const showDetailDrawer = ref(false);
const detailLoading = ref(false);
const detail = ref<any>(null);

const showCreateBillModal = ref(false);
const currentCustomer = ref<CustomerReconciliationSummaryVO | null>(null);

const createBillForm = reactive({
  billType: 'PERIODIC',
  autoConfirm: false,
  periodStartDateValue: null as number | null,
  periodEndDateValue: null as number | null,
  includeBeforeStart: true,
  remark: ''
});


const settlementTypeOptions = [
  { label: '现结', value: 'IMMEDIATE' },
  { label: '周期结算', value: 'PERIODIC' },
  { label: '月结', value: 'MONTHLY' }
];

const yesNoOptions = [
  { label: '否', value: false },
  { label: '是', value: true }
];

const billTypeOptions = [
  { label: '普通账单', value: 'NORMAL' },
  { label: '周期结算账单', value: 'PERIODIC' },
  { label: '月结账单', value: 'MONTHLY' },
  { label: '手工账单', value: 'MANUAL' }
];

const showBillPrintDrawer = ref(false);
const printBillId = ref<string | number | null>(null);


function money(value?: number) {
  return Number(value || 0).toFixed(2);
}

function settlementTypeLabel(value?: string) {
  if (value === 'IMMEDIATE') return '现结';
  if (value === 'PERIODIC') return '周期结算';
  if (value === 'MONTHLY') return '月结';
  return value || '-';
}

function yesNoLabel(value?: string) {
  return value === '1' ? '允许' : '不允许';
}

function itemTypeLabel(value?: string) {
  const map: Record<string, string> = {
    REPAIR_FEE: '修模费',
    PRINT_FEE: '打印费',
    DELIVERY_FEE: '运费',
    OTHER_FEE: '其他费用',
    ADJUSTMENT: '调整项',
    DISCOUNT: '优惠'
  };

  return map[value || ''] || value || '-';
}

function payStatusLabel(value?: string) {
  const map: Record<string, string> = {
    UNPAID: '未支付',
    PARTIAL: '部分支付',
    PAID: '已支付',
    CANCELLED: '已取消'
  };

  return map[value || ''] || value || '-';
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
function formatDateValue(value?: number | null) {
  if (!value) return undefined;

  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}



const columns = [
  {
    title: '客户',
    key: 'customerName',
    width: 150,
    fixed: 'left'
  },
  {
    title: '电话',
    key: 'phone',
    width: 130
  },
  {
    title: '结算方式',
    key: 'settlementType',
    width: 120,
    render(row: CustomerReconciliationSummaryVO) {
      return settlementTypeLabel(row.settlementType);
    }
  },
  {
    title: '欠款发货',
    key: 'allowUnpaidDelivery',
    width: 100,
    render(row: CustomerReconciliationSummaryVO) {
      return yesNoLabel(row.allowUnpaidDelivery);
    }
  },
  {
    title: '预收余额',
    key: 'balanceAmount',
    width: 110,
    render(row: CustomerReconciliationSummaryVO) {
      return money(row.balanceAmount);
    }
  },
  {
    title: '应收总额',
    key: 'receivableAmount',
    width: 110,
    render(row: CustomerReconciliationSummaryVO) {
      return money(row.receivableAmount);
    }
  },
  {
    title: '已收',
    key: 'paidAmount',
    width: 100,
    render(row: CustomerReconciliationSummaryVO) {
      return money(row.paidAmount);
    }
  },
  {
    title: '未收',
    key: 'unpaidAmount',
    width: 100,
    render(row: CustomerReconciliationSummaryVO) {
      return h(
        NTag,
        { type: Number(row.unpaidAmount || 0) > 0 ? 'error' : 'success' },
        { default: () => money(row.unpaidAmount) }
      );
    }
  },
  {
    title: '未入账金额',
    key: 'unbilledAmount',
    width: 120,
    render(row: CustomerReconciliationSummaryVO) {
      return money(row.unbilledAmount);
    }
  },
  {
    title: '未入账项',
    key: 'unbilledItemCount',
    width: 100
  },
  {
    title: '未收账单',
    key: 'unpaidBillAmount',
    width: 120,
    render(row: CustomerReconciliationSummaryVO) {
      return money(row.unpaidBillAmount);
    }
  },
  {
    title: '未收账单数',
    key: 'unpaidBillCount',
    width: 110
  },
  {
    title: '最近收款',
    key: 'latestPayTime',
    width: 170
  },
  {
    title: '最近发货',
    key: 'latestDeliveryTime',
    width: 170
  },
  {
    title: '上次结算',
    key: 'lastSettlementDate',
    width: 120
  },
  {
    title: '下次结算',
    key: 'nextSettlementDate',
    width: 120
  },
  {
    title: '本期开始',
    key: 'currentPeriodStartDate',
    width: 120
  },
  {
    title: '本期结束',
    key: 'currentPeriodEndDate',
    width: 120
  },
  {
    title: '本期金额',
    key: 'currentPeriodAmount',
    width: 110,
    render(row: CustomerReconciliationSummaryVO) {
      return money(row.currentPeriodAmount);
    }
  },
  {
    title: '本期项目',
    key: 'currentPeriodItemCount',
    width: 100
  },
  {
    title: '待结算',
    key: 'settlementDue',
    width: 100,
    render(row: CustomerReconciliationSummaryVO) {
      return h(
        NTag,
        { type: row.settlementDue ? 'warning' : 'default' },
        { default: () => row.settlementDue ? '是' : '否' }
      );
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 230,
    fixed: 'right',
    render(row: CustomerReconciliationSummaryVO) {
      return h(NSpace, {}, {
        default: () => [
          h(
            NButton,
            {
              size: 'small',
              onClick: () => openDetail(row)
            },
            { default: () => '查看对账' }
          ),
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              disabled: Number(row.unbilledAmount || 0) <= 0,
              onClick: () => openCreateBill(row)
            },
            { default: () => '生成账单' }
          )
        ]
      });
    }
  }
];

const unpaidBillColumns = [
  {
    title: '账单号',
    key: 'billNo',
    width: 180
  },
  {
    title: '账单类型',
    key: 'billType',
    width: 120
  },
  {
    title: '结算周期',
    key: 'settlementPeriod',
    width: 220,
    render(row: any) {
      const start = row.settlementStartDate || '-';
      const end = row.settlementEndDate || '-';
      return `${start} 至 ${end}`;
    }
  },
  {
    title: '总金额',
    key: 'totalAmount',
    width: 100,
    render(row: any) {
      return money(row.totalAmount);
    }
  },
  {
    title: '已收',
    key: 'paidAmount',
    width: 100,
    render(row: any) {
      return money(row.paidAmount);
    }
  },
  {
    title: '未收',
    key: 'unpaidAmount',
    width: 100,
    render(row: any) {
      return money(row.unpaidAmount);
    }
  },
  {
    title: '支付状态',
    key: 'payStatus',
    width: 120,
    render(row: any) {
      return payStatusLabel(row.payStatus);
    }
  },
  {
    title: '账单状态',
    key: 'billStatus',
    width: 120
  },
  {
    title: '创建时间',
    key: 'createTime',
    width: 170
  },
  {
    title: '操作',
    key: 'actions',
    width: 190,
    fixed: 'right',
    render(row: any) {
      return h(
        NSpace,
        {},
        {
          default: () => [
            h(
              NButton,
              {
                size: 'small',
                onClick: () => exportBillExcel(row)
              },
              { default: () => '导出Excel' }
            ),
            h(
              NButton,
              {
                size: 'small',
                type: 'info',
                onClick: () => printBillPdf(row)
              },
              { default: () => '打印PDF' }
            )
          ]
        }
      );
    }
  }
];
async function getList() {
  loading.value = true;

  try {
    const res = await fetchCustomerReconciliationList({
      ...queryParams,
      periodEndDate: formatDateValue(queryParams.periodEndDateValue)
    });

    tableData.value = unwrapRows(res);
    total.value = unwrapTotal(res);
  } finally {
    loading.value = false;
  }
}


function resetQuery() {
  queryParams.customerName = '';
  queryParams.phone = '';
  queryParams.settlementType = '';
  queryParams.onlyDebt = false;
  queryParams.pageNum = 1;
  getList();
}

async function openDetail(row: CustomerReconciliationSummaryVO) {
  if (!row.customerId) return;

  currentCustomer.value = row;
  showDetailDrawer.value = true;
  detailLoading.value = true;

  try {
    const res = await fetchCustomerReconciliationDetail(row.customerId);
    detail.value = unwrapData(res);
  } finally {
    detailLoading.value = false;
  }
}

function parseDateToValue(dateStr?: string) {
  if (!dateStr) return null;
  return new Date(dateStr).getTime();
}

function openCreateBill(row: CustomerReconciliationSummaryVO) {
  if (!row.customerId) return;

  if (Number(row.currentPeriodAmount || row.unbilledAmount || 0) <= 0) {
    message.warning('该客户暂无可结算应收项目');
    return;
  }

  currentCustomer.value = row;

  createBillForm.billType =
    row.settlementType === 'MONTHLY'
      ? 'MONTHLY'
      : row.settlementType === 'PERIODIC'
        ? 'PERIODIC'
        : 'NORMAL';

  createBillForm.autoConfirm = false;
  createBillForm.periodStartDateValue = parseDateToValue(row.currentPeriodStartDate);
  createBillForm.periodEndDateValue = parseDateToValue(row.currentPeriodEndDate);
  createBillForm.includeBeforeStart = true;
  createBillForm.remark = '客户对账中心生成本期结算账单';

  showCreateBillModal.value = true;
}


async function refreshDetail() {
  if (!currentCustomer.value?.customerId) return;

  const res = await fetchCustomerReconciliationDetail(currentCustomer.value.customerId);
  detail.value = unwrapData(res);
}

async function submitCreateBill() {
  if (!currentCustomer.value?.customerId) return;

  await createCustomerSettlementBill({
    customerId: currentCustomer.value.customerId,
    billType: createBillForm.billType,
    autoConfirm: createBillForm.autoConfirm,
    periodStartDate: formatDateValue(createBillForm.periodStartDateValue),
    periodEndDate: formatDateValue(createBillForm.periodEndDateValue),
    includeBeforeStart: createBillForm.includeBeforeStart,
    remark: createBillForm.remark
  });

  message.success('本期结算账单生成成功');
  showCreateBillModal.value = false;

  await getList();

  if (showDetailDrawer.value) {
    await refreshDetail();
  }
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

async function exportBillExcel(row: any) {
  if (!row?.id) {
    message.warning('账单ID为空');
    return;
  }

  const res = await exportCustomerStatementExcel(row.id);
  const blob = getBlobFromResponse(res);

  downloadBlob(blob, `客户对账单-${row.billNo || row.id}.xlsx`);
}

function printBillPdf(row: any) {
  if (!row?.id) {
    message.warning('账单ID为空');
    return;
  }

  printBillId.value = row.id;
  showBillPrintDrawer.value = true;
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

  if ('onlyDebt' in q) {
    queryParams.onlyDebt = routeQueryBoolean(q.onlyDebt);
  }

  if ('settlementDueOnly' in q) {
    queryParams.settlementDueOnly = routeQueryBoolean(q.settlementDueOnly);
  }

  if ('unbilledOnly' in q) {
    queryParams.unbilledOnly = routeQueryBoolean(q.unbilledOnly);
  }

  if ('overCreditOnly' in q) {
    queryParams.overCreditOnly = routeQueryBoolean(q.overCreditOnly);
  }

  queryParams.pageNum = 1;
}


onMounted(() => {
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
  <NCard title="客户对账中心" :bordered="false">
    <NSpace vertical :size="16">
      <NForm inline label-placement="left">
        <NFormItem label="客户">
          <NInput v-model:value="queryParams.customerName" clearable placeholder="客户名称" />
        </NFormItem>

        <NFormItem label="电话">
          <NInput v-model:value="queryParams.phone" clearable placeholder="手机号" />
        </NFormItem>

        <NFormItem label="结算方式">
          <NSelect
            v-model:value="queryParams.settlementType"
            :options="settlementTypeOptions"
            clearable
            style="width: 140px"
          />
        </NFormItem>

        <NFormItem label="只看欠款">
          <NSelect
            v-model:value="queryParams.onlyDebt"
            :options="yesNoOptions"
            style="width: 100px"
          />
        </NFormItem>

        <NFormItem label="待结算">
          <NSelect
            v-model:value="queryParams.settlementDueOnly"
            :options="yesNoOptions"
            style="width: 100px"
          />
        </NFormItem>

        <NFormItem label="截止日期">
          <NDatePicker
            v-model:value="queryParams.periodEndDateValue"
            type="date"
            clearable
            style="width: 160px"
          />
        </NFormItem>

        <NFormItem>
          <NSpace>
            <NButton type="primary" @click="getList">查询</NButton>
            <NButton @click="resetQuery">重置</NButton>
          </NSpace>
        </NFormItem>
      </NForm>

      <NDataTable
        remote
        size="small"
        :loading="loading"
        :columns="columns"
        :data="tableData"
        :scroll-x="1900"
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

    <NDrawer v-model:show="showDetailDrawer" width="1080" placement="right">
      <NDrawerContent title="客户对账详情" closable>
        <NSpace v-if="detail" vertical :size="16">
          <NCard title="账务汇总" size="small">
            <NSpace>
              <NStatistic label="预收余额" :value="money(detail.summary?.balanceAmount)" />
              <NStatistic label="应收总额" :value="money(detail.summary?.receivableAmount)" />
              <NStatistic label="已收" :value="money(detail.summary?.paidAmount)" />
              <NStatistic label="未收" :value="money(detail.summary?.unpaidAmount)" />
              <NStatistic label="未入账金额" :value="money(detail.summary?.unbilledAmount)" />
              <NStatistic label="未收账单金额" :value="money(detail.summary?.unpaidBillAmount)" />
            </NSpace>
          </NCard>

          <NCard title="客户信息" size="small">
            <NDescriptions bordered :column="2" size="small">
              <NDescriptionsItem label="客户">
                {{ detail.customer?.customerName || detail.summary?.customerName || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="电话">
                {{ detail.customer?.phone || detail.summary?.phone || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="结算方式">
                {{ settlementTypeLabel(detail.summary?.settlementType) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="欠款发货">
                {{ yesNoLabel(detail.summary?.allowUnpaidDelivery) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="结算周期">
                {{ detail.summary?.settlementCycleDays || '-' }} 天
              </NDescriptionsItem>

              <NDescriptionsItem label="授信额度">
                {{ money(detail.summary?.creditLimit) }}
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <NCard title="未入账应收项目" size="small">
            <template #header-extra>
              <NButton
                size="small"
                type="primary"
                :disabled="!detail.unbilledReceivableItems?.length"
                @click="openCreateBill(currentCustomer!)"
              >
                生成结算账单
              </NButton>
            </template>

            <NEmpty v-if="!detail.unbilledReceivableItems?.length" description="暂无未入账应收" />

            <NDataTable
              v-else
              size="small"
              :columns="[
                { title: '订单号', key: 'orderNoSnapshot', width: 170 },
                { title: '费用类型', key: 'itemType', width: 120, render: row => itemTypeLabel(row.itemType) },
                { title: '费用名称', key: 'itemName', width: 140 },
                { title: '金额', key: 'amount', width: 100, render: row => money(row.amount) },
                { title: '已收', key: 'paidAmount', width: 100, render: row => money(row.paidAmount) },
                { title: '未收', key: 'unpaidAmount', width: 100, render: row => money(row.unpaidAmount) },
                { title: '创建时间', key: 'createTime', width: 170 },
                { title: '备注', key: 'remark', width: 220, ellipsis: { tooltip: true } }
              ]"
              :data="detail.unbilledReceivableItems"
              :scroll-x="1100"
            />
          </NCard>

          <NCard title="未收账单" size="small">
            <NEmpty v-if="!detail.unpaidBills?.length" description="暂无未收账单" />


            <NDataTable
              v-else
              size="small"
              :columns="unpaidBillColumns"
              :data="detail.unpaidBills"
              :scroll-x="1400"
            />
          </NCard>

          <NCard title="最近收款记录" size="small">
            <NEmpty v-if="!detail.payments?.length" description="暂无收款记录" />

            <NDataTable
              v-else
              size="small"
              :columns="[
                { title: '收款单号', key: 'paymentNo', width: 180 },
                { title: '类型', key: 'paymentType', width: 140 },
                { title: '金额', key: 'payAmount', width: 100, render: row => money(row.payAmount) },
                { title: '已核销', key: 'allocatedAmount', width: 100, render: row => money(row.allocatedAmount) },
                { title: '已退款', key: 'refundedAmount', width: 100, render: row => money(row.refundedAmount) },
                { title: '状态', key: 'status', width: 100 },
                { title: '支付时间', key: 'payTime', width: 170 }
              ]"
              :data="detail.payments"
              :scroll-x="1100"
            />
          </NCard>

          <NCard title="最近退款记录" size="small">
            <NEmpty v-if="!detail.refunds?.length" description="暂无退款记录" />

            <NDataTable
              v-else
              size="small"
              :columns="[
                { title: '退款单号', key: 'refundNo', width: 180 },
                { title: '退款类型', key: 'refundType', width: 150 },
                { title: '金额', key: 'refundAmount', width: 100, render: row => money(row.refundAmount) },
                { title: '方式', key: 'refundMethod', width: 100 },
                { title: '原因', key: 'reason', width: 260, ellipsis: { tooltip: true } },
                { title: '退款时间', key: 'refundTime', width: 170 }
              ]"
              :data="detail.refunds"
              :scroll-x="1100"
            />
          </NCard>

          <NCard title="客户账户流水" size="small">
            <NEmpty v-if="!detail.accountLedgers?.length" description="暂无账户流水" />

            <NDataTable
              v-else
              size="small"
              :columns="[
                { title: '变动类型', key: 'changeType', width: 130 },
                { title: '变动金额', key: 'changeAmount', width: 120, render: row => money(row.changeAmount) },
                { title: '变动前', key: 'beforeBalance', width: 120, render: row => money(row.beforeBalance) },
                { title: '变动后', key: 'afterBalance', width: 120, render: row => money(row.afterBalance) },
                { title: '来源编号', key: 'sourceNo', width: 170 },
                { title: '备注', key: 'remark', width: 260, ellipsis: { tooltip: true } },
                { title: '时间', key: 'createTime', width: 170 }
              ]"
              :data="detail.accountLedgers"
              :scroll-x="1200"
            />
          </NCard>

          <NCard title="近期订单" size="small">
            <NEmpty v-if="!detail.recentOrders?.length" description="暂无订单" />

            <NDataTable
              v-else
              size="small"
              :columns="[
                { title: '订单号', key: 'orderNo', width: 170 },
                { title: '订单类型', key: 'orderType', width: 120 },
                { title: '业务状态', key: 'businessStatus', width: 140 },
                { title: '总应收', key: 'receivableAmount', width: 100, render: row => money(row.receivableAmount) },
                { title: '已收', key: 'paidAmount', width: 100, render: row => money(row.paidAmount) },
                { title: '未收', key: 'unpaidAmount', width: 100, render: row => money(row.unpaidAmount) },
                { title: '支付状态', key: 'payStatus', width: 120 }
              ]"
              :data="detail.recentOrders"
              :scroll-x="1100"
            />
          </NCard>
        </NSpace>
      </NDrawerContent>
    </NDrawer>

    <NModal
      v-model:show="showCreateBillModal"
      preset="card"
      title="生成客户结算账单"
      style="width: 620px"
    >
      <NForm label-placement="left" label-width="120">
        <NFormItem label="客户">
          <NInput :value="currentCustomer?.customerName" disabled />
        </NFormItem>

        <NFormItem label="未入账金额">
          <strong>{{ money(currentCustomer?.unbilledAmount) }}</strong>
        </NFormItem>

        <NFormItem label="账单类型">
          <NSelect v-model:value="createBillForm.billType" :options="billTypeOptions" />
        </NFormItem>

        <NFormItem label="自动确认">
          <NSelect v-model:value="createBillForm.autoConfirm" :options="yesNoOptions" />
        </NFormItem>

        <NFormItem label="备注">
          <NInput v-model:value="createBillForm.remark" type="textarea" />
        </NFormItem>

        <NFormItem label="本期开始">
          <NDatePicker
            v-model:value="createBillForm.periodStartDateValue"
            type="date"
            clearable
            style="width: 220px"
          />
        </NFormItem>

        <NFormItem label="本期结束">
          <NDatePicker
            v-model:value="createBillForm.periodEndDateValue"
            type="date"
            clearable
            style="width: 220px"
          />
        </NFormItem>

        <NFormItem label="包含历史未入账">
          <NSelect
            v-model:value="createBillForm.includeBeforeStart"
            :options="yesNoOptions"
            style="width: 120px"
          />
        </NFormItem>

      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showCreateBillModal = false">取消</NButton>
          <NButton type="primary" @click="submitCreateBill">确认生成</NButton>
        </NSpace>
      </template>
    </NModal>

    <CustomerBillPrintDrawer
      v-model:show="showBillPrintDrawer"
      :bill-id="printBillId"
    />

  </NCard>
</template>
