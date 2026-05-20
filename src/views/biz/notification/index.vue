<script setup lang="ts">
import {h, onMounted, reactive, ref} from 'vue';
import {NButton, NCard, NDataTable, NForm, NFormItem, NInput, NSelect, NSpace, NTag, useMessage} from 'naive-ui';
import {
  fetchNotificationList,
  fetchUnreadNotificationCount,
  markAllNotificationRead,
  markNotificationRead,
  type NotificationVO
} from '@/service/api/biz/notification';
import {useRouter} from 'vue-router';

defineOptions({name: 'BizNotification'});

const router = useRouter();
const message = useMessage();

const loading = ref(false);
const tableData = ref<NotificationVO[]>([]);
const total = ref(0);
const unreadCount = ref(0);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  noticeType: '',
  readFlag: '',
  title: ''
});

const noticeTypeOptions = [
  {label: '任务', value: 'TASK'},
  {label: '预警', value: 'WARNING'},
  {label: '系统', value: 'SYSTEM'}
];

const readOptions = [
  {label: '未读', value: '0'},
  {label: '已读', value: '1'}
];

const showDetailModal = ref(false);
const currentNotice = ref<NotificationVO | null>(null);


function typeLabel(value?: string) {
  return noticeTypeOptions.find(item => item.value === value)?.label || value || '-';
}

function priorityTagType(value?: string) {
  if (value === 'HIGH') return 'error';
  if (value === 'LOW') return 'default';
  return 'warning';
}

function readTagType(value?: string) {
  return value === '1' ? 'success' : 'error';
}

async function openDetail(row: NotificationVO) {
  currentNotice.value = row;
  showDetailModal.value = true;

  if (row.id && row.readFlag !== '1') {
    await markNotificationRead(row.id);
    await loadUnreadCount();
    getList();
  }
}

function jumpFromDetail() {
  if (!currentNotice.value?.jumpUrl) {
    message.info('该通知暂无跳转地址');
    return;
  }

  showDetailModal.value = false;
  router.push(currentNotice.value.jumpUrl);
}


const columns = [
  {
    title: '状态',
    key: 'readFlag',
    width: 90,
    render(row: NotificationVO) {
      return h(
        NTag,
        {type: readTagType(row.readFlag) as any},
        {default: () => (row.readFlag === '1' ? '已读' : '未读')}
      );
    }
  },
  {
    title: '标题',
    key: 'title',
    width: 220
  },
  {
    title: '内容',
    key: 'content',
    minWidth: 320,
    ellipsis: {tooltip: true}
  },
  {
    title: '类型',
    key: 'noticeType',
    width: 100,
    render(row: NotificationVO) {
      return typeLabel(row.noticeType);
    }
  },
  {
    title: '优先级',
    key: 'priority',
    width: 90,
    render(row: NotificationVO) {
      return h(
        NTag,
        {type: priorityTagType(row.priority) as any},
        {default: () => row.priority || '-'}
      );
    }
  },
  {
    title: '来源',
    key: 'fromUserName',
    width: 120
  },
  {
    title: '创建时间',
    key: 'createTime',
    width: 170
  },
  {
    title: '已读时间',
    key: 'readTime',
    width: 170
  },
  {
    title: '备注',
    key: 'remark',
    width: 170
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    fixed: 'right',
    render(row: NotificationVO) {
      const buttons = [];

      if (row.readFlag !== '1') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => handleRead(row)
            },
            {default: () => '已读'}
          )
        );
      }

      buttons.push(
        h(
          NButton,
          {
            size: 'small',
            onClick: () => openDetail(row)
          },
          {default: () => '详情'}
        )
      );

      buttons.push(
        h(
          NButton,
          {
            size: 'small',
            onClick: () => openJump(row)
          },
          {default: () => '查看'}
        )
      );

      return h(NSpace, {}, {default: () => buttons});
    }
  }
];

async function loadUnreadCount() {
  try {
    const res = await fetchUnreadNotificationCount();
    // 不管后端返回啥，都安全转数字，没有就 0
    unreadCount.value = Number(res?.data ?? res ?? 0) || 0;
  } catch {
    unreadCount.value = 0;
  }
}

