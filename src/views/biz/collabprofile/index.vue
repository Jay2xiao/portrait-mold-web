<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
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
  NInputNumber,
  NModal,
  NSelect,
  NSpace,
  NSwitch,
  NTag,
  useDialog,
  useMessage
} from 'naive-ui';

import {
  deletePaymentQr,
  fetchMyCollabCapabilities,
  fetchMyCollabProfile,
  fetchMyPaymentQrList,
  saveMyCollabCapabilities,
  saveMyCollabProfile,
  savePaymentQr
} from '@/service/api/biz/collab';
import BizFileUpload from "@/views/biz/components/BizFileUpload.vue";

defineOptions({
  name: 'BizCollabMerchantProfile'
});

interface MerchantProfileForm {
  tenantId: string;
  tenantNameSnapshot: string;
  merchantName: string;
  contactName: string;
  contactPhone: string;
  merchantType: string;
  serviceDesc: string;
  publicVisible: boolean;
  enabled: boolean;
  remark: string;
}

interface CapabilityFormItem {
  serviceType: string;
  label: string;
  enabled: boolean;
  supportRawPhotoProcess: boolean;
  supportAiModelFile: boolean;
  supportDelivery: boolean;
  capacityPerDay: number | null;
  capabilityDesc: string;
  remark: string;
}

interface PaymentQrForm {
  id?: string | number;
  payeeName: string;
  paymentChannel: string;
  qrUrl: string;
  accountDesc: string;
  enabled: boolean;
  sortOrder: number | null;
  remark: string;
}

interface PaymentQrRow {
  id?: string | number;
  payeeName?: string;
  paymentChannel?: string;
  qrUrl?: string;
  accountDesc?: string;
  enabled?: boolean | string | number;
  sortOrder?: number;
  remark?: string;
  createTime?: string;
  qrFileId?: string | number;

}

const message = useMessage();
const dialog = useDialog();

const loadingProfile = ref(false);
const savingProfile = ref(false);

const loadingCapabilities = ref(false);
const savingCapabilities = ref(false);

const loadingQrList = ref(false);
const savingQr = ref(false);

const qrRows = ref<PaymentQrRow[]>([]);
const showQrModal = ref(false);
const qrFileIds = ref<Array<string | number>>([]);


const merchantTypeOptions = [
  { label: '获客商家', value: 'LEAD_GEN' },
  { label: '修模商家', value: 'REPAIR' },
  { label: '打印商家', value: 'PRINT' },
  { label: '修模+打印', value: 'REPAIR_PRINT' },
  { label: '综合商家', value: 'GENERAL' }
];

const paymentChannelOptions = [
  { label: '微信', value: 'WECHAT' },
  { label: '支付宝', value: 'ALIPAY' },
  { label: '银行卡', value: 'BANK' },
  { label: '其他', value: 'OTHER' }
];

const serviceTypeMeta = [
  {
    serviceType: 'REPAIR_ONLY',
    label: '只修模',
    desc: '只承接修模外协，可处理原始照片转高清图。'
  },
  {
    serviceType: 'PRINT_ONLY',
    label: '只打印',
    desc: '只承接打印外协，适用于已具备模型文件的订单。'
  },
  {
    serviceType: 'REPAIR_PRINT',
    label: '修模 + 打印',
    desc: '同时承接修模和打印，适用于一体化外协。'
  }
];

const profileForm = reactive<MerchantProfileForm>({
  tenantId: '',
  tenantNameSnapshot: '',
  merchantName: '',
  contactName: '',
  contactPhone: '',
  merchantType: 'GENERAL',
  serviceDesc: '',
  publicVisible: true,
  enabled: true,
  remark: ''
});

const capabilityRows = ref<CapabilityFormItem[]>([]);

const qrForm = reactive({
  id: undefined as string | number | undefined,
  payeeName: '',
  paymentChannel: 'WECHAT',
  qrFileId: undefined as string | number | undefined,
  qrUrl: '',
  accountDesc: '',
  enabled: true,
  sortOrder: 0,
  remark: ''
});


function unwrapData(res: any) {
  return res?.data || res;
}

function toBool(value: any, defaultValue = false) {
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return true;
  }

  if (value === false || value === 0 || value === '0' || value === 'false') {
    return false;
  }

  return defaultValue;
}

function toFlag(value: boolean) {
  return value ? '1' : '0';
}

