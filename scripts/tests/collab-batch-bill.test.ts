import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const apiSource = readFileSync(resolve('src/service/api/biz/collab-bill.ts'), 'utf8');
const pageSource = readFileSync(resolve('src/views/biz/collaborder/index.vue'), 'utf8');

assert.equal(apiSource.includes('CollabBillBatchCreateParams'), true, 'collab bill API should expose batch create params');
assert.equal(apiSource.includes('/batch/create'), true, 'collab bill API should call batch create endpoint');
assert.equal(pageSource.includes('createBatchCollabBill'), true, 'collab order page should call batch create API');
assert.equal(pageSource.includes('checkedReceivedRowKeys'), true, 'received collab order table should keep selected row keys');
assert.equal(pageSource.includes('openBatchCreateBillModal'), true, 'received collab order page should expose batch bill action');
assert.equal(pageSource.includes('resolveCollabBillId'), true, 'batch bill creation should resolve backend result to a real bill id');

const { resolveCollabBillId } = await import('../../src/service/api/biz/collab-bill-utils');

assert.equal(resolveCollabBillId(1001), 1001, 'plain numeric bill id should be accepted');
assert.equal(resolveCollabBillId('1002'), '1002', 'plain string bill id should be accepted');
assert.equal(resolveCollabBillId({ id: 1003 }), 1003, 'object bill id should be read from id');
assert.equal(resolveCollabBillId({ data: 1004 }), 1004, 'wrapped bill id should be read from data');
assert.equal(resolveCollabBillId({ data: { id: 1005 } }), 1005, 'nested wrapped bill id should be read from data.id');
assert.equal(resolveCollabBillId({ code: 500, msg: 'failed' }), undefined, 'backend error object must not become [object Object]');
