<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue';
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
  addPrintMonthlyCost,
  deletePrintMonthlyCost,
  fetchPrintMonthlyCostDetail,
  fetchPrintMonthlyCostList,
  updatePrintMonthlyCost,
  type PrintMonthlyCostForm,
  type PrintMonthlyCostVO
} from '@/service/api/biz/print-monthly-cost';

defineOptions({ name: 'BizPrintMonthlyCost' });

const message = useMessage();
const loading = ref(false);
const tableData = ref<PrintMonthlyCostVO[]>([]);
const total = ref(0);
const showModal = ref(false);
const modalTitle = ref('新增月度运营成本');

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  costMonth: '',
  costCategory: '',
  status: ''
});

const form = reactive<PrintMonthlyCostForm>({
  id: undefined,
  costMonth: '',
  costCategory: 'PRINT',
  laborCostAmount: 0,
  electricityCostAmount: 0,
  rentCostAmount: 0,
  depreciationCostAmount: 0,
  maintenanceCostAmount: 0,
  otherCostAmount: 0,
  repairRentCostAmount: 0,
  repairElectricityCostAmount: 0,
  repairFollowSalaryAmount: 0,
  repairAiPlatformCostAmount: 0,
  repairOtherCostAmount: 0,
  companyNetworkCostAmount: 0,
  companyMealCostAmount: 0,
  companyOtherCostAmount: 0,
  status: 'DRAFT',
  remark: ''
});

const statusOptions = [
  { label: '草稿', value: 'DRAFT' },
  { label: '已确认', value: 'CONFIRMED' }
];

const categoryOptions = [
  { label: '打印成本', value: 'PRINT' },
  { label: '修模团队成本', value: 'REPAIR_TEAM' },
  { label: '公司公共成本', value: 'COMPANY' }
];

const formTotal = computed(() =>
  [
    form.laborCostAmount,
    form.electricityCostAmount,
    form.rentCostAmount,
    form.depreciationCostAmount,
    form.maintenanceCostAmount,
    form.otherCostAmount,
    form.repairRentCostAmount,
    form.repairElectricityCostAmount,
    form.repairFollowSalaryAmount,
    form.repairAiPlatformCostAmount,
    form.repairOtherCostAmount,
    form.companyNetworkCostAmount,
    form.companyMealCostAmount,
    form.companyOtherCostAmount
  ].reduce((sum: number, value) => sum + Number(value || 0), 0)
);

function money(value?: number) {
  return Number(value || 0).toFixed(2);
}

function statusLabel(value?: string) {
  return statusOptions.find(item => item.value === value)?.label || value || '-';
}

function categoryLabel(value?: string) {
  return categoryOptions.find(item => item.value === value)?.label || value || '-';
}

function unwrapData(res: any) {
  return res?.data || res;
}

function costDetail(row: PrintMonthlyCostVO) {
  if (row.costCategory === 'REPAIR_TEAM') {
    return `房租 ${money(row.repairRentCostAmount)} / 电费 ${money(row.repairElectricityCostAmount)} / 跟单工资 ${money(row.repairFollowSalaryAmount)} / AI平台 ${money(row.repairAiPlatformCostAmount)} / 其他 ${money(row.repairOtherCostAmount)}`;
  }

  if (row.costCategory === 'COMPANY') {
    return `网费 ${money(row.companyNetworkCostAmount)} / 餐饮 ${money(row.companyMealCostAmount)} / 其他 ${money(row.companyOtherCostAmount)}`;
  }

  return `人工 ${money(row.laborCostAmount)} / 电费 ${money(row.electricityCostAmount)} / 房租 ${money(row.rentCostAmount)} / 折旧 ${money(row.depreciationCostAmount)} / 维护 ${money(row.maintenanceCostAmount)} / 其他 ${money(row.otherCostAmount)}`;
}

