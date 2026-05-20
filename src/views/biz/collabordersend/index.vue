<template>
  <NSpace vertical :size="16">
    <NCard title="好友定向发单" :bordered="false">
      <NAlert type="info" :bordered="false">
        当前发单方式为：按订单工序路由发起协作。请选择一个源订单，再选择需要外协的工序。
      </NAlert>
    </NCard>

    <NSpin :show="loading">
      <NSpace vertical :size="16">
        <!-- 源订单选择 -->
        <NCard title="选择源订单" :bordered="false">
          <NForm label-placement="left" label-width="110">
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

            <NDescriptionsItem label="路由汇总">
              {{ routeSummaryLabel(sourceOrder.routeSummaryMode) }}
            </NDescriptionsItem>

            <NDescriptionsItem label="订单状态">
              {{ sourceOrder.businessStatus || '-' }}
            </NDescriptionsItem>
          </NDescriptions>
        </NCard>

        <!-- 工序路由选择 -->
        <NCard title="选择要外协的工序" :bordered="false">
          <NSpace vertical :size="12">
            <NEmpty v-if="!form.sourceOrderId" description="请先选择源订单" />

            <NEmpty
              v-else-if="candidateRoutes.length === 0"
              description="当前订单没有可外协的工序"
            />

            <NCheckboxGroup v-else v-model:value="selectedRouteKeys">
              <NSpace vertical :size="12">
                <NCard
                  v-for="route in candidateRoutes"
                  :key="routeIdKey(route.id)"
                  size="small"
                >
                  <NSpace vertical :size="8">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                      <NCheckbox
                        :value="routeIdKey(route.id)"
                        :disabled="!canSelectRoute(route)"
                      >
                        {{ route.stageNameSnapshot || stageLabel(route.stageCode) }}
                      </NCheckbox>

                      <NSpace :size="8">
                        <NTag :type="routeStatusTagType(route.routeStatus)" size="small">
                          {{ routeStatusLabel(route.routeStatus) }}
                        </NTag>
                      </NSpace>
                    </div>

                    <NDescriptions bordered :column="2" size="small">
                      <NDescriptionsItem label="执行方式">
                        {{ routeModeLabel(route.routeMode) }}
                      </NDescriptionsItem>

                      <NDescriptionsItem label="状态">
                        {{ routeStatusLabel(route.routeStatus) }}
                      </NDescriptionsItem>

                      <NDescriptionsItem label="协作商家">
                        {{ route.targetTenantNameSnapshot || route.targetTenantId || '-' }}
                      </NDescriptionsItem>

                      <NDescriptionsItem label="协作单号">
                        {{ route.collabOrderNoSnapshot || '-' }}
                      </NDescriptionsItem>
                    </NDescriptions>

                    <NAlert
                      v-if="route.routeStatus === 'WAIT_TRIGGER'"
                      type="warning"
                      :bordered="false"
                    >
                      当前工序等待前序工序触发。若要合并发单，请同时选择前序工序。
                    </NAlert>

                    <NAlert
                      v-if="route.collabOrderId"
                      type="error"
                      :bordered="false"
                    >
                      当前工序已经关联协作单，不能重复发单。
                    </NAlert>

                    <NAlert
                      v-if="route.routeMode === 'EXTERNAL' && !route.targetTenantId"
                      type="error"
                      :bordered="false"
                    >
                      该工序未配置协作商家，不能发单。
                    </NAlert>
                  </NSpace>
                </NCard>
              </NSpace>
            </NCheckboxGroup>
          </NSpace>
        </NCard>

        <!-- 协作信息 -->
        <NCard title="协作信息" :bordered="false">
          <NDescriptions bordered :column="2" size="small">
            <NDescriptionsItem label="协作范围">
              {{ collabScopeText(actualCollabScope) }}
            </NDescriptionsItem>

            <NDescriptionsItem label="协作服务类型">
              {{ serviceTypeText(actualServiceType) }}
            </NDescriptionsItem>

            <NDescriptionsItem label="接单商家">
              {{ selectedReceiverTenantName || '-' }}
            </NDescriptionsItem>

            <NDescriptionsItem label="工序数量">
              {{ selectedRoutes.length }}
            </NDescriptionsItem>
          </NDescriptions>

          <NAlert
            v-if="selectedRoutes.length > 0 && !sameMerchantOk"
            type="error"
            :bordered="false"
            style="margin-top: 12px;"
          >
            同一张协作单只能选择同一个接单商家的工序。不同商家的工序请分别发单。
          </NAlert>

          <NAlert
            v-if="missingReceiverTenant"
            type="warning"
            :bordered="false"
            style="margin-top: 12px;"
          >
            当前选择的工序未配置接单商家，请先到订单工序路由中维护协作商家。
          </NAlert>

          <NAlert
            v-if="selectedRoutes.length > 0 && !actualCollabScope"
            type="warning"
            :bordered="false"
            style="margin-top: 12px;"
          >
            无法识别协作范围，请检查工序选择。
          </NAlert>

          <NAlert
            v-if="selectedRoutes.length > 0 && !actualServiceType"
            type="warning"
            :bordered="false"
            style="margin-top: 12px;"
          >
            无法识别协作服务类型，请检查工序选择。
          </NAlert>
        </NCard>

        <!-- 发单表单 -->
        <NCard title="协作要求" :bordered="false">
          <NForm label-placement="left" label-width="110">
            <NFormItem label="资料类型" required>
              <NSelect
                v-model:value="form.materialPackageType"
                :options="materialPackageOptions"
                placeholder="请选择资料类型"
              />
            </NFormItem>

            <NAlert
              v-if="actualServiceType === 'PRINT_ONLY'"
              type="info"
              :bordered="false"
              style="margin-bottom: 12px;"
            >
              只打印协作必须上传高清照片和 AI 模型文件。
            </NAlert>

            <NFormItem
              v-if="actualServiceType !== 'PRINT_ONLY'"
              label="约定修模费"
            >
              <NInputNumber
                v-model:value="form.senderRepairFeeAmount"
                :min="0"
                :precision="2"
                clearable
                placeholder="可为空"
                style="width: 240px"
              />
            </NFormItem>

            <NFormItem label="标题">
              <NInput
                v-model:value="form.title"
                placeholder="请输入协作标题"
              />
            </NFormItem>

            <NFormItem label="协作要求">
              <NInput
                v-model:value="form.requirementDesc"
                type="textarea"
                :autosize="{ minRows: 3, maxRows: 6 }"
                placeholder="请输入协作要求、注意事项、交付要求等"
              />
            </NFormItem>
          </NForm>
        </NCard>

        <!-- 上传资料 -->
        <NCard title="上传资料" :bordered="false">
          <NSpace vertical :size="16">
            <NCard
              v-if="form.materialPackageType === 'RAW_PHOTO'"
              title="原始照片"
              size="small"
            >
              <NSpace vertical>
                <div style="color: #888">
                  上传未修复照片，接单方会先处理高清图。
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
                  v-if="rawPhotoFileIds.length > 0"
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
                <div style="color: #888">
                  上传已经修复好的高清照片。
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
                  v-if="hdPhotoFileIds.length > 0"
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
                <div style="color: #888">
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
                  v-if="aiModelFileIds.length > 0"
                  :file-ids="aiModelFileIds"
                  mode="file"
                  :max="10"
                  :thumb-size="80"
                  show-name
                />
              </NSpace>
            </NCard>

            <NCard title="备注图" size="small">
              <NSpace vertical>
                <div style="color: #888">
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
                  v-if="remarkImageFileIds.length > 0"
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

        <!-- 操作区 -->
        <NCard :bordered="false">
          <NSpace justify="end">
            <NButton @click="goBack">
              返回
            </NButton>

            <NButton
              type="primary"
              :loading="submitting"
              @click="submit"
            >
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
  NEmpty,
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

