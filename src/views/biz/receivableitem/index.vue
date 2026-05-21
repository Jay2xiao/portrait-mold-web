<script setup lang="ts">
import {computed, h, onMounted, reactive, ref} from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  NSpace,
  NStatistic,
  DataTableColumns,
  NTag,
  useMessage
} from 'naive-ui';

import {fetchUnbilledReceivableItems,fetchReceivableItemList, type ReceivableItemVO} from '@/service/api/biz/receivable-item';

import {createCustomerBill} from '@/service/api/biz/customer-bill';
import {fetchCustomerList} from '@/service/api/biz/customer';

type RowKey = string | number;

const message = useMessage();

const loading = ref(false);
const tableData = ref<ReceivableItemVO[]>([]);
const total = ref(0);

// 关键：勾选行 key
const checkedRowKeys = ref<RowKey[]>([]);

const customerOptions = ref<any[]>([]);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  customerId: undefined as string | number | undefined,
  orderNoSnapshot: '',
  itemType: '',
  billStatus: '',
  payStatus: ''
});


// 生成账单弹窗
const showBillModal = ref(false);
const billSubmitting = ref(false);

const billForm = reactive({
  customerId: undefined as string | number | undefined,
  billType: 'NORMAL',
  billDateValue: null as number | null,
  dueDateValue: null as number | null,
  remark: ''
});

const billStatusOptions = [
  { label: '未入账', value: 'UNBILLED' },
  { label: '已入账', value: 'BILLED' }
];


const itemTypeOptions = [
  {label: '修模费', value: 'REPAIR_FEE'},
  {label: '打印费', value: 'PRINT_FEE'},
  {label: '运费', value: 'DELIVERY_FEE'},
  {label: '其他费用', value: 'OTHER_FEE'},
  {label: '调整项', value: 'ADJUSTMENT'},
  {label: '优惠', value: 'DISCOUNT'}
];

const payStatusOptions = [
  {label: '未支付', value: 'UNPAID'},
  {label: '部分支付', value: 'PARTIAL'},
  {label: '已支付', value: 'PAID'}
];

const billTypeOptions = [
  {label: '普通账单', value: 'NORMAL'},
  {label: '周期结算账单', value: 'PERIODIC'},
  {label: '月结账单', value: 'MONTHLY'},
  {label: '手工账单', value: 'MANUAL'}
];

function money(value?: number) {
  return Number(value || 0).toFixed(2);
}

function itemTypeLabel(value?: string) {
  return itemTypeOptions.find(item => item.value === value)?.label || value || '-';
}

function payStatusLabel(value?: string) {
  return payStatusOptions.find(item => item.value === value)?.label || value || '-';
}

function payStatusTagType(value?: string) {
  if (value === 'PAID') return 'success';
  if (value === 'PARTIAL') return 'warning';
  return 'default';
}

function unwrapRows(res: any) {
  const data = res?.data || res;
  if (Array.isArray(data)) return data;
  return data?.rows || [];
}

function unwrapTotal(res: any) {
  const data = res?.data || res;
  return data?.total || 0;
}

function formatDateValue(value?: number | null) {
  if (!value) return undefined;

  const date = new Date(value);

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}


/**
 * 关键：row-key 一律转 string，避免 Java Long / JS number 类型不一致
 */
function rowKey(row: ReceivableItemVO) {
  return String(row.id);
}

/**
 * 关键：不能直接在模板里 checkedRowKeys = $event，建议用方法
 */
function handleUpdateCheckedRowKeys(keys: RowKey[]) {
  checkedRowKeys.value = keys.map(String);
}

/**
 * 当前页已选行
 */
const selectedRows = computed(() => {
  const keySet = new Set(checkedRowKeys.value.map(String));

  return tableData.value.filter(row => {
    if (row.id === undefined || row.id === null) return false;
    return keySet.has(String(row.id));
  });
});

/**
 * 已选应收项目 ID
 */
const selectedReceivableItemIds = computed(() => {
  return selectedRows.value
    .map(row => row.id)
    .filter(id => id !== undefined && id !== null);
});

/**
 * 已选客户
 */
