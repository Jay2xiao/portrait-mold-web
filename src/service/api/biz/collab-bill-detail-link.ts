import type { CollabBillVO } from './collab-bill';

export function buildCollabOrderDetailQuery(row: Pick<CollabBillVO, 'collabOrderId'>) {
  return {
    tab: 'SENT',
    collabOrderId: row.collabOrderId ? String(row.collabOrderId) : ''
  };
}
