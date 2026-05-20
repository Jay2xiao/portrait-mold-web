<script setup lang="ts">
import {h, onMounted, reactive, ref} from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSpace,
  NTag,
  NSpin,
  useMessage
} from 'naive-ui';

import {
  assignRepairTask,
  checkRepairModel,
  createRepairTaskFromOrder,
  fetchRepairRejectRecords,
  fetchRepairTaskList,
  reassignRepairTask,
  RepairRejectRecordVO,
  type RepairTaskVO,
  reviewRepairPreview,
  reviewRepairTask,
  withdrawRepairTask
} from '@/service/api/biz/repair-task';

import {fetchRepairerOptions} from '@/service/api/biz/repairer';

import {useRouter} from 'vue-router';

import BizFileViewer from '@/views/biz/components/BizFileViewer.vue';
import BizFileThumbs from '@/views/biz/components/BizFileThumbs.vue';
import {deadlineTagType, deadlineText} from '@/utils/biz/deadline';
import BizFileUpload from "@/views/biz/components/BizFileUpload.vue";

import { watch } from 'vue';
import { useRoute } from 'vue-router';
import { routeQueryBoolean, routeQueryString } from '@/utils/route-query';


const router = useRouter();

defineOptions({name: 'BizRepairTask'});

const route = useRoute();


const message = useMessage();
const loading = ref(false);
const tableData = ref<RepairTaskVO[]>([]);
const total = ref(0);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  taskNo: '',
  orderNoSnapshot: '',
  customerNameSnapshot: '',
  mine: false,
  modelCheckResult: '',
  status: ''
});
const statusOptions = [
  {label: '待接单', value: 'WAIT_CLAIM'},
  {label: '待修模', value: 'WAIT_START'},
  {label: '修模中', value: 'REPAIRING'},
  {label: '待效果图审核', value: 'WAIT_PREVIEW_REVIEW'},
  {label: '效果图驳回', value: 'PREVIEW_REJECTED'},
  {label: '待上传模型文件', value: 'WAIT_MODEL_UPLOAD'},
  {label: '待模型检测', value: 'WAIT_MODEL_CHECK'},
  {label: '模型检测驳回', value: 'MODEL_REJECTED'},
  {label: '已完成', value: 'COMPLETED'},
  {label: '已取消', value: 'CANCELLED'}
];

const modelRejectModeOptions = [
  {label: '打回重新修模，需要重新提交效果图', value: 'REWORK'},
  {label: '只重新上传模型文件，不重新审核效果图', value: 'RESUBMIT_MODEL'}
];

const checkResultOptions = [
  {label: '通过', value: 'PASS'},
  {label: '驳回', value: 'REJECT'}
];


function statusLabel(value?: string) {
  return statusOptions.find(item => item.value === value)?.label || value || '-';
}

const showCreateModal = ref(false);
const createForm = reactive({
  orderId: undefined as number | undefined,
  assigneeUserId: undefined as number | undefined,
  quoteHdAmount: 0,
  quoteAiAmount: 0,
  quoteManualAmount: 0,
  remark: ''
});

const showReviewModal = ref(false);
const reviewForm = reactive({
  reviewResult: 'PASS',
  reasonCode: '',
  comment: '',
  attachmentIds: ''
});

const currentTask = ref<RepairTaskVO | null>(null);
const previewReviewAttachmentFileIdList = ref<Array<string | number>>([]);
const modelCheckAttachmentFileIdList = ref<Array<string | number>>([]);


const repairerOptions = ref<any[]>([]);

const showAssignModal = ref(false);
const assignMode = ref<'assign' | 'reassign'>('assign');

const assignForm = reactive({
  assigneeUserId: undefined as string | number | undefined,
  deadlineTime: '',
  remark: ''
});

const showPreviewReviewModal = ref(false);
const previewReviewForm = reactive({
  reviewResult: 'PASS',
  reasonCode: '',
  comment: '',
  attachmentIds: ''
});

const showModelCheckModal = ref(false);
const modelCheckForm = reactive({
  checkResult: 'PASS',
  rejectMode: 'RESUBMIT_MODEL',
  reasonCode: '',
  comment: '',
  attachmentIds: ''
});


