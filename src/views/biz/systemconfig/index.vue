<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import {
  NButton,
  NCard,
  NForm,
  NFormItem,
  NGrid,
  NGi,
  NInput,
  NInputNumber,
  NSelect,
  NSpace,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
  useMessage
} from 'naive-ui';

import {
  fetchSystemConfigList,
  resetSystemConfig,
  saveSystemConfig,
  type BizSystemConfigDefinitionVO
} from '@/service/api/biz/system-config';

defineOptions({
  name: 'BizSystemConfig'
});

const message = useMessage();

const loading = ref(false);
const saving = ref(false);

const configs = ref<BizSystemConfigDefinitionVO[]>([]);
const activeGroup = ref('');

const currentValues = ref<Record<string, string>>({});

const groups = computed(() => {
  const map = new Map<string, string>();

  configs.value.forEach(item => {
    if (item.configGroup) {
      map.set(item.configGroup, item.groupName || item.configGroup);
    }
  });

  return Array.from(map.entries()).map(([value, label]) => ({
    value,
    label
  }));
});

const currentGroupConfigs = computed(() => {
  return configs.value
    .filter(item => item.configGroup === activeGroup.value)
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
});

function unwrapData(res: any) {
  return res?.data || res;
}

function valueTypeTagType(value?: string) {
  if (value === 'BOOLEAN') return 'success';
  if (value === 'NUMBER') return 'warning';
  if (value === 'JSON') return 'error';
  if (value === 'SELECT') return 'info';
  return 'default';
}

function numberValue(value?: string) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const number = Number(value);

  return Number.isNaN(number) ? null : number;
}

function setConfigValue(configKey?: string, value?: any) {
  if (!configKey) return;

  if (value === undefined || value === null) {
    currentValues.value[configKey] = '';
    return;
  }

  currentValues.value[configKey] = String(value);
}

function switchValue(value?: string) {
  return value === 'true' || value === '1';
}

async function loadConfigs() {
  loading.value = true;

  try {
    const res = await fetchSystemConfigList();
    const list = unwrapData(res) || [];

    configs.value = list;

    const values: Record<string, string> = {};
    list.forEach((item: BizSystemConfigDefinitionVO) => {
      if (item.configKey) {
        values[item.configKey] = item.configValue ?? item.defaultValue ?? '';
      }
    });

    currentValues.value = values;

    if (!activeGroup.value && groups.value.length) {
      activeGroup.value = groups.value[0].value;
    }
  } finally {
    loading.value = false;
  }
}

async function handleSaveCurrentGroup() {
  const items = currentGroupConfigs.value.map(item => ({
    configKey: item.configKey,
    configValue: item.configKey ? currentValues.value[item.configKey] ?? '' : ''
  }));

  saving.value = true;

  try {
    await saveSystemConfig({
      items
    });

    message.success('配置保存成功');
    await loadConfigs();
  } finally {
    saving.value = false;
  }
}

async function handleSaveAll() {
  const items = configs.value.map(item => ({
    configKey: item.configKey,
    configValue: item.configKey ? currentValues.value[item.configKey] ?? '' : ''
  }));

  saving.value = true;

  try {
    await saveSystemConfig({
      items
    });

    message.success('全部配置保存成功');
    await loadConfigs();
  } finally {
    saving.value = false;
  }
}

async function handleReset(item: BizSystemConfigDefinitionVO) {
  if (!item.configKey) return;

  await resetSystemConfig(item.configKey);
  message.success('已恢复默认值');
  await loadConfigs();
}

onMounted(() => {
  loadConfigs();
});
</script>

<template>
  <NSpace vertical :size="16">
    <NCard title="系统配置中心" :bordered="false">
      <NSpace justify="space-between" align="center">
        <div>
          <strong>租户级业务配置</strong>
          <div style="margin-top: 6px; color: #888">
            配置客户财务、订单发货、利润业绩、打印模板和系统行为规则。
          </div>
        </div>

        <NSpace>
          <NButton :loading="loading" @click="loadConfigs">
            刷新
          </NButton>

          <NButton type="primary" :loading="saving" @click="handleSaveAll">
            保存全部
          </NButton>
        </NSpace>
      </NSpace>
    </NCard>

    <NCard :bordered="false">
      <NTabs v-model:value="activeGroup" type="line" animated>
        <NTabPane
          v-for="group in groups"
          :key="group.value"
          :name="group.value"
          :tab="group.label"
        >
          <NSpace vertical :size="16">
            <NSpace justify="end">
              <NButton type="primary" :loading="saving" @click="handleSaveCurrentGroup">
                保存当前分组
              </NButton>
            </NSpace>

            <NGrid :cols="2" :x-gap="16" :y-gap="16" responsive="screen">
              <NGi
                v-for="item in currentGroupConfigs"
                :key="item.configKey"
              >
                <NCard size="small" :bordered="true">
                  <NSpace vertical :size="10">
                    <NSpace justify="space-between" align="center">
                      <div>
                        <strong>{{ item.configName }}</strong>
                        <span v-if="item.required" style="color: #d03050"> *</span>
                      </div>

                      <NSpace>
                        <NTag size="small" :type="valueTypeTagType(item.valueType) as any">
                          {{ item.valueType }}
                        </NTag>

                        <NButton size="tiny" @click="handleReset(item)">
                          默认值
                        </NButton>
                      </NSpace>
                    </NSpace>

                    <div style="color: #888; font-size: 13px; min-height: 20px">
                      {{ item.configDesc }}
                    </div>

                    <NForm label-placement="top">
                      <NFormItem>
                        <NInput
                          v-if="item.formType === 'INPUT'"
                          v-model:value="currentValues[item.configKey || '']"
                          :disabled="!item.editable"
                          placeholder="请输入配置值"
                        />

                        <NInputNumber
                          v-else-if="item.formType === 'NUMBER'"
                          :value="numberValue(currentValues[item.configKey || ''])"
                          :disabled="!item.editable"
                          style="width: 240px"
                          @update:value="value => setConfigValue(item.configKey, value)"
                        />

                        <NSwitch
                          v-else-if="item.formType === 'SWITCH'"
                          :value="switchValue(currentValues[item.configKey || ''])"
                          :disabled="!item.editable"
                          @update:value="value => setConfigValue(item.configKey, value ? 'true' : 'false')"
                        />

                        <NSelect
                          v-else-if="item.formType === 'SELECT'"
                          :value="currentValues[item.configKey || '']"
                          :options="item.options || []"
                          :disabled="!item.editable"
                          style="width: 260px"
                          @update:value="value => setConfigValue(item.configKey, value)"
                        />

                        <NInput
                          v-else-if="item.formType === 'TEXTAREA'"
                          v-model:value="currentValues[item.configKey || '']"
                          :disabled="!item.editable"
                          type="textarea"
                          :autosize="{ minRows: 3, maxRows: 8 }"
                          placeholder="请输入配置值"
                        />

                        <NInput
                          v-else
                          v-model:value="currentValues[item.configKey || '']"
                          :disabled="!item.editable"
                          placeholder="请输入配置值"
                        />
                      </NFormItem>
                    </NForm>

                    <div style="color: #aaa; font-size: 12px">
                      Key：{{ item.configKey }}；默认值：{{ item.defaultValue || '-' }}
                    </div>
                  </NSpace>
                </NCard>
              </NGi>
            </NGrid>
          </NSpace>
        </NTabPane>
      </NTabs>
    </NCard>
  </NSpace>
</template>
