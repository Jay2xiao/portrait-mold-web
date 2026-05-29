import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const apiSource = readFileSync(resolve('src/service/api/biz/order.ts'), 'utf8');
const pageSource = readFileSync(resolve('src/views/biz/order/index.vue'), 'utf8');

assert.equal(
  apiSource.includes('updateOrderPrintRevenue') && apiSource.includes('/print-revenue'),
  true,
  'order API should expose updateOrderPrintRevenue using /print-revenue'
);

assert.equal(
  pageSource.includes('showPrintRevenueModal') && pageSource.includes('printRevenueForm'),
  true,
  'order page should keep print revenue modal state'
);

assert.equal(
  pageSource.includes('openPrintRevenue') && pageSource.includes('submitPrintRevenue'),
  true,
  'order page should expose open and submit handlers for print revenue'
);

assert.equal(
  pageSource.includes('updateOrderPrintRevenue'),
  true,
  'order page should call the print revenue API'
);

assert.equal(
  pageSource.includes('修改打印收费'),
  true,
  'order page should render the modify print revenue action'
);

assert.equal(
  pageSource.includes('label="销售金额"'),
  true,
  'order price tab should label saleAmountTotal as total sales amount'
);

assert.equal(
  pageSource.includes('label="修模销售金额"'),
  false,
  'order price tab should not label saleAmountTotal as repair-only revenue'
);

assert.equal(
  apiSource.includes('totalCostAmount?: number') && apiSource.includes('grossProfitAmount?: number'),
  true,
  'order API type should include profit snapshot display fields'
);

assert.equal(
  pageSource.includes("key: 'totalCostAmount'") && pageSource.includes("key: 'grossProfitAmount'"),
  true,
  'order list should render total cost and gross profit from backend snapshot amounts'
);
