<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import {
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInputNumber,
  NModal,
  NProgress,
  NSelect,
  NSpace,
  NStatistic,
  useMessage
} from 'naive-ui';
import {
  fetchResourceSummary,
  purchaseResource,
  recalcStorage,
  type ResourceSummaryVO
} from '@/service/api/biz/resource';

defineOptions({
  name: 'BizResource'
});

const message = useMessage();

const loading = ref(false);
const summary = ref<ResourceSummaryVO>({});

const showPurchaseModal = ref(false);

const purchaseForm = reactive({
  packageType: 'STORAGE',
  packageGb: 10,
  amount: 0,
  remark: ''
});

const packageOptions = [
  { label: '存储包', value: 'STORAGE' },
  { label: '流量包', value: 'TRAFFIC' }
];

async function loadSummary() {
  loading.value = true;
  try {
    const res = await fetchResourceSummary();
    summary.value = res.data || res;
  } finally {
    loading.value = false;
  }
}

function openPurchase(type: 'STORAGE' | 'TRAFFIC') {
  purchaseForm.packageType = type;
  purchaseForm.packageGb = 10;
  purchaseForm.amount = 0;
  purchaseForm.remark = '';
  showPurchaseModal.value = true;
}

async function submitPurchase() {
  await purchaseResource(purchaseForm);
  message.success('购买成功');
  showPurchaseModal.value = false;
  loadSummary();
}

async function handleRecalc() {
  await recalcStorage();
  message.success('已重新统计存储');
  loadSummary();
}

onMounted(loadSummary);
</script>

<template>
  <NSpace vertical :size="16">
    <NCard title="租户资源账户" :bordered="false">
      <NSpace vertical :size="20">
        <NSpace :size="24">
          <NStatistic label="存储额度 GB" :value="summary.storageQuotaGb || 0" />
          <NStatistic label="已用存储 GB" :value="summary.storageUsedGb || 0" />
          <NStatistic label="存储计费 GB" :value="summary.storageBillableGb || 0" />
          <NStatistic label="流量额度 GB" :value="summary.trafficQuotaGb || 0" />
          <NStatistic label="已用流量 GB" :value="summary.trafficUsedGb || 0" />
          <NStatistic label="流量计费 GB" :value="summary.trafficBillableGb || 0" />
        </NSpace>

        <div>
          <div style="margin-bottom: 8px">存储使用率</div>
          <NProgress
            type="line"
            :percentage="Number(summary.storageUsePercent || 0)"
            :indicator-placement="'inside'"
          />
        </div>

        <div>
          <div style="margin-bottom: 8px">本月流量使用率：{{ summary.trafficMonth }}</div>
          <NProgress
            type="line"
            :percentage="Number(summary.trafficUsePercent || 0)"
            :indicator-placement="'inside'"
          />
        </div>

        <NSpace>
          <NButton type="primary" @click="openPurchase('STORAGE')">购买存储包</NButton>
          <NButton type="primary" @click="openPurchase('TRAFFIC')">购买流量包</NButton>
          <NButton @click="handleRecalc">重新统计存储</NButton>
          <NButton @click="loadSummary">刷新</NButton>
        </NSpace>
      </NSpace>
    </NCard>

    <NModal v-model:show="showPurchaseModal" preset="card" title="购买资源包" style="width: 520px">
      <NForm label-placement="left" label-width="100">
        <NFormItem label="套餐类型">
          <NSelect v-model:value="purchaseForm.packageType" :options="packageOptions" />
        </NFormItem>

        <NFormItem label="购买 GB">
          <NInputNumber v-model:value="purchaseForm.packageGb" :min="1" style="width: 180px" />
        </NFormItem>

        <NFormItem label="金额">
          <NInputNumber v-model:value="purchaseForm.amount" :min="0" style="width: 180px" />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showPurchaseModal = false">取消</NButton>
          <NButton type="primary" @click="submitPurchase">确认购买</NButton>
        </NSpace>
      </template>
    </NModal>
  </NSpace>
</template>
