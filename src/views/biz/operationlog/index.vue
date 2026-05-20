<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import {
  NButton,
  NCard,
  NCode,
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
  fetchOperationLogDetail,
  fetchOperationLogList,
  type BizOperationLogVO
} from '@/service/api/biz/operation-log';

defineOptions({
  name: 'BizOperationLog'
});

const message = useMessage();

const loading = ref(false);
const tableData = ref<BizOperationLogVO[]>([]);
const total = ref(0);

const detailLoading = ref(false);
const showDetailDrawer = ref(false);
const detail = ref<BizOperationLogVO | null>(null);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  bizType: '',
  operationType: '',
  bizNo: '',
  operatorName: '',
  resultStatus: '',
  keyword: '',
  timeRange: null as [number, number] | null
});

const bizTypeOptions = [
  { label: '订单', value: 'ORDER' },
  { label: '客户账单', value: 'CUSTOMER_BILL' },
  { label: '应收项目', value: 'RECEIVABLE_ITEM' },
  { label: '收款', value: 'PAYMENT' },
  { label: '退款', value: 'REFUND' },
  { label: '客户账户', value: 'CUSTOMER_ACCOUNT' },
  { label: '客户对账', value: 'CUSTOMER_RECONCILIATION' },
  { label: '利润快照', value: 'PROFIT_SNAPSHOT' },
  { label: '业绩结算', value: 'PERFORMANCE_SETTLEMENT' },
  { label: '业绩调整', value: 'PERFORMANCE_ADJUSTMENT' }
];

const operationTypeOptions = [
  { label: '新增', value: 'CREATE' },
  { label: '修改', value: 'UPDATE' },
  { label: '删除', value: 'DELETE' },
  { label: '生成', value: 'GENERATE' },
  { label: '确认', value: 'CONFIRM' },
  { label: '作废', value: 'CANCEL' },
  { label: '收款', value: 'PAY' },
  { label: '退款', value: 'REFUND' },
  { label: '导出', value: 'EXPORT' },
  { label: '打印', value: 'PRINT' },
  { label: '刷新', value: 'REFRESH' },
  { label: '调整', value: 'ADJUST' }
];

const resultStatusOptions = [
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAIL' }
];

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

