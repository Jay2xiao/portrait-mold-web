<script setup lang="ts">
import { h, onMounted, reactive, ref, watch } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NPopconfirm,
  NSelect,
  NSpace,
  NTag,
  useMessage
} from 'naive-ui';
import {
  addAuditorConfig,
  deleteAuditorConfig,
  fetchAuditorConfigList,
  updateAuditorConfig,
  fetchAuditorDeptOptions,
  fetchAuditorRoleOptions,
  fetchAuditorUserOptions,
  type AuditorConfigForm,
  type AuditorConfigVO
} from '@/service/api/biz/auditor-config';


defineOptions({ name: 'BizAuditorConfig' });

const message = useMessage();

const loading = ref(false);
const tableData = ref<AuditorConfigVO[]>([]);
const total = ref(0);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  nodeCode: '',
  auditorType: '',
  status: ''
});

const showModal = ref(false);
const modalTitle = ref('新增审核员配置');

const auditorOptions = ref<any[]>([]);

const form = reactive<AuditorConfigForm>({
  id: undefined,
  nodeCode: '',
  nodeName: '',
  auditorType: 'ROLE',
  auditorValue: '',
  status: 'ENABLE',
  isDefault: '0',
  sortNum: 0,
  remark: ''
});

function auditorValuePlaceholder() {
  if (form.auditorType === 'ROLE') return '请选择角色';
  if (form.auditorType === 'USER') return '请选择用户';
  if (form.auditorType === 'DEPT') return '请选择部门';
  return '请选择审核人';
}

async function loadAuditorOptions(type?: string) {
  const auditorType = type || form.auditorType || 'ROLE';

  let res;

  if (auditorType === 'ROLE') {
    res = await fetchAuditorRoleOptions();
  } else if (auditorType === 'USER') {
    res = await fetchAuditorUserOptions();
  } else {
    res = await fetchAuditorDeptOptions();
  }

  const data = res.data || res;
  auditorOptions.value = data || [];
}

async function handleAuditorTypeChange(value: string) {
  form.auditorType = value;
  form.auditorValue = '';
  await loadAuditorOptions(value);
}

const nodeOptions = [
  { label: '修模效果图审核', value: 'REPAIR_PREVIEW_REVIEW' },

  { label: '修模模型检测', value: 'REPAIR_MODEL_CHECK' },

  { label: '打印检测', value: 'PRINT_QC' },

  { label: '修模超时处理', value: 'REPAIR_TIMEOUT' },

  { label: '订单发货/交付', value: 'ORDER_DELIVERY' },

  { label: '修模任务管理通知', value: 'REPAIR_TASK_MANAGE' },

  { label: '打印任务管理通知', value: 'PRINT_TASK_MANAGE' },

  { label: '打印材料录入通知', value: 'PRINT_MATERIAL_RECORD' },

  { label: '只打印模型驳回通知', value: 'PRINT_MODEL_REJECT_NOTIFY' },

  { label: '协作负责人通知', value: 'COLLAB_MANAGER_NOTIFY' },

  { label: '协作财务通知', value: 'COLLAB_FINANCE_NOTIFY' },

  { label: '协作发货通知', value: 'COLLAB_DELIVERY_NOTIFY' }
];


const auditorTypeOptions = [
  { label: '角色', value: 'ROLE' },
  { label: '用户', value: 'USER' },
  { label: '部门', value: 'DEPT' }
];

const statusOptions = [
  { label: '启用', value: 'ENABLE' },
  { label: '停用', value: 'DISABLE' }
];

const defaultOptions = [
  { label: '是', value: '1' },
  { label: '否', value: '0' }
];

function findLabel(options: any[], value?: string) {
  return options.find(item => item.value === value)?.label || value || '-';
}

watch(
  () => form.nodeCode,
  value => {
    const node = nodeOptions.find(item => item.value === value);
    if (node) form.nodeName = node.label;
  }
);

const columns = [
  {
    title: '节点',
    key: 'nodeCode',
    width: 180,
    render(row: AuditorConfigVO) {
      return row.nodeName || findLabel(nodeOptions, row.nodeCode);
    }
  },
  {
    title: '审核人类型',
    key: 'auditorType',
    width: 120,
    render(row: AuditorConfigVO) {
      return findLabel(auditorTypeOptions, row.auditorType);
    }
  },
  {
    title: '审核人值',
    key: 'auditorValue',
    width: 180
  },
  {
    title: '默认',
    key: 'isDefault',
    width: 90,
    render(row: AuditorConfigVO) {
      return h(
        NTag,
        { type: row.isDefault === '1' ? 'success' : 'default' },
        { default: () => (row.isDefault === '1' ? '是' : '否') }
      );
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render(row: AuditorConfigVO) {
      return h(
        NTag,
        { type: row.status === 'ENABLE' ? 'success' : 'error' },
        { default: () => findLabel(statusOptions, row.status) }
      );
    }
  },
  { title: '排序', key: 'sortNum', width: 80 },
  { title: '备注', key: 'remark', minWidth: 180 },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    fixed: 'right' as const,
    render(row: AuditorConfigVO) {
      return h(NSpace, {}, {
        default: () => [
          h(
            NButton,
            { size: 'small', type: 'primary', onClick: () => handleEdit(row) },
            { default: () => '编辑' }
          ),
          h(
            NPopconfirm,
            { onPositiveClick: () => handleDelete(row) },
            {
              trigger: () => h(NButton, { size: 'small', type: 'error' }, { default: () => '删除' }),
              default: () => '确认删除该配置吗？'
            }
          )
        ]
      });
    }
  }
];

