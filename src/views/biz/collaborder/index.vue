<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {
  NButton,
  NCard,
  NCode,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NImage,
  NInput,
  NSelect,
  NSpace,
  NTag,
  NTabs,
  NTabPane,
  NModal,
  useDialog,
  NTimeline,
  NTimelineItem,
  useMessage
} from 'naive-ui';

import {
  acceptCollabOrder,
  fetchCollabOrderDetail,
  fetchReceivedCollabOrders,
  fetchSentCollabOrders,
  rejectCollabOrder,
  reviewCollabEffect,
  reviewCollabHd,
  submitCollabEffectReview,
  deliveryCollabOrder,
  fetchCollabOrderEvents,
  syncCollabPrintStatus,
  submitCollabHdReview
} from '@/service/api/biz/collab-order';


defineOptions({
  name: 'BizCollabOrder'
});

const router = useRouter();
const dialog = useDialog();
const message = useMessage();
const route = useRoute();

const loadingSent = ref(false);
const loadingReceived = ref(false);
const loadingDetail = ref(false);

const sentRows = ref<any[]>([]);
const receivedRows = ref<any[]>([]);
const activeTab = ref<'SENT' | 'RECEIVED'>('SENT');

const showDetailDrawer = ref(false);
const detail = ref<any>(null);

const showRejectModal = ref(false);
const rejectTarget = ref<any | null>(null);

const isSenderView = computed(() => activeTab.value === 'SENT');
const isReceiverView = computed(() => activeTab.value === 'RECEIVED');

const processedHdFileIds = ref<Array<string | number>>([]);
const effectFileIds = ref<Array<string | number>>([]);

const hdSubmitComment = ref('');
const effectSubmitComment = ref('');

const rejectStage = ref<'HD' | 'EFFECT' | ''>('');
const rejectReason = ref('');


const hdReviewComment = ref('');

const effectReviewComment = ref('');

const showReviewRejectModal = ref(false);
const reviewRejectStage = ref<'HD' | 'EFFECT' | ''>('');
const reviewRejectReason = ref('');

const eventRows = ref<any[]>([]);
const loadingEvents = ref(false);


const printForm = reactive({
  printStatus: 'PRINTING' as 'WAIT_PRINT' | 'PRINTING' | 'PRINT_COMPLETED',
  remark: ''
});

const deliveryForm = reactive({
  logisticsCompany: '',
  logisticsNo: '',
  remark: ''
});

const deliveryAttachmentFileIds = ref<Array<string | number>>([]);

const printStatusOptions = [
  { label: '待打印', value: 'WAIT_PRINT' },
  { label: '打印中', value: 'PRINTING' },
  { label: '打印完成', value: 'PRINT_COMPLETED' }
];

function printStatusLabel(value?: string) {
  const map: Record<string, string> = {
    NONE: '无',
    WAIT_PRINT: '待打印',
    PRINTING: '打印中',
    PRINT_COMPLETED: '打印完成'
  };

  return map[value || ''] || value || '-';
}

function deliveryStatusLabel(value?: string) {
  const map: Record<string, string> = {
    NONE: '无',
    WAIT_DELIVERY: '待发货',
    DELIVERED: '已发货',
    RECEIVED: '已签收'
  };

  return map[value || ''] || value || '-';
}


const syncingPrint = ref(false);
const submittingDelivery = ref(false);


function eventTypeLabel(value?: string) {
  const map: Record<string, string> = {
    SEND: '发单',
    ACCEPT: '接单',
    REJECT: '拒单',

    HD_SUBMIT: '提交高清图',
    HD_APPROVE: '高清图通过',
    HD_REJECT: '高清图驳回',

    EFFECT_SUBMIT: '提交修模效果图',
    EFFECT_APPROVE: '修模效果图通过',
    EFFECT_REJECT: '修模效果图驳回',

    PRINT_STATUS_SYNC: '打印状态同步',
    DELIVERY_SYNC: '发货同步'
  };

  return map[value || ''] || value || '-';
}

function timelineItemType(value?: string) {
  if (!value) return 'default';

  if (value.includes('REJECT')) return 'error';
  if (value.includes('APPROVE')) return 'success';
  if (value === 'DELIVERY_SYNC') return 'success';
  if (value === 'PRINT_STATUS_SYNC') return 'info';
  if (value === 'ACCEPT') return 'success';

  return 'default';
}

const canSenderViewPrint = computed(() => {
  const order = currentOrder.value;

  return (
    isSenderView.value &&
    ['PRINTING', 'WAIT_DELIVERY', 'WAIT_BILL', 'DELIVERED', 'BILLED', 'COMPLETED'].includes(order.status || '') &&
    order.serviceType !== 'REPAIR_ONLY'
  );
});

