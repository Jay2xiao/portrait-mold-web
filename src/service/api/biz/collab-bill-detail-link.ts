import type { CollabBillVO } from './collab-bill';

export const COLLAB_ORDER_LIST_PATH = '/xiezuo/collab-order';
export const COLLAB_ORDER_SEND_PATH = '/xiezuo/collab-order-send';

export function buildCollabOrderDetailQuery(row: Pick<CollabBillVO, 'collabOrderId'>) {
  return {
    tab: 'SENT',
    collabOrderId: row.collabOrderId ? String(row.collabOrderId) : ''
  };
}

export function buildCollabOrderDetailLocation(row: Pick<CollabBillVO, 'collabOrderId'>) {
  return {
    path: COLLAB_ORDER_LIST_PATH,
    query: buildCollabOrderDetailQuery(row)
  };
}
