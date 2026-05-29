import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/views/biz/customerbill/index.vue'), 'utf8');

assert.equal(
  source.includes('collabBillOrders'),
  true,
  'collaboration bill detail drawer should expose bill-order mappings for batch bills'
);

assert.equal(
  source.includes('collabBillOrderColumns'),
  true,
  'collaboration bill detail drawer should render a table of related collaboration orders'
);

assert.equal(
  source.includes('openCollabOrderDetailFromBillOrder'),
  true,
  'collaboration bill detail order rows should open the shared collaboration order detail drawer'
);

assert.equal(
  source.includes('billModeLabel'),
  true,
  'collaboration bill detail drawer should display whether the bill is single or batch'
);