const canSenderViewDelivery = computed(() => {
  const order = currentOrder.value;

  return (
    isSenderView.value &&
    ['WAIT_BILL', 'DELIVERED', 'BILLED', 'VOUCHER_UPLOADED', 'PAID_CONFIRMED', 'COMPLETED'].includes(order.status || '') &&
    order.deliveryStatus === 'DELIVERED'
  );
});


const rejectForm = reactive({
  reason: ''
});

const queryForm = reactive({
  status: '',
  serviceType: '',
  materialPackageType: '',
  keyword: ''
});

const statusOptions = [
  { label: '待接单', value: 'PENDING_ACCEPT' },
  { label: '已接单', value: 'ACCEPTED' },
  { label: '已拒单', value: 'REJECTED' },
  { label: '修模中', value: 'REPAIRING' },
  { label: '待发单方审核', value: 'WAIT_SENDER_REVIEW' },
  { label: '打印中', value: 'PRINTING' },
  { label: '待发货', value: 'WAIT_DELIVERY' },
  { label: '已发货', value: 'DELIVERED' },
  { label: '已完成', value: 'COMPLETED' }
];

const serviceTypeOptions = [
  { label: '只修模', value: 'REPAIR_ONLY' },
  { label: '只打印', value: 'PRINT_ONLY' },
  { label: '修模 + 打印', value: 'REPAIR_PRINT' }
];

const materialTypeOptions = [
  { label: '原始照片', value: 'RAW_PHOTO' },
  { label: '高清照片', value: 'HD_PHOTO' },
  { label: '高清照片 + AI模型', value: 'HD_PHOTO_AI_MODEL' }
];

function unwrapData<T = any>(res: any): T {
  return res?.data ?? res;
}


function materialLabel(value?: string) {
  return materialTypeOptions.find(item => item.value === value)?.label || value || '-';
}

function serviceLabel(value?: string) {
  return serviceTypeOptions.find(item => item.value === value)?.label || value || '-';
}

function statusLabel(value?: string) {
  const map: Record<string, string> = {
    PENDING_ACCEPT: '待接单',
    ACCEPTED: '已接单',
    REJECTED: '已拒单',
    CANCELLED: '已取消',

    MATERIAL_PROCESSING: '高清图处理中',
    WAIT_HD_REVIEW: '待高清图确认',
    HD_REJECTED: '高清图驳回',

    REPAIRING: '修模中',
    WAIT_SENDER_REVIEW: '待发单方审核',
    SENDER_REJECTED: '修模效果图驳回',

    PRINTING: '打印中',
    WAIT_DELIVERY: '待发货',
    DELIVERED: '已发货',

    WAIT_BILL: '待出账',
    BILLED: '已出账',
    VOUCHER_UPLOADED: '已上传凭证',
    PAID_CONFIRMED: '已确认收款',

    COMPLETED: '已完成'
  };

  return map[value || ''] || value || '-';
}



function statusTagType(value?: string) {
  if (['COMPLETED', 'PAID_CONFIRMED', 'DELIVERED', 'ACCEPTED'].includes(value || '')) return 'success';
  if (['REJECTED', 'CANCELLED', 'HD_REJECTED', 'SENDER_REJECTED'].includes(value || '')) return 'error';
  if (['PENDING_ACCEPT', 'WAIT_SENDER_REVIEW', 'WAIT_HD_REVIEW', 'WAIT_DELIVERY'].includes(value || '')) return 'warning';
  return 'info';
}

const canReceiverSyncPrint = computed(() => {
  const order = currentOrder.value;

  return (
    isReceiverView.value &&
    order.status === 'PRINTING' &&
    order.serviceType !== 'REPAIR_ONLY'
  );
});

const canViewPrintInfo = computed(() => {
  const order = currentOrder.value;

  return (
    order.serviceType !== 'REPAIR_ONLY' &&
    order.printStatus &&
    order.printStatus !== 'NONE'
  );
});

const canReceiverDelivery = computed(() => {
  const order = currentOrder.value;

  return (
    isReceiverView.value &&
    order.status === 'WAIT_DELIVERY' &&
    order.printStatus === 'PRINT_COMPLETED'
  );
});

const canViewDeliveryInfo = computed(() => {
  const order = currentOrder.value;

  return order.deliveryStatus === 'DELIVERED';
});

function initV14ActionForms() {
  const order = detail.value?.order || {};

  if (order.printStatus && order.printStatus !== 'NONE') {
    printForm.printStatus = order.printStatus;
  } else {
    printForm.printStatus = 'WAIT_PRINT';
  }

  printForm.remark = '';

  deliveryForm.logisticsCompany = order.logisticsCompany || '';
  deliveryForm.logisticsNo = order.logisticsNo || '';
  deliveryForm.remark = '';

  deliveryAttachmentFileIds.value = [];
}

