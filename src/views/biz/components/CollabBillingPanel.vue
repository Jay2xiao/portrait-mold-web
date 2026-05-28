<template>
  <NCard title="账单与支付" size="small" class="collab-billing-panel">
    <template #header-extra>
      <NSpace size="small" align="center">
        <NBadge v-if="syncFailedCount > 0" :value="syncFailedCount" type="error">
          <NTag type="error">同步异常</NTag>
        </NBadge>

        <NButton size="small" quaternary :loading="localLoading" @click="refreshBillingData()">
          刷新
        </NButton>

        <NButton v-if="canCreateBill" size="small" type="primary" :loading="busy" @click="openCreateBillModal">
          创建账单
        </NButton>

        <NButton v-if="canSendBill" size="small" type="primary" :loading="busy" @click="confirmSendBill">
          发送账单
        </NButton>

        <NButton v-if="canCancelBill" size="small" type="error" ghost :loading="busy" @click="openCancelBillModal">
          作废账单
        </NButton>

        <NButton v-if="canUploadVoucher" size="small" type="primary" :loading="busy" @click="openUploadVoucherModal">
          上传付款凭证
        </NButton>

        <NButton v-if="canResyncBill" size="small" type="warning" ghost :loading="busy" @click="confirmResyncBill">
          重试账单同步
        </NButton>
      </NSpace>
    </template>

    <NAlert v-if="normalizedRole === 'auto'" type="warning" class="mb-12px">
      当前未传入协作角色，组件仅展示账单与凭证，不显示操作按钮。收到的协作单页面请传
      <strong>role="receiver"</strong>，发出的协作单页面请传
      <strong>role="sender"</strong>。
    </NAlert>

    <NAlert v-if="syncFailedCount > 0" type="error" class="mb-12px">
      当前账务存在同步异常，请查看下方失败原因，并在确认数据无误后点击“重试同步”。
    </NAlert>

    <NSpin :show="localLoading || loading">
      <template v-if="displayBill">
        <NDescriptions bordered size="small" :column="2" label-placement="left">
          <NDescriptionsItem label="账单号">
            {{ displayBill.collabBillNo || '-' }}
          </NDescriptionsItem>

          <NDescriptionsItem label="账单标题">
            {{ displayBill.billTitle || '-' }}
          </NDescriptionsItem>

          <NDescriptionsItem label="账单金额">
            {{ money(displayBill.billAmount) }}
          </NDescriptionsItem>

          <NDescriptionsItem label="已付金额">
            {{ money(displayBill.paidAmount) }}
          </NDescriptionsItem>

          <NDescriptionsItem label="未付金额">
            {{ money(displayBill.unpaidAmount) }}
          </NDescriptionsItem>

          <NDescriptionsItem label="账单状态">
            <NTag :type="billStatusTagType(displayBill.billStatus)">
              {{ billStatusText(displayBill.billStatus) }}
            </NTag>
          </NDescriptionsItem>

          <NDescriptionsItem label="支付状态">
            <NTag :type="payStatusTagType(displayBill.payStatus)">
              {{ payStatusText(displayBill.payStatus) }}
            </NTag>
          </NDescriptionsItem>

          <NDescriptionsItem label="内部账单同步">
            <NTag :type="syncStatusTagType(displayBill.internalBillSyncStatus)">
              {{ syncStatusText(displayBill.internalBillSyncStatus) }}
            </NTag>
          </NDescriptionsItem>

          <NDescriptionsItem label="内部账单号">
            {{ displayBill.receiverInternalBillNoSnapshot || '-' }}
          </NDescriptionsItem>

          <NDescriptionsItem label="发送时间">
            {{ displayBill.sendTime || '-' }}
          </NDescriptionsItem>

          <NDescriptionsItem label="付款确认时间">
            {{ displayBill.paidConfirmTime || '-' }}
          </NDescriptionsItem>

          <NDescriptionsItem label="备注">
            {{ displayBill.remark || '-' }}
          </NDescriptionsItem>
        </NDescriptions>

        <NAlert v-if="displayBill.internalBillSyncStatus === 'FAILED'" type="error" class="mt-12px">
          <NSpace vertical :size="8">
            <span>内部账单同步失败：{{ displayBill.internalBillSyncError || '未知错误' }}</span>
            <NButton
              size="small"
              type="warning"
              ghost
              :disabled="!isReceiver"
              :loading="busy"
              :title="isReceiver ? '' : '仅接单方可重试同步内部账单'"
              @click="confirmResyncBill"
            >
              重试账单同步
            </NButton>
          </NSpace>
        </NAlert>

        <template v-if="billItems.length">
          <NDivider />
          <NSpace justify="space-between" align="center" class="mb-8px">
            <strong>账单明细</strong>
            <NTag size="small" type="info">
              共 {{ billItems.length }} 项
            </NTag>
          </NSpace>

          <NDataTable size="small" :columns="billItemColumns" :data="billItems" :pagination="false" bordered />
        </template>
      </template>

      <NEmpty v-else description="暂无协作账单">
        <template #extra>
          <NButton v-if="canCreateBill" size="small" type="primary" :loading="busy" @click="openCreateBillModal">
            创建账单
          </NButton>
        </template>
      </NEmpty>

      <NDivider />

      <NSpace justify="space-between" align="center" class="mb-8px">
        <strong>付款凭证</strong>
        <NSpace size="small">
          <NTag v-if="pendingVoucher" type="warning">
            有待审核凭证
          </NTag>
          <NTag v-if="approvedVoucher" type="success">
            已确认付款
          </NTag>
        </NSpace>
      </NSpace>

      <NDataTable
        v-if="displayVouchers.length"
        size="small"
        :columns="voucherColumns"
        :data="displayVouchers"
        :pagination="false"
        :bordered="true"
      />

      <NEmpty v-else description="暂无付款凭证" />
    </NSpin>

    <!-- 创建账单 -->
    <NModal v-model:show="createBillModalVisible" preset="card" title="创建协作账单" :style="{ width: '560px' }">
      <NForm label-placement="left" label-width="100px">
        <NFormItem label="账单金额" required>
          <NInputNumber
            v-model:value="createForm.billAmount"
            :min="0.01"
            :precision="2"
            class="w-full"
            placeholder="请输入账单金额"
          />
        </NFormItem>

        <NFormItem label="账单标题">
          <NInput v-model:value="createForm.billTitle" placeholder="请输入账单标题" />
        </NFormItem>

        <NFormItem label="明细名称">
          <NInput v-model:value="createForm.itemName" placeholder="例如：协作服务费 / 打印费 / 修模费" />
        </NFormItem>

        <NFormItem label="明细类型">
          <NSelect v-model:value="createForm.itemType" :options="billItemTypeOptions" placeholder="请选择明细类型" />
        </NFormItem>

        <NFormItem label="账单备注">
          <NInput v-model:value="createForm.billRemark" type="textarea" placeholder="请输入账单备注" />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="createBillModalVisible = false">取消</NButton>
          <NButton type="primary" :loading="busy" @click="handleCreateBill">
            创建
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- 作废账单 -->
    <NModal v-model:show="cancelBillModalVisible" preset="card" title="作废协作账单" :style="{ width: '520px' }">
      <NForm label-placement="left" label-width="90px">
        <NFormItem label="作废原因" required>
          <NInput v-model:value="cancelForm.reason" type="textarea" placeholder="请输入作废原因" />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="cancelBillModalVisible = false">取消</NButton>
          <NButton type="error" :loading="busy" @click="handleCancelBill">
            确认作废
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- 上传付款凭证 -->
    <NModal v-model:show="uploadVoucherModalVisible" preset="card" title="上传付款凭证" :style="{ width: '620px' }">
      <NForm label-placement="left" label-width="110px">
        <NAlert type="info" class="mb-12px" show-icon>
          当前版本仅支持一次性全额付款，系统已默认带出未付金额，请核对后提交。
        </NAlert>

        <NFormItem label="付款金额" required>
          <NInputNumber
            v-model:value="voucherForm.paymentAmount"
            :min="0.01"
            :precision="2"
            class="w-full"
            placeholder="请输入付款金额"
          />
        </NFormItem>

        <NFormItem label="付款渠道" required>
          <NSelect v-model:value="voucherForm.paymentChannel" :options="paymentChannelOptions" placeholder="请选择付款渠道" />
        </NFormItem>

        <NFormItem label="付款时间">
          <NDatePicker v-model:value="voucherForm.paymentTimeMs" type="datetime" clearable class="w-full" />
        </NFormItem>

        <NFormItem label="付款人">
          <NInput v-model:value="voucherForm.payerName" placeholder="请输入付款人名称" />
        </NFormItem>

        <NFormItem label="交易流水号">
          <NInput v-model:value="voucherForm.transactionNo" placeholder="请输入交易流水号" />
        </NFormItem>

        <NFormItem label="凭证文件" required>
          <BizFileUpload
            v-model="voucherForm.fileIdTags"
            biz-type="TEMP"
            file-stage="PAYMENT"
            file-type="PAYMENT_PROOF"
            :max="5"
          />
        </NFormItem>

        <NFormItem label="备注">
          <NInput v-model:value="voucherForm.remark" type="textarea" placeholder="请输入备注" />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="uploadVoucherModalVisible = false">取消</NButton>
          <NButton type="primary" :loading="busy" @click="handleUploadVoucher">
            上传
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- 审核付款凭证 -->
    <NModal
      v-model:show="reviewModalVisible"
      preset="card"
      :title="reviewMode === 'approve' ? '审核通过付款凭证' : '驳回付款凭证'"
      :style="{ width: '520px' }"
    >
      <NForm label-placement="left" label-width="90px">
        <NFormItem v-if="currentReviewFileIds.length" label="凭证文件">
          <BizFileViewer :file-ids="currentReviewFileIds" mode="image" :max="10" :thumb-size="80" show-name />
        </NFormItem>

        <NFormItem label="审核备注" :required="reviewMode === 'reject'">
          <NInput
            v-model:value="reviewForm.reviewRemark"
            type="textarea"
            :placeholder="reviewMode === 'approve' ? '请输入审核备注，可为空' : '请输入驳回原因'"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="reviewModalVisible = false">取消</NButton>
          <NButton :type="reviewMode === 'approve' ? 'success' : 'error'" :loading="busy" @click="handleSubmitReview">
            {{ reviewMode === 'approve' ? '审核通过' : '确认驳回' }}
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </NCard>
</template>

