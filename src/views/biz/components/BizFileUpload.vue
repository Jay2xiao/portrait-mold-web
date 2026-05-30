<script setup lang="ts">
import { ref } from 'vue';
import { NButton, NUpload, useMessage } from 'naive-ui';
import type { UploadCustomRequestOptions } from 'naive-ui';

import * as qiniu from 'qiniu-js';
import {
  QINIU_COMPLETE_REQUEST_TIMEOUT,
  completeQiniuUpload,
  fetchQiniuUploadToken,
  fetchUploadConfig,
  uploadLocalFile
} from '@/service/api/biz/file';


defineOptions({
  name: 'BizFileUpload'
});

const props = withDefaults(
  defineProps<{
    modelValue?: Array<string | number>;
    bizType?: string;
    accept?: string;
    bizId?: string | number;
    orderId?: string | number;
    taskId?: string | number;
    fileStage: string;
    fileType: string;
    max?: number;
  }>(),
  {
    modelValue: () => [],
    bizType: 'TEMP',
    max: 10
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: Array<string | number>): void;
  (e: 'change', value: Array<string | number>): void;
  (e: 'success', value?: any): void;
  (e: 'uploaded', value?: any): void;
}>();


const message = useMessage();
const QINIU_COMPLETE_TIMEOUT = QINIU_COMPLETE_REQUEST_TIMEOUT;
const QINIU_RESUMABLE_CHUNK_SIZE_MB = 4;
const QINIU_CONCURRENT_REQUEST_LIMIT = 4;
const QINIU_UPLOAD_STALL_TIMEOUT_MS = 30 * 1000;
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;
const uploadStatusText = ref('');

function isMicrosoftEdgeBrowser() {
  return /Edg\//.test(window.navigator.userAgent);
}

function resolveQiniuUploadHost(uploadUrl?: string): { uphost: string | string[]; upprotocol: 'http' | 'https' } {
  const fallbackUrl = 'https://upload-z2.qiniup.com';
  const candidate = uploadUrl || fallbackUrl;
  const normalized = candidate.includes('://') ? candidate : `https://${candidate}`;

  try {
    const parsed = new URL(normalized);
    const host = parsed.host;

    return {
      uphost: resolveQiniuUploadHosts(host),
      upprotocol: parsed.protocol === 'http:' ? 'http' : 'https'
    };
  } catch {
    return {
      uphost: resolveQiniuUploadHosts('upload-z2.qiniup.com'),
      upprotocol: 'https'
    };
  }
}

function resolveQiniuUploadHosts(host: string) {
  if (host === 'upload-z2.qiniup.com') {
    return 'up-z2.qiniup.com';
  }

  return host;
}

function shouldUseDirectQiniuUpload(rawFile: File) {
  if (isMicrosoftEdgeBrowser()) {
    return false;
  }

  return rawFile.type.startsWith('image/') || /\.(jpe?g|png|gif|bmp|webp)$/i.test(rawFile.name);
}

function resetUploadStatus(delay = 1200) {
  window.setTimeout(() => {
    uploadStatusText.value = '';
  }, delay);
}

function formatUploadSpeed(bytesPerSecond: number) {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) {
    return '';
  }
  if (bytesPerSecond >= BYTES_PER_MB) {
    return `${(bytesPerSecond / BYTES_PER_MB).toFixed(1)} MB/s`;
  }
  return `${Math.max(1, bytesPerSecond / BYTES_PER_KB).toFixed(0)} KB/s`;
}

function createUploadSpeedTracker() {
  let lastLoaded = 0;
  let lastTime = Date.now();

  return (loaded: number) => {
    const now = Date.now();
    const elapsedSeconds = (now - lastTime) / 1000;
    const deltaBytes = loaded - lastLoaded;

    if (elapsedSeconds < 0.2 || deltaBytes <= 0) {
      return '';
    }

    lastLoaded = loaded;
    lastTime = now;
    return formatUploadSpeed(deltaBytes / elapsedSeconds);
  };
}

function createQiniuUploadStallError() {
  return new Error('上传连接超时，请重试');
}

async function customRequest(options: UploadCustomRequestOptions) {
  const rawFile = options.file.file as File | null;

  if (!rawFile) {
    message.error('文件不存在');
    options.onError();
    return;
  }

  try {
    let storageType = 'LOCAL';
    uploadStatusText.value = '准备上传...';

    try {
      const configRes = await fetchUploadConfig();
      const config = configRes.data || configRes;
      storageType = String(config?.storageType || 'LOCAL').toUpperCase();
    } catch (err) {
      message.warning('读取上传配置失败，已切换为本地上传');
    }

    if (storageType === 'QINIU') {
      await uploadToQiniu(rawFile, options);
    } else {
      await uploadToLocal(rawFile, options);
    }
  } catch (e: any) {
    uploadStatusText.value = '上传失败';
    message.error(e?.message || '上传失败');
    options.onError();
    resetUploadStatus(3000);
  }
}

