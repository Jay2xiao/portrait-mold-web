<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NSpace,
  NSpin,
  NTag,
  useMessage
} from 'naive-ui';
import {
  fetchRepairReviewDetail,
  fetchRepairReviewList,
  type RepairReviewVO
} from '@/service/api/biz/repair-review';
import BizFileThumbs from '@/views/biz/components/BizFileThumbs.vue';

defineOptions({
  name: 'BizRepairReview'
});

const message = useMessage();

const loading = ref(false);
const tableData = ref<RepairReviewVO[]>([]);
const total = ref(0);
const showDetailDrawer = ref(false);
const detailLoading = ref(false);
const currentRecord = ref<RepairReviewVO | null>(null);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  taskId: '',
  orderId: '',
  reviewerName: '',
  reviewResult: '',
  reviewNode: ''
});

const reviewResultOptions = [
  { label: '通过', value: 'PASS' },
  { label: '驳回', value: 'REJECT' }
];

const reviewNodeOptions = [
  { label: '效果图审核', value: 'PREVIEW_REVIEW' },
  { label: '模型检测', value: 'MODEL_CHECK' },
  { label: '打印质检驳回', value: 'PRINT_QC_REJECT' }
];

function unwrapRows(res: any) {
  const data = res?.data || res;
  if (Array.isArray(data)) return data;
  return data?.rows || [];
}

function unwrapTotal(res: any) {
  const data = res?.data || res;
  return data?.total || 0;
}

function unwrapData(res: any) {
  return res?.data || res;
}

function reviewResultLabel(value?: string) {
  if (value === 'PASS') return '通过';
  if (value === 'REJECT') return '驳回';
  return value || '-';
}

function reviewResultTagType(value?: string) {
  if (value === 'PASS') return 'success';
  if (value === 'REJECT') return 'error';
  return 'default';
}

function reviewNodeLabel(value?: string) {
  if (value === 'PREVIEW_REVIEW') return '效果图审核';
  if (value === 'MODEL_CHECK') return '模型检测';
  if (value === 'PRINT_QC_REJECT') return '打印质检驳回';
  return value || '-';
}

function rejectModeLabel(value?: string) {
  if (value === 'REWORK') return '打回重新修模';
  if (value === 'RESUBMIT_MODEL') return '重新上传模型';
  return value || '-';
}

function cleanParams() {
  return {
    pageNum: queryParams.pageNum,
    pageSize: queryParams.pageSize,
    taskId: queryParams.taskId || undefined,
    orderId: queryParams.orderId || undefined,
    reviewerName: queryParams.reviewerName || undefined,
    reviewResult: queryParams.reviewResult || undefined,
    reviewNode: queryParams.reviewNode || undefined
  };
}

const columns = [
  {
    title: '任务ID',
    key: 'taskId',
    width: 170
  },
  {
    title: '订单ID',
    key: 'orderId',
    width: 170
  },
  {
    title: '审核节点',
    key: 'reviewNode',
    width: 140,
    render(row: RepairReviewVO) {
      return reviewNodeLabel(row.reviewNode);
    }
  },
  {
    title: '审核结果',
    key: 'reviewResult',
    width: 110,
    render(row: RepairReviewVO) {
      return h(
        NTag,
        { type: reviewResultTagType(row.reviewResult) as any },
        { default: () => reviewResultLabel(row.reviewResult) }
      );
    }
  },
  {
    title: '驳回方式',
    key: 'rejectMode',
    width: 140,
    render(row: RepairReviewVO) {
      return rejectModeLabel(row.rejectMode);
    }
  },
  {
    title: '审核人',
    key: 'reviewerName',
    width: 130,
    render(row: RepairReviewVO) {
      return row.reviewerName || '-';
    }
  },
  {
    title: '审核意见',
    key: 'comment',
    minWidth: 220,
    ellipsis: {
      tooltip: true
    },
    render(row: RepairReviewVO) {
      return row.comment || '-';
    }
  },
  {
    title: '创建时间',
    key: 'createTime',
    width: 170
  },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    fixed: 'right' as const,
    render(row: RepairReviewVO) {
      return h(
        NButton,
        { size: 'small', type: 'primary', secondary: true, onClick: () => openDetail(row) },
        { default: () => '详情' }
      );
    }
  }
];

