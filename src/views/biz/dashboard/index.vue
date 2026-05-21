<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NGrid,
  NGi,
  NSelect,
  NSpace,
  NStatistic,
  NTag,
  useMessage
} from 'naive-ui';
import {
  fetchBusinessDashboard,
  type BusinessDashboardVO,
  type DashboardCustomerDebtRankVO,
  type DashboardDailyTrendVO,
  type DashboardStatusCountVO
} from '@/service/api/biz/dashboard';

defineOptions({
  name: 'BizBusinessDashboard'
});

const message = useMessage();

const loading = ref(false);
const dashboard = ref<BusinessDashboardVO>({});

const queryParams = reactive({
  days: 7
});

const dayOptions = [
  { label: '最近 7 天', value: 7 },
  { label: '最近 15 天', value: 15 },
  { label: '最近 30 天', value: 30 },
  { label: '最近 90 天', value: 90 }
];

function money(value?: number) {
  return Number(value || 0).toFixed(2);
}

function numberValue(value?: number) {
  return Number(value || 0);
}

function unwrapData(res: any) {
  return res?.data || res;
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

function orderStatusLabel(value?: string) {
  const map: Record<string, string> = {
    WAIT_MODEL_UPLOAD: '待上传模型',
    WAIT_REPAIR_CLAIM: '待修模接单',
    REPAIRING: '修模中',
    WAIT_EFFECT_REVIEW: '待效果图审核',
    WAIT_MODEL_QC: '待模型检测',
    WAIT_PRINT_QC: '待打印检测',
    PRINT_QC_REJECTED: '打印检测驳回',
    WAIT_PRINT_CLAIM: '待打印接单',
    PRINTING: '打印中',
    WAIT_DELIVERY: '待发货',
    DELIVERED: '已发货',
    COMPLETED: '已完成',
    CANCELLED: '已取消'
  };

  return map[value || ''] || value || '-';
}

function statusTagType(value?: string) {
  if (value === 'PAID' || value === 'COMPLETED' || value === 'DELIVERED') {
    return 'success';
  }

  if (value === 'PARTIAL' || value?.includes('WAIT')) {
    return 'warning';
  }

  if (value === 'UNPAID' || value?.includes('REJECTED') || value === 'CANCELLED') {
    return 'error';
  }

  return 'default';
}

const trendColumns = [
  {
    title: '日期',
    key: 'bizDate',
    width: 120
  },
  {
    title: '订单数',
    key: 'orderCount',
    width: 100
  },
  {
    title: '新增应收',
    key: 'receivableAmount',
    width: 120,
    render(row: DashboardDailyTrendVO) {
      return money(row.receivableAmount);
    }
  },
  {
    title: '收款',
    key: 'paymentAmount',
    width: 120,
    render(row: DashboardDailyTrendVO) {
      return money(row.paymentAmount);
    }
  },
  {
    title: '退款',
    key: 'refundAmount',
    width: 120,
    render(row: DashboardDailyTrendVO) {
      return money(row.refundAmount);
    }
  },
  {
    title: '净收款',
    key: 'netIncomeAmount',
    width: 120,
    render(row: DashboardDailyTrendVO) {
      return h(
        NTag,
        { type: Number(row.netIncomeAmount || 0) >= 0 ? 'success' : 'error' },
        { default: () => money(row.netIncomeAmount) }
      );
    }
  }
];

const debtColumns = [
  {
    title: '排名',
    key: 'rank',
    width: 70,
    render(_: DashboardCustomerDebtRankVO, index: number) {
      return Number(index) + 1;
    }
  },
  {
    title: '客户',
    key: 'customerName',
    width: 160
  },
  {
    title: '欠款金额',
    key: 'unpaidAmount',
    width: 130,
    render(row: DashboardCustomerDebtRankVO) {
      return h(
        NTag,
        { type: Number(row.unpaidAmount || 0) > 0 ? 'error' : 'success' },
        { default: () => money(row.unpaidAmount) }
      );
    }
  },
  {
    title: '未收项目数',
    key: 'itemCount',
    width: 110
  }
];

const orderStatusColumns = [
  {
    title: '订单状态',
    key: 'status',
    width: 180,
    render(row: DashboardStatusCountVO) {
      return orderStatusLabel(row.status);
    }
  },
  {
    title: '数量',
    key: 'count',
    width: 100,
    render(row: DashboardStatusCountVO) {
      return h(
        NTag,
        { type: statusTagType(row.status) as any },
        { default: () => numberValue(row.count) }
      );
    }
  }
];

const billStatusColumns = [
  {
    title: '账单支付状态',
    key: 'status',
    width: 180,
    render(row: DashboardStatusCountVO) {
      return payStatusLabel(row.status);
    }
  },
  {
    title: '数量',
    key: 'count',
    width: 100,
    render(row: DashboardStatusCountVO) {
      return h(
        NTag,
        { type: statusTagType(row.status) as any },
        { default: () => numberValue(row.count) }
      );
    }
  }
];

async function getDashboard() {
  loading.value = true;

  try {
    const res = await fetchBusinessDashboard({
      days: queryParams.days
    });

    dashboard.value = unwrapData(res) || {};
  } catch (error: any) {
    message.error(error?.message || '经营看板加载失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  getDashboard();
});
</script>

<template>
  <NSpace vertical :size="16">
    <NCard title="经营看板" :bordered="false">
      <NSpace justify="space-between" align="center">
        <div>
          <strong>经营数据总览</strong>
          <span style="margin-left: 8px; color: #888">
            统计订单、应收、收款、退款、客户欠款和待办事项
          </span>
        </div>

        <NSpace align="center">
          <NSelect
            v-model:value="queryParams.days"
            :options="dayOptions"
            style="width: 130px"
            @update:value="getDashboard"
          />

          <NButton type="primary" :loading="loading" @click="getDashboard">
            刷新
          </NButton>
        </NSpace>
      </NSpace>
    </NCard>

    <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen">
      <NGi>
        <NCard title="今日订单" :bordered="false">
          <NStatistic :value="numberValue(dashboard.kpi?.todayOrderCount)" />
          <div class="sub-text">本月：{{ numberValue(dashboard.kpi?.monthOrderCount) }} 单</div>
        </NCard>
      </NGi>

      <NGi>
        <NCard title="今日新增应收" :bordered="false">
          <NStatistic :value="money(dashboard.kpi?.todayReceivableAmount)" />
          <div class="sub-text">本月：{{ money(dashboard.kpi?.monthReceivableAmount) }}</div>
        </NCard>
      </NGi>

      <NGi>
        <NCard title="今日收款" :bordered="false">
          <NStatistic :value="money(dashboard.kpi?.todayPaymentAmount)" />
          <div class="sub-text">本月：{{ money(dashboard.kpi?.monthPaymentAmount) }}</div>
        </NCard>
      </NGi>

      <NGi>
        <NCard title="今日净收款" :bordered="false">
          <NStatistic :value="money(dashboard.kpi?.todayNetIncomeAmount)" />
          <div class="sub-text">
            本月净收款：{{ money(dashboard.kpi?.monthNetIncomeAmount) }}
          </div>
        </NCard>
      </NGi>
    </NGrid>

    <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen">
      <NGi>
        <NCard title="当前客户欠款" :bordered="false">
          <NStatistic :value="money(dashboard.kpi?.currentUnpaidReceivableAmount)" />
        </NCard>
      </NGi>

      <NGi>
        <NCard title="当前未入账金额" :bordered="false">
          <NStatistic :value="money(dashboard.kpi?.currentUnbilledAmount)" />
        </NCard>
      </NGi>

      <NGi>
        <NCard title="当前未收账单" :bordered="false">
          <NStatistic :value="money(dashboard.kpi?.currentUnpaidBillAmount)" />
        </NCard>
      </NGi>

      <NGi>
        <NCard title="客户预收余额" :bordered="false">
          <NStatistic :value="money(dashboard.kpi?.currentCustomerBalanceAmount)" />
        </NCard>
      </NGi>
    </NGrid>

    <NCard title="待办事项" :bordered="false">
      <NGrid :cols="6" :x-gap="16" :y-gap="16" responsive="screen">
        <NGi>
          <NStatistic label="未入账应收" :value="numberValue(dashboard.todo?.unbilledItemCount)" />
        </NGi>

        <NGi>
          <NStatistic label="未收账单" :value="numberValue(dashboard.todo?.unpaidBillCount)" />
        </NGi>

        <NGi>
          <NStatistic label="逾期账单" :value="numberValue(dashboard.todo?.overdueBillCount)" />
        </NGi>

        <NGi>
          <NStatistic label="待发货订单" :value="numberValue(dashboard.todo?.waitDeliveryOrderCount)" />
        </NGi>

        <NGi>
          <NStatistic label="待打印检测" :value="numberValue(dashboard.todo?.waitPrintQcOrderCount)" />
        </NGi>

        <NGi>
          <NStatistic label="打印检测驳回" :value="numberValue(dashboard.todo?.printQcRejectedOrderCount)" />
        </NGi>
      </NGrid>
    </NCard>

    <NGrid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
      <NGi>
        <NCard :title="`最近 ${queryParams.days} 天趋势`" :bordered="false">
          <NDataTable
            size="small"
            :loading="loading"
            :columns="trendColumns"
            :data="dashboard.dailyTrends || []"
            :pagination="false"
          />
        </NCard>
      </NGi>

      <NGi>
        <NCard title="客户欠款排行 Top 10" :bordered="false">
          <NDataTable
            size="small"
            :loading="loading"
            :columns="debtColumns"
            :data="dashboard.customerDebtRanks || []"
            :pagination="false"
          />
        </NCard>
      </NGi>
    </NGrid>

    <NGrid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
      <NGi>
        <NCard title="订单状态分布" :bordered="false">
          <NDataTable
            size="small"
            :loading="loading"
            :columns="orderStatusColumns"
            :data="dashboard.orderStatusCounts || []"
            :pagination="false"
          />
        </NCard>
      </NGi>

      <NGi>
        <NCard title="账单支付状态分布" :bordered="false">
          <NDataTable
            size="small"
            :loading="loading"
            :columns="billStatusColumns"
            :data="dashboard.billPayStatusCounts || []"
            :pagination="false"
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
