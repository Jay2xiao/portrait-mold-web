<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  NAlert,
  NButton,
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
  fetchOrderDetail,
  fetchOrderStageRoutes,
  type BizOrderStageRouteVo
} from '@/service/api/biz/order';

import BizFileThumbs from '@/views/biz/components/BizFileThumbs.vue';

defineOptions({
  name: 'OrderDetailDrawer'
});

interface Props {
  show: boolean;
  orderId?: string | number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;

  /**
   * 下面这些是旧功能快捷操作事件。
   * 父组件 index.vue 里接收后，继续调用原来的弹窗/逻辑。
   */
  (e: 'delivery', row: any): void;
  (e: 'timeline', row: any): void;
  (e: 'assign-repairer', row: any): void;
  (e: 'resubmit-print-model', row: any): void;
  (e: 'delivery-records', row: any): void;
  (e: 'edit', row: any): void;
  (e: 'complete-order', row: any): void;
}>();

const router = useRouter();
const message = useMessage();

const loading = ref(false);
const detail = ref<any>(null);
const stageRoutes = ref<BizOrderStageRouteVo[]>([]);

const order = computed(() => detail.value?.order || {});
const repairTasks = computed(() => detail.value?.repairTasks || []);
const printTasks = computed(() => detail.value?.printTasks || []);
const deliveryRecords = computed(() => detail.value?.deliveryRecords || []);
const receivableItems = computed(() => detail.value?.receivableItems || []);
const bills = computed(() => detail.value?.bills || []);
const payments = computed(() => detail.value?.payments || []);
const adjustments = computed(() => detail.value?.adjustments || []);

const currentOrderId = computed(() => {
  if (props.orderId) {
    return String(props.orderId);
  }

  const detailOrderId = order.value?.id || detail.value?.id;

  if (detailOrderId) {
    return String(detailOrderId);
  }

  return '';
});

const hasExternalRoutes = computed(() => {
  return stageRoutes.value.some(item => item.routeMode === 'EXTERNAL');
});

const normalizedOrderType = computed(() => {
  return order.value?.orderType || order.value?.serviceType || '';
});

const canDelivery = computed(() => {
  return order.value?.businessStatus === 'WAIT_DELIVERY';
});

const canCompleteOrder = computed(() => {
  return order.value?.businessStatus === 'DELIVERED';
});

const canAssignRepairer = computed(() => {
  return normalizedOrderType.value !== 'PRINT_ONLY' && order.value?.payStatus !== 'PAID';
});

const canResubmitPrintModel = computed(() => {
  return (
    normalizedOrderType.value === 'PRINT_ONLY' &&
    ['WAIT_MODEL_UPLOAD', 'PRINT_QC_REJECTED'].includes(order.value?.businessStatus || '')
  );
});

function handleDrawerShowChange(value: boolean) {
  emit('update:show', value);

  if (!value) {
    clearData();
    stageRoutes.value = [];
  }
}

function clearData() {
  detail.value = null;
  stageRoutes.value = [];
}

function close() {
  handleDrawerShowChange(false);
}

async function load() {
  if (!props.show || !props.orderId) {
    clearData();
    return;
  }

  loading.value = true;

  const currentLoadOrderId = props.orderId;

  try {
    const res = await fetchOrderDetail(currentLoadOrderId);

    /**
     * 防止请求返回时抽屉已经关闭或切换到了其他订单。
     */
    if (!props.show || String(props.orderId) !== String(currentLoadOrderId)) {
      return;
    }

    const raw = unwrapData(res);
    detail.value = normalizeOrderDetail(raw);

    await loadStageRoutes(currentLoadOrderId);
  } catch (error) {
    console.error(error);
    clearData();
    message.error('加载订单详情失败');
  } finally {
    loading.value = false;
  }
}

