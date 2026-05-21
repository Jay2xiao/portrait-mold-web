export type NaiveTagType = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface CollabBillItemDisplay {
  itemName?: string;
  itemType?: string;
  amount?: number;
  remark?: string;
}

export function money(value?: number | string | null) {
  const numberValue = Number(value || 0);
  return `¥${numberValue.toFixed(2)}`;
}

export function billStatusText(value?: string) {
  const map: Record<string, string> = {
    DRAFT: '草稿',
    SENT: '已发送',
    CANCELLED: '已作废'
  };

  return value ? map[value] || value : '-';
}

export function billStatusTagType(value?: string): NaiveTagType {
  if (value === 'SENT') return 'success';
  if (value === 'CANCELLED') return 'error';
  if (value === 'DRAFT') return 'warning';
  return 'default';
}

export function payStatusText(value?: string) {
  const map: Record<string, string> = {
    UNPAID: '未付款',
    PARTIAL: '部分付款',
    PAID: '已付款'
  };

  return value ? map[value] || value : '-';
}

export function payStatusTagType(value?: string): NaiveTagType {
  if (value === 'PAID') return 'success';
  if (value === 'PARTIAL') return 'warning';
  if (value === 'UNPAID') return 'error';
  return 'default';
}

export function paymentStatusText(value?: string) {
  const map: Record<string, string> = {
    UNBILLED: '未出账',
    BILLED: '已出账',
    VOUCHER_UPLOADED: '已上传凭证',
    VOUCHER_REJECTED: '凭证被驳回',
    PAID_CONFIRMED: '已确认收款'
  };

  return value ? map[value] || value : '-';
}

export function paymentStatusTagType(value?: string): NaiveTagType {
  if (value === 'PAID_CONFIRMED') return 'success';
  if (value === 'VOUCHER_UPLOADED') return 'warning';
  if (value === 'VOUCHER_REJECTED') return 'error';
  if (value === 'BILLED') return 'info';
  if (value === 'UNBILLED') return 'default';
  return 'default';
}

export function reviewStatusText(value?: string) {
  const map: Record<string, string> = {
    PENDING: '待审核',
    APPROVED: '已通过',
    REJECTED: '已驳回'
  };

  return value ? map[value] || value : '-';
}

export function reviewStatusTagType(value?: string): NaiveTagType {
  if (value === 'APPROVED') return 'success';
  if (value === 'REJECTED') return 'error';
  if (value === 'PENDING') return 'warning';
  return 'default';
}

export function syncStatusText(value?: string) {
  const map: Record<string, string> = {
    NOT_SYNCED: '未同步',
    SYNCED: '已同步',
    FAILED: '同步失败'
  };

  return value ? map[value] || value : '-';
}

export function syncStatusTagType(value?: string): NaiveTagType {
  if (value === 'SYNCED') return 'success';
  if (value === 'FAILED') return 'error';
  if (value === 'NOT_SYNCED') return 'warning';
  return 'default';
}

export function paymentChannelText(value?: string) {
  const map: Record<string, string> = {
    WECHAT: '微信',
    ALIPAY: '支付宝',
    BANK: '银行转账',
    CASH: '现金',
    OTHER: '其他'
  };

  return value ? map[value] || value : '-';
}

export function billItemTypeText(value?: string) {
  const map: Record<string, string> = {
    COLLAB_SERVICE_FEE: '协作服务费',
    REPAIR_FEE: '修模费',
    PRINT_FEE: '打印费',
    DELIVERY_FEE: '发货费',
    OTHER_FEE: '其他费用'
  };

  return value ? map[value] || value : '-';
}

export function parseBillItems(value?: string | null): CollabBillItemDisplay[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    return [];
  } catch {
    return [];
  }
}

export function parseProofFileIds(value?: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed.map(item => String(item));
    }
  } catch {
    // ignore
  }

  return String(value)
    .split(/[,，\s\n]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

export function collabEventTypeText(value?: string) {
  const map: Record<string, string> = {
    BILL_CREATE: '创建协作账单',
    BILL_SEND: '发送协作账单',
    BILL_CANCEL: '作废协作账单',

    PAYMENT_VOUCHER_UPLOAD: '上传付款凭证',
    PAYMENT_VOUCHER_APPROVE: '付款凭证审核通过',
    PAYMENT_VOUCHER_REJECT: '付款凭证被驳回',

    INTERNAL_BILL_SYNC: '内部账单同步',
    INTERNAL_PAYMENT_SYNC: '内部收款同步',
    COLLAB_COST_SYNC: '外协成本同步'
  };

  return value ? map[value] || value : '-';
}