const columns = [
  { title: '月份', key: 'costMonth', width: 110 },
  {
    title: '成本分类',
    key: 'costCategory',
    width: 110,
    render(row: PrintMonthlyCostVO) {
      return h(NTag, { type: row.costCategory === 'PRINT' ? 'info' : row.costCategory === 'REPAIR_TEAM' ? 'warning' : 'default' }, {
        default: () => categoryLabel(row.costCategory)
      });
    }
  },
  {
    title: '成本明细',
    key: 'costDetail',
    minWidth: 360,
    ellipsis: { tooltip: true },
    render: (row: PrintMonthlyCostVO) => costDetail(row)
  },
  { title: '合计', key: 'totalCostAmount', width: 120, render: (row: PrintMonthlyCostVO) => money(row.totalCostAmount) },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row: PrintMonthlyCostVO) {
      return h(
        NTag,
        { type: row.status === 'CONFIRMED' ? 'success' : 'warning' },
        { default: () => statusLabel(row.status) }
      );
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 170,
    fixed: 'right' as const,
    render(row: PrintMonthlyCostVO) {
      return h(NSpace, {}, {
        default: () => [
          h(NButton, { size: 'small', type: 'primary', onClick: () => handleEdit(row) }, { default: () => '编辑' }),
          h(
            NPopconfirm,
            { onPositiveClick: () => handleDelete(row) },
            {
              trigger: () => h(NButton, { size: 'small', type: 'error' }, { default: () => '删除' }),
              default: () => '确认删除该月度成本吗？'
            }
          )
        ]
      });
    }
  }
];

function resetForm() {
  form.id = undefined;
  form.costMonth = '';
  form.costCategory = 'PRINT';
  form.laborCostAmount = 0;
  form.electricityCostAmount = 0;
  form.rentCostAmount = 0;
  form.depreciationCostAmount = 0;
  form.maintenanceCostAmount = 0;
  form.otherCostAmount = 0;
  form.repairRentCostAmount = 0;
  form.repairElectricityCostAmount = 0;
  form.repairFollowSalaryAmount = 0;
  form.repairAiPlatformCostAmount = 0;
  form.repairOtherCostAmount = 0;
  form.companyNetworkCostAmount = 0;
  form.companyMealCostAmount = 0;
  form.companyOtherCostAmount = 0;
  form.status = 'DRAFT';
  form.remark = '';
}