const columns = [
  {
    title: '协作单号',
    key: 'collabOrderNo',
    width: 180
  },
  {
    title: '源订单号',
    key: 'sourceOrderNoSnapshot',
    width: 160
  },
  {
    title: '对方商家',
    key: 'partnerTenantNameSnapshot',
    width: 180,
    render(row: any) {
      return activeTab.value === 'SENT'
        ? row.receiverTenantNameSnapshot || '-'
        : row.senderTenantNameSnapshot || '-';
    }
  },
  {
    title: '服务类型',
    key: 'serviceType',
    width: 120,
    render(row: any) {
      return serviceLabel(row.serviceType);
    }
  },
  {
    title: '资料类型',
    key: 'materialPackageType',
    width: 150,
    render(row: any) {
      return materialLabel(row.materialPackageType);
    }
  },
  {
    title: '约定修模费用',
    key: 'senderRepairFeeAmount',
    width: 130
  },
  {
    title: '状态',
    key: 'status',
    width: 120,
    render(row: any) {
      return h(
        NTag,
        { type: statusTagType(row.status) as any },
        { default: () => statusLabel(row.status) }
      );
    }
  },
  {
    title: '创建时间',
    key: 'createTime',
    width: 170
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    render(row: any) {
      const btns: any[] = [
        h(
          NButton,
          {
            size: 'small',
            onClick: () => openDetail(row)
          },
          { default: () => '详情' }
        )
      ];

      if (activeTab.value === 'RECEIVED' && row.status === 'PENDING_ACCEPT') {
        btns.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => handleAccept(row)
            },
            { default: () => '接单' }
          ),
          h(
            NButton,
            {
              size: 'small',
              type: 'error',
              onClick: () => openRejectModal(row)
            },
            { default: () => '拒单' }
          )
        );
      }

      return h(NSpace, { size: 8 }, { default: () => btns });
    }
  }
];

async function loadSent() {
  loadingSent.value = true;
  try {
    const res = await fetchSentCollabOrders(queryForm);
    sentRows.value = unwrapData(res)?.rows || [];
  } finally {
    loadingSent.value = false;
  }
}

async function loadReceived() {
  loadingReceived.value = true;
  try {
    const res = await fetchReceivedCollabOrders(queryForm);
    receivedRows.value = unwrapData(res)?.rows || [];
  } finally {
    loadingReceived.value = false;
  }
}

async function refreshCurrentTab() {
  if (activeTab.value === 'SENT') {
    await loadSent();
  } else {
    await loadReceived();
  }
}

function search() {
  refreshCurrentTab();
}

function reset() {
  queryForm.status = '';
  queryForm.serviceType = '';
  queryForm.materialPackageType = '';
  queryForm.keyword = '';
  refreshCurrentTab();
}

function detailFileIds(fileType: string) {
  const files = detail.value?.files || [];

  return files
    .filter((item: any) => item.fileType === fileType && item.fileId)
    .map((item: any) => item.fileId);
}

async function reloadDetail() {
  const id = detail.value?.order?.id;

  if (!id) {
    return;
  }

  const res = await fetchCollabOrderDetail(id);
  detail.value = unwrapData(res);

  initV14ActionForms();

  await loadEvents(id);
}


async function submitHdReview() {
  const order = currentOrder.value;

  if (!order.id) return;

  if (!processedHdFileIds.value.length) {
    message.warning('请先上传处理后的高清图');
    return;
  }

  await submitCollabHdReview(order.id, {
    fileIds: processedHdFileIds.value,
    comment: hdSubmitComment.value
  });

  message.success('高清图已提交给发单方确认');

  processedHdFileIds.value = [];
  hdSubmitComment.value = '';

  await reloadDetail();
  await refreshCurrentTab();
}

async function approveHdReview() {
  const order = currentOrder.value;

  if (!order.id) return;

  await reviewCollabHd(order.id, {
    result: 'APPROVE',
    comment: hdReviewComment.value
  });

  message.success('高清图确认通过');

  hdReviewComment.value = '';

  await reloadDetail();
  await refreshCurrentTab();
}

async function submitEffectReview() {
  const order = currentOrder.value;

  if (!order.id) return;

  if (!effectFileIds.value.length) {
    message.warning('请先上传修模效果图');
    return;
  }

  await submitCollabEffectReview(order.id, {
    fileIds: effectFileIds.value,
    comment: effectSubmitComment.value
  });

  message.success('修模效果图已提交给发单方审核');

  effectFileIds.value = [];
  effectSubmitComment.value = '';

  await reloadDetail();
  await refreshCurrentTab();
}

