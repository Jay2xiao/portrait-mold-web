<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { NButton, NResult, NSpace, NSpin } from 'naive-ui';
import { fetchCustomerBillDetail } from '@/service/api/biz/customer-bill';

defineOptions({
  name: 'BizCustomerBillPrint'
});

const route = useRoute();

const loading = ref(false);
const detail = ref<any>(null);
const errorMsg = ref('');

const billId = computed(() => route.query.billId as string);

const bill = computed(() => detail.value?.bill || {});
const items = computed(() => detail.value?.items || []);
const payments = computed(() => detail.value?.payments || []);

function money(value?: number) {
  return Number(value || 0).toFixed(2);
}

function itemTypeLabel(value?: string) {
  const map: Record<string, string> = {
    REPAIR_FEE: '修模费',
    PRINT_FEE: '打印费',
    DELIVERY_FEE: '运费',
    OTHER_FEE: '其他费用',
    ADJUSTMENT: '调整项',
    DISCOUNT: '优惠'
  };

  return map[value || ''] || value || '-';
}

function payStatusLabel(value?: string) {
  const map: Record<string, string> = {
    UNPAID: '未支付',
    PARTIAL: '部分支付',
    PAID: '已支付',
    CANCELLED: '已取消'
  };

  return map[value || ''] || value || '-';
}

function billStatusLabel(value?: string) {
  const map: Record<string, string> = {
    DRAFT: '草稿',
    CONFIRMED: '已确认',
    CANCELLED: '已作废'
  };

  return map[value || ''] || value || '-';
}

function paymentTypeLabel(value?: string) {
  const map: Record<string, string> = {
    BILL_PAYMENT: '账单收款',
    PREPAYMENT: '预收款',
    PREPAYMENT_ALLOCATE: '预收余额抵扣'
  };

  return map[value || ''] || value || '-';
}

function printPage() {
  window.print();
}

function closePage() {
  window.close();
}

async function loadDetail() {
  if (!billId.value) {
    errorMsg.value = '账单ID为空';
    return;
  }

  loading.value = true;

  try {
    const res = await fetchCustomerBillDetail(billId.value);
    detail.value = res.data || res;

    if (route.query.autoPrint === '1') {
      await nextTick();
      setTimeout(() => {
        window.print();
      }, 300);
    }
  } catch (error: any) {
    errorMsg.value = error?.message || '加载账单详情失败';
  } finally {
    loading.value = false;
  }
}

onMounted(loadDetail);
</script>

