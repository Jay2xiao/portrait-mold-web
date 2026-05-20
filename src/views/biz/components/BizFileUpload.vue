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
  'update:modelValue': [value: Array<string | number>];
  uploaded: [file: any];
}>();

const message = useMessage();

async function customRequest(options: UploadCustomRequestOptions) {
  const rawFile = options.file.file as File | null;

  if (!rawFile) {
    message.error('文件不存在');
    options.onError();
    return;
  }

  try {
    const configRes = await fetchUploadConfig();
    const config = configRes.data || configRes;

    if (config.storageType === 'QINIU') {
      await uploadToQiniu(rawFile, options);
    } else {
      await uploadToLocal(rawFile, options);
    }
  } catch (e: any) {
    message.error(e?.message || '上传失败');
    options.onError();
  }
}

async function uploadToQiniu1(rawFile: File, options: UploadCustomRequestOptions) {
  try {
    // 1. 获取上传凭证
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

    // 2. 构建 FormData
    const formData = new FormData();
    formData.append('token', tokenData.uploadToken);
    formData.append('key', tokenData.objectKey);
    formData.append('file', rawFile);

    // 3. 用 XMLHttpRequest 上传（绕过 fetch 的预检拦截）
    const data = await new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://upload-z2.qbox.me', true);

      // 上传进度
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          options.onProgress({ percent });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve(res);
          } catch {
            reject(new Error('上传响应解析失败'));
          }
        } else {
          reject(new Error(`上传失败，状态码：${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('网络错误，上传失败'));
      };

      // 发送请求
      xhr.send(formData);
    });

    console.log('✅ 上传成功！', data);

    // 4. 回调后端保存记录
    const completeRes = await completeQiniuUpload({
      originalName: rawFile.name,
      sizeBytes: rawFile.size,
      contentType: rawFile.type,
      objectKey: tokenData.objectKey,
      hash: data.hash,
      bizType: props.bizType || 'TEMP',
      bizId: props.bizId,
      orderId: props.orderId,
      taskId: props.taskId,
      fileStage: props.fileStage,
      fileType: props.fileType
    });

    const fileId = (completeRes.data || completeRes).id;
    emit('update:modelValue', [...props.modelValue, fileId]);
    emit('uploaded', completeRes.data || completeRes);

    message.success('上传成功');
    options.onFinish();
  } catch (err) {
    console.error('❌ 上传失败', err);
    options.onError(err as any);
    message.error('上传失败，请重试');
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

  // ✅ 强制指定 华南区(广州) 上传域名！！！
  const config = {
    useCdnDomain: false,
    region: qiniu.region.z2,
    uploadURL: 'https://upload-z2.qiniup.com', // 👈 必须加这一行！
    forceDirect: true
  };

  const observable = qiniu.upload(
    rawFile,
    tokenData.objectKey,
    tokenData.uploadToken,
    {},
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
          const completeRes = await completeQiniuUpload({
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
          });

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