async function getList() {
  loading.value = true;
  try {
    const res = await fetchPrintMonthlyCostList(queryParams);
    const data = unwrapData(res);
    tableData.value = data.rows || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.costMonth = '';
  queryParams.costCategory = '';
  queryParams.status = '';
  queryParams.pageNum = 1;
  getList();
}

function handleAdd() {
  resetForm();
  modalTitle.value = '新增月度运营成本';
  showModal.value = true;
}

async function handleEdit(row: PrintMonthlyCostVO) {
  if (!row.id) return;
  resetForm();
  const res = await fetchPrintMonthlyCostDetail(row.id);
  Object.assign(form, unwrapData(res));
  modalTitle.value = '编辑月度运营成本';
  showModal.value = true;
}

function normalizeByCategory() {
  if (form.costCategory !== 'PRINT') {
    form.laborCostAmount = 0;
    form.electricityCostAmount = 0;
    form.rentCostAmount = 0;
    form.depreciationCostAmount = 0;
    form.maintenanceCostAmount = 0;
    form.otherCostAmount = 0;
  }

  if (form.costCategory !== 'REPAIR_TEAM') {
    form.repairRentCostAmount = 0;
    form.repairElectricityCostAmount = 0;
    form.repairFollowSalaryAmount = 0;
    form.repairAiPlatformCostAmount = 0;
    form.repairOtherCostAmount = 0;
  }

  if (form.costCategory !== 'COMPANY') {
    form.companyNetworkCostAmount = 0;
    form.companyMealCostAmount = 0;
    form.companyOtherCostAmount = 0;
  }
}

async function handleSubmit() {
  if (!form.costMonth || !/^\d{4}-\d{2}$/.test(form.costMonth)) {
    message.warning('月份格式必须为 yyyy-MM');
    return;
  }

  normalizeByCategory();

  if (form.id) {
    await updatePrintMonthlyCost(form);
    message.success('修改成功');
  } else {
    await addPrintMonthlyCost(form);
    message.success('新增成功');
  }

  showModal.value = false;
  getList();
}

async function handleDelete(row: PrintMonthlyCostVO) {
  if (!row.id) return;
  await deletePrintMonthlyCost(row.id);
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
  <NCard title="月度运营成本" :bordered="false">
    <NSpace vertical :size="16">
      <NForm inline label-placement="left">
        <NFormItem label="月份">
          <NInput v-model:value="queryParams.costMonth" placeholder="2026-05" clearable style="width: 130px" />
        </NFormItem>
        <NFormItem label="成本分类">
          <NSelect v-model:value="queryParams.costCategory" :options="categoryOptions" clearable style="width: 150px" />
        </NFormItem>
        <NFormItem label="状态">
          <NSelect v-model:value="queryParams.status" :options="statusOptions" clearable style="width: 120px" />
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
        :scroll-x="1200"
        :pagination="{
          page: queryParams.pageNum,
          pageSize: queryParams.pageSize,
          itemCount: total,
          showSizePicker: true,
          pageSizes: [10, 20, 50],
          onUpdatePage: handlePageChange,
          onUpdatePageSize: handlePageSizeChange
        }"
      />
    </NSpace>

    <NModal v-model:show="showModal" preset="card" :title="modalTitle" style="width: 720px">
      <NForm label-placement="left" label-width="120">
        <NFormItem label="月份" required>
          <NInput v-model:value="form.costMonth" placeholder="2026-05" />
        </NFormItem>
        <NFormItem label="成本分类" required>
          <NSelect v-model:value="form.costCategory" :options="categoryOptions" />
        </NFormItem>

        <template v-if="form.costCategory === 'PRINT'">
          <NFormItem label="打印人工费">
            <NInputNumber v-model:value="form.laborCostAmount" :min="0" style="width: 220px" />
          </NFormItem>
          <NFormItem label="打印电费">
            <NInputNumber v-model:value="form.electricityCostAmount" :min="0" style="width: 220px" />
          </NFormItem>
          <NFormItem label="打印房租">
            <NInputNumber v-model:value="form.rentCostAmount" :min="0" style="width: 220px" />
          </NFormItem>
          <NFormItem label="设备折旧">
            <NInputNumber v-model:value="form.depreciationCostAmount" :min="0" style="width: 220px" />
          </NFormItem>
          <NFormItem label="设备维护费">
            <NInputNumber v-model:value="form.maintenanceCostAmount" :min="0" style="width: 220px" />
          </NFormItem>
          <NFormItem label="其他打印成本">
            <NInputNumber v-model:value="form.otherCostAmount" :min="0" style="width: 220px" />
          </NFormItem>
        </template>

        <template v-if="form.costCategory === 'REPAIR_TEAM'">
          <NFormItem label="修模房租">
            <NInputNumber v-model:value="form.repairRentCostAmount" :min="0" style="width: 220px" />
          </NFormItem>
          <NFormItem label="修模电费">
            <NInputNumber v-model:value="form.repairElectricityCostAmount" :min="0" style="width: 220px" />
          </NFormItem>
          <NFormItem label="跟单员工资">
            <NInputNumber v-model:value="form.repairFollowSalaryAmount" :min="0" style="width: 220px" />
          </NFormItem>
          <NFormItem label="建模AI平台">
            <NInputNumber v-model:value="form.repairAiPlatformCostAmount" :min="0" style="width: 220px" />
          </NFormItem>
          <NFormItem label="其他修模成本">
            <NInputNumber v-model:value="form.repairOtherCostAmount" :min="0" style="width: 220px" />
          </NFormItem>
        </template>

        <template v-if="form.costCategory === 'COMPANY'">
          <NFormItem label="网费">
            <NInputNumber v-model:value="form.companyNetworkCostAmount" :min="0" style="width: 220px" />
          </NFormItem>
          <NFormItem label="餐饮费">
            <NInputNumber v-model:value="form.companyMealCostAmount" :min="0" style="width: 220px" />
          </NFormItem>
          <NFormItem label="其他公司开支">
            <NInputNumber v-model:value="form.companyOtherCostAmount" :min="0" style="width: 220px" />
          </NFormItem>
        </template>

        <NFormItem label="合计">
          <span>{{ money(formTotal) }}</span>
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
