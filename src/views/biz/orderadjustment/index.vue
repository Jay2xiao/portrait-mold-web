<script setup lang="ts">
import { h, onMounted, reactive, ref, computed } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSpace,
  NTag,
  useMessage
} from 'naive-ui';

import {
  createOrderAmountAdjustment,
  fetchOrderAdjustmentList,
  type OrderAdjustmentVO
} from '@/service/api/biz/order-adjustment';

import { fetchOrderList, type OrderVO } from '@/service/api/biz/order';

import { fetchOrderDetail } from '@/service/api/biz/order';
import { adjustOrderReceivableToAmount } from '@/service/api/biz/order-adjustment';


defineOptions({
  name: 'BizOrderAdjustment'
});

const message = useMessage();

const loading = ref(false);
const tableData = ref<OrderAdjustmentVO[]>([]);
const currentReceivableItems = ref<any[]>([]);

const total = ref(0);

const orderOptions = ref<any[]>([]);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  adjustNo: '',
  orderNoSnapshot: '',
  customerNameSnapshot: '',
  adjustType: '',
  itemType: ''
});

const showModal = ref(false);

const form = reactive({
  orderId: undefined as string | number | undefined,
  itemType: 'OTHER_FEE',
  currentAmount: 0,
  afterAmount: 0,
  reason: '',
  remark: ''
});

const adjustTypeOptions = [
  { label: '金额调整', value: 'AMOUNT' },
  { label: '地址调整', value: 'ADDRESS' },
  { label: '文件调整', value: 'FILE' },
  { label: '状态调整', value: 'STATUS' },
  { label: '其他', value: 'OTHER' }
];

const itemTypeOptions = [
  { label: '修模费', value: 'REPAIR_FEE' },
  { label: '打印费', value: 'PRINT_FEE' },
  { label: '运费', value: 'DELIVERY_FEE' },
  { label: '其他费用', value: 'OTHER_FEE' }
];

const diffAmount = computed(() => {
  return Number((Number(form.afterAmount || 0) - Number(form.currentAmount || 0)).toFixed(2));
});


function money(value?: number) {
  return Number(value || 0).toFixed(2);
}

function itemTypeLabel(value?: string) {
  return itemTypeOptions.find(item => item.value === value)?.label || value || '-';
}

function adjustTypeLabel(value?: string) {
  return adjustTypeOptions.find(item => item.value === value)?.label || value || '-';
}

function unwrapRows(res: any) {
  const data = res?.data || res;
  return data?.rows || [];
}

function unwrapTotal(res: any) {
  const data = res?.data || res;
  return data?.total || 0;
}

