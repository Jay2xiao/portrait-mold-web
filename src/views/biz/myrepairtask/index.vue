<script setup lang="ts">
import {h, onMounted, reactive, ref, VNodeChild} from 'vue';

import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  NSpace,
  NTag,
  NSpin,
  useMessage
} from 'naive-ui';

import {
  fetchMyRepairTaskList,
  fetchRepairRejectRecords,
  RepairRejectRecordVO,
  type RepairTaskVO,
  restartRepairTask,
  startRepairTask,
  submitRepairPreview,
  submitRepairTask,
  uploadRepairModel
} from '@/service/api/biz/repair-task';

import BizFileUpload from '@/views/biz/components/BizFileUpload.vue';
import BizFileViewer from '@/views/biz/components/BizFileViewer.vue';
import BizFileThumbs from '@/views/biz/components/BizFileThumbs.vue';
import RepairTaskDetailDrawer from '@/views/biz/components/RepairTaskDetailDrawer.vue';

import {deadlineTagType, deadlineText} from '@/utils/biz/deadline';
import {useRouter} from "vue-router";


import {useRoute} from 'vue-router';

const route = useRoute();

defineOptions({name: 'BizMyRepairTask'});

const message = useMessage();
const loading = ref(false);
const tableData = ref<RepairTaskVO[]>([]);
const total = ref(0);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  mine: false,
  modelCheckResult: '',
  status: ''
});

const statusOptions = [
  {label: '待修模', value: 'WAIT_START'},
  {label: '修模中', value: 'REPAIRING'},
  {label: '待效果图审核', value: 'WAIT_PREVIEW_REVIEW'},
  {label: '待效果图审核', value: 'WAIT_REPAIR_REVIEW'},
  {label: '效果图驳回', value: 'PREVIEW_REJECTED'},
  {label: '待上传模型文件', value: 'WAIT_MODEL_UPLOAD'},
  {label: '待模型检测', value: 'WAIT_MODEL_CHECK'},
  {label: '模型检测驳回', value: 'MODEL_REJECTED'},
  {label: '已完成', value: 'COMPLETED'}
];

const showSubmitModal = ref(false);
const currentTask = ref<RepairTaskVO | null>(null);
const showDetailDrawer = ref(false);
const detailTaskId = ref<string | number | undefined>();

const previewFileIdList = ref<Array<string | number>>([]);
const modelFileIdList = ref<Array<string | number>>([]);
const modelSelfCheckFileIdList = ref<Array<string | number>>([]);
const previewVideoFileIdList = ref<Array<string | number>>([]);


const showPreviewModal = ref(false);

const previewForm = reactive({
  previewFileIds: '',
  submitRemark: '',
  timeoutReason: ''
});


const showModelModal = ref(false);
const modelForm = reactive({
  modelFileIds: '',
  remark: ''
});

const submitForm = reactive({
  outputFileIds: '',
  submitRemark: ''
});

function statusLabel(value?: string) {
  return statusOptions.find(item => item.value === value)?.label || value || '-';
}

function statusTagType(value?: string) {
  if (value === 'COMPLETED') return 'success';
  if (value === 'PREVIEW_REJECTED' || value === 'MODEL_REJECTED') return 'warning';
  if (value === 'REPAIRING') return 'info';
  return 'default';
}

function isRepairTimeoutForSubmit(task?: RepairTaskVO | null) {
  if (!task?.deadlineTime) return false;

  const deadline = new Date(task.deadlineTime).getTime();

  if (Number.isNaN(deadline)) return false;

  return Date.now() > deadline;
}

function calcPreviewTimeoutMinutes(task?: RepairTaskVO | null) {
  if (!task?.deadlineTime) return 0;

  const deadline = new Date(task.deadlineTime).getTime();

  if (Number.isNaN(deadline)) return 0;

  const diff = Date.now() - deadline;

  if (diff <= 0) return 0;

  return Math.max(1, Math.ceil(diff / 60000));
}


