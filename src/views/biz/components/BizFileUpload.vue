<script setup lang="ts">
import { NButton, NUpload, useMessage } from 'naive-ui';
import type { UploadCustomRequestOptions } from 'naive-ui';

import * as qiniu from 'qiniu-js';
import {
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
const QINIU_COMPLETE_TIMEOUT = 120 * 1000;

function resolveQiniuUploadHost(uploadUrl?: string): { uphost: string; upprotocol: 'http' | 'https' } {
  const fallbackUrl = 'https://upload-z2.qiniup.com';
  const candidate = uploadUrl || fallbackUrl;
  const normalized = candidate.includes('://') ? candidate : `https://${candidate}`;

  try {
    const parsed = new URL(normalized);

    return {
      uphost: parsed.host,
      upprotocol: parsed.protocol === 'http:' ? 'http' : 'https'
    };
  } catch {
    return {
      uphost: 'upload-z2.qiniup.com',
      upprotocol: 'https'
    };
  }
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

    try {
      const configRes = await fetchUploadConfig();
      const config = configRes.data || configRes;
      storageType = String(config?.storageType || 'LOCAL').toUpperCase();
    } catch (err) {
      message.warning('鏂囦欢涓婁紶閰嶇疆澶辫触锛岃嚜鍔ㄥ垏鎹负鏈湴涓婁紶');
    }

    if (storageType === 'QINIU') {
      await uploadToQiniu(rawFile, options);
    } else {
      await uploadToLocal(rawFile, options);
    }
  } catch (e: any) {
    message.error(e?.message || '上传失败');
    options.onError();
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
    chunkSize: 4,
    concurrentRequestLimit: 3
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

  await new Promise<void>((resolve, reject) => {
    observable.subscribe({
      next(res: any) {
        options.onProgress({ percent: res.total.percent });
      },
      error(err: any) {
        reject(err);
      },
      complete: async (res: any) => {
        try {
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

          message.success('上传成功');
          options.onFinish();
          resolve();
        } catch (e) {
          reject(e);
        }
      }
    });
  });
}
async function uploadToLocal(rawFile: File, options: UploadCustomRequestOptions) {
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

  message.success('上传成功');
  options.onFinish();
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
</template>