<script setup lang="ts">
import {computed, h, reactive, ref, VNodeChild, watch} from 'vue';
import {
  NAlert,
  NBadge,
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NDescriptions,
  NDescriptionsItem,
  NDivider,
  NDynamicTags,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSpace,
  NSpin,
  NTag,
  useDialog,
  useMessage,
  type DataTableColumns
} from 'naive-ui';

import {
  cancelCollabBill,
  createCollabBill,
  fetchCollabBillByOrder,
  resyncCollabInternalBill,
  sendCollabBill,
  type CollabBillVO,
  type CollabId
} from '@/service/api/biz/collab-bill';

import {
  approveCollabPaymentVoucher,
  fetchCollabPaymentVouchersByBill,
  rejectCollabPaymentVoucher,
  resyncCollabPayment,
  uploadCollabPaymentVoucher,
  type CollabPaymentChannel,
  type CollabPaymentVoucherVO
} from '@/service/api/biz/collab-payment-voucher';

import {
  billItemTypeText,
  billStatusTagType,
  billStatusText,
  money,
  parseBillItems,
  parseProofFileIds,
  payStatusTagType,
  payStatusText,
  paymentChannelText,
  reviewStatusTagType,
  reviewStatusText,
  syncStatusTagType,
  syncStatusText,
  type CollabBillItemDisplay
} from '@/service/api/biz//collabFinanceMeta';
import BizFileUpload from "@/views/biz/components/BizFileUpload.vue";
import BizFileViewer from "@/views/biz/components/BizFileViewer.vue";