async function approveEffectReview() {
  const order = currentOrder.value;

  if (!order.id) return;

  await reviewCollabEffect(order.id, {
    result: 'APPROVE',
    comment: effectReviewComment.value
  });

  message.success('修模效果图审核通过');

  effectReviewComment.value = '';

  await reloadDetail();
  await refreshCurrentTab();
}

function openReviewReject(stage: 'HD' | 'EFFECT') {
  reviewRejectStage.value = stage;
  reviewRejectReason.value = '';
  showReviewRejectModal.value = true;
}

async function submitReviewReject() {
  const order = currentOrder.value;

  if (!order.id) return;

  if (!reviewRejectReason.value) {
    message.warning('请输入驳回原因');
    return;
  }

  if (reviewRejectStage.value === 'HD') {
    await reviewCollabHd(order.id, {
      result: 'REJECT',
      comment: reviewRejectReason.value
    });

    message.success('已驳回高清图');
  }

  if (reviewRejectStage.value === 'EFFECT') {
    await reviewCollabEffect(order.id, {
      result: 'REJECT',
      comment: reviewRejectReason.value
    });

    message.success('已驳回修模效果图');
  }

  showReviewRejectModal.value = false;
  reviewRejectStage.value = '';
  reviewRejectReason.value = '';

  await reloadDetail();
  await refreshCurrentTab();
}

async function openDetail(row: any) {
  if (!row?.id) return;

  showDetailDrawer.value = true;
  loadingDetail.value = true;
  detail.value = null;
  eventRows.value = [];
  processedHdFileIds.value = [];
  effectFileIds.value = [];


  try {
    const res = await fetchCollabOrderDetail(row.id);
    detail.value = unwrapData(res);

    initV14ActionForms();

    await loadEvents(row.id);
  } finally {
    loadingDetail.value = false;
  }
}

async function openDetailById(id: string | number) {
  if (!id) return;

  showDetailDrawer.value = true;
  loadingDetail.value = true;
  detail.value = null;
  eventRows.value = [];

  try {
    const res = await fetchCollabOrderDetail(id);
    detail.value = unwrapData(res);

    initV14ActionForms();

    await loadEvents(id);
  } finally {
    loadingDetail.value = false;
  }
}


function initActionForms() {
  const order = detail.value?.order || {};

  printForm.printStatus =
    order.printStatus && order.printStatus !== 'NONE'
      ? order.printStatus
      : 'PRINTING';

  printForm.remark = '';

  deliveryForm.logisticsCompany = order.logisticsCompany || '';
  deliveryForm.logisticsNo = order.logisticsNo || '';
  deliveryForm.remark = '';

  deliveryAttachmentFileIds.value = [];
}

async function submitPrintStatus() {
  const order = currentOrder.value;

  if (!order.id) return;

  if (!printForm.printStatus) {
    message.warning('请选择打印状态');
    return;
  }

  dialog.warning({
    title: '确认同步打印状态',
    content: `确定将打印状态同步为「${printStatusLabel(printForm.printStatus)}」吗？`,
    positiveText: '确认同步',
    negativeText: '取消',
    onPositiveClick: async () => {
      syncingPrint.value = true;

      try {
        await syncCollabPrintStatus(order.id, {
          printStatus: printForm.printStatus,
          remark: printForm.remark
        });

        message.success('打印状态已同步');

        await reloadDetail();
        await refreshCurrentTab();
      } finally {
        syncingPrint.value = false;
      }
    }
  });
}


async function submitDelivery() {
  const order = currentOrder.value;

  if (!order.id) return;

  if (!deliveryForm.logisticsCompany) {
    message.warning('请输入物流公司');
    return;
  }

  if (!deliveryForm.logisticsNo) {
    message.warning('请输入物流单号');
    return;
  }

  dialog.warning({
    title: '确认发货',
    content: `确定同步发货信息吗？物流公司：${deliveryForm.logisticsCompany}，物流单号：${deliveryForm.logisticsNo}`,
    positiveText: '确认发货',
    negativeText: '取消',
    onPositiveClick: async () => {
      submittingDelivery.value = true;

      try {
        await deliveryCollabOrder(order.id, {
          logisticsCompany: deliveryForm.logisticsCompany,
          logisticsNo: deliveryForm.logisticsNo,
          fileIds: deliveryAttachmentFileIds.value,
          remark: deliveryForm.remark
        });

        message.success('发货信息已同步');

        deliveryAttachmentFileIds.value = [];
        deliveryForm.remark = '';

        await reloadDetail();
        await refreshCurrentTab();
      } finally {
        submittingDelivery.value = false;
      }
    }
  });
}



function openRejectModal(row: any) {
  rejectTarget.value = row;
  rejectForm.reason = '';
  showRejectModal.value = true;
}


