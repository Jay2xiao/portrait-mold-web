import assert from 'node:assert/strict';

import { buildCollabMerchantOptions } from '../../src/service/api/biz/collab-partner-options';

const directListOptions = buildCollabMerchantOptions({
  data: [
    {
      partnerTenantId: '300229',
      partnerTenantName: '陈',
      status: 'ACCEPTED'
    },
    {
      partnerTenantId: '0160',
      partnerTenantName: '我是打印的',
      status: 'ACCEPTED'
    }
  ]
});

assert.deepEqual(directListOptions, [
  { label: '陈', value: '300229' },
  { label: '我是打印的', value: '0160' }
]);

const pagedOptions = buildCollabMerchantOptions({
  data: {
    rows: [
      {
        partnerTenantId: '300229',
        partnerTenantName: '陈'
      }
    ]
  }
});

assert.deepEqual(pagedOptions, [{ label: '陈', value: '300229' }]);
