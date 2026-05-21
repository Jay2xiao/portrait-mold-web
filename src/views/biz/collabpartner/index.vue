<script setup lang="ts">
import {computed, h, onMounted, reactive, ref, VNodeChild} from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NDivider,
  NForm,
  NFormItem,
  NGrid,
  NGi,
  NInput,
  NModal,
  NSelect,
  NStatistic,
  NSpace,
  NTag,
  NTabs,
  NTabPane,
  NInput as NTextareaInput,
  useDialog,
  useMessage
} from 'naive-ui';

import {
  acceptCollabPartner,
  applyCollabPartner,
  deleteCollabPartner,
  fetchCollabPartnerList,
  rejectCollabPartner,
  searchCollabMerchants
} from '@/service/api/biz/collab';

defineOptions({
  name: 'BizCollabPartner'
});

interface MerchantRow {
  id?: string | number;
  tenantId?: string;
  tenantNameSnapshot?: string;
  merchantName?: string;
  contactName?: string;
  contactPhone?: string;
  merchantType?: string;
  serviceDesc?: string;
  publicVisible?: boolean | string | number;
  enabled?: boolean | string | number;
}

interface PartnerRow {
  id?: string | number;
  relationKey?: string;
  applyTenantId?: string;
  applyTenantNameSnapshot?: string;
  targetTenantId?: string;
  targetTenantNameSnapshot?: string;
  partnerTenantId?: string;
  partnerTenantName?: string;
  direction?: string; // SENT / RECEIVED
  status?: string; // PENDING / ACCEPTED / REJECTED / BLOCKED / DELETED
  applyMessage?: string;
  rejectReason?: string;
  acceptedTime?: string;
  createTime?: string;
}

const message = useMessage();
const dialog = useDialog();

const merchantLoading = ref(false);
const partnerLoading = ref(false);

const merchantRows = ref<MerchantRow[]>([]);
const partnerRows = ref<PartnerRow[]>([]);

const activeTab = ref<'ACCEPTED' | 'PENDING_RECEIVED' | 'PENDING_SENT' | 'HISTORY'>('ACCEPTED');

const showApplyModal = ref(false);
const selectedMerchant = ref<MerchantRow | null>(null);
const applyForm = reactive({
  applyMessage: '你好，我们希望与贵商家建立好友协作关系。'
});

const showRejectModal = ref(false);
const rejectTarget = ref<PartnerRow | null>(null);
const rejectForm = reactive({
  reason: ''
});

const searchForm = reactive({
  merchantName: '',
  serviceType: ''
});

const serviceTypeOptions = [
  { label: '只修模', value: 'REPAIR_ONLY' },
  { label: '只打印', value: 'PRINT_ONLY' },
  { label: '修模 + 打印', value: 'REPAIR_PRINT' }
];

function unwrapData(res: any) {
  return res?.data || res;
}

function merchantTypeLabel(value?: string) {
  const map: Record<string, string> = {
    LEAD_GEN: '获客商家',
    REPAIR: '修模商家',
    PRINT: '打印商家',
    REPAIR_PRINT: '修模+打印',
    GENERAL: '综合商家'
  };

  return map[value || ''] || value || '-';
}

function partnerStatusLabel(value?: string) {
  const map: Record<string, string> = {
    PENDING: '待确认',
    ACCEPTED: '已通过',
    REJECTED: '已拒绝',
    BLOCKED: '已拉黑',
    DELETED: '已解除'
  };

  return map[value || ''] || value || '-';
}

function partnerStatusTagType(value?: string) {
  const map: Record<string, string> = {
    PENDING: 'warning',
    ACCEPTED: 'success',
    REJECTED: 'error',
    BLOCKED: 'error',
    DELETED: 'default'
  };

  return map[value || ''] || 'default';
}

function directionLabel(value?: string) {
  if (value === 'SENT') return '我发出的';
  if (value === 'RECEIVED') return '我收到的';
  return value || '-';
}

function directionTagType(value?: string) {
  if (value === 'SENT') return 'info';
  if (value === 'RECEIVED') return 'warning';
  return 'default';
}

function relationMarkLabel(status?: string) {
  const map: Record<string, string> = {
    NONE: '无关系',
    PENDING: '待确认',
    ACCEPTED: '已好友',
    REJECTED: '已拒绝',
    BLOCKED: '已拉黑',
    DELETED: '已解除'
  };

  return map[status || 'NONE'] || status || '-';
}

