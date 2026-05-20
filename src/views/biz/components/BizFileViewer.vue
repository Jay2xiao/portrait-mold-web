<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { NButton, NModal, NSpace, NTag, useMessage } from 'naive-ui';
import {
  downloadFileBlob,
  fetchFileList,
  fetchFilesByIds,
  previewFileBlob,
  thumbnailFileBlob,
  fetchFileAccessUrl,
  type FileAssetVO,
} from '@/service/api/biz/file';
import { getBlobFromResponse, isImageFile, isVideoFile, saveBlob } from '@/utils/biz/blob';

defineOptions({
  name: 'BizFileViewer'
});

const props = withDefaults(
  defineProps<{
    fileIds?: string | number | Array<string | number>;
    orderId?: string | number;
    taskId?: string | number;
    bizType?: string;
    bizId?: string | number;
    fileStage?: string;
    fileType?: string;
    mode?: 'auto' | 'image' | 'download';
    max?: number;
    thumbSize?: number;
    showName?: boolean;
  }>(),
  {
    mode: 'auto',
    max: 3,
    thumbSize: 54,
    showName: false
  }
);

const message = useMessage();

const files = ref<FileAssetVO[]>([]);
const thumbUrlMap = ref<Record<string, string>>({});

const showPreviewModal = ref(false);
const previewUrl = ref('');
const previewFile = ref<FileAssetVO | null>(null);

const visibleFiles = computed(() => files.value.slice(0, props.max));
const previewKind = ref<'image' | 'video'>('image');


watch(
  () => [
    props.fileIds,
    props.orderId,
    props.taskId,
    props.bizType,
    props.bizId,
    props.fileStage,
    props.fileType
  ],
  () => {
    loadFiles();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  clearObjectUrls();
});

function hasFileIdsProp() {
  return props.fileIds !== undefined && props.fileIds !== null;
}

function hasQueryCondition() {
  return Boolean(props.orderId || props.taskId || props.bizId);
}


function normalizeFileIds() {
  if (!props.fileIds) return [];

  if (Array.isArray(props.fileIds)) {
    return props.fileIds.filter(Boolean);
  }

  if (typeof props.fileIds === 'number') {
    return [props.fileIds];
  }

  return String(props.fileIds)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

async function loadFiles() {
  clearObjectUrls();
  files.value = [];

  const ids = normalizeFileIds();

  try {
    let list: FileAssetVO[] = [];

    // 只要外部传了 fileIds，就只按 fileIds 显示
    // 即使 fileIds 是空数组，也不再按 fileStage/fileType 自动查询
    if (hasFileIdsProp()) {
      if (ids.length === 0) {
        files.value = [];
        return;
      }

      const res = await fetchFilesByIds(ids.join(','));
      const data = res.data || res;
      list = data || [];

      files.value = list;
      await loadThumbnails();
      return;
    }

    // 没传 fileIds 时，必须有 orderId/taskId/bizId 之一，才允许自动查询
    if (!hasQueryCondition()) {
      files.value = [];
      return;
    }

    const res = await fetchFileList({
      orderId: props.orderId,
      taskId: props.taskId,
      bizType: props.bizType,
      bizId: props.bizId,
      fileStage: props.fileStage,
      fileType: props.fileType
    });

    const data = res.data || res;
    list = data || [];

    files.value = list;
    await loadThumbnails();
  } catch (e: any) {
    console.error(e);
  }
}


async function loadThumbnails() {
  const imageFiles = visibleFiles.value.filter(file => shouldShowImage(file));

  await Promise.all(
    imageFiles.map(async file => {
      if (!file.id) return;

      try {

        if (file.storageType === 'QINIU') {
          const res = await fetchFileAccessUrl(file.id, 'THUMBNAIL');
          const data = res.data || res;
          thumbUrlMap.value[String(file.id)] = data.url;
          return;
        }

        const res = await thumbnailFileBlob(file.id);
        const blob = getBlobFromResponse(res);
        const url = URL.createObjectURL(blob);

        thumbUrlMap.value[String(file.id)] = url;
      } catch (e) {
        console.error(e);
      }
    })
  );
}

async function openPreview(file: FileAssetVO) {
  if (!file.id) return;

  try {
    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value);
      previewUrl.value = '';
    }

    previewKind.value = isVideoFile(file) ? 'video' : 'image';

    if (file.storageType === 'QINIU') {
      const res = await fetchFileAccessUrl(file.id, 'PREVIEW');
      const data = res.data || res;

      previewUrl.value = data.url;
      previewFile.value = file;
      showPreviewModal.value = true;
      return;
    }

    const res = await previewFileBlob(file.id);
    const blob = getBlobFromResponse(res);

    previewUrl.value = URL.createObjectURL(blob);
    previewFile.value = file;
    showPreviewModal.value = true;
  } catch (e: any) {
    message.error(e?.message || '预览失败');
  }
}