const columns = [
  {title: '任务号', key: 'taskNo', width: 100, fixed: 'left' as const},
  {title: '订单号', key: 'orderNoSnapshot', width: 100, fixed: 'left' as const},
  {title: '客户', key: 'customerNameSnapshot', width: 100, fixed: 'left' as const},
  {title: '产品', key: 'productNameSnapshot', width: 100},
  {title: '修模师费用', key: 'quoteManualAmount', width: 120},
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
    title: '状态',
    key: 'status',
    width: 100,
    render(row: RepairTaskVO) {
      return h(NTag, {}, {default: () => statusLabel(row.status)});
    }
  },
  {
    title: '截止时间',
    key: 'deadlineTime',
    width: 100
  }, {
    title: '修模截止',
    key: 'deadlineTime',
    width: 100,
    render(row: RepairTaskVO) {
      return h(
        NTag,
        {type: deadlineTagType(row.deadlineTime, row.timeoutFlag) as any},
        {default: () => deadlineText(row.deadlineTime, row.timeoutFlag)}
      );
    }
  },
  {
    title: '超时信息',
    key: 'timeoutInfo',
    width: 240,
    render(row: RepairTaskVO) {
      if (row.timeoutFlag !== '1') {
        return '-';
      }

      return h(
        NSpace,
        {
          vertical: true,
          size: 4
        },
        {
          default: () => [
            h(
              NTag,
              {
                type: 'warning',
                size: 'small',
                bordered: false,
                round: true
              },
              {
                default: () => `超时 ${row.timeoutMinutes ?? '-'} 分钟`
              }
            ),
            h(
              'span',
              {
                style: {
                  color: '#666'
                }
              },
              row.timeoutReason || '-'
            )
          ]
        }
      );
    }
  },
  {title: '提交说明', key: 'submitRemark', width: 200},
  {
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right' as const,
    render(row: RepairTaskVO) {
      const buttons: VNodeChild[] = [];

      if (row.status === 'PREVIEW_REJECTED') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'warning',
              onClick: () => openSubmitPreview(row)
            },
            {default: () => '重新提交效果图'}
          )
        );
      }

      if (row.status === 'WAIT_MODEL_UPLOAD' || row.status === 'MODEL_REJECTED') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => openUploadModel(row)
            },
            {default: () => row.status === 'MODEL_REJECTED' ? '重新上传模型' : '上传模型'}
          )
        );
      }


      if (row.status === 'WAIT_START') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'success',
              onClick: () => handleStart(row)
            },
            {default: () => '开始修模'}
          )
        );
      }

      if (row.status === 'REPAIRING') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => openSubmitPreview(row)
            },
            {default: () => '提交效果图'}
          )
        );
      }

      if (row.status === 'PREVIEW_REJECTED' || row.status === 'MODEL_REJECTED') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'warning',
              onClick: () => handleRestart(row)
            },
            {default: () => '重新开始'}
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
            {default: () => '驳回原因'}
          )
        );
      }

      buttons.push(h(NButton, {size: 'small', onClick: () => openRejectRecords(row)}, {default: () => '驳回记录'}));

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

function openDetail(row: RepairTaskVO) {
  if (!row.id) return;

  detailTaskId.value = row.id;
  showDetailDrawer.value = true;
}


