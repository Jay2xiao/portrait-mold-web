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

import { fetchPerformanceSettlementDetail } from '@/service/api/biz/performance-settlement';

defineOptions({
  name: 'StaffPerformanceSettlementPrintDrawer'
});

interface Props {
  show: boolean;
  settlementId?: string | number | null;
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

const settlement = computed(() => detail.value?.settlement || {});
const items = computed(() => detail.value?.items || []);

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

function settlementTypeLabel(value?: string) {
  const map: Record<string, string> = {
    REPAIR: '修模师业绩',
    PRINT: '打印员业绩',
    FOLLOW: '跟单员业绩'
  };

  return map[value || ''] || value || '-';
}

function settlementSourceLabel(value?: string) {
  const map: Record<string, string> = {
    NORMAL: '正常业绩',
    ADJUSTMENT: '调整业绩',
    MIXED: '混合'
  };

  return map[value || ''] || value || '-';
}

function sourceTypeLabel(value?: string) {
  const map: Record<string, string> = {
    PERFORMANCE: '正常业绩',
    ADJUSTMENT: '调整单'
  };

  return map[value || ''] || value || '-';
}

function statusLabel(value?: string) {
  const map: Record<string, string> = {
    DRAFT: '草稿',
    CONFIRMED: '已确认',
    CANCELLED: '已作废'
  };

  return map[value || ''] || value || '-';
}

function adjustAmountClass(value?: number) {
  return Number(value || 0) >= 0 ? 'positive' : 'negative';
}

async function load() {
  if (!props.show || !props.settlementId) {
    return;
  }

  loading.value = true;
  errorMsg.value = '';
  detail.value = null;

  try {
    const res = await fetchPerformanceSettlementDetail(props.settlementId);
    detail.value = res.data || res;
  } catch (error: any) {
    errorMsg.value = error?.message || '加载业绩结算单详情失败';
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.show,
  value => {
    if (value) {
      load();
    }
  }
);

watch(
  () => props.settlementId,
  () => {
    if (props.show) {
      load();
    }
  }
);

function buildPrintHtml() {
  const s = settlement.value;

  const itemRows = items.value
    .map((item: any, index: number) => {
      const amountClass = Number(item.performanceAmount || 0) >= 0 ? 'positive' : 'negative';

      return `
        <tr>
          <td class="center">${Number(index) + 1}</td>
          <td>${escapeHtml(sourceTypeLabel(item.sourceType))}</td>
          <td>${escapeHtml(item.adjustmentNoSnapshot)}</td>
          <td>${escapeHtml(item.orderNoSnapshot)}</td>
          <td>${escapeHtml(item.customerNameSnapshot)}</td>
          <td>${escapeHtml(item.orderType)}</td>
          <td class="amount">${money(item.beforePerformanceAmount)}</td>
          <td class="amount">${money(item.afterPerformanceAmount)}</td>
          <td class="amount ${amountClass}">${money(item.performanceAmount)}</td>
          <td class="amount">${money(item.relatedReceivableAmount)}</td>
          <td class="amount">${money(item.relatedProfitAmount)}</td>
          <td>${escapeHtml(item.orderCreateTime)}</td>
        </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>员工绩效结算单-${escapeHtml(s.settlementNo)}</title>

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

    #performance-settlement-print-page {
      width: 100%;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    .print-header {
      text-align: center;
      margin-bottom: 22px;
    }

    .print-header h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: 4px;
      font-weight: 700;
    }

    .print-subtitle {
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

    .amount {
      text-align: right;
      white-space: nowrap;
    }

    .center {
      text-align: center;
    }

    .positive {
      color: #18a058;
      font-weight: 600;
    }

    .negative {
      color: #d03050;
      font-weight: 600;
    }

    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 18px;
    }

    .summary-table {
      width: 360px;
    }

    .summary-table th {
      width: 150px;
      text-align: left;
    }

    .sign-section {
      display: flex;
      justify-content: space-between;
      margin-top: 46px;
      font-size: 14px;
    }

    .print-footer {
      margin-top: 32px;
      text-align: center;
      color: #777777;
      font-size: 12px;
    }

    @page {
      size: A4 landscape;
      margin: 10mm;
    }

    @media print {
      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }

      #performance-settlement-print-page {
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
      .sign-section,
      .print-footer {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  </style>
</head>

<body>
  <div id="performance-settlement-print-page">
    <div class="print-header">
      <h1>员工绩效结算单</h1>
      <div class="print-subtitle">Staff Performance Settlement</div>
    </div>

    <div class="section">
      <table class="info-table">
        <tbody>
          <tr>
            <th>结算单号</th>
            <td>${escapeHtml(s.settlementNo)}</td>
            <th>结算状态</th>
            <td>${escapeHtml(statusLabel(s.status))}</td>
            <th>结算来源</th>
            <td>${escapeHtml(settlementSourceLabel(s.settlementSource))}</td>
          </tr>
          <tr>
            <th>结算类型</th>
            <td>${escapeHtml(settlementTypeLabel(s.settlementType))}</td>
            <th>员工</th>
            <td>${escapeHtml(s.userName)}</td>
            <th>明细数量</th>
            <td>${escapeHtml(s.itemCount)}</td>
          </tr>
          <tr>
            <th>结算周期</th>
            <td>${escapeHtml(s.periodStartDate)} 至 ${escapeHtml(s.periodEndDate)}</td>
            <th>确认人</th>
            <td>${escapeHtml(s.confirmUserName)}</td>
            <th>确认时间</th>
            <td>${escapeHtml(s.confirmTime)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="summary-section">
      <table class="summary-table">
        <tbody>
          <tr>
            <th>业绩总额</th>
            <td class="amount">${money(s.totalPerformanceAmount)}</td>
          </tr>
          <tr>
            <th>关联应收</th>
            <td class="amount">${money(s.totalReceivableAmount)}</td>
          </tr>
          <tr>
            <th>关联利润</th>
            <td class="amount">${money(s.totalProfitAmount)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">结算明细</div>

      <table>
        <thead>
          <tr>
            <th style="width: 42px;">序号</th>
            <th style="width: 82px;">来源</th>
            <th style="width: 145px;">调整单号</th>
            <th style="width: 145px;">订单号</th>
            <th style="width: 120px;">客户</th>
            <th style="width: 90px;">订单类型</th>
            <th class="amount" style="width: 82px;">调整前</th>
            <th class="amount" style="width: 82px;">调整后</th>
            <th class="amount" style="width: 88px;">业绩金额</th>
            <th class="amount" style="width: 88px;">关联应收</th>
            <th class="amount" style="width: 88px;">关联利润</th>
            <th style="width: 135px;">订单时间</th>
          </tr>
        </thead>

        <tbody>
          ${itemRows || '<tr><td colspan="12" class="center">暂无明细</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="section">
      <strong>备注：</strong>${escapeHtml(s.remark)}
    </div>

    <div class="sign-section">
      <div>员工签字：</div>
      <div>财务确认：</div>
      <div>日期：</div>
    </div>

    <div class="print-footer">
      本结算单由系统生成，请核对无误后确认。
    </div>
  </div>
</body>
</html>
  `;
}

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

  const iframe = document.createElement('iframe');

  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '297mm';
  iframe.style.height = '210mm';
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
    try {
      win.focus();
      win.print();

      setTimeout(() => {
        if (printing.value) {
          cleanup();
        }
      }, 60000);
    } catch (error: any) {
      cleanup();
      message.error(error?.message || '调用浏览器打印失败');
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
    <NDrawerContent title="业绩结算单打印预览" closable>
      <template>
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
          <div class="print-header">
            <h1>员工绩效结算单</h1>
            <div class="print-subtitle">Staff Performance Settlement</div>
          </div>

          <div class="section">
            <NDescriptions bordered :column="3" size="small">
              <NDescriptionsItem label="结算单号">
                {{ settlement.settlementNo || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="状态">
                {{ statusLabel(settlement.status) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="结算来源">
                {{ settlementSourceLabel(settlement.settlementSource) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="结算类型">
                {{ settlementTypeLabel(settlement.settlementType) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="员工">
                {{ settlement.userName || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="结算周期">
                {{ settlement.periodStartDate || '-' }} 至 {{ settlement.periodEndDate || '-' }}
              </NDescriptionsItem>

              <NDescriptionsItem label="业绩总额">
                {{ money(settlement.totalPerformanceAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="关联应收">
                {{ money(settlement.totalReceivableAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="关联利润">
                {{ money(settlement.totalProfitAmount) }}
              </NDescriptionsItem>
            </NDescriptions>
          </div>

          <div class="section">
            <div class="section-title">结算明细</div>

            <table class="preview-table">
              <thead>
              <tr>
                <th>序号</th>
                <th>来源</th>
                <th>调整单号</th>
                <th>订单号</th>
                <th>客户</th>
                <th>订单类型</th>
                <th class="amount">调整前</th>
                <th class="amount">调整后</th>
                <th class="amount">业绩金额</th>
                <th class="amount">关联应收</th>
                <th class="amount">关联利润</th>
                <th>订单时间</th>
              </tr>
              </thead>

              <tbody>
              <tr v-for="(item, index) in items" :key="item.id || index">
                <td class="center">{{ Number(index) + 1 }}</td>
                <td>{{ sourceTypeLabel(item.sourceType) }}</td>
                <td>{{ item.adjustmentNoSnapshot || '-' }}</td>
                <td>{{ item.orderNoSnapshot || '-' }}</td>
                <td>{{ item.customerNameSnapshot || '-' }}</td>
                <td>{{ item.orderType || '-' }}</td>
                <td class="amount">{{ money(item.beforePerformanceAmount) }}</td>
                <td class="amount">{{ money(item.afterPerformanceAmount) }}</td>
                <td class="amount" :class="adjustAmountClass(item.performanceAmount)">
                  {{ money(item.performanceAmount) }}
                </td>
                <td class="amount">{{ money(item.relatedReceivableAmount) }}</td>
                <td class="amount">{{ money(item.relatedProfitAmount) }}</td>
                <td>{{ item.orderCreateTime || '-' }}</td>
              </tr>

              <tr v-if="items.length === 0">
                <td colspan="12" class="center">暂无明细</td>
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

.print-header {
  text-align: center;
  margin-bottom: 24px;
}

.print-header h1 {
  margin: 0;
  font-size: 26px;
  letter-spacing: 4px;
}

.print-subtitle {
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

.preview-table {
  width: 100%;
  border-collapse: collapse;
}

.preview-table th,
.preview-table td {
  border: 1px solid #333;
  padding: 7px 8px;
  font-size: 13px;
  line-height: 1.5;
}

.preview-table th {
  background: #f2f2f2;
}

.amount {
  text-align: right;
}

.center {
  text-align: center;
}

.positive {
  color: #18a058;
  font-weight: 600;
}

.negative {
  color: #d03050;
  font-weight: 600;
}
</style>
