<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import { NButton, NCard, NDataTable, NDrawer, NDrawerContent, NForm, NFormItem, NInput, NSpace } from 'naive-ui';
import {
  fetchTenantResourceOrderDetail,
  fetchTenantResourceOrderList,
  type BizTenantResourceOrderVO
} from '@/service/api/biz/tenant-resource-order';

defineOptions({ name: 'BizTenantResourceOrder' });

const loading = ref(false);
const tableData = ref<BizTenantResourceOrderVO[]>([]);
const total = ref(0);
const showDetailDrawer = ref(false);
const detail = ref<BizTenantResourceOrderVO | null>(null);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  packageType: '',
  status: ''
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
    const res = await fetchTenantResourceOrderList(queryParams);
    tableData.value = unwrapRows(res);
    total.value = unwrapTotal(res);
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.pageNum = 1;
  queryParams.packageType = '';
  queryParams.status = '';
  getList();
}

async function openDetail(row: BizTenantResourceOrderVO) {
  if (!row.id) return;
  const res = await fetchTenantResourceOrderDetail(row.id);
  detail.value = res?.data || res;
  showDetailDrawer.value = true;
}

const columns = [
  { title: 'ID', key: 'id', width: 120 },
  { title: '套餐类型', key: 'packageType', width: 130 },
  { title: '购买GB', key: 'packageGb', width: 110 },
  { title: '金额', key: 'amount', width: 110 },
  { title: '开始日期', key: 'periodStart', width: 170 },
  { title: '结束日期', key: 'periodEnd', width: 170 },
  { title: '状态', key: 'status', width: 120 },
  { title: '备注', key: 'remark', minWidth: 220, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    fixed: 'right' as const,
    render(row: BizTenantResourceOrderVO) {
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
        <NFormItem label="套餐类型">
          <NInput v-model:value="queryParams.packageType" clearable placeholder="STORAGE / TRAFFIC" />
        </NFormItem>
        <NFormItem label="状态">
          <NInput v-model:value="queryParams.status" clearable placeholder="WAIT_PAY / PAID / CANCELLED" />
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
      <NDrawerContent title="资源购买记录详情">
        <pre class="whitespace-pre-wrap">{{ JSON.stringify(detail, null, 2) }}</pre>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>