const selectedCustomerIds = computed(() => {
  return Array.from(
    new Set(
      selectedRows.value
        .map(row => row.customerId)
        .filter(id => id !== undefined && id !== null)
        .map(String)
    )
  );
});

/**
 * 已选金额
 */
const selectedAmount = computed(() => {
  return selectedRows.value.reduce((sum, row) => {
    return sum + Number(row.unpaidAmount || 0);
  }, 0);
});

const columns: DataTableColumns<ReceivableItemVO> = [
  {
    type: 'selection' as const,
    width: 50,
    fixed: 'left' as const,
    disabled(row: ReceivableItemVO) {
      return row.billStatus !== 'UNBILLED'
        || row.payStatus === 'PAID'
        || row.status === 'CANCELLED';
    }
  },
  {
    title: '客户',
    key: 'customerNameSnapshot',
    width: 140,
    fixed: 'left' as const
  },
  {
    title: '订单号',
    key: 'orderNoSnapshot',
    width: 170,
    fixed: 'left' as const
  },
  {
    title: '费用类型',
    key: 'itemType',
    width: 110,
    render(row: ReceivableItemVO) {
      return itemTypeLabel(row.itemType);
    }
  },
  {
    title: '费用名称',
    key: 'itemName',
    width: 140
  },
  {
    title: '应收金额',
    key: 'amount',
    width: 110,
    render(row: ReceivableItemVO) {
      return money(row.amount);
    }
  },
  {
    title: '已收',
    key: 'paidAmount',
    width: 100,
    render(row: ReceivableItemVO) {
      return money(row.paidAmount);
    }
  },
  {
    title: '未收',
    key: 'unpaidAmount',
    width: 100,
    render(row: ReceivableItemVO) {
      return money(row.unpaidAmount);
    }
  },
  {
    title: '支付状态',
    key: 'payStatus',
    width: 110,
    render(row: ReceivableItemVO) {
      return h(
        NTag,
        {type: payStatusTagType(row.payStatus) as any},
        {default: () => payStatusLabel(row.payStatus)}
      );
    }
  },
  {
    title: '入账状态',
    key: 'billStatus',
    width: 110
  },
  {
    title: '账单号',
    key: 'billNoSnapshot',
    width: 170
  },
  {
    title: '确认时间',
    key: 'confirmTime',
    width: 170
  },
  {
    title: '备注',
    key: 'remark',
    width: 220,
    ellipsis: {
      tooltip: true
    }
  }
];

async function loadCustomers() {
  const res = await fetchCustomerList({
    pageNum: 1,
    pageSize: 999
  } as any);

  const rows = unwrapRows(res);

  customerOptions.value = rows.map((item: any) => ({
    label: `${item.customerName || ''} ${item.phone || ''}`,
    value: item.id
  }));
}

async function getList() {
  loading.value = true;

  try {
    const res = await fetchReceivableItemList(queryParams);
    tableData.value = unwrapRows(res);
    total.value = unwrapTotal(res);
    checkedRowKeys.value = [];
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.customerId = undefined;
  queryParams.orderNoSnapshot = '';
  queryParams.itemType = '';
  queryParams.payStatus = '';
  queryParams.pageNum = 1;
  getList();
}

/**
 * 打开生成账单弹窗
 */
function openCreateBill() {
  if (selectedRows.value.length === 0) {
    message.warning('请先勾选应收项目');
    return;
  }

  const invalid = selectedRows.value.some(row => row.billStatus !== 'UNBILLED' || row.payStatus === 'PAID');

  if (invalid) {
    message.warning('只能选择未入账、未收清的应收项目生成账单');
    return;
  }

  if (selectedCustomerIds.value.length > 1) {
    message.warning('只能选择同一个客户的应收项目生成账单');
    return;
  }

  billForm.customerId = selectedRows.value[0].customerId;
  billForm.billType = 'NORMAL';
  billForm.billDateValue = Date.now();
  billForm.dueDateValue = null;
  billForm.remark = '';

  showBillModal.value = true;
}

/**
 * 提交生成账单
 */
async function submitCreateBill() {
  if (selectedRows.value.length === 0) {
    message.warning('请选择应收项目');
    return;
  }

  if (selectedCustomerIds.value.length > 1) {
    message.warning('只能选择同一个客户的应收项目生成账单');
    return;
  }

  if (!billForm.customerId) {
    message.warning('客户不能为空');
    return;
  }

  if (selectedReceivableItemIds.value.length === 0) {
    message.warning('应收项目ID为空');
    return;
  }

  billSubmitting.value = true;

  try {
    await createCustomerBill({
      customerId: billForm.customerId,
      receivableItemIds: selectedReceivableItemIds.value,
      billType: billForm.billType,
      billDate: formatDateValue(billForm.billDateValue),
      dueDate: formatDateValue(billForm.dueDateValue),
      remark: billForm.remark
    });

    message.success('账单生成成功');

    showBillModal.value = false;
    checkedRowKeys.value = [];

    await getList();
  } finally {
    billSubmitting.value = false;
  }
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
  await loadCustomers();
  await getList();
});

