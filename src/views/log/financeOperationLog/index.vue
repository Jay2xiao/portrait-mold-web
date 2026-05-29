<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import { NButton, NCard, NDataTable, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSpace } from 'naive-ui';
import {
  fetchFinanceOperationLogDetail,
  fetchFinanceOperationLogList,
  type BizFinanceOperationLogVO
} from '@/service/api/biz/finance-operation-log';

defineOptions({ name: 'BizFinanceOperationLog' });

const loading = ref(false);
const tableData = ref<BizFinanceOperationLogVO[]>([]);
const total = ref(0);
const showDetailDrawer = ref(false);
const detail = ref<BizFinanceOperationLogVO | null>(null);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  bizType: '',
  actionType: '',
  bizNo: ''
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
    const res = await fetchFinanceOperationLogList(queryParams);
    tableData.value = unwrapRows(res);
    total.value = unwrapTotal(res);
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.pageNum = 1;
  queryParams.bizType = '';
  queryParams.actionType = '';
  queryParams.bizNo = '';
  getList();
}

async function openDetail(row: BizFinanceOperationLogVO) {
  if (!row.id) return;
  const res = await fetchFinanceOperationLogDetail(row.id);
  detail.value = res?.data || res;
  showDetailDrawer.value = true;
}

const columns = [
  { title: 'ID', key: 'id', width: 120 },
  { title: '业务类型', key: 'bizType', width: 140 },
  { title: '业务编号', key: 'bizNo', width: 180 },
  { title: '动作', key: 'actionType', width: 160 },
  { title: '标题', key: 'title', minWidth: 220, ellipsis: { tooltip: true } },
  { title: '操作人', key: 'operatorName', width: 130 },
  { title: '备注', key: 'remark', minWidth: 220, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    fixed: 'right' as const,
    render(row: BizFinanceOperationLogVO) {
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
        <NFormItem label="业务类型">
          <NInput v-model:value="queryParams.bizType" clearable placeholder="业务类型" />
        </NFormItem>
        <NFormItem label="动作">
          <NInput v-model:value="queryParams.actionType" clearable placeholder="动作类型" />
        </NFormItem>
        <NFormItem label="业务编号">
          <NInput v-model:value="queryParams.bizNo" clearable placeholder="业务编号" />
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
        :scroll-x="1200"
      />
    </NCard>

    <NDrawer v-model:show="showDetailDrawer" :width="640">
      <NDrawerContent title="财务操作日志详情">
        <pre class="whitespace-pre-wrap">{{ JSON.stringify(detail, null, 2) }}</pre>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>
