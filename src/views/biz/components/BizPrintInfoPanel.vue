<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { NCard, NDescriptions, NDescriptionsItem, NEmpty, NSpace, NTag } from 'naive-ui';
import {
  fetchPrintTaskList,
  type PrintTaskVO
} from '@/service/api/biz/print-task';
import BizFileThumbs from './BizFileThumbs.vue';

defineOptions({
  name: 'BizPrintInfoPanel'
});

interface Props {
  orderId?: string | number;
}

const props = defineProps<Props>();

const loading = ref(false);
const printTasks = ref<PrintTaskVO[]>([]);

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


async function load() {
  if (!props.orderId) {
    printTasks.value = [];
    return;
  }

  loading.value = true;

  try {
    const res = await fetchPrintTaskList({
      pageNum: 1,
      pageSize: 20,
      orderId: props.orderId
    });

    const data = res.data || res;
    printTasks.value = data.rows || [];
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.orderId,
  () => load()
);

onMounted(load);
</script>

<template>
  <NCard title="打印信息" :bordered="false">
    <NEmpty v-if="!loading && printTasks.length === 0" description="暂无打印任务" />

    <NSpace v-else vertical :size="12">
      <NCard
        v-for="task in printTasks"
        :key="task.id"
        size="small"
        :bordered="true"
      >
        <NDescriptions
          label-placement="left"
          bordered
          size="small"
          :column="2"
        >
          <NDescriptionsItem label="打印任务号">
            {{ task.taskNo || '-' }}
          </NDescriptionsItem>

          <NDescriptionsItem label="状态">
            <NTag>{{ statusLabel(task.status) }}</NTag>
          </NDescriptionsItem>

          <NDescriptionsItem label="打印员">
            {{ task.printerName || '-' }}
          </NDescriptionsItem>

          <NDescriptionsItem label="设备">
            {{ task.deviceName || '-' }}
          </NDescriptionsItem>

          <NDescriptionsItem label="接单时间">
            {{ task.claimTime || '-' }}
          </NDescriptionsItem>

          <NDescriptionsItem label="开始打印">
            {{ task.startTime || '-' }}
          </NDescriptionsItem>

          <NDescriptionsItem label="完成打印">
            {{ task.finishTime || '-' }}
          </NDescriptionsItem>

          <NDescriptionsItem label="材料录入">
            {{ task.materialRecordTime || '-' }}
          </NDescriptionsItem>

          <NDescriptionsItem label="实体克重">
            {{ task.entityWeightG || 0 }} g
          </NDescriptionsItem>

          <NDescriptionsItem label="支撑克重">
            {{ task.supportWeightG || 0 }} g
          </NDescriptionsItem>

          <NDescriptionsItem label="实体单价">
            {{ task.entityUnitPrice || 0 }}
          </NDescriptionsItem>

          <NDescriptionsItem label="支撑单价">
            {{ task.supportUnitPrice || 0 }}
          </NDescriptionsItem>

          <NDescriptionsItem label="基础打印费">
            {{ task.basePrintFee || 0 }}
          </NDescriptionsItem>

          <NDescriptionsItem label="后处理费">
            {{ task.postProcessFee || 0 }}
          </NDescriptionsItem>

          <NDescriptionsItem label="打印最终金额">
            {{ task.finalAmount || 0 }}
          </NDescriptionsItem>

          <NDescriptionsItem label="打印输入模型">
            <BizFileThumbs
              :file-ids="task.inputModelFileIds"
              mode="download"
              :max="5"
            />
          </NDescriptionsItem>

          <NDescriptionsItem
            v-if="task.printSpecs && task.printSpecs.length"
            label="打印规格"
            :span="2"
          >
            <NSpace vertical :size="8">
              <NCard
                v-for="(spec, index) in task.printSpecs"
                :key="spec.id || index"
                size="small"
                :bordered="true"
              >
                <NSpace vertical :size="4">
                  <NSpace align="center" wrap>
                    <NTag type="info" size="small" :bordered="false" round>
                      规格 {{ index + 1 }}
                    </NTag>

                    <span>高度：{{ spec.heightCm || '-' }} cm</span>
                    <span>数量：{{ spec.quantity || 0 }} 个</span>
                    <span>参考克重：{{ weight(spec.estimatedWeightG) }} g</span>
                    <span>参考金额：{{ money(spec.estimatedAmount) }} 元</span>
                  </NSpace>

                  <NSpace align="center" wrap>
                    <span>实际实体：{{ weight(spec.actualEntityWeightG) }} g</span>
                    <span>实际支撑：{{ weight(spec.actualSupportWeightG) }} g</span>
                    <span>实体单价：{{ money(spec.actualEntityUnitPrice) }}</span>
                    <span>支撑单价：{{ money(spec.actualSupportUnitPrice) }}</span>
                    <NTag type="success" size="small" :bordered="false" round>
                      小计：{{ money(spec.actualAmount) }} 元
                    </NTag>
                  </NSpace>

                  <div v-if="spec.materialRemark" style="color: #666">
                    材料备注：{{ spec.materialRemark }}
                  </div>
                </NSpace>
              </NCard>
            </NSpace>
          </NDescriptionsItem>


          <NDescriptionsItem label="打印完成照片">
            <BizFileThumbs
              :file-ids="task.finishPhotoFileIds"
              mode="image"
              :max="5"
            />
          </NDescriptionsItem>

          <NDescriptionsItem label="实体称重照片">
            <BizFileThumbs
              :file-ids="task.entityWeightPhotoFileIds"
              mode="image"
              :max="5"
            />
          </NDescriptionsItem>

          <NDescriptionsItem label="支撑称重照片">
            <BizFileThumbs
              :file-ids="task.supportWeightPhotoFileIds"
              mode="image"
              :max="5"
            />
          </NDescriptionsItem>
        </NDescriptions>
      </NCard>
    </NSpace>
  </NCard>
</template>
