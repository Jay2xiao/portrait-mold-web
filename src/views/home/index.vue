<script setup lang="ts">
import { h, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  NButton,
  NCard,
  NDataTable,
  NGrid,
  NGi,
  NSpace,
  NStatistic,
  NTag,
  useMessage
} from 'naive-ui';

import {
  fetchHomeSummary,
  type HomeAlertVO,
  type HomeShortcutVO,
  type HomeSummaryVO,
  type HomeTodoVO
} from '@/service/api/biz/home';

import { normalizeRouteQuery } from '@/utils/route-query';


defineOptions({
  name: 'BizHome'
});

const router = useRouter();
const message = useMessage();

const loading = ref(false);
const summary = ref<HomeSummaryVO>({});

function unwrapData(res: any) {
  return res?.data || res;
}

function homeTypeLabel(value?: string) {
  const map: Record<string, string> = {
    PLATFORM_ADMIN_HOME: '平台管理员工作台',
    TENANT_ADMIN_HOME: '租户管理员工作台',
    FINANCE_HOME: '财务工作台',
    REPAIR_HOME: '修模工作台',
    PRINT_HOME: '打印工作台',
    DELIVERY_HOME: '发货工作台',
    DEFAULT_HOME: '默认工作台'
  };

  return map[value || ''] || value || '工作台';
}

function tagType(value?: string) {
  if (value === 'primary') return 'info';
  if (value === 'info') return 'info';
  if (value === 'success') return 'success';
  if (value === 'warning') return 'warning';
  if (value === 'error') return 'error';
  return 'default';
}

function alertTagType(value?: string) {
  if (value === 'error') return 'error';
  if (value === 'warning') return 'warning';
  return 'info';
}

function formatValue(value?: string | number) {
  if (typeof value === 'number') {
    return Number(value).toFixed(value % 1 === 0 ? 0 : 2);
  }

  return value || '0';
}

function openTarget(route?: string, query?: Record<string, any>) {
  if (!route) {
    message.info('暂未配置跳转路径');
    return;
  }

  router.push({
    path: route,
    query: normalizeRouteQuery(query)
  });
}


const todoColumns = [
  {
    title: '事项',
    key: 'title',
    width: 180
  },
  {
    title: '数量',
    key: 'count',
    width: 90,
    render(row: HomeTodoVO) {
      return h(
        NTag,
        { type: tagType(row.type) as any },
        { default: () => row.count || 0 }
      );
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    render(row: HomeTodoVO) {
      return h(
        NButton,
        {
          size: 'small',
          onClick: () => openTarget(row.route, row.query)
        },
        { default: () => '处理' }
      );
    }
  }
];

const alertColumns = [
  {
    title: '风险',
    key: 'title',
    width: 160
  },
  {
    title: '说明',
    key: 'content',
    minWidth: 280,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '数量',
    key: 'count',
    width: 90,
    render(row: HomeAlertVO) {
      return h(
        NTag,
        { type: alertTagType(row.level) as any },
        { default: () => row.count || 0 }
      );
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    render(row: HomeAlertVO) {
      return h(
        NButton,
        {
          size: 'small',
          type: row.level === 'error' ? 'error' : 'warning',
          onClick: () => openTarget(row.route, row.query)
        },
        { default: () => '查看' }
      );
    }
  }
];

async function getSummary() {
  loading.value = true;

  try {
    const res = await fetchHomeSummary();
    summary.value = unwrapData(res) || {};
  } catch (error: any) {
    message.error(error?.message || '首页加载失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  getSummary();
});
</script>

<template>
  <NSpace vertical :size="16">
    <NCard :bordered="false">
      <NSpace justify="space-between" align="center">
        <div>
          <div class="welcome-title">
            你好，{{ summary.userName || '用户' }}
          </div>

          <div class="welcome-sub">
            {{ homeTypeLabel(summary.homeType) }}
            <span v-if="summary.tenantId"> · 租户：{{ summary.tenantName || summary.tenantId }}</span>
            <span v-if="summary.roleNames?.length"> · 角色：{{ summary.roleNames.join('、') }}</span>
          </div>
        </div>

        <NButton type="primary" :loading="loading" @click="getSummary">
          刷新
        </NButton>
      </NSpace>
    </NCard>

    <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen">
      <NGi v-for="item in summary.kpis || []" :key="item.key">
        <NCard :title="item.title" :bordered="false" class="kpi-card">
          <NSpace justify="space-between" align="center">
            <NStatistic :value="formatValue(item.value)" />

            <NTag :type="tagType(item.type) as any">
              {{ item.unit || '-' }}
            </NTag>
          </NSpace>

          <div class="kpi-footer">
            <NButton
              v-if="item.route"
              text
              type="primary"
              @click="openTarget(item.route, item.query)"
            >
              查看详情
            </NButton>
          </div>
        </NCard>
      </NGi>
    </NGrid>

    <NGrid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
      <NGi>
        <NCard title="我的待办" :bordered="false">
          <NEmpty
            v-if="!summary.todos?.length"
            description="暂无待办事项，今天状态不错"
          />

          <NDataTable
            v-else
            size="small"
            :loading="loading"
            :columns="todoColumns"
            :data="summary.todos || []"
            :pagination="false"
          />
        </NCard>

      </NGi>

      <NGi>
        <NCard title="异常提醒" :bordered="false">
          <NEmpty
            v-if="!summary.alerts?.length"
            description="暂无异常提醒"
          />

          <NDataTable
            v-else
            size="small"
            :loading="loading"
            :columns="alertColumns"
            :data="summary.alerts || []"
            :pagination="false"
          />
        </NCard>

      </NGi>
    </NGrid>

    <NCard title="快捷入口" :bordered="false">
      <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen">
        <NGi v-for="item in summary.shortcuts || []" :key="item.key">
          <NCard size="small" hoverable class="shortcut-card" @click="openTarget(item.route)">
            <NSpace vertical :size="8">
              <NSpace justify="space-between" align="center">
                <strong>{{ item.title }}</strong>
                <NTag :type="tagType(item.type) as any" size="small">
                  进入
                </NTag>
              </NSpace>

              <div class="shortcut-desc">
                {{ item.description || '-' }}
              </div>
            </NSpace>
          </NCard>
        </NGi>
      </NGrid>
    </NCard>
  </NSpace>
</template>

<style scoped>
.welcome-title {
  font-size: 20px;
  font-weight: 600;
}

.welcome-sub {
  margin-top: 6px;
  color: #888;
  font-size: 13px;
}

.kpi-card {
  min-height: 130px;
}

.kpi-footer {
  margin-top: 12px;
}

.shortcut-card {
  cursor: pointer;
  transition: all 0.2s;
}

.shortcut-card:hover {
  transform: translateY(-2px);
}

.shortcut-desc {
  color: #888;
  font-size: 13px;
  min-height: 36px;
}
</style>