async function submitReject() {
  if (!rejectTarget.value?.id) return;
  if (!rejectForm.reason) {
    message.warning('请输入拒单原因');
    return;
  }

  await rejectCollabOrder(rejectTarget.value.id, { reason: rejectForm.reason });
  message.success('已拒单');
  showRejectModal.value = false;
  await loadReceived();
}

function handleAccept(row: any) {
  dialog.warning({
    title: '确认接单',
    content: `确认接收协作单 ${row.collabOrderNo} 吗？`,
    positiveText: '接单',
    negativeText: '取消',
    onPositiveClick: async () => {
      await acceptCollabOrder(row.id);
      message.success('接单成功');
      await loadReceived();
    }
  });
}
const currentOrder = computed(() => detail.value?.order || {});


const canReceiverSubmitHd = computed(() => {
  const order = currentOrder.value;

  return (
    isReceiverView.value &&
    order.materialPackageType === 'RAW_PHOTO' &&
    ['MATERIAL_PROCESSING', 'HD_REJECTED', 'ACCEPTED'].includes(order.status || '')
  );
});

const canSenderReviewHd = computed(() => {
  const order = currentOrder.value;

  return (
    isSenderView.value &&
    order.status === 'WAIT_HD_REVIEW'
  );
});

const canReceiverSubmitEffect = computed(() => {
  const order = currentOrder.value;

  return (
    isReceiverView.value &&
    order.serviceType !== 'PRINT_ONLY' &&
    ['REPAIRING', 'SENDER_REJECTED'].includes(order.status || '')
  );
});

const canSenderReviewEffect = computed(() => {
  const order = currentOrder.value;

  return (
    isSenderView.value &&
    order.status === 'WAIT_SENDER_REVIEW'
  );
});


async function loadEvents(orderId: string | number) {
  loadingEvents.value = true;

  try {
    const res = await fetchCollabOrderEvents(orderId);
    eventRows.value = unwrapData(res) || [];
  } finally {
    loadingEvents.value = false;
  }
}

function eventFileIds(row: any) {
  if (!row?.attachmentsJson) return [];

  try {
    const payload =
      typeof row.attachmentsJson === 'string'
        ? JSON.parse(row.attachmentsJson)
        : row.attachmentsJson;

    return payload?.fileIds || [];
  } catch {
    return [];
  }
}

async function handleRouteOpenDetail() {
  const tab = route.query.tab as string | undefined;
  const collabOrderId = route.query.collabOrderId as string | undefined;

  if (tab === 'SENT' || tab === 'RECEIVED') {
    activeTab.value = tab;
  }

  await refreshCurrentTab();

  if (collabOrderId) {
    await openDetailById(collabOrderId);
  }
}

onMounted(async () => {
  await Promise.all([
    loadSent(),
    loadReceived()
  ]);

  await handleRouteOpenDetail();
});

</script>

