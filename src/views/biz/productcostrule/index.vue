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
  addProductCostRule,
  deleteProductCostRule,
  fetchProductCostRuleList,
  updateProductCostRule,
  type ProductCostRuleForm,
  type ProductCostRuleVO, fetchProductCostRuleDetail
} from '@/service/api/biz/product-cost-rule';
import { fetchProductTypeOptions } from '@/service/api/biz/product-type';

defineOptions({ name: 'BizProductCostRule' });

const message = useMessage();

const loading = ref(false);
const tableData = ref<ProductCostRuleVO[]>([]);
const total = ref(0);

const productTypeOptions = ref<any[]>([]);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  productType: '',
  repairSource: '',
  ruleMode: '',
  status: ''
});

const showModal = ref(false);
const modalTitle = ref('新增成本规则');

const form = reactive<ProductCostRuleForm>({
  id: undefined,
  productType: '',
  repairSource: 'ALL',
  ruleMode: 'FIXED',
  ratioBase: 'SALE_AMOUNT',

  hdAmount: 0,
  aiModelAmount: 0,
  followAmount: 0,
  companyCostAmount: 0,
  repairManualAmount: 0,

  companyCostRate: 0,
  followRate: 0,
  repairManualRate: 0,



  repairLimitHours: 24,
  remindBeforeMinutes: 60,

  status: 'ENABLE',
  remark: ''
});

const rateForm = reactive({
  companyCostRatePercent: 0,
  followRatePercent: 0,
  repairManualRatePercent: 0
});

const repairSourceOptions = [
  { label: '全部', value: 'ALL' },
  { label: '内部修模', value: 'INTERNAL' },
  { label: '外部修模', value: 'EXTERNAL' }
];

const ruleModeOptions = [
  { label: '固定金额', value: 'FIXED' },
  { label: '比例模式', value: 'RATIO' }
];

const ratioBaseOptions = [
  { label: '销售金额', value: 'SALE_AMOUNT' },
  { label: '修模金额', value: 'REPAIR_AMOUNT' }
];

const statusOptions = [
  { label: '启用', value: 'ENABLE' },
  { label: '停用', value: 'DISABLE' }
];

function findLabel(options: any[], value?: string) {
  return options.find(item => item.value === value)?.label || value || '-';
}

const columns = [
  {
    title: '产品类型',
    key: 'productType',
    width: 160,
    render(row: ProductCostRuleVO) {
      return findLabel(productTypeOptions.value, row.productType);
    }
  },
  {
    title: '修模来源',
    key: 'repairSource',
    width: 110,
    render(row: ProductCostRuleVO) {
      return findLabel(repairSourceOptions, row.repairSource);
    }
  },
  {
    title: '规则模式',
    key: 'ruleMode',
    width: 110,
    render(row: ProductCostRuleVO) {
      return h(
        NTag,
        { type: row.ruleMode === 'FIXED' ? 'success' : 'info' },
        { default: () => findLabel(ruleModeOptions, row.ruleMode) }
      );
    }
  },
  { title: '高清费', key: 'hdAmount', width: 90 },
  { title: 'AI费', key: 'aiModelAmount', width: 90 },
  { title: '跟单业绩', key: 'followAmount', width: 100 },
  { title: '公司成本', key: 'companyCostAmount', width: 100 },
  { title: '修模业绩', key: 'repairManualAmount', width: 100 },
  {
    title: '比例',
    key: 'rates',
    width: 210,
    render(row: ProductCostRuleVO) {
      if (row.ruleMode !== 'RATIO') return '-';

      const company = ((row.companyCostRate || 0) * 100).toFixed(0);
      const follow = ((row.followRate || 0) * 100).toFixed(0);
      const repair = ((row.repairManualRate || 0) * 100).toFixed(0);

      return `公司${company}% / 跟单${follow}% / 修模${repair}%`;
    }
  },
  { title: '修模时限/h', key: 'repairLimitHours', width: 110 },
  { title: '提醒/min', key: 'remindBeforeMinutes', width: 100 },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render(row: ProductCostRuleVO) {
      return h(
        NTag,
        { type: row.status === 'ENABLE' ? 'success' : 'error' },
        { default: () => findLabel(statusOptions, row.status) }
      );
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    fixed: 'right' as const,
    render(row: ProductCostRuleVO) {
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
              default: () => '确认删除该规则吗？'
            }
          )
        ]
      });
    }
  }
];

