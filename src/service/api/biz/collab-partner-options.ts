export interface CollabMerchantOption {
  label: string;
  value: string;
}

function unwrapRows(res: any): any[] {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function collabPartnerLabel(item: any) {
  return item.partnerTenantName
    || item.partnerTenantNameSnapshot
    || item.targetTenantNameSnapshot
    || item.applyTenantNameSnapshot
    || item.merchantName
    || item.partnerTenantId
    || item.targetTenantId
    || item.applyTenantId
    || '-';
}

function collabPartnerTenantId(item: any) {
  return item.partnerTenantId || item.targetTenantId || item.applyTenantId || item.tenantId;
}

export function buildCollabMerchantOptions(res: any): CollabMerchantOption[] {
  const options = unwrapRows(res)
    .map((item: any) => ({
      label: collabPartnerLabel(item),
      value: collabPartnerTenantId(item)
    }))
    .filter((item: any) => item.value);

  return Array.from(
    new Map(options.map((item: any) => [String(item.value), { ...item, value: String(item.value) }])).values()
  );
}
