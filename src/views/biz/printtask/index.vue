<script setup lang="ts">
import {h, onMounted, reactive, ref, VNodeChild, watch} from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPopconfirm,
  NSelect,
  NSpace,
  NTag,
  useMessage
} from 'naive-ui';

import {
  assignPrintTask,
  fetchPrintTaskList,
  qcPrintTask,
  reassignPrintTask,
  withdrawPrintTask,
  type PrintTaskVO
} from '@/service/api/biz/print-task';

import { fetchPrinterOptions } from '@/service/api/biz/printer';
import BizFileViewer from '@/views/biz/components/BizFileViewer.vue';
import BizFileUpload from '@/views/biz/components/BizFileUpload.vue';

defineOptions({
  name: 'BizPrintTask'
});

import { useRoute } from 'vue-router';

const route = useRoute();


const message = useMessage();

const loading = ref(false);
const tableData = ref<PrintTaskVO[]>([]);
const total = ref(0);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  taskNo: '',
  orderNoSnapshot: '',
  customerNameSnapshot: '',
  productNameSnapshot: '',
  mine: false,
  needMaterialRecord: false,
  status: ''
});

const currentTask = ref<PrintTaskVO | null>(null);

const printerOptions = ref<any[]>([]);

const showQcModal = ref(false);
const qcAttachmentFileIdList = ref<Array<string | number>>([]);

const qcForm = reactive({
  qcResult: 'PASS',
  reasonCode: '',
  comment: '',
  attachmentFileIds: ''
});

const showAssignModal = ref(false);
const assignMode = ref<'assign' | 'reassign'>('assign');

const assignForm = reactive({
  printerUserId: undefined as string | number | undefined,
  remark: ''
});

const statusOptions = [
  { label: '待打印检测', value: 'WAIT_QC' },
  { label: '打印检测驳回', value: 'QC_REJECTED' },
  { label: '待接单', value: 'WAIT_CLAIM' },
  { label: '待开始打印', value: 'WAIT_START' },
  { label: '打印中', value: 'PRINTING' },
  { label: '待材料录入', value: 'WAIT_MATERIAL_RECORD' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已取消', value: 'CANCELLED' }
];

const qcResultOptions = [
  { label: '通过', value: 'PASS' },
  { label: '驳回', value: 'REJECT' }
];

function statusLabel(value?: string) {
  return statusOptions.find(item => item.value === value)?.label || value || '-';
}

function statusTagType(value?: string) {
  if (value === 'COMPLETED') return 'success';
  if (value === 'QC_REJECTED' || value === 'CANCELLED') return 'error';
  if (value === 'WAIT_QC') return 'warning';
  if (value === 'PRINTING') return 'info';
  return 'default';
}

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
    width: 160
  },
  {
    title: '输入模型',
    key: 'inputModelFileIds',
    width: 160,
    render(row: PrintTaskVO) {
      return h(BizFileViewer, {
        fileIds: row.inputModelFileIds,
        mode: 'download',
        max: 2
      });
    }
  },
  {
    title: '打印员',
    key: 'printerName',
    width: 120,
    render(row: PrintTaskVO) {
      return row.printerName || '-';
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 130,
    render(row: PrintTaskVO) {
      return h(
        NTag,
        { type: statusTagType(row.status) as any },
        { default: () => statusLabel(row.status) }
      );
    }
  },
  {
    title: '预估价',
    key: 'estimateAmount',
    width: 100
  },
  {
    title: '押金',
    key: 'depositAmount',
    width: 100
  },
  {
    title: '检测意见',
    key: 'qcReason',
    width: 180,
    ellipsis: {
      tooltip: true
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
    width: 360,
    fixed: 'right' as const,
    render(row: PrintTaskVO) {
      const buttons: VNodeChild[] = [];

      if (row.status === 'WAIT_QC') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => openQc(row)
            },
            { default: () => '打印检测' }
          )
        );
      }

      if (row.status === 'WAIT_CLAIM') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => openAssign(row)
            },
            { default: () => '指派' }
          )
        );
      }

      if (row.status === 'WAIT_START') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'warning',
              onClick: () => openReassign(row)
            },
            { default: () => '改派' }
          )
        );

        buttons.push(
          h(
            NPopconfirm,
            {
              onPositiveClick: () => handleWithdraw(row)
            },
            {
              trigger: () =>
                h(
                  NButton,
                  {
                    size: 'small',
                    type: 'error'
                  },
                  { default: () => '撤回' }
                ),
              default: () => '确认撤回该打印任务吗？'
            }
          )
        );
      }

      if (buttons.length === 0) {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              disabled: true
            },
            { default: () => '无操作' }
          )
        );
      }

      return h(
        NSpace,
        {},
        {
          default: () => buttons
        }
      );
    }
  }
];