function relationMarkTagType(status?: string) {
  const map: Record<string, string> = {
    NONE: 'default',
    PENDING: 'warning',
    ACCEPTED: 'success',
    REJECTED: 'error',
    BLOCKED: 'error',
    DELETED: 'info'
  };

  return map[status || 'NONE'] || 'default';
}

function relationMap() {
  const map = new Map<string, PartnerRow>();

  partnerRows.value.forEach(item => {
    if (item.partnerTenantId) {
      map.set(item.partnerTenantId, item);
    }
  });

  return map;
}

const relationStatusMap = computed(() => relationMap());

function merchantRelationStatus(tenantId?: string) {
  if (!tenantId) return 'NONE';
  return relationStatusMap.value.get(tenantId)?.status || 'NONE';
}

function canApplyMerchant(tenantId?: string) {
  const status = merchantRelationStatus(tenantId);
  return !['PENDING', 'ACCEPTED', 'BLOCKED'].includes(status);
}

const acceptedPartners = computed(() =>
  partnerRows.value.filter(item => item.status === 'ACCEPTED')
);

const pendingReceivedPartners = computed(() =>
  partnerRows.value.filter(item => item.status === 'PENDING' && item.direction === 'RECEIVED')
);

const pendingSentPartners = computed(() =>
  partnerRows.value.filter(item => item.status === 'PENDING' && item.direction === 'SENT')
);

const historyPartners = computed(() =>
  partnerRows.value.filter(item => ['REJECTED', 'BLOCKED', 'DELETED'].includes(item.status || ''))
);

const partnerCountSummary = computed(() => ({
  accepted: acceptedPartners.value.length,
  pendingReceived: pendingReceivedPartners.value.length,
  pendingSent: pendingSentPartners.value.length,
  history: historyPartners.value.length
}));

const merchantColumns = [
  {
    title: '商家名称',
    key: 'merchantName',
    width: 180
  },
  {
    title: '商家类型',
    key: 'merchantType',
    width: 130,
    render(row: MerchantRow) {
      return merchantTypeLabel(row.merchantType);
    }
  },
  {
    title: '联系人',
    key: 'contactName',
    width: 120
  },
  {
    title: '联系电话',
    key: 'contactPhone',
    width: 140
  },
  {
    title: '关系状态',
    key: 'relation',
    width: 120,
    render(row: MerchantRow) {
      const status = merchantRelationStatus(row.tenantId);

      return h(
        NTag,
        { type: relationMarkTagType(status) as any },
        { default: () => relationMarkLabel(status) }
      );
    }
  },
  {
    title: '服务说明',
    key: 'serviceDesc',
    minWidth: 260,
    ellipsis: { tooltip: true }
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render(row: MerchantRow) {
      const disabled = !canApplyMerchant(row.tenantId);

      return h(
        NButton,
        {
          size: 'small',
          type: 'primary',
          disabled,
          onClick: () => openApplyModal(row)
        },
        { default: () => (disabled ? '已申请/已好友' : '申请好友') }
      );
    }
  }
];

const partnerColumns = [
  {
    title: '对方商家',
    key: 'partnerTenantName',
    width: 180
  },
  {
    title: '方向',
    key: 'direction',
    width: 110,
    render(row: PartnerRow) {
      return h(
        NTag,
        { type: directionTagType(row.direction) as any },
        { default: () => directionLabel(row.direction) }
      );
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render(row: PartnerRow) {
      return h(
        NTag,
        { type: partnerStatusTagType(row.status) as any },
        { default: () => partnerStatusLabel(row.status) }
      );
    }
  },
  {
    title: '申请说明',
    key: 'applyMessage',
    minWidth: 220,
    ellipsis: { tooltip: true }
  },
  {
    title: '拒绝原因',
    key: 'rejectReason',
    minWidth: 220,
    ellipsis: { tooltip: true }
  },
  {
    title: '通过时间',
    key: 'acceptedTime',
    width: 170
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
    render(row: PartnerRow) {
      const buttons: VNodeChild[] = [];

      if (row.status === 'PENDING' && row.direction === 'RECEIVED') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => handleAccept(row)
            },
            { default: () => '通过' }
          ),
          h(
            NButton,
            {
              size: 'small',
              type: 'error',
              onClick: () => openRejectModal(row)
            },
            { default: () => '拒绝' }
          )
        );
      } else if (row.status === 'PENDING' && row.direction === 'SENT') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'error',
              onClick: () => handleDelete(row, '撤回好友申请')
            },
            { default: () => '撤回' }
          )
        );
      } else if (row.status === 'ACCEPTED') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'error',
              onClick: () => handleDelete(row, '解除好友关系')
            },
            { default: () => '解除好友' }
          )
        );
      } else if (['REJECTED', 'BLOCKED', 'DELETED'].includes(row.status || '')) {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              onClick: () => handleDelete(row, '删除记录')
            },
            { default: () => '删除记录' }
          )
        );
      } else {
        buttons.push('-');
      }

      return h(NSpace, { size: 8 }, { default: () => buttons });
    }
  }
];