async function uploadToQiniu(rawFile: File, options: UploadCustomRequestOptions) {
  const tokenRes = await fetchQiniuUploadToken({
    originalName: rawFile.name,
    sizeBytes: rawFile.size,
    contentType: rawFile.type,
    bizType: props.bizType || 'TEMP',
    bizId: props.bizId,
    orderId: props.orderId,
    taskId: props.taskId,
    fileStage: props.fileStage,
    fileType: props.fileType
  });

  const tokenData = tokenRes.data || tokenRes;

  const uploadHost = resolveQiniuUploadHost(tokenData.uploadUrl);
  const config = {
    useCdnDomain: false,
    uphost: uploadHost.uphost,
    upprotocol: uploadHost.upprotocol,
    retryCount: 5,
    checkByServer: false,
    forceDirect: shouldUseDirectQiniuUpload(rawFile),
    chunkSize: QINIU_RESUMABLE_CHUNK_SIZE_MB,
    concurrentRequestLimit: QINIU_CONCURRENT_REQUEST_LIMIT
  };

  const observable = qiniu.upload(
    rawFile,
    tokenData.objectKey,
    tokenData.uploadToken,
    {
      fname: rawFile.name,
      mimeType: rawFile.type || undefined
    },
    config
  );

  const trackUploadSpeed = createUploadSpeedTracker();

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let stallTimer: number | undefined;
    let subscription: { unsubscribe?: () => void } | undefined;

    const clearStallTimer = () => {
      if (stallTimer !== undefined) {
        window.clearTimeout(stallTimer);
        stallTimer = undefined;
      }
    };

    const rejectOnce = (err: any) => {
      if (settled) {
        return;
      }
      settled = true;
      clearStallTimer();
      subscription?.unsubscribe?.();
      reject(err);
    };

    const resolveOnce = () => {
      if (settled) {
        return;
      }
      settled = true;
      clearStallTimer();
      resolve();
    };

    const resetStallTimer = () => {
      clearStallTimer();
      stallTimer = window.setTimeout(() => {
        rejectOnce(createQiniuUploadStallError());
      }, QINIU_UPLOAD_STALL_TIMEOUT_MS);
    };

    resetStallTimer();

    subscription = observable.subscribe({
      next(res: any) {
        resetStallTimer();
        const total = res.total || {};
        const percent = Number(total.percent || 0);
        const speedText = trackUploadSpeed(Number(total.loaded || 0));
        uploadStatusText.value = `上传中 ${percent.toFixed(0)}%${speedText ? ` · ${speedText}` : ''}`;
        options.onProgress({ percent });
      },
      error(err: any) {
        rejectOnce(err);
      },
      complete: async (res: any) => {
        clearStallTimer();
        try {
          uploadStatusText.value = '文件已上传，正在登记...';
          const completeRes = await completeQiniuUpload(
            {
              originalName: rawFile.name,
              sizeBytes: rawFile.size,
              contentType: rawFile.type,
              objectKey: tokenData.objectKey,
              hash: res.hash,
              bizType: props.bizType || 'TEMP',
              bizId: props.bizId,
              orderId: props.orderId,
              taskId: props.taskId,
              fileStage: props.fileStage,
              fileType: props.fileType
            },
            { timeout: QINIU_COMPLETE_TIMEOUT }
          );

          const data = completeRes.data || completeRes;
          const fileId = data.id || data.fileId;

          const nextValue = [...props.modelValue, fileId];
          emit('update:modelValue', nextValue);
          emit('uploaded', data);

          uploadStatusText.value = '上传完成';
          message.success('上传成功');
          options.onFinish();
          resetUploadStatus();
          resolveOnce();
        } catch (e) {
          rejectOnce(e);
        }
      }
    });
  });
}
async function uploadToLocal(rawFile: File, options: UploadCustomRequestOptions) {
  uploadStatusText.value = '上传中...';
  const formData = new FormData();
  formData.append('file', rawFile);
  formData.append('bizType', props.bizType || 'TEMP');
  formData.append('fileStage', props.fileStage);
  formData.append('fileType', props.fileType);

  if (props.bizId) formData.append('bizId', String(props.bizId));
  if (props.orderId) formData.append('orderId', String(props.orderId));
  if (props.taskId) formData.append('taskId', String(props.taskId));

  const res = await uploadLocalFile(formData);
  const data = res.data || res;

  const fileId = data.id || data.fileId;
  const nextValue = [...props.modelValue, fileId];

  emit('update:modelValue', nextValue);
  emit('uploaded', data);

  uploadStatusText.value = '上传完成';
  message.success('上传成功');
  options.onFinish();
  resetUploadStatus();
}

</script>

<template>
  <NUpload
    multiple
    :max="max"
    :accept="accept"
    :custom-request="customRequest"
  >
    <NButton>上传文件</NButton>
  </NUpload>
  <div v-if="uploadStatusText" class="mt-8px text-12px text-#666">
    {{ uploadStatusText }}
  </div>
</template>
