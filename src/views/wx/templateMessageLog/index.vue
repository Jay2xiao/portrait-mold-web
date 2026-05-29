<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NSpace,
  NTag
} from 'naive-ui';
import {
  fetchResendWxTemplateMessageLog,
  fetchWxTemplateMessageLogList,
  type WxTemplateMessageLogVO
} from '@/service/api/wx/template-message-log';

defineOptions({ name: 'WxTemplateMessageLog' });

const loading = ref(false);
const resendLoadingId = ref<string | number | null>(null);
const tableData = ref<WxTemplateMessageLogVO[]>([]);
const total = ref(0);
const showDetailDrawer = ref(false);
const detail = ref<WxTemplateMessageLogVO | null>(null);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  bizType: '',
  bizNo: '',
  status: ''
});

const statusOptions = [
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAILED' },
  { label: '跳过', value: 'SKIPPED' }
];

function unwrapRows(res: any) {
  const data = res?.data || res;
  return data?.rows || [];
}

function unwrapTotal(res: any) {
  const data = res?.data || res;
  return data?.total || 0;
}

function statusType(status?: string) {
  if (status === 'SUCCESS') return 'success';
  if (status === 'FAILED') return 'error';
  if (status === 'SKIPPED') return 'warning';
  return 'default';
}

async function getList() {
  loading.value = true;
  try {
    const res = await fetchWxTemplateMessageLogList(queryParams);
    tableData.value = unwrapRows(res);
    total.value = unwrapTotal(res);
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.pageNum = 1;
  queryParams.bizType = '';
  queryParams.bizNo = '';
  queryParams.status = '';
  getList();
}

function openDetail(row: WxTemplateMessageLogVO) {
  detail.value = row;
  showDetailDrawer.value = true;
}

async function handleResend(row: WxTemplateMessageLogVO) {
  if (!row.id) return;
  resendLoadingId.value = row.id;
  try {
    await fetchResendWxTemplateMessageLog(row.id);
    window.$message?.success('已提交重发');
    await getList();
  } finally {
    resendLoadingId.value = null;
  }
}

const columns = [
  { title: '发送时间', key: 'createTime', width: 170 },
  { title: '业务类型', key: 'bizType', width: 130 },
  { title: '业务编号', key: 'bizNo', width: 180, ellipsis: { tooltip: true } },
  { title: '接收用户ID', key: 'receiverUserId', width: 130 },
  { title: '模板ID', key: 'templateId', width: 180, ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render(row: WxTemplateMessageLogVO) {
      return h(NTag, { type: statusType(row.status), size: 'small' }, { default: () => row.status || '-' });
    }
  },
  { title: '标题', key: 'title', minWidth: 220, ellipsis: { tooltip: true } },
  { title: '错误信息', key: 'errorMsg', minWidth: 260, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    fixed: 'right' as const,
    render(row: WxTemplateMessageLogVO) {
      return h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, { size: 'small', onClick: () => openDetail(row) }, { default: () => '详情' }),
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              ghost: true,
              loading: resendLoadingId.value === row.id,
              disabled: !row.notificationId,
              onClick: () => handleResend(row)
            },
            { default: () => '重发' }
          )
        ]
      });
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
        <NFormItem label="业务编号">
          <NInput v-model:value="queryParams.bizNo" clearable placeholder="业务编号" />
        </NFormItem>
        <NFormItem label="状态">
          <NSelect v-model:value="queryParams.status" clearable :options="statusOptions" placeholder="发送状态" class="w-120px" />
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
        :pagination="{
          page: queryParams.pageNum,
          pageSize: queryParams.pageSize,
          itemCount: total,
          showSizePicker: true,
          pageSizes: [10, 20, 50],
          onUpdatePage: (page: number) => {
            queryParams.pageNum = page;
            getList();
          },
          onUpdatePageSize: (pageSize: number) => {
            queryParams.pageSize = pageSize;
            queryParams.pageNum = 1;
            getList();
          }
        }"
        :scroll-x="1500"
      />
    </NCard>

    <NDrawer v-model:show="showDetailDrawer" :width="640">
      <NDrawerContent title="微信通知日志详情">
        <pre class="whitespace-pre-wrap">{{ JSON.stringify(detail, null, 2) }}</pre>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>
