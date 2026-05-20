<script setup lang="ts">
import { h, onMounted, ref } from 'vue';
import { NCard, NDataTable, NGrid, NGridItem, NStatistic, NTag, NSpace } from 'naive-ui';
import { fetchNotificationTodoList, type NotificationVO } from '@/service/api/biz/notification';
import { fetchWorkbenchSummary, type WorkbenchSummaryVO } from '@/service/api/biz/workbench';
import { useRouter } from 'vue-router';

defineOptions({ name: 'BizWorkbench' });

const router = useRouter();

const summary = ref<WorkbenchSummaryVO>({});
const todoList = ref<NotificationVO[]>([]);
const loading = ref(false);

async function loadSummary() {
  const res = await fetchWorkbenchSummary();
  summary.value = res.data || res;
}

async function loadTodoList() {
  loading.value = true;
  try {
    const res = await fetchNotificationTodoList(10);
    const data = res.data || res;
    todoList.value = data || [];
  } finally {
    loading.value = false;
  }
}

function openJump(row: NotificationVO) {
  if (row.jumpUrl) {
    router.push(row.jumpUrl);
  }
}

const columns = [
  {
    title: '标题',
    key: 'title',
    width: 220
  },
  {
    title: '内容',
    key: 'content',
    minWidth: 300,
    ellipsis: { tooltip: true }
  },
  {
    title: '类型',
    key: 'noticeType',
    width: 100
  },
  {
    title: '优先级',
    key: 'priority',
    width: 90,
    render(row: NotificationVO) {
      return h(
        NTag,
        { type: row.priority === 'HIGH' ? 'error' : row.priority === 'LOW' ? 'default' : 'warning' },
        { default: () => row.priority || '-' }
      );
    }
  },
  {
    title: '创建时间',
    key: 'createTime',
    width: 170
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    render(row: NotificationVO) {
      return h(
        'a',
        {
          href: 'javascript:;',
          onClick: () => openJump(row)
        },
        '查看'
      );
    }
  }
];

function go(path: string) {
  router.push(path);
}

async function refreshAll() {
  await Promise.all([loadSummary(), loadTodoList()]);
}


onMounted(async () => {
  await Promise.all([loadSummary(), loadTodoList()]);
});
</script>

<template>
  <NSpace vertical :size="16">
    <NCard title="待办工作台" :bordered="false">
      <NGrid :cols="4" :x-gap="16" :y-gap="16">
        <NGridItem>
          <NCard size="small" hoverable @click="go('/notification')" style="cursor: pointer">
            <NStatistic label="我的未读通知" :value="summary.myUnreadNoticeCount || 0" />
          </NCard>
        </NGridItem>

        <NGridItem>
          <NCard size="small" hoverable @click="go('/myrepairtask')" style="cursor: pointer">
            <NStatistic label="我的修模任务" :value="summary.myRepairTaskCount || 0" />
          </NCard>
        </NGridItem>

        <NGridItem>
          <NCard size="small" hoverable @click="go('/myprinttask')" style="cursor: pointer">
            <NStatistic label="我的打印任务" :value="summary.myPrintTaskCount || 0" />
          </NCard>
        </NGridItem>

        <NGridItem>
          <NCard size="small" hoverable @click="go('/myrepairtask')" style="cursor: pointer">
            <NStatistic label="我的修模超时" :value="summary.myOverdueRepairCount || 0" />
          </NCard>
        </NGridItem>
      </NGrid>

    </NCard>

    <NCard title="全局待处理任务" :bordered="false">
      <NGrid :cols="4" :x-gap="16" :y-gap="16">
        <NGridItem>
          <NCard size="small" hoverable @click="go('/repairhall')" style="cursor: pointer">
            <NStatistic label="待接单修模" :value="summary.tenantWaitClaimRepairCount || 0" />
          </NCard>
        </NGridItem>

        <NGridItem>
          <NCard size="small" hoverable @click="go('/repairtask')" style="cursor: pointer">
            <NStatistic label="修模中" :value="summary.tenantRepairingCount || 0" />
          </NCard>
        </NGridItem>

        <NGridItem>
          <NCard size="small" hoverable @click="go('/repairtask')" style="cursor: pointer">
            <NStatistic label="待效果图审核" :value="summary.tenantWaitPreviewReviewCount || 0" />
          </NCard>
        </NGridItem>

        <NGridItem>
          <NCard size="small" hoverable @click="go('/repairtask')" style="cursor: pointer">
            <NStatistic label="待模型检测" :value="summary.tenantWaitModelCheckCount || 0" />
          </NCard>
        </NGridItem>

        <NGridItem>
          <NCard size="small" hoverable @click="go('/print/printtask')" style="cursor: pointer">
            <NStatistic label="待打印检测" :value="summary.tenantWaitPrintQcCount || 0" />
          </NCard>
        </NGridItem>

        <NGridItem>
          <NCard size="small" hoverable @click="go('/print/printhall')" style="cursor: pointer">
            <NStatistic label="待接单打印" :value="summary.tenantWaitClaimPrintCount || 0" />
          </NCard>
        </NGridItem>

        <NGridItem>
          <NCard size="small" hoverable @click="go('/print/printtask')" style="cursor: pointer">
            <NStatistic label="打印中" :value="summary.tenantPrintingCount || 0" />
          </NCard>
        </NGridItem>

        <NGridItem>
          <NCard size="small" hoverable @click="go('/print/myprinttask')" style="cursor: pointer">
            <NStatistic label="待材料录入" :value="summary.tenantWaitMaterialRecordCount || 0" />
          </NCard>
        </NGridItem>

        <NGridItem>
          <NCard size="small" hoverable @click="go('/order')" style="cursor: pointer">
            <NStatistic label="待发货" :value="summary.tenantWaitDeliveryCount || 0" />
          </NCard>
        </NGridItem>

        <NGridItem>
          <NCard size="small" hoverable @click="go('/repairtask')" style="cursor: pointer">
            <NStatistic label="超时修模" :value="summary.tenantOverdueRepairCount || 0" />
          </NCard>
        </NGridItem>
      </NGrid>

    </NCard>

    <NCard title="我的待办" :bordered="false">
      <NDataTable
        :loading="loading"
        :columns="columns"
        :data="todoList"
        :scroll-x="1100"
      />
    </NCard>
  </NSpace>
</template>