type RoleType = 'sender' | 'receiver' | 'auto';

interface Props {
  detail?: any;
  role?: RoleType;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  role: 'auto',
  loading: false
});

const emit = defineEmits<{
  refresh: [];
}>();

const message = useMessage();
const dialog = useDialog();

const busy = ref(false);
const localLoading = ref(false);

const localBill = ref<CollabBillVO | null>(null);
const localPaymentVouchers = ref<CollabPaymentVoucherVO[]>([]);

const createBillModalVisible = ref(false);
const cancelBillModalVisible = ref(false);
const uploadVoucherModalVisible = ref(false);
const reviewModalVisible = ref(false);

const reviewMode = ref<'approve' | 'reject'>('approve');
const currentReviewVoucher = ref<CollabPaymentVoucherVO | null>(null);

const createForm = reactive({
  collabOrderId: undefined as CollabId | undefined,
  billAmount: null as number | null,
  billTitle: '',
  billRemark: '',
  itemName: '协作服务费',
  itemType: 'COLLAB_SERVICE_FEE'
});

const cancelForm = reactive({
  reason: ''
});

const voucherForm = reactive({
  paymentAmount: null as number | null,
  paymentChannel: 'WECHAT' as CollabPaymentChannel,
  paymentTimeMs: null as number | null,
  payerName: '',
  transactionNo: '',
  fileIdTags: [] as string[],
  remark: ''
});

