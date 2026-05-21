<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue';

import {
  NButton,
  NCard,
  NCode,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NGrid,
  NGi,
  NSelect,
  NSpace,
  NStatistic,
  NTag,
  useMessage
} from 'naive-ui';


import {
  fetchDataHealthDashboard,
  fetchDataHealthItemDetail,
  fetchDataHealthItemList,
  repairDataHealthItem,
  runDataHealthCheck,
  type DataHealthDashboardVO,
  type DataHealthItemVO,
  type DataHealthRuleVO
} from '@/service/api/biz/data-health';

defineOptions({
  name: 'BizDataHealth'
});

const message = useMessage();

const loading = ref(false);
const running = ref(false);
const repairing = ref(false);

const dashboard = ref<DataHealthDashboardVO>({});
const tableData = ref<DataHealthItemVO[]>([]);
const total = ref(0);

const showDetailDrawer = ref(false);
const detailLoading = ref(false);
const detail = ref<DataHealthItemVO | null>(null);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  batchId: undefined as string | number | undefined,
  ruleCode: '',
  severity: '',
  bizType: '',
  bizNo: '',
  repaired: ''
});

const severityOptions = [
  { label: '错误', value: 'ERROR' },
  { label: '警告', value: 'WARNING' }
];

const repairedOptions = [
  { label: '未修复', value: '0' },
  { label: '已修复', value: '1' }
];

function unwrapData(res: any) {
  return res?.data || res;
}

function unwrapRows(res: any) {
  const data = res?.data || res;
  return data?.rows || [];
}

function unwrapTotal(res: any) {
  const data = res?.data || res;
  return data?.total || 0;
}

function severityTagType(value?: string) {
  if (value === 'ERROR') return 'error';
  if (value === 'WARNING') return 'warning';
  return 'default';
}

function severityLabel(value?: string) {
  if (value === 'ERROR') return '错误';
  if (value === 'WARNING') return '警告';
  return value || '-';
}

function repairedLabel(value?: string) {
  return value === '1' ? '已修复' : '未修复';
}

function repairedTagType(value?: string) {
  return value === '1' ? 'success' : 'warning';
}

function prettyJson(value?: string) {
  if (!value) return '';

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

const ruleOptions = computed(() => {
  return (dashboard.value.rules || []).map(item => ({
    label: item.ruleName || item.ruleCode,
    value: item.ruleCode || ''
  }));
});

const columns = [
  {
    title: '等级',
    key: 'severity',
    width: 90,
    render(row: DataHealthItemVO) {
      return h(
        NTag,
        { type: severityTagType(row.severity) as any },
        { default: () => severityLabel(row.severity) }
      );
    }
  },
  {
    title: '检查项',
    key: 'ruleName',
    width: 220,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '业务类型',
    key: 'bizType',
    width: 130
  },
  {
    title: '业务单号',
    key: 'bizNo',
    width: 170
  },
  {
    title: '业务名称',
    key: 'bizName',
    width: 180,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '修复状态',
    key: 'repaired',
    width: 100,
    render(row: DataHealthItemVO) {
      return h(
        NTag,
        { type: repairedTagType(row.repaired) as any },
        { default: () => repairedLabel(row.repaired) }
      );
    }
  },
  {
    title: '修复结果',
    key: 'repairResult',
    width: 120
  },
  {
    title: '检查时间',
    key: 'createTime',
    width: 170
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    fixed: 'right' as const,
    render(row: DataHealthItemVO) {
      const buttons = [
        h(
          NButton,
          {
            size: 'small',
            onClick: () => openDetail(row)
          },
          { default: () => '详情' }
        )
      ];

      if (row.repairSupported === '1' && row.repaired !== '1') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'warning',
              loading: repairing.value,
              onClick: () => handleRepair(row)
            },
            { default: () => '修复' }
          )
        );
      }

      return h(NSpace, {}, { default: () => buttons });
    }
  }
];

async function getDashboard() {
  const res = await fetchDataHealthDashboard();
  dashboard.value = unwrapData(res) || {};
}