const columns = [
  {title: '任务号', key: 'taskNo', width: 160, fixed: 'left'},
  {title: '订单号', key: 'orderNoSnapshot', width: 160, fixed: 'left'},
  {title: '客户', key: 'customerNameSnapshot', width: 120, fixed: 'left'},
  {title: '产品', key: 'productNameSnapshot', width: 160},
  {title: '修模师', key: 'assigneeName', width: 120},
  {
    title: '修模截止',
    key: 'deadlineTime',
    width: 190,
    render(row: RepairTaskVO) {
      return h(NSpace, {vertical: true, size: 2}, {
        default: () => [
          h(
            NTag,
            {type: deadlineTagType(row.deadlineTime, row.timeoutFlag) as any},
            {default: () => deadlineText(row.deadlineTime, row.timeoutFlag)}
          ),
          h('span', {style: 'font-size:12px;color:#999;'}, row.deadlineTime || '-')
        ]
      });
    }
  },
  {
    title: '超时原因',
    key: 'cancelReason',
    width: 180,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '截止时间',
    key: 'deadlineTime',
    width: 170
  },
  {
    title: '状态',
    key: 'status',
    width: 120,
    render(row: RepairTaskVO) {
      return h(NTag, {}, {default: () => statusLabel(row.status)});
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
    title: '效果图',
    key: 'previewFileIds',
    width: 90,
    render(row: RepairTaskVO) {
      if (!row.previewFileIds || row.previewFileIds.length === 0) {
        return '';
      }
      return h(BizFileThumbs, {
        fileIds: row.previewFileIds,
        mode: 'image',
        max: 1,
        thumbSize: 48
      });
    }
  },
  {
    title: 'AI生成模型',
    key: 'aiBaseModelFileIds',
    width: 160,
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
    title: '模型文件',
    key: 'modelFileIds',
    width: 130,
    render(row: RepairTaskVO) {
      if (!row.modelFileIds || row.modelFileIds.length === 0) {
        return '';
      }
      return h(BizFileThumbs, {
        fileIds: row.modelFileIds,
        mode: 'download',
        max: 1
      });
    }
  },
  {title: '高清费', key: 'quoteHdAmount', width: 90},
  {title: 'AI费', key: 'quoteAiAmount', width: 90},
  {title: '人工修模费', key: 'quoteManualAmount', width: 120},
  {title: '总价', key: 'quoteTotalAmount', width: 90},
  {
    title: '操作',
    key: 'actions',
    width: 200,
    fixed: 'right',
    render(row: RepairTaskVO) {
      const buttons = [];

      if (row.status === 'WAIT_CLAIM') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => openAssign(row)
            },
            {default: () => '指派'}
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
            {default: () => '改派'}
          )
        );

        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'error',
              onClick: () => handleWithdraw(row)
            },
            {default: () => '撤回'}
          )
        );
      }

      if (row.status === 'WAIT_PREVIEW_REVIEW') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => openPreviewReview(row)
            },
            {default: () => '审核效果图'}
          )
        );
      }

      if (row.status === 'WAIT_MODEL_CHECK') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => openModelCheck(row)
            },
            {default: () => '模型检测'}
          )
        );
      }

      if (['PREVIEW_REJECTED', 'MODEL_REJECTED'].includes(row.status || '')) {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'warning',
              onClick: () => openRejectRecords(row)
            },
            { default: () => '驳回原因' }
          )
        );
      }

      h(NButton, { size: 'small', onClick: () => openRejectRecords(row) }, { default: () => '驳回记录' })


      if (buttons.length === 0) {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              disabled: true
            },
            {default: () => '无操作'}
          )
        );
      }


      buttons.push(h(
          NButton,
          {
            size: 'small',
            onClick: () => openDetail(row)
          },
          {default: () => '详情'}
        )
      );


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
    const res = await fetchRepairTaskList(queryParams);
    const data = res.data || res;
    tableData.value = data.rows || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

async function openCreate() {
  createForm.orderId = undefined;
  createForm.assigneeUserId = undefined;
  createForm.quoteHdAmount = 0;
  createForm.quoteAiAmount = 0;
  createForm.quoteManualAmount = 0;
  createForm.remark = '';
  await loadRepairers();
  showCreateModal.value = true;
}

async function loadRepairers() {
  const res = await fetchRepairerOptions();
  const data = res.data || res;
  repairerOptions.value = data || [];
}

function openDetail(row: RepairTaskVO) {
  router.push({
    path: '/repairtaskdetail',
    query: {
      id: row.id
    }
  });
}

async function openAssign(row: RepairTaskVO) {
  currentTask.value = row;
  assignMode.value = 'assign';
  assignForm.assigneeUserId = undefined;
  assignForm.deadlineTime = '';
  assignForm.remark = '';

  await loadRepairers();
  showAssignModal.value = true;
}

async function openReassign(row: RepairTaskVO) {
  currentTask.value = row;
  assignMode.value = 'reassign';
  assignForm.assigneeUserId = undefined;
  assignForm.deadlineTime = '';
  assignForm.remark = '';

  await loadRepairers();
  showAssignModal.value = true;
}