const reviewForm = reactive({
  reviewRemark: ''
});

const billItemTypeOptions = [
  { label: '协作服务费', value: 'COLLAB_SERVICE_FEE' },
  { label: '修模费', value: 'REPAIR_FEE' },
  { label: '打印费', value: 'PRINT_FEE' },
  { label: '发货费', value: 'DELIVERY_FEE' },
  { label: '其他费用', value: 'OTHER_FEE' }
];

const paymentChannelOptions = [
  { label: '微信', value: 'WECHAT' },
  { label: '支付宝', value: 'ALIPAY' },
  { label: '银行转账', value: 'BANK' },
  { label: '现金', value: 'CASH' },
  { label: '其他', value: 'OTHER' }
];

const order = computed(() => props.detail?.order || props.detail || {});

const orderId = computed<CollabId | undefined>(() => order.value?.id || order.value?.collabOrderId);

const orderStatus = computed(() => order.value?.status || '');
const paymentStatus = computed(() => order.value?.paymentStatus || '');

const normalizedRole = computed<RoleType>(() => {
  if (props.role !== 'auto') {
    return props.role;
  }

  const raw = String(
    props.detail?.currentRole ||
    props.detail?.roleType ||
    order.value?.currentRole ||
    order.value?.roleType ||
    ''
  ).toUpperCase();

  if (['SENDER', 'SENT'].includes(raw)) {
    return 'sender';
  }

  if (['RECEIVER', 'RECEIVED'].includes(raw)) {
    return 'receiver';
  }

  return 'auto';
});

const isSender = computed(() => normalizedRole.value === 'sender');
const isReceiver = computed(() => normalizedRole.value === 'receiver');

const displayBill = computed(() => localBill.value);
const displayVouchers = computed(() => localPaymentVouchers.value);
const currentReviewFileIds = computed(() => parseProofFileIds(currentReviewVoucher.value?.proofFileIds));

const billItems = computed<CollabBillItemDisplay[]>(() => {
  return parseBillItems(displayBill.value?.billItemsJson || '');
});

