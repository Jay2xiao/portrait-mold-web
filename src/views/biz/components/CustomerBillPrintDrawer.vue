<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  NButton,
  NDescriptions,
  NDescriptionsItem,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NResult,
  NSpace,
  NSpin,
  useMessage
} from 'naive-ui';
import { fetchCustomerBillDetail } from '@/service/api/biz/customer-bill';


import { fetchSystemConfigRuntimeMap } from '@/service/api/biz/system-config';

const runtimeConfig = ref<Record<string, string>>({});

async function loadRuntimeConfig() {
  const res = await fetchSystemConfigRuntimeMap();
  runtimeConfig.value = res.data || res || {};
}


defineOptions({
  name: 'CustomerBillPrintDrawer'
});

interface Props {
  show: boolean;
  billId?: string | number | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

const message = useMessage();

const loading = ref(false);
const printing = ref(false);
const detail = ref<any>(null);
const errorMsg = ref('');

const bill = computed(() => detail.value?.bill || {});
const items = computed(() => detail.value?.items || []);
const payments = computed(() => detail.value?.payments || []);

function close() {
  emit('update:show', false);
}

function money(value?: number | string | null) {
  return Number(value || 0).toFixed(2);
}

function safeText(value: any) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }
  return String(value);
}

function escapeHtml(value: any) {
  return safeText(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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

async function load() {
  if (!props.show || !props.billId) {
    return;
  }

  loading.value = true;
  errorMsg.value = '';
  detail.value = null;

  try {
    const res = await fetchCustomerBillDetail(props.billId);
    detail.value = res.data || res;
  } catch (error: any) {
    errorMsg.value = error?.message || '加载账单详情失败';
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.show,
  value => {
    if (value) {
      load();
      loadRuntimeConfig();
    }
  }
);

watch(
  () => props.billId,
  () => {
    if (props.show) {
      load();
    }
  }
);

/**
 * 只构建一份打印 HTML。
 * 注意：
 * 1. 只有一个 id="statement-print-page"
 * 2. 不设置 page-break-after: always
 * 3. 不设置 min-height: 297mm
 */
function buildPrintHtml() {
  const b = bill.value;

  const itemRows = items.value
    .map((item: any, index: number) => {
      return `
        <tr>
          <td class="center">${index + 1}</td>
          <td>${escapeHtml(item.orderNoSnapshot)}</td>
          <td>${escapeHtml(itemTypeLabel(item.itemType))}</td>
          <td>${escapeHtml(item.itemName)}</td>
          <td class="amount">${money(item.amount)}</td>
          <td class="amount">${money(item.paidAmount)}</td>
          <td class="amount">${money(item.unpaidAmount)}</td>
          <td>${escapeHtml(payStatusLabel(item.payStatus))}</td>
          <td>${escapeHtml(item.remark)}</td>
        </tr>
      `;
    })
    .join('');

  const paymentRows = payments.value
    .map((payment: any) => {
      return `
        <tr>
          <td>${escapeHtml(payment.paymentNo)}</td>
          <td>${escapeHtml(paymentTypeLabel(payment.paymentType))}</td>
          <td class="amount">${money(payment.payAmount)}</td>
          <td class="amount">${money(payment.allocatedAmount)}</td>
          <td class="amount">${money(payment.refundedAmount)}</td>
          <td>${escapeHtml(payment.payMethod)}</td>
          <td>${escapeHtml(payment.payTime)}</td>
        </tr>
      `;
    })
    .join('');

  const paymentSection = payments.value.length
    ? `
      <div class="section">
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
            ${paymentRows}
          </tbody>
        </table>
      </div>
    `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>客户对账单-${escapeHtml(b.billNo)}</title>
  <style>
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    body {
      color: #222222;
      font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    #statement-print-page {
      width: 100%;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    .statement-header {
      text-align: center;
      margin-bottom: 22px;
    }

    .statement-header h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: 4px;
      font-weight: 700;
    }

    .statement-subtitle {
      margin-top: 6px;
      color: #777777;
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

    table {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
    }

    th,
    td {
      border: 1px solid #333333;
      padding: 7px 8px;
      font-size: 13px;
      line-height: 1.5;
      vertical-align: middle;
      word-break: break-all;
    }

    th {
      background: #f2f2f2;
      font-weight: 600;
    }

    .info-table th {
      width: 110px;
      text-align: left;
    }

    .detail-table th {
      text-align: center;
    }

    .amount {
      text-align: right;
      white-space: nowrap;
    }

    .center {
      text-align: center;
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
      color: #777777;
      font-size: 12px;
    }

    @page {
      size: A4;
      margin: 12mm;
    }

    @media print {
      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }

      #statement-print-page {
        width: auto;
        margin: 0;
        padding: 0;
      }

      thead {
        display: table-header-group;
      }

      tfoot {
        display: table-footer-group;
      }

      tr {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .summary-section,
      .remark-section,
      .sign-section,
      .print-footer {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div id="statement-print-page">
    <div class="statement-header">
      <h1>客户对账单</h1>
      <div class="statement-subtitle">Customer Statement</div>
    </div>

    <div class="section">
      <table class="info-table">
        <tbody>
          <tr>
            <th>账单号</th>
            <td>${escapeHtml(b.billNo)}</td>
            <th>账单状态</th>
            <td>${escapeHtml(billStatusLabel(b.billStatus))}</td>
          </tr>
          <tr>
            <th>客户名称</th>
            <td>${escapeHtml(b.customerNameSnapshot)}</td>
            <th>客户电话</th>
            <td>${escapeHtml(b.customerPhoneSnapshot)}</td>
          </tr>
          <tr>
            <th>账单类型</th>
            <td>${escapeHtml(b.billType)}</td>
            <th>账单日期</th>
            <td>${escapeHtml(b.billDate)}</td>
          </tr>
          <tr>
            <th>结算周期</th>
            <td>${escapeHtml(b.settlementStartDate)} 至 ${escapeHtml(b.settlementEndDate)}</td>
            <th>到期日期</th>
            <td>${escapeHtml(b.dueDate)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">费用明细</div>

      <table class="detail-table">
        <thead>
          <tr>
            <th style="width: 46px;">序号</th>
            <th style="width: 145px;">订单号</th>
            <th style="width: 80px;">费用类型</th>
            <th style="width: 100px;">费用名称</th>
            <th class="amount" style="width: 80px;">金额</th>
            <th class="amount" style="width: 80px;">已收</th>
            <th class="amount" style="width: 80px;">未收</th>
            <th style="width: 80px;">支付状态</th>
            <th>备注</th>
          </tr>
        </thead>

        <tbody>
          ${itemRows || '<tr><td colspan="9" class="center">暂无明细</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="summary-section">
      <table class="summary-table">
        <tbody>
          <tr>
            <th>账单总金额</th>
            <td class="amount">${money(b.totalAmount)}</td>
          </tr>
          <tr>
            <th>已收金额</th>
            <td class="amount">${money(b.paidAmount)}</td>
          </tr>
          <tr>
            <th>未收金额</th>
            <td class="amount important">${money(b.unpaidAmount)}</td>
          </tr>
          <tr>
            <th>支付状态</th>
            <td>${escapeHtml(payStatusLabel(b.payStatus))}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${paymentSection}

    <div class="remark-section">
      <strong>备注：</strong>${escapeHtml(b.remark)}
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
</body>
</html>
  `;
}

/**
 * 稳定打印：
 * 1. 不用 srcdoc
 * 2. 不用 iframe.onload
 * 3. document.write 只写一次
 * 4. print() 只调用一次
 */
function printPdf() {
  if (!detail.value) {
    message.warning('暂无可打印数据');
    return;
  }

  if (printing.value) {
    return;
  }

  printing.value = true;

  const html = buildPrintHtml();

  // 调试：正常应该只有一个 id="statement-print-page"
  const pageMarkerCount = (html.match(/id="statement-print-page"/g) || []).length;
  if (pageMarkerCount !== 1) {
    // eslint-disable-next-line no-console
    console.warn('打印 HTML 页面容器数量异常：', pageMarkerCount);
  }

  const iframe = document.createElement('iframe');

  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.setAttribute('aria-hidden', 'true');

  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument || win?.document;

  if (!win || !doc) {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
    printing.value = false;
    message.error('创建打印窗口失败');
    return;
  }

  let printCalled = false;

  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      printing.value = false;
    }, 500);
  };

  win.onafterprint = cleanup;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    if (printCalled) {
      return;
    }

    printCalled = true;

    try {
      win.focus();
      win.print();

      // 兜底：部分浏览器不会触发 afterprint
      setTimeout(() => {
        if (printing.value) {
          cleanup();
        }
      }, 10000);
    } catch (error) {
      cleanup();
      message.error('调用浏览器打印失败');
    }
  }, 500);
}
</script>

<template>
  <NDrawer
    :show="show"
    width="1080"
    placement="right"
    @update:show="value => emit('update:show', value)"
  >
    <NDrawerContent title="客户对账单打印预览" closable>
      <template #header-extra>
        <NSpace>
          <NButton @click="close">关闭</NButton>
          <NButton
            type="primary"
            :loading="printing"
            :disabled="!detail || printing"
            @click="printPdf"
          >
            打印 / 另存为 PDF
          </NButton>
        </NSpace>
      </template>

      <NSpin :show="loading">
        <NResult
          v-if="errorMsg"
          status="error"
          title="加载失败"
          :description="errorMsg"
        />

        <NEmpty v-else-if="!detail && !loading" description="暂无数据" />

        <div v-else-if="detail" class="preview-page">
          <div class="statement-header">
            <h1>客户对账单</h1>
            <div class="statement-subtitle">Customer Statement</div>
          </div>

          <div class="section">
            <NDescriptions bordered :column="2" size="small">
              <NDescriptionsItem label="账单号">
                {{ bill.billNo || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="账单状态">
                {{ billStatusLabel(bill.billStatus) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="客户名称">
                {{ bill.customerNameSnapshot || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="客户电话">
                {{ bill.customerPhoneSnapshot || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="账单类型">
                {{ bill.billType || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="账单日期">
                {{ bill.billDate || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="结算周期">
                {{ bill.settlementStartDate || '-' }} 至 {{ bill.settlementEndDate || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="到期日期">
                {{ bill.dueDate || '-' }}
              </NDescriptionsItem>
            </NDescriptions>
          </div>

          <div class="section">
            <div class="section-title">费用明细</div>

            <table class="preview-table">
              <thead>
              <tr>
                <th>序号</th>
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
                <td colspan="9" class="center">暂无明细</td>
              </tr>
              </tbody>
            </table>
          </div>

          <div class="summary-section">
            <table class="summary-table">
              <tbody>
              <tr>
                <th>账单总金额</th>
                <td class="amount">{{ money(bill.totalAmount) }}</td>
              </tr>
              <tr>
                <th>已收金额</th>
                <td class="amount">{{ money(bill.paidAmount) }}</td>
              </tr>
              <tr>
                <th>未收金额</th>
                <td class="amount important">{{ money(bill.unpaidAmount) }}</td>
              </tr>
              <tr>
                <th>支付状态</th>
                <td>{{ payStatusLabel(bill.payStatus) }}</td>
              </tr>
              </tbody>
            </table>
          </div>

          <div v-if="payments.length" class="section">
            <div class="section-title">收款记录</div>

            <table class="preview-table">
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
        </div>
      </NSpin>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.preview-page {
  background: #fff;
  color: #222;
  padding: 8px 4px 32px;
}

.statement-header {
  text-align: center;
  margin-bottom: 24px;
}

.statement-header h1 {
  margin: 0;
  font-size: 26px;
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

.preview-table,
.summary-table {
  width: 100%;
  border-collapse: collapse;
}

.preview-table th,
.preview-table td,
.summary-table th,
.summary-table td {
  border: 1px solid #333;
  padding: 7px 8px;
  font-size: 13px;
  line-height: 1.5;
}

.preview-table th,
.summary-table th {
  background: #f2f2f2;
}

.amount {
  text-align: right;
}

.center {
  text-align: center;
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
  text-align: left;
}

.important {
  font-weight: 700;
  color: #d03050;
}
</style>
