<script setup lang="ts">
import { computed, h, ref, watch } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import {
  NCard,
  NDataTable,
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
import {
  fetchCollabOrderDetail,
  fetchCollabOrderEvents,
  type CollabOrderDetailVO,
  type CollabOrderEventVO,
  type CollabOrderFileVO,
  type CollabPrintSpecVO,
  type CollabPrintTaskSpecVO
} from '@/service/api/biz/collab-order';
import BizFileThumbs from '@/views/biz/components/BizFileThumbs.vue';
import CollabBillingPanel from '@/views/biz/components/CollabBillingPanel.vue';

const props = withDefaults(
  defineProps<{
    show: boolean;
    collabOrderId?: string | number | null;
    readonly?: boolean;
  }>(),
  {
    collabOrderId: null,
    readonly: true
  }
);

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

const message = useMessage();
const loading = ref(false);
const detail = ref<CollabOrderDetailVO | null>(null);
const events = ref<CollabOrderEventVO[]>([]);

const visible = computed({
  get: () => props.show,
  set: value => emit('update:show', value)
});

const order = computed(() => detail.value?.order || null);
const receiverPrintTask = computed(() => detail.value?.receiverPrintTask || order.value?.receiverPrintTask || null);
const plannedPrintSpecs = computed(() => detail.value?.printSpecs || []);
const actualPrintSpecs = computed(() => receiverPrintTask.value?.printSpecs || []);

const fileColumns: DataTableColumns<CollabOrderFileVO> = [
  {
    title: '文件类型',
    key: 'fileType',
    width: 140,
    render(row) {
      return fileTypeText(row.fileType);
    }
  },
  {
    title: '文件',
    key: 'fileId',
    render(row) {
      return h(BizFileThumbs, {
        fileIds: row.fileId == null ? null : [row.fileId],
        mode: 'auto',
        max: 4,
        thumbSize: 52
      });
    }
  },
  {
    title: '发单方可见',
    key: 'visibleToSender',
    width: 120,
    render(row) {
      return yesNo(row.visibleToSender);
    }
  },
  {
    title: '接单方可见',
    key: 'visibleToReceiver',
    width: 120,
    render(row) {
      return yesNo(row.visibleToReceiver);
    }
  }
];

const plannedSpecColumns: DataTableColumns<CollabPrintSpecVO> = [
  {
    title: '规格',
    key: 'heightCm',
    width: 120,
    render(row) {
      return `${decimalValue(row.heightCm)}cm`;
    }
  },
  {
    title: '数量',
    key: 'quantity',
    width: 90,
    render(row) {
      return row.quantity || 1;
    }
  },
  {
    title: '预估克数',
    key: 'estimatedWeightG',
    width: 120,
    render(row) {
      return `${decimalValue(row.estimatedWeightG)}g`;
    }
  },
  {
    title: '预估费用',
    key: 'estimatedAmount',
    width: 120,
    render(row) {
      return money(row.estimatedAmount);
    }
  },
  {
    title: '备注',
    key: 'remark',
    minWidth: 180,
    render(row) {
      return row.remark || '-';
    }
  }
];

const actualSpecColumns: DataTableColumns<CollabPrintTaskSpecVO> = [
  {
    title: '规格',
    key: 'heightCm',
    width: 90,
    render(row) {
      return `${decimalValue(row.heightCm)}cm`;
    }
  },
  {
    title: '实体克数',
    key: 'actualEntityWeightG',
    width: 100,
    render(row) {
      return `${decimalValue(row.actualEntityWeightG)}g`;
    }
  },
  {
    title: '支撑克数',
    key: 'actualSupportWeightG',
    width: 100,
    render(row) {
      return `${decimalValue(row.actualSupportWeightG)}g`;
    }
  },
  {
    title: '小计',
    key: 'actualAmount',
    width: 110,
    render(row) {
      return money(row.actualAmount);
    }
  },
  {
    title: '实体称重照片',
    key: 'actualEntityWeightPhotoFileIds',
    width: 150,
    render(row) {
      return h(BizFileThumbs, {
        fileIds: row.actualEntityWeightPhotoFileIds,
        mode: 'image',
        max: 3,
        thumbSize: 48
      });
    }
  },
  {
    title: '支撑称重照片',
    key: 'actualSupportWeightPhotoFileIds',
    width: 150,
    render(row) {
      return h(BizFileThumbs, {
        fileIds: row.actualSupportWeightPhotoFileIds,
        mode: 'image',
        max: 3,
        thumbSize: 48
      });
    }
  },
  {
    title: '备注',
    key: 'materialRemark',
    minWidth: 160,
    render(row) {
      return row.materialRemark || row.remark || '-';
    }
  }
];

watch(
  () => props.show,
  value => {
    if (value) {
      loadDetail();
    }
  }
);

watch(
  () => props.collabOrderId,
  () => {
    if (props.show) {
      loadDetail();
    }
  }
);

async function loadDetail() {
  if (!props.collabOrderId) {
    detail.value = null;
    events.value = [];
    return;
  }

  loading.value = true;
  try {
    const [detailRes, eventRes] = await Promise.all([
      fetchCollabOrderDetail(props.collabOrderId),
      fetchCollabOrderEvents(props.collabOrderId)
    ]);
    detail.value = unwrapData(detailRes);
    events.value = unwrapRows(eventRes);
  } catch {
    message.error('协作单详情加载失败');
  } finally {
    loading.value = false;
  }
}

function unwrapData(res: any) {
  return res?.data ?? res;
}

function unwrapRows(res: any) {
  const data = unwrapData(res);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(res?.rows)) return res.rows;
  return [];
}

