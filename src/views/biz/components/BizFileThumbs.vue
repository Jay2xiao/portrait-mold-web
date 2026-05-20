<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { NButton, NModal, NSpace, NTag } from 'naive-ui';
import {
  ensureFileMetas,
  getCachedFiles,
  getThumbUrl,
  parseFileIds
} from '@/utils/biz/useBizFileCache';
import { isImageFile, isVideoFile } from '@/utils/biz/blob';
import BizFileViewer from './BizFileViewer.vue';
import type { FileAssetVO } from '@/service/api/biz/file';

defineOptions({
  name: 'BizFileThumbs'
});

interface Props {
  fileIds?: string | Array<string | number> | null;
  max?: number;
  thumbSize?: number;
  mode?: 'auto' | 'image' | 'download';
  showName?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  fileIds: '',
  max: 2,
  thumbSize: 44,
  mode: 'auto',
  showName: false
});

const loading = ref(false);
const files = ref<FileAssetVO[]>([]);
const thumbMap = ref<Record<string, string>>({});
const showViewer = ref(false);

const ids = computed(() => parseFileIds(props.fileIds));
const displayFiles = computed(() => files.value.slice(0, props.max));
const moreCount = computed(() => Math.max(files.value.length - props.max, 0));

function shortName(name?: string) {
  if (!name) return '文件';

  return name.length > 10 ? `${name.slice(0, 8)}...` : name;
}

async function load() {
  files.value = [];
  thumbMap.value = {};

  if (ids.value.length === 0) {
    return;
  }

  loading.value = true;

  try {
    await ensureFileMetas(ids.value);

    files.value = getCachedFiles(ids.value);

    for (const file of displayFiles.value) {
      if (isImageFile(file)) {
        const url = await getThumbUrl(file);
        if (file.id) {
          thumbMap.value[String(file.id)] = url;
        }
      }
    }
  } finally {
    loading.value = false;
  }
}

function openViewer() {
  if (ids.value.length === 0) return;
  showViewer.value = true;
}

watch(
  () => props.fileIds,
  () => load()
);

onMounted(load);
</script>

<template>
  <div class="biz-file-thumbs">
    <span v-if="ids.length === 0">-</span>

    <NSpace v-else size="small" align="center">
      <template v-for="file in displayFiles" :key="file.id">
        <img
          v-if="isImageFile(file) && thumbMap[String(file.id)]"
          class="thumb-img"
          :src="thumbMap[String(file.id)]"
          :style="{ width: `${thumbSize}px`, height: `${thumbSize}px` }"
          @click="openViewer"
        />

        <NTag
          v-else-if="isVideoFile(file)"
          type="info"
          size="small"
          class="file-tag"
          @click="openViewer"
        >
          视频
        </NTag>

        <NTag
          v-else
          size="small"
          class="file-tag"
          @click="openViewer"
        >
          {{ shortName(file.originalName || file.fileName) }}
        </NTag>
      </template>

      <NButton v-if="moreCount > 0" size="tiny" quaternary @click="openViewer">
        +{{ moreCount }}
      </NButton>
    </NSpace>

    <NModal v-model:show="showViewer" preset="card" title="文件查看" style="width: 860px">
      <BizFileViewer
        :file-ids="ids"
        :mode="mode"
        :max="50"
        :thumb-size="80"
        show-name
      />
    </NModal>
  </div>
</template>

<style scoped>
.biz-file-thumbs {
  min-height: 44px;
  display: flex;
  align-items: center;
}

.thumb-img {
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #eee;
}

.file-tag {
  cursor: pointer;
}
</style>
