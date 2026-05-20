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
  addProductType,
  deleteProductType,
  fetchProductTypeList,
  updateProductType,
  type ProductTypeForm,
  type ProductTypeVO
} from '@/service/api/biz/product-type';

defineOptions({ name: 'BizProductType' });

const message = useMessage();

const loading = ref(false);
const tableData = ref<ProductTypeVO[]>([]);
const total = ref(0);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  typeCode: '',
  typeName: '',
  status: ''
});

const showModal = ref(false);
const modalTitle = ref('新增产品类型');

const form = reactive<ProductTypeForm>({
  id: undefined,
  typeCode: '',
  typeName: '',
  status: 'ENABLE',
  orderNum: 0,
  remark: ''
});

const statusOptions = [
  { label: '启用', value: 'ENABLE' },
  { label: '停用', value: 'DISABLE' }
];

function statusLabel(value?: string) {
  return statusOptions.find(item => item.value === value)?.label || value || '-';
}

const columns = [
  { title: '类型编码', key: 'typeCode', width: 180 },
  { title: '类型名称', key: 'typeName', width: 160 },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row: ProductTypeVO) {
      return h(
        NTag,
        { type: row.status === 'ENABLE' ? 'success' : 'error' },
        { default: () => statusLabel(row.status) }
      );
    }
  },
  { title: '排序', key: 'orderNum', width: 80 },
  { title: '备注', key: 'remark', minWidth: 180 },
  { title: '创建时间', key: 'createTime', width: 170 },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    fixed: 'right',
    render(row: ProductTypeVO) {
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
              trigger: () =>
                h(NButton, { size: 'small', type: 'error' }, { default: () => '删除' }),
              default: () => '确认删除该产品类型吗？'
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
    const res = await fetchProductTypeList(queryParams);
    const data = res.data || res;
    tableData.value = data.rows || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.typeCode = '';
  queryParams.typeName = '';
  queryParams.status = '';
  queryParams.pageNum = 1;
  getList();
}

function resetForm() {
  form.id = undefined;
  form.typeCode = '';
  form.typeName = '';
  form.status = 'ENABLE';
  form.orderNum = 0;
  form.remark = '';
}

function handleAdd() {
  resetForm();
  modalTitle.value = '新增产品类型';
  showModal.value = true;
}

function handleEdit(row: ProductTypeVO) {
  resetForm();
  Object.assign(form, row);
  modalTitle.value = '编辑产品类型';
  showModal.value = true;
}

async function handleSubmit() {
  if (!form.typeCode) {
    message.warning('请输入类型编码');
    return;
  }

  if (!form.typeName) {
    message.warning('请输入类型名称');
    return;
  }

  if (form.id) {
    await updateProductType(form);
    message.success('修改成功');
  } else {
    await addProductType(form);
    message.success('新增成功');
  }

  showModal.value = false;
  getList();
}

async function handleDelete(row: ProductTypeVO) {
  if (!row.id) return;
  await deleteProductType(row.id);
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
  <NCard title="产品类型管理" :bordered="false">
    <NSpace vertical :size="16">
      <NForm inline label-placement="left">
        <NFormItem label="编码">
          <NInput v-model:value="queryParams.typeCode" clearable placeholder="请输入编码" />
        </NFormItem>

        <NFormItem label="名称">
          <NInput v-model:value="queryParams.typeName" clearable placeholder="请输入名称" />
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
        :scroll-x="1000"
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
      <NForm label-placement="left" label-width="100">
        <NFormItem label="类型编码" required>
          <NInput v-model:value="form.typeCode" placeholder="例如 FULL_BODY_REAL" />
        </NFormItem>

        <NFormItem label="类型名称" required>
          <NInput v-model:value="form.typeName" placeholder="例如 全身真人" />
        </NFormItem>

        <NFormItem label="状态">
          <NSelect v-model:value="form.status" :options="statusOptions" />
        </NFormItem>

        <NFormItem label="排序">
          <NInputNumber v-model:value="form.orderNum" :min="0" style="width: 180px" />
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