async function getList() {
  loading.value = true;

  try {
    const res = await fetchDataHealthItemList({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      batchId: queryParams.batchId,
      ruleCode: queryParams.ruleCode,
      severity: queryParams.severity,
      bizType: queryParams.bizType,
      bizNo: queryParams.bizNo,
      repaired: queryParams.repaired
    });

    tableData.value = unwrapRows(res);
    total.value = unwrapTotal(res);
  } finally {
    loading.value = false;
  }
}

async function handleRunAll() {
  running.value = true;

  try {
    const res = await runDataHealthCheck({
      limit: 500
    });

    const batchId = unwrapData(res);

    message.success('数据健康检查完成');

    queryParams.batchId = batchId;
    queryParams.pageNum = 1;

    await getDashboard();
    await getList();
  } finally {
    running.value = false;
  }
}

async function handleRunRule(rule: DataHealthRuleVO) {
  if (!rule.ruleCode) return;

  running.value = true;

  try {
    const res = await runDataHealthCheck({
      ruleCodes: [rule.ruleCode],
      limit: 500
    });

    const batchId = unwrapData(res);

    message.success(`${rule.ruleName || rule.ruleCode} 检查完成`);

    queryParams.batchId = batchId;
    queryParams.ruleCode = rule.ruleCode;
    queryParams.pageNum = 1;

    await getDashboard();
    await getList();
  } finally {
    running.value = false;
  }
}

async function openDetail(row: DataHealthItemVO) {
  if (!row.id) return;

  showDetailDrawer.value = true;
  detailLoading.value = true;
  detail.value = null;

  try {
    const res = await fetchDataHealthItemDetail(row.id);
    detail.value = unwrapData(res);
  } finally {
    detailLoading.value = false;
  }
}