function merchantTypeLabel(value?: string) {
  return merchantTypeOptions.find(item => item.value === value)?.label || value || '-';
}

function paymentChannelLabel(value?: string) {
  return paymentChannelOptions.find(item => item.value === value)?.label || value || '-';
}

function serviceTypeLabel(value?: string) {
  return serviceTypeMeta.find(item => item.serviceType === value)?.label || value || '-';
}

function flagTagType(value: boolean) {
  return value ? 'success' : 'warning';
}

function flagLabel(value: boolean) {
  return value ? '是' : '否';
}

function buildDefaultCapabilityRows() {
  return serviceTypeMeta.map(meta => ({
    serviceType: meta.serviceType,
    label: meta.label,
    enabled: false,
    supportRawPhotoProcess: false,
    supportAiModelFile: false,
    supportDelivery: true,
    capacityPerDay: null,
    capabilityDesc: meta.desc,
    remark: ''
  }));
}

function normalizeCapabilityRows(list: any[]) {
  const map = new Map<string, any>();

  list.forEach(item => {
    if (item?.serviceType) {
      map.set(item.serviceType, item);
    }
  });

  capabilityRows.value = serviceTypeMeta.map(meta => {
    const source = map.get(meta.serviceType) || {};

    return {
      serviceType: meta.serviceType,
      label: meta.label,
      enabled: toBool(source.enabled, false),
      supportRawPhotoProcess: toBool(source.supportRawPhotoProcess, false),
      supportAiModelFile: toBool(source.supportAiModelFile, false),
      supportDelivery: toBool(source.supportDelivery, true),
      capacityPerDay: source.capacityPerDay ?? null,
      capabilityDesc: source.capabilityDesc || meta.desc,
      remark: source.remark || ''
    };
  });
}

async function loadProfile() {
  loadingProfile.value = true;

  try {
    const res = await fetchMyCollabProfile();
    const data = unwrapData(res) || {};

    profileForm.tenantId = data.tenantId || '';
    profileForm.tenantNameSnapshot = data.tenantNameSnapshot || data.merchantName || data.tenantId || '';
    profileForm.merchantName = data.merchantName || '';
    profileForm.contactName = data.contactName || '';
    profileForm.contactPhone = data.contactPhone || '';
    profileForm.merchantType = data.merchantType || 'GENERAL';
    profileForm.serviceDesc = data.serviceDesc || '';
    profileForm.publicVisible = toBool(data.publicVisible, true);
    profileForm.enabled = toBool(data.enabled, true);
    profileForm.remark = data.remark || '';
  } catch (error: any) {
    message.error(error?.message || '加载商家档案失败');
  } finally {
    loadingProfile.value = false;
  }
}

async function loadCapabilities() {
  loadingCapabilities.value = true;

  try {
    const res = await fetchMyCollabCapabilities();
    const list = unwrapData(res) || [];

    if (!Array.isArray(list) || list.length === 0) {
      capabilityRows.value = buildDefaultCapabilityRows();
      return;
    }

    normalizeCapabilityRows(list);
  } catch (error: any) {
    message.error(error?.message || '加载服务能力失败');
    capabilityRows.value = buildDefaultCapabilityRows();
  } finally {
    loadingCapabilities.value = false;
  }
}

async function loadQrList() {
  loadingQrList.value = true;

  try {
    const res = await fetchMyPaymentQrList();
    const list = unwrapData(res) || [];

    qrRows.value = Array.isArray(list)
      ? list.map((item: any) => ({
        ...item,
        enabled: toBool(item.enabled, true)
      }))
      : [];
  } catch (error: any) {
    message.error(error?.message || '加载收款码失败');
    qrRows.value = [];
  } finally {
    loadingQrList.value = false;
  }
}

async function saveProfile() {
  if (!profileForm.merchantName) {
    message.warning('请先填写商家名称');
    return;
  }

  savingProfile.value = true;

  try {
    await saveMyCollabProfile({
      merchantName: profileForm.merchantName,
      contactName: profileForm.contactName,
      contactPhone: profileForm.contactPhone,
      merchantType: profileForm.merchantType,
      serviceDesc: profileForm.serviceDesc,
      publicVisible: toFlag(profileForm.publicVisible),
      enabled: toFlag(profileForm.enabled),
      remark: profileForm.remark
    });

    message.success('商家服务档案保存成功');
    await loadProfile();
  } catch (error: any) {
    message.error(error?.message || '保存商家档案失败');
  } finally {
    savingProfile.value = false;
  }
}

