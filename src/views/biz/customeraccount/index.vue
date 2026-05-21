<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NDrawer,
  NDrawerContent,
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
  fetchCustomerAccountLedgerList,
  fetchCustomerAccountList,
  type CustomerAccountLedgerVO,
  type CustomerAccountVO
} from '@/service/api/biz/customer-account';

import { recordCustomerPrepayment } from '@/service/api/biz/payment';
import { fetchCustomerList } from '@/service/api/biz/customer';
import BizFileUpload from '@/views/biz/components/BizFileUpload.vue';
import { refundCustomerBalance } from '@/service/api/biz/refund';


defineOptions({
  name: 'BizCustomerAccount'
});

const message = useMessage();

const loading = ref(false);
const tableData = ref<CustomerAccountVO[]>([]);
const total = ref(0);

const customerOptions = ref<any[]>([]);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  customerNameSnapshot: '',
  status: ''
});

const showLedgerDrawer = ref(false);
const ledgerLoading = ref(false);
const ledgerList = ref<CustomerAccountLedgerVO[]>([]);
const currentAccount = ref<CustomerAccountVO | null>(null);

const showPrepayModal = ref(false);
const prepayProofFileIds = ref<Array<string | number>>([]);

const showBalanceRefundModal = ref(false);
const currentRefundAccount = ref<CustomerAccountVO | null>(null);
const balanceRefundProofFileIds = ref<Array<string | number>>([]);

const balanceRefundForm = reactive({
  refundAmount: 0,
  refundMethod: 'WECHAT',
  receiverName: '',
  transactionNo: '',
  reason: '',
  remark: ''
});


const prepayForm = reactive({
  customerId: undefined as string | number | undefined,
  payAmount: 0,
  payMethod: 'WECHAT',
  payTime: '',
  payerName: '',
  transactionNo: '',
  remark: ''
});

const payMethodOptions = [
  { label: '微信', value: 'WECHAT' },
  { label: '支付宝', value: 'ALIPAY' },
  { label: '银行转账', value: 'BANK' },
  { label: '现金', value: 'CASH' },
  { label: '其他', value: 'OTHER' }
];

const statusOptions = [
  { label: '启用', value: 'ENABLE' },
  { label: '停用', value: 'DISABLE' }
];

const changeTypeOptions = [
  { label: '预收款', value: 'PREPAYMENT' },
  { label: '抵扣账单', value: 'ALLOCATE' },
  { label: '退款', value: 'REFUND' },
  { label: '超额转预收', value: 'OVERPAY' },
  { label: '调整', value: 'ADJUSTMENT' }
];

function money(value?: number) {
  return Number(value || 0).toFixed(2);
}

function changeTypeLabel(value?: string) {
  return changeTypeOptions.find(item => item.value === value)?.label || value || '-';
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
    title: '客户',
    key: 'customerNameSnapshot',
    width: 160,
    fixed: 'left' as const
  },
  {
    title: '当前余额',
    key: 'balanceAmount',
    width: 120,
    render(row: CustomerAccountVO) {
      return h(
        NTag,
        { type: Number(row.balanceAmount || 0) > 0 ? 'success' : 'default' },
        { default: () => money(row.balanceAmount) }
      );
    }
  },
  {
    title: '累计预收',
    key: 'totalPrepayAmount',
    width: 120,
    render(row: CustomerAccountVO) {
      return money(row.totalPrepayAmount);
    }
  },
  {
    title: '累计抵扣',
    key: 'totalConsumeAmount',
    width: 120,
    render(row: CustomerAccountVO) {
      return money(row.totalConsumeAmount);
    }
  },
  {
    title: '累计退款',
    key: 'totalRefundAmount',
    width: 120,
    render(row: CustomerAccountVO) {
      return money(row.totalRefundAmount);
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 100
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
    render(row: CustomerAccountVO) {
      return h(NSpace, {}, {
        default: () => [
          h(
            NButton,
            {
              size: 'small',
              onClick: () => openLedger(row)
            },
            { default: () => '流水' }
          ),
          h(
            NButton,
            {
              size: 'small',
              type: 'success',
              onClick: () => openPrepay(row)
            },
            { default: () => '预收款' }
          ),
          h(
            NButton,
            {
              size: 'small',
              type: 'warning',
              onClick: () => openBalanceRefund(row)
            },
            { default: () => '余额退款' }
          )
        ]
      });
    }
  }
];

