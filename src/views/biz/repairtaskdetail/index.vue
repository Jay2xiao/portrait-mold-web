<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {useRoute} from 'vue-router';
import {NCard, NDescriptions, NDescriptionsItem, NSpace, NTag} from 'naive-ui';
import {
  fetchRepairRejectRecords,
  fetchRepairTaskDetail,
  RepairRejectRecordVO,
  type RepairTaskVO
} from '@/service/api/biz/repair-task';
import {fetchFileList, type FileAssetVO} from '@/service/api/biz/file';
import BizFileViewer from '@/views/biz/components/BizFileViewer.vue';
import BizPrintInfoPanel from '@/views/biz/components/BizPrintInfoPanel.vue';


defineOptions({
  name: 'BizRepairTaskDetail'
});

const route = useRoute();
const taskId = route.query.id as string;

const orderId = '';

const task = ref<RepairTaskVO | null>(null);

const inputFiles = ref<FileAssetVO[]>([]);
const previewFiles = ref<FileAssetVO[]>([]);
const modelFiles = ref<FileAssetVO[]>([]);

async function loadDetail() {
  const res = await fetchRepairTaskDetail(taskId);
  task.value = res.data || res;
  await loadFiles();
}

async function loadFiles() {
  const inputRes = await fetchFileList({
    taskId,
    fileStage: 'REPAIR_INPUT'
  });
  inputFiles.value = inputRes.data || inputRes || [];

  const previewRes = await fetchFileList({
    taskId,
    fileStage: 'REPAIR_PREVIEW'
  });
  previewFiles.value = previewRes.data || previewRes || [];

  const modelRes = await fetchFileList({
    taskId,
    fileStage: 'REPAIR_MODEL'
  });
  modelFiles.value = modelRes.data || modelRes || [];
}

function fileUrl(id?: string | number, type: 'preview' | 'download' = 'download') {
  if (!id) return '#';
  return `/biz/file/${id}/${type}`;
}

const rejectRecords = ref<RepairRejectRecordVO[]>([]);

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

async function loadRejectRecords() {
  if (!taskId) return;

  const res = await fetchRepairRejectRecords(taskId);
  const data = res.data || res;
  rejectRecords.value = data || [];
}

onMounted(() => {
  loadDetail();
  loadRejectRecords();
});
</script>

<template>
  <NSpace vertical :size="16">
    <NCard title="修模任务详情" :bordered="false">
      <NDescriptions v-if="task" bordered :column="2">
        <NDescriptionsItem label="任务号">{{ task.taskNo }}</NDescriptionsItem>
        <NDescriptionsItem label="订单号">{{ task.orderNoSnapshot }}</NDescriptionsItem>
        <NDescriptionsItem label="客户">{{ task.customerNameSnapshot }}</NDescriptionsItem>
        <NDescriptionsItem label="产品">{{ task.productNameSnapshot }}</NDescriptionsItem>
        <NDescriptionsItem label="修模师">{{ task.assigneeName || '-' }}</NDescriptionsItem>
        <NDescriptionsItem label="状态">
          <NTag>{{ task.status }}</NTag>
        </NDescriptionsItem>
        <NDescriptionsItem label="人工修模费">{{ task.quoteManualAmount }}</NDescriptionsItem>
        <NDescriptionsItem label="总价">{{ task.quoteTotalAmount }}</NDescriptionsItem>
      </NDescriptions>

    </NCard>

    <NCard title="修模输入文件" :bordered="false">
      <NSpace vertical>
        <div>
          <div style="margin-bottom: 8px">原图</div>
          <BizFileViewer
            :task-id="taskId"
            file-stage="REPAIR_INPUT"
            file-type="ORIGINAL_IMAGE"
            mode="image"
            :max="10"
            :thumb-size="80"
            show-name
          />
        </div>

        <div>
          <div style="margin-bottom: 8px">备注图</div>
          <BizFileViewer
            :task-id="taskId"
            file-stage="REPAIR_INPUT"
            file-type="REMARK_IMAGE"
            mode="image"
            :max="10"
            :thumb-size="80"
            show-name
          />
        </div>

        <div>
          <div style="margin-bottom: 8px">AI基础模型</div>
          <BizFileViewer
            :task-id="taskId"
            file-stage="REPAIR_INPUT"
            file-type="AI_BASE_MODEL_ZIP"
            mode="download"
            :max="10"
          />
        </div>
      </NSpace>
    </NCard>

    <NCard title="效果图" :bordered="false">
      <BizFileViewer
        :task-id="taskId"
        file-stage="REPAIR_PREVIEW"
        file-type="REPAIR_PREVIEW_IMAGE"
        mode="image"
        :max="10"
        :thumb-size="90"
        show-name
      />
    </NCard>

    <NCard title="修模师模型自检结果图" :bordered="false">
      <BizFileViewer
        :task-id="taskId"
        file-stage="REPAIR_MODEL_SELF_CHECK"
        file-type="MODEL_SELF_CHECK_IMAGE"
        mode="image"
        :max="10"
        :thumb-size="90"
        show-name
      />
    </NCard>

    <NCard title="模型文件" :bordered="false">
      <BizFileViewer
        :task-id="taskId"
        file-stage="REPAIR_MODEL"
        file-type="REPAIR_MODEL_FILE"
        mode="download"
        :max="10"
      />
    </NCard>

    <NCard title="审核附件 / 驳回标注图" :bordered="false">
      <BizFileViewer
        :task-id="taskId"
        file-stage="REPAIR_REVIEW"
        mode="auto"
        :max="20"
        :thumb-size="90"
        show-name
      />
    </NCard>
    <NCard title="驳回记录" :bordered="false">
      <div v-if="rejectRecords.length === 0">暂无驳回记录</div>

      <NSpace v-else vertical :size="12">
        <NCard
          v-for="record in rejectRecords"
          :key="record.id"
          size="small"
          :bordered="true"
        >
          <div>
            <strong>驳回节点：</strong>{{ rejectNodeLabel(record.reviewNode) }}
          </div>

          <div style="margin-top: 6px">
            <strong>驳回方式：</strong>{{ rejectModeLabel(record.rejectMode) }}
          </div>

          <div style="margin-top: 6px">
            <strong>驳回说明：</strong>{{ record.comment || '-' }}
          </div>

          <div style="margin-top: 6px">
            <strong>驳回附件：</strong>
            <BizFileViewer
              :file-ids="record.attachmentIds"
              mode="auto"
              :max="20"
              :thumb-size="80"
              show-name
            />
          </div>
        </NCard>

        <div v-if="task">
          <BizPrintInfoPanel :order-id="task.orderId" />
        </div>

      </NSpace>
    </NCard>

  </NSpace>
</template>