async function saveCapabilities() {
  savingCapabilities.value = true;

  try {
    await saveMyCollabCapabilities({
      items: capabilityRows.value.map(item => ({
        serviceType: item.serviceType,
        enabled: toFlag(item.enabled),
        supportRawPhotoProcess: toFlag(item.supportRawPhotoProcess),
        supportAiModelFile: toFlag(item.supportAiModelFile),
        supportDelivery: toFlag(item.supportDelivery),
        capacityPerDay: item.capacityPerDay,
        capabilityDesc: item.capabilityDesc,
        remark: item.remark
      }))
    });

    message.success('服务能力保存成功');
    await loadCapabilities();
  } catch (error: any) {
    message.error(error?.message || '保存服务能力失败');
  } finally {
    savingCapabilities.value = false;
  }
}


function openAddQr() {
  qrForm.id = undefined;
  qrForm.payeeName = profileForm.merchantName || profileForm.tenantNameSnapshot || '';
  qrForm.paymentChannel = 'WECHAT';
  qrForm.qrFileId = undefined;
  qrForm.qrUrl = '';
  qrForm.accountDesc = '';
  qrForm.enabled = true;
  qrForm.sortOrder = 0;
  qrForm.remark = '';

  qrFileIds.value = [];

  showQrModal.value = true;
}


function openEditQr(row: PaymentQrRow) {
  qrForm.id = row.id;
  qrForm.payeeName = row.payeeName || profileForm.merchantName || profileForm.tenantNameSnapshot || '';
  qrForm.paymentChannel = row.paymentChannel || 'WECHAT';
  qrForm.qrFileId = row.qrFileId;
  qrForm.qrUrl = row.qrUrl || '';
  qrForm.accountDesc = row.accountDesc || '';
  qrForm.enabled = toBool(row.enabled, true);
  qrForm.sortOrder = row.sortOrder ?? 0;
  qrForm.remark = row.remark || '';

  qrFileIds.value = row.qrFileId ? [row.qrFileId] : [];

  showQrModal.value = true;
}

async function submitQr() {
  if (!qrForm.payeeName) {
    message.warning('请填写收款主体');
    return;
  }

  if (!qrFileIds.value.length && !qrForm.accountDesc) {
    message.warning('请上传收款码图片或填写账户说明');
    return;
  }

  savingQr.value = true;

  try {
    await savePaymentQr({
      id: qrForm.id,
      payeeName: qrForm.payeeName,
      paymentChannel: qrForm.paymentChannel,
      qrFileId: qrFileIds.value[0] || undefined,
      qrUrl: qrForm.qrUrl,
      accountDesc: qrForm.accountDesc,
      enabled: toFlag(qrForm.enabled),
      sortOrder: qrForm.sortOrder,
      remark: qrForm.remark
    });

    message.success('收款码保存成功');
    showQrModal.value = false;
    await loadQrList();
  } catch (error: any) {
    message.error(error?.message || '保存收款码失败');
  } finally {
    savingQr.value = false;
  }
}