async function loadProductTypes() {
  productTypeOptions.value = await fetchProductTypeOptions();
}

async function getList() {
  loading.value = true;
  try {
    const res = await fetchProductCostRuleList(queryParams);
    const data = res.data || res;
    tableData.value = data.rows || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.productType = '';
  queryParams.repairSource = '';
  queryParams.ruleMode = '';
  queryParams.status = '';
  queryParams.pageNum = 1;
  getList();
}

function resetForm() {
  form.id = undefined;
  form.productType = '';
  form.repairSource = 'ALL';
  form.ruleMode = 'FIXED';
  form.ratioBase = 'SALE_AMOUNT';

  form.hdAmount = 0;
  form.aiModelAmount = 0;
  form.followAmount = 0;
  form.companyCostAmount = 0;
  form.repairManualAmount = 0;

  form.companyCostRate = 0;
  form.followRate = 0;
  form.repairManualRate = 0;

  rateForm.companyCostRatePercent = 0;
  rateForm.followRatePercent = 0;
  rateForm.repairManualRatePercent = 0;

  form.repairLimitHours = 24;
  form.remindBeforeMinutes = 60;
  form.status = 'ENABLE';
  form.remark = '';
}

function handleAdd() {
  resetForm();
  modalTitle.value = '新增成本规则';
  showModal.value = true;
}

async function handleEdit(row: ProductCostRuleVO) {
  if (!row.id) return;

  resetForm();

  const res = await fetchProductCostRuleDetail(row.id);
  const data = res.data || res;

  assignFormData(data);

  modalTitle.value = '编辑成本规则';
  showModal.value = true;
}


function toNumber(value: any, defaultValue = 0) {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  const num = Number(value);
  return Number.isNaN(num) ? defaultValue : num;
}

function assignFormData(data: any) {
  form.id = data.id;
  form.productType = data.productType || '';
  form.repairSource = data.repairSource || 'ALL';
  form.ruleMode = data.ruleMode || 'FIXED';
  form.ratioBase = data.ratioBase || 'SALE_AMOUNT';

  form.hdAmount = toNumber(data.hdAmount);
  form.aiModelAmount = toNumber(data.aiModelAmount);
  form.followAmount = toNumber(data.followAmount);
  form.companyCostAmount = toNumber(data.companyCostAmount);
  form.repairManualAmount = toNumber(data.repairManualAmount);

  form.companyCostRate = toNumber(data.companyCostRate);
  form.followRate = toNumber(data.followRate);
  form.repairManualRate = toNumber(data.repairManualRate);

  rateForm.companyCostRatePercent = Number((toNumber(data.companyCostRate) * 100).toFixed(2));
  rateForm.followRatePercent = Number((toNumber(data.followRate) * 100).toFixed(2));
  rateForm.repairManualRatePercent = Number((toNumber(data.repairManualRate) * 100).toFixed(2));

  form.repairLimitHours = toNumber(data.repairLimitHours, 24);
  form.remindBeforeMinutes = toNumber(data.remindBeforeMinutes, 60);

  form.status = data.status || 'ENABLE';
  form.remark = data.remark || '';
}


function buildSubmitData() {
  const data: any = { ...form };

  data.companyCostRate = Number((Number(rateForm.companyCostRatePercent || 0) / 100).toFixed(4));
  data.followRate = Number((Number(rateForm.followRatePercent || 0) / 100).toFixed(4));
  data.repairManualRate = Number((Number(rateForm.repairManualRatePercent || 0) / 100).toFixed(4));

  return data;
}

async function handleSubmit() {
  if (!form.productType) {
    message.warning('请选择产品类型');
    return;
  }

  if (!form.ruleMode) {
    message.warning('请选择规则模式');
    return;
  }

  const data = buildSubmitData();

  if (form.id) {
    await updateProductCostRule(data);
    message.success('修改成功');
  } else {
    await addProductCostRule(data);
    message.success('新增成功');
  }

  showModal.value = false;
  getList();
}

async function handleDelete(row: ProductCostRuleVO) {
  if (!row.id) return;
  await deleteProductCostRule(row.id);
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

onMounted(async () => {
  await loadProductTypes();
  getList();
});
</script>

<template>
  <NCard title="产品成本规则" :bordered="false">
    <NSpace vertical :size="16">
      <NForm inline label-placement="left">
        <NFormItem label="产品类型">
          <NSelect
            v-model:value="queryParams.productType"
            :options="productTypeOptions"
            clearable
            filterable
            style="width: 160px"
          />
        </NFormItem>

        <NFormItem label="修模来源">
          <NSelect
            v-model:value="queryParams.repairSource"
            :options="repairSourceOptions"
            clearable
            style="width: 130px"
          />
        </NFormItem>

        <NFormItem label="规则模式">
          <NSelect
            v-model:value="queryParams.ruleMode"
            :options="ruleModeOptions"
            clearable
            style="width: 130px"
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
        :scroll-x="1500"
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

    <NModal v-model:show="showModal" preset="card" :title="modalTitle" style="width: 760px">
      <NForm label-placement="left" label-width="130">
        <NFormItem label="产品类型" required>
          <NSelect v-model:value="form.productType" :options="productTypeOptions" filterable />
        </NFormItem>

        <NFormItem label="适用修模来源">
          <NSelect v-model:value="form.repairSource" :options="repairSourceOptions" />
        </NFormItem>

        <NFormItem label="规则模式">
          <NSelect v-model:value="form.ruleMode" :options="ruleModeOptions" />
        </NFormItem>

        <NFormItem v-if="form.ruleMode === 'RATIO'" label="比例基数">
          <NSelect v-model:value="form.ratioBase" :options="ratioBaseOptions" />
        </NFormItem>

        <NFormItem label="高清照片处理费">
          <NInputNumber v-model:value="form.hdAmount" :min="0" style="width: 200px" />
        </NFormItem>

        <NFormItem label="AI建模费">
          <NInputNumber v-model:value="form.aiModelAmount" :min="0" style="width: 200px" />
        </NFormItem>

        <template v-if="form.ruleMode === 'FIXED'">
          <NFormItem label="跟单业绩">
            <NInputNumber v-model:value="form.followAmount" :min="0" style="width: 200px" />
          </NFormItem>

          <NFormItem label="公司成本">
            <NInputNumber v-model:value="form.companyCostAmount" :min="0" style="width: 200px" />
          </NFormItem>

          <NFormItem label="修模师业绩">
            <NInputNumber v-model:value="form.repairManualAmount" :min="0" style="width: 200px" />
          </NFormItem>
        </template>

        <template v-if="form.ruleMode === 'RATIO'">
          <NFormItem label="公司成本比例%">
            <NInputNumber v-model:value="rateForm.companyCostRatePercent" :min="0" :max="100" style="width: 200px" />
          </NFormItem>

          <NFormItem label="跟单业绩比例%">
            <NInputNumber v-model:value="rateForm.followRatePercent" :min="0" :max="100" style="width: 200px" />
          </NFormItem>

          <NFormItem label="修模业绩比例%">
            <NInputNumber v-model:value="rateForm.repairManualRatePercent" :min="0" :max="100" style="width: 200px" />
          </NFormItem>
        </template>

        <NFormItem label="修模完成时限/h">
          <NInputNumber v-model:value="form.repairLimitHours" :min="1" style="width: 200px" />
        </NFormItem>

        <NFormItem label="提前提醒/min">
          <NInputNumber v-model:value="form.remindBeforeMinutes" :min="1" style="width: 200px" />
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
