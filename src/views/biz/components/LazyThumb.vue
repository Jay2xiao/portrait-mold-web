<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { NImage } from 'naive-ui';

defineOptions({
  name: 'LazyThumb'
});

interface Props {
  src?: string;
  previewSrc?: string;
  width?: number;
  height?: number;
}

const props = withDefaults(defineProps<Props>(), {
  width: 48,
  height: 48
});

const wrapperRef = ref<HTMLElement | null>(null);
const visible = ref(false);

let observer: IntersectionObserver | null = null;

onMounted(() => {
  if (!wrapperRef.value) return;

  observer = new IntersectionObserver(
    entries => {
      const entry = entries[0];

      if (entry?.isIntersecting) {
        visible.value = true;

        if (observer && wrapperRef.value) {
          observer.unobserve(wrapperRef.value);
        }
      }
    },
    {
      rootMargin: '120px'
    }
  );

  observer.observe(wrapperRef.value);
});

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});
</script>

<template>
  <div
    ref="wrapperRef"
    class="lazy-thumb"
    :style="{
      width: `${width}px`,
      height: `${height}px`
    }"
  >
    <NImage
      v-if="visible && src"
      :src="src"
      :preview-src="previewSrc || src"
      :width="width"
      :height="height"
      object-fit="cover"
    />

    <div v-else class="thumb-placeholder">
      图
    </div>
  </div>
</template>

<style scoped>
.lazy-thumb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 4px;
  background: #f5f5f5;
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  color: #999;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f2f3f5;
}
</style>