function confirmDeleteQr(row: PaymentQrRow) {
  if (!row.id) return;

  dialog.warning({
    title: '删除收款码',
    content: `确认删除收款码：${row.payeeName || row.paymentChannel || row.id}？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await deletePaymentQr(row.id!);
      message.success('收款码已删除');
      await loadQrList();
    }
  });
}

function openQrUrl(url?: string) {
  if (!url) {
    message.warning('暂无收款码地址');
    return;
  }

  window.open(url, '_blank');
}

const qrColumns = [
  {
    title: '收款主体',
    key: 'payeeName',
    width: 160
  },
  {
    title: '渠道',
    key: 'paymentChannel',
    width: 100,
    render(row: PaymentQrRow) {
      return paymentChannelLabel(row.paymentChannel);
    }
  },
  {
    title: '收款码地址',
    key: 'qrUrl',
    width: 220,
    ellipsis: {
      tooltip: true
    },
    render(row: PaymentQrRow) {
      if (!row.qrUrl) return '-';

      return h(
        NButton,
        {
          text: true,
          type: 'primary',
          onClick: () => openQrUrl(row.qrUrl)
        },
        { default: () => '查看二维码' }
      );
    }
  },
  {
    title: '账户说明',
    key: 'accountDesc',
    width: 220,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '启用',
    key: 'enabled',
    width: 90,
    render(row: PaymentQrRow) {
      const enabled = toBool(row.enabled, true);

      return h(
        NTag,
        { type: flagTagType(enabled) as any },
        { default: () => flagLabel(enabled) }
      );
    }
  },
  {
    title: '排序',
    key: 'sortOrder',
    width: 80
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render(row: PaymentQrRow) {
      return h(
        NSpace,
        { size: 8 },
        {
          default: () => [
            h(
              NButton,
              {
                size: 'small',
                onClick: () => openEditQr(row)
              },
              { default: () => '编辑' }
            ),
            h(
              NButton,
              {
                size: 'small',
                type: 'error',
                onClick: () => confirmDeleteQr(row)
              },
              { default: () => '删除' }
            )
          ]
        }
      );
    }
  }
];

onMounted(() => {
  loadProfile();
  loadCapabilities();
  loadQrList();
});
</script>

<template>
  <NSpace vertical :size="16">
    <NCard title="商家服务档案" :bordered="false">
      <NSpace justify="space-between" align="center">
        <div>
          <strong>协作基础资料</strong>
          <div style="margin-top: 6px; color: #888">
            这里配置商家档案、服务能力和收款码，好友商家发单时会优先读取这些信息。
          </div>
        </div>

        <NSpace>
          <NButton :loading="loadingProfile || loadingCapabilities || loadingQrList" @click="loadProfile">
            刷新档案
          </NButton>
          <NButton type="primary" :loading="savingProfile" @click="saveProfile">
            保存档案
          </NButton>
        </NSpace>
      </NSpace>
    </NCard>

    <NCard title="商家基础信息" :bordered="false">
      <NForm label-placement="left" label-width="110">
        <NGrid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
          <NGi>
            <NFormItem label="租户ID">
              <NInput :value="profileForm.tenantId || '-'" disabled />
            </NFormItem>
          </NGi>

          <NGi>
            <NFormItem label="租户名称">
              <NInput :value="profileForm.tenantNameSnapshot || '-'" disabled />
            </NFormItem>
          </NGi>

          <NGi>
            <NFormItem label="商家名称" required>
              <NInput v-model:value="profileForm.merchantName" placeholder="请输入商家名称" />
            </NFormItem>
          </NGi>

          <NGi>
            <NFormItem label="商家类型">
              <NSelect v-model:value="profileForm.merchantType" :options="merchantTypeOptions" />
            </NFormItem>
          </NGi>

          <NGi>
            <NFormItem label="联系人">
              <NInput v-model:value="profileForm.contactName" placeholder="请输入联系人" />
            </NFormItem>
          </NGi>

          <NGi>
            <NFormItem label="联系电话">
              <NInput v-model:value="profileForm.contactPhone" placeholder="请输入联系电话" />
            </NFormItem>
          </NGi>

          <NGi :span="2">
            <NFormItem label="服务说明">
              <NInput
                v-model:value="profileForm.serviceDesc"
                type="textarea"
                :autosize="{ minRows: 3, maxRows: 6 }"
                placeholder="请输入商家服务说明"
              />
            </NFormItem>
          </NGi>

          <NGi>
            <NFormItem label="允许被搜索">
              <NSwitch v-model:value="profileForm.publicVisible" />
            </NFormItem>
          </NGi>

          <NGi>
            <NFormItem label="启用协作能力">
              <NSwitch v-model:value="profileForm.enabled" />
            </NFormItem>
          </NGi>

          <NGi :span="2">
            <NFormItem label="备注">
              <NInput
                v-model:value="profileForm.remark"
                type="textarea"
                :autosize="{ minRows: 2, maxRows: 4 }"
                placeholder="备注"
              />
            </NFormItem>
          </NGi>
        </NGrid>
      </NForm>
    </NCard>

    <NDivider />

    <NCard title="服务能力配置" :bordered="false">
      <NSpace justify="space-between" align="center" style="margin-bottom: 12px;">
        <div style="color: #888">
          请选择当前租户可承接的服务类型。后续好友定向发单时会根据这里判断是否可接。
        </div>

        <NButton type="primary" :loading="savingCapabilities" @click="saveCapabilities">
          保存服务能力
        </NButton>
      </NSpace>

      <NGrid :cols="3" :x-gap="16" :y-gap="16" responsive="screen">
        <NGi v-for="item in capabilityRows" :key="item.serviceType">
          <NCard size="small" hoverable>
            <NSpace vertical :size="10">
              <NSpace justify="space-between" align="center">
                <div>
                  <strong>{{ item.label }}</strong>
                  <div style="margin-top: 4px; color: #888; font-size: 12px;">
                    {{ serviceTypeLabel(item.serviceType) }}
                  </div>
                </div>

                <NTag :type="flagTagType(item.enabled) as any">
                  {{ flagLabel(item.enabled) }}
                </NTag>
              </NSpace>

              <div style="color: #888; font-size: 13px; min-height: 36px;">
                {{ item.capabilityDesc }}
              </div>

              <NSpace align="center">
                <span style="width: 110px;">启用</span>
                <NSwitch v-model:value="item.enabled" />
              </NSpace>

              <NSpace align="center">
                <span style="width: 110px;">原始图处理</span>
                <NSwitch v-model:value="item.supportRawPhotoProcess" />
              </NSpace>

              <NSpace align="center">
                <span style="width: 110px;">AI模型文件</span>
                <NSwitch v-model:value="item.supportAiModelFile" />
              </NSpace>

              <NSpace align="center">
                <span style="width: 110px;">支持发货</span>
                <NSwitch v-model:value="item.supportDelivery" />
              </NSpace>

              <NForm label-placement="left" label-width="110">
                <NFormItem label="每日产能">
                  <NInputNumber
                    v-model:value="item.capacityPerDay"
                    :min="0"
                    style="width: 100%;"
                    placeholder="请输入每日产能"
                  />
                </NFormItem>

                <NFormItem label="说明">
                  <NInput
                    v-model:value="item.remark"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 4 }"
                    placeholder="补充说明"
                  />
                </NFormItem>
              </NForm>
            </NSpace>
          </NCard>
        </NGi>
      </NGrid>
    </NCard>

    <NDivider />

    <NCard title="收款码管理" :bordered="false">
      <NSpace justify="space-between" align="center" style="margin-bottom: 12px;">
        <div style="color: #888">
          好友协作完成后，发单方线下支付会用到这里维护的收款码。
        </div>

        <NSpace>
          <NButton :loading="loadingQrList" @click="loadQrList">
            刷新收款码
          </NButton>
          <NButton type="primary" @click="openAddQr">
            新增收款码
          </NButton>
        </NSpace>
      </NSpace>

      <NDataTable
        size="small"
        :loading="loadingQrList"
        :columns="qrColumns"
        :data="qrRows"
        :pagination="false"
        :scroll-x="1000"
      />
    </NCard>

    <NModal
      v-model:show="showQrModal"
      preset="card"
      style="width: 720px"
      :title="qrForm.id ? '编辑收款码' : '新增收款码'"
    >
      <NForm label-placement="left" label-width="110">
        <NFormItem label="收款主体" required>
          <NInput v-model:value="qrForm.payeeName" placeholder="请输入收款主体" />
        </NFormItem>

        <NFormItem label="收款渠道" required>
          <NSelect v-model:value="qrForm.paymentChannel" :options="paymentChannelOptions" />
        </NFormItem>

        <NFormItem label="收款码图片" required>
          <NSpace vertical>
            <BizFileUpload
              v-model="qrFileIds"
              biz-type="TEMP"
              file-stage="COLLAB_PAYMENT_QR"
              file-type="PAYMENT_QR"
              :max="1"
            />

            <BizFileViewer
              v-if="qrFileIds.length > 0"
              :file-ids="qrFileIds"
              mode="image"
              :max="1"
              :thumb-size="160"
              show-name
            />
          </NSpace>
        </NFormItem>


        <NFormItem label="账户说明">
          <NInput
            v-model:value="qrForm.accountDesc"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="比如：微信收款码 / 支付宝收款码 / 银行卡信息"
          />
        </NFormItem>

        <NFormItem label="启用">
          <NSwitch v-model:value="qrForm.enabled" />
        </NFormItem>

        <NFormItem label="排序">
          <NInputNumber v-model:value="qrForm.sortOrder" :min="0" style="width: 180px;" />
        </NFormItem>

        <NFormItem label="备注">
          <NInput
            v-model:value="qrForm.remark"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="备注"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showQrModal = false">取消</NButton>
          <NButton type="primary" :loading="savingQr" @click="submitQr">
            保存
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </NSpace>
</template>

<style scoped>
/* 这里保持轻量，主要靠 Naive UI 组件呈现 */
</style>