/**
 * 如果你项目里的源订单列表接口名不同，
 * 把这里替换成你实际的接口即可。
 */
import {
  fetchCollabSourceOrders,
  sendCollabOrderByStageRoute
} from '@/service/api/biz/collab-order';

import {
  fetchOrderDetail,
  fetchOrderStageRoutes
} from '@/service/api/biz/order';

interface SourceOrderVO {
  id?: string | number;
  orderNo?: string;
  orderNoSnapshot?: string;
  customerName?: string;
  customerNameSnapshot?: string;
  serviceType?: string;
  routeSummaryMode?: string;
  businessStatus?: string;
}

interface OrderStageRouteVO {
  id?: string | number;
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
  collabOrderId?: string | number;
  collabOrderNoSnapshot?: string;
  remark?: string;
  orderNoSnapshot?: string;
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

const rawPhotoFileIds = ref<Array<string | number>>([]);
const hdPhotoFileIds = ref<Array<string | number>>([]);
const aiModelFileIds = ref<Array<string | number>>([]);
const remarkImageFileIds = ref<Array<string | number>>([]);

const imageAccept = 'image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.heic,.heif';
const modelFileAccept = '.stl,.obj,.3mf,.ply,.glb,.gltf,.zip,.rar,.7z';

const form = reactive({
  sourceOrderId: null as string | number | null,
  materialPackageType: 'RAW_PHOTO' as 'RAW_PHOTO' | 'HD_PHOTO' | 'HD_PHOTO_AI_MODEL',
  senderRepairFeeAmount: null as number | null,
  title: '',
  requirementDesc: ''
});

const sourceOrderOptions = computed(() => {
  return sourceOrderRows.value.map(item => {
    const orderNo = item.orderNo || item.orderNoSnapshot || item.id;
    const customerName = item.customerNameSnapshot || item.customerName || '';
    const serviceType = serviceTypeText(item.serviceType);
    const routeSummary = routeSummaryLabel(item.routeSummaryMode);

    return {
      label: `${orderNo}${customerName ? ` / ${customerName}` : ''}${serviceType ? ` / ${serviceType}` : ''}${routeSummary ? ` / ${routeSummary}` : ''}`,
      value: String(item.id)
    };
  });
});

const candidateRoutes = computed(() => {
  return stageRoutes.value.filter(item => item.routeMode === 'EXTERNAL');
});

const selectedRoutes = computed(() => {
  return candidateRoutes.value.filter(item => selectedRouteKeys.value.includes(routeIdKey(item.id)));
});

const selectedRoutesHaveTargetTenant = computed(() => {
  if (selectedRoutes.value.length === 0) {
    return true;
  }

  return selectedRoutes.value.every(item => !!item.targetTenantId);
});

const selectedReceiverTenantIds = computed(() => {
  return Array.from(
    new Set(
      selectedRoutes.value
        .map(item => item.targetTenantId)
        .filter(Boolean)
        .map(String)
    )
  );
});

const routeTargetConflict = computed(() => {
  return selectedRoutes.value.length > 0
    && selectedRoutesHaveTargetTenant.value
    && selectedReceiverTenantIds.value.length > 1;
});

const missingReceiverTenant = computed(() => {
  return selectedRoutes.value.length > 0 && !selectedRoutesHaveTargetTenant.value;
});

const sameMerchantOk = computed(() => {
  if (selectedRoutes.value.length === 0) {
    return true;
  }

  return selectedRoutesHaveTargetTenant.value && selectedReceiverTenantIds.value.length === 1;
});

const selectedReceiverTenantId = computed(() => {
  if (!sameMerchantOk.value) {
    return '';
  }

  return selectedReceiverTenantIds.value[0] || '';
});

const selectedReceiverTenantName = computed(() => {
  if (!selectedReceiverTenantId.value) {
    return '';
  }

  const hit = selectedRoutes.value.find(item => String(item.targetTenantId) === selectedReceiverTenantId.value);

  return hit?.targetTenantNameSnapshot || selectedReceiverTenantId.value;
});

const actualCollabScope = computed(() => {
  return calcCollabScope(selectedRoutes.value);
});

const actualServiceType = computed(() => {
  return calcServiceTypeByScope(actualCollabScope.value);
});

const materialPackageOptions = computed(() => {
  if (actualServiceType.value === 'PRINT_ONLY') {
    return [
      {
        label: '高清照片 + AI模型文件',
        value: 'HD_PHOTO_AI_MODEL'
      }
    ];
  }

  return [
    {
      label: '原始照片',
      value: 'RAW_PHOTO'
    },
    {
      label: '高清照片',
      value: 'HD_PHOTO'
    },
    {
      label: '高清照片 + AI模型文件',
      value: 'HD_PHOTO_AI_MODEL'
    }
  ];
});

watch(
  () => actualServiceType.value,
  serviceType => {
    if (serviceType === 'PRINT_ONLY' && form.materialPackageType !== 'HD_PHOTO_AI_MODEL') {
      form.materialPackageType = 'HD_PHOTO_AI_MODEL';
    }
  },
  { immediate: true }
);

async function initPage() {
  loading.value = true;

  try {
    await loadSourceOrders();

    const sourceOrderId = route.query.sourceOrderId
      ? String(route.query.sourceOrderId)
      : '';

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

async function loadSourceOrderDetail(orderId: string | number) {
  const res = await fetchOrderDetail(orderId);
  const data = unwrapData<SourceOrderVO>(res);

  sourceOrder.value = data || { id: orderId };

  upsertSourceOrderRow(sourceOrder.value);
}

function upsertSourceOrderRow(row: SourceOrderVO) {
  if (!row || row.id === undefined || row.id === null) {
    return;
  }

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

async function handleSourceOrderChange(value: string | number | null) {
  resetCollabForm();
  stageRoutes.value = [];
  sourceOrder.value = null;

  if (!value) {
    form.sourceOrderId = null;
    return;
  }

  form.sourceOrderId = String(value);

  loading.value = true;

  try {
    await loadSourceOrderDetail(value);
    await loadStageRoutes(value);
  } finally {
    loading.value = false;
  }
}


async function loadStageRoutes(orderId: string | number, defaultSelectedKeys: string[] = []) {
  const res = await fetchOrderStageRoutes(orderId);
  stageRoutes.value = unwrapData<OrderStageRouteVO[]>(res) || [];

  if (stageRoutes.value.length > 0 && (!sourceOrder.value || !sourceOrder.value.orderNo)) {
    sourceOrder.value = {
      ...sourceOrder.value,
      id: orderId,
      orderNo: stageRoutes.value[0].orderNoSnapshot
    };
  }

  const externalRoutes = stageRoutes.value.filter(item => item.routeMode === 'EXTERNAL');

  if (defaultSelectedKeys.length > 0) {
    selectedRouteKeys.value = defaultSelectedKeys.filter(key => {
      const target = externalRoutes.find(item => routeIdKey(item.id) === key);
      return target && canSelectRoute(target);
    });
    return;
  }

  const selectableRoutes = externalRoutes.filter(canSelectRoute);

  if (selectableRoutes.length === 1) {
    selectedRouteKeys.value = [routeIdKey(selectableRoutes[0].id)];
  }
}

function findSourceOrderById(id: string | number) {
  return sourceOrderRows.value.find(item => String(item.id) === String(id));
}

function canSelectRoute(item: OrderStageRouteVO) {
  if (!item) {
    return false;
  }

  if (item.collabOrderId) {
    return false;
  }

  if (item.routeMode !== 'EXTERNAL') {
    return false;
  }

  if (!item.targetTenantId) {
    return false;
  }

  return ['PLANNED', 'WAIT_TRIGGER'].includes(item.routeStatus || '');
}

function validateBeforeSubmit() {
  if (!form.sourceOrderId) {
    message.warning('请选择源订单');
    return false;
  }

  if (selectedRoutes.value.length === 0) {
    message.warning('请选择要外协的工序');
    return false;
  }

  for (const routeItem of selectedRoutes.value) {
    if (!canSelectRoute(routeItem)) {
      message.warning(`工序当前状态不能发单：${routeItem.stageNameSnapshot || routeItem.stageCode}`);
      return false;
    }
  }

  const selectedStageCodes = selectedRoutes.value.map(item => item.stageCode);

  for (const routeItem of selectedRoutes.value) {
    if (
      routeItem.routeStatus === 'WAIT_TRIGGER'
      && routeItem.triggerAfterStageCode
      && !selectedStageCodes.includes(routeItem.triggerAfterStageCode)
    ) {
      message.warning(
        `${routeItem.stageNameSnapshot || routeItem.stageCode} 需要与前序工序一起合并发单，或等待前序工序完成后再发单`
      );
      return false;
    }
  }

  if (!sameMerchantOk.value) {
    message.warning('同一张协作单只能选择同一个接单商家，请重新选择工序');
    return false;
  }

  if (!selectedReceiverTenantId.value) {
    message.warning('当前选择的工序没有配置接单商家，请先到订单工序路由中配置');
    return false;
  }

  if (!actualCollabScope.value) {
    message.warning('无法识别协作范围');
    return false;
  }

  if (!actualServiceType.value) {
    message.warning('无法识别协作服务类型');
    return false;
  }

  if (actualServiceType.value === 'PRINT_ONLY' && form.materialPackageType !== 'HD_PHOTO_AI_MODEL') {
    message.warning('只打印协作必须选择“高清照片 + AI模型文件”');
    return false;
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
      message.warning('请上传AI模型文件');
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
}


function buildFiles() {
  const files: Array<{ fileType: string; fileId: string | number }> = [];

  const pushFiles = (fileType: string, ids: Array<string | number>) => {
    ids.forEach(fileId => {
      if (fileId !== undefined && fileId !== null && fileId !== '') {
        files.push({
          fileType,
          fileId
        });
      }
    });
  };

  if (form.materialPackageType === 'RAW_PHOTO') {
    pushFiles('RAW_PHOTO', rawPhotoFileIds.value);
  } else if (form.materialPackageType === 'HD_PHOTO') {
    pushFiles('HD_PHOTO', hdPhotoFileIds.value);
  } else if (form.materialPackageType === 'HD_PHOTO_AI_MODEL') {
    pushFiles('HD_PHOTO', hdPhotoFileIds.value);
    pushFiles('AI_MODEL_FILE', aiModelFileIds.value);
  }

  pushFiles('REMARK_IMAGE', remarkImageFileIds.value);

  return files;
}

async function submit() {
  if (!validateBeforeSubmit()) {
    return;
  }

  const receiverTenantId = selectedReceiverTenantId.value;

  submitting.value = true;

  try {
    const payload = {
      sourceOrderId: form.sourceOrderId,
      sourceStageRouteIds: selectedRoutes.value
        .map(item => item.id)
        .filter(item => item !== undefined && item !== null),
      collabScope: actualCollabScope.value,
      receiverTenantId,
      serviceType: actualServiceType.value,
      materialPackageType: form.materialPackageType,
      senderRepairFeeAmount: form.senderRepairFeeAmount,
      title: form.title,
      requirementDesc: form.requirementDesc,
      files: buildFiles()
    };

    const res = await sendCollabOrderByStageRoute(payload as any);
    const result = unwrapData<any>(res);

    const createdId =
      result && typeof result === 'object'
        ? (result.id ?? result.collabOrderId ?? result.value ?? '')
        : result;

    message.success('协作单已发送');

    if (createdId) {
      router.push({
        path: '/biz/collab/order',
        query: {
          tab: 'SENT',
          collabOrderId: String(createdId)
        }
      });
    } else {
      router.push({
        path: '/biz/collab/order',
        query: {
          tab: 'SENT'
        }
      });
    }
  } catch (error) {
    console.error(error);
    message.error('发送协作单失败');
  } finally {
    submitting.value = false;
  }
}

function goBack() {
  if (window.history.length > 1) {
    router.back();
    return;
  }

  router.push({
    path: '/biz/collab/order',
    query: {
      tab: 'SENT'
    }
  });
}

function routeIdKey(id: string | number | undefined | null) {
  return String(id ?? '');
}

function serviceTypeText(value?: string) {
  const map: Record<string, string> = {
    REPAIR_ONLY: '只修模',
    PRINT_ONLY: '只打印',
    REPAIR_PRINT: '修模 + 打印'
  };

  return map[value || ''] || value || '-';
}

function routeSummaryLabel(value?: string) {
  const map: Record<string, string> = {
    ALL_INTERNAL: '全内部',
    PARTIAL_EXTERNAL: '部分外协',
    ALL_EXTERNAL: '全外协'
  };

  return map[value || ''] || value || '-';
}

function routeModeLabel(value?: string) {
  const map: Record<string, string> = {
    INTERNAL: '内部执行',
    EXTERNAL: '外部协作',
    SKIP: '跳过'
  };

  return map[value || ''] || value || '-';
}

function routeStatusLabel(value?: string) {
  const map: Record<string, string> = {
    PLANNED: '已规划',
    WAIT_TRIGGER: '等待触发',
    DISPATCHED: '已派发',
    RUNNING: '执行中',
    WAIT_REVIEW: '待审核',
    COMPLETED: '已完成',
    REJECTED: '已拒绝',
    CANCELLED: '已取消',
    SKIPPED: '已跳过'
  };

  return map[value || ''] || value || '未派发';
}

function routeStatusTagType(value?: string) {
  if (value === 'COMPLETED') return 'success';
  if (value === 'RUNNING') return 'info';
  if (value === 'DISPATCHED') return 'warning';
  if (value === 'WAIT_REVIEW') return 'warning';
  if (value === 'REJECTED' || value === 'CANCELLED') return 'error';
  if (value === 'WAIT_TRIGGER') return 'default';
  return 'default';
}

function collabScopeText(value?: string) {
  const map: Record<string, string> = {
    REPAIR_STAGE: '修模协作',
    PRINT_STAGE: '打印协作',
    REPAIR_PRINT_STAGE: '修模 + 打印协作',
    DELIVERY_STAGE: '发货协作',
    REPAIR_DELIVERY_STAGE: '修模 + 发货协作',
    PRINT_DELIVERY_STAGE: '打印 + 发货协作',
    REPAIR_PRINT_DELIVERY_STAGE: '修模 + 打印 + 发货协作'
  };

  return map[value || ''] || value || '-';
}

function calcCollabScope(routes: OrderStageRouteVO[]) {
  const stageCodes = routes.map(item => item.stageCode);

  const hasRepair = stageCodes.includes('REPAIR');
  const hasPrint = stageCodes.includes('PRINT');

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
}

function calcServiceTypeByScope(scope: string) {
  if (scope === 'REPAIR_STAGE') {
    return 'REPAIR_ONLY';
  }

  if (scope === 'PRINT_STAGE') {
    return 'PRINT_ONLY';
  }

  if (scope === 'REPAIR_PRINT_STAGE') {
    return 'REPAIR_PRINT';
  }

  return '';
}

function unwrapData<T = any>(res: any): T {
  if (res && typeof res === 'object' && 'data' in res) {
    return res.data as T;
  }

  return res as T;
}

function unwrapRows<T = any>(res: any): T[] {
  const data = unwrapData<any>(res);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.rows)) {
    return data.rows;
  }

  if (Array.isArray(data?.list)) {
    return data.list;
  }

  if (Array.isArray(data?.records)) {
    return data.records;
  }

  if (Array.isArray(res?.rows)) {
    return res.rows;
  }

  if (Array.isArray(res?.data?.rows)) {
    return res.data.rows;
  }

  if (Array.isArray(res?.data?.list)) {
    return res.data.list;
  }

  if (Array.isArray(res?.data?.records)) {
    return res.data.records;
  }

  return [];
}

watch(
  () => [route.query.sourceOrderId, route.query.routeIds],
  () => {
    initPage();
  },
  {
    immediate: true
  }
);

</script>
