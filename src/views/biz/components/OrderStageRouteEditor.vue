<template>
  <NCard title="工序路由配置" :bordered="false">
    <NSpace vertical :size="16">
      <NAlert type="info" :bordered="false">
        可分别设置每个工序由本公司内部执行，还是发给好友商家协作。
      </NAlert>

      <NEmpty
        v-if="routes.length === 0"
        description="当前服务类型暂无可配置工序"
      />

      <NCard
        v-for="route in routes"
        :key="route.stageCode"
        size="small"
        :title="stageLabel(route.stageCode)"
      >
        <NForm label-placement="left" label-width="100">
          <NFormItem label="执行方式">
            <NRadioGroup
              v-model:value="route.routeMode"
              :disabled="disabled"
              @update:value="onRouteModeChange(route, $event)"
            >
              <NRadio value="INTERNAL">内部执行</NRadio>
              <NRadio value="EXTERNAL">外部协作</NRadio>
            </NRadioGroup>
          </NFormItem>

          <NFormItem
            v-if="route.routeMode === 'EXTERNAL'"
            label="协作商家"
          >
            <NSelect
              v-model:value="route.targetTenantId"
              :options="partnerOptions"
              filterable
              clearable
              placeholder="请选择好友商家"
              :disabled="disabled"
              @update:value="onTargetTenantChange(route, $event)"
            />
          </NFormItem>

          <NFormItem label="备注">
            <NInput
              v-model:value="route.remark"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 4 }"
              placeholder="请输入本工序说明"
              :disabled="disabled"
            />
          </NFormItem>
        </NForm>
      </NCard>
    </NSpace>
  </NCard>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

interface StageRouteForm {
  stageCode: string;
  stageNameSnapshot?: string;
  stageSeq?: number;
  routeMode: 'INTERNAL' | 'EXTERNAL' | 'SKIP';
  targetTenantId?: string;
  targetTenantNameSnapshot?: string;
  remark?: string;
}

interface PartnerOption {
  label: string;
  value: string | number;
  raw?: any;
}

const props = withDefaults(
  defineProps<{
    modelValue?: StageRouteForm[];
    serviceType?: string;
    partnerOptions?: PartnerOption[];
    disabled?: boolean;
  }>(),
  {
    modelValue: () => [],
    serviceType: '',
    partnerOptions: () => [],
    disabled: false
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: StageRouteForm[]): void;
}>();

const routes = ref<StageRouteForm[]>([]);
const syncingFromProps = ref(false);

function buildDefaultRoutes(serviceType: string): StageRouteForm[] {
  if (serviceType === 'REPAIR_ONLY') {
    return [
      {
        stageCode: 'REPAIR',
        stageNameSnapshot: '修模工序',
        stageSeq: 10,
        routeMode: 'INTERNAL',
        targetTenantId: '',
        targetTenantNameSnapshot: '',
        remark: ''
      }
    ];
  }

  if (serviceType === 'PRINT_ONLY') {
    return [
      {
        stageCode: 'PRINT',
        stageNameSnapshot: '打印工序',
        stageSeq: 20,
        routeMode: 'INTERNAL',
        targetTenantId: '',
        targetTenantNameSnapshot: '',
        remark: ''
      }
    ];
  }

  if (serviceType === 'REPAIR_PRINT') {
    return [
      {
        stageCode: 'REPAIR',
        stageNameSnapshot: '修模工序',
        stageSeq: 10,
        routeMode: 'INTERNAL',
        targetTenantId: '',
        targetTenantNameSnapshot: '',
        remark: ''
      },
      {
        stageCode: 'PRINT',
        stageNameSnapshot: '打印工序',
        stageSeq: 20,
        routeMode: 'INTERNAL',
        targetTenantId: '',
        targetTenantNameSnapshot: '',
        remark: ''
      }
    ];
  }

  return [];
}

function normalizeRoutes(serviceType: string, sourceRoutes: StageRouteForm[] = []): StageRouteForm[] {
  const defaults = buildDefaultRoutes(serviceType);

  if (!sourceRoutes.length) {
    return defaults;
  }

  const sourceMap = new Map<string, StageRouteForm>();
  sourceRoutes.forEach(item => {
    if (item?.stageCode) {
      sourceMap.set(item.stageCode, item);
    }
  });

  return defaults.map(def => {
    const exist = sourceMap.get(def.stageCode);

    if (!exist) {
      return { ...def };
    }

    return {
      ...def,
      ...exist,
      stageCode: def.stageCode,
      stageNameSnapshot: exist.stageNameSnapshot || def.stageNameSnapshot,
      stageSeq: exist.stageSeq ?? def.stageSeq,
      routeMode: exist.routeMode || def.routeMode,
      targetTenantId: exist.targetTenantId || '',
      targetTenantNameSnapshot: exist.targetTenantNameSnapshot || '',
      remark: exist.remark || ''
    };
  });
}

function stageLabel(code?: string) {
  const map: Record<string, string> = {
    REPAIR: '修模工序',
    PRINT: '打印工序',
    DELIVERY: '发货工序'
  };

  return map[code || ''] || code || '-';
}

function resolvePartnerLabel(value?: string | number) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  const hit = props.partnerOptions.find(item => String(item.value) === String(value));
  return hit?.label || String(value);
}

function onRouteModeChange(route: StageRouteForm, value: 'INTERNAL' | 'EXTERNAL' | 'SKIP') {
  route.routeMode = value;

  if (value === 'INTERNAL') {
    route.targetTenantId = '';
    route.targetTenantNameSnapshot = '';
  }
}

function onTargetTenantChange(route: StageRouteForm, value: string | number | null) {
  route.targetTenantId = value === null || value === undefined || value === '' ? '' : String(value);
  route.targetTenantNameSnapshot = resolvePartnerLabel(value || '');
}

watch(
  () => [props.serviceType, props.modelValue],
  () => {
    syncingFromProps.value = true;
    routes.value = normalizeRoutes(props.serviceType, props.modelValue || []);

    nextTick(() => {
      syncingFromProps.value = false;
    });
  },
  {
    immediate: true,
    deep: true
  }
);

watch(
  routes,
  () => {
    if (syncingFromProps.value) {
      return;
    }

    emit(
      'update:modelValue',
      routes.value.map(item => ({ ...item }))
    );
  },
  {
    deep: true
  }
);
</script>
