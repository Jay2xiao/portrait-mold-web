<template>
  <div class="collab-dashboard">
    <NCard title="协作中心统计看板" size="small" :bordered="false">
      <template #header-extra>
        <NSpace align="center" size="small">
          <NButton size="small" @click="() => setToday()">今日</NButton>
          <NButton size="small" @click="() => setThisMonth()">本月</NButton>
          <NButton size="small" @click="clearRange">全部</NButton>
          <NButton size="small" type="primary" :loading="loading" @click="loadData">刷新</NButton>
        </NSpace>
      </template>

      <NSpace vertical size="large">
        <NSpace align="center" wrap>
          <span class="filter-label">统计时间：</span>
          <NDatePicker
            v-model:value="rangeValue"
            type="datetimerange"
            clearable
            class="date-range"
            @update:value="handleRangeChange"
          />
        </NSpace>

        <NAlert v-if="riskTotal > 0" type="error" show-icon>
          当前存在 {{ riskTotal }} 项账务同步异常，请优先处理“同步风险”中的失败项。
        </NAlert>

        <NAlert v-else type="success" show-icon>
          当前没有账务同步异常。
        </NAlert>
      </NSpace>
    </NCard>

    <NSpin :show="loading">
      <!-- 总览 -->
      <NCard title="业务总览" size="small" :bordered="false" class="mt-16px">
        <div class="stat-grid">
          <NCard
            v-for="item in overviewCards"
            :key="item.key"
            size="small"
            embedded
            class="stat-card"
            :class="item.className"
          >
            <div class="stat-label">{{ item.label }}</div>
            <div class="stat-value">{{ item.value }}</div>
            <div class="stat-desc">{{ item.desc }}</div>
          </NCard>
        </div>
      </NCard>

      <!-- 待处理 -->
      <NCard title="待处理事项" size="small" :bordered="false" class="mt-16px">
        <div class="todo-grid">
          <NCard size="small" embedded class="todo-card">
            <div class="todo-title">我待付款</div>
            <div class="todo-value warning">{{ n(overview.senderPendingPayCount) }}</div>
            <div class="todo-desc">已出账或凭证被驳回，等待发单方处理</div>
            <NButton size="small" type="warning" ghost @click="goSent('BILLED')">
              查看发出的协作单
            </NButton>
          </NCard>

          <NCard size="small" embedded class="todo-card">
            <div class="todo-title">我待出账</div>
            <div class="todo-value info">{{ n(overview.receiverWaitBillCount) }}</div>
            <div class="todo-desc">已发货完成，等待接单方创建账单</div>
            <NButton size="small" type="info" ghost @click="goReceived('WAIT_BILL')">
              查看收到的协作单
            </NButton>
          </NCard>

          <NCard size="small" embedded class="todo-card">
            <div class="todo-title">待审核付款凭证</div>
            <div class="todo-value warning">{{ n(overview.receiverVoucherReviewCount) }}</div>
            <div class="todo-desc">发单方已上传凭证，等待接单方审核</div>
            <NButton size="small" type="warning" ghost @click="goReceived('VOUCHER_UPLOADED')">
              去审核凭证
            </NButton>
          </NCard>

          <NCard size="small" embedded class="todo-card">
            <div class="todo-title">同步异常</div>
            <div class="todo-value error">{{ n(overview.syncFailedCount) }}</div>
            <div class="todo-desc">内部账单、内部收款或外协成本同步失败</div>
            <NButton size="small" type="error" ghost @click="goReceived()">
              查看协作单
            </NButton>
          </NCard>
        </div>
      </NCard>

      <!-- 金额统计 -->
      <NCard title="金额统计" size="small" :bordered="false" class="mt-16px">
        <div class="amount-grid">
          <NCard size="small" embedded>
            <div class="amount-title">总账单金额</div>
            <div class="amount-value">{{ money(amount.totalBillAmount) }}</div>
            <NProgress
              type="line"
              :percentage="paidRate"
              :height="8"
              :show-indicator="true"
              processing
            />
            <div class="amount-desc">
              已付 {{ money(amount.totalPaidAmount) }} / 未付 {{ money(amount.totalUnpaidAmount) }}
            </div>
          </NCard>

          <NCard size="small" embedded>
            <div class="amount-title">我发出的账单</div>
            <div class="amount-value">{{ money(amount.sentBillAmount) }}</div>
            <div class="amount-row">
              <span>账单数</span>
              <strong>{{ n(amount.sentBillCount) }}</strong>
            </div>
            <div class="amount-row">
              <span>已付</span>
              <strong>{{ money(amount.sentPaidAmount) }}</strong>
            </div>
            <div class="amount-row">
              <span>未付</span>
              <strong>{{ money(amount.sentUnpaidAmount) }}</strong>
            </div>
          </NCard>

          <NCard size="small" embedded>
            <div class="amount-title">我收到的账单</div>
            <div class="amount-value">{{ money(amount.receivedBillAmount) }}</div>
            <div class="amount-row">
              <span>账单数</span>
              <strong>{{ n(amount.receivedBillCount) }}</strong>
            </div>
            <div class="amount-row">
              <span>已付</span>
              <strong>{{ money(amount.receivedPaidAmount) }}</strong>
            </div>
            <div class="amount-row">
              <span>未付</span>
              <strong>{{ money(amount.receivedUnpaidAmount) }}</strong>
            </div>
          </NCard>
        </div>
      </NCard>

      <!-- 趋势统计 -->
      <NCard title="趋势统计" size="small" :bordered="false" class="mt-16px">
        <template #header-extra>
          <NSpace size="small" align="center">
            <NTag size="small" type="info">按日统计</NTag>
            <NTag size="small">协作单 / 账单 / 付款 / 风险</NTag>
          </NSpace>
        </template>

        <NEmpty v-if="!trendItems.length" description="暂无趋势数据" />

        <div v-else class="trend-list">
          <div v-for="item in trendItems" :key="item.period" class="trend-row">
            <div class="trend-period">
              {{ item.periodLabel || item.period }}
            </div>

            <div class="trend-bars">
              <div class="trend-bar-item">
                <div class="trend-bar-label">
                  协作单 {{ n(item.sentOrderCount) + n(item.receivedOrderCount) }}
                  <span class="trend-bar-sub">
              发 {{ n(item.sentOrderCount) }} / 收 {{ n(item.receivedOrderCount) }}
            </span>
                </div>
                <div class="trend-bar-track">
                  <div
                    class="trend-bar-fill blue"
                    :style="{ width: barWidth(n(item.sentOrderCount) + n(item.receivedOrderCount), trendMaxOrder) }"
                  />
                </div>
              </div>

              <div class="trend-bar-item">
                <div class="trend-bar-label">
                  账单 {{ money(item.billAmount) }}
                  <span class="trend-bar-sub">
              {{ n(item.billCount) }} 单
            </span>
                </div>
                <div class="trend-bar-track">
                  <div
                    class="trend-bar-fill purple"
                    :style="{ width: barWidth(item.billAmount, trendMaxBillAmount) }"
                  />
                </div>
              </div>

              <div class="trend-bar-item">
                <div class="trend-bar-label">
                  付款确认 {{ money(item.paidAmount) }}
                </div>
                <div class="trend-bar-track">
                  <div
                    class="trend-bar-fill green"
                    :style="{ width: barWidth(item.paidAmount, trendMaxPaidAmount) }"
                  />
                </div>
              </div>

              <div class="trend-bar-item">
                <div class="trend-bar-label">
                  同步失败 {{ n(item.syncFailedCount) }}
                  <span class="trend-bar-sub">
              账单 {{ n(item.internalBillSyncFailedCount) }} /
              收款 {{ n(item.internalPaymentSyncFailedCount) }} /
              成本 {{ n(item.collabCostSyncFailedCount) }}
            </span>
                </div>
                <div class="trend-bar-track">
                  <div
                    class="trend-bar-fill red"
                    :style="{ width: barWidth(item.syncFailedCount, trendMaxRisk) }"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </NCard>


      <!-- 同步风险 -->
      <NCard title="同步风险" size="small" :bordered="false" class="mt-16px">
        <NDataTable
          size="small"
          :columns="riskColumns"
          :data="riskRows"
          :pagination="false"
          :bordered="true"
        />
      </NCard>

      <!-- 最近待办 -->
      <NCard title="最近待办" size="small" :bordered="false" class="mt-16px">
        <template #header-extra>
          <NButton size="small" quaternary @click="loadData">刷新</NButton>
        </template>

        <NDataTable
          v-if="recentTodos.length"
          size="small"
          :columns="todoColumns"
          :data="recentTodos"
          :pagination="false"
          :bordered="true"
        />

        <NEmpty v-else description="暂无待办事项" />
      </NCard>

      <!-- 最近风险 -->
      <NCard title="最近风险" size="small" :bordered="false" class="mt-16px">
        <template #header-extra>
          <NButton size="small" quaternary @click="loadData">刷新</NButton>
        </template>

        <NDataTable
          v-if="recentRisks.length"
          size="small"
          :columns="recentRiskColumns"
          :data="recentRisks"
          :pagination="false"
          :bordered="true"
        />

        <NEmpty v-else description="暂无同步风险" />
      </NCard>


      <!-- 快捷入口 -->
      <NCard title="快捷入口" size="small" :bordered="false" class="mt-16px">
        <NSpace wrap>
          <NButton type="primary" ghost @click="goReceived()">收到的协作单</NButton>
          <NButton type="primary" ghost @click="goSent()">发出的协作单</NButton>
          <NButton type="warning" ghost @click="goReceived('WAIT_BILL')">待出账</NButton>
          <NButton type="warning" ghost @click="goSent('BILLED')">待付款</NButton>
          <NButton type="error" ghost @click="goReceived('VOUCHER_UPLOADED')">待审核凭证</NButton>
        </NSpace>
      </NCard>
    </NSpin>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NProgress,
  NSpace,
  NSpin,
  NTag,
  NEmpty,
  useMessage,
  type DataTableColumns
} from 'naive-ui';