</script>

<template>
  <NCard title="应收项目管理" :bordered="false">
    <NSpace vertical :size="16">
      <NAlert type="info">
        这里显示已确认、未入账、未收清的应收项目。可以勾选同一客户的多个订单费用生成一张客户账单。
      </NAlert>

      <NForm inline label-placement="left">
        <NFormItem label="客户">
          <NSelect
            v-model:value="queryParams.customerId"
            :options="customerOptions"
            filterable
            clearable
            style="width: 220px"
          />
        </NFormItem>

        <NFormItem label="订单号">
          <NInput v-model:value="queryParams.orderNoSnapshot" clearable placeholder="订单号"/>
        </NFormItem>

        <NFormItem label="费用类型">
          <NSelect
            v-model:value="queryParams.itemType"
            :options="itemTypeOptions"
            clearable
            style="width: 130px"
          />
        </NFormItem>

        <NFormItem label="支付状态">
          <NSelect
            v-model:value="queryParams.payStatus"
            :options="payStatusOptions"
            clearable
            style="width: 130px"
          />
        </NFormItem>

        <NFormItem>
          <NSpace>
            <NButton type="primary" @click="getList">查询</NButton>
            <NButton @click="resetQuery">重置</NButton>
            <NButton type="success" @click="openCreateBill">
              生成账单
            </NButton>

          </NSpace>
        </NFormItem>
      </NForm>

      <NSpace>
        <NStatistic label="已选项目数" :value="selectedRows.length"/>
        <NStatistic label="已选未收金额" :value="money(selectedAmount)"/>
      </NSpace>

      <NDataTable
        remote
        size="small"
        :loading="loading"
        :columns="columns"
        :data="tableData"
        :row-key="rowKey"
        :checked-row-keys="checkedRowKeys"
        :scroll-x="1700"
        @update:checked-row-keys="handleUpdateCheckedRowKeys"
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

    <NModal
      v-model:show="showBillModal"
      preset="card"
      title="生成客户账单"
      style="width: 640px"
    >
      <NForm label-placement="left" label-width="110">
        <NFormItem label="客户">
          <NSelect
            v-model:value="billForm.customerId"
            :options="customerOptions"
            disabled
          />
        </NFormItem>

        <NFormItem label="账单类型">
          <NSelect
            v-model:value="billForm.billType"
            :options="billTypeOptions"
          />
        </NFormItem>

        <NFormItem label="账单日期">
          <NDatePicker
            v-model:value="billForm.billDateValue"
            type="date"
            clearable
            style="width: 220px"
          />
        </NFormItem>

        <NFormItem label="到期日期">
          <NDatePicker
            v-model:value="billForm.dueDateValue"
            type="date"
            clearable
            style="width: 220px"
          />
        </NFormItem>


        <NFormItem label="已选项目数">
          <strong>{{ selectedRows.length }}</strong>
        </NFormItem>

        <NFormItem label="账单金额">
          <strong>{{ money(selectedAmount) }}</strong>
        </NFormItem>

        <NFormItem label="备注">
          <NInput
            v-model:value="billForm.remark"
            type="textarea"
            placeholder="请输入账单备注"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showBillModal = false">取消</NButton>
          <NButton
            type="primary"
            :loading="billSubmitting"
            @click="submitCreateBill"
          >
            确认生成
          </NButton>
        </NSpace>
      </template>
    </NModal>

  </NCard>
</template>
