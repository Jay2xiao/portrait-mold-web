import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pageSource = readFileSync(resolve('src/views/biz/customerbill/index.vue'), 'utf8');
const drawerPath = resolve('src/views/biz/components/CollabOrderDetailDrawer.vue');

assert.equal(existsSync(drawerPath), true, 'shared collaboration order detail drawer component should exist');

assert.equal(
  pageSource.includes('CollabOrderDetailDrawer'),
  true,
  'customer bill page should use the shared collaboration order detail drawer'
);

assert.equal(
  pageSource.includes('showCollabOrderDetailDrawer'),
  true,
  'customer bill page should keep a dedicated collaboration order detail drawer state'
);

assert.equal(
  pageSource.includes('billDateStart') && pageSource.includes('billDateEnd'),
  true,
  'customer bill list query should send billDateStart and billDateEnd'
);

assert.equal(
  pageSource.includes('sendTimeStart') && pageSource.includes('sendTimeEnd'),
  true,
  'collaboration bill list query should send sendTimeStart and sendTimeEnd'
);

assert.equal(
  pageSource.includes('type="daterange"'),
  true,
  'customer bill page should render date range pickers'
);
