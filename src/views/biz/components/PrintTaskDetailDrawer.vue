<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NSpace,
  NSpin,
  NTag,
  useMessage
} from 'naive-ui';
import { fetchPrintTaskDetail, type PrintTaskVO } from '@/service/api/biz/print-task';
import BizFileViewer from '@/views/biz/components/BizFileViewer.vue';

defineOptions({
  name: 'PrintTaskDetailDrawer'
});

const props = defineProps<{
  show: boolean;
  taskId?: string | number;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

const message = useMessage();
const loading = ref(false);
const task = ref<PrintTaskVO | null>(null);

function statusLabel(value?: string) {
  const map: Record<string, string> = {
    WAIT_QC: '待打印检测',
    QC_REJECTED: '打印检测驳回',
    WAIT_CLAIM: '待接单',
    WAIT_START: '待开始打印',
    PRINTING: '打印中',
    WAIT_MATERIAL_RECORD: '待材料录入',
    COMPLETED: '已完成',
    CANCELLED: '已取消'
  };

  return map[value || ''] || value || '-';
}

function money(value?: number | string | null) {
  return Number(value || 0).toFixed(2);
}

function weight(value?: number | string | null) {
  return Number(value || 0).toFixed(2);
}

function close() {
  emit('update:show', false);
}

function unwrapData(res: any) {
  return res?.data || res;
}

async function load() {
  if (!props.show || !props.taskId) {
    task.value = null;
    return;
  }

  loading.value = true;
  try {
    task.value = unwrapData(await fetchPrintTaskDetail(props.taskId));
  } catch (error) {
    console.error(error);
    message.error('加载打印任务详情失败');
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.show, props.taskId],
  () => load(),
  { immediate: true }
);
</script>

<template>
  <NDrawer :show="show" :width="860" placement="right" @update:show="emit('update:show', $event)">
    <NDrawerContent title="打印任务详情" closable @close="close">
      <NSpin :show="loading">
        <NEmpty v-if="!task" description="暂无打印任务详情" />

        <NSpace v-else vertical :size="12">
          <NDescriptions label-placement="left" bordered size="small" :column="2">
            <NDescriptionsItem label="任务号">{{ task.taskNo || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="状态">
              <NTag>{{ statusLabel(task.status) }}</NTag>
            </NDescriptionsItem>
            <NDescriptionsItem label="订单号">{{ task.orderNoSnapshot || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="客户">{{ task.customerNameSnapshot || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="产品">{{ task.productNameSnapshot || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="打印员">{{ task.printerName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="设备">{{ task.deviceName || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="优先级">{{ task.priority || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="接单时间">{{ task.claimTime || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="开始时间">{{ task.startTime || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="完成时间">{{ task.finishTime || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="材料录入">{{ task.materialRecordTime || '-' }}</NDescriptionsItem>
            <NDescriptionsItem label="实体克重">{{ weight(task.entityWeightG) }} g</NDescriptionsItem>
            <NDescriptionsItem label="支撑克重">{{ weight(task.supportWeightG) }} g</NDescriptionsItem>
            <NDescriptionsItem label="基础打印费">{{ money(task.basePrintFee) }}</NDescriptionsItem>
            <NDescriptionsItem label="后处理费">{{ money(task.postProcessFee) }}</NDescriptionsItem>
            <NDescriptionsItem label="最终金额">{{ money(task.finalAmount) }}</NDescriptionsItem>
          </NDescriptions>

          <NCard title="打印规格" size="small">
            <NEmpty v-if="!task.printSpecs || task.printSpecs.length === 0" description="暂无打印规格" />

            <NSpace v-else vertical :size="8">
              <NCard v-for="(spec, index) in task.printSpecs" :key="spec.id || index" size="small">
                <NSpace vertical :size="4">
                  <NSpace align="center" wrap>
                    <NTag type="info" size="small" :bordered="false" round>规格 {{ index + 1 }}</NTag>
                    <span>高度：{{ spec.heightCm || '-' }} cm</span>
                    <span>单件规格</span>
                    <span>预估克重：{{ weight(spec.estimatedWeightG) }} g</span>
                    <span>预估金额：{{ money(spec.estimatedAmount) }}</span>
                  </NSpace>

                  <NSpace align="center" wrap>
                    <span>实体：{{ weight(spec.actualEntityWeightG) }} g</span>
                    <span>支撑：{{ weight(spec.actualSupportWeightG) }} g</span>
                    <span>实体单价：{{ money(spec.actualEntityUnitPrice) }}</span>
                    <span>支撑单价：{{ money(spec.actualSupportUnitPrice) }}</span>
                    <NTag type="success" size="small" :bordered="false" round>
                      小计：{{ money(spec.actualAmount) }}
                    </NTag>
                  </NSpace>

                  <NSpace align="start" wrap>
                    <div>
                      <div style="margin-bottom: 4px; color: #666">实体称重照片</div>
                      <BizFileViewer :file-ids="spec.actualEntityWeightPhotoFileIds" mode="image" :max="3" :thumb-size="64" />
                    </div>
                    <div>
                      <div style="margin-bottom: 4px; color: #666">支撑称重照片</div>
                      <BizFileViewer :file-ids="spec.actualSupportWeightPhotoFileIds" mode="image" :max="3" :thumb-size="64" />
                    </div>
                  </NSpace>

                  <span v-if="spec.materialRemark">材料备注：{{ spec.materialRemark }}</span>
                  <span v-if="spec.remark">规格备注：{{ spec.remark }}</span>
                </NSpace>
              </NCard>
            </NSpace>
          </NCard>

          <NCard title="打印文件" size="small">
            <NDescriptions label-placement="left" bordered size="small" :column="1">
              <NDescriptionsItem label="输入模型">
                <BizFileViewer :file-ids="task.inputModelFileIds" mode="download" :max="5" />
              </NDescriptionsItem>
              <NDescriptionsItem label="完成照片">
                <BizFileViewer :file-ids="task.finishPhotoFileIds" mode="image" :max="5" :thumb-size="80" />
              </NDescriptionsItem>
              <NDescriptionsItem label="实体称重照片">
                <BizFileViewer :file-ids="task.entityWeightPhotoFileIds" mode="image" :max="5" :thumb-size="80" />
              </NDescriptionsItem>
              <NDescriptionsItem label="支撑称重照片">
                <BizFileViewer :file-ids="task.supportWeightPhotoFileIds" mode="image" :max="5" :thumb-size="80" />
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>
        </NSpace>
      </NSpin>
    </NDrawerContent>
  </NDrawer>
</template>