async function loadPartners() {
  partnerLoading.value = true;

  try {
    const res = await fetchCollabPartnerList();
    const list = unwrapData(res) || [];

    partnerRows.value = Array.isArray(list) ? list : [];
  } catch (error: any) {
    message.error(error?.message || '加载好友关系失败');
    partnerRows.value = [];
  } finally {
    partnerLoading.value = false;
  }
}

async function searchMerchants() {
  if (!searchForm.merchantName && !searchForm.serviceType) {
    message.warning('请至少输入一个搜索条件');
    return;
  }

  merchantLoading.value = true;

  try {
    const res = await searchCollabMerchants({
      merchantName: searchForm.merchantName.trim(),
      serviceType: searchForm.serviceType
    });

    const list = unwrapData(res) || [];
    merchantRows.value = Array.isArray(list) ? list : [];
  } catch (error: any) {
    message.error(error?.message || '搜索商家失败');
    merchantRows.value = [];
  } finally {
    merchantLoading.value = false;
  }
}

function resetMerchantSearch() {
  searchForm.merchantName = '';
  searchForm.serviceType = '';
  merchantRows.value = [];
}

function openApplyModal(row: MerchantRow) {
  selectedMerchant.value = row;
  applyForm.applyMessage = `你好，我们希望与${row.merchantName || row.tenantId || '贵商家'}建立好友协作关系。`;
  showApplyModal.value = true;
}

async function submitApply() {
  if (!selectedMerchant.value?.tenantId) {
    message.warning('请选择要申请的商家');
    return;
  }

  if (!canApplyMerchant(selectedMerchant.value.tenantId)) {
    message.warning('当前商家已有好友或待确认关系');
    return;
  }

  try {
    await applyCollabPartner({
      targetTenantId: selectedMerchant.value.tenantId,
      applyMessage: applyForm.applyMessage
    });

    message.success('好友申请已提交');
    showApplyModal.value = false;
    await loadPartners();
    await searchMerchants();
  } catch (error: any) {
    message.error(error?.message || '申请好友失败');
  }
}

function openRejectModal(row: PartnerRow) {
  rejectTarget.value = row;
  rejectForm.reason = '';
  showRejectModal.value = true;
}

async function submitReject() {
  if (!rejectTarget.value?.id) return;

  if (!rejectForm.reason) {
    message.warning('请输入拒绝原因');
    return;
  }

  try {
    await rejectCollabPartner(rejectTarget.value.id, {
      reason: rejectForm.reason
    });

    message.success('已拒绝好友申请');
    showRejectModal.value = false;
    rejectTarget.value = null;
    await loadPartners();
  } catch (error: any) {
    message.error(error?.message || '拒绝好友申请失败');
  }
}

function handleAccept(row: PartnerRow) {
  if (!row.id) return;

  dialog.warning({
    title: '通过好友申请',
    content: `确认通过 ${row.partnerTenantName || row.partnerTenantId || '该商家'} 的好友申请吗？`,
    positiveText: '通过',
    negativeText: '取消',
    onPositiveClick: async () => {
      await acceptCollabPartner(row.id!);
      message.success('已通过好友申请');
      await loadPartners();
    }
  });
}