const columns = [
  {
    title: '调整单号',
    key: 'adjustNo',
    width: 180,
    fixed: 'left' as const
  },
  {
    title: '订单号',
    key: 'orderNoSnapshot',
    width: 170,
    fixed: 'left' as const
  },
  {
    title: '客户',
    key: 'customerNameSnapshot',
    width: 140,
    fixed: 'left' as const
  },
  {
    title: '调整类型',
    key: 'adjustType',
    width: 120,
    render(row: OrderAdjustmentVO) {
      return adjustTypeLabel(row.adjustType);
    }
  },
  {
    title: '费用类型',
    key: 'itemType',
    width: 120,
    render(row: OrderAdjustmentVO) {
      return itemTypeLabel(row.itemType);
    }
  },
  {
    title: '调整前',
    key: 'beforeAmount',
    width: 110,
    render(row: OrderAdjustmentVO) {
      return money(row.beforeAmount);
    }
  },
  {
    title: '调整后',
    key: 'afterAmount',
    width: 110,
    render(row: OrderAdjustmentVO) {
      return money(row.afterAmount);
    }
  },
  {
    title: '差额',
    key: 'diffAmount',
    width: 110,
    render(row: OrderAdjustmentVO) {
      const amount = Number(row.diffAmount || row.adjustAmount || 0);

      return h(
        NTag,
        { type: amount >= 0 ? 'warning' : 'success' },
        { default: () => money(amount) }
      );
    }
  },
  {
    title: '原因',
    key: 'reason',
    width: 260,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '审批状态',
    key: 'approveStatus',
    width: 120
  },
  {
    title: '生效状态',
    key: 'effectStatus',
    width: 120
  },
  {
    title: '操作人',
    key: 'operatorName',
    width: 120
  },
  {
    title: '创建时间',
    key: 'createTime',
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

async function loadOrders() {
  const res = await fetchOrderList({
    pageNum: 1,
    pageSize: 300
  } as any);

  const rows = unwrapRows(res) as OrderVO[];

  orderOptions.value = rows.map(row => ({
    label: `${row.orderNo || ''} / ${row.customerNameSnapshot || ''} / ${row.productName || ''}`,
    value: row.id
  }));
}

async function getList() {
  loading.value = true;

  try {
    const res = await fetchOrderAdjustmentList(queryParams);
    tableData.value = unwrapRows(res);
    total.value = unwrapTotal(res);
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.adjustNo = '';
  queryParams.orderNoSnapshot = '';
  queryParams.customerNameSnapshot = '';
  queryParams.adjustType = '';
  queryParams.itemType = '';
  queryParams.pageNum = 1;
  getList();
}

function openAdd() {
  form.orderId = undefined;
  form.itemType = 'OTHER_FEE';
  form.afterAmount = 0;
  form.reason = '';
  form.remark = '';
  showModal.value = true;
}

async function submitAdjustment() {
  if (!form.orderId) {
    message.warning('请选择订单');
    return;
  }

  if (!form.itemType) {
    message.warning('请选择费用类型');
    return;
  }

  if (form.afterAmount === undefined || form.afterAmount === null) {
    message.warning('请输入调整后金额');
    return;
  }

  if (Number(form.afterAmount) < 0) {
    message.warning('调整后金额不能小于0');
    return;
  }

  if (!form.reason) {
    message.warning('请输入调整原因');
    return;
  }

  if (diffAmount.value === 0) {
    message.warning('调整后金额与当前金额一致');
    return;
  }

  await adjustOrderReceivableToAmount({
    orderId: form.orderId,
    itemType: form.itemType,
    afterAmount: form.afterAmount,
    reason: form.reason,
    remark: form.remark
  });

  message.success('订单金额调整已生效');
  showModal.value = false;
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

function unwrapData<T = any>(res: any): T {
  return res?.data ?? res;
}


async function handleOrderChange(orderId: string | number) {
  form.currentAmount = 0;
  form.afterAmount = 0;
  currentReceivableItems.value = [];

  if (!orderId) return;

  const res = await fetchOrderDetail(orderId);

  const orderDetail = unwrapData<any>(res);

  currentReceivableItems.value = Array.isArray(orderDetail?.receivableItems)
    ? orderDetail.receivableItems
    : [];

  // 默认优先选择修模费
  const repairItem = currentReceivableItems.value.find(item => item.itemType === 'REPAIR_FEE');

  if (repairItem) {
    form.itemType = 'REPAIR_FEE';
    form.currentAmount = Number(repairItem.amount || 0);
    form.afterAmount = Number(repairItem.amount || 0);
  }
}

function handleItemTypeChange(value: string) {
  const receivableItem = currentReceivableItems.value.find(currentItem => currentItem.itemType === value);

  if (!receivableItem) {
    form.currentAmount = 0;
    form.afterAmount = 0;
    message.warning('该订单下没有对应应收项目');
    return;
  }

  form.currentAmount = Number(receivableItem.amount || 0);
  form.afterAmount = Number(receivableItem.amount || 0);
}


onMounted(async () => {
  await loadOrders();
  getList();
});
</script>

<template>
  <NCard title="订单调整记录" :bordered="false">
    <NSpace vertical :size="16">
      <NForm inline label-placement="left">
        <NFormItem label="调整单号">
          <NInput v-model:value="queryParams.adjustNo" clearable placeholder="调整单号" />
        </NFormItem>

        <NFormItem label="订单号">
          <NInput v-model:value="queryParams.orderNoSnapshot" clearable placeholder="订单号" />
        </NFormItem>

        <NFormItem label="客户">
          <NInput v-model:value="queryParams.customerNameSnapshot" clearable placeholder="客户名" />
        </NFormItem>

        <NFormItem label="调整类型">
          <NSelect
            v-model:value="queryParams.adjustType"
            :options="adjustTypeOptions"
            clearable
            style="width: 130px"
          />
        </NFormItem>

        <NFormItem label="费用类型">
          <NSelect
            v-model:value="queryParams.itemType"
            :options="itemTypeOptions"
            clearable
            style="width: 130px"
          />
        </NFormItem>

        <NFormItem>
          <NSpace>
            <NButton type="primary" @click="getList">查询</NButton>
            <NButton @click="resetQuery">重置</NButton>
            <NButton type="success" @click="openAdd">新增金额调整</NButton>
          </NSpace>
        </NFormItem>
      </NForm>

      <NDataTable
        remote
        size="small"
        :loading="loading"
        :columns="columns"
        :data="tableData"
        :scroll-x="1800"
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

    <NModal v-model:show="showModal" preset="card" title="新增订单金额调整" style="width: 680px">
      <NForm label-placement="left" label-width="120">
        <NFormItem label="订单" required>
          <NSelect
            v-model:value="form.orderId"
            :options="orderOptions"
            filterable
            clearable
            placeholder="请选择订单"
            @update:value="handleOrderChange"
          />
        </NFormItem>

        <NFormItem label="费用类型" required>
          <NSelect
            v-model:value="form.itemType"
            :options="itemTypeOptions"
            @update:value="handleItemTypeChange"
          />
        </NFormItem>

        <NFormItem label="当前金额">
          <strong>{{ money(form.currentAmount) }}</strong>
        </NFormItem>

        <NFormItem label="调整后金额" required>
          <NInputNumber
            v-model:value="form.afterAmount"
            :min="0"
            style="width: 220px"
            placeholder="请输入调整后的最终金额"
          />
        </NFormItem>

        <NFormItem label="调整差额">
          <NTag :type="diffAmount >= 0 ? 'warning' : 'success'">
            {{ money(diffAmount) }}
          </NTag>
          <span style="margin-left: 8px; color: #999">
    正数为加收，负数为减免
  </span>
        </NFormItem>

        <NFormItem label="调整原因" required>
          <NInput
            v-model:value="form.reason"
            type="textarea"
            placeholder="请输入调整原因"
          />
        </NFormItem>

        <NFormItem label="备注">
          <NInput
            v-model:value="form.remark"
            type="textarea"
          />
        </NFormItem>

      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showModal = false">取消</NButton>
          <NButton type="primary" @click="submitAdjustment">确认调整</NButton>
        </NSpace>
      </template>
    </NModal>
  </NCard>
</template>