import {
  fetchCollabStatAmount,
  fetchCollabStatOverview,
  fetchCollabStatRecentRisks,
  fetchCollabStatRecentTodos,
  fetchCollabStatSyncRisk,
  fetchCollabStatTrend,
  type CollabStatAmountVO,
  type CollabStatOverviewVO,
  type CollabStatQueryParams,
  type CollabStatRiskItemVO,
  type CollabStatSyncRiskVO,
  type CollabStatTodoItemVO,
  type CollabStatTrendItemVO
} from '@/service/api/biz/collab-stat';
import { COLLAB_ORDER_LIST_PATH, COLLAB_ORDER_SEND_PATH } from '@/service/api/biz/collab-bill-detail-link';



interface RiskRow {
  key: string;
  name: string;
  count: number;
  role: string;
  desc: string;
}

const RECEIVED_PATH = COLLAB_ORDER_LIST_PATH;
const SENT_PATH = COLLAB_ORDER_SEND_PATH;

const router = useRouter();
const message = useMessage();

const loading = ref(false);
const rangeValue = ref<[number, number] | null>(null);

const overview = reactive<CollabStatOverviewVO>({
  sentCount: 0,
  receivedCount: 0,
  pendingAcceptCount: 0,
  processingCount: 0,
  waitBillCount: 0,
  billedCount: 0,
  voucherUploadedCount: 0,
  paidConfirmedCount: 0,
  completedCount: 0,
  rejectedCount: 0,
  senderPendingPayCount: 0,
  receiverWaitBillCount: 0,
  receiverVoucherReviewCount: 0,
  syncFailedCount: 0
});