/**
 * 兼容两种后端详情结构：
 *
 * 1. 包装结构：
 * {
 *   order: {},
 *   repairTasks: [],
 *   printTasks: []
 * }
 *
 * 2. 平铺结构：
 * {
 *   id,
 *   orderNo,
 *   customerNameSnapshot,
 *   repairTasks,
 *   printTasks
 * }
 */
function normalizeOrderDetail(data: any) {
  if (!data) {
    return null;
  }

  if (data.order) {
    return {
      order: data.order,
      repairTasks: data.repairTasks || [],
      printTasks: data.printTasks || [],
      deliveryRecords: data.deliveryRecords || [],
      receivableItems: data.receivableItems || [],
      bills: data.bills || [],
      payments: data.payments || [],
      adjustments: data.adjustments || []
    };
  }

  const {
    repairTasks,
    printTasks,
    deliveryRecords,
    receivableItems,
    bills,
    payments,
    adjustments,
    ...orderData
  } = data;

  return {
    order: orderData,
    repairTasks: repairTasks || [],
    printTasks: printTasks || [],
    deliveryRecords: deliveryRecords || [],
    receivableItems: receivableItems || [],
    bills: bills || [],
    payments: payments || [],
    adjustments: adjustments || []
  };
}

async function loadStageRoutes(orderId: string | number) {
  if (!orderId) {
    stageRoutes.value = [];
    return;
  }

  const res = await fetchOrderStageRoutes(orderId);
  stageRoutes.value = unwrapData<BizOrderStageRouteVo[]>(res) || [];
}

async function goToCollabSendByOrder() {
  const orderId = resolveOrderId();

  if (!orderId) {
    return;
  }

  close();

  await router.push({
    path: '/biz/collab/order/send',
    query: {
      sourceOrderId: String(orderId)
    }
  });
}

async function goToCollabSendByRoute(routeItem: BizOrderStageRouteVo) {
  const orderId = routeItem.orderId || resolveOrderId();

  if (!orderId || !routeItem.id) {
    return;
  }

  close();

  await router.push({
    path: '/biz/collab/order/send',
    query: {
      sourceOrderId: String(orderId),
      routeIds: String(routeItem.id)
    }
  });
}

async function goToCollabOrder(routeItem: BizOrderStageRouteVo) {
  if (!routeItem.collabOrderId) {
    return;
  }

  close();

  await router.push({
    path: '/biz/collab/order',
    query: {
      tab: 'SENT',
      collabOrderId: String(routeItem.collabOrderId)
    }
  });
}

function resolveOrderId() {
  if (currentOrderId.value) {
    return currentOrderId.value;
  }

  return '';
}

function canSendSingleRoute(routeItem: BizOrderStageRouteVo) {
  if (!routeItem) {
    return false;
  }

  if (routeItem.routeMode !== 'EXTERNAL') {
    return false;
  }

  if (!routeItem.targetTenantId) {
    return false;
  }

  if (routeItem.collabOrderId) {
    return false;
  }

  /**
   * 单工序直接发单只允许 PLANNED。
   * WAIT_TRIGGER 需要和前序一起合并发单，所以通过上方“发起协作”进入发单页再选择。
   */
  return routeItem.routeStatus === 'PLANNED';
}

function routeStageLabel(value?: string) {
  const map: Record<string, string> = {
    REPAIR: '修模',
    PRINT: '打印',
    DELIVERY: '发货'
  };

  return map[value || ''] || value || '-';
}


function serviceTypeLabel(value?: string) {
  const map: Record<string, string> = {
    REPAIR_ONLY: '只修模',
    PRINT_ONLY: '只打印',
    REPAIR_PRINT: '修模 + 打印'
  };

  return map[value || ''] || value || '-';
}

