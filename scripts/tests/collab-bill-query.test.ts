import assert from 'node:assert/strict';

import { buildSentCollabBillListParams } from '../../src/service/api/biz/collab-bill-query';

const params = buildSentCollabBillListParams({
  pageNum: 2,
  pageSize: 20,
  keyword: 'DD202605280001',
  billStatus: 'SENT',
  payStatus: 'PAID'
});

assert.equal(params.roleType, 'SENT');
assert.equal(params.keyword, 'DD202605280001');
assert.equal(params.billStatus, 'SENT');
assert.equal(params.payStatus, 'PAID');
assert.equal(params.pageNum, 2);
assert.equal(params.pageSize, 20);