async function handleDownload(file: FileAssetVO) {
  if (!file.id) return;

  if (file.storageType === 'QINIU') {
    const res = await fetchFileAccessUrl(file.id, 'DOWNLOAD');
    const data = res.data || res;

    const a = document.createElement('a');
    a.href = data.url;
    a.target = '_blank';
    a.click();
    return;
  }

  const res = await downloadFileBlob(file.id);
  const blob = getBlobFromResponse(res);
  saveBlob(blob, file.originalName || file.fileName || 'download');
}


function shouldShowImage(file: FileAssetVO) {
  if (props.mode === 'image') {
    return true;
  }

  if (props.mode === 'download') {
    return false;
  }

  return isImageFile(file);
}

function closePreview() {
  showPreviewModal.value = false;

  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
  }

  previewFile.value = null;
}

function clearObjectUrls() {
  Object.values(thumbUrlMap.value).forEach(url => {
    URL.revokeObjectURL(url);
  });

  thumbUrlMap.value = {};

  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
  }
}

function shortName(name?: string) {
  if (!name) return '文件';

  if (name.length <= 12) return name;

  return `${name.slice(0, 6)}...${name.slice(-5)}`;
}
</script>

<template>
  <div class="biz-file-viewer">
    <template v-if="visibleFiles.length > 0">
      <NSpace :size="6" align="center">
        <div v-for="file in visibleFiles" :key="file.id" class="file-item">
          <template v-if="shouldShowImage(file)">
            <div class="thumb-wrap">
              <img
                v-if="thumbUrlMap[String(file.id)]"
                class="thumb-img"
                :src="thumbUrlMap[String(file.id)]"
                :style="{ width: `${thumbSize}px`, height: `${thumbSize}px` }"
                @click="openPreview(file)"
              />

              <div
                v-else
                class="thumb-placeholder"
                :style="{ width: `${thumbSize}px`, height: `${thumbSize}px` }"
              >
                图
              </div>

              <div v-if="showName" class="file-name">{{ shortName(file.originalName) }}</div>
            </div>
          </template>

          <template v-else-if="isVideoFile(file)">
            <div class="download-item">
              <NTag size="small" type="info">{{ shortName(file.originalName || '视频') }}</NTag>
              <NButton size="tiny" type="primary" @click="openPreview(file)">预览</NButton>
              <NButton size="tiny" @click="handleDownload(file)">下载</NButton>
            </div>
          </template>

          <template v-else>
            <div class="download-item">
              <NTag size="small">{{ shortName(file.originalName) }}</NTag>
              <NButton size="tiny" type="primary" @click="handleDownload(file)">下载</NButton>
            </div>
          </template>
        </div>

        <NTag v-if="files.length > max" size="small">+{{ files.length - max }}</NTag>
      </NSpace>
    </template>

    <template v-else>
      <span class="empty">-</span>
    </template>

    <NModal v-model:show="showPreviewModal" preset="card" title="图片预览" style="width: 1500px" @after-leave="closePreview">
      <div class="preview-body">
        <img
          v-if="previewUrl && previewKind === 'image'"
          class="preview-img"
          :src="previewUrl"
        />

        <video
          v-if="previewUrl && previewKind === 'video'"
          class="preview-video"
          :src="previewUrl"
          controls
        />

      </div>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="closePreview">关闭</NButton>
          <NButton v-if="previewFile" type="primary" @click="handleDownload(previewFile)">下载原文件</NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.biz-file-viewer {
  display: inline-flex;
  align-items: center;
}

.file-item {
  display: inline-flex;
  align-items: center;
}

.thumb-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.thumb-img {
  object-fit: cover;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
  background: #f8f8f8;
}

.thumb-img:hover {
  border-color: #18a058;
}

.thumb-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  border: 1px dashed #ccc;
  border-radius: 4px;
  background: #fafafa;
}

.file-name {
  max-width: 80px;
  margin-top: 4px;
  font-size: 12px;
  color: #666;
  text-align: center;
}

.download-item {
  display: flex;
  gap: 4px;
  align-items: center;
}

.preview-body {
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 70vh;
  overflow: auto;
  background: #111;
}

.preview-img {
  max-width: 100%;
  max-height: 68vh;
  object-fit: contain;
}

.preview-video {
  max-width: 100%;
  max-height: 68vh;
}


.empty {
  color: #999;
}
</style>
