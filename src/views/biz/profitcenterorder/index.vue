<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NDescriptions,
  NDescriptionsItem,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NSpace,
  NTag,
  useMessage
} from 'naive-ui';

import {
  fetchOrderProfitDetail,
  fetchOrderProfitPage,
  refreshOrderProfitSnapshot,
  type OrderProfitSnapshotVO
} from '@/service/api/biz/profit-center';

defineOptions({
  name: 'BizOrderProfitList'
});

import { watch } from 'vue';
import { useRoute } from 'vue-router';
import { routeQueryBoolean } from '@/utils/route-query';

const route = useRoute();

const message = useMessage();

const loading = ref(false);
const tableData = ref<OrderProfitSnapshotVO[]>([]);
const total = ref(0);

const detailLoading = ref(false);
const showDetailDrawer = ref(false);
const detail = ref<any>(null);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  startDateValue: null as number | null,
  endDateValue: Date.now() as number | null,
  orderNo: '',
  customerName: '',
  orderType: '',
  onlyLoss: null as BooleanSelectValue
});

const orderTypeOptions = [
  { label: '只修模', value: 'REPAIR_ONLY' },
  { label: '只打印', value: 'PRINT_ONLY' },
  { label: '修模+打印', value: 'REPAIR_PRINT' }
];

type BooleanSelectValue = 'true' | 'false' | null;

const yesNoOptions = [
  { label: '是', value: 'true' },
  { label: '否', value: 'false' }
];

function routeQueryBooleanSelect(value: unknown): BooleanSelectValue {
  if (Array.isArray(value)) {
    value = value[0];
  }

  if (value === 'true' || value === true) return 'true';
  if (value === 'false' || value === false) return 'false';
  return null;
}

function selectValueToBoolean(value: BooleanSelectValue) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}


function money(value?: number) {
  return Number(value || 0).toFixed(2);
}

function percent(value?: number) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

