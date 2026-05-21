<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import { NButton, NCard, NDataTable, NForm, NFormItem, NInput, NSpace, NTag, useMessage } from 'naive-ui';
import { claimRepairTask, fetchRepairHallList, type RepairTaskVO } from '@/service/api/biz/repair-task';

import BizFileViewer from '@/views/biz/components/BizFileViewer.vue';
import BizFileThumbs from '@/views/biz/components/BizFileThumbs.vue';
import { deadlineTagType, deadlineText } from '@/utils/biz/deadline';


defineOptions({ name: 'BizRepairHall' });

const message = useMessage();
const loading = ref(false);
const tableData = ref<RepairTaskVO[]>([]);
const total = ref(0);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  orderNoSnapshot: '',
  customerNameSnapshot: '',
  productNameSnapshot: ''
});

const columns = [
  { title: '任务号', key: 'taskNo', width: 160,fixed: 'left' as const },
  { title: '订单号', key: 'orderNoSnapshot', width: 160,fixed: 'left' as const },
  { title: '客户', key: 'customerNameSnapshot', width: 120,fixed: 'left' as const },
  { title: '产品', key: 'productNameSnapshot', width: 180 },
  { title: '优先级', key: 'priority', width: 100 },{
    title: '修模截止',
    key: 'deadlineTime',
    width: 180,
    render(row: RepairTaskVO) {
      return h(
        NTag,
        { type: deadlineTagType(row.deadlineTime, row.timeoutFlag) as any },
        { default: () => deadlineText(row.deadlineTime, row.timeoutFlag) }
      );
    }
  },
  {
    title: '截止时间',
    key: 'deadlineTime',
    width: 170
  },
  {
    title: '超时原因',
    key: 'cancelReason',
    width: 200,
    ellipsis: {
      tooltip: true
    }
  },
  { title: '人工修模费', key: 'quoteManualAmount', width: 120 },
  { title: '总价', key: 'quoteTotalAmount', width: 100 },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render() {
      return h(NTag, { type: 'warning' }, { default: () => '待接单' });
    }
  },
  {
    title: '原图',
    key: 'originalImageFileIds',
    width: 90,
    render(row: RepairTaskVO) {
      if (!row.originalImageFileIds || row.originalImageFileIds.length === 0) {
        return '';
      }
      return h(BizFileThumbs, {
        fileIds: row.originalImageFileIds,
        mode: 'image',
        max: 1,
        thumbSize: 48
      });
    }
  },
  {
    title: '备注图',
    key: 'remarkImageFileIds',
    width: 90,
    render(row: RepairTaskVO) {
      if (!row.remarkImageFileIds || row.remarkImageFileIds.length === 0) {
        return '';
      }
      return h(BizFileThumbs, {
        fileIds: row.remarkImageFileIds,
        mode: 'image',
        max: 1,
        thumbSize: 48
      });
    }
  },
  {
    title: 'AI模型',
    key: 'aiBaseModelFileIds',
    width: 130,
    render(row: RepairTaskVO) {
      if (!row.aiBaseModelFileIds || row.aiBaseModelFileIds.length === 0) {
        return '';
      }
      return h(BizFileThumbs, {
        fileIds: row.aiBaseModelFileIds,
        mode: 'download',
        max: 1
      });
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 260,
    fixed: 'right' as const,
    render(row: RepairTaskVO) {
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
    const res = await fetchRepairHallList(queryParams);
    const data = res.data || res;
    tableData.value = data.rows || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

async function handleClaim(row: RepairTaskVO) {
  if (!row.id) return;

  await claimRepairTask(row.id);
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

onMounted(getList);
</script>

<template>
  <NCard title="修模任务大厅" :bordered="false">
    <NSpace vertical :size="16">
      <NForm inline>
        <NFormItem label="订单号">
          <NInput v-model:value="queryParams.orderNoSnapshot" clearable />
        </NFormItem>
        <NFormItem label="客户">
          <NInput v-model:value="queryParams.customerNameSnapshot" clearable />
        </NFormItem>
        <NFormItem label="产品">
          <NInput v-model:value="queryParams.productNameSnapshot" clearable />
        </NFormItem>
        <NFormItem>
          <NButton type="primary" @click="getList">查询</NButton>
        </NFormItem>
      </NForm>

      <NDataTable
        remote
        size="small"
        :single-line="false"
        :loading="loading"
        :columns="columns"
        :data="tableData"
        :scroll-x="3000"
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
