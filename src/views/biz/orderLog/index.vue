<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import { NButton, NCard, NDataTable, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSpace } from 'naive-ui';
import { fetchOrderLogDetail, fetchOrderLogList, type BizOrderLogVO } from '@/service/api/biz/order-log';

defineOptions({ name: 'BizOrderLog' });

const loading = ref(false);
const tableData = ref<BizOrderLogVO[]>([]);
const total = ref(0);
const showDetailDrawer = ref(false);
const detail = ref<BizOrderLogVO | null>(null);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  orderId: '',
  actionType: '',
  operatorName: '',
  content: ''
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
    const res = await fetchOrderLogList(queryParams);
    tableData.value = unwrapRows(res);
    total.value = unwrapTotal(res);
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.pageNum = 1;
  queryParams.orderId = '';
  queryParams.actionType = '';
  queryParams.operatorName = '';
  queryParams.content = '';
  getList();
}

async function openDetail(row: BizOrderLogVO) {
  if (!row.id) return;
  const res = await fetchOrderLogDetail(row.id);
  detail.value = res?.data || res;
  showDetailDrawer.value = true;
}

const columns = [
  { title: '时间', key: 'createTime', width: 170 },
  { title: '订单ID', key: 'orderId', width: 160 },
  { title: '动作', key: 'actionType', width: 130 },
  { title: '原状态', key: 'fromStatus', width: 130 },
  { title: '新状态', key: 'toStatus', width: 130 },
  { title: '操作人', key: 'operatorName', width: 120 },
  { title: '内容', key: 'content', minWidth: 260, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    fixed: 'right' as const,
    render(row: BizOrderLogVO) {
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
        <NFormItem label="订单ID">
          <NInput v-model:value="queryParams.orderId" clearable placeholder="订单ID" />
        </NFormItem>
        <NFormItem label="动作">
          <NInput v-model:value="queryParams.actionType" clearable placeholder="动作类型" />
        </NFormItem>
        <NFormItem label="操作人">
          <NInput v-model:value="queryParams.operatorName" clearable placeholder="操作人" />
        </NFormItem>
        <NFormItem label="内容">
          <NInput v-model:value="queryParams.content" clearable placeholder="内容关键字" />
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

    <NDrawer v-model:show="showDetailDrawer" :width="520">
      <NDrawerContent title="订单操作日志详情">
        <pre class="whitespace-pre-wrap">{{ JSON.stringify(detail, null, 2) }}</pre>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>