function formatDateValue(value?: number | null) {
  if (!value) return undefined;

  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
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

function profitTagType(value?: number) {
  return Number(value || 0) >= 0 ? 'success' : 'error';
}

const columns = [
  {
    title: '订单号',
    key: 'orderNoSnapshot',
    width: 170,
    fixed: 'left' as const
  },
  {
    title: '客户',
    key: 'customerNameSnapshot',
    width: 150,
    fixed: 'left' as const
  },
  {
    title: '订单类型',
    key: 'orderType',
    width: 120
  },
  {
    title: '订单时间',
    key: 'orderCreateTime',
    width: 170
  },
  {
    title: '应收',
    key: 'receivableAmount',
    width: 110,
    render(row: OrderProfitSnapshotVO) {
      return money(row.receivableAmount);
    }
  },
  {
    title: '已收',
    key: 'paidAmount',
    width: 110,
    render(row: OrderProfitSnapshotVO) {
      return money(row.paidAmount);
    }
  },
  {
    title: '未收',
    key: 'unpaidAmount',
    width: 110,
    render(row: OrderProfitSnapshotVO) {
      return money(row.unpaidAmount);
    }
  },
  {
    title: '总成本',
    key: 'totalCostAmount',
    width: 110,
    render(row: OrderProfitSnapshotVO) {
      return money(row.totalCostAmount);
    }
  },
  {
    title: '应收利润',
    key: 'grossProfitAmount',
    width: 120,
    render(row: OrderProfitSnapshotVO) {
      return h(
        NTag,
        { type: profitTagType(row.grossProfitAmount) as any },
        { default: () => money(row.grossProfitAmount) }
      );
    }
  },
  {
    title: '实收利润',
    key: 'paidProfitAmount',
    width: 120,
    render(row: OrderProfitSnapshotVO) {
      return h(
        NTag,
        { type: profitTagType(row.paidProfitAmount) as any },
        { default: () => money(row.paidProfitAmount) }
      );
    }
  },
  {
    title: '利润率',
    key: 'grossProfitRate',
    width: 100,
    render(row: OrderProfitSnapshotVO) {
      return percent(row.grossProfitRate);
    }
  },
  {
    title: '修模师',
    key: 'repairUserName',
    width: 120
  },
  {
    title: '打印员',
    key: 'printUserName',
    width: 120
  },
  {
    title: '跟单员',
    key: 'followUserName',
    width: 120
  },
  {
    title: '快照时间',
    key: 'snapshotTime',
    width: 170
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    fixed: 'right' as const,
    render(row: OrderProfitSnapshotVO) {
      return h(NSpace, {}, {
        default: () => [
          h(
            NButton,
            {
              size: 'small',
              onClick: () => openDetail(row)
            },
            { default: () => '详情' }
          ),
          h(
            NButton,
            {
              size: 'small',
              type: 'warning',
              onClick: () => refreshOne(row)
            },
            { default: () => '刷新' }
          )
        ]
      });
    }
  }
];

async function getList() {
  loading.value = true;

  try {
    const res = await fetchOrderProfitPage({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      startDate: formatDateValue(queryParams.startDateValue),
      endDate: formatDateValue(queryParams.endDateValue),
      orderNo: queryParams.orderNo,
      customerName: queryParams.customerName,
      orderType: queryParams.orderType,
      onlyLoss: selectValueToBoolean(queryParams.onlyLoss)
    });

    tableData.value = unwrapRows(res);
    total.value = unwrapTotal(res);
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.startDateValue = null;
  queryParams.endDateValue = Date.now();
  queryParams.orderNo = '';
  queryParams.customerName = '';
  queryParams.orderType = '';
  queryParams.onlyLoss = null as BooleanSelectValue;
  queryParams.pageNum = 1;
  getList();
}

async function refreshOne(row: OrderProfitSnapshotVO) {
  if (!row.orderId) return;

  await refreshOrderProfitSnapshot(row.orderId);
  message.success('利润快照已刷新');
  getList();
}

async function openDetail(row: OrderProfitSnapshotVO) {
  if (!row.orderId) return;

  showDetailDrawer.value = true;
  detailLoading.value = true;
  detail.value = null;

  try {
    const res = await fetchOrderProfitDetail(row.orderId);
    detail.value = unwrapData(res);
  } finally {
    detailLoading.value = false;
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

function applyRouteQuery() {
  const q = route.query;

  if ('onlyLoss' in q) {
    queryParams.onlyLoss = routeQueryBooleanSelect(q.onlyLoss);
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
  <NCard title="订单利润明细" :bordered="false">
    <NSpace vertical :size="16">
      <NForm inline label-placement="left">
        <NFormItem label="开始日期">
          <NDatePicker
            v-model:value="queryParams.startDateValue"
            type="date"
            clearable
            style="width: 150px"
          />
        </NFormItem>

        <NFormItem label="结束日期">
          <NDatePicker
            v-model:value="queryParams.endDateValue"
            type="date"
            clearable
            style="width: 150px"
          />
        </NFormItem>

        <NFormItem label="订单号">
          <NInput v-model:value="queryParams.orderNo" clearable placeholder="订单号" />
        </NFormItem>

        <NFormItem label="客户">
          <NInput v-model:value="queryParams.customerName" clearable placeholder="客户名称" />
        </NFormItem>

        <NFormItem label="订单类型">
          <NSelect
            v-model:value="queryParams.orderType"
            :options="orderTypeOptions"
            clearable
            style="width: 130px"
          />
        </NFormItem>

        <NFormItem label="只看亏损">
          <NSelect
            v-model:value="queryParams.onlyLoss"
            :options="yesNoOptions"
            style="width: 100px"
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
        :scroll-x="2100"
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
      <NDrawerContent title="订单利润详情" closable>
        <NSpace v-if="detail" vertical :size="16">
          <NCard title="利润汇总" size="small">
            <NDescriptions bordered :column="3" size="small">
              <NDescriptionsItem label="订单号">
                {{ detail.snapshot?.orderNoSnapshot || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="客户">
                {{ detail.snapshot?.customerNameSnapshot || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="订单类型">
                {{ detail.snapshot?.orderType || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="应收金额">
                {{ money(detail.snapshot?.receivableAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="已收金额">
                {{ money(detail.snapshot?.paidAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="未收金额">
                {{ money(detail.snapshot?.unpaidAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="总成本">
                {{ money(detail.snapshot?.totalCostAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="应收利润">
                {{ money(detail.snapshot?.grossProfitAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="利润率">
                {{ percent(detail.snapshot?.grossProfitRate) }}
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <NCard title="收入构成" size="small">
            <NDescriptions bordered :column="3" size="small">
              <NDescriptionsItem label="修模收入">
                {{ money(detail.snapshot?.repairRevenueAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="打印收入">
                {{ money(detail.snapshot?.printRevenueAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="其他收入">
                {{ money(detail.snapshot?.otherRevenueAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="退款金额">
                {{ money(detail.snapshot?.refundAmount) }}
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <NCard title="成本构成" size="small">
            <NDescriptions bordered :column="3" size="small">
              <NDescriptionsItem label="修模成本">
                {{ money(detail.snapshot?.repairCostAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="打印材料成本">
                {{ money(detail.snapshot?.printMaterialCostAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="打印员业绩">
                {{ money(detail.snapshot?.printPerformanceAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="打印其他成本">
                {{ money(detail.snapshot?.printOtherCostAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="跟单业绩">
                {{ money(detail.snapshot?.followPerformanceAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="运费成本">
                {{ money(detail.snapshot?.deliveryCostAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="其他成本">
                {{ money(detail.snapshot?.otherCostAmount) }}
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <NCard title="应收项目" size="small">
            <NDataTable
              size="small"
              :data="detail.receivableItems || []"
              :pagination="false"
              :columns="[
                { title: '费用类型', key: 'itemType', width: 120 },
                { title: '费用名称', key: 'itemName', width: 140 },
                { title: '金额', key: 'amount', width: 100, render: row => money(row.amount) },
                { title: '已收', key: 'paidAmount', width: 100, render: row => money(row.paidAmount) },
                { title: '未收', key: 'unpaidAmount', width: 100, render: row => money(row.unpaidAmount) },
                { title: '支付状态', key: 'payStatus', width: 120 },
                { title: '入账状态', key: 'billStatus', width: 120 }
              ]"
              :scroll-x="900"
            />
          </NCard>

          <NCard title="收款记录" size="small">
            <NDataTable
              size="small"
              :data="detail.payments || []"
              :pagination="false"
              :columns="[
                { title: '收款单号', key: 'paymentNo', width: 180 },
                { title: '类型', key: 'paymentType', width: 130 },
                { title: '金额', key: 'payAmount', width: 100, render: row => money(row.payAmount) },
                { title: '已核销', key: 'allocatedAmount', width: 100, render: row => money(row.allocatedAmount) },
                { title: '已退款', key: 'refundedAmount', width: 100, render: row => money(row.refundedAmount) },
                { title: '状态', key: 'status', width: 100 },
                { title: '支付时间', key: 'payTime', width: 170 }
              ]"
              :scroll-x="1000"
            />
          </NCard>

          <NCard title="退款记录" size="small">
            <NDataTable
              size="small"
              :data="detail.refunds || []"
              :pagination="false"
              :columns="[
                { title: '退款单号', key: 'refundNo', width: 180 },
                { title: '类型', key: 'refundType', width: 140 },
                { title: '金额', key: 'refundAmount', width: 100, render: row => money(row.refundAmount) },
                { title: '原因', key: 'reason', width: 260, ellipsis: { tooltip: true } },
                { title: '退款时间', key: 'refundTime', width: 170 }
              ]"
              :scroll-x="900"
            />
          </NCard>
        </NSpace>
      </NDrawerContent>
    </NDrawer>
  </NCard>
</template>
