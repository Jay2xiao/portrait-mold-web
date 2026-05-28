import assert from 'node:assert/strict';

import { buildCollabOrderDetailQuery } from '../../src/service/api/biz/collab-bill-detail-link';

const query = buildCollabOrderDetailQuery({
  collabOrderId: 2059929354523115522n.toString()
});

assert.deepEqual(query, {
  tab: 'SENT',
  collabOrderId: '2059929354523115522'
});
