import type { CollabBillQueryParams } from './collab-bill';

export type SentCollabBillListParams = Omit<CollabBillQueryParams, 'roleType'>;

export function buildSentCollabBillListParams(params: SentCollabBillListParams = {}): CollabBillQueryParams {
  return {
    ...params,
    roleType: 'SENT'
  };
}
