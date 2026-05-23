<template>
  <NSpace vertical :size="16">
    <NCard title="好友定向发单" :bordered="false">
      <NAlert type="info" :bordered="false">
        当前发单方式为：按订单工序路由发起协作。请选择一个源订单，再选择需要外协的工序。
      </NAlert>
    </NCard>

    <NSpin :show="loading">
      <NSpace vertical :size="16">
        <NCard title="选择源订单" :bordered="false">
          <NForm label-placement="left" label-width="110px">
            <NFormItem label="源订单" required>
              <NSelect
                v-model:value="form.sourceOrderId"
                :options="sourceOrderOptions"
                filterable
                clearable
                placeholder="请选择源订单"
                @update:value="handleSourceOrderChange"
              />
            </NFormItem>
          </NForm>

          <NDescriptions
            v-if="sourceOrder && sourceOrder.id"
            bordered
            :column="2"
            size="small"
          >
            <NDescriptionsItem label="订单号">
              {{ sourceOrder.orderNo || sourceOrder.orderNoSnapshot || '-' }}
            </NDescriptionsItem>

            <NDescriptionsItem label="客户">
              {{ sourceOrder.customerNameSnapshot || sourceOrder.customerName || '-' }}
            </NDescriptionsItem>

            <NDescriptionsItem label="服务类型">
              {{ serviceTypeText(sourceOrder.serviceType) }}
            </NDescriptionsItem>

            <NDescriptionsItem label="业务状态">
              {{ sourceOrder.businessStatus || '-' }}
            </NDescriptionsItem>
          </NDescriptions>
        </NCard>

        <NCard title="选择外协工序" :bordered="false">
          <NAlert v-if="!form.sourceOrderId" type="info" class="mb-12px">
            请先选择源订单。
          </NAlert>

          <NAlert v-else-if="!externalRoutes.length" type="warning" class="mb-12px">
            当前订单没有可外协的工序。请先在订单详情中配置工序路由。
          </NAlert>

          <template v-else>
            <NCheckboxGroup v-model:value="selectedRouteKeys">
              <NSpace vertical>
                <NCard
                  v-for="item in externalRoutes"
                  :key="routeIdKey(item.id)"
                  size="small"
                  embedded
                  class="route-card"
                >
                  <NSpace justify="space-between" align="center">
                    <NSpace vertical :size="4">
                      <NSpace align="center">
                        <NCheckbox
                          :value="routeIdKey(item.id)"
                          :disabled="!canSelectRoute(item)"
                        >
                          {{ item.stageNameSnapshot || item.stageCode || '-' }}
                        </NCheckbox>

                        <NTag size="small" :type="routeStatusTagType(item.routeStatus)">
                          {{ routeStatusText(item.routeStatus) }}
                        </NTag>
                      </NSpace>

                      <div class="route-desc">
                        目标商家：{{ item.targetTenantNameSnapshot || '-' }}
                        <span v-if="item.collabOrderNoSnapshot">
                          ，已关联协作单：{{ item.collabOrderNoSnapshot }}
                        </span>
                      </div>
                    </NSpace>

                    <NTag size="small">
                      {{ item.stageCode || '-' }}
                    </NTag>
                  </NSpace>
                </NCard>
              </NSpace>
            </NCheckboxGroup>
          </template>
        </NCard>


        <NCard title="协作服务信息" :bordered="false">
          <NForm label-placement="left" label-width="120px">
            <NFormItem label="协作范围">
              <NTag type="info">
                {{ collabScopeText(actualCollabScope) }}
              </NTag>
            </NFormItem>

            <NFormItem label="接单商家">
              <NTag v-if="selectedReceiverTenantName" type="success">
                {{ selectedReceiverTenantName }}
              </NTag>
              <NTag v-else type="warning">
                请先选择外协工序
              </NTag>
            </NFormItem>

            <NFormItem label="服务类型" required>
              <NSelect
                v-model:value="form.serviceType"
                :options="serviceTypeOptions"
                placeholder="请选择服务类型"
                style="width: 260px"
              />
            </NFormItem>

            <NFormItem label="资料包类型" required>
              <NSelect
                v-model:value="form.materialPackageType"
                :options="materialPackageOptions"
                placeholder="请选择资料包类型"
                style="width: 300px"
              />
            </NFormItem>

            <NFormItem label="修模费用">
              <NInputNumber
                v-model:value="form.senderRepairFeeAmount"
                :min="0"
                :precision="2"
                placeholder="请输入修模费用"
                style="width: 260px"
              />
            </NFormItem>

            <NFormItem label="标题">
              <NInput
                v-model:value="form.title"
                placeholder="请输入协作标题"
              />
            </NFormItem>

            <NFormItem label="需求说明">
              <NInput
                v-model:value="form.requirementDesc"
                type="textarea"
                placeholder="请输入修模、打印、发货等协作要求"
              />
            </NFormItem>
          </NForm>
        </NCard>

        <NCard title="协作资料包" :bordered="false">
          <NSpace vertical :size="16">
            <NCard
              v-if="form.materialPackageType === 'RAW_PHOTO'"
              title="原始照片"
              size="small"
            >
              <NSpace vertical>
                <div class="upload-desc">
                  上传原始照片。接单方需要先处理高清图，再提交给发单方确认。
                </div>

                <BizFileUpload
                  v-model="rawPhotoFileIds"
                  biz-type="TEMP"
                  file-stage="COLLAB_SEND"
                  file-type="RAW_PHOTO"
                  :max="20"
                  :accept="imageAccept"
                />

                <BizFileViewer
                  v-if="rawPhotoFileIds.length"
                  :file-ids="rawPhotoFileIds"
                  mode="image"
                  :max="20"
                  :thumb-size="80"
                  show-name
                />
              </NSpace>
            </NCard>

            <NCard
              v-if="form.materialPackageType === 'HD_PHOTO' || form.materialPackageType === 'HD_PHOTO_AI_MODEL'"
              title="高清照片"
              size="small"
            >
              <NSpace vertical>
                <div class="upload-desc">
                  上传已经处理好的高清照片。
                </div>

                <BizFileUpload
                  v-model="hdPhotoFileIds"
                  biz-type="TEMP"
                  file-stage="COLLAB_SEND"
                  file-type="HD_PHOTO"
                  :max="20"
                  :accept="imageAccept"
                />

                <BizFileViewer
                  v-if="hdPhotoFileIds.length"
                  :file-ids="hdPhotoFileIds"
                  mode="image"
                  :max="20"
                  :thumb-size="80"
                  show-name
                />
              </NSpace>
            </NCard>

            <NCard
              v-if="form.materialPackageType === 'HD_PHOTO_AI_MODEL'"
              title="AI模型文件"
              size="small"
            >
              <NSpace vertical>
                <div class="upload-desc">
                  上传 AI 建好的模型文件，如 STL / OBJ / 3MF / ZIP 等。
                </div>

                <BizFileUpload
                  v-model="aiModelFileIds"
                  biz-type="TEMP"
                  file-stage="COLLAB_SEND"
                  file-type="AI_MODEL_FILE"
                  :max="10"
                  :accept="modelFileAccept"
                />

                <BizFileViewer
                  v-if="aiModelFileIds.length"
                  :file-ids="aiModelFileIds"
                  mode="download"
                  :max="10"
                  :thumb-size="80"
                  show-name
                />
              </NSpace>
            </NCard>

            <NCard
              v-if="form.materialPackageType === 'PRINT_MODEL_ONLY'"
              title="仅打印模型资料"
              size="small"
            >
              <NSpace vertical :size="12">
                <NAlert type="info" show-icon>
                  仅打印模型资料包用于“只打印”协作。模型可以来自源订单已修好的模型，也可以手动上传压缩包。
                </NAlert>

                <NFormItem label="模型来源" required>
                  <NSelect
                    v-model:value="form.printModelSourceType"
                    :options="printModelSourceOptions"
                    placeholder="请选择打印模型来源"
                    style="width: 320px"
                  />
                </NFormItem>

                <NFormItem
                  v-if="form.printModelSourceType === 'SOURCE_COLLAB_REPAIR_MODEL'"
                  label="来源协作单ID"
                  required
                >