function decimalValue(value?: string | number | null, digits = 2) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '0.00';
  return num.toFixed(digits).replace(/\.?0+$/, '') || '0';
}

function money(value?: string | number | null) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '￥0.00';
  return `￥${num.toFixed(2)}`;
}

function yesNo(value?: string | boolean) {
  return value === true || value === 'Y' ? '是' : '否';
}

function serviceTypeText(value?: string) {
  const map: Record<string, string> = {
    REPAIR: '修模',
    PRINT: '打印',
    REPAIR_PRINT: '修模+打印'
  };
  return value ? map[value] || value : '-';
}

function materialPackageTypeText(value?: string) {
  const map: Record<string, string> = {
    SOURCE_IMAGES: '原图资料',
    PRINT_MODEL: '打印模型资料',
    BOTH: '原图+模型资料'
  };
  return value ? map[value] || value : '-';
}

function statusTagType(value?: string): 'success' | 'error' | 'warning' | 'info' {
  if (['COMPLETED', 'PAID', 'DELIVERED', 'PRINT_COMPLETED'].includes(value || '')) return 'success';
  if (['REJECTED', 'CANCELLED', 'FAILED'].includes(value || '')) return 'error';
  if (['WAIT_ACCEPT', 'WAIT_REVIEW', 'WAIT_PRINT', 'WAIT_DELIVERY', 'WAIT_BILL'].includes(value || '')) return 'warning';
  return 'info';
}

function fileTypeText(value?: string) {
  const map: Record<string, string> = {
    SOURCE_IMAGE: '源图',
    HD_IMAGE: '高清图',
    EFFECT_IMAGE: '效果图',
    EFFECT_VIDEO: '效果视频',
    MODEL_FILE: '模型文件',
    PRINT_MODEL: '打印模型',
    DELIVERY: '发货附件',
    OTHER: '其他'
  };
  return value ? map[value] || value : '-';
}

function eventFileIds(item: CollabOrderEventVO) {
  if (!item.attachmentsJson) return [];
  try {
    const parsed = JSON.parse(item.attachmentsJson);
    if (Array.isArray(parsed)) {
      return parsed.map(file => (typeof file === 'object' ? file.fileId || file.id : file)).filter(Boolean);
    }
    if (Array.isArray(parsed.fileIds)) return parsed.fileIds;
    if (Array.isArray(parsed.attachmentIds)) return parsed.attachmentIds;
    if (parsed.fileId) return [parsed.fileId];
  } catch {
    return item.attachmentsJson
      .split(',')
      .map(fileId => fileId.trim())
      .filter(Boolean);
  }
  return [];
}
</script>