const amount = reactive<CollabStatAmountVO>({
  sentBillCount: 0,
  sentBillAmount: 0,
  sentPaidAmount: 0,
  sentUnpaidAmount: 0,
  receivedBillCount: 0,
  receivedBillAmount: 0,
  receivedPaidAmount: 0,
  receivedUnpaidAmount: 0,
  totalBillCount: 0,
  totalBillAmount: 0,
  totalPaidAmount: 0,
  totalUnpaidAmount: 0
});

const risk = reactive<CollabStatSyncRiskVO>({
  internalBillSyncFailedCount: 0,
  internalPaymentSyncFailedCount: 0,
  collabCostSyncFailedCount: 0,
  totalSyncFailedCount: 0,
  receiverInternalBillSyncFailedCount: 0,
  receiverInternalPaymentSyncFailedCount: 0,
  senderCollabCostSyncFailedCount: 0
});

const recentTodos = ref<CollabStatTodoItemVO[]>([]);
const recentRisks = ref<CollabStatRiskItemVO[]>([]);
const trendItems = ref<CollabStatTrendItemVO[]>([]);



const overviewCards = computed(() => {
  return [
    {
      key: 'sentCount',
      label: '我发出的',
      value: n(overview.sentCount),
      desc: '当前租户作为发单方的协作单',
      className: 'blue'
    },
    {
      key: 'receivedCount',
      label: '我收到的',
      value: n(overview.receivedCount),
      desc: '当前租户作为接单方的协作单',
      className: 'green'
    },
    {
      key: 'pendingAcceptCount',
      label: '待接单',
      value: n(overview.pendingAcceptCount),
      desc: '等待接单方接受或拒绝',
      className: 'orange'
    },
    {
      key: 'processingCount',
      label: '处理中',
      value: n(overview.processingCount),
      desc: '修模、审核、打印、发货等处理中',
      className: 'purple'
    },
    {
      key: 'waitBillCount',
      label: '待出账',
      value: n(overview.waitBillCount),
      desc: '发货完成，等待协作账单',
      className: 'orange'
    },
    {
      key: 'billedCount',
      label: '已出账',
      value: n(overview.billedCount),
      desc: '已发送协作账单',
      className: 'blue'
    },
    {
      key: 'voucherUploadedCount',
      label: '已上传凭证',
      value: n(overview.voucherUploadedCount),
      desc: '发单方已上传付款凭证',
      className: 'orange'
    },
    {
      key: 'paidConfirmedCount',
      label: '已确认收款',
      value: n(overview.paidConfirmedCount),
      desc: '接单方已确认付款凭证',
      className: 'green'
    },
    {
      key: 'completedCount',
      label: '已完成',
      value: n(overview.completedCount),
      desc: '协作服务已完成',
      className: 'green'
    },
    {
      key: 'rejectedCount',
      label: '已拒绝 / 取消',
      value: n(overview.rejectedCount),
      desc: '拒单、取消或审核驳回',
      className: 'red'
    }
  ];
});