<!--                  <NInput-->
<!--                    v-model:value="form.printModelSourceId"-->
<!--                    placeholder="请输入上一笔修模协作单ID，后续可优化为选择器"-->
<!--                    style="width: 360px"-->
<!--                  />-->
                </NFormItem>

                <NAlert
                  v-if="form.printModelSourceType === 'SOURCE_ORDER_REPAIR_MODEL'"
                  type="success"
                  show-icon
                >
                  系统将在发单时自动从源订单内部修模任务中获取已上传的模型文件，无需重复上传。
                </NAlert>

                <template v-if="form.printModelSourceType === 'MANUAL_UPLOAD'">
                  <div class="upload-desc">
                    上传打印模型压缩包。第一版建议上传 zip / rar / 7z，后续再支持 OBJ / MTL / 贴图本地预览。
                  </div>

                  <BizFileUpload
                    v-model="printModelArchiveFileIds"
                    biz-type="TEMP"
                    file-stage="COLLAB_SEND"
                    file-type="PRINT_MODEL_ARCHIVE"
                    :max="5"
                    :accept="modelArchiveAccept"
                  />

                  <BizFileViewer
                    v-if="printModelArchiveFileIds.length"
                    :file-ids="printModelArchiveFileIds"
                    mode="download"
                    :max="5"
                    show-name
                  />
                </template>
              </NSpace>
            </NCard>


            <NCard
              v-if="containsPrintStage"
              title="打印规格"
              size="small"
            >
              <NSpace vertical :size="12">
                <NAlert type="warning" show-icon>
                  打印规格用于告诉接单方需要打印哪些高度和数量。这里的预估克重和预估金额仅作参考，最终价格以打印完成后的真实材料录入为准。
                </NAlert>

                <NCard
                  v-for="(item, index) in printSpecs"
                  :key="index"
                  size="small"
                  :bordered="true"
                >
                  <NSpace vertical :size="8">
                    <NSpace align="center" justify="space-between">
                      <NTag type="info" :bordered="false" round>
                        规格 {{ Number(index) + 1 }}
                      </NTag>

                      <NButton
                        size="small"
                        quaternary
                        type="error"
                        :disabled="printSpecs.length <= 1"
                        @click="removePrintSpec(index)"
                      >
                        删除
                      </NButton>
                    </NSpace>

                    <NSpace :size="12" align="center" wrap>
                      <NFormItem label="打印高度/cm" required>
                        <NInputNumber
                          v-model:value="item.heightCm"
                          :min="0.01"
                          :precision="2"
                          placeholder="如 12"
                          style="width: 160px"
                        />
                      </NFormItem>

                      <NFormItem label="打印数量" required>
                        <NInputNumber
                          v-model:value="item.quantity"
                          :min="1"
                          :precision="0"
                          placeholder="如 1"
                          style="width: 140px"
                        />
                      </NFormItem>

                      <NFormItem label="预估克重/g">
                        <NInputNumber
                          v-model:value="item.estimatedWeightG"
                          :min="0"
                          :precision="2"
                          placeholder="可选"
                          style="width: 160px"
                        />
                      </NFormItem>

                      <NFormItem label="预估金额">
                        <NInputNumber
                          v-model:value="item.estimatedAmount"
                          :min="0"
                          :precision="2"
                          placeholder="可选"
                          style="width: 160px"
                        />
                      </NFormItem>
                    </NSpace>

                    <NInput
                      v-model:value="item.remark"
                      placeholder="规格备注，可选"
                    />
                  </NSpace>
                </NCard>

                <NButton dashed type="primary" @click="addPrintSpec">
                  新增打印规格
                </NButton>
              </NSpace>
            </NCard>


            <NCard title="备注图" size="small">
              <NSpace vertical>
                <div class="upload-desc">
                  可选，上传备注图、标注图、沟通说明图片。
                </div>

                <BizFileUpload
                  v-model="remarkImageFileIds"
                  biz-type="TEMP"
                  file-stage="COLLAB_SEND"
                  file-type="REMARK_IMAGE"
                  :max="10"
                  :accept="imageAccept"
                />

                <BizFileViewer
                  v-if="remarkImageFileIds.length"
                  :file-ids="remarkImageFileIds"
                  mode="image"
                  :max="10"
                  :thumb-size="80"
                  show-name
                />
              </NSpace>
            </NCard>
          </NSpace>
        </NCard>

        <NCard :bordered="false">
          <NSpace justify="end">
            <NButton @click="goBack">返回</NButton>
            <NButton type="primary" :loading="submitting" @click="submit">
              发送协作单
            </NButton>
          </NSpace>
        </NCard>
      </NSpace>
    </NSpin>
  </NSpace>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NAlert,
  NButton,
  NCard,
  NCheckbox,
  NCheckboxGroup,
  NDescriptions,
  NDescriptionsItem,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NSpace,
  NSpin,
  NTag,
  useMessage
} from 'naive-ui';

