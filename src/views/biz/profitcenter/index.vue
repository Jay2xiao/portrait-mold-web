<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NForm,
  NFormItem,
  NGrid,
  NGi,
  NSpace,
  NStatistic,
  NTag,
  useMessage
} from 'naive-ui';

import {
  fetchProfitDashboard,
  refreshAllProfitSnapshot,
  type CustomerProfitRankVO,
  type ProfitDashboardVO,
  type StaffPerformanceVO
} from '@/service/api/biz/profit-center';

defineOptions({
  name: 'BizProfitCenter'
});

const message = useMessage();

const loading = ref(false);
const refreshing = ref(false);
const dashboard = ref<ProfitDashboardVO>({});

const queryParams = reactive({
  startDateValue: null as number | null,
  endDateValue: Date.now() as number | null
});

function money(value?: number) {
  return Number(value || 0).toFixed(2);
}

function percent(value?: number) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

function numberValue(value?: number) {
  return Number(value || 0);
}

function formatDateValue(value?: number | null) {
  if (!value) return undefined;

  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function unwrapData(res: any) {
  return res?.data || res;
}

const staffColumns = [
  {
    title: '人员',
    key: 'userName',
    width: 140,
    render(row: StaffPerformanceVO) {
      return row.userName || `用户 ${row.userId || '-'}`;
    }
  },
  {
    title: '订单数',
    key: 'orderCount',
    width: 90
  },
  {
    title: '业绩金额',
    key: 'performanceAmount',
    width: 120,
    render(row: StaffPerformanceVO) {
      return h(
        NTag,
        { type: Number(row.performanceAmount || 0) > 0 ? 'success' : 'default' },
        { default: () => money(row.performanceAmount) }
      );
    }
  },
  {
    title: '关联应收',
    key: 'relatedReceivableAmount',
    width: 120,
    render(row: StaffPerformanceVO) {
      return money(row.relatedReceivableAmount);
    }
  },
  {
    title: '关联利润',
    key: 'relatedProfitAmount',
    width: 120,
    render(row: StaffPerformanceVO) {
      return money(row.relatedProfitAmount);
    }
  }
];

const customerProfitColumns = [
  {
    title: '排名',
    key: 'rank',
    width: 70,
    render(_: CustomerProfitRankVO, index: number) {
      return index + 1;
    }
  },
  {
    title: '客户',
    key: 'customerName',
    width: 160
  },
  {
    title: '订单数',
    key: 'orderCount',
    width: 90
  },
  {
    title: '应收金额',
    key: 'receivableAmount',
    width: 120,
    render(row: CustomerProfitRankVO) {
      return money(row.receivableAmount);
    }
  },
  {
    title: '已收金额',
    key: 'paidAmount',
    width: 120,
    render(row: CustomerProfitRankVO) {
      return money(row.paidAmount);
    }
  },
  {
    title: '总成本',
    key: 'totalCostAmount',
    width: 120,
    render(row: CustomerProfitRankVO) {
      return money(row.totalCostAmount);
    }
  },
  {
    title: '利润',
    key: 'grossProfitAmount',
    width: 120,
    render(row: CustomerProfitRankVO) {
      const value = Number(row.grossProfitAmount || 0);
      return h(
        NTag,
        { type: value >= 0 ? 'success' : 'error' },
        { default: () => money(value) }
      );
    }
  },
  {
    title: '利润率',
    key: 'grossProfitRate',
    width: 100,
    render(row: CustomerProfitRankVO) {
      return percent(row.grossProfitRate);
    }
  }
];

async function getDashboard() {
  loading.value = true;

  try {
    const res = await fetchProfitDashboard({
      startDate: formatDateValue(queryParams.startDateValue),
      endDate: formatDateValue(queryParams.endDateValue)
    });

    dashboard.value = unwrapData(res) || {};
  } catch (error: any) {
    message.error(error?.message || '业绩与利润中心加载失败');
  } finally {
    loading.value = false;
  }
}

async function handleRefreshAll() {
  refreshing.value = true;

  try {
    await refreshAllProfitSnapshot();
    message.success('利润快照刷新成功');
    await getDashboard();
  } finally {
    refreshing.value = false;
  }
}

onMounted(() => {
  getDashboard();
});
</script>

<template>
  <NSpace vertical :size="16">
    <NCard title="业绩与利润中心" :bordered="false">
      <NSpace justify="space-between" align="center">
        <NForm inline label-placement="left">
          <NFormItem label="开始日期">
            <NDatePicker
              v-model:value="queryParams.startDateValue"
              type="date"
              clearable
              style="width: 160px"
            />
          </NFormItem>

          <NFormItem label="结束日期">
            <NDatePicker
              v-model:value="queryParams.endDateValue"
              type="date"
              clearable
              style="width: 160px"
            />
          </NFormItem>

          <NFormItem>
            <NSpace>
              <NButton type="primary" :loading="loading" @click="getDashboard">
                查询
              </NButton>

              <NButton type="warning" :loading="refreshing" @click="handleRefreshAll">
                刷新利润快照
              </NButton>
            </NSpace>
          </NFormItem>
        </NForm>
      </NSpace>
    </NCard>

    <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen">
      <NGi>
        <NCard title="订单数" :bordered="false">
          <NStatistic :value="numberValue(dashboard.summary?.orderCount)" />
        </NCard>
      </NGi>

      <NGi>
        <NCard title="应收金额" :bordered="false">
          <NStatistic :value="money(dashboard.summary?.receivableAmount)" />
          <div class="sub-text">已收：{{ money(dashboard.summary?.paidAmount) }}</div>
        </NCard>
      </NGi>

      <NGi>
        <NCard title="总成本" :bordered="false">
          <NStatistic :value="money(dashboard.summary?.totalCostAmount)" />
          <div class="sub-text">退款：{{ money(dashboard.summary?.refundAmount) }}</div>
        </NCard>
      </NGi>

      <NGi>
        <NCard title="应收利润" :bordered="false">
          <NStatistic :value="money(dashboard.summary?.grossProfitAmount)" />
          <div class="sub-text">
            利润率：{{ percent(dashboard.summary?.grossProfitRate) }}
          </div>
        </NCard>
      </NGi>
    </NGrid>

    <NGrid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
      <NGi>
        <NCard title="修模师业绩 Top 10" :bordered="false">
          <NDataTable
            size="small"
            :loading="loading"
            :columns="staffColumns"
            :data="dashboard.repairPerformances || []"
            :pagination="false"
          />
        </NCard>
      </NGi>

      <NGi>
        <NCard title="打印员业绩 Top 10" :bordered="false">
          <NDataTable
            size="small"
            :loading="loading"
            :columns="staffColumns"
            :data="dashboard.printPerformances || []"
            :pagination="false"
          />
        </NCard>
      </NGi>
    </NGrid>

    <NGrid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
      <NGi>
        <NCard title="跟单员业绩 Top 10" :bordered="false">
          <NDataTable
            size="small"
            :loading="loading"
            :columns="staffColumns"
            :data="dashboard.followPerformances || []"
            :pagination="false"
          />
        </NCard>
      </NGi>

      <NGi>
        <NCard title="客户利润排行 Top 10" :bordered="false">
          <NDataTable
            size="small"
            :loading="loading"
            :columns="customerProfitColumns"
            :data="dashboard.customerProfitRanks || []"
            :pagination="false"
            :scroll-x="900"
          />
        </NCard>
      </NGi>
    </NGrid>
  </NSpace>
</template>

<style scoped>
.sub-text {
  margin-top: 8px;
  color: #888;
  font-size: 13px;
}
</style>