const riskTotal = computed(() => {
  return n(risk.totalSyncFailedCount || overview.syncFailedCount);
});

const paidRate = computed(() => {
  const total = num(amount.totalBillAmount);
  const paid = num(amount.totalPaidAmount);

  if (total <= 0) {
    return 0;
  }

  return Math.min(100, Number(((paid / total) * 100).toFixed(2)));
});

const riskRows = computed<RiskRow[]>(() => {
  return [
    {
      key: 'internalBillSyncFailedCount',
      name: '内部账单同步失败',
      count: n(risk.internalBillSyncFailedCount),
      role: '接单方',
      desc: '协作账单未成功同步到接单方内部客户账单'
    },
    {
      key: 'internalPaymentSyncFailedCount',
      name: '内部收款同步失败',
      count: n(risk.internalPaymentSyncFailedCount),
      role: '接单方',
      desc: '付款凭证未成功同步到接单方内部收款记录'
    },
    {
      key: 'collabCostSyncFailedCount',
      name: '外协成本同步失败',
      count: n(risk.collabCostSyncFailedCount),
      role: '发单方',
      desc: '付款金额未成功同步为发单方源订单外协成本'
    },
    {
      key: 'receiverInternalBillSyncFailedCount',
      name: '我作为接单方：账单同步失败',
      count: n(risk.receiverInternalBillSyncFailedCount),
      role: '接单方',
      desc: '需要在收到的协作单详情中重试账单同步'
    },
    {
      key: 'receiverInternalPaymentSyncFailedCount',
      name: '我作为接单方：收款同步失败',
      count: n(risk.receiverInternalPaymentSyncFailedCount),
      role: '接单方',
      desc: '需要在收到的协作单详情中重试付款同步'
    },
    {
      key: 'senderCollabCostSyncFailedCount',
      name: '我作为发单方：成本同步失败',
      count: n(risk.senderCollabCostSyncFailedCount),
      role: '发单方',
      desc: '需要检查源订单外协成本是否同步成功'
    }
  ];
});