import BizFileViewer from '@/views/biz/components/BizFileViewer.vue';
import BizFileUpload from '@/views/biz/components/BizFileUpload.vue';
import CollabBillingPanel from '@/views/biz/components/CollabBillingPanel.vue';


import {
  fetchCollabSourceOrders,
  sendCollabOrderByStageRoute
} from '@/service/api/biz/collab-order';

import {
  fetchOrderDetail,
  fetchOrderStageRoutes
} from '@/service/api/biz/order';

defineOptions({
  name: 'BizCollabOrderSend'
});

type CollabId = string | number;

interface SourceOrderVO {
  id?: CollabId;
  orderNo?: string;
  orderNoSnapshot?: string;
  customerName?: string;
  customerNameSnapshot?: string;
  serviceType?: string;
  routeSummaryMode?: string;
  businessStatus?: string;
  [key: string]: any;
}

interface OrderStageRouteVO {
  id?: CollabId;
  stageCode?: string;
  stageNameSnapshot?: string;
  stageSeq?: number;
  routeMode?: 'INTERNAL' | 'EXTERNAL' | 'SKIP';
  routeStatus?:
    | 'PLANNED'
    | 'WAIT_TRIGGER'
    | 'DISPATCHED'
    | 'RUNNING'
    | 'WAIT_REVIEW'
    | 'COMPLETED'
    | 'REJECTED'
    | 'CANCELLED'
    | 'SKIPPED';
  triggerAfterStageCode?: string;
  routeBundleNo?: string;
  targetTenantId?: string;
  targetTenantNameSnapshot?: string;
  collabOrderId?: CollabId;
  collabOrderNoSnapshot?: string;
  remark?: string;
  orderNoSnapshot?: string;
  [key: string]: any;
}

