<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  NButton,
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NSpace,
  NSpin,
  NTag
} from 'naive-ui';
import {
  fetchRepairRejectRecords,
  fetchRepairTaskDetail,
  type RepairRejectRecordVO,
  type RepairTaskVO
} from '@/service/api/biz/repair-task';
import BizFileViewer from '@/views/biz/components/BizFileViewer.vue';
import BizPrintInfoPanel from '@/views/biz/components/BizPrintInfoPanel.vue';
import { deadlineTagType, deadlineText } from '@/utils/biz/deadline';

defineOptions({
  name: 'RepairTaskDetailDrawer'
});

const props = withDefaults(
  defineProps<{
    show: boolean;
    taskId?: string | number;
    width?: string | number;
  }>(),
  {
    width: 'min(920px, 92vw)'
  }
);

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

const loading = ref(false);
const task = ref<RepairTaskVO | null>(null);
const rejectRecords = ref<RepairRejectRecordVO[]>([]);

const resolvedTaskId = computed(() => {
  if (props.taskId === undefined || props.taskId === null || props.taskId === '') return '';
  return String(props.taskId);
});

const displayTimeoutReason = computed(() => {
  const item = task.value as any;

  return item?.timeoutReason || item?.cancelReason || '-';
});

const displayTimeoutText = computed(() => {
  const item = task.value as any;

  if (!task.value) return '-';

  if (item?.timeoutMinutes !== undefined && item?.timeoutMinutes !== null) {
    return `${item.timeoutMinutes} 分钟`;
  }

  if (item?.timeoutTime) {
    return item.timeoutTime;
  }

  return task.value.timeoutFlag === '1' ? '已超时' : '-';
});

function unwrapData<T = any>(res: any): T {
  return (res?.data ?? res) as T;
}

function statusLabel(value?: string) {
  const map: Record<string, string> = {
    WAIT_CLAIM: '待接单',
    WAIT_START: '待修模',
    REPAIRING: '修模中',
    WAIT_PREVIEW_REVIEW: '待效果图审核',
    WAIT_REPAIR_REVIEW: '待效果图审核',
    PREVIEW_REJECTED: '效果图驳回',
    WAIT_MODEL_UPLOAD: '待上传模型文件',
    WAIT_MODEL_CHECK: '待模型检测',
    MODEL_REJECTED: '模型检测驳回',
    COMPLETED: '已完成',
    CANCELLED: '已取消'
  };

  return map[value || ''] || value || '-';
}

function statusTagType(value?: string) {
  if (value === 'COMPLETED') return 'success';
  if (value === 'REPAIRING') return 'info';
  if (value === 'PREVIEW_REJECTED' || value === 'MODEL_REJECTED') return 'warning';
  if (value === 'CANCELLED') return 'error';

  return 'default';
}

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

function closeDrawer() {
  emit('update:show', false);
}

function handleUpdateShow(value: boolean) {
  emit('update:show', value);
}

async function loadDetail(id: string | number) {
  loading.value = true;

  try {
    const detailRes = await fetchRepairTaskDetail(id);
    task.value = unwrapData<RepairTaskVO>(detailRes);

    const rejectRes = await fetchRepairRejectRecords(id);
    rejectRecords.value = unwrapData<RepairRejectRecordVO[]>(rejectRes) || [];
  } finally {
    loading.value = false;
  }
}

function reloadDetail() {
  if (!resolvedTaskId.value) return;

  loadDetail(resolvedTaskId.value);
}

watch(
  () => [props.show, props.taskId] as const,
  ([visible, id]) => {
    if (visible && id) {
      loadDetail(id);
    }

    if (!visible) {
      task.value = null;
      rejectRecords.value = [];
    }
  },
  {
    immediate: true
  }
);
</script>