async function getList() {
  loading.value = true;
  try {
    const res = await fetchRepairReviewList(cleanParams());
    tableData.value = unwrapRows(res);
    total.value = unwrapTotal(res);
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.taskId = '';
  queryParams.orderId = '';
  queryParams.reviewerName = '';
  queryParams.reviewResult = '';
  queryParams.reviewNode = '';
  queryParams.pageNum = 1;
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

async function openDetail(row: RepairReviewVO) {
  if (!row.id) {
    message.warning('记录ID为空');
    return;
  }

  showDetailDrawer.value = true;
  detailLoading.value = true;
  currentRecord.value = null;
  try {
    const res = await fetchRepairReviewDetail(row.id);
    currentRecord.value = unwrapData(res);
  } finally {
    detailLoading.value = false;
  }
}

onMounted(getList);
</script>

<template>
  <NSpace vertical :size="16">
    <NCard title="修模审核记录" :bordered="false">
      <NForm inline :show-feedback="false" label-placement="left">
        <NFormItem label="任务ID">
          <NInput v-model:value="queryParams.taskId" clearable placeholder="请输入任务ID" />
        </NFormItem>
        <NFormItem label="订单ID">
          <NInput v-model:value="queryParams.orderId" clearable placeholder="请输入订单ID" />
        </NFormItem>
        <NFormItem label="审核人">
          <NInput v-model:value="queryParams.reviewerName" clearable placeholder="请输入审核人" />
        </NFormItem>
        <NFormItem label="审核节点">
          <NSelect
            v-model:value="queryParams.reviewNode"
            clearable
            placeholder="请选择"
            :options="reviewNodeOptions"
            style="width: 150px"
          />
        </NFormItem>
        <NFormItem label="审核结果">
          <NSelect
            v-model:value="queryParams.reviewResult"
            clearable
            placeholder="请选择"
            :options="reviewResultOptions"
            style="width: 120px"
          />
        </NFormItem>
        <NSpace>
          <NButton type="primary" @click="getList">查询</NButton>
          <NButton @click="resetQuery">重置</NButton>
        </NSpace>
      </NForm>
    </NCard>

    <NCard :bordered="false">
      <NDataTable
        remote
        :loading="loading"
        :columns="columns"
        :data="tableData"
        :scroll-x="1340"
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
    </NCard>

    <NDrawer v-model:show="showDetailDrawer" width="720" placement="right">
      <NDrawerContent title="修模审核记录详情" closable>
        <NSpin :show="detailLoading">
          <NDescriptions v-if="currentRecord" bordered :column="2" size="small">
            <NDescriptionsItem label="记录ID">{{ currentRecord.id || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="审核轮次">{{ currentRecord.reviewRound || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="任务ID">{{ currentRecord.taskId || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="订单ID">{{ currentRecord.orderId || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="审核节点">{{ reviewNodeLabel(currentRecord.reviewNode) }}</NDescriptionsItem>
            <NDescriptionsItem label="审核类型">{{ currentRecord.reviewType || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="审核结果">
              <NTag :type="reviewResultTagType(currentRecord.reviewResult) as any">
                {{ reviewResultLabel(currentRecord.reviewResult) }}
              </NTag>
            </NDescriptionsItem>
            <NDescriptionsItem label="驳回方式">
              {{ rejectModeLabel(currentRecord.rejectMode) }}
            </NDescriptionsItem>
            <NDescriptionsItem label="驳回原因编码">
              {{ currentRecord.reasonCode || '-' }}
            </NDescriptionsItem>
            <NDescriptionsItem label="审核人">
              {{ currentRecord.reviewerName || currentRecord.reviewerId || '-' }}
            </NDescriptionsItem>
            <NDescriptionsItem label="审核意见" :span="2">
              {{ currentRecord.comment || '-' }}
            </NDescriptionsItem>
            <NDescriptionsItem label="审核附件" :span="2">
              <BizFileThumbs
                :file-ids="currentRecord.attachmentIds"
                mode="auto"
                :max="8"
                :thumb-size="60"
                show-name
              />
            </NDescriptionsItem>
            <NDescriptionsItem label="创建时间">{{ currentRecord.createTime || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="更新时间">{{ currentRecord.updateTime || '-' }}</NDescriptionsItem>
          </NDescriptions>
        </NSpin>
      </NDrawerContent>
    </NDrawer>
  </NSpace>
</template>