const route = useRoute();
const router = useRouter();
const message = useMessage();

const loading = ref(false);
const submitting = ref(false);

const sourceOrderRows = ref<SourceOrderVO[]>([]);
const sourceOrder = ref<SourceOrderVO | null>(null);
const stageRoutes = ref<OrderStageRouteVO[]>([]);
const selectedRouteKeys = ref<string[]>([]);

const rawPhotoFileIds = ref<CollabId[]>([]);
const hdPhotoFileIds = ref<CollabId[]>([]);
const aiModelFileIds = ref<CollabId[]>([]);
const remarkImageFileIds = ref<CollabId[]>([]);

const printModelArchiveFileIds = ref<CollabId[]>([]);

interface PrintSpecFormItem {
  heightCm: number | null;
  quantity: number;
  estimatedWeightG?: number | null;
  estimatedAmount?: number | null;
  remark?: string;
}

const printSpecs = ref<PrintSpecFormItem[]>([
  {
    heightCm: null,
    quantity: 1,
    estimatedWeightG: null,
    estimatedAmount: null,
    remark: ''
  }
]);

const modelArchiveAccept = '.zip,.rar,.7z';


const imageAccept = 'image/*';
const modelFileAccept = '.stl,.obj,.3mf,.zip,.rar,.7z,.step,.stp';

const form = reactive({
  sourceOrderId: null as CollabId | null,
  serviceType: '',
  materialPackageType: 'RAW_PHOTO',

  /**
   * MANUAL_UPLOAD / SOURCE_ORDER_REPAIR_MODEL / SOURCE_COLLAB_REPAIR_MODEL
   */
  printModelSourceType: 'SOURCE_ORDER_REPAIR_MODEL',

  /**
   * 来源协作单 ID。
   * 第一版先手动输入，后面可以改成来源协作单选择器。
   */
  printModelSourceId: null as CollabId | null,

  senderRepairFeeAmount: null as number | null,
  title: '',
  requirementDesc: ''
});


const serviceTypeOptions = [
  { label: '只修模', value: 'REPAIR_ONLY' },
  { label: '只打印', value: 'PRINT_ONLY' },
  { label: '修模 + 打印', value: 'REPAIR_PRINT' }
];

const printModelSourceOptions = [
  {
    label: '使用源订单已修好的模型',
    value: 'SOURCE_ORDER_REPAIR_MODEL'
  },
  {
    label: '使用源订单客户打印模型',
    value: 'SOURCE_ORDER_PRINT_INPUT_MODEL'
  },
  {
    label: '手动上传模型压缩包',
    value: 'MANUAL_UPLOAD'
  },
  {
    label: '使用上一笔修模协作单模型',
    value: 'SOURCE_COLLAB_REPAIR_MODEL'
  }
];