<template>
  <NSpace vertical :size="16">
    <NCard title="协作单列表" :bordered="false">
      <NSpace justify="space-between" align="center">
        <div>
          <strong>发出的协作单 / 收到的协作单</strong>
          <div style="margin-top: 6px; color: #888">
            这里查看好友定向发单后的状态，接单方可以直接接单或拒单。
          </div>
        </div>

        <NButton type="primary" @click="router.push('/xiezuo/collab-order-send')">
          好友定向发单
        </NButton>
      </NSpace>
    </NCard>

    <NCard :bordered="false">
      <NForm inline label-placement="left">
        <NFormItem label="状态">
          <NSelect
            v-model:value="queryForm.status"
            :options="statusOptions"
            clearable
            style="width: 160px"
          />
        </NFormItem>

        <NFormItem label="服务类型">
          <NSelect
            v-model:value="queryForm.serviceType"
            :options="serviceTypeOptions"
            clearable
            style="width: 150px"
          />
        </NFormItem>

        <NFormItem label="资料类型">
          <NSelect
            v-model:value="queryForm.materialPackageType"
            :options="materialTypeOptions"
            clearable
            style="width: 180px"
          />
        </NFormItem>

        <NFormItem label="关键词">
          <NInput
            v-model:value="queryForm.keyword"
            clearable
            placeholder="协作单号 / 源订单号 / 商家名称"
            style="width: 260px"
          />
        </NFormItem>

        <NFormItem>
          <NSpace>
            <NButton type="primary" @click="search">查询</NButton>
            <NButton @click="reset">重置</NButton>
          </NSpace>
        </NFormItem>
      </NForm>
    </NCard>

    <NCard :bordered="false">
      <NTabs v-model:value="activeTab" type="line" animated @update:value="refreshCurrentTab">
        <NTabPane name="SENT" tab="发出的协作单">
          <NDataTable
            :loading="loadingSent"
            :columns="columns"
            :data="sentRows"
            :pagination="false"
            :scroll-x="1400"
            size="small"
          />
        </NTabPane>

        <NTabPane name="RECEIVED" tab="收到的协作单">
          <NDataTable
            :loading="loadingReceived"
            :columns="columns"
            :data="receivedRows"
            :pagination="false"
            :scroll-x="1400"
            size="small"
          />
        </NTabPane>
      </NTabs>
    </NCard>

    <NDrawer v-model:show="showDetailDrawer" width="980" placement="right">
      <NDrawerContent title="协作单详情" closable>
        <NSpace v-if="detail" vertical :size="16">
          <NCard title="基础信息" size="small">
            <NDescriptions bordered :column="3" size="small">
              <NDescriptionsItem label="协作单号">
                {{ detail.order?.collabOrderNo || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="源订单号">
                {{ detail.order?.sourceOrderNoSnapshot || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="状态">
                {{ statusLabel(detail.order?.status) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="发单方">
                {{ detail.order?.senderTenantNameSnapshot || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="接单方">
                {{ detail.order?.receiverTenantNameSnapshot || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="服务类型">
                {{ serviceLabel(detail.order?.serviceType) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="资料类型">
                {{ materialLabel(detail.order?.materialPackageType) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="约定修模费用">
                {{ detail.order?.senderRepairFeeAmount || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="接单时间">
                {{ detail.order?.acceptTime || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="拒单原因" :span="3">
                {{ detail.order?.rejectReason || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="备注/要求" :span="3">
                {{ detail.order?.requirementDesc || '-' }}
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <NCard title="附件" size="small">
            <NSpace vertical :size="16">
              <div v-if="detailFileIds('RAW_PHOTO').length > 0">
                <strong>原始照片</strong>
                <BizFileViewer
                  :file-ids="detailFileIds('RAW_PHOTO')"
                  mode="image"
                  :max="20"
                  :thumb-size="80"
                  show-name
                />
              </div>

              <div v-if="detailFileIds('PROCESSED_HD_PHOTO').length > 0">
                <strong>处理后高清图</strong>
                <BizFileViewer
                  :file-ids="detailFileIds('PROCESSED_HD_PHOTO')"
                  mode="image"
                  :max="20"
                  :thumb-size="80"
                  show-name
                />
              </div>

              <div v-if="detailFileIds('REPAIR_EFFECT_IMAGE').length > 0">
                <strong>修模效果图</strong>
                <BizFileViewer
                  :file-ids="detailFileIds('REPAIR_EFFECT_IMAGE')"
                  mode="image"
                  :max="20"
                  :thumb-size="80"
                  show-name
                />
              </div>

              <div v-if="detailFileIds('AI_MODEL_FILE').length > 0">
                <strong>AI模型文件</strong>
                <BizFileViewer
                  :file-ids="detailFileIds('AI_MODEL_FILE')"
                  mode="file"
                  :max="10"
                  :thumb-size="80"
                  show-name
                />
              </div>

              <div v-if="detailFileIds('REMARK_IMAGE').length > 0">
                <strong>备注图</strong>
                <BizFileViewer
                  :file-ids="detailFileIds('REMARK_IMAGE')"
                  mode="image"
                  :max="20"
                  :thumb-size="80"
                  show-name
                />
              </div>
            </NSpace>
          </NCard>

          <NCard
            v-if="canReceiverSubmitHd"
            title="高清图处理"
            size="small"
          >
            <NSpace vertical :size="12">
              <div style="color: #888">
                当前协作单是原始照片发单。请先处理高清图，处理完成后提交给发单方确认。
              </div>

              <BizFileUpload
                v-model="processedHdFileIds"
                biz-type="TEMP"
                file-stage="COLLAB_HD_REVIEW"
                file-type="PROCESSED_HD_PHOTO"
                :max="10"
              />

              <BizFileViewer
                v-if="processedHdFileIds.length > 0"
                :file-ids="processedHdFileIds"
                mode="image"
                :max="10"
                :thumb-size="80"
                show-name
              />

              <NInput
                v-model:value="hdSubmitComment"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 4 }"
                placeholder="请输入高清图处理说明"
              />

              <NSpace justify="end">
                <NButton type="primary" @click="submitHdReview">
                  提交高清图给发单方确认
                </NButton>
              </NSpace>
            </NSpace>
          </NCard>

          <NCard
            v-if="canSenderReviewHd"
            title="高清图确认"
            size="small"
          >
            <NSpace vertical :size="12">
              <div style="color: #888">
                接单方已提交处理后的高清图，请确认是否可以进入修模流程。
              </div>

              <BizFileViewer
                v-if="detailFileIds('PROCESSED_HD_PHOTO').length > 0"
                :file-ids="detailFileIds('PROCESSED_HD_PHOTO')"
                mode="image"
                :max="10"
                :thumb-size="80"
                show-name
              />

              <NInput
                v-model:value="hdReviewComment"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 4 }"
                placeholder="请输入审核意见"
              />

              <NSpace justify="end">
                <NButton type="primary" @click="approveHdReview">
                  通过
                </NButton>

                <NButton type="error" @click="openReviewReject('HD')">
                  驳回
                </NButton>
              </NSpace>
            </NSpace>
          </NCard>


          <NCard
            v-if="canReceiverSubmitEffect"
            title="修模效果图提交"
            size="small"
          >
            <NSpace vertical :size="12">
              <div style="color: #888">
                接单方内部审核完成后，请上传修模效果图并提交给发单方审核。
              </div>

              <BizFileUpload
                v-model="effectFileIds"
                biz-type="TEMP"
                file-stage="COLLAB_EFFECT_REVIEW"
                file-type="REPAIR_EFFECT_IMAGE"
                :max="10"
              />

              <BizFileViewer
                v-if="effectFileIds.length > 0"
                :file-ids="effectFileIds"
                mode="image"
                :max="10"
                :thumb-size="80"
                show-name
              />

              <NInput
                v-model:value="effectSubmitComment"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 4 }"
                placeholder="请输入修模效果图说明"
              />

              <NSpace justify="end">
                <NButton type="primary" @click="submitEffectReview">
                  提交发单方审核
                </NButton>
              </NSpace>
            </NSpace>
          </NCard>
          <NCard
            v-if="canSenderReviewEffect"
            title="修模效果图审核"
            size="small"
          >
            <NSpace vertical :size="12">
              <div style="color: #888">
                接单方已提交修模效果图，请审核是否通过。
              </div>

              <BizFileViewer
                v-if="detailFileIds('REPAIR_EFFECT_IMAGE').length > 0"
                :file-ids="detailFileIds('REPAIR_EFFECT_IMAGE')"
                mode="image"
                :max="10"
                :thumb-size="80"
                show-name
              />

              <NInput
                v-model:value="effectReviewComment"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 4 }"
                placeholder="请输入审核意见"
              />

              <NSpace justify="end">
                <NButton type="primary" @click="approveEffectReview">
                  通过
                </NButton>

                <NButton type="error" @click="openReviewReject('EFFECT')">
                  驳回
                </NButton>
              </NSpace>
            </NSpace>
          </NCard>

          <NCard
            v-if="canReceiverSyncPrint"
            title="打印状态同步"
            size="small"
          >
            <NSpace vertical :size="12">
              <div style="color: #888">
                当前协作单已进入打印流程，请同步打印状态给发单方。
              </div>

              <NForm label-placement="left" label-width="110">
                <NFormItem label="打印状态">
                  <NSelect
                    v-model:value="printForm.printStatus"
                    :options="printStatusOptions"
                    style="width: 240px"
                  />
                </NFormItem>

                <NFormItem label="打印备注">
                  <NInput
                    v-model:value="printForm.remark"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 4 }"
                    placeholder="请输入打印状态备注"
                  />
                </NFormItem>
              </NForm>

              <NSpace justify="end">
                <NButton
                  type="primary"
                  :loading="syncingPrint"
                  @click="submitPrintStatus"
                >
                  同步打印状态
                </NButton>
              </NSpace>
            </NSpace>
          </NCard>

          <NCard
            v-if="canViewPrintInfo"
            title="打印状态"
            size="small"
          >
            <NDescriptions bordered :column="2" size="small">
              <NDescriptionsItem label="打印状态">
                {{ printStatusLabel(detail.order?.printStatus) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="更新时间">
                {{ detail.order?.printStatusUpdateTime || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="打印完成时间">
                {{ detail.order?.printCompletedTime || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="打印备注">
                {{ detail.order?.printRemark || '-' }}
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>


          <NCard
            v-if="canReceiverDelivery"
            title="发货信息同步"
            size="small"
          >
            <NSpace vertical :size="12">
              <div style="color: #888">
                打印已完成，请填写物流信息并同步给发单方。
              </div>

              <NForm label-placement="left" label-width="110">
                <NFormItem label="物流公司" required>
                  <NInput
                    v-model:value="deliveryForm.logisticsCompany"
                    placeholder="请输入物流公司"
                  />
                </NFormItem>

                <NFormItem label="物流单号" required>
                  <NInput
                    v-model:value="deliveryForm.logisticsNo"
                    placeholder="请输入物流单号"
                  />
                </NFormItem>

                <NFormItem label="发货附件">
                  <NSpace vertical>
                    <BizFileUpload
                      v-model="deliveryAttachmentFileIds"
                      biz-type="TEMP"
                      file-stage="COLLAB_DELIVERY"
                      file-type="DELIVERY_ATTACHMENT"
                      :max="10"
                    />

                    <BizFileViewer
                      v-if="deliveryAttachmentFileIds.length > 0"
                      :file-ids="deliveryAttachmentFileIds"
                      mode="image"
                      :max="10"
                      :thumb-size="80"
                      show-name
                    />
                  </NSpace>
                </NFormItem>

                <NFormItem label="发货备注">
                  <NInput
                    v-model:value="deliveryForm.remark"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 4 }"
                    placeholder="请输入发货备注"
                  />
                </NFormItem>
              </NForm>

              <NSpace justify="end">
                <NButton
                  type="primary"
                  :loading="submittingDelivery"
                  @click="submitDelivery"
                >
                  确认发货
                </NButton>
              </NSpace>
            </NSpace>
          </NCard>

          <NCard
            v-if="canViewDeliveryInfo"
            title="发货信息"
            size="small"
          >
            <NSpace vertical :size="12">
              <NDescriptions bordered :column="2" size="small">
                <NDescriptionsItem label="发货状态">
                  {{ deliveryStatusLabel(detail.order?.deliveryStatus) }}
                </NDescriptionsItem>

                <NDescriptionsItem label="发货时间">
                  {{ detail.order?.deliveredTime || '-' }}
                </NDescriptionsItem>

                <NDescriptionsItem label="物流公司">
                  {{ detail.order?.logisticsCompany || '-' }}
                </NDescriptionsItem>

                <NDescriptionsItem label="物流单号">
                  {{ detail.order?.logisticsNo || '-' }}
                </NDescriptionsItem>

                <NDescriptionsItem label="发货备注" :span="2">
                  {{ detail.order?.deliveryRemark || '-' }}
                </NDescriptionsItem>
              </NDescriptions>

              <div v-if="detailFileIds('DELIVERY_ATTACHMENT').length > 0">
                <strong>发货附件</strong>

                <BizFileViewer
                  :file-ids="detailFileIds('DELIVERY_ATTACHMENT')"
                  mode="image"
                  :max="10"
                  :thumb-size="80"
                  show-name
                />
              </div>
            </NSpace>
          </NCard>


          <NCard title="协作时间线" size="small">
            <NSpace vertical>
              <NTimeline v-if="eventRows.length > 0">
                <NTimelineItem
                  v-for="item in eventRows"
                  :key="item.id"
                  :type="timelineItemType(item.eventType)"
                  :title="item.eventName || eventTypeLabel(item.eventType)"
                  :time="item.createTime"
                >
                  <NSpace vertical :size="6">
                    <div>
                      {{ item.eventContent || '-' }}
                    </div>

                    <div style="color: #888; font-size: 12px;">
                      操作方：{{ item.operatorTenantNameSnapshot || '-' }}
                      /
                      操作人：{{ item.operatorUserName || '-' }}
                    </div>

                    <BizFileViewer
                      v-if="eventFileIds(item).length > 0"
                      :file-ids="eventFileIds(item)"
                      mode="image"
                      :max="10"
                      :thumb-size="80"
                      show-name
                    />
                  </NSpace>
                </NTimelineItem>
              </NTimeline>

              <div v-else style="color: #888">
                暂无时间线记录
              </div>
            </NSpace>
          </NCard>

        </NSpace>
      </NDrawerContent>
    </NDrawer>

    <NModal
      v-model:show="showRejectModal"
      preset="card"
      title="拒单"
      style="width: 620px"
    >
      <NForm label-placement="left" label-width="110">
        <NFormItem label="拒单原因">
          <NInput
            v-model:value="rejectForm.reason"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="请输入拒单原因"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showRejectModal = false">取消</NButton>
          <NButton type="error" @click="submitReject">确认拒单</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showRejectModal" preset="card" title="驳回" style="width: 620px">
      <NForm label-placement="left" label-width="110">
        <NFormItem label="驳回原因">
          <NInput
            v-model:value="rejectReason"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="请输入驳回原因"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showRejectModal = false">取消</NButton>
          <NButton type="error" @click="submitReject">
            确认驳回
          </NButton>
        </NSpace>
      </template>
    </NModal>


    <NModal
      v-model:show="showReviewRejectModal"
      preset="card"
      title="审核驳回"
      style="width: 620px"
    >
      <NForm label-placement="left" label-width="110">
        <NFormItem label="驳回原因">
          <NInput
            v-model:value="reviewRejectReason"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="请输入驳回原因"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showReviewRejectModal = false">
            取消
          </NButton>

          <NButton type="error" @click="submitReviewReject">
            确认驳回
          </NButton>
        </NSpace>
      </template>
    </NModal>

  </NSpace>
</template>