async function handleRepair(row: DataHealthItemVO) {
  if (!row.id) return;

  repairing.value = true;

  try {
    await repairDataHealthItem(row.id);
    message.success('修复成功');

    await getDashboard();
    await getList();

    if (detail.value?.id === row.id) {
      const res = await fetchDataHealthItemDetail(row.id);
      detail.value = unwrapData(res);
    }
  } finally {
    repairing.value = false;
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

function resetQuery() {
  queryParams.batchId = undefined;
  queryParams.ruleCode = '';
  queryParams.severity = '';
  queryParams.bizType = '';
  queryParams.bizNo = '';
  queryParams.repaired = '';
  queryParams.pageNum = 1;
  getList();
}

onMounted(async () => {
  await getDashboard();

  if (dashboard.value.latestBatch?.id) {
    queryParams.batchId = dashboard.value.latestBatch.id;
  }

  await getList();
});
</script>

<template>
  <NSpace vertical :size="16">
    <NCard title="数据健康检查中心" :bordered="false">
      <NSpace justify="space-between" align="center">
        <div>
          <strong>检查订单、账务、收款、退款、利润快照、业绩调整等核心数据一致性</strong>
          <div style="margin-top: 6px; color: #888">
            最近批次：{{ dashboard.latestBatch?.batchNo || '暂无' }}
            <span v-if="dashboard.latestBatch?.startTime">
              · {{ dashboard.latestBatch?.startTime }}
            </span>
          </div>
        </div>

        <NButton type="primary" :loading="running" @click="handleRunAll">
          执行全部检查
        </NButton>
      </NSpace>
    </NCard>

    <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen">
      <NGi>
        <NCard title="异常总数" :bordered="false">
          <NStatistic :value="dashboard.latestAbnormalCount || 0" />
        </NCard>
      </NGi>

      <NGi>
        <NCard title="错误" :bordered="false">
          <NStatistic :value="dashboard.errorCount || 0" />
        </NCard>
      </NGi>

      <NGi>
        <NCard title="警告" :bordered="false">
          <NStatistic :value="dashboard.warningCount || 0" />
        </NCard>
      </NGi>

      <NGi>
        <NCard title="未修复" :bordered="false">
          <NStatistic :value="dashboard.unrepairedCount || 0" />
        </NCard>
      </NGi>
    </NGrid>

    <NCard title="检查规则" :bordered="false">
      <NGrid :cols="3" :x-gap="16" :y-gap="16" responsive="screen">
        <NGi v-for="rule in dashboard.rules || []" :key="rule.ruleCode">
          <NCard size="small" hoverable>
            <NSpace vertical :size="8">
              <NSpace justify="space-between" align="center">
                <strong>{{ rule.ruleName }}</strong>
                <NTag :type="severityTagType(rule.severity) as any">
                  {{ severityLabel(rule.severity) }}
                </NTag>
              </NSpace>

              <div style="color: #888; min-height: 42px">
                {{ rule.description }}
              </div>

              <NSpace justify="space-between" align="center">
                <NTag size="small" :type="rule.repairSupported ? 'success' : 'default'">
                  {{ rule.repairSupported ? '支持修复' : '不可自动修复' }}
                </NTag>

                <NButton size="small" :loading="running" @click="handleRunRule(rule)">
                  单项检查
                </NButton>
              </NSpace>
            </NSpace>
          </NCard>
        </NGi>
      </NGrid>
    </NCard>

    <NCard title="异常明细" :bordered="false">
      <NSpace vertical :size="16">
        <NForm inline label-placement="left">
          <NFormItem label="检查项">
            <NSelect
              v-model:value="queryParams.ruleCode"
              :options="ruleOptions"
              clearable
              style="width: 220px"
            />
          </NFormItem>

          <NFormItem label="等级">
            <NSelect
              v-model:value="queryParams.severity"
              :options="severityOptions"
              clearable
              style="width: 120px"
            />
          </NFormItem>

          <NFormItem label="修复状态">
            <NSelect
              v-model:value="queryParams.repaired"
              :options="repairedOptions"
              clearable
              style="width: 120px"
            />
          </NFormItem>

          <NFormItem label="业务单号">
            <NInput v-model:value="queryParams.bizNo" clearable placeholder="业务单号" />
          </NFormItem>

          <NFormItem>
            <NSpace>
              <NButton type="primary" :loading="loading" @click="getList">
                查询
              </NButton>

              <NButton @click="resetQuery">
                重置
              </NButton>
            </NSpace>
          </NFormItem>
        </NForm>

        <NDataTable
          remote
          size="small"
          :loading="loading"
          :columns="columns"
          :data="tableData"
          :scroll-x="1400"
          :pagination="{
            page: queryParams.pageNum,
            pageSize: queryParams.pageSize,
            itemCount: total,
            showSizePicker: true,
            pageSizes: [10, 20, 50],
            onUpdatePage: handlePageChange,
            onUpdatePageSize: handlePageSizeChange
          }"
        />
      </NSpace>
    </NCard>

    <NDrawer v-model:show="showDetailDrawer" width="1080" placement="right">
      <NDrawerContent title="数据健康异常详情" closable>
        <NSpace v-if="detail" vertical :size="16">
          <NCard title="基础信息" size="small">
            <NDescriptions bordered :column="3" size="small">
              <NDescriptionsItem label="检查项">
                {{ detail.ruleName }}
              </NDescriptionsItem>

              <NDescriptionsItem label="等级">
                {{ severityLabel(detail.severity) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="修复状态">
                {{ repairedLabel(detail.repaired) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="业务类型">
                {{ detail.bizType || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="业务单号">
                {{ detail.bizNo || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="业务名称">
                {{ detail.bizName || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="修复结果">
                {{ detail.repairResult || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="修复时间">
                {{ detail.repairTime || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="修复人">
                {{ detail.repairUserName || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="修复信息" :span="3">
                {{ detail.repairMsg || '-' }}
              </NDescriptionsItem>
            </NDescriptions>

            <NSpace style="margin-top: 12px" justify="end">
              <NButton
                v-if="detail.repairSupported === '1' && detail.repaired !== '1'"
                type="warning"
                :loading="repairing"
                @click="handleRepair(detail)"
              >
                执行修复
              </NButton>
            </NSpace>
          </NCard>

          <NCard title="差异数据" size="small">
            <NCode :code="prettyJson(detail.diffData) || '无'" language="json" word-wrap />
          </NCard>

          <NCard title="期望数据" size="small">
            <NCode :code="prettyJson(detail.expectedData) || '无'" language="json" word-wrap />
          </NCard>

          <NCard title="实际数据" size="small">
            <NCode :code="prettyJson(detail.actualData) || '无'" language="json" word-wrap />
          </NCard>
        </NSpace>
      </NDrawerContent>
    </NDrawer>
  </NSpace>
</template>