function formatDateTime(value?: number | null) {
  if (!value) return undefined;

  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  const second = `${date.getSeconds()}`.padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function bizTypeLabel(value?: string) {
  return bizTypeOptions.find(item => item.value === value)?.label || value || '-';
}

function operationTypeLabel(value?: string) {
  return operationTypeOptions.find(item => item.value === value)?.label || value || '-';
}

function resultStatusLabel(value?: string) {
  if (value === 'SUCCESS') return '成功';
  if (value === 'FAIL') return '失败';
  return value || '-';
}

function resultStatusTagType(value?: string) {
  if (value === 'SUCCESS') return 'success';
  if (value === 'FAIL') return 'error';
  return 'default';
}

function prettyJson(value?: string) {
  if (!value) return '';

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

const columns = [
  {
    title: '操作时间',
    key: 'operationTime',
    width: 170,
    fixed: 'left'
  },
  {
    title: '业务类型',
    key: 'bizType',
    width: 120,
    render(row: BizOperationLogVO) {
      return bizTypeLabel(row.bizType);
    }
  },
  {
    title: '操作类型',
    key: 'operationType',
    width: 110,
    render(row: BizOperationLogVO) {
      return operationTypeLabel(row.operationType);
    }
  },
  {
    title: '业务单号',
    key: 'bizNo',
    width: 180
  },
  {
    title: '标题',
    key: 'title',
    width: 220,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '操作人',
    key: 'operatorName',
    width: 120
  },
  {
    title: '结果',
    key: 'resultStatus',
    width: 90,
    render(row: BizOperationLogVO) {
      return h(
        NTag,
        { type: resultStatusTagType(row.resultStatus) as any },
        { default: () => resultStatusLabel(row.resultStatus) }
      );
    }
  },
  {
    title: '原因',
    key: 'reason',
    width: 260,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: 'IP',
    key: 'requestIp',
    width: 130
  },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    fixed: 'right',
    render(row: BizOperationLogVO) {
      return h(
        NButton,
        {
          size: 'small',
          onClick: () => openDetail(row)
        },
        { default: () => '详情' }
      );
    }
  }
];

async function getList() {
  loading.value = true;

  try {
    const res = await fetchOperationLogList({
      pageNum: queryParams.pageNum,
      pageSize: queryParams.pageSize,
      bizType: queryParams.bizType,
      operationType: queryParams.operationType,
      bizNo: queryParams.bizNo,
      operatorName: queryParams.operatorName,
      resultStatus: queryParams.resultStatus,
      keyword: queryParams.keyword,
      startTime: queryParams.timeRange?.[0] ? formatDateTime(queryParams.timeRange[0]) : undefined,
      endTime: queryParams.timeRange?.[1] ? formatDateTime(queryParams.timeRange[1]) : undefined
    });

    tableData.value = unwrapRows(res);
    total.value = unwrapTotal(res);
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.bizType = '';
  queryParams.operationType = '';
  queryParams.bizNo = '';
  queryParams.operatorName = '';
  queryParams.resultStatus = '';
  queryParams.keyword = '';
  queryParams.timeRange = null;
  queryParams.pageNum = 1;

  getList();
}

async function openDetail(row: BizOperationLogVO) {
  if (!row.id) return;

  showDetailDrawer.value = true;
  detailLoading.value = true;
  detail.value = null;

  try {
    const res = await fetchOperationLogDetail(row.id);
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

onMounted(() => {
  getList();
});
</script>

<template>
  <NCard title="操作日志中心" :bordered="false">
    <NSpace vertical :size="16">
      <NForm inline label-placement="left">
        <NFormItem label="业务类型">
          <NSelect
            v-model:value="queryParams.bizType"
            :options="bizTypeOptions"
            clearable
            style="width: 150px"
          />
        </NFormItem>

        <NFormItem label="操作类型">
          <NSelect
            v-model:value="queryParams.operationType"
            :options="operationTypeOptions"
            clearable
            style="width: 130px"
          />
        </NFormItem>

        <NFormItem label="业务单号">
          <NInput v-model:value="queryParams.bizNo" clearable placeholder="业务单号" />
        </NFormItem>

        <NFormItem label="操作人">
          <NInput v-model:value="queryParams.operatorName" clearable placeholder="操作人" />
        </NFormItem>

        <NFormItem label="结果">
          <NSelect
            v-model:value="queryParams.resultStatus"
            :options="resultStatusOptions"
            clearable
            style="width: 110px"
          />
        </NFormItem>

        <NFormItem label="时间">
          <NDatePicker
            v-model:value="queryParams.timeRange"
            type="datetimerange"
            clearable
            style="width: 360px"
          />
        </NFormItem>

        <NFormItem label="关键词">
          <NInput v-model:value="queryParams.keyword" clearable placeholder="标题/原因/单号" />
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
        :scroll-x="1600"
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
      <NDrawerContent title="操作日志详情" closable>
        <NSpace v-if="detail" vertical :size="16">
          <NCard title="基础信息" size="small">
            <NDescriptions bordered :column="3" size="small">
              <NDescriptionsItem label="业务类型">
                {{ bizTypeLabel(detail.bizType) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="操作类型">
                {{ operationTypeLabel(detail.operationType) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="结果">
                {{ resultStatusLabel(detail.resultStatus) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="业务单号">
                {{ detail.bizNo || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="标题">
                {{ detail.title || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="操作人">
                {{ detail.operatorName || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="操作时间">
                {{ detail.operationTime || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="请求地址">
                {{ detail.requestMethod || '-' }} {{ detail.requestUri || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="IP">
                {{ detail.requestIp || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="原因" :span="3">
                {{ detail.reason || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="错误信息" :span="3">
                {{ detail.errorMsg || '-' }}
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <NCard title="差异数据" size="small">
            <NCode
              :code="prettyJson(detail.diffData) || '无差异数据'"
              language="json"
              word-wrap
            />
          </NCard>

          <NCard title="操作前数据" size="small">
            <NCode
              :code="prettyJson(detail.beforeData) || '无操作前数据'"
              language="json"
              word-wrap
            />
          </NCard>

          <NCard title="操作后数据" size="small">
            <NCode
              :code="prettyJson(detail.afterData) || '无操作后数据'"
              language="json"
              word-wrap
            />
          </NCard>
        </NSpace>
      </NDrawerContent>
    </NDrawer>
  </NCard>
</template>