<template>
  <div class="print-wrapper">
    <div class="print-toolbar no-print">
      <NSpace justify="end">
        <NButton @click="closePage">关闭</NButton>
        <NButton type="primary" @click="printPage">
          打印 / 另存为 PDF
        </NButton>
      </NSpace>
    </div>

    <NSpin :show="loading">
      <NResult
        v-if="errorMsg"
        status="error"
        title="加载失败"
        :description="errorMsg"
      />

      <div v-else-if="detail" class="statement-page">
        <div class="statement-header">
          <h1>客户对账单</h1>
          <div class="statement-subtitle">
            Customer Statement
          </div>
        </div>

        <div class="section">
          <table class="info-table">
            <tbody>
            <tr>
              <th>账单号</th>
              <td>{{ bill.billNo || '-' }}</td>
              <th>账单状态</th>
              <td>{{ billStatusLabel(bill.billStatus) }}</td>
            </tr>
            <tr>
              <th>客户名称</th>
              <td>{{ bill.customerNameSnapshot || '-' }}</td>
              <th>客户电话</th>
              <td>{{ bill.customerPhoneSnapshot || '-' }}</td>
            </tr>
            <tr>
              <th>账单类型</th>
              <td>{{ bill.billType || '-' }}</td>
              <th>账单日期</th>
              <td>{{ bill.billDate || '-' }}</td>
            </tr>
            <tr>
              <th>结算周期</th>
              <td>
                {{ bill.settlementStartDate || '-' }}
                至
                {{ bill.settlementEndDate || '-' }}
              </td>
              <th>到期日期</th>
              <td>{{ bill.dueDate || '-' }}</td>
            </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">费用明细</div>

          <table class="detail-table">
            <thead>
            <tr>
              <th style="width: 48px">序号</th>
              <th>订单号</th>
              <th>费用类型</th>
              <th>费用名称</th>
              <th class="amount">金额</th>
              <th class="amount">已收</th>
              <th class="amount">未收</th>
              <th>支付状态</th>
              <th>备注</th>
            </tr>
            </thead>

            <tbody>
            <tr v-for="(item, index) in items" :key="item.id || index">
              <td class="center">{{ index + 1 }}</td>
              <td>{{ item.orderNoSnapshot || '-' }}</td>
              <td>{{ itemTypeLabel(item.itemType) }}</td>
              <td>{{ item.itemName || '-' }}</td>
              <td class="amount">{{ money(item.amount) }}</td>
              <td class="amount">{{ money(item.paidAmount) }}</td>
              <td class="amount">{{ money(item.unpaidAmount) }}</td>
              <td>{{ payStatusLabel(item.payStatus) }}</td>
              <td>{{ item.remark || '-' }}</td>
            </tr>

            <tr v-if="items.length === 0">
              <td colspan="9" class="center empty">暂无明细</td>
            </tr>
            </tbody>
          </table>
        </div>

        <div class="summary-section">
          <table class="summary-table">
            <tbody>
            <tr>
              <th>账单总金额</th>
              <td>{{ money(bill.totalAmount) }}</td>
            </tr>
            <tr>
              <th>已收金额</th>
              <td>{{ money(bill.paidAmount) }}</td>
            </tr>
            <tr>
              <th>未收金额</th>
              <td class="important">{{ money(bill.unpaidAmount) }}</td>
            </tr>
            <tr>
              <th>支付状态</th>
              <td>{{ payStatusLabel(bill.payStatus) }}</td>
            </tr>
            </tbody>
          </table>
        </div>

        <div class="section" v-if="payments.length">
          <div class="section-title">收款记录</div>

          <table class="detail-table">
            <thead>
            <tr>
              <th>收款单号</th>
              <th>类型</th>
              <th class="amount">收款金额</th>
              <th class="amount">已核销</th>
              <th class="amount">已退款</th>
              <th>支付方式</th>
              <th>支付时间</th>
            </tr>
            </thead>

            <tbody>
            <tr v-for="payment in payments" :key="payment.id">
              <td>{{ payment.paymentNo || '-' }}</td>
              <td>{{ paymentTypeLabel(payment.paymentType) }}</td>
              <td class="amount">{{ money(payment.payAmount) }}</td>
              <td class="amount">{{ money(payment.allocatedAmount) }}</td>
              <td class="amount">{{ money(payment.refundedAmount) }}</td>
              <td>{{ payment.payMethod || '-' }}</td>
              <td>{{ payment.payTime || '-' }}</td>
            </tr>
            </tbody>
          </table>
        </div>

        <div class="remark-section">
          <div>
            <strong>备注：</strong>{{ bill.remark || '-' }}
          </div>
        </div>

        <div class="sign-section">
          <div>客户确认：</div>
          <div>经办人：</div>
          <div>日期：</div>
        </div>

        <div class="print-footer">
          本对账单由系统生成，请核对无误后确认。
        </div>
      </div>
    </NSpin>
  </div>
</template>

<style scoped>
.print-wrapper {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24px;
}

.print-toolbar {
  max-width: 980px;
  margin: 0 auto 16px;
}

.statement-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 32px;
  background: #fff;
  color: #222;
  box-shadow: 0 2px 12px rgb(0 0 0 / 10%);
}

.statement-header {
  text-align: center;
  margin-bottom: 24px;
}

.statement-header h1 {
  margin: 0;
  font-size: 28px;
  letter-spacing: 4px;
}

.statement-subtitle {
  margin-top: 6px;
  color: #777;
  font-size: 13px;
}

.section {
  margin-top: 18px;
}

.section-title {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 8px;
}

.info-table,
.detail-table,
.summary-table {
  width: 100%;
  border-collapse: collapse;
}

.info-table th,
.info-table td,
.detail-table th,
.detail-table td,
.summary-table th,
.summary-table td {
  border: 1px solid #333;
  padding: 7px 8px;
  font-size: 13px;
  line-height: 1.5;
}

.info-table th {
  width: 110px;
  background: #f2f2f2;
  text-align: left;
}

.detail-table th {
  background: #f2f2f2;
}

.amount {
  text-align: right;
}

.center {
  text-align: center;
}

.empty {
  color: #999;
}

.summary-section {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.summary-table {
  width: 320px;
}

.summary-table th {
  width: 140px;
  background: #f2f2f2;
  text-align: left;
}

.important {
  font-weight: 700;
  color: #d03050;
}

.remark-section {
  margin-top: 18px;
  font-size: 13px;
}

.sign-section {
  display: flex;
  justify-content: space-between;
  margin-top: 42px;
  font-size: 14px;
}

.print-footer {
  margin-top: 32px;
  text-align: center;
  color: #777;
  font-size: 12px;
}

@media print {
  @page {
    size: A4;
    margin: 12mm;
  }

  .no-print {
    display: none !important;
  }

  .print-wrapper {
    padding: 0;
    background: #fff;
  }

  .statement-page {
    max-width: none;
    margin: 0;
    padding: 0;
    box-shadow: none;
  }

  .section {
    page-break-inside: avoid;
  }

  .detail-table tr {
    page-break-inside: avoid;
  }

  body {
    background: #fff;
  }
}
</style>