const trendMaxOrder = computed(() => {
  const values = trendItems.value.map(item => n(item.sentOrderCount) + n(item.receivedOrderCount));
  return Math.max(1, ...values);
});

const trendMaxBillAmount = computed(() => {
  const values = trendItems.value.map(item => num(item.billAmount));
  return Math.max(1, ...values);
});

const trendMaxPaidAmount = computed(() => {
  const values = trendItems.value.map(item => num(item.paidAmount));
  return Math.max(1, ...values);
});

const trendMaxRisk = computed(() => {
  const values = trendItems.value.map(item => n(item.syncFailedCount));
  return Math.max(1, ...values);
});


const riskColumns: DataTableColumns<RiskRow> = [
  {
    title: '风险项',
    key: 'name',
    minWidth: 220
  },
  {
    title: '数量',
    key: 'count',
    width: 100,
    render(row) {
      return h(
        NTag,
        { type: row.count > 0 ? 'error' : 'success' },
        { default: () => String(row.count) }
      );
    }
  },
  {
    title: '角色',
    key: 'role',
    width: 100
  },
  {
    title: '说明',
    key: 'desc',
    minWidth: 320
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    render(row) {
      if (row.count <= 0) {
        return '-';
      }

      if (row.key.includes('sender') || row.key === 'collabCostSyncFailedCount') {
        return h(
          NButton,
          {
            size: 'small',
            type: 'primary',
            ghost: true,
            onClick: () => goSent()
          },
          { default: () => '查看发出的' }
        );
      }

      return h(
        NButton,
        {
          size: 'small',
          type: 'primary',
          ghost: true,
          onClick: () => goReceived()
        },
        { default: () => '查看收到的' }
      );
    }
  }
];

