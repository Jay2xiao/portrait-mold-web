<template>
  <div class="biz-home-page">
    <NEmpty description="业务首页暂未配置" />
  </div>
</template>

<script setup lang="ts">
import { NEmpty } from 'naive-ui';

defineOptions({
  name: 'BizHome'
});
</script>

<style scoped>
.biz-home-page {
  display: flex;
  min-height: 320px;
  align-items: center;
  justify-content: center;
}
</style>