async function submitAssignOrReassign() {
  if (!currentTask.value?.id) return;

  if (!assignForm.assigneeUserId) {
    message.warning('请选择修模师');
    return;
  }

  if (assignMode.value === 'assign') {
    await assignRepairTask(currentTask.value.id, assignForm);
    message.success('指派成功');
  } else {
    await reassignRepairTask(currentTask.value.id, assignForm);
    message.success('改派成功');
  }

  showAssignModal.value = false;
  getList();
}

async function handleWithdraw(row: RepairTaskVO) {
  if (!row.id) return;

  await withdrawRepairTask(row.id, {
    reason: '管理员撤回',
    remark: ''
  });

  message.success('撤回成功，任务已回到大厅');
  getList();
}

function openPreviewReview(row: RepairTaskVO) {
  currentTask.value = row;
  previewReviewForm.reviewResult = 'PASS';
  previewReviewForm.reasonCode = '';
  previewReviewForm.comment = '';
  previewReviewForm.attachmentIds = '';
  previewReviewAttachmentFileIdList.value = [];
  showPreviewReviewModal.value = true;
}

async function submitPreviewReview() {
  if (!currentTask.value?.id) return;

  if (previewReviewForm.reviewResult === 'REJECT' && !previewReviewForm.comment) {
    message.warning('驳回时请填写审核意见');
    return;
  }

  await reviewRepairPreview(currentTask.value.id, {
    ...previewReviewForm,
    attachmentIds: previewReviewAttachmentFileIdList.value.join(',')
  });

  message.success('效果图审核完成');
  showPreviewReviewModal.value = false;
  getList();
}

function openModelCheck(row: RepairTaskVO) {
  currentTask.value = row;
  modelCheckForm.checkResult = 'PASS';
  modelCheckForm.reasonCode = '';
  modelCheckForm.comment = '';
  modelCheckForm.attachmentIds = '';
  modelCheckAttachmentFileIdList.value = [];
  showModelCheckModal.value = true;
}


async function submitModelCheck() {
  if (!currentTask.value?.id) return;

  if (modelCheckForm.checkResult === 'REJECT' && !modelCheckForm.comment) {
    message.warning('驳回时请填写检测意见');
    return;
  }

  await checkRepairModel(currentTask.value.id, {
    checkResult: modelCheckForm.checkResult,
    rejectMode: modelCheckForm.rejectMode,
    reasonCode: modelCheckForm.reasonCode,
    comment: modelCheckForm.comment,
    attachmentIds: modelCheckAttachmentFileIdList.value.join(',')
  });


  message.success('模型检测完成');
  showModelCheckModal.value = false;
  getList();
}


async function submitCreate() {
  if (!createForm.orderId) {
    message.warning('请输入订单ID');
    return;
  }
  await createRepairTaskFromOrder(createForm);
  showCreateModal.value = false;
  getList();
}

async function submitAssign() {
  if (!currentTask.value?.id) return;
  if (!assignForm.assigneeUserId) {
    message.warning('请选择修模师');
    return;
  }
  await assignRepairTask(currentTask.value.id, assignForm);
  showAssignModal.value = false;
  getList();
}

function openReview(row: RepairTaskVO) {
  currentTask.value = row;
  reviewForm.reviewResult = 'PASS';
  reviewForm.reasonCode = '';
  reviewForm.comment = '';
  reviewForm.attachmentIds = '';
  showReviewModal.value = true;
}