async function getList() {
  loading.value = true;
  try {
    const res = await fetchAuditorConfigList(queryParams);
    const data = res.data || res;
    tableData.value = data.rows || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.nodeCode = '';
  queryParams.auditorType = '';
  queryParams.status = '';
  queryParams.pageNum = 1;
  getList();
}

function resetForm() {
  form.id = undefined;
  form.nodeCode = '';
  form.nodeName = '';
  form.auditorType = 'ROLE';
  form.auditorValue = '';
  form.status = 'ENABLE';
  form.isDefault = '0';
  form.sortNum = 0;
  form.remark = '';
}

async function handleAdd() {
  resetForm();
  await loadAuditorOptions('ROLE');
  modalTitle.value = '新增审核员配置';
  showModal.value = true;
}

async function handleEdit(row: AuditorConfigVO) {
  resetForm();
  Object.assign(form, row);

  form.auditorValue = row.auditorValue ? String(row.auditorValue) : '';

  await loadAuditorOptions(form.auditorType || 'ROLE');

  modalTitle.value = '编辑审核员配置';
  showModal.value = true;
}

async function handleSubmit() {
  if (!form.nodeCode) {
    message.warning('请选择审核节点');
    return;
  }

  if (!form.auditorType) {
    message.warning('请选择审核人类型');
    return;
  }

  if (!form.auditorValue) {
    message.warning('请输入审核人值');
    return;
  }

  if (form.id) {
    await updateAuditorConfig(form);
    message.success('修改成功');
  } else {
    await addAuditorConfig(form);
    message.success('新增成功');
  }

  showModal.value = false;
  getList();
}

async function handleDelete(row: AuditorConfigVO) {
  if (!row.id) return;
  await deleteAuditorConfig(row.id);
  message.success('删除成功');
  getList();
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

onMounted(getList);
</script>

<template>
  <NCard title="审核员配置" :bordered="false">
    <NSpace vertical :size="16">
      <NForm inline label-placement="left">
        <NFormItem label="节点">
          <NSelect
            v-model:value="queryParams.nodeCode"
            :options="nodeOptions"
            clearable
            style="width: 180px"
          />
        </NFormItem>

        <NFormItem label="审核人类型" required>
          <NSelect
            v-model:value="form.auditorType"
            :options="auditorTypeOptions"
            @update:value="handleAuditorTypeChange"
          />
        </NFormItem>

        <NFormItem label="审核人" required>
          <NSelect
            v-model:value="form.auditorValue"
            :options="auditorOptions"
            filterable
            clearable
            placeholder="请选择审核人"
          />
        </NFormItem>

        <NFormItem label="状态">
          <NSelect
            v-model:value="queryParams.status"
            :options="statusOptions"
            clearable
            style="width: 120px"
          />
        </NFormItem>

        <NFormItem>
          <NSpace>
            <NButton type="primary" @click="getList">查询</NButton>
            <NButton @click="resetQuery">重置</NButton>
            <NButton type="success" @click="handleAdd">新增</NButton>
          </NSpace>
        </NFormItem>
      </NForm>

      <NDataTable
        remote
        :loading="loading"
        :columns="columns"
        :data="tableData"
        :scroll-x="1100"
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

    <NModal v-model:show="showModal" preset="card" :title="modalTitle" style="width: 620px">
      <NForm label-placement="left" label-width="120">
        <NFormItem label="审核节点" required>
          <NSelect v-model:value="form.nodeCode" :options="nodeOptions" />
        </NFormItem>

        <NFormItem label="节点名称">
          <NInput v-model:value="form.nodeName" disabled />
        </NFormItem>

        <NFormItem label="审核人类型" required>
          <NSelect v-model:value="form.auditorType" :options="auditorTypeOptions" />
        </NFormItem>

        <NFormItem label="审核人值" required>
          <NSelect
            v-model:value="form.auditorValue"
            :options="auditorOptions"
            filterable
            clearable
            :placeholder="auditorValuePlaceholder()"
          />
        </NFormItem>

        <NFormItem label="是否默认">
          <NSelect v-model:value="form.isDefault" :options="defaultOptions" />
        </NFormItem>

        <NFormItem label="排序">
          <NInputNumber v-model:value="form.sortNum" :min="0" style="width: 180px" />
        </NFormItem>

        <NFormItem label="状态">
          <NSelect v-model:value="form.status" :options="statusOptions" />
        </NFormItem>

        <NFormItem label="备注">
          <NInput v-model:value="form.remark" type="textarea" />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showModal = false">取消</NButton>
          <NButton type="primary" @click="handleSubmit">保存</NButton>
        </NSpace>
      </template>
    </NModal>
  </NCard>
</template>