async function getList() {
  loading.value = true;
  try {
    const res = await fetchPrintTaskList(queryParams);
    const data = res.data || res;
    tableData.value = data.rows || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.taskNo = '';
  queryParams.orderNoSnapshot = '';
  queryParams.customerNameSnapshot = '';
  queryParams.productNameSnapshot = '';
  queryParams.status = '';
  queryParams.pageNum = 1;
  getList();
}

async function loadPrinters() {
  const res = await fetchPrinterOptions();
  const data = res.data || res;
  printerOptions.value = data || [];
}

function openQc(row: PrintTaskVO) {
  currentTask.value = row;
  qcForm.qcResult = 'PASS';
  qcForm.reasonCode = '';
  qcForm.comment = '';
  qcForm.attachmentFileIds = '';
  qcAttachmentFileIdList.value = row.qcAttachmentFileIds ? row.qcAttachmentFileIds.split(',') : [];
  showQcModal.value = true;
}

async function submitQc() {
  if (!currentTask.value?.id) return;

  if (qcForm.qcResult === 'REJECT' && !qcForm.comment) {
    message.warning('驳回时请填写检测意见');
    return;
  }

  await qcPrintTask(currentTask.value.id, {
    qcResult: qcForm.qcResult,
    reasonCode: qcForm.reasonCode,
    comment: qcForm.comment,
    attachmentFileIds: qcAttachmentFileIdList.value.join(',')
  });

  message.success('打印检测完成');
  showQcModal.value = false;
  getList();
}

async function openAssign(row: PrintTaskVO) {
  currentTask.value = row;
  assignMode.value = 'assign';
  assignForm.printerUserId = undefined;
  assignForm.remark = '';
  await loadPrinters();
  showAssignModal.value = true;
}

async function openReassign(row: PrintTaskVO) {
  currentTask.value = row;
  assignMode.value = 'reassign';
  assignForm.printerUserId = row.printerUserId;
  assignForm.remark = '';
  await loadPrinters();
  showAssignModal.value = true;
}

async function submitAssignOrReassign() {
  if (!currentTask.value?.id) return;

  if (!assignForm.printerUserId) {
    message.warning('请选择打印员');
    return;
  }

  if (assignMode.value === 'assign') {
    await assignPrintTask(currentTask.value.id, assignForm);
    message.success('指派成功');
  } else {
    await reassignPrintTask(currentTask.value.id, assignForm);
    message.success('改派成功');
  }

  showAssignModal.value = false;
  getList();
}

async function handleWithdraw(row: PrintTaskVO) {
  if (!row.id) return;

  await withdrawPrintTask(row.id, {
    reason: '管理员撤回',
    remark: ''
  });

  message.success('撤回成功，任务已回到大厅');
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

function queryString(value: any) {
  if (Array.isArray(value)) return value[0] ? String(value[0]) : '';
  if (value === undefined || value === null) return '';
  return String(value);
}

function queryBoolean(value: any) {
  if (Array.isArray(value)) return value[0] === 'true' || value[0] === '1';
  return value === true || value === 'true' || value === '1';
}

function applyRouteQuery() {
  const q = route.query;

  if ('status' in q) {
    queryParams.status = queryString(q.status);
  }

  if ('mine' in q) {
    queryParams.mine = queryBoolean(q.mine);
  }

  if ('needMaterialRecord' in q) {
    queryParams.needMaterialRecord = queryBoolean(q.needMaterialRecord);
  }

  queryParams.pageNum = 1;
}



onMounted(() => {
  applyRouteQuery();
  getList();
});

watch(
  () => route.fullPath,
  () => {
    applyRouteQuery();
    getList();
  }
);

</script>

<template>
  <NCard title="打印任务管理" :bordered="false">
    <NSpace vertical :size="16">
      <NForm inline label-placement="left">
        <NFormItem label="任务号">
          <NInput v-model:value="queryParams.taskNo" placeholder="请输入任务号" clearable />
        </NFormItem>

        <NFormItem label="订单号">
          <NInput v-model:value="queryParams.orderNoSnapshot" placeholder="请输入订单号" clearable />
        </NFormItem>

        <NFormItem label="客户">
          <NInput v-model:value="queryParams.customerNameSnapshot" placeholder="请输入客户" clearable />
        </NFormItem>

        <NFormItem label="产品">
          <NInput v-model:value="queryParams.productNameSnapshot" placeholder="请输入产品" clearable />
        </NFormItem>

        <NFormItem label="状态">
          <NSelect
            v-model:value="queryParams.status"
            :options="statusOptions"
            clearable
            style="width: 150px"
          />
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

    <NModal v-model:show="showQcModal" preset="card" title="打印检测" style="width: 720px">
      <NForm label-placement="left" label-width="110">
        <NFormItem label="输入模型">
          <BizFileViewer
            :file-ids="currentTask?.inputModelFileIds"
            mode="download"
            :max="5"
          />
        </NFormItem>

        <NFormItem label="检测结果">
          <NSelect v-model:value="qcForm.qcResult" :options="qcResultOptions" />
        </NFormItem>

        <NFormItem label="原因编码">
          <NInput v-model:value="qcForm.reasonCode" placeholder="例如 MODEL_BROKEN / SIZE_ERROR" />
        </NFormItem>

        <NFormItem label="检测意见">
          <NInput v-model:value="qcForm.comment" type="textarea" placeholder="请输入检测意见" />
        </NFormItem>

        <NFormItem label="检测附件">
          <BizFileUpload
            v-model="qcAttachmentFileIdList"
            biz-type="PRINT_TASK"
            :biz-id="currentTask?.id"
            :order-id="currentTask?.orderId"
            :task-id="currentTask?.id"
            file-stage="PRINT_QC"
            file-type="PRINT_QC_ATTACHMENT"
            :max="10"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showQcModal = false">取消</NButton>
          <NButton type="primary" @click="submitQc">提交检测</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal
      v-model:show="showAssignModal"
      preset="card"
      :title="assignMode === 'assign' ? '指派打印员' : '改派打印员'"
      style="width: 560px"
    >
      <NForm label-placement="left" label-width="110">
        <NFormItem label="打印员" required>
          <NSelect
            v-model:value="assignForm.printerUserId"
            :options="printerOptions"
            filterable
            clearable
            placeholder="请选择打印员"
          />
        </NFormItem>

        <NFormItem label="备注">
          <NInput v-model:value="assignForm.remark" type="textarea" placeholder="请输入备注" />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showAssignModal = false">取消</NButton>
          <NButton type="primary" @click="submitAssignOrReassign">
            {{ assignMode === 'assign' ? '确认指派' : '确认改派' }}
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </NCard>
</template>
