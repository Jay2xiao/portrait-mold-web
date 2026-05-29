<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NButton, NModal, NQrCode, NSpace, NSpin, NTag } from 'naive-ui';
import {
  fetchCreateUserWechatBindQr,
  fetchGetUserWechatBindStatus,
  fetchUnbindUserWechat
} from '@/service/api/system';

defineOptions({
  name: 'UserWechatBindModal'
});

const visible = defineModel<boolean>('visible', { required: true });

const props = defineProps<{
  rowData?: Api.System.User | null;
}>();

const loading = ref(false);
const status = ref<Api.System.UserWechatBindStatus | null>(null);
const qr = ref<Api.System.UserWechatBindQr | null>(null);

const userId = computed(() => props.rowData?.userId);
const title = computed(() => `绑定微信 - ${props.rowData?.nickName || props.rowData?.userName || ''}`);

async function loadStatus() {
  if (!userId.value) return;
  loading.value = true;
  const { data, error } = await fetchGetUserWechatBindStatus(userId.value);
  if (!error) {
    status.value = data;
  }
  loading.value = false;
}

async function createQr() {
  if (!userId.value) return;
  loading.value = true;
  const { data, error } = await fetchCreateUserWechatBindQr(userId.value);
  if (!error) {
    qr.value = data;
  }
  loading.value = false;
}

async function unbind() {
  if (!userId.value) return;
  const { error } = await fetchUnbindUserWechat(userId.value);
  if (!error) {
    window.$message?.success('已解绑微信');
    qr.value = null;
    await loadStatus();
  }
}

async function refresh() {
  await loadStatus();
}

watch(
  visible,
  async val => {
    if (val) {
      qr.value = null;
      await loadStatus();
    }
  },
  { immediate: false }
);
</script>

<template>
  <NModal v-model:show="visible" preset="card" :title="title" style="width: 520px">
    <NSpin :show="loading">
      <div class="flex-col gap-16px">
        <div class="flex items-center justify-between">
          <span class="text-14px text-gray-500">绑定状态</span>
          <NTag :type="status?.bound ? 'success' : 'warning'">
            {{ status?.bound ? '已绑定' : '未绑定' }}
          </NTag>
        </div>

        <div v-if="status?.bound" class="rounded-6px bg-gray-50 p-12px text-14px">
          <div>openid：{{ status.openIdMasked || '-' }}</div>
          <div class="mt-6px">绑定时间：{{ status.bindTime || '-' }}</div>
        </div>

        <div v-if="qr?.bindUrl" class="flex-col items-center gap-12px">
          <NQrCode :value="qr.bindUrl" :size="220" />
          <div class="break-all text-center text-12px text-gray-500">{{ qr.bindUrl }}</div>
          <div class="text-12px text-gray-400">二维码有效期 {{ qr.expireSeconds }} 秒</div>
        </div>

        <NSpace justify="end">
          <NButton @click="refresh">刷新状态</NButton>
          <NButton v-if="status?.bound" type="warning" @click="unbind">解绑</NButton>
          <NButton type="primary" @click="createQr">生成二维码</NButton>
        </NSpace>
      </div>
    </NSpin>
  </NModal>
</template>