async function getList() {
  loading.value = true;
  try {
    const res = await fetchMyRepairTaskList(queryParams);
    const data = res.data || res;
    tableData.value = data.rows || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

function openSubmit(row: RepairTaskVO) {
  currentTask.value = row;
  submitForm.outputFileIds = row.outputFileIds || '';
  submitForm.submitRemark = '';
  showSubmitModal.value = true;
}

function openSubmitPreview(row: RepairTaskVO) {
  currentTask.value = row;

  previewFileIdList.value = [];

  previewVideoFileIdList.value = [];

  previewForm.submitRemark = '';

  previewForm.timeoutReason = '';

  showPreviewModal.value = true;
}



async function submitOutput() {
  if (!currentTask.value?.id) return;
  await submitRepairTask(currentTask.value.id, submitForm);
  message.success('提交成功');
  showSubmitModal.value = false;
  getList();
}

async function handleStart(row: RepairTaskVO) {
  if (!row.id) return;

  await startRepairTask(row.id);
  message.success('已开始修模');
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

async function submitPreview() {
  if (!currentTask.value?.id) return;

  if (previewFileIdList.value.length === 0 && previewVideoFileIdList.value.length === 0) {
    message.warning('请上传效果图或效果视频');
    return;
  }

  const isTimeout = isRepairTimeoutForSubmit(currentTask.value);

  if (isTimeout && !previewForm.timeoutReason.trim()) {
    message.warning('当前修模任务已超时，请填写超时原因');
    return;
  }

  await submitRepairPreview(currentTask.value.id, {
    previewFileIds: previewFileIdList.value.join(','),
    previewVideoFileIds: previewVideoFileIdList.value.join(','),
    submitRemark: previewForm.submitRemark,
    timeoutReason: isTimeout ? previewForm.timeoutReason.trim() : undefined
  });

  message.success('效果图/视频已提交，等待审核');

  showPreviewModal.value = false;
  previewFileIdList.value = [];

  previewVideoFileIdList.value = [];

  previewForm.timeoutReason = '';

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


function openUploadModel(row: RepairTaskVO) {
  currentTask.value = row;

  modelFileIdList.value = [];
  modelSelfCheckFileIdList.value = [];

  modelForm.remark = '';
  showModelModal.value = true;
}

async function submitModel() {
  if (!currentTask.value?.id) return;

  if (modelFileIdList.value.length === 0) {
    message.warning('请上传模型文件');
    return;
  }

  if (modelSelfCheckFileIdList.value.length === 0) {
    message.warning('请上传模型自检结果图片');
    return;
  }

  await uploadRepairModel(currentTask.value.id, {
    modelFileIds: modelFileIdList.value.join(','),
    modelSelfCheckFileIds: modelSelfCheckFileIdList.value.join(','),
    remark: modelForm.remark
  });

  message.success('模型文件已上传，等待模型检测');
  showModelModal.value = false;
  getList();
}


async function handleRestart(row: RepairTaskVO) {
  if (!row.id) return;

  await restartRepairTask(row.id);
  message.success('已重新开始修模');
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

  if ('modelCheckResult' in q) {
    queryParams.modelCheckResult = queryString(q.modelCheckResult);
  }

  queryParams.pageNum = 1;
}


onMounted(() => {
  applyRouteQuery();
  getList();
});
</script>

<template>
  <NCard title="我的修模任务" :bordered="false">
    <NSpace vertical :size="16">
      <NForm inline>
        <NFormItem label="状态">
          <NSelect v-model:value="queryParams.status" :options="statusOptions" clearable style="width: 150px"/>
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
        :scroll-x="2000"
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

    <NModal v-model:show="showSubmitModal" preset="card" title="提交修模成果" style="width: 600px">
      <NForm label-placement="left" label-width="110">
        <NFormItem label="修模成果图">
          <NInput v-model:value="submitForm.outputFileIds" placeholder="请提交修模成果图"/>
        </NFormItem>
        <NFormItem label="提交说明">
          <NInput v-model:value="submitForm.submitRemark" type="textarea"/>
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton @click="showSubmitModal = false">取消</NButton>
          <NButton type="primary" @click="submitOutput">提交</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showPreviewModal" preset="card" title="提交效果图" style="width: 620px">
      <NForm label-placement="left" label-width="120">
        <NFormItem label="效果图图片" required>
          <BizFileUpload
            v-model="previewFileIdList"
            biz-type="REPAIR_TASK"
            :biz-id="currentTask?.id"
            :order-id="currentTask?.orderId"
            :task-id="currentTask?.id"
            file-stage="REPAIR_PREVIEW"
            file-type="REPAIR_PREVIEW_IMAGE"
            :max="10"
          />

        </NFormItem>

        <NFormItem label="效果视频">
          <BizFileUpload
            v-model="previewVideoFileIdList"
            biz-type="REPAIR_TASK"
            :biz-id="currentTask?.id"
            :order-id="currentTask?.orderId"
            :task-id="currentTask?.id"
            file-stage="REPAIR_PREVIEW"
            file-type="REPAIR_PREVIEW_VIDEO"
            accept="video/*"
            :max="10"
          />
        </NFormItem>

        <NAlert
          v-if="isRepairTimeoutForSubmit(currentTask)"
          type="warning"
          show-icon
          style="margin-bottom: 12px"
        >
          当前任务已超过修模截止时间，预计超时 {{ calcPreviewTimeoutMinutes(currentTask) }} 分钟。提交效果图前必须填写超时原因。
        </NAlert>

        <NFormItem
          v-if="isRepairTimeoutForSubmit(currentTask)"
          label="超时原因"
          required
        >
          <NInput
            v-model:value="previewForm.timeoutReason"
            type="textarea"
            placeholder="请说明超时原因，例如：原图质量低、客户反复调整、模型复杂度高、设备或网络原因等"
            :autosize="{ minRows: 3, maxRows: 5 }"
          />
        </NFormItem>

        <NFormItem label="提交说明">
          <NInput
            v-model:value="previewForm.submitRemark"
            type="textarea"
            placeholder="请输入提交说明"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showPreviewModal = false">取消</NButton>
          <NButton type="primary" @click="submitPreview">提交审核</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showModelModal" preset="card" title="上传模型文件" style="width: 620px">
      <NForm label-placement="left" label-width="120">
        <NFormItem label="模型文件" required>
          <BizFileUpload
            v-model="modelFileIdList"
            biz-type="REPAIR_TASK"
            :biz-id="currentTask?.id"
            :order-id="currentTask?.orderId"
            :task-id="currentTask?.id"
            file-stage="REPAIR_MODEL"
            file-type="REPAIR_MODEL_FILE"
            :max="10"
          />
        </NFormItem>

        <NFormItem label="模型自检图" required>
          <BizFileUpload
            v-model="modelSelfCheckFileIdList"
            biz-type="REPAIR_TASK"
            :biz-id="currentTask?.id"
            :order-id="currentTask?.orderId"
            :task-id="currentTask?.id"
            file-stage="REPAIR_MODEL_SELF_CHECK"
            file-type="MODEL_SELF_CHECK_IMAGE"
            :max="10"
          />
        </NFormItem>


        <NFormItem label="上传说明">
          <NInput
            v-model:value="modelForm.remark"
            type="textarea"
            placeholder="请输入上传说明"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showModelModal = false">取消</NButton>
          <NButton type="primary" @click="submitModel">提交模型检测</NButton>
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

    <RepairTaskDetailDrawer
      v-model:show="showDetailDrawer"
      :task-id="detailTaskId"
    />

  </NCard>
</template>