function splitIds(value?: string) {
  if (!value) return [];

  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function fillFilesFromSourceOrder(order: any) {
  if (!order) return;

  if (rawPhotoFileIds.value.length === 0) {
    rawPhotoFileIds.value = splitIds(order.originalImageFileIds);
  }

  if (remarkImageFileIds.value.length === 0) {
    remarkImageFileIds.value = splitIds(order.remarkImageFileIds);
  }

  if (aiModelFileIds.value.length === 0) {
    aiModelFileIds.value = splitIds(order.aiBaseModelFileIds);
  }

  /*
   * 只打印源订单：
   * 默认使用源订单客户打印模型。
   */
  if (order.orderType === 'PRINT_ONLY' && order.printInputModelFileIds) {
    form.printModelSourceType = 'SOURCE_ORDER_PRINT_INPUT_MODEL';
  }
}


const sourceOrderOptions = computed(() => {
  return sourceOrderRows.value.map(item => ({
    label: `${item.orderNo || item.orderNoSnapshot || item.id} / ${item.customerNameSnapshot || item.customerName || '-'}`,
    value: item.id
  }));
});

const externalRoutes = computed(() => {
  return stageRoutes.value
    .filter(item => item.routeMode === 'EXTERNAL')
    .sort((a, b) => Number(a.stageSeq || 0) - Number(b.stageSeq || 0));
});

const selectedRoutes = computed(() => {
  return externalRoutes.value.filter(item => selectedRouteKeys.value.includes(routeIdKey(item.id)));
});

const selectedReceiverTenantIds = computed(() => {
  return Array.from(
    new Set(
      selectedRoutes.value
        .map(item => item.targetTenantId)
        .filter(Boolean)
        .map(item => String(item))
    )
  );
});

const selectedReceiverTenantId = computed(() => {
  return selectedReceiverTenantIds.value.length === 1 ? selectedReceiverTenantIds.value[0] : '';
});

const selectedReceiverTenantName = computed(() => {
  const first = selectedRoutes.value.find(item => item.targetTenantId === selectedReceiverTenantId.value);
  return first?.targetTenantNameSnapshot || '';
});

function routeStageCode(row: any) {
  return String(row?.stageCode || '').toUpperCase();
}

function isRepairRoute(row: any) {
  return routeStageCode(row).includes('REPAIR');
}

function isPrintRoute(row: any) {
  return routeStageCode(row).includes('PRINT');
}

const actualCollabScope = computed(() => {
  const hasRepair = selectedRoutes.value.some(item => isRepairRoute(item));
  const hasPrint = selectedRoutes.value.some(item => isPrintRoute(item));

  if (hasRepair && hasPrint) {
    return 'REPAIR_PRINT_STAGE';
  }

  if (hasRepair) {
    return 'REPAIR_STAGE';
  }

  if (hasPrint) {
    return 'PRINT_STAGE';
  }

  return '';
});


function isRepairStage(stageCode?: string) {
  const code = String(stageCode || '').toUpperCase();

  return code.includes('REPAIR');
}

function isPrintStage(stageCode?: string) {
  const code = String(stageCode || '').toUpperCase();

  return code.includes('PRINT');
}

function inferServiceTypeBySelectedRoutes() {
  if (selectedRoutes.value.length === 0) {
    return '';
  }

  const hasRepair = selectedRoutes.value.some(item => isRepairStage(item.stageCode));
  const hasPrint = selectedRoutes.value.some(item => isPrintStage(item.stageCode));

  if (hasRepair && hasPrint) return 'REPAIR_PRINT';
  if (hasRepair) return 'REPAIR_ONLY';
  if (hasPrint) return 'PRINT_ONLY';

  return '';
}

const actualServiceType = computed(() => {
  if (actualCollabScope.value === 'REPAIR_STAGE') {
    return 'REPAIR_ONLY';
  }

  if (actualCollabScope.value === 'PRINT_STAGE') {
    return 'PRINT_ONLY';
  }

  if (actualCollabScope.value === 'REPAIR_PRINT_STAGE') {
    return 'REPAIR_PRINT';
  }

  return form.serviceType || sourceOrder.value?.serviceType || 'REPAIR_PRINT';
});


const containsPrintStage = computed(() => {
  return actualServiceType.value === 'PRINT_ONLY' || actualServiceType.value === 'REPAIR_PRINT';
});

const isPrintModelOnly = computed(() => {
  return form.materialPackageType === 'PRINT_MODEL_ONLY';
});

const materialPackageOptions = computed(() => {
  if (actualServiceType.value === 'PRINT_ONLY') {
    return [
      { label: '仅打印模型文件', value: 'PRINT_MODEL_ONLY' },
      { label: '高清照片 + AI模型文件', value: 'HD_PHOTO_AI_MODEL' }
    ];
  }

  if (actualServiceType.value === 'REPAIR_PRINT') {
    return [
      { label: '原始照片', value: 'RAW_PHOTO' },
      { label: '高清照片', value: 'HD_PHOTO' },
      { label: '高清照片 + AI模型文件', value: 'HD_PHOTO_AI_MODEL' }
    ];
  }

  return [
    { label: '原始照片', value: 'RAW_PHOTO' },
    { label: '高清照片', value: 'HD_PHOTO' },
    { label: '高清照片 + AI模型文件', value: 'HD_PHOTO_AI_MODEL' }
  ];
});


watch(
  () => actualServiceType.value,
  value => {
    form.serviceType = value;

    if (value === 'PRINT_ONLY') {
      if (!['PRINT_MODEL_ONLY', 'HD_PHOTO_AI_MODEL'].includes(form.materialPackageType)) {
        form.materialPackageType = 'PRINT_MODEL_ONLY';
      }

      if (!form.printModelSourceType) {
        form.printModelSourceType = 'SOURCE_ORDER_REPAIR_MODEL';
      }
    } else if (form.materialPackageType === 'PRINT_MODEL_ONLY') {
      form.materialPackageType = 'HD_PHOTO_AI_MODEL';
    }

    ensurePrintSpecRows();
  },
  { immediate: true }
);

watch(
  () => form.materialPackageType,
  value => {
    if (value === 'PRINT_MODEL_ONLY' && !form.printModelSourceType) {
      form.printModelSourceType = 'SOURCE_ORDER_REPAIR_MODEL';
    }
  }
);


onMounted(() => {
  initPage();
});

async function initPage() {
  loading.value = true;

  try {
    await loadSourceOrders();

    const sourceOrderId = route.query.sourceOrderId ? String(route.query.sourceOrderId) : '';
    const routeIds = route.query.routeIds
      ? String(route.query.routeIds)
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
      : [];

    if (!sourceOrderId) {
      sourceOrder.value = null;
      resetCollabForm();
      return;
    }

    form.sourceOrderId = sourceOrderId;
    await loadSourceOrderDetail(sourceOrderId);
    await loadStageRoutes(sourceOrderId, routeIds);
  } catch (error) {
    console.error(error);
    message.error('初始化协作发单页失败');
  } finally {
    loading.value = false;
  }
}

async function loadSourceOrders() {
  const res = await fetchCollabSourceOrders({
    pageNum: 1,
    pageSize: 100
  } as any);

  sourceOrderRows.value = unwrapRows(res);
}

async function loadSourceOrderDetail(orderId: CollabId) {
  const res = await fetchOrderDetail(orderId);
  const data = unwrapData<SourceOrderVO>(res);
  sourceOrder.value = data || { id: orderId };
  upsertSourceOrderRow(sourceOrder.value);
  fillFilesFromSourceOrder(sourceOrder.value);

}

function upsertSourceOrderRow(row: SourceOrderVO) {
  if (!row || row.id === undefined || row.id === null) return;

  const idx = sourceOrderRows.value.findIndex(item => String(item.id) === String(row.id));

  if (idx >= 0) {
    sourceOrderRows.value[idx] = {
      ...sourceOrderRows.value[idx],
      ...row
    };
    return;
  }

  sourceOrderRows.value.unshift(row);
}

async function handleSourceOrderChange(value: CollabId | null) {
  resetCollabForm();
  stageRoutes.value = [];
  sourceOrder.value = null;

  if (!value) {
    form.sourceOrderId = null;
    return;
  }

  form.sourceOrderId = value;

  loading.value = true;

  try {
    await loadSourceOrderDetail(value);
    await loadStageRoutes(value);
  } finally {
    loading.value = false;
  }
}

async function loadStageRoutes(orderId: CollabId, defaultSelectedKeys: string[] = []) {
  const res = await fetchOrderStageRoutes(orderId);
  stageRoutes.value = unwrapData<OrderStageRouteVO[]>(res) || [];

  if (stageRoutes.value.length > 0 && (!sourceOrder.value || !sourceOrder.value.orderNo)) {
    sourceOrder.value = {
      ...sourceOrder.value,
      id: orderId,
      orderNo: stageRoutes.value[0].orderNoSnapshot
    };
  }

  const selectableRoutes = externalRoutes.value.filter(canSelectRoute);

  if (defaultSelectedKeys.length > 0) {
    selectedRouteKeys.value = defaultSelectedKeys.filter(key => {
      const target = selectableRoutes.find(item => routeIdKey(item.id) === key);
      return !!target;
    });
    return;
  }

  if (selectableRoutes.length === 1) {
    selectedRouteKeys.value = [routeIdKey(selectableRoutes[0].id)];
  }
}

function canSelectRoute(item: OrderStageRouteVO) {
  if (!item) return false;
  if (item.collabOrderId) return false;
  if (!item.targetTenantId) return false;
  return ['PLANNED', 'WAIT_TRIGGER', undefined, null].includes(item.routeStatus as any);
}

function routeIdKey(value?: CollabId) {
  return value === undefined || value === null ? '' : String(value);
}

function ensurePrintSpecRows() {
  if (!containsPrintStage.value) {
    return;
  }

  if (printSpecs.value.length === 0) {
    addPrintSpec();
  }
}

function addPrintSpec() {
  printSpecs.value.push({
    heightCm: null,
    quantity: 1,
    estimatedWeightG: null,
    estimatedAmount: null,
    remark: ''
  });
}

function removePrintSpec(index: number) {
  if (printSpecs.value.length <= 1) {
    message.warning('至少保留一条打印规格');
    return;
  }

  printSpecs.value.splice(index, 1);
}

function buildPrintSpecsPayload() {
  if (!containsPrintStage.value) {
    return [];
  }

  return printSpecs.value.map((item, index) => ({
    heightCm: Number(item.heightCm || 0),
    quantity: Number(item.quantity || 0),
    estimatedWeightG: item.estimatedWeightG === null || item.estimatedWeightG === undefined ? null : Number(item.estimatedWeightG),
    estimatedAmount: item.estimatedAmount === null || item.estimatedAmount === undefined ? null : Number(item.estimatedAmount),
    sortNo: index,
    remark: item.remark || ''
  }));
}


function validateBeforeSubmit() {
  if (!form.sourceOrderId) {
    message.warning('请选择源订单');
    return false;
  }

  if (selectedRoutes.value.length === 0) {
    message.warning('请选择需要外协的工序');
    return false;
  }

  if (selectedReceiverTenantIds.value.length !== 1) {
    message.warning('请选择同一个接单商家的工序进行发单');
    return false;
  }

  if (!actualServiceType.value) {
    message.warning('请选择服务类型');
    return false;
  }

  if (!form.materialPackageType) {
    message.warning('请选择资料包类型');
    return false;
  }
  if (form.materialPackageType === 'PRINT_MODEL_ONLY') {
    if (!form.printModelSourceType) {
      message.warning('请选择打印模型来源');
      return false;
    }

    if (form.printModelSourceType === 'MANUAL_UPLOAD' && printModelArchiveFileIds.value.length === 0) {
      message.warning('请上传打印模型压缩包');
      return false;
    }

    if (form.printModelSourceType === 'SOURCE_COLLAB_REPAIR_MODEL' && !form.printModelSourceId) {
      message.warning('请输入来源修模协作单 ID');
      return false;
    }
  }

  if (containsPrintStage.value) {
    if (printSpecs.value.length === 0) {
      message.warning('请至少填写一条打印规格');
      return false;
    }

    for (const [index, item] of printSpecs.value.entries()) {
      if (!item.heightCm || Number(item.heightCm) <= 0) {
        message.warning(`第 ${Number(index) + 1} 条打印规格高度必须大于 0`);
        return false;
      }

      if (!item.quantity || Number(item.quantity) <= 0) {
        message.warning(`第 ${Number(index) + 1} 条打印规格数量必须大于 0`);
        return false;
      }
    }
  }

  if (form.materialPackageType === 'RAW_PHOTO' && rawPhotoFileIds.value.length === 0) {
    message.warning('请上传原始照片');
    return false;
  }

  if (form.materialPackageType === 'HD_PHOTO' && hdPhotoFileIds.value.length === 0) {
    message.warning('请上传高清照片');
    return false;
  }

  if (form.materialPackageType === 'HD_PHOTO_AI_MODEL') {
    if (hdPhotoFileIds.value.length === 0) {
      message.warning('请上传高清照片');
      return false;
    }

    if (aiModelFileIds.value.length === 0) {
      message.warning('请上传 AI 模型文件');
      return false;
    }
  }


  return true;
}

function resetCollabForm() {
  selectedRouteKeys.value = [];
  stageRoutes.value = [];

  rawPhotoFileIds.value = [];
  hdPhotoFileIds.value = [];
  aiModelFileIds.value = [];
  remarkImageFileIds.value = [];

  form.materialPackageType = 'RAW_PHOTO';
  form.senderRepairFeeAmount = null;
  form.title = '';
  form.requirementDesc = '';
  printModelArchiveFileIds.value = [];

  printSpecs.value = [
    {
      heightCm: null,
      quantity: 1,
      estimatedWeightG: null,
      estimatedAmount: null,
      remark: ''
    }
  ];

  form.printModelSourceType = 'SOURCE_ORDER_REPAIR_MODEL';
  form.printModelSourceId = null;

}

function buildFiles() {
  const files: Array<{ fileType: string; fileId: CollabId }> = [];

  const pushFiles = (fileType: string, ids: CollabId[]) => {
    ids.forEach(fileId => {
      files.push({
        fileType,
        fileId
      });
    });
  };

  pushFiles('RAW_PHOTO', rawPhotoFileIds.value);
  pushFiles('HD_PHOTO', hdPhotoFileIds.value);
  pushFiles('AI_MODEL_FILE', aiModelFileIds.value);
  pushFiles('PRINT_MODEL_ARCHIVE', printModelArchiveFileIds.value);
  pushFiles('REMARK_IMAGE', remarkImageFileIds.value);

  return files;
}


async function submit() {
  if (!validateBeforeSubmit()) return;

  submitting.value = true;

  try {
    const payload = {
      sourceOrderId: form.sourceOrderId,
      sourceStageRouteIds: selectedRoutes.value
        .map(item => item.id)
        .filter(item => item !== undefined && item !== null),

      collabScope: actualCollabScope.value,
      receiverTenantId: selectedReceiverTenantId.value,
      serviceType: actualServiceType.value,
      materialPackageType: form.materialPackageType,

      printModelSourceType: isPrintModelOnly.value ? form.printModelSourceType : undefined,
      printModelSourceId: isPrintModelOnly.value ? form.printModelSourceId : undefined,

      senderRepairFeeAmount: form.senderRepairFeeAmount,
      title: form.title,
      requirementDesc: form.requirementDesc,

      files: buildFiles(),
      printSpecs: buildPrintSpecsPayload()
    };


    const res = await sendCollabOrderByStageRoute(payload as any);
    const result = unwrapData<any>(res);

    const createdId =
      result && typeof result === 'object'
        ? result.id ?? result.collabOrderId ?? result.value ?? ''
        : result;

    message.success('协作单已发送');

    router.push({
      path: '/biz/collab/order',
      query: createdId
        ? {
          tab: 'SENT',
          collabOrderId: String(createdId)
        }
        : {
          tab: 'SENT'
        }
    });
  } catch (error) {
    console.error(error);
    message.error('发送协作单失败');
  } finally {
    submitting.value = false;
  }
}

function goBack() {
  router.back();
}

function unwrapData<T = any>(res: any): T {
  return res?.data ?? res;
}

function unwrapRows(res: any): any[] {
  const data = unwrapData<any>(res);

  if (Array.isArray(data)) return data;

  return data?.rows || data?.records || data?.list || [];
}

function serviceTypeText(value?: string) {
  const map: Record<string, string> = {
    REPAIR_ONLY: '只修模',
    PRINT_ONLY: '只打印',
    REPAIR_PRINT: '修模 + 打印'
  };

  return value ? map[value] || value : '-';
}

function collabScopeText(value?: string) {
  const map: Record<string, string> = {
    REPAIR_STAGE: '修模协作',
    PRINT_STAGE: '打印协作',
    REPAIR_PRINT_STAGE: '修模 + 打印协作',

    // 兼容旧显示
    SINGLE_STAGE: '单工序协作',
    MULTI_STAGE: '多工序协作'
  };

  return value ? map[value] || value : '-';
}


function routeStatusText(value?: string) {
  const map: Record<string, string> = {
    PLANNED: '已计划',
    WAIT_TRIGGER: '待触发',
    DISPATCHED: '已派发',
    RUNNING: '处理中',
    WAIT_REVIEW: '待审核',
    COMPLETED: '已完成',
    REJECTED: '已驳回',
    CANCELLED: '已取消',
    SKIPPED: '已跳过'
  };

  return value ? map[value] || value : '待触发';
}

function routeStatusTagType(value?: string) {
  if (['COMPLETED'].includes(value || '')) return 'success';
  if (['REJECTED', 'CANCELLED'].includes(value || '')) return 'error';
  if (['RUNNING', 'WAIT_REVIEW', 'DISPATCHED'].includes(value || '')) return 'warning';
  return 'default';
}
</script>

<style scoped>
.mb-12px {
  margin-bottom: 12px;
}

.upload-desc {
  color: #888;
  font-size: 13px;
}

.route-card {
  width: 100%;
}

.route-desc {
  color: #888;
  font-size: 13px;
}
</style>