const pendingVoucher = computed(() => displayVouchers.value.find(item => item.reviewStatus === 'PENDING'));
const approvedVoucher = computed(() => displayVouchers.value.find(item => item.reviewStatus === 'APPROVED'));

const syncFailedCount = computed(() => {
  let count = 0;

  if (displayBill.value?.internalBillSyncStatus === 'FAILED') {
    count += 1;
  }

  displayVouchers.value.forEach(item => {
    if (item.internalPaymentSyncStatus === 'FAILED') {
      count += 1;
    }

    if (item.collabCostSyncStatus === 'FAILED') {
      count += 1;
    }
  });

  return count;
});

const canCreateBill = computed(() => isReceiver.value && orderStatus.value === 'WAIT_BILL' && !displayBill.value);

const canSendBill = computed(() => isReceiver.value && displayBill.value?.billStatus === 'DRAFT');

const canCancelBill = computed(() => {
  if (!isReceiver.value || !displayBill.value) return false;

  if (!['DRAFT', 'SENT'].includes(String(displayBill.value.billStatus))) return false;

  if (displayBill.value.payStatus === 'PAID') return false;

  return ['WAIT_BILL', 'BILLED'].includes(orderStatus.value);
});

const canUploadVoucher = computed(() => {
  if (!isSender.value || !displayBill.value) return false;

  if (displayBill.value.billStatus !== 'SENT') return false;

  if (displayBill.value.payStatus !== 'UNPAID') return false;

  return orderStatus.value === 'BILLED' || paymentStatus.value === 'VOUCHER_REJECTED';
});

const canResyncBill = computed(() => {
  return isReceiver.value && displayBill.value?.internalBillSyncStatus === 'FAILED';
});