const ledgerColumns = [
  {
    title: '变动类型',
    key: 'changeType',
    width: 120,
    render(row: CustomerAccountLedgerVO) {
      return changeTypeLabel(row.changeType);
    }
  },
  {
    title: '变动金额',
    key: 'changeAmount',
    width: 120,
    render(row: CustomerAccountLedgerVO) {
      return money(row.changeAmount);
    }
  },
  {
    title: '变动前',
    key: 'beforeBalance',
    width: 120,
    render(row: CustomerAccountLedgerVO) {
      return money(row.beforeBalance);
    }
  },
  {
    title: '变动后',
    key: 'afterBalance',
    width: 120,
    render(row: CustomerAccountLedgerVO) {
      return money(row.afterBalance);
    }
  },
  {
    title: '来源',
    key: 'sourceType',
    width: 120
  },
  {
    title: '来源编号',
    key: 'sourceNo',
    width: 160
  },
  {
    title: '时间',
    key: 'createTime',
    width: 170
  },
  {
    title: '备注',
    key: 'remark',
    width: 260,
    ellipsis: { tooltip: true }
  }
];

async function loadCustomers() {
  const res = await fetchCustomerList({
    pageNum: 1,
    pageSize: 999
  } as any);

  customerOptions.value = unwrapRows(res).map((item: any) => ({
    label: `${item.customerName || ''} ${item.phone || ''}`,
    value: item.id
  }));
}