async function getList() {
  loading.value = true;
  try {
    const res = await fetchNotificationList(queryParams);
    const data = res.data || res;
    tableData.value = data.rows || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.noticeType = '';
  queryParams.readFlag = '';
  queryParams.title = '';
  queryParams.pageNum = 1;
  getList();
}

async function handleRead(row: NotificationVO) {
  if (!row.id) return;
  await markNotificationRead(row.id);
  message.success('已标记为已读');
  await loadUnreadCount();
  getList();
}

async function handleReadAll() {
  await markAllNotificationRead();
  message.success('全部已读');
  await loadUnreadCount();
  getList();
}

async function openJump(row: NotificationVO) {
  if (row.id && row.readFlag !== '1') {
    await markNotificationRead(row.id);
    await loadUnreadCount();
  }

  if (row.jumpUrl) {
    router.push(row.jumpUrl);
    return;
  }

  message.info('该通知暂无跳转地址');
}

function handlePageChange(page: number) {
  queryParams.pageNum = page;
  getList();
}

function handlePageSizeChange(pageSize: number) {
  queryParams.pageSize = pageSize;
  queryParams.pageNum = 1;
  getList();
}

onMounted(async () => {
  await Promise.all([loadUnreadCount(), getList()]);
});
</script>

<template>
  <NCard title="站内通知" :bordered="false">
    <NSpace vertical :size="16">
      <NSpace align="center">
        <NTag type="error">未读 {{ unreadCount }}</NTag>
        <NButton type="primary" @click="handleReadAll">全部已读</NButton>
      </NSpace>

      <NForm inline label-placement="left">
        <NFormItem label="类型">
          <NSelect
            v-model:value="queryParams.noticeType"
            :options="noticeTypeOptions"
            clearable
            style="width: 120px"
          />
        </NFormItem>

        <NFormItem label="状态">
          <NSelect
            v-model:value="queryParams.readFlag"
            :options="readOptions"
            clearable
            style="width: 120px"
          />
        </NFormItem>

        <NFormItem label="标题">
          <NInput v-model:value="queryParams.title" placeholder="请输入标题" clearable/>
        </NFormItem>

        <NFormItem>
          <NSpace>
            <NButton type="primary" @click="getList">查询</NButton>
            <NButton @click="resetQuery">重置</NButton>
          </NSpace>
        </NFormItem>
      </NForm>

      <NDataTable
        remote
        :loading="loading"
        :columns="columns"
        :data="tableData"
        :row-class-name="row => row.readFlag !== '1' ? 'notice-unread-row' : ''"
        :scroll-x="1400"
        :pagination="{
    page: queryParams.pageNum,
    pageSize: queryParams.pageSize,
    itemCount: total,
    showSizePicker: true,
    pageSizes: [10, 20, 50, 100],
    onUpdatePage: handlePageChange,
    onUpdatePageSize: handlePageSizeChange
  }"
      />

    </NSpace>



    <NModal v-model:show="showDetailModal" preset="card" title="通知详情" style="width: 680px">
      <NSpace v-if="currentNotice" vertical :size="12">
        <div>
          <strong>标题：</strong>{{ currentNotice.title }}
        </div>

        <div>
          <strong>类型：</strong>{{ currentNotice.noticeType }}
          <span style="margin-left: 16px">
        <strong>优先级：</strong>{{ currentNotice.priority }}
      </span>
        </div>

        <div>
          <strong>业务编号：</strong>{{ currentNotice.bizNo || '-' }}
        </div>

        <div>
          <strong>发送人：</strong>{{ currentNotice.fromUserName || '系统' }}
        </div>

        <div>
          <strong>时间：</strong>{{ currentNotice.createTime }}
        </div>

        <div>
          <strong>内容：</strong>
          <div style="margin-top: 8px; white-space: pre-wrap; line-height: 1.6">
            {{ currentNotice.content }}
          </div>
        </div>
      </NSpace>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showDetailModal = false">关闭</NButton>
          <NButton type="primary" @click="jumpFromDetail">前往处理</NButton>
        </NSpace>
      </template>
    </NModal>
  </NCard>

</template>

<style scoped>
:deep(.notice-unread-row td) {
  background-color: #fff7e6;
}
</style>