function handleDelete(row: PartnerRow, label: string) {
  if (!row.id) return;

  dialog.warning({
    title: label,
    content: `确认执行“${label}”吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      await deleteCollabPartner(row.id!);
      message.success(`${label}成功`);
      await loadPartners();
    }
  });
}

onMounted(() => {
  loadPartners();
});
</script>

<template>
  <NSpace vertical :size="16">
    <NCard title="好友商家" :bordered="false">
      <NSpace justify="space-between" align="center">
        <div>
          <strong>好友协作关系管理</strong>
          <div style="margin-top: 6px; color: #888">
            先搜索商家并申请好友，双方通过后才能定向发协作单。
          </div>
        </div>

        <NButton :loading="partnerLoading" @click="loadPartners">
          刷新好友
        </NButton>
      </NSpace>
    </NCard>

    <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen">
      <NGi>
        <NCard :bordered="false">
          <NStatistic label="我的好友" :value="partnerCountSummary.accepted" />
        </NCard>
      </NGi>

      <NGi>
        <NCard :bordered="false">
          <NStatistic label="待我确认" :value="partnerCountSummary.pendingReceived" />
        </NCard>
      </NGi>

      <NGi>
        <NCard :bordered="false">
          <NStatistic label="我发出的申请" :value="partnerCountSummary.pendingSent" />
        </NCard>
      </NGi>

      <NGi>
        <NCard :bordered="false">
          <NStatistic label="历史关系" :value="partnerCountSummary.history" />
        </NCard>
      </NGi>
    </NGrid>

    <NCard title="搜索协作商家" :bordered="false">
      <NForm inline label-placement="left">
        <NFormItem label="商家全称">
          <NInput
            v-model:value="searchForm.merchantName"
            clearable
            placeholder="请输入商家全称"
            style="width: 260px;"
          />
        </NFormItem>

        <NFormItem label="服务类型">
          <NSelect
            v-model:value="searchForm.serviceType"
            :options="serviceTypeOptions"
            clearable
            style="width: 180px;"
          />
        </NFormItem>

        <NFormItem>
          <NSpace>
            <NButton type="primary" :loading="merchantLoading" @click="searchMerchants">
              搜索
            </NButton>
            <NButton @click="resetMerchantSearch">
              重置
            </NButton>
          </NSpace>
        </NFormItem>
      </NForm>

      <NDivider />

      <NDataTable
        size="small"
        :loading="merchantLoading"
        :columns="merchantColumns"
        :data="merchantRows"
        :pagination="false"
        :scroll-x="1200"
      />
    </NCard>

    <NCard title="我的好友关系" :bordered="false">
      <NTabs v-model:value="activeTab" type="line" animated>
        <NTabPane :tab="`我的好友 (${acceptedPartners.length})`" name="ACCEPTED">
          <NDataTable
            size="small"
            :loading="partnerLoading"
            :columns="partnerColumns"
            :data="acceptedPartners"
            :pagination="false"
            :scroll-x="1400"
          />
        </NTabPane>

        <NTabPane :tab="`待我确认 (${pendingReceivedPartners.length})`" name="PENDING_RECEIVED">
          <NDataTable
            size="small"
            :loading="partnerLoading"
            :columns="partnerColumns"
            :data="pendingReceivedPartners"
            :pagination="false"
            :scroll-x="1400"
          />
        </NTabPane>

        <NTabPane :tab="`我发出的申请 (${pendingSentPartners.length})`" name="PENDING_SENT">
          <NDataTable
            size="small"
            :loading="partnerLoading"
            :columns="partnerColumns"
            :data="pendingSentPartners"
            :pagination="false"
            :scroll-x="1400"
          />
        </NTabPane>

        <NTabPane :tab="`历史关系 (${historyPartners.length})`" name="HISTORY">
          <NDataTable
            size="small"
            :loading="partnerLoading"
            :columns="partnerColumns"
            :data="historyPartners"
            :pagination="false"
            :scroll-x="1400"
          />
        </NTabPane>
      </NTabs>
    </NCard>

    <NModal
      v-model:show="showApplyModal"
      preset="card"
      title="申请好友商家"
      style="width: 680px;"
    >
      <NForm label-placement="left" label-width="110">
        <NFormItem label="目标商家">
          <NInput :value="selectedMerchant?.merchantName || '-'" disabled />
        </NFormItem>

        <NFormItem label="联系人">
          <NInput :value="selectedMerchant?.contactName || '-'" disabled />
        </NFormItem>

        <NFormItem label="联系电话">
          <NInput :value="selectedMerchant?.contactPhone || '-'" disabled />
        </NFormItem>

        <NFormItem label="申请说明">
          <NTextareaInput
            v-model:value="applyForm.applyMessage"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="请输入申请好友说明"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showApplyModal = false">取消</NButton>
          <NButton type="primary" @click="submitApply">确认申请</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal
      v-model:show="showRejectModal"
      preset="card"
      title="拒绝好友申请"
      style="width: 620px;"
    >
      <NForm label-placement="left" label-width="110">
        <NFormItem label="对方商家">
          <NInput :value="rejectTarget?.partnerTenantName || rejectTarget?.partnerTenantId || '-'" disabled />
        </NFormItem>

        <NFormItem label="拒绝原因">
          <NTextareaInput
            v-model:value="rejectForm.reason"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="请输入拒绝原因"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showRejectModal = false">取消</NButton>
          <NButton type="error" @click="submitReject">确认拒绝</NButton>
        </NSpace>
      </template>
    </NModal>
  </NSpace>
</template>

<style scoped>
/* 保持轻量，主要靠 Naive UI 呈现 */
</style>
