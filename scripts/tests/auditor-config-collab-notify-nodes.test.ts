import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/views/biz/auditorconfig/index.vue'), 'utf8');

for (const nodeCode of ['COLLAB_MANAGER_NOTIFY', 'COLLAB_FINANCE_NOTIFY', 'COLLAB_DELIVERY_NOTIFY']) {
  assert.equal(source.includes(nodeCode), true, `auditor config page should expose ${nodeCode}`);
}

assert.equal(source.includes('协作负责人通知'), true, 'auditor config page should label collab manager notify node');
assert.equal(source.includes('协作财务通知'), true, 'auditor config page should label collab finance notify node');
assert.equal(source.includes('协作发货通知'), true, 'auditor config page should label collab delivery notify node');
