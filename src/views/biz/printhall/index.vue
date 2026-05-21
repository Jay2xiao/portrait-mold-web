<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NSpace,
  NTag,
  useMessage
} from 'naive-ui';

import {
  claimPrintTask,
  fetchPrintHallList,
  type PrintTaskVO
} from '@/service/api/biz/print-task';

import BizFileViewer from '@/views/biz/components/BizFileViewer.vue';

defineOptions({
  name: 'BizPrintHall'
});

const message = useMessage();

const loading = ref(false);
const tableData = ref<PrintTaskVO[]>([]);
const total = ref(0);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  orderNoSnapshot: '',
  customerNameSnapshot: '',
  productNameSnapshot: ''
});

const columns = [
  {
    title: '任务号',
    key: 'taskNo',
    width: 160
  },
  {
    title: '订单号',
    key: 'orderNoSnapshot',
    width: 160
  },
  {
    title: '客户',
    key: 'customerNameSnapshot',
    width: 120
  },
  {
    title: '产品',
    key: 'productNameSnapshot',
    width: 180
  },
  {
    title: '输入模型',
    key: 'inputModelFileIds',
    width: 180,
    render(row: PrintTaskVO) {
      return h(BizFileViewer, {
        fileIds: row.inputModelFileIds,
        mode: 'download',
        max: 2
      });
    }
  },
  {
    title: '预估价',
    key: 'estimateAmount',
    width: 100
  },
  {
    title: '优先级',
    key: 'priority',
    width: 100
  },
  {
    title: '状态',
    key: 'status',
    width: 120,
    render() {
      return h(NTag, { type: 'warning' }, { default: () => '待接单' });
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right' as const,
    render(row: PrintTaskVO) {
      return h(
        NButton,
        {
          size: 'small',
          type: 'primary',
          disabled: row.status !== 'WAIT_CLAIM',
          onClick: () => handleClaim(row)
        },
        { default: () => '接单' }
      );
    }
  }
];

async function getList() {
  loading.value = true;
  try {
    const res = await fetchPrintHallList(queryParams);
    const data = res.data || res;
    tableData.value = data.rows || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.orderNoSnapshot = '';
  queryParams.customerNameSnapshot = '';
  queryParams.productNameSnapshot = '';
  queryParams.pageNum = 1;
  getList();
}

async function handleClaim(row: PrintTaskVO) {
  if (!row.id) return;

  await claimPrintTask(row.id);
  message.success('接单成功，任务已进入我的打印任务');
  getList();
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
  <NCard title="打印任务大厅" :bordered="false">
    <NSpace vertical :size="16">
      <NForm inline label-placement="left">
        <NFormItem label="订单号">
          <NInput v-model:value="queryParams.orderNoSnapshot" placeholder="请输入订单号" clearable />
        </NFormItem>

        <NFormItem label="客户">
          <NInput v-model:value="queryParams.customerNameSnapshot" placeholder="请输入客户" clearable />
        </NFormItem>

        <NFormItem label="产品">
          <NInput v-model:value="queryParams.productNameSnapshot" placeholder="请输入产品" clearable />
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
        :single-line="false"
        :loading="loading"
        :columns="columns"
        :data="tableData"
        :scroll-x="2200"
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
</template>