async function submitReview() {
  if (!currentTask.value?.id) return;
  await reviewRepairTask(currentTask.value.id, reviewForm);
  showReviewModal.value = false;
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

const showRejectModal = ref(false);
const rejectRecords = ref<RepairRejectRecordVO[]>([]);
const rejectLoading = ref(false);

function rejectNodeLabel(value?: string) {
  if (value === 'PREVIEW_REVIEW') return '效果图审核';
  if (value === 'MODEL_CHECK') return '模型检测';
  if (value === 'PRINT_QC_REJECT') return '打印前检测';
  return value || '-';
}

function rejectModeLabel(value?: string) {
  if (value === 'REWORK') return '打回重新修模';
  if (value === 'RESUBMIT_MODEL') return '只重新上传模型';
  return value || '-';
}

async function openRejectRecords(row: RepairTaskVO) {
  if (!row.id) return;

  rejectLoading.value = true;
  showRejectModal.value = true;

  try {
    const res = await fetchRepairRejectRecords(row.id);
    const data = res.data || res;
    rejectRecords.value = data || [];
  } finally {
    rejectLoading.value = false;
  }
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
    queryParams.status = routeQueryString(q.status);
  }

  if ('mine' in q) {
    queryParams.mine = routeQueryBoolean(q.mine);
  }

  if ('modelCheckResult' in q) {
    queryParams.modelCheckResult = routeQueryString(q.modelCheckResult);
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
  <NCard title="修模任务管理" :bordered="false">
    <NSpace vertical :size="16">
      <NForm inline>
        <NFormItem label="任务号">
          <NInput v-model:value="queryParams.taskNo" clearable/>
        </NFormItem>
        <NFormItem label="订单号">
          <NInput v-model:value="queryParams.orderNoSnapshot" clearable/>
        </NFormItem>
        <NFormItem label="客户">
          <NInput v-model:value="queryParams.customerNameSnapshot" clearable/>
        </NFormItem>
        <NFormItem label="状态">
          <NSelect v-model:value="queryParams.status" :options="statusOptions" clearable style="width: 140px"/>
        </NFormItem>
        <NFormItem>
          <NSpace>
            <NButton type="primary" @click="getList">查询</NButton>
            <!--            <NButton type="success" @click="openCreate">发布修模任务</NButton>-->
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

    <NModal v-model:show="showCreateModal" preset="card" title="发布修模任务" style="width: 620px">
      <NForm label-placement="left" label-width="110">
        <NFormItem label="订单ID" required>
          <NInputNumber v-model:value="createForm.orderId" style="width: 220px"/>
        </NFormItem>
        <NFormItem label="指派修模师">
          <NSelect v-model:value="createForm.assigneeUserId" :options="repairerOptions" clearable filterable/>
        </NFormItem>
        <NFormItem label="高清处理费">
          <NInputNumber v-model:value="createForm.quoteHdAmount" :min="0"/>
        </NFormItem>
        <NFormItem label="AI建模费">
          <NInputNumber v-model:value="createForm.quoteAiAmount" :min="0"/>
        </NFormItem>
        <NFormItem label="人工修模费">
          <NInputNumber v-model:value="createForm.quoteManualAmount" :min="0"/>
        </NFormItem>
        <NFormItem label="备注">
          <NInput v-model:value="createForm.remark" type="textarea"/>
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showCreateModal = false">取消</NButton>
          <NButton type="primary" @click="submitCreate">发布</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showAssignModal" preset="card" title="指派修模师" style="width: 520px">
      <NForm label-placement="left" label-width="100">
        <NFormItem label="修模师" required>
          <NSelect v-model:value="assignForm.assigneeUserId" :options="repairerOptions" filterable/>
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showAssignModal = false">取消</NButton>
          <NButton type="primary" @click="submitAssign">确定</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showReviewModal" preset="card" title="修模审核" style="width: 620px">
      <NForm label-placement="left" label-width="100">
        <NFormItem label="审核结果">
          <NSelect
            v-model:value="reviewForm.reviewResult"
            :options="[
              { label: '通过', value: 'PASS' },
              { label: '驳回', value: 'REJECT' }
            ]"
          />
        </NFormItem>
        <NFormItem label="原因编码">
          <NInput v-model:value="reviewForm.reasonCode" placeholder="例如 FACE_NOT_LIKE"/>
        </NFormItem>
        <NFormItem label="审核意见">
          <NInput v-model:value="reviewForm.comment" type="textarea"/>
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showReviewModal = false">取消</NButton>
          <NButton type="primary" @click="submitReview">提交审核</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal
      v-model:show="showAssignModal"
      preset="card"
      :title="assignMode === 'assign' ? '指派修模师' : '改派修模师'"
      style="width: 560px"
    >
      <NForm label-placement="left" label-width="110">
        <NFormItem label="修模师" required>
          <NSelect
            v-model:value="assignForm.assigneeUserId"
            :options="repairerOptions"
            filterable
            clearable
            placeholder="请选择修模师"
          />
        </NFormItem>

        <NFormItem label="备注">
          <NInput
            v-model:value="assignForm.remark"
            type="textarea"
            placeholder="请输入备注"
          />
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

    <NModal v-model:show="showPreviewReviewModal" preset="card" title="效果图审核" style="width: 620px">
      <NForm label-placement="left" label-width="110">
        <NFormItem label="修模效果图">
          <BizFileViewer
            :file-ids="currentTask?.previewFileIds"
            mode="image"
            :max="50"
            :thumb-size="96"
            show-name
          />
        </NFormItem>

        <NFormItem label="修模效果视频">
          <BizFileViewer
            :file-ids="currentTask?.previewVideoFileIds"
            mode="auto"
            :max="20"
            :thumb-size="96"
            show-name
          />
        </NFormItem>


        <NFormItem label="审核结果">
          <NSelect
            v-model:value="previewReviewForm.reviewResult"
            :options="[
          { label: '通过', value: 'PASS' },
          { label: '驳回', value: 'REJECT' }
        ]"
          />
        </NFormItem>

        <NFormItem label="审核意见">
          <NInput
            v-model:value="previewReviewForm.comment"
            type="textarea"
            placeholder="请输入审核意见"
          />
        </NFormItem>

        <NFormItem label="修改/标注图">
          <BizFileUpload
            v-model="previewReviewAttachmentFileIdList"
            biz-type="REPAIR_TASK"
            :biz-id="currentTask?.id"
            :order-id="currentTask?.orderId"
            :task-id="currentTask?.id"
            file-stage="REPAIR_REVIEW"
            file-type="PREVIEW_REVIEW_ATTACHMENT"
            :max="10"
          />

        </NFormItem>


      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showPreviewReviewModal = false">取消</NButton>
          <NButton type="primary" @click="submitPreviewReview">提交审核</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showModelCheckModal" preset="card" title="模型检测" style="width: 620px">
      <NForm label-placement="left" label-width="110">

        <NFormItem label="模型文件">
          <BizFileViewer
            :file-ids="currentTask?.modelFileIds"
            mode="download"
            :max="20"
            show-name
          />
        </NFormItem>

        <NFormItem label="自检图片">
          <BizFileViewer
            :file-ids="currentTask?.modelSelfCheckFileIds"
            mode="image"
            :max="20"
            :thumb-size="96"
            show-name
          />
        </NFormItem>

        <NFormItem label="检测结果">
          <NSelect v-model:value="modelCheckForm.checkResult" :options="checkResultOptions"/>
        </NFormItem>

        <NFormItem v-if="modelCheckForm.checkResult === 'REJECT'" label="驳回路径">
          <NSelect
            v-model:value="modelCheckForm.rejectMode"
            :options="modelRejectModeOptions"
          />
        </NFormItem>


        <NFormItem label="检测附件">
          <BizFileUpload
            v-model="modelCheckAttachmentFileIdList"
            biz-type="REPAIR_TASK"
            :biz-id="currentTask?.id"
            :order-id="currentTask?.orderId"
            :task-id="currentTask?.id"
            file-stage="REPAIR_REVIEW"
            file-type="MODEL_CHECK_ATTACHMENT"
            :max="10"
          />
        </NFormItem>

        <NFormItem label="原因编码">
          <NInput
            v-model:value="modelCheckForm.reasonCode"
            placeholder="例如 MODEL_BROKEN / HOLE_ERROR"
          />
        </NFormItem>

        <NFormItem label="检测意见">
          <NInput
            v-model:value="modelCheckForm.comment"
            type="textarea"
            placeholder="请输入模型检测意见"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showModelCheckModal = false">取消</NButton>
          <NButton type="primary" @click="submitModelCheck">提交检测</NButton>
        </NSpace>
      </template>
    </NModal>


    <NModal v-model:show="showRejectModal" preset="card" title="驳回记录" style="width: 900px">
      <NSpin :show="rejectLoading">
        <div v-if="rejectRecords.length === 0">暂无驳回记录</div>

        <NSpace v-else vertical :size="12">
          <NCard
            v-for="record in rejectRecords"
            :key="record.id"
            size="small"
            :bordered="true"
          >
            <div style="margin-bottom: 6px">
              <strong>驳回节点：</strong>{{ rejectNodeLabel(record.reviewNode) }}
              <span style="margin-left: 16px">
            <strong>驳回方式：</strong>{{ rejectModeLabel(record.rejectMode) }}
          </span>
            </div>

            <div style="margin-bottom: 6px">
              <strong>原因编码：</strong>{{ record.reasonCode || '-' }}
            </div>

            <div style="margin-bottom: 6px">
              <strong>驳回说明：</strong>
              <div style="margin-top: 4px; white-space: pre-wrap; line-height: 1.6">
                {{ record.comment || '-' }}
              </div>
            </div>

            <div style="margin-bottom: 6px">
              <strong>驳回附件 / 标注图：</strong>
              <BizFileViewer
                :file-ids="record.attachmentIds"
                mode="auto"
                :max="20"
                :thumb-size="80"
                show-name
              />
            </div>

            <div style="font-size: 12px; color: #999">
              审核人：{{ record.reviewerName || '-' }}
              <span style="margin-left: 16px">时间：{{ record.createTime || '-' }}</span>
            </div>
          </NCard>
        </NSpace>
      </NSpin>
    </NModal>

  </NCard>


</template>