function stageLabel(value?: string) {
  const map: Record<string, string> = {
    REPAIR: '修模',
    PRINT: '打印',
    DELIVERY: '发货'
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

function routeModeTagType(value?: string) {
  if (value === 'INTERNAL') {
    return 'success';
  }

  if (value === 'EXTERNAL') {
    return 'info';
  }

  return 'default';
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
  if (value === 'COMPLETED') {
    return 'success';
  }

  if (value === 'RUNNING') {
    return 'info';
  }

  if (value === 'DISPATCHED' || value === 'WAIT_REVIEW') {
    return 'warning';
  }

  if (value === 'REJECTED' || value === 'CANCELLED') {
    return 'error';
  }

  return 'default';
}

function businessStatusLabel(value?: string) {
  const map: Record<string, string> = {
    WAIT_REPAIR: '待修模',
    REPAIRING: '修模中',
    WAIT_PREVIEW_REVIEW: '待效果图审核',
    WAIT_MODEL_UPLOAD: '待上传模型',
    WAIT_MODEL_CHECK: '待模型检测',
    WAIT_PRINT_QC: '待打印检测',
    PRINT_QC_REJECTED: '打印检测驳回',
    WAIT_PRINT: '待打印',
    PRINTING: '打印中',
    WAIT_MATERIAL_RECORD: '待材料录入',
    WAIT_DELIVERY: '待发货',
    DELIVERED: '已发货',
    COMPLETED: '已完成',
    CANCELLED: '已取消',

    WAIT_COLLAB_SEND: '待发协作',
    COLLAB_IN_PROGRESS: '协作处理中',
    COLLAB_WAIT_BILL: '协作待出账',
    COLLAB_COMPLETED: '协作完成'
  };

  return map[value || ''] || value || '-';
}

function payStatusLabel(value?: string) {
  const map: Record<string, string> = {
    UNPAID: '未支付',
    PARTIAL: '部分支付',
    PAID: '已支付',
    CANCELLED: '已取消'
  };

  return map[value || ''] || value || '-';
}

function money(value?: number | string) {
  return Number(value || 0).toFixed(2);
}

function itemTypeLabel(value?: string) {
  const map: Record<string, string> = {
    REPAIR_FEE: '修模费',
    PRINT_FEE: '打印费',
    DELIVERY_FEE: '运费',
    OTHER_FEE: '其他费用',
    ADJUSTMENT: '调整项',
    DISCOUNT: '优惠'
  };

  return map[value || ''] || value || '-';
}

function unwrapData<T = any>(res: any): T {
  if (res && typeof res === 'object' && 'data' in res) {
    return res.data as T;
  }

  return res as T;
}

watch(
  () => [props.show, props.orderId],
  () => {
    load();
  },
  {
    immediate: true
  }
);
</script>

<template>
  <NDrawer
    :show="props.show"
    :width="980"
    placement="right"
    @update:show="handleDrawerShowChange"
  >
    <NDrawerContent title="订单详情" closable>
      <NSpin :show="loading">
        <NEmpty
          v-if="!detail"
          :description="loading ? '加载中...' : '暂无数据'"
        />

        <NSpace v-else vertical :size="16">

          <!-- 基础信息 -->
          <NCard title="订单基础信息" size="small">
            <NDescriptions bordered :column="2" size="small">
              <NDescriptionsItem label="订单号">
                {{ order.orderNo || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="业务状态">
                <NTag>{{ businessStatusLabel(order.businessStatus) }}</NTag>
              </NDescriptionsItem>

              <NDescriptionsItem label="客户">
                {{ order.customerNameSnapshot || order.customerName || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="手机号">
                {{ order.customerPhoneSnapshot || order.customerPhone || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="服务类型">
                {{ serviceTypeLabel(order.serviceType || order.orderType) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="产品类型">
                {{ order.productType || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="产品名称">
                {{ order.productName || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="数量">
                {{ order.quantity || 1 }}
              </NDescriptionsItem>

              <NDescriptionsItem label="支付状态">
                {{ payStatusLabel(order.payStatus) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="创建时间">
                {{ order.createTime || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="备注" :span="2">
                {{ order.remark || '-' }}
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <!-- 工序路由 -->
          <NCard title="工序路由" size="small">
            <NSpace vertical :size="12">
              <NSpace justify="space-between" align="center">
                <div style="color: #888;">
                  展示该订单每个工序由内部执行还是外部协作。
                </div>

                <NButton
                  v-if="hasExternalRoutes"
                  type="primary"
                  size="small"
                  @click="goToCollabSendByOrder"
                >
                  发起协作
                </NButton>
              </NSpace>

              <NEmpty
                v-if="stageRoutes.length === 0"
                description="暂无工序路由"
              />

              <NCard
                v-for="route in stageRoutes"
                :key="route.id"
                size="small"
                :title="route.stageNameSnapshot || routeStageLabel(route.stageCode)"
              >
                <NSpace vertical :size="12">
                  <NDescriptions bordered :column="2" size="small">
                    <NDescriptionsItem label="工序">
                      {{ route.stageNameSnapshot || routeStageLabel(route.stageCode) }}
                    </NDescriptionsItem>

                    <NDescriptionsItem label="执行方式">
                      <NTag
                        :type="routeModeTagType(route.routeMode)"
                        size="small"
                      >
                        {{ routeModeLabel(route.routeMode) }}
                      </NTag>
                    </NDescriptionsItem>

                    <NDescriptionsItem label="状态">
                      <NTag
                        :type="routeStatusTagType(route.routeStatus)"
                        size="small"
                      >
                        {{ routeStatusLabel(route.routeStatus) }}
                      </NTag>
                    </NDescriptionsItem>

                    <NDescriptionsItem label="前序工序">
                      {{ routeStageLabel(route.triggerAfterStageCode) }}
                    </NDescriptionsItem>

                    <NDescriptionsItem label="协作商家">
                      {{ route.targetTenantNameSnapshot || route.targetTenantId || '-' }}
                    </NDescriptionsItem>

                    <NDescriptionsItem label="协作单号">
                      {{ route.collabOrderNoSnapshot || '-' }}
                    </NDescriptionsItem>

                    <NDescriptionsItem label="派发时间">
                      {{ route.dispatchTime || '-' }}
                    </NDescriptionsItem>

                    <NDescriptionsItem label="完成时间">
                      {{ route.completeTime || '-' }}
                    </NDescriptionsItem>

                    <NDescriptionsItem label="备注" :span="2">
                      {{ route.remark || '-' }}
                    </NDescriptionsItem>
                  </NDescriptions>

                  <NSpace justify="end">
                    <NButton
                      v-if="canSendSingleRoute(route)"
                      type="primary"
                      size="small"
                      @click="goToCollabSendByRoute(route)"
                    >
                      发起该工序协作
                    </NButton>

                    <NButton
                      v-if="route.collabOrderId"
                      size="small"
                      @click="goToCollabOrder(route)"
                    >
                      查看协作单
                    </NButton>
                  </NSpace>

                  <NAlert
                    v-if="route.routeMode === 'EXTERNAL' && route.routeStatus === 'WAIT_TRIGGER'"
                    type="warning"
                    :bordered="false"
                  >
                    当前工序等待前序工序触发。若要合并发单，请点击上方“发起协作”进入发单页后同时选择前序工序。
                  </NAlert>

                  <NAlert
                    v-if="route.routeMode === 'EXTERNAL' && !route.targetTenantId"
                    type="error"
                    :bordered="false"
                  >
                    当前工序未配置协作商家，请先维护工序路由。
                  </NAlert>
                </NSpace>
              </NCard>
            </NSpace>
          </NCard>


          <!-- 金额概览 -->
          <NCard title="金额概览" size="small">
            <NDescriptions bordered :column="3" size="small">
              <NDescriptionsItem label="销售金额">
                {{ money(order.saleAmountTotal) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="应收金额">
                {{ money(order.receivableAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="已收金额">
                {{ money(order.paidAmount || order.receivedAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="未收金额">
                {{ money(order.unpaidAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="高清处理费">
                {{ money(order.hdAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="AI建模费">
                {{ money(order.aiModelAmount) }}
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <!-- 订单文件 -->
          <NCard title="订单文件" size="small">
            <NDescriptions bordered :column="1" size="small">
              <NDescriptionsItem label="原图">
                <BizFileThumbs
                  :file-ids="order.originalImageFileIds"
                  mode="image"
                  :max="10"
                />
              </NDescriptionsItem>

              <NDescriptionsItem label="备注图">
                <BizFileThumbs
                  :file-ids="order.remarkImageFileIds"
                  mode="image"
                  :max="10"
                />
              </NDescriptionsItem>

              <NDescriptionsItem label="AI基础模型">
                <BizFileThumbs
                  :file-ids="order.aiBaseModelFileIds"
                  mode="download"
                  :max="10"
                />
              </NDescriptionsItem>

              <NDescriptionsItem label="客户打印模型">
                <BizFileThumbs
                  :file-ids="order.printInputModelFileIds"
                  mode="download"
                  :max="10"
                />
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <!-- 内部任务概览 -->
          <NCard title="内部任务概览" size="small">
            <NSpace vertical :size="12">
              <NCard title="修模任务" size="small">
                <NEmpty v-if="repairTasks.length === 0" description="暂无修模任务" />

                <NDataTable
                  v-else
                  size="small"
                  :columns="[
                    { title: '任务号', key: 'taskNo', width: 160 },
                    { title: '状态', key: 'status', width: 120 },
                    { title: '修模师', key: 'assigneeName', width: 120 },
                    { title: '截止时间', key: 'deadlineTime', width: 170 }
                  ]"
                  :data="repairTasks"
                  :scroll-x="600"
                />
              </NCard>

              <NCard title="打印任务" size="small">
                <NEmpty v-if="printTasks.length === 0" description="暂无打印任务" />

                <NDataTable
                  v-else
                  size="small"
                  :columns="[
                    { title: '任务号', key: 'taskNo', width: 160 },
                    { title: '状态', key: 'status', width: 120 },
                    { title: '打印员', key: 'printerName', width: 120 },
                    { title: '开始时间', key: 'startTime', width: 170 },
                    { title: '完成时间', key: 'finishTime', width: 170 }
                  ]"
                  :data="printTasks"
                  :scroll-x="800"
                />
              </NCard>
            </NSpace>
          </NCard>

          <!-- 账务简表 -->
          <NCard title="应收项目" size="small">
            <NEmpty v-if="receivableItems.length === 0" description="暂无应收项目" />

            <NDataTable
              v-else
              size="small"
              :columns="[
                { title: '费用类型', key: 'itemType', width: 120, render: row => itemTypeLabel(row.itemType) },
                { title: '费用名称', key: 'itemName', width: 140 },
                { title: '应收金额', key: 'amount', width: 100, render: row => money(row.amount) },
                { title: '已收', key: 'paidAmount', width: 100, render: row => money(row.paidAmount) },
                { title: '未收', key: 'unpaidAmount', width: 100, render: row => money(row.unpaidAmount) },
                { title: '支付状态', key: 'payStatus', width: 120, render: row => payStatusLabel(row.payStatus) }
              ]"
              :data="receivableItems"
              :scroll-x="900"
            />
          </NCard>

          <NCard title="发货记录" size="small">
            <NEmpty v-if="deliveryRecords.length === 0" description="暂无发货记录" />

            <NDataTable
              v-else
              size="small"
              :columns="[
                { title: '交付方式', key: 'deliveryType', width: 120 },
                { title: '快递公司', key: 'expressCompany', width: 120 },
                { title: '快递单号', key: 'trackingNo', width: 180 },
                { title: '发货时间', key: 'deliveryTime', width: 170 }
              ]"
              :data="deliveryRecords"
              :scroll-x="700"
            />
          </NCard>
        </NSpace>
      </NSpin>
    </NDrawerContent>
  </NDrawer>
</template>
