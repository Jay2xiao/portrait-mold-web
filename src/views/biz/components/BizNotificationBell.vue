<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  NBadge,
  NButton,
  NEmpty,
  NPopover,
  NSpace,
  NTag,
  useMessage
} from 'naive-ui';
import { useRouter } from 'vue-router';
import {
  fetchNotificationTodoList,
  fetchUnreadNotificationCount,
  markAllNotificationRead,
  markNotificationRead,
  type NotificationVO
} from '@/service/api/biz/notification';

defineOptions({
  name: 'BizNotificationBell'
});

const router = useRouter();
const message = useMessage();

const unreadCount = ref(0);
const list = ref<NotificationVO[]>([]);
const showPopover = ref(false);

let timer: any = null;

const displayCount = computed(() => {
  if (unreadCount.value > 99) return '99+';
  return unreadCount.value;
});

async function loadUnreadCount() {
  const res = await fetchUnreadNotificationCount();
  unreadCount.value = Number(res.data || res || 0);
}

async function loadList() {
  const res = await fetchNotificationTodoList(6);
  const data = res.data || res;
  list.value = data || [];
}

async function refresh() {
  await Promise.all([loadUnreadCount(), loadList()]);
}

async function handleOpen() {
  showPopover.value = true;
  await refresh();
}

async function handleReadAndJump(item: NotificationVO) {
  if (item.id && item.readFlag !== '1') {
    await markNotificationRead(item.id);
  }

  await refresh();

  showPopover.value = false;

  if (item.jumpUrl) {
    router.push(item.jumpUrl);
  }
}

async function handleReadAll() {
  await markAllNotificationRead();
  message.success('已全部标记为已读');
  await refresh();
}

function openNotificationPage() {
  showPopover.value = false;
  router.push('/notification');
}

function noticeTypeLabel(value?: string) {
  if (value === 'TASK') return '任务';
  if (value === 'WARNING') return '预警';
  if (value === 'SYSTEM') return '系统';
  return value || '-';
}

function noticeTagType(value?: string) {
  if (value === 'WARNING') return 'error';
  if (value === 'SYSTEM') return 'info';
  return 'success';
}

onMounted(() => {
  refresh();
  timer = window.setInterval(() => {
    loadUnreadCount();
  }, 60000);
});

onBeforeUnmount(() => {
  if (timer) {
    window.clearInterval(timer);
  }
});
</script>

<template>
  <NPopover
    v-model:show="showPopover"
    trigger="click"
    placement="bottom-end"
    :width="360"
    @update:show="value => value && handleOpen()"
  >
    <template #trigger>
      <NBadge :value="displayCount" :max="99" :show="unreadCount > 0">
        <NButton quaternary>
          通知
        </NButton>
      </NBadge>
    </template>

    <NSpace vertical :size="10">
      <NSpace justify="space-between" align="center">
        <strong>站内通知</strong>
        <NSpace>
          <NButton size="tiny" @click="handleReadAll">全部已读</NButton>
          <NButton size="tiny" type="primary" @click="openNotificationPage">查看全部</NButton>
        </NSpace>
      </NSpace>

      <template v-if="list.length > 0">
        <div
          v-for="item in list"
          :key="item.id"
          class="notice-item"
          @click="handleReadAndJump(item)"
        >
          <NSpace justify="space-between" align="center">
            <div class="notice-title">
              <span v-if="item.readFlag !== '1'" class="unread-dot"></span>
              {{ item.title }}
            </div>

            <NTag size="small" :type="noticeTagType(item.noticeType)">
              {{ noticeTypeLabel(item.noticeType) }}
            </NTag>
          </NSpace>

          <div class="notice-content">
            {{ item.content }}
          </div>

          <div class="notice-time">
            {{ item.createTime }}
          </div>
        </div>
      </template>

      <NEmpty v-else description="暂无通知" />
    </NSpace>
  </NPopover>
</template>

<style scoped>
.notice-item {
  padding: 8px;
  cursor: pointer;
  border-radius: 6px;
  border-bottom: 1px solid #f0f0f0;
}

.notice-item:hover {
  background: #f6f6f6;
}

.notice-title {
  display: flex;
  align-items: center;
  font-weight: 600;
}

.unread-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 6px;
  border-radius: 50%;
  background: #d03050;
}

.notice-content {
  margin-top: 4px;
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

.notice-time {
  margin-top: 4px;
  font-size: 12px;
  color: #aaa;
}
</style>