const todoColumns: DataTableColumns<CollabStatTodoItemVO> = [
  {
    title: '待办',
    key: 'todoTitle',
    minWidth: 160,
    render(row) {
      return h(
        NTag,
        { type: todoTypeTagType(row.todoType) },
        { default: () => row.todoTitle || todoTypeText(row.todoType) }
      );
    }
  },
  {
    title: '协作单',
    key: 'collabOrderNo',
    minWidth: 180,
    render(row) {
      return row.collabOrderNo || '-';
    }
  },
  {
    title: '对方商家',
    key: 'partnerTenantName',
    minWidth: 160,
    render(row) {
      return row.partnerTenantName || '-';
    }
  },
  {
    title: '金额',
    key: 'amount',
    width: 120,
    render(row) {
      return money(row.billAmount || row.paymentAmount || 0);
    }
  },
  {
    title: '说明',
    key: 'todoDesc',
    minWidth: 260,
    render(row) {
      return row.todoDesc || row.actionHint || '-';
    }
  },
  {
    title: '时间',
    key: 'createTime',
    width: 170,
    render(row) {
      return row.createTime || '-';
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    fixed: 'right' as const,
    render(row) {
      return h(
        NButton,
        {
          size: 'small',
          type: 'primary',
          ghost: true,
          onClick: () => goByAction(row.actionPage, row.actionStatus)
        },
        { default: () => '去处理' }
      );
    }
  }
];

const recentRiskColumns: DataTableColumns<CollabStatRiskItemVO> = [
  {
    title: '风险',
    key: 'riskTitle',
    minWidth: 180,
    render(row) {
      return h(
        NTag,
        { type: 'error' },
        { default: () => row.riskTitle || riskTypeText(row.riskType) }
      );
    }
  },
  {
    title: '协作单',
    key: 'collabOrderNo',
    minWidth: 180,
    render(row) {
      return row.collabOrderNo || '-';
    }
  },
  {
    title: '对方商家',
    key: 'partnerTenantName',
    minWidth: 160,
    render(row) {
      return row.partnerTenantName || '-';
    }
  },
  {
    title: '失败原因',
    key: 'syncError',
    minWidth: 320,
    render(row) {
      return row.syncError || row.riskDesc || '-';
    }
  },
  {
    title: '时间',
    key: 'createTime',
    width: 170,
    render(row) {
      return row.createTime || '-';
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    fixed: 'right' as const,
    render(row) {
      return h(
        NButton,
        {
          size: 'small',
          type: 'error',
          ghost: true,
          onClick: () => goByAction(row.actionPage, row.actionStatus)
        },
        { default: () => '去处理' }
      );
    }
  }
];


onMounted(() => {
  setThisMonth(false);
  loadData();
});

async function loadData() {
  loading.value = true;

  try {
    const params = buildQueryParams();

    const listParams = {
      ...params,
      limit: 10
    };

    const trendParams = {
      ...params,
      granularity: 'DAY' as const,
      trendDays: 30
    };

    const [overviewRes, amountRes, riskRes, todoRes, riskListRes, trendRes] = await Promise.all([
      fetchCollabStatOverview(params),
      fetchCollabStatAmount(params),
      fetchCollabStatSyncRisk(params),
      fetchCollabStatRecentTodos(listParams),
      fetchCollabStatRecentRisks(listParams),
      fetchCollabStatTrend(trendParams)
    ]);



    Object.assign(overview, normalizeOverview(unwrapData<CollabStatOverviewVO>(overviewRes)));
    Object.assign(amount, normalizeAmount(unwrapData<CollabStatAmountVO>(amountRes)));
    Object.assign(risk, normalizeRisk(unwrapData<CollabStatSyncRiskVO>(riskRes)));

    recentTodos.value = unwrapData<CollabStatTodoItemVO[]>(todoRes) || [];
    recentRisks.value = unwrapData<CollabStatRiskItemVO[]>(riskListRes) || [];
    trendItems.value = normalizeTrendItems(unwrapData<CollabStatTrendItemVO[]>(trendRes) || []);

  } catch (error: any) {
    message.error(error?.message || '加载协作统计失败');
  } finally {
    loading.value = false;
  }
}

function handleRangeChange() {
  loadData();
}

function buildQueryParams(): CollabStatQueryParams {
  if (!rangeValue.value || rangeValue.value.length !== 2) {
    return {};
  }

  return {
    beginTime: formatDateTime(new Date(rangeValue.value[0])),
    endTime: formatDateTime(new Date(rangeValue.value[1]))
  };
}

function setToday(shouldLoad = true) {
  const now = new Date();

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  rangeValue.value = [start.getTime(), end.getTime()];

  if (shouldLoad) {
    loadData();
  }
}

function setThisMonth(shouldLoad = true) {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  rangeValue.value = [start.getTime(), end.getTime()];

  if (shouldLoad) {
    loadData();
  }
}

function clearRange() {
  rangeValue.value = null;
  loadData();
}

function goReceived(status?: string) {
  router.push({
    path: RECEIVED_PATH,
    query: status ? { status } : {}
  });
}

function goSent(status?: string) {
  router.push({
    path: SENT_PATH,
    query: status ? { status } : {}
  });
}

function goByAction(actionPage?: string, status?: string) {
  if (actionPage === 'SENT') {
    goSent(status);
    return;
  }

  goReceived(status);
}

function todoTypeText(value?: string) {
  const map: Record<string, string> = {
    ACCEPT_ORDER: '待接单',
    CREATE_BILL: '待出账',
    REVIEW_VOUCHER: '待审核凭证',
    PAY_BILL: '待付款',
    REUPLOAD_VOUCHER: '重新上传凭证'
  };

  return value ? map[value] || value : '-';
}

function todoTypeTagType(value?: string) {
  if (value === 'ACCEPT_ORDER') return 'warning';
  if (value === 'CREATE_BILL') return 'info';
  if (value === 'REVIEW_VOUCHER') return 'warning';
  if (value === 'PAY_BILL') return 'error';
  if (value === 'REUPLOAD_VOUCHER') return 'error';

  return 'default';
}

function riskTypeText(value?: string) {
  const map: Record<string, string> = {
    INTERNAL_BILL_SYNC_FAILED: '内部账单同步失败',
    INTERNAL_PAYMENT_SYNC_FAILED: '内部收款同步失败',
    COLLAB_COST_SYNC_FAILED: '外协成本同步失败'
  };

  return value ? map[value] || value : '-';
}


function unwrapData<T>(res: any): T {
  if (res && typeof res === 'object' && 'data' in res) {
    return res.data as T;
  }

  return res as T;
}

function normalizeOverview(data?: CollabStatOverviewVO): CollabStatOverviewVO {
  const source = data || {};

  return {
    beginTime: source.beginTime,
    endTime: source.endTime,
    sentCount: n(source.sentCount),
    receivedCount: n(source.receivedCount),
    pendingAcceptCount: n(source.pendingAcceptCount),
    processingCount: n(source.processingCount),
    waitBillCount: n(source.waitBillCount),
    billedCount: n(source.billedCount),
    voucherUploadedCount: n(source.voucherUploadedCount),
    paidConfirmedCount: n(source.paidConfirmedCount),
    completedCount: n(source.completedCount),
    rejectedCount: n(source.rejectedCount),
    senderPendingPayCount: n(source.senderPendingPayCount),
    receiverWaitBillCount: n(source.receiverWaitBillCount),
    receiverVoucherReviewCount: n(source.receiverVoucherReviewCount),
    syncFailedCount: n(source.syncFailedCount)
  };
}

function normalizeAmount(data?: CollabStatAmountVO): CollabStatAmountVO {
  const source = data || {};

  return {
    beginTime: source.beginTime,
    endTime: source.endTime,
    sentBillCount: n(source.sentBillCount),
    sentBillAmount: num(source.sentBillAmount),
    sentPaidAmount: num(source.sentPaidAmount),
    sentUnpaidAmount: num(source.sentUnpaidAmount),
    receivedBillCount: n(source.receivedBillCount),
    receivedBillAmount: num(source.receivedBillAmount),
    receivedPaidAmount: num(source.receivedPaidAmount),
    receivedUnpaidAmount: num(source.receivedUnpaidAmount),
    totalBillCount: n(source.totalBillCount),
    totalBillAmount: num(source.totalBillAmount),
    totalPaidAmount: num(source.totalPaidAmount),
    totalUnpaidAmount: num(source.totalUnpaidAmount)
  };
}

function normalizeRisk(data?: CollabStatSyncRiskVO): CollabStatSyncRiskVO {
  const source = data || {};

  return {
    beginTime: source.beginTime,
    endTime: source.endTime,
    internalBillSyncFailedCount: n(source.internalBillSyncFailedCount),
    internalPaymentSyncFailedCount: n(source.internalPaymentSyncFailedCount),
    collabCostSyncFailedCount: n(source.collabCostSyncFailedCount),
    totalSyncFailedCount: n(source.totalSyncFailedCount),
    receiverInternalBillSyncFailedCount: n(source.receiverInternalBillSyncFailedCount),
    receiverInternalPaymentSyncFailedCount: n(source.receiverInternalPaymentSyncFailedCount),
    senderCollabCostSyncFailedCount: n(source.senderCollabCostSyncFailedCount)
  };
}

function normalizeTrendItems(data: CollabStatTrendItemVO[]) {
  return data.map(item => ({
    period: item.period,
    periodLabel: item.periodLabel || item.period,
    beginTime: item.beginTime,
    endTime: item.endTime,

    sentOrderCount: n(item.sentOrderCount),
    receivedOrderCount: n(item.receivedOrderCount),

    billCount: n(item.billCount),
    billAmount: num(item.billAmount),

    paidAmount: num(item.paidAmount),

    internalBillSyncFailedCount: n(item.internalBillSyncFailedCount),
    internalPaymentSyncFailedCount: n(item.internalPaymentSyncFailedCount),
    collabCostSyncFailedCount: n(item.collabCostSyncFailedCount),
    syncFailedCount: n(item.syncFailedCount)
  }));
}

function barWidth(value: number | string | undefined | null, max: number) {
  const current = num(value);

  if (max <= 0 || current <= 0) {
    return '0%';
  }

  return `${Math.min(100, Number(((current / max) * 100).toFixed(2)))}%`;
}


function n(value?: number | string | null) {
  const result = Number(value || 0);

  if (Number.isNaN(result)) {
    return 0;
  }

  return result;
}

function num(value?: number | string | null) {
  const result = Number(value || 0);

  if (Number.isNaN(result)) {
    return 0;
  }

  return result;
}

function money(value?: number | string | null) {
  return `¥${num(value).toFixed(2)}`;
}

function formatDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`;
}
</script>

<style scoped>
.trend-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 520px;
  overflow-y: auto;
}

.trend-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 16px;
  padding: 12px;
  border: 1px solid rgb(239, 239, 245);
  border-radius: 8px;
  background: #fff;
}

.trend-period {
  display: flex;
  align-items: center;
  color: #333;
  font-weight: 600;
}

.trend-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.trend-bar-item {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 12px;
  align-items: center;
}

.trend-bar-label {
  color: #555;
  font-size: 13px;
}

.trend-bar-sub {
  margin-left: 6px;
  color: #999;
  font-size: 12px;
}

.trend-bar-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #f1f5f9;
}

.trend-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.2s ease;
}

.trend-bar-fill.blue {
  background: #2080f0;
}

.trend-bar-fill.purple {
  background: #7c3aed;
}

.trend-bar-fill.green {
  background: #18a058;
}

.trend-bar-fill.red {
  background: #d03050;
}

@media (max-width: 900px) {
  .trend-row {
    grid-template-columns: 1fr;
  }

  .trend-bar-item {
    grid-template-columns: 1fr;
  }
}

.collab-dashboard {
  padding: 16px;
}

.mt-16px {
  margin-top: 16px;
}

.date-range {
  width: 360px;
}

.filter-label {
  color: var(--n-text-color);
  font-size: 14px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.todo-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.amount-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 12px;
}

.stat-card {
  min-height: 118px;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.stat-value {
  margin-top: 8px;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-desc {
  margin-top: 8px;
  color: #999;
  font-size: 12px;
  line-height: 1.4;
}

.stat-card.blue .stat-value {
  color: #2080f0;
}

.stat-card.green .stat-value {
  color: #18a058;
}

.stat-card.orange .stat-value {
  color: #f0a020;
}

.stat-card.red .stat-value {
  color: #d03050;
}

.stat-card.purple .stat-value {
  color: #7c3aed;
}

.todo-card {
  min-height: 170px;
}

.todo-title {
  color: #666;
  font-size: 14px;
}

.todo-value {
  margin-top: 8px;
  font-size: 32px;
  font-weight: 700;
}

.todo-value.warning {
  color: #f0a020;
}

.todo-value.info {
  color: #2080f0;
}

.todo-value.error {
  color: #d03050;
}

.todo-desc {
  min-height: 38px;
  margin: 8px 0 12px;
  color: #999;
  font-size: 12px;
  line-height: 1.5;
}

.amount-title {
  color: #666;
  font-size: 14px;
}

.amount-value {
  margin: 8px 0 12px;
  font-size: 28px;
  font-weight: 700;
  color: #2080f0;
}

.amount-desc {
  margin-top: 8px;
  color: #999;
  font-size: 12px;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  color: #666;
  font-size: 14px;
}

@media (max-width: 1400px) {
  .stat-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .todo-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .amount-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .todo-grid {
    grid-template-columns: 1fr;
  }

  .date-range {
    width: 100%;
  }
}
</style>