const billItemColumns: DataTableColumns<CollabBillItemDisplay> = [
  {
    title: '项目名称',
    key: 'itemName',
    minWidth: 160,
    render(row) {
      return row.itemName || '-';
    }
  },
  {
    title: '项目类型',
    key: 'itemType',
    width: 130,
    render(row) {
      return billItemTypeText(row.itemType);
    }
  },
  {
    title: '金额',
    key: 'amount',
    width: 120,
    render(row) {
      return money(row.amount);
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

const voucherColumns = computed<DataTableColumns<CollabPaymentVoucherVO>>(() => {
  return [
    {
      title: '凭证号',
      key: 'voucherNo',
      minWidth: 150
    },
    {
      title: '付款金额',
      key: 'paymentAmount',
      width: 120,
      render(row) {
        return money(row.paymentAmount);
      }
    },
    {
      title: '付款渠道',
      key: 'paymentChannel',
      width: 100,
      render(row) {
        return paymentChannelText(row.paymentChannel);
      }
    },
    {
      title: '凭证文件',
      key: 'proofFileIds',
      minWidth: 160,
      render(row) {
        const fileIds = parseProofFileIds(row.proofFileIds);

        if (!fileIds.length) {
          return '-';
        }

        return h(BizFileViewer, {
          fileIds,
          mode: 'image',
          max: 4,
          thumbSize: 54,
          showName: true
        });
      }
    },
    {
      title: '审核状态',
      key: 'reviewStatus',
      width: 110,
      render(row) {
        return h(
          NTag,
          { type: reviewStatusTagType(row.reviewStatus) },
          { default: () => reviewStatusText(row.reviewStatus) }
        );
      }
    },
    {
      title: '内部收款同步',
      key: 'internalPaymentSyncStatus',
      width: 140,
      render(row) {
        return renderSyncTag(row.internalPaymentSyncStatus, row.internalPaymentSyncError);
      }
    },
    {
      title: '外协成本同步',
      key: 'collabCostSyncStatus',
      width: 140,
      render(row) {
        return renderSyncTag(row.collabCostSyncStatus, row.collabCostSyncError);
      }
    },
    {
      title: '付款时间',
      key: 'paymentTime',
      minWidth: 160,
      render(row) {
        return row.paymentTime || '-';
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      fixed: 'right' as const,
      render(row) {
        const buttons: VNodeChild[] = [];

        if (isReceiver.value && row.reviewStatus === 'PENDING' && orderStatus.value === 'VOUCHER_UPLOADED') {
          buttons.push(
            h(
              NButton,
              {
                size: 'small',
                type: 'success',
                ghost: true,
                onClick: () => openReviewModal(row, 'approve')
              },
              { default: () => '通过' }
            )
          );

          buttons.push(
            h(
              NButton,
              {
                size: 'small',
                type: 'error',
                ghost: true,
                onClick: () => openReviewModal(row, 'reject')
              },
              { default: () => '驳回' }
            )
          );
        }

        if (
          isReceiver.value &&
          row.reviewStatus === 'APPROVED' &&
          (row.internalPaymentSyncStatus === 'FAILED' || row.collabCostSyncStatus === 'FAILED')
        ) {
          buttons.push(
            h(
              NButton,
              {
                size: 'small',
                type: 'warning',
                ghost: true,
                onClick: () => confirmResyncPayment(row)
              },
              { default: () => '重试同步' }
            )
          );
        }

        if (!buttons.length) {
          return '-';
        }

        return h(NSpace, { size: 'small' }, { default: () => buttons });
      }
    }
  ];
});

watch(
  () => props.detail,
  async () => {
    initFromDetail();

    if (orderId.value) {
      await refreshBillingData(false);
    }
  },
  { immediate: true }
);

function initFromDetail() {
  localBill.value = props.detail?.bill || null;
  localPaymentVouchers.value = Array.isArray(props.detail?.paymentVouchers) ? props.detail.paymentVouchers : [];
}

async function refreshBillingData(shouldEmit = true) {
  if (!orderId.value) return;

  localLoading.value = true;

  try {
    const billRes = await fetchCollabBillByOrder(orderId.value);
    const billData = unwrapData<CollabBillVO | null>(billRes);
    localBill.value = billData || null;

    if (billData?.id) {
      const voucherRes = await fetchCollabPaymentVouchersByBill(billData.id);
      localPaymentVouchers.value = unwrapData<CollabPaymentVoucherVO[]>(voucherRes) || [];
    } else {
      localPaymentVouchers.value = [];
    }

    if (shouldEmit) {
      emit('refresh');
    }
  } finally {
    localLoading.value = false;
  }
}

function openCreateBillModal() {
  if (!orderId.value) {
    message.error('协作单ID不能为空');
    return;
  }

  createForm.collabOrderId = orderId.value;

  const defaultAmount = Number(
    order.value?.collabAmount || order.value?.collabCostAmount || order.value?.quotedAmount || order.value?.amount || 0
  );

  createForm.billAmount = defaultAmount > 0 ? Number(defaultAmount.toFixed(2)) : null;
  createForm.billTitle = `${order.value?.collabOrderNo || order.value?.title || '协作单'} 协作账单`;
  createForm.billRemark = '';
  createForm.itemName = '协作服务费';
  createForm.itemType = 'COLLAB_SERVICE_FEE';

  createBillModalVisible.value = true;
}

async function handleCreateBill() {
  if (!createForm.collabOrderId) {
    message.error('协作单ID不能为空');
    return;
  }

  if (!createForm.billAmount || createForm.billAmount <= 0) {
    message.error('账单金额必须大于0');
    return;
  }

  busy.value = true;

  try {
    const amount = Number(createForm.billAmount.toFixed(2));

    await createCollabBill({
      collabOrderId: createForm.collabOrderId,
      billAmount: amount,
      billTitle: createForm.billTitle || undefined,
      billRemark: createForm.billRemark || undefined,
      items: createForm.itemName
        ? [
          {
            itemName: createForm.itemName,
            itemType: createForm.itemType,
            amount,
            remark: createForm.billRemark || undefined
          }
        ]
        : undefined
    });

    message.success('协作账单创建成功');
    createBillModalVisible.value = false;
    await refreshBillingData();
  } finally {
    busy.value = false;
  }
}

function confirmSendBill() {
  if (!displayBill.value?.id) {
    message.error('账单ID不能为空');
    return;
  }

  dialog.warning({
    title: '确认发送账单',
    content: '发送后发单方将可以查看账单并上传付款凭证，是否继续？',
    positiveText: '发送',
    negativeText: '取消',
    onPositiveClick: () => handleSendBill(displayBill.value!.id!)
  });
}

async function handleSendBill(id: CollabId) {
  busy.value = true;

  try {
    await sendCollabBill(id);
    message.success('协作账单已发送');
    await refreshBillingData();
  } finally {
    busy.value = false;
  }
}

function openCancelBillModal() {
  cancelForm.reason = '';
  cancelBillModalVisible.value = true;
}

async function handleCancelBill() {
  if (!displayBill.value?.id) {
    message.error('账单ID不能为空');
    return;
  }

  if (!cancelForm.reason.trim()) {
    message.error('请输入作废原因');
    return;
  }

  busy.value = true;

  try {
    await cancelCollabBill(displayBill.value.id, {
      reason: cancelForm.reason.trim()
    });

    message.success('协作账单已作废');
    cancelBillModalVisible.value = false;
    await refreshBillingData();
  } finally {
    busy.value = false;
  }
}

function openUploadVoucherModal() {
  if (!displayBill.value?.id) {
    message.error('请先选择协作账单');
    return;
  }

  const unpaidAmount = Number(displayBill.value.unpaidAmount || displayBill.value.billAmount || 0);

  voucherForm.paymentAmount = unpaidAmount > 0 ? Number(unpaidAmount.toFixed(2)) : null;
  voucherForm.paymentChannel = 'WECHAT';
  voucherForm.paymentTimeMs = Date.now();
  voucherForm.payerName = '';
  voucherForm.transactionNo = '';
  voucherForm.fileIdTags = [];
  voucherForm.remark = '';

  uploadVoucherModalVisible.value = true;
}

async function handleUploadVoucher() {
  if (!displayBill.value?.id) {
    message.error('协作账单ID不能为空');
    return;
  }

  if (!voucherForm.paymentAmount || voucherForm.paymentAmount <= 0) {
    message.error('付款金额必须大于0');
    return;
  }

  let fileIds: CollabId[] = [];

  try {
    fileIds = parseFileIdTags(voucherForm.fileIdTags);
  } catch (error: any) {
    message.error(error?.message || '付款凭证文件ID格式错误');
    return;
  }

  if (!fileIds.length) {
    message.error('请至少输入一个付款凭证文件ID');
    return;
  }

  busy.value = true;

  try {
    await uploadCollabPaymentVoucher({
      collabBillId: displayBill.value.id,
      paymentAmount: Number(voucherForm.paymentAmount.toFixed(2)),
      paymentChannel: voucherForm.paymentChannel,
      paymentTime: voucherForm.paymentTimeMs ? formatDateTime(new Date(voucherForm.paymentTimeMs)) : undefined,
      payerName: voucherForm.payerName || undefined,
      transactionNo: voucherForm.transactionNo || undefined,
      fileIds,
      remark: voucherForm.remark || undefined
    });

    message.success('付款凭证已上传');
    uploadVoucherModalVisible.value = false;
    await refreshBillingData();
  } finally {
    busy.value = false;
  }
}

function openReviewModal(row: CollabPaymentVoucherVO, mode: 'approve' | 'reject') {
  currentReviewVoucher.value = row;
  reviewMode.value = mode;
  reviewForm.reviewRemark = '';
  reviewModalVisible.value = true;
}

async function handleSubmitReview() {
  const voucher = currentReviewVoucher.value;

  if (!voucher?.id) {
    message.error('付款凭证ID不能为空');
    return;
  }

  if (reviewMode.value === 'reject' && !reviewForm.reviewRemark.trim()) {
    message.error('请输入驳回原因');
    return;
  }

  busy.value = true;

  try {
    if (reviewMode.value === 'approve') {
      await approveCollabPaymentVoucher(voucher.id, {
        reviewRemark: reviewForm.reviewRemark || undefined
      });
      message.success('付款凭证已审核通过');
    } else {
      await rejectCollabPaymentVoucher(voucher.id, {
        reviewRemark: reviewForm.reviewRemark.trim()
      });
      message.success('付款凭证已驳回');
    }

    reviewModalVisible.value = false;
    await refreshBillingData();
  } finally {
    busy.value = false;
  }
}

function confirmResyncBill() {
  if (!displayBill.value?.id) {
    message.error('账单ID不能为空');
    return;
  }

  dialog.warning({
    title: '重试内部账单同步',
    content: '将重新尝试同步到接单方内部客户账单，是否继续？',
    positiveText: '重试',
    negativeText: '取消',
    onPositiveClick: () => handleResyncBill(displayBill.value!.id!)
  });
}

async function handleResyncBill(id: CollabId) {
  busy.value = true;

  try {
    const res = await resyncCollabInternalBill(id);
    const data = unwrapData<any>(res);

    if (data?.success === false) {
      message.error(data.message || '内部账单同步失败');
    } else {
      message.success(data?.message || '内部账单同步成功');
    }

    await refreshBillingData();
  } finally {
    busy.value = false;
  }
}

function confirmResyncPayment(row: CollabPaymentVoucherVO) {
  if (!row.id) {
    message.error('付款凭证ID不能为空');
    return;
  }

  dialog.warning({
    title: '重试付款同步',
    content: '将重新尝试同步内部收款和外协成本，是否继续？',
    positiveText: '重试',
    negativeText: '取消',
    onPositiveClick: () => handleResyncPayment(row.id!)
  });
}

async function handleResyncPayment(id: CollabId) {
  busy.value = true;

  try {
    const res = await resyncCollabPayment(id);
    const data = unwrapData<any>(res);

    if (data?.success === false) {
      message.error(data.message || '付款同步失败');
    } else {
      message.success(data?.message || '付款同步成功');
    }

    await refreshBillingData();
  } finally {
    busy.value = false;
  }
}

function renderSyncTag(status?: string, error?: string) {
  const tag = h(
    NTag,
    { type: syncStatusTagType(status) },
    { default: () => syncStatusText(status) }
  );

  if (status !== 'FAILED') {
    return tag;
  }

  return h(
    NSpace,
    {
      vertical: true,
      size: 4
    },
    {
      default: () => [
        tag,
        h(
          'span',
          {
            class: 'sync-error-text'
          },
          error || '未知错误'
        )
      ]
    }
  );
}

function parseFileIdTags(tags: string[]): CollabId[] {
  return tags
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      if (!/^\d+$/.test(item)) {
        throw new Error(`文件ID必须是数字：${item}`);
      }

      return item;
    });
}

function unwrapData<T>(res: any): T {
  if (res && typeof res === 'object' && 'data' in res) {
    return res.data as T;
  }

  return res as T;
}

function formatDateTime(date: Date) {
  const pad = (num: number) => String(num).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}:${pad(date.getSeconds())}`;
}
</script>

<style scoped>
.collab-billing-panel {
  margin-top: 16px;
}

.mb-8px {
  margin-bottom: 8px;
}

.mb-12px {
  margin-bottom: 12px;
}

.mt-12px {
  margin-top: 12px;
}

.w-full {
  width: 100%;
}

.sync-error-text {
  color: #d03050;
  font-size: 12px;
  line-height: 1.4;
  word-break: break-all;
}
</style>