<template>
  <NDrawer v-model:show="visible" :width="1120" placement="right">
    <NDrawerContent title="协作单详情" closable>
      <NSpin :show="loading">
        <NSpace v-if="order" vertical :size="16">
          <NCard title="基础信息" size="small">
            <NDescriptions bordered :column="3" size="small">
              <NDescriptionsItem label="协作单号">{{ order.collabOrderNo || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="源订单号">{{ order.sourceOrderNoSnapshot || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="协作工序">{{ serviceTypeText(order.serviceType) }}</NDescriptionsItem>
              <NDescriptionsItem label="发单方">{{ order.senderTenantNameSnapshot || order.senderTenantId || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="接单方">{{ order.receiverTenantNameSnapshot || order.receiverTenantId || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="资料类型">{{ materialPackageTypeText(order.materialPackageType) }}</NDescriptionsItem>
              <NDescriptionsItem label="协作状态">
                <NTag :type="statusTagType(order.status)">{{ order.status || '-' }}</NTag>
              </NDescriptionsItem>
              <NDescriptionsItem label="打印状态">
                <NTag :type="statusTagType(order.printStatus)">{{ order.printStatus || '-' }}</NTag>
              </NDescriptionsItem>
              <NDescriptionsItem label="发货状态">
                <NTag :type="statusTagType(order.deliveryStatus)">{{ order.deliveryStatus || '-' }}</NTag>
              </NDescriptionsItem>
              <NDescriptionsItem label="产品名称">{{ order.sourceProductNameSnapshot || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="产品类型">{{ order.sourceProductTypeSnapshot || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="数量">{{ order.sourceQuantitySnapshot || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="修模费用">{{ money(order.senderRepairFeeAmount) }}</NDescriptionsItem>
              <NDescriptionsItem label="打印费用">{{ money(order.printFeeAmount) }}</NDescriptionsItem>
              <NDescriptionsItem label="协作金额">{{ money(order.collabAmount) }}</NDescriptionsItem>
              <NDescriptionsItem label="需求说明" :span="3">{{ order.requirementDesc || '-' }}</NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <NCard title="打印与发货" size="small">
            <NDescriptions bordered :column="3" size="small">
              <NDescriptionsItem label="打印任务号">{{ receiverPrintTask?.taskNo || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="打印费用">{{ money(receiverPrintTask?.finalAmount ?? order.printFeeAmount) }}</NDescriptionsItem>
              <NDescriptionsItem label="材料录入时间">{{ receiverPrintTask?.materialRecordTime || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="实体克数">{{ decimalValue(receiverPrintTask?.entityWeightG) }}g</NDescriptionsItem>
              <NDescriptionsItem label="支撑克数">{{ decimalValue(receiverPrintTask?.supportWeightG) }}g</NDescriptionsItem>
              <NDescriptionsItem label="打印完成时间">{{ receiverPrintTask?.finishTime || order.printCompletedTime || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="收货人">{{ order.receiverNameSnapshot || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="联系电话">{{ order.receiverPhoneSnapshot || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="物流单号">{{ order.logisticsNo || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="收货地址" :span="3">{{ order.receiverAddressSnapshot || '-' }}</NDescriptionsItem>
              <NDescriptionsItem label="打印完成照片" :span="3">
                <BizFileThumbs :file-ids="receiverPrintTask?.finishPhotoFileIds" mode="image" :max="8" :thumb-size="56" />
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <NCard title="打印规格" size="small">
            <NSpace vertical :size="12">
              <NDataTable
                v-if="plannedPrintSpecs.length"
                size="small"
                :columns="plannedSpecColumns"
                :data="plannedPrintSpecs"
                :pagination="false"
              />
              <NEmpty v-else description="暂无发单打印规格" />

              <NDataTable
                v-if="actualPrintSpecs.length"
                size="small"
                :columns="actualSpecColumns"
                :data="actualPrintSpecs"
                :pagination="false"
                :scroll-x="920"
              />
            </NSpace>
          </NCard>

          <CollabBillingPanel :detail="detail" role="auto" />

          <NCard title="附件" size="small">
            <NDataTable
              v-if="detail?.files?.length"
              size="small"
              :columns="fileColumns"
              :data="detail.files"
              :pagination="false"
            />
            <NEmpty v-else description="暂无附件" />
          </NCard>

          <NCard title="时间线" size="small">
            <NSpace v-if="events.length" vertical :size="10">
              <div v-for="item in events" :key="item.id" class="timeline-item">
                <div class="timeline-head">
                  <span>{{ item.eventName || item.eventType || '-' }}</span>
                  <span>{{ item.createTime || '-' }}</span>
                </div>
                <div class="timeline-meta">{{ item.operatorTenantNameSnapshot || '-' }} / {{ item.operatorUserName || '-' }}</div>
                <div v-if="item.eventContent" class="timeline-content">{{ item.eventContent }}</div>
                <BizFileThumbs
                  v-if="eventFileIds(item).length"
                  :file-ids="eventFileIds(item)"
                  mode="auto"
                  :max="6"
                  :thumb-size="48"
                />
              </div>
            </NSpace>
            <NEmpty v-else description="暂无时间线记录" />
          </NCard>
        </NSpace>
        <NEmpty v-else description="暂无协作单详情" />
      </NSpin>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.timeline-item {
  padding: 10px 12px;
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
}

.timeline-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-weight: 600;
}

.timeline-meta {
  margin-top: 4px;
  color: var(--n-text-color-3);
  font-size: 12px;
}

.timeline-content {
  margin: 8px 0;
  white-space: pre-wrap;
}
</style>
