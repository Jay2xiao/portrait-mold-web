<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import { NButton, NCard, NDataTable, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSpace } from 'naive-ui';
import {
  fetchTenantResourceUsageLogDetail,
  fetchTenantResourceUsageLogList,
  type BizTenantResourceUsageLogVO
} from '@/service/api/biz/tenant-resource-usage-log';

defineOptions({ name: 'BizTenantResourceUsageLog' });

const loading = ref(false);
const tableData = ref<BizTenantResourceUsageLogVO[]>([]);
const total = ref(0);
const showDetailDrawer = ref(false);
const detail = ref<BizTenantResourceUsageLogVO | null>(null);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  usageType: '',
  periodMonth: '',
  bizType: ''
});

function unwrapRows(res: any) {
  const data = res?.data || res;
  return data?.rows || [];
}

function unwrapTotal(res: any) {
  const data = res?.data || res;
  return data?.total || 0;
}

async function getList() {
  loading.value = true;
  try {
    const res = await fetchTenantResourceUsageLogList(queryParams);
    tableData.value = unwrapRows(res);
    total.value = unwrapTotal(res);
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.pageNum = 1;
  queryParams.usageType = '';
  queryParams.periodMonth = '';
  queryParams.bizType = '';
  getList();
}

async function openDetail(row: BizTenantResourceUsageLogVO) {
  if (!row.id) return;
  const res = await fetchTenantResourceUsageLogDetail(row.id);
  detail.value = res?.data || res;
  showDetailDrawer.value = true;
}

const columns = [
  { title: 'ID', key: 'id', width: 120 },
  { title: '文件ID', key: 'fileId', width: 140 },
  { title: '使用类型', key: 'usageType', width: 130 },
  { title: '字节数', key: 'bytes', width: 130 },
  { title: '月份', key: 'periodMonth', width: 120 },
  { title: '业务类型', key: 'bizType', width: 130 },
  { title: '业务ID', key: 'bizId', width: 140 },
  { title: '操作人ID', key: 'operatorId', width: 130 },
  { title: '备注', key: 'remark', minWidth: 220, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    fixed: 'right' as const,
    render(row: BizTenantResourceUsageLogVO) {
      return h(NButton, { size: 'small', onClick: () => openDetail(row) }, { default: () => '详情' });
    }
  }
];

onMounted(getList);
</script>

<template>
  <div class="p-16px">
    <NCard :bordered="false">
      <NForm inline label-placement="left" :show-feedback="false">
        <NFormItem label="使用类型">
          <NInput v-model:value="queryParams.usageType" clearable placeholder="UPLOAD / DOWNLOAD / PREVIEW" />
        </NFormItem>
        <NFormItem label="月份">
          <NInput v-model:value="queryParams.periodMonth" clearable placeholder="YYYY-MM" />
        </NFormItem>
        <NFormItem label="业务类型">
          <NInput v-model:value="queryParams.bizType" clearable placeholder="业务类型" />
        </NFormItem>
        <NSpace>
          <NButton type="primary" @click="getList">查询</NButton>
          <NButton @click="resetQuery">重置</NButton>
        </NSpace>
      </NForm>

      <NDataTable
        class="mt-16px"
        remote
        :loading="loading"
        :columns="columns"
        :data="tableData"
        :pagination="{ page: queryParams.pageNum, pageSize: queryParams.pageSize, itemCount: total, onUpdatePage: (page: number) => { queryParams.pageNum = page; getList(); }, onUpdatePageSize: (pageSize: number) => { queryParams.pageSize = pageSize; queryParams.pageNum = 1; getList(); } }"
        :scroll-x="1300"
      />
    </NCard>

    <NDrawer v-model:show="showDetailDrawer" :width="520">
      <NDrawerContent title="资源使用日志详情">
        <pre class="whitespace-pre-wrap">{{ JSON.stringify(detail, null, 2) }}</pre>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>
