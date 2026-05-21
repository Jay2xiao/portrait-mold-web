<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
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
  addPrinter,
  deletePrinter,
  fetchPrinterList,
  fetchPrinterUserOptions,
  updatePrinter,
  type PrinterForm,
  type PrinterVO
} from '@/service/api/biz/printer';

defineOptions({
  name: 'BizPrinter'
});

const message = useMessage();

const loading = ref(false);
const tableData = ref<PrinterVO[]>([]);
const total = ref(0);

const userOptions = ref<any[]>([]);
const rawUserOptions = ref<any[]>([]);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  printerNo: '',
  printerName: '',
  phone: '',
  canAccept: '',
  status: ''
});

const showModal = ref(false);
const modalTitle = ref('新增打印员');

const form = reactive<PrinterForm>({
  id: undefined,
  userId: undefined,
  printerName: '',
  phone: '',
  skillTags: '',
  canAccept: '1',
  status: 'ENABLE',
  maxPrintingCount: 2,
  remark: ''
});

const canAcceptOptions = [
  { label: '可接单', value: '1' },
  { label: '不可接单', value: '0' }
];

const statusOptions = [
  { label: '启用', value: 'ENABLE' },
  { label: '停用', value: 'DISABLE' }
];

function statusLabel(value?: string) {
  return statusOptions.find(item => item.value === value)?.label || value || '-';
}

function canAcceptLabel(value?: string) {
  return canAcceptOptions.find(item => item.value === value)?.label || value || '-';
}

const columns = [
  {
    title: '打印员编号',
    key: 'printerNo',
    width: 160
  },
  {
    title: '打印员姓名',
    key: 'printerName',
    width: 140
  },
  {
    title: '手机号',
    key: 'phone',
    width: 130
  },
  {
    title: '技能标签',
    key: 'skillTags',
    width: 180
  },
  {
    title: '是否可接单',
    key: 'canAccept',
    width: 120,
    render(row: PrinterVO) {
      return h(
        NTag,
        { type: row.canAccept === '1' ? 'success' : 'warning' },
        { default: () => canAcceptLabel(row.canAccept) }
      );
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row: PrinterVO) {
      return h(
        NTag,
        { type: row.status === 'ENABLE' ? 'success' : 'error' },
        { default: () => statusLabel(row.status) }
      );
    }
  },
  {
    title: '当前任务数',
    key: 'currentTaskCount',
    width: 110
  },
  {
    title: '正在打印数',
    key: 'printingTaskCount',
    width: 110
  },
  {
    title: '最大同时打印',
    key: 'maxPrintingCount',
    width: 120
  },
  {
    title: '创建时间',
    key: 'createTime',
    width: 170
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    fixed: 'right' as const,
    render(row: PrinterVO) {
      return h(
        NSpace,
        {},
        {
          default: () => [
            h(
              NButton,
              {
                size: 'small',
                type: 'primary',
                onClick: () => handleEdit(row)
              },
              { default: () => '编辑' }
            ),
            h(
              NPopconfirm,
              {
                onPositiveClick: () => handleDelete(row)
              },
              {
                trigger: () =>
                  h(
                    NButton,
                    {
                      size: 'small',
                      type: 'error'
                    },
                    { default: () => '删除' }
                  ),
                default: () => '确认删除该打印员吗？'
              }
            )
          ]
        }
      );
    }
  }
];

async function loadUserOptions() {
  const res = await fetchPrinterUserOptions();
  const data = res.data || res;

  rawUserOptions.value = data || [];
  userOptions.value = rawUserOptions.value.map(item => ({
    label: item.label,
    value: item.value
  }));
}

