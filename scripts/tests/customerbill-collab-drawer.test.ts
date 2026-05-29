import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/views/biz/customerbill/index.vue'), 'utf8');

assert.equal(
  source.includes('buildCollabOrderDetailLocation'),
  false,
  'customer bill collaboration detail action must not build a route location'
);

assert.equal(
  source.includes('router.push(location)'),
  false,
  'customer bill collaboration detail action must open an in-page drawer instead of router.push'
);

assert.equal(
  source.includes('openCollabBillDetail(row)'),
  true,
  'collaboration bill actions should reuse the in-page detail drawer loader'
);