<template>
  <NDrawer
    :show="show"
    :width="width"
    placement="right"
    @update:show="handleUpdateShow"
  >
    <NDrawerContent closable>
      <template #header>
        <div class="repair-detail-header">
          <div>
            <div class="repair-detail-title">修模任务详情</div>
            <div class="repair-detail-subtitle">
              {{ task?.taskNo || resolvedTaskId || '-' }}
            </div>
          </div>

          <NTag
            v-if="task"
            :type="statusTagType(task.status) as any"
            :bordered="false"
            round
          >
            {{ statusLabel(task.status) }}
          </NTag>
        </div>
      </template>

      <NSpin :show="loading">
        <NEmpty v-if="!task && !loading" description="请选择修模任务" />

        <NSpace v-else-if="task" vertical :size="14">
          <NCard size="small" :bordered="false" class="repair-detail-card">
            <template #header>
              <div class="section-title">基础信息</div>
            </template>

            <NDescriptions bordered :column="2" size="small">
              <NDescriptionsItem label="任务号">
                {{ task.taskNo || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="订单号">
                {{ task.orderNoSnapshot || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="来源">
                <NTag
                  v-if="task.sourceBizType === 'COLLAB_ORDER'"
                  type="info"
                  size="small"
                  :bordered="false"
                >
                  协作接单内部单
                </NTag>
                <span v-else>-</span>
              </NDescriptionsItem>

              <NDescriptionsItem label="协作单号">
                {{ task.sourceBizNo || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="客户">
                {{ task.customerNameSnapshot || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="产品">
                {{ task.productNameSnapshot || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="订单类型">
                {{ task.orderType || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="优先级">
                {{ task.priority || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="修模师">
                {{ task.assigneeName || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="状态">
                <NTag
                  :type="statusTagType(task.status) as any"
                  size="small"
                  :bordered="false"
                  round
                >
                  {{ statusLabel(task.status) }}
                </NTag>
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <NCard size="small" :bordered="false" class="repair-detail-card">
            <template #header>
              <div class="section-title">进度与时限</div>
            </template>

            <NDescriptions bordered :column="2" size="small">
              <NDescriptionsItem label="修模截止">
                <NTag
                  :type="deadlineTagType(task.deadlineTime, task.timeoutFlag) as any"
                  size="small"
                  :bordered="false"
                  round
                >
                  {{ deadlineText(task.deadlineTime, task.timeoutFlag) }}
                </NTag>
              </NDescriptionsItem>

              <NDescriptionsItem label="截止时间">
                {{ task.deadlineTime || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="接单时间">
                {{ task.claimTime || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="开始时间">
                {{ task.startTime || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="提交时间">
                {{ task.submitTime || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="完成时间">
                {{ task.completeTime || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="超时时长">
                {{ displayTimeoutText }}
              </NDescriptionsItem>

              <NDescriptionsItem label="超时原因">
                {{ displayTimeoutReason }}
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <NCard size="small" :bordered="false" class="repair-detail-card">
            <template #header>
              <div class="section-title">费用信息</div>
            </template>

            <NDescriptions bordered :column="2" size="small">
              <NDescriptionsItem label="高清处理费">
                {{ task.quoteHdAmount ?? '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="AI建模费">
                {{ task.quoteAiAmount ?? '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="人工修模费">
                {{ task.quoteManualAmount ?? '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="总价">
                {{ task.quoteTotalAmount ?? '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="已接收金额">
                {{ task.acceptedAmount ?? '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="审核轮次">
                {{ task.reviewRound ?? '-' }}
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <NCard size="small" :bordered="false" class="repair-detail-card">
            <template #header>
              <div class="section-title">修模输入资料</div>
            </template>

            <NSpace vertical :size="12">
              <div>
                <div class="file-section-title">原图</div>
                <BizFileViewer
                  :file-ids="task.originalImageFileIds"
                  mode="image"
                  :max="20"
                  :thumb-size="88"
                  show-name
                />
              </div>

              <div>
                <div class="file-section-title">备注图</div>
                <BizFileViewer
                  :file-ids="task.remarkImageFileIds"
                  mode="image"
                  :max="20"
                  :thumb-size="88"
                  show-name
                />
              </div>

              <div>
                <div class="file-section-title">AI基础模型</div>
                <BizFileViewer
                  :file-ids="task.aiBaseModelFileIds"
                  mode="download"
                  :max="20"
                  show-name
                />
              </div>
            </NSpace>
          </NCard>

          <NCard size="small" :bordered="false" class="repair-detail-card">
            <template #header>
              <div class="section-title">效果图 / 效果视频</div>
            </template>

            <NSpace vertical :size="12">
              <div>
                <div class="file-section-title">效果图</div>
                <BizFileViewer
                  :file-ids="task.previewFileIds"
                  mode="image"
                  :max="20"
                  :thumb-size="88"
                  show-name
                />
              </div>

              <div>
                <div class="file-section-title">效果视频</div>
                <BizFileViewer
                  :file-ids="task.previewVideoFileIds"
                  mode="auto"
                  :max="20"
                  :thumb-size="88"
                  show-name
                />
              </div>
            </NSpace>
          </NCard>

          <NCard size="small" :bordered="false" class="repair-detail-card">
            <template #header>
              <div class="section-title">模型文件与自检</div>
            </template>

            <NSpace vertical :size="12">
              <div>
                <div class="file-section-title">模型文件</div>
                <BizFileViewer
                  :file-ids="task.modelFileIds"
                  mode="download"
                  :max="20"
                  show-name
                />
              </div>

              <div>
                <div class="file-section-title">模型自检图</div>
                <BizFileViewer
                  :file-ids="task.modelSelfCheckFileIds"
                  mode="image"
                  :max="20"
                  :thumb-size="88"
                  show-name
                />
              </div>
            </NSpace>
          </NCard>

          <NCard size="small" :bordered="false" class="repair-detail-card">
            <template #header>
              <div class="section-title">审核附件 / 驳回记录</div>
            </template>

            <NSpace vertical :size="12">
              <div>
                <div class="file-section-title">审核附件 / 标注图</div>
                <BizFileViewer
                  :task-id="resolvedTaskId"
                  file-stage="REPAIR_REVIEW"
                  mode="auto"
                  :max="20"
                  :thumb-size="88"
                  show-name
                />
              </div>

              <div>
                <div class="file-section-title">驳回记录</div>

                <NEmpty v-if="rejectRecords.length === 0" description="暂无驳回记录" />

                <NSpace v-else vertical :size="10">
                  <NCard
                    v-for="record in rejectRecords"
                    :key="record.id"
                    size="small"
                    :bordered="true"
                  >
                    <div class="reject-row">
                      <strong>驳回节点：</strong>{{ rejectNodeLabel(record.reviewNode) }}
                      <span class="ml-16">
                        <strong>驳回方式：</strong>{{ rejectModeLabel(record.rejectMode) }}
                      </span>
                    </div>

                    <div class="reject-row">
                      <strong>原因编码：</strong>{{ record.reasonCode || '-' }}
                    </div>

                    <div class="reject-row">
                      <strong>驳回说明：</strong>
                      <div class="reject-comment">
                        {{ record.comment || '-' }}
                      </div>
                    </div>

                    <div class="reject-row">
                      <strong>驳回附件 / 标注图：</strong>
                      <BizFileViewer
                        :file-ids="record.attachmentIds"
                        mode="auto"
                        :max="20"
                        :thumb-size="80"
                        show-name
                      />
                    </div>

                    <div class="reject-meta">
                      审核人：{{ record.reviewerName || '-' }}
                      <span class="ml-16">时间：{{ record.createTime || '-' }}</span>
                    </div>
                  </NCard>
                </NSpace>
              </div>
            </NSpace>
          </NCard>

          <NCard
            v-if="task.orderId"
            size="small"
            :bordered="false"
            class="repair-detail-card"
          >
            <template #header>
              <div class="section-title">关联打印信息</div>
            </template>

            <BizPrintInfoPanel :order-id="task.orderId" />
          </NCard>
        </NSpace>
      </NSpin>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="closeDrawer">关闭</NButton>
          <NButton type="primary" ghost :disabled="!resolvedTaskId" @click="reloadDetail">
            刷新
          </NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.repair-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.repair-detail-title {
  font-size: 16px;
  font-weight: 650;
  line-height: 24px;
}

.repair-detail-subtitle {
  margin-top: 2px;
  color: #8a8f99;
  font-size: 12px;
  line-height: 18px;
}

.repair-detail-card {
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
}

.section-title {
  font-size: 14px;
  font-weight: 650;
  line-height: 20px;
}

.file-section-title {
  margin-bottom: 8px;
  color: #4b5563;
  font-size: 13px;
  font-weight: 600;
}

.reject-row {
  margin-bottom: 6px;
  line-height: 1.6;
}

.reject-comment {
  margin-top: 4px;
  white-space: pre-wrap;
  line-height: 1.6;
}

.reject-meta {
  color: #999;
  font-size: 12px;
}

.ml-16 {
  margin-left: 16px;
}
</style>