async function getList() {
  loading.value = true;
  try {
    const res = await fetchPrinterList(queryParams);
    const data = res.data || res;

    tableData.value = data.rows || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.printerNo = '';
  queryParams.printerName = '';
  queryParams.phone = '';
  queryParams.canAccept = '';
  queryParams.status = '';
  queryParams.pageNum = 1;
  getList();
}

function resetForm() {
  form.id = undefined;
  form.userId = undefined;
  form.printerName = '';
  form.phone = '';
  form.skillTags = '';
  form.canAccept = '1';
  form.status = 'ENABLE';
  form.maxPrintingCount = 2;
  form.remark = '';
}

async function handleAdd() {
  resetForm();
  await loadUserOptions();
  modalTitle.value = '新增打印员';
  showModal.value = true;
}

async function handleEdit(row: PrinterVO) {
  resetForm();
  await loadUserOptions();
  Object.assign(form, row);
  modalTitle.value = '编辑打印员';
  showModal.value = true;
}

function handleUserChange(value: string | number | null) {
  const user = rawUserOptions.value.find(item => item.value === value);
  if (!user) return;

  if (!form.printerName) {
    form.printerName = user.nickName || user.userName;
  }

  if (!form.phone) {
    form.phone = user.phone;
  }
}

async function handleSubmit() {
  if (!form.userId) {
    message.warning('请选择绑定用户');
    return;
  }

  if (!form.printerName) {
    message.warning('请输入打印员姓名');
    return;
  }

  if (form.id) {
    await updatePrinter(form);
    message.success('修改成功');
  } else {
    await addPrinter(form);
    message.success('新增成功');
  }

  showModal.value = false;
  getList();
}

async function handleDelete(row: PrinterVO) {
  if (!row.id) return;

  await deletePrinter(row.id);
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

onMounted(() => {
  getList();
});
</script>

<template>
  <NCard title="打印员管理" :bordered="false">
    <NSpace vertical :size="16">
      <NForm inline label-placement="left">
        <NFormItem label="编号">
          <NInput v-model:value="queryParams.printerNo" placeholder="请输入打印员编号" clearable />
        </NFormItem>

        <NFormItem label="姓名">
          <NInput v-model:value="queryParams.printerName" placeholder="请输入姓名" clearable />
        </NFormItem>

        <NFormItem label="手机号">
          <NInput v-model:value="queryParams.phone" placeholder="请输入手机号" clearable />
        </NFormItem>

        <NFormItem label="可接单">
          <NSelect
            v-model:value="queryParams.canAccept"
            :options="canAcceptOptions"
            clearable
            style="width: 120px"
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
            <NButton type="success" @click="handleAdd">新增打印员</NButton>
          </NSpace>
        </NFormItem>
      </NForm>

      <NDataTable
        remote
        :loading="loading"
        :columns="columns"
        :data="tableData"
        :scroll-x="1300"
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

    <NModal v-model:show="showModal" preset="card" :title="modalTitle" style="width: 680px">
      <NForm label-placement="left" label-width="120">
        <NFormItem label="绑定用户" required>
          <NSelect
            v-model:value="form.userId"
            :options="userOptions"
            filterable
            placeholder="请选择当前租户下系统用户"
            @update:value="handleUserChange"
          />
        </NFormItem>

        <NFormItem label="打印员姓名" required>
          <NInput v-model:value="form.printerName" placeholder="请输入打印员姓名" />
        </NFormItem>

        <NFormItem label="手机号">
          <NInput v-model:value="form.phone" placeholder="请输入手机号" />
        </NFormItem>

        <NFormItem label="技能标签">
          <NInput v-model:value="form.skillTags" placeholder="例如：全彩,树脂,大件,精细件" />
        </NFormItem>

        <NFormItem label="是否可接单">
          <NSelect v-model:value="form.canAccept" :options="canAcceptOptions" />
        </NFormItem>

        <NFormItem label="状态">
          <NSelect v-model:value="form.status" :options="statusOptions" />
        </NFormItem>

        <NFormItem label="最大同时打印">
          <NInputNumber v-model:value="form.maxPrintingCount" :min="1" style="width: 200px" />
        </NFormItem>

        <NFormItem label="备注">
          <NInput v-model:value="form.remark" type="textarea" placeholder="请输入备注" />
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