async function getList() {
  loading.value = true;

  try {
    const res = await fetchCustomerAccountList(queryParams);
    tableData.value = unwrapRows(res);
    total.value = unwrapTotal(res);
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.customerNameSnapshot = '';
  queryParams.status = '';
  queryParams.pageNum = 1;
  getList();
}

async function openLedger(row: CustomerAccountVO) {
  currentAccount.value = row;
  showLedgerDrawer.value = true;
  ledgerLoading.value = true;

  try {
    const res = await fetchCustomerAccountLedgerList({
      pageNum: 1,
      pageSize: 100,
      customerId: row.customerId
    });

    ledgerList.value = unwrapRows(res);
  } finally {
    ledgerLoading.value = false;
  }
}

function openPrepay(row?: CustomerAccountVO) {
  prepayForm.customerId = row?.customerId;
  prepayForm.payAmount = 0;
  prepayForm.payMethod = 'WECHAT';
  prepayForm.payTime = '';
  prepayForm.payerName = '';
  prepayForm.transactionNo = '';
  prepayForm.remark = '';
  prepayProofFileIds.value = [];
  showPrepayModal.value = true;
}

async function submitPrepay() {
  if (!prepayForm.customerId) {
    message.warning('请选择客户');
    return;
  }

  if (!prepayForm.payAmount || prepayForm.payAmount <= 0) {
    message.warning('请输入预收金额');
    return;
  }

  await recordCustomerPrepayment({
    ...prepayForm,
    proofFileIds: prepayProofFileIds.value.join(',')
  });

  message.success('预收款登记成功');
  showPrepayModal.value = false;
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

function openBalanceRefund(row: CustomerAccountVO) {
  if (Number(row.balanceAmount || 0) <= 0) {
    message.warning('客户余额不足，不能退款');
    return;
  }

  currentRefundAccount.value = row;
  balanceRefundForm.refundAmount = Number(row.balanceAmount || 0);
  balanceRefundForm.refundMethod = 'WECHAT';
  balanceRefundForm.receiverName = '';
  balanceRefundForm.transactionNo = '';
  balanceRefundForm.reason = '';
  balanceRefundForm.remark = '';
  balanceRefundProofFileIds.value = [];

  showBalanceRefundModal.value = true;
}

async function submitBalanceRefund() {
  if (!currentRefundAccount.value?.customerId) return;

  if (!balanceRefundForm.refundAmount || balanceRefundForm.refundAmount <= 0) {
    message.warning('请输入退款金额');
    return;
  }

  if (!balanceRefundForm.reason) {
    message.warning('请输入退款原因');
    return;
  }

  await refundCustomerBalance({
    customerId: currentRefundAccount.value.customerId,
    ...balanceRefundForm,
    proofFileIds: balanceRefundProofFileIds.value.join(',')
  });

  message.success('余额退款成功');
  showBalanceRefundModal.value = false;
  getList();
}


onMounted(async () => {
  await loadCustomers();
  getList();
});
</script>

<template>
  <NCard title="客户账户余额" :bordered="false">
    <NSpace vertical :size="16">
      <NForm inline label-placement="left">
        <NFormItem label="客户">
          <NInput
            v-model:value="queryParams.customerNameSnapshot"
            clearable
            placeholder="请输入客户名"
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
            <NButton type="success" @click="openPrepay()">登记预收款</NButton>
          </NSpace>
        </NFormItem>
      </NForm>

      <NDataTable
        remote
        size="small"
        :loading="loading"
        :columns="columns"
        :data="tableData"
        :scroll-x="1200"
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

    <NDrawer v-model:show="showLedgerDrawer" width="860" placement="right">
      <NDrawerContent title="客户账户流水" closable>
        <NDataTable
          size="small"
          :loading="ledgerLoading"
          :columns="ledgerColumns"
          :data="ledgerList"
          :scroll-x="1200"
        />
      </NDrawerContent>
    </NDrawer>

    <NModal v-model:show="showPrepayModal" preset="card" title="登记客户预收款" style="width: 680px">
      <NForm label-placement="left" label-width="120">
        <NFormItem label="客户" required>
          <NSelect
            v-model:value="prepayForm.customerId"
            :options="customerOptions"
            filterable
            clearable
          />
        </NFormItem>

        <NFormItem label="预收金额" required>
          <NInputNumber
            v-model:value="prepayForm.payAmount"
            :min="0"
            style="width: 220px"
          />
        </NFormItem>

        <NFormItem label="支付方式">
          <NSelect v-model:value="prepayForm.payMethod" :options="payMethodOptions" />
        </NFormItem>

        <NFormItem label="付款人">
          <NInput v-model:value="prepayForm.payerName" />
        </NFormItem>

        <NFormItem label="支付凭证">
          <BizFileUpload
            v-model="prepayProofFileIds"
            biz-type="TEMP"
            file-stage="PAYMENT"
            file-type="PAYMENT_PROOF"
            :max="5"
          />
        </NFormItem>

        <NFormItem label="备注">
          <NInput v-model:value="prepayForm.remark" type="textarea" />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showPrepayModal = false">取消</NButton>
          <NButton type="primary" @click="submitPrepay">确认登记</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal
      v-model:show="showBalanceRefundModal"
      preset="card"
      title="客户余额退款"
      style="width: 640px"
    >
      <NForm label-placement="left" label-width="120">
        <NFormItem label="客户">
          <NInput :value="currentRefundAccount?.customerNameSnapshot" disabled />
        </NFormItem>

        <NFormItem label="当前余额">
          <strong>{{ money(currentRefundAccount?.balanceAmount) }}</strong>
        </NFormItem>

        <NFormItem label="退款金额" required>
          <NInputNumber
            v-model:value="balanceRefundForm.refundAmount"
            :min="0"
            :max="Number(currentRefundAccount?.balanceAmount || 0)"
            style="width: 220px"
          />
        </NFormItem>

        <NFormItem label="退款方式">
          <NSelect
            v-model:value="balanceRefundForm.refundMethod"
            :options="payMethodOptions"
          />
        </NFormItem>

        <NFormItem label="退款接收人">
          <NInput v-model:value="balanceRefundForm.receiverName" />
        </NFormItem>

        <NFormItem label="退款流水号">
          <NInput v-model:value="balanceRefundForm.transactionNo" />
        </NFormItem>

        <NFormItem label="退款凭证">
          <BizFileUpload
            v-model="balanceRefundProofFileIds"
            biz-type="TEMP"
            file-stage="REFUND"
            file-type="REFUND_PROOF"
            :max="5"
          />
        </NFormItem>

        <NFormItem label="退款原因" required>
          <NInput
            v-model:value="balanceRefundForm.reason"
            type="textarea"
          />
        </NFormItem>

        <NFormItem label="备注">
          <NInput
            v-model:value="balanceRefundForm.remark"
            type="textarea"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showBalanceRefundModal = false">取消</NButton>
          <NButton type="warning" @click="submitBalanceRefund">
            确认退款
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </NCard>
</template>
