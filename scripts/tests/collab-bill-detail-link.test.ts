import assert from 'node:assert/strict';

import {
  COLLAB_ORDER_LIST_PATH,
  COLLAB_ORDER_SEND_PATH,
  buildCollabOrderDetailLocation,
  buildCollabOrderDetailQuery
} from '../../src/service/api/biz/collab-bill-detail-link';

assert.equal(COLLAB_ORDER_LIST_PATH, '/xiezuo/collab-order');
assert.equal(COLLAB_ORDER_SEND_PATH, '/xiezuo/collab-order-send');

const query = buildCollabOrderDetailQuery({
  collabOrderId: 2059929354523115522n.toString()
});

assert.deepEqual(query, {
  tab: 'SENT',
  collabOrderId: '2059929354523115522'
});

const location = buildCollabOrderDetailLocation({
  collabOrderId: 2059929354523115522n.toString()
});

assert.deepEqual(location, {
  path: '/xiezuo/collab-order',
  query: {
    tab: 'SENT',
    collabOrderId: '2059929354523115522'
  }
});
