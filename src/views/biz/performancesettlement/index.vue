<script setup lang="ts">
import {h, onMounted, reactive, ref} from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NDescriptions,
  NDescriptionsItem,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  NSpace,
  NInputNumber,
  SelectOption,
  NTag,
  useMessage
} from 'naive-ui';

import {
  cancelPerformanceSettlement,
  confirmPerformanceSettlement,
  createPerformanceSettlement,
  exportPerformanceSettlementExcel,
  fetchPerformancePendingList,
  fetchPerformanceSettlementDetail,
  fetchPerformanceSettlementList,
  type StaffPerformancePendingVO,
  type StaffPerformanceSettlementVO
} from '@/service/api/biz/performance-settlement';


import {
  cancelPerformanceAdjustment,
  createAdjustmentPerformanceSettlement,
  createManualPerformanceAdjustment,
  fetchPerformanceAdjustmentList,
  fetchPerformanceUserOptions,
  fetchPerformanceAdjustmentPendingList,
  type StaffPerformanceAdjustmentVO
} from '@/service/api/biz/performance-adjustment';


import StaffPerformanceSettlementPrintDrawer from '@/views/biz/components/StaffPerformanceSettlementPrintDrawer.vue';

import {nextTick, watch} from 'vue';
import {useRoute} from 'vue-router';
import {routeQueryString} from '@/utils/route-query';

const route = useRoute();


defineOptions({
  name: 'BizPerformanceSettlement'
});

const message = useMessage();

const pendingLoading = ref(false);
const listLoading = ref(false);

const pendingData = ref<StaffPerformancePendingVO[]>([]);
const settlementData = ref<StaffPerformanceSettlementVO[]>([]);
const total = ref(0);

const pendingAdjustmentSectionRef = ref<HTMLElement | null>(null);
const settlementListSectionRef = ref<HTMLElement | null>(null);
const adjustmentListSectionRef = ref<HTMLElement | null>(null);


const detailLoading = ref(false);
const showDetailDrawer = ref(false);
const detail = ref<any>(null);

const manualUserLoading = ref(false);
const manualUserOptions = ref<SelectOption[]>([]);


const showCancelModal = ref(false);
const currentSettlement = ref<StaffPerformanceSettlementVO | null>(null);
const cancelForm = reactive({
  reason: ''
});

const pendingAdjustmentLoading = ref(false);
const pendingAdjustmentData = ref<StaffPerformancePendingVO[]>([]);

const adjustmentLoading = ref(false);
const adjustmentData = ref<StaffPerformanceAdjustmentVO[]>([]);
const adjustmentTotal = ref(0);

const showManualAdjustmentModal = ref(false);
const showCancelAdjustmentModal = ref(false);
const currentAdjustment = ref<StaffPerformanceAdjustmentVO | null>(null);

const manualAdjustmentForm = reactive({
  settlementType: 'REPAIR',
  userId: '' as string | number | null,
  userName: '',
  orderId: '' as string | number | null,
  adjustAmount: 0,
  adjustmentDateValue: Date.now() as number | null,
  reason: '',
  remark: ''
});

function employeeSelectLabel(settlementType?: string) {
  if (settlementType === 'REPAIR') return '修模师';
  if (settlementType === 'PRINT') return '打印员';
  if (settlementType === 'FOLLOW') return '跟单员';
  return '员工';
}


const cancelAdjustmentForm = reactive({
  reason: ''
});

const adjustmentQuery = reactive({
  pageNum: 1,
  pageSize: 10,
  adjustmentNo: '',
  settlementType: '',
  adjustSource: '',
  userName: '',
  orderNo: '',
  settleStatus: '',
  status: ''
});


const pendingQuery = reactive({
  settlementType: 'REPAIR',
  startDateValue: null as number | null,
  endDateValue: Date.now() as number | null,
  includeUncompleted: false
});

const listQuery = reactive({
  pageNum: 1,
  pageSize: 10,
  settlementNo: '',
  settlementType: '',
  userName: '',
  status: ''
});

const adjustSourceOptions = [
  {label: '系统差额', value: 'AUTO_DIFF'},
  {label: '手工调整', value: 'MANUAL'}
];

const adjustmentSettleStatusOptions = [
  {label: '未结算', value: 'UNSETTLED'},
  {label: '已结算', value: 'SETTLED'}
];

const adjustmentStatusOptions = [
  {label: '有效', value: 'ENABLE'},
  {label: '已取消', value: 'CANCELLED'}
];

function adjustSourceLabel(value?: string) {
  const map: Record<string, string> = {
    AUTO_DIFF: '系统差额',
    MANUAL: '手工调整'
  };

  return map[value || ''] || value || '-';
}

function adjustmentSettleStatusLabel(value?: string) {
  const map: Record<string, string> = {
    UNSETTLED: '未结算',
    SETTLED: '已结算'
  };

  return map[value || ''] || value || '-';
}

function adjustmentStatusLabel(value?: string) {
  const map: Record<string, string> = {
    ENABLE: '有效',
    CANCELLED: '已取消'
  };

  return map[value || ''] || value || '-';
}

function amountTagType(value?: number) {
  return Number(value || 0) >= 0 ? 'success' : 'error';
}

function ensurePendingPeriod() {
  if (!pendingQuery.startDateValue || !pendingQuery.endDateValue) {
    message.warning('请先选择开始日期和结束日期');
    return false;
  }

  return true;
}


const settlementTypeOptions = [
  {label: '修模师业绩', value: 'REPAIR'},
  {label: '打印员业绩', value: 'PRINT'},
  {label: '跟单员业绩', value: 'FOLLOW'}
];

const statusOptions = [
  {label: '草稿', value: 'DRAFT'},
  {label: '已确认', value: 'CONFIRMED'},
  {label: '已作废', value: 'CANCELLED'}
];

const yesNoOptions = [
  {label: '否', value: false},
  {label: '是', value: true}
];

function money(value?: number) {
  return Number(value || 0).toFixed(2);
}

function formatDateValue(value?: number | null) {
  if (!value) return undefined;

  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

async function loadManualUserOptions(settlementType: string) {
  if (!settlementType) {
    manualUserOptions.value = [];
    return;
  }

  manualUserLoading.value = true;

  try {
    const res = await fetchPerformanceUserOptions({
      settlementType
    });

    const list = unwrapData(res) || [];

    manualUserOptions.value = list.map((item: any) => {
      return {
        label: item.userName ? `${item.userName}（${item.userId}）` : `用户${item.userId}`,
        value: item.userId,
        userName: item.userName
      };
    });
  } finally {
    manualUserLoading.value = false;
  }
}


async function handleManualSettlementTypeChange(value: string) {
  manualAdjustmentForm.userId = null;
  manualAdjustmentForm.userName = '';

  await loadManualUserOptions(value);
}

function handleManualUserChange(value: string | number | null, option: SelectOption | null) {
  if (!value) {
    manualAdjustmentForm.userName = '';
    return;
  }

  const opt = option as any;
  manualAdjustmentForm.userName = opt?.userName || '';
}


function unwrapRows(res: any) {
  const data = res?.data || res;
  return data?.rows || [];
}

function unwrapTotal(res: any) {
  const data = res?.data || res;
  return data?.total || 0;
}

function unwrapData(res: any) {
  return res?.data || res;
}

const showPrintDrawer = ref(false);
const printSettlementId = ref<string | number | null>(null);


function settlementTypeLabel(value?: string) {
  const map: Record<string, string> = {
    REPAIR: '修模师业绩',
    PRINT: '打印员业绩',
    FOLLOW: '跟单员业绩'
  };

  return map[value || ''] || value || '-';
}

function statusLabel(value?: string) {
  const map: Record<string, string> = {
    DRAFT: '草稿',
    CONFIRMED: '已确认',
    CANCELLED: '已作废'
  };

  return map[value || ''] || value || '-';
}

function statusTagType(value?: string) {
  if (value === 'CONFIRMED') return 'success';
  if (value === 'CANCELLED') return 'error';
  return 'warning';
}

function settlementSourceLabel(value?: string) {
  const map: Record<string, string> = {
    NORMAL: '正常业绩',
    ADJUSTMENT: '调整业绩',
    MIXED: '混合'
  };

  return map[value || ''] || value || '-';
}


function getBlobFromResponse(res: any) {
  if (res instanceof Blob) return res;
  if (res?.data instanceof Blob) return res.data;
  return new Blob([res]);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printSettlement(row: StaffPerformanceSettlementVO) {
  if (!row.id) {
    message.warning('结算单ID为空');
    return;
  }

  printSettlementId.value = row.id;
  showPrintDrawer.value = true;
}

async function exportExcel(row: StaffPerformanceSettlementVO) {
  if (!row.id) return;

  const res = await exportPerformanceSettlementExcel(row.id);
  const blob = getBlobFromResponse(res);

  const source = settlementSourceLabel(row.settlementSource);
  downloadBlob(blob, `员工绩效结算单-${source}-${row.settlementNo || row.id}.xlsx`);
}

const pendingColumns = [
  {
    title: '结算类型',
    key: 'settlementType',
    width: 130,
    render(row: StaffPerformancePendingVO) {
      return settlementTypeLabel(row.settlementType);
    }
  },
  {
    title: '员工',
    key: 'userName',
    width: 140
  },
  {
    title: '待结算订单数',
    key: 'orderCount',
    width: 120
  },
  {
    title: '待结算业绩',
    key: 'totalPerformanceAmount',
    width: 130,
    render(row: StaffPerformancePendingVO) {
      return h(
        NTag,
        {type: Number(row.totalPerformanceAmount || 0) > 0 ? 'success' : 'default'},
        {default: () => money(row.totalPerformanceAmount)}
      );
    }
  },
  {
    title: '关联应收',
    key: 'totalReceivableAmount',
    width: 130,
    render(row: StaffPerformancePendingVO) {
      return money(row.totalReceivableAmount);
    }
  },
  {
    title: '关联利润',
    key: 'totalProfitAmount',
    width: 130,
    render(row: StaffPerformancePendingVO) {
      return money(row.totalProfitAmount);
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 130,
    render(row: StaffPerformancePendingVO) {
      return h(
        NButton,
        {
          size: 'small',
          type: 'primary',
          onClick: () => createSettlementByPending(row)
        },
        {default: () => '生成结算单'}
      );
    }
  }
];

const settlementColumns = [
  {
    title: '结算来源',
    key: 'settlementSource',
    width: 120,
    render(row: StaffPerformanceSettlementVO) {
      return settlementSourceLabel(row.settlementSource);
    }
  },
  {
    title: '结算单号',
    key: 'settlementNo',
    width: 180,
    fixed: 'left'
  },
  {
    title: '结算类型',
    key: 'settlementType',
    width: 130,
    render(row: StaffPerformanceSettlementVO) {
      return settlementTypeLabel(row.settlementType);
    }
  },
  {
    title: '员工',
    key: 'userName',
    width: 130
  },
  {
    title: '结算周期',
    key: 'period',
    width: 220,
    render(row: StaffPerformanceSettlementVO) {
      return `${row.periodStartDate || '-'} 至 ${row.periodEndDate || '-'}`;
    }
  },
  {
    title: '明细数',
    key: 'itemCount',
    width: 90
  },
  {
    title: '业绩总额',
    key: 'totalPerformanceAmount',
    width: 120,
    render(row: StaffPerformanceSettlementVO) {
      return money(row.totalPerformanceAmount);
    }
  },
  {
    title: '关联应收',
    key: 'totalReceivableAmount',
    width: 120,
    render(row: StaffPerformanceSettlementVO) {
      return money(row.totalReceivableAmount);
    }
  },
  {
    title: '关联利润',
    key: 'totalProfitAmount',
    width: 120,
    render(row: StaffPerformanceSettlementVO) {
      return money(row.totalProfitAmount);
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row: StaffPerformanceSettlementVO) {
      return h(
        NTag,
        {type: statusTagType(row.status) as any},
        {default: () => statusLabel(row.status)}
      );
    }
  },
  {
    title: '确认人',
    key: 'confirmUserName',
    width: 120
  },
  {
    title: '确认时间',
    key: 'confirmTime',
    width: 170
  },
  {
    title: '操作',
    key: 'actions',
    width: 260,
    fixed: 'right',
    render(row: StaffPerformanceSettlementVO) {
      const buttons = [
        h(
          NButton,
          {
            size: 'small',
            onClick: () => openDetail(row)
          },
          {default: () => '详情'}
        ),
        h(
          NButton,
          {
            size: 'small',
            onClick: () => exportExcel(row)
          },
          {default: () => '导出'}
        ),
        h(
          NButton,
          {
            size: 'small',
            type: 'info',
            onClick: () => printSettlement(row)
          },
          {default: () => '打印'}
        )
      ];

      if (row.status === 'DRAFT') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'success',
              onClick: () => confirmSettlement(row)
            },
            {default: () => '确认'}
          )
        );
      }

      if (row.status !== 'CANCELLED') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'error',
              onClick: () => openCancel(row)
            },
            {default: () => '作废'}
          )
        );
      }

      return h(NSpace, {}, {default: () => buttons});
    }
  }
];

const pendingAdjustmentColumns = [
  {
    title: '业绩类型',
    key: 'settlementType',
    width: 130,
    render(row: StaffPerformancePendingVO) {
      return settlementTypeLabel(row.settlementType);
    }
  },
  {
    title: '员工',
    key: 'userName',
    width: 140
  },
  {
    title: '调整单数',
    key: 'orderCount',
    width: 110
  },
  {
    title: '调整合计',
    key: 'totalPerformanceAmount',
    width: 130,
    render(row: StaffPerformancePendingVO) {
      return h(
        NTag,
        {type: amountTagType(row.totalPerformanceAmount) as any},
        {default: () => money(row.totalPerformanceAmount)}
      );
    }
  },
  {
    title: '关联应收',
    key: 'totalReceivableAmount',
    width: 130,
    render(row: StaffPerformancePendingVO) {
      return money(row.totalReceivableAmount);
    }
  },
  {
    title: '关联利润',
    key: 'totalProfitAmount',
    width: 130,
    render(row: StaffPerformancePendingVO) {
      return money(row.totalProfitAmount);
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    render(row: StaffPerformancePendingVO) {
      return h(
        NButton,
        {
          size: 'small',
          type: 'primary',
          onClick: () => createAdjustmentSettlementByPending(row)
        },
        {default: () => '生成调整结算单'}
      );
    }
  }
];

const adjustmentColumns = [
  {
    title: '调整单号',
    key: 'adjustmentNo',
    width: 180,
    fixed: 'left'
  },
  {
    title: '业绩类型',
    key: 'settlementType',
    width: 130,
    render(row: StaffPerformanceAdjustmentVO) {
      return settlementTypeLabel(row.settlementType);
    }
  },
  {
    title: '来源',
    key: 'adjustSource',
    width: 110,
    render(row: StaffPerformanceAdjustmentVO) {
      return adjustSourceLabel(row.adjustSource);
    }
  },
  {
    title: '调整日期',
    key: 'adjustmentDate',
    width: 120
  },
  {
    title: '员工',
    key: 'userName',
    width: 120
  },
  {
    title: '订单号',
    key: 'orderNoSnapshot',
    width: 170
  },
  {
    title: '调整前',
    key: 'beforePerformanceAmount',
    width: 100,
    render(row: StaffPerformanceAdjustmentVO) {
      return money(row.beforePerformanceAmount);
    }
  },
  {
    title: '调整后',
    key: 'afterPerformanceAmount',
    width: 100,
    render(row: StaffPerformanceAdjustmentVO) {
      return money(row.afterPerformanceAmount);
    }
  },
  {
    title: '调整差额',
    key: 'adjustAmount',
    width: 110,
    render(row: StaffPerformanceAdjustmentVO) {
      return h(
        NTag,
        {type: amountTagType(row.adjustAmount) as any},
        {default: () => money(row.adjustAmount)}
      );
    }
  },
  {
    title: '结算状态',
    key: 'settleStatus',
    width: 110,
    render(row: StaffPerformanceAdjustmentVO) {
      return adjustmentSettleStatusLabel(row.settleStatus);
    }
  },
  {
    title: '进入结算单',
    key: 'settlementNoSnapshot',
    width: 180
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row: StaffPerformanceAdjustmentVO) {
      return adjustmentStatusLabel(row.status);
    }
  },
  {
    title: '原因',
    key: 'reason',
    width: 260,
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right',
    render(row: StaffPerformanceAdjustmentVO) {
      if (row.status === 'ENABLE' && row.settleStatus === 'UNSETTLED') {
        return h(
          NButton,
          {
            size: 'small',
            type: 'error',
            onClick: () => openCancelAdjustment(row)
          },
          {default: () => '取消'}
        );
      }

      return '-';
    }
  }
];

async function getPendingList() {
  if (!pendingQuery.settlementType) {
    message.warning('请选择结算类型');
    return;
  }

  pendingLoading.value = true;

  try {
    const res = await fetchPerformancePendingList({
      settlementType: pendingQuery.settlementType,
      startDate: formatDateValue(pendingQuery.startDateValue),
      endDate: formatDateValue(pendingQuery.endDateValue),
      includeUncompleted: pendingQuery.includeUncompleted
    });

    pendingData.value = unwrapData(res) || [];
  } finally {
    pendingLoading.value = false;
  }
}

async function getSettlementList() {
  listLoading.value = true;

  try {
    const res = await fetchPerformanceSettlementList(listQuery);
    settlementData.value = unwrapRows(res);
    total.value = unwrapTotal(res);
  } finally {
    listLoading.value = false;
  }
}

async function createSettlementByPending(row: StaffPerformancePendingVO) {
  if (!row.userId) {
    message.warning('员工ID为空');
    return;
  }

  await createPerformanceSettlement({
    settlementType: row.settlementType,
    userId: row.userId,
    startDate: formatDateValue(pendingQuery.startDateValue),
    endDate: formatDateValue(pendingQuery.endDateValue),
    includeUncompleted: pendingQuery.includeUncompleted,
    remark: '业绩结算中心生成'
  });

  message.success('结算单生成成功');

  await getPendingList();
  await getSettlementList();
}

async function getPendingAdjustmentList() {
  if (!pendingQuery.settlementType) {
    message.warning('请选择结算类型');
    return;
  }

  pendingAdjustmentLoading.value = true;

  try {
    const res = await fetchPerformanceAdjustmentPendingList({
      settlementType: pendingQuery.settlementType,
      startDate: formatDateValue(pendingQuery.startDateValue),
      endDate: formatDateValue(pendingQuery.endDateValue)
    });

    pendingAdjustmentData.value = unwrapData(res) || [];
  } finally {
    pendingAdjustmentLoading.value = false;
  }
}

async function createAdjustmentSettlementByPending(row: StaffPerformancePendingVO) {
  if (!ensurePendingPeriod()) return;

  if (!row.userId) {
    message.warning('员工ID为空');
    return;
  }

  await createAdjustmentPerformanceSettlement({
    settlementType: row.settlementType,
    userId: row.userId,
    startDate: formatDateValue(pendingQuery.startDateValue),
    endDate: formatDateValue(pendingQuery.endDateValue),
    remark: '业绩调整单生成的结算单'
  });

  message.success('调整结算单生成成功');

  await getPendingAdjustmentList();
  await getAdjustmentList();
  await getSettlementList();
}

async function getAdjustmentList() {
  adjustmentLoading.value = true;

  try {
    const res = await fetchPerformanceAdjustmentList(adjustmentQuery);
    adjustmentData.value = unwrapRows(res);
    adjustmentTotal.value = unwrapTotal(res);
  } finally {
    adjustmentLoading.value = false;
  }
}

async function openManualAdjustment() {
  manualAdjustmentForm.settlementType = pendingQuery.settlementType || 'REPAIR';
  manualAdjustmentForm.userId = null;
  manualAdjustmentForm.userName = '';
  manualAdjustmentForm.orderId = '';
  manualAdjustmentForm.adjustAmount = 0;
  manualAdjustmentForm.adjustmentDateValue = Date.now();
  manualAdjustmentForm.reason = '';
  manualAdjustmentForm.remark = '';

  showManualAdjustmentModal.value = true;

  await loadManualUserOptions(manualAdjustmentForm.settlementType);
}


async function submitManualAdjustment() {
  if (!manualAdjustmentForm.settlementType) {
    message.warning('请选择业绩类型');
    return;
  }

  if (!manualAdjustmentForm.userId) {
    message.warning(`请选择${employeeSelectLabel(manualAdjustmentForm.settlementType)}`);
    return;
  }

  if (!manualAdjustmentForm.adjustAmount || Number(manualAdjustmentForm.adjustAmount) === 0) {
    message.warning('调整金额不能为0');
    return;
  }

  if (!manualAdjustmentForm.reason) {
    message.warning('请输入调整原因');
    return;
  }

  await createManualPerformanceAdjustment({
    settlementType: manualAdjustmentForm.settlementType,
    userId: manualAdjustmentForm.userId,
    userName: manualAdjustmentForm.userName,
    orderId: manualAdjustmentForm.orderId || undefined,
    adjustAmount: manualAdjustmentForm.adjustAmount,
    adjustmentDate: formatDateValue(manualAdjustmentForm.adjustmentDateValue),
    reason: manualAdjustmentForm.reason,
    remark: manualAdjustmentForm.remark
  });

  message.success('手工调整单已创建');

  showManualAdjustmentModal.value = false;

  await getPendingAdjustmentList();
  await getAdjustmentList();
}

function openCancelAdjustment(row: StaffPerformanceAdjustmentVO) {
  currentAdjustment.value = row;
  cancelAdjustmentForm.reason = '';
  showCancelAdjustmentModal.value = true;
}

async function submitCancelAdjustment() {
  if (!currentAdjustment.value?.id) return;

  if (!cancelAdjustmentForm.reason) {
    message.warning('请输入取消原因');
    return;
  }

  await cancelPerformanceAdjustment(currentAdjustment.value.id, {
    reason: cancelAdjustmentForm.reason
  });

  message.success('调整单已取消');

  showCancelAdjustmentModal.value = false;

  await getPendingAdjustmentList();
  await getAdjustmentList();
}

function handleAdjustmentPageChange(page: number) {
  adjustmentQuery.pageNum = page;
  getAdjustmentList();
}

function handleAdjustmentPageSizeChange(pageSize: number) {
  adjustmentQuery.pageSize = pageSize;
  adjustmentQuery.pageNum = 1;
  getAdjustmentList();
}


async function confirmSettlement(row: StaffPerformanceSettlementVO) {
  if (!row.id) return;

  await confirmPerformanceSettlement(row.id);
  message.success('结算单已确认');
  getSettlementList();
}

function openCancel(row: StaffPerformanceSettlementVO) {
  currentSettlement.value = row;
  cancelForm.reason = '';
  showCancelModal.value = true;
}

async function submitCancel() {
  if (!currentSettlement.value?.id) return;

  if (!cancelForm.reason) {
    message.warning('请输入作废原因');
    return;
  }

  await cancelPerformanceSettlement(currentSettlement.value.id, {
    reason: cancelForm.reason
  });

  message.success('结算单已作废');

  showCancelModal.value = false;
  await getPendingList();
  await getSettlementList();
}

function sourceTypeLabel(value?: string) {
  const map: Record<string, string> = {
    PERFORMANCE: '正常业绩',
    ADJUSTMENT: '调整单'
  };

  return map[value || ''] || value || '-';
}


async function openDetail(row: StaffPerformanceSettlementVO) {
  if (!row.id) return;

  showDetailDrawer.value = true;
  detailLoading.value = true;
  detail.value = null;

  try {
    const res = await fetchPerformanceSettlementDetail(row.id);
    detail.value = unwrapData(res);
  } finally {
    detailLoading.value = false;
  }
}

function scrollToSection(section?: string) {
  nextTick(() => {
    if (section === 'pendingAdjustment') {
      pendingAdjustmentSectionRef.value?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      return;
    }

    if (section === 'settlementList') {
      settlementListSectionRef.value?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      return;
    }

    if (section === 'adjustmentList') {
      adjustmentListSectionRef.value?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
}

async function applyRouteQuery() {
  const q = route.query;

  const section = routeQueryString(q.section || q.tab);

  if ('status' in q) {
    listQuery.status = routeQueryString(q.status);
    listQuery.pageNum = 1;
  }

  if ('settleStatus' in q) {
    adjustmentQuery.settleStatus = routeQueryString(q.settleStatus);
    adjustmentQuery.pageNum = 1;
  }

  if (section === 'pendingAdjustment') {
    await getPendingAdjustmentList();
    scrollToSection('pendingAdjustment');
    return;
  }

  if (section === 'settlementList') {
    await getSettlementList();
    scrollToSection('settlementList');
    return;
  }

  if (section === 'adjustmentList') {
    await getAdjustmentList();
    scrollToSection('adjustmentList');
  }
}


function handlePageChange(page: number) {
  listQuery.pageNum = page;
  getSettlementList();
}

function handlePageSizeChange(pageSize: number) {
  listQuery.pageSize = pageSize;
  listQuery.pageNum = 1;
  getSettlementList();
}

onMounted(async () => {
  await getPendingList();
  await getPendingAdjustmentList();
  await getSettlementList();
  await getAdjustmentList();

  await applyRouteQuery();
});

watch(
  () => route.fullPath,
  async () => {
    await applyRouteQuery();
  }
);


</script>

<template>
  <NSpace vertical :size="16">
    <NCard title="待结算业绩" :bordered="false">
      <NSpace vertical :size="16">
        <NForm inline label-placement="left">
          <NFormItem label="结算类型">
            <NSelect
              v-model:value="pendingQuery.settlementType"
              :options="settlementTypeOptions"
              style="width: 150px"
            />
          </NFormItem>

          <NFormItem label="开始日期">
            <NDatePicker
              v-model:value="pendingQuery.startDateValue"
              type="date"
              clearable
              style="width: 150px"
            />
          </NFormItem>

          <NFormItem label="结束日期">
            <NDatePicker
              v-model:value="pendingQuery.endDateValue"
              type="date"
              clearable
              style="width: 150px"
            />
          </NFormItem>

          <NFormItem label="包含未完成">
            <NSelect
              v-model:value="pendingQuery.includeUncompleted"
              :options="yesNoOptions"
              style="width: 100px"
            />
          </NFormItem>

          <NFormItem>
            <NButton type="primary" :loading="pendingLoading" @click="getPendingList">
              查询待结算
            </NButton>
          </NFormItem>
        </NForm>

        <NDataTable
          size="small"
          :loading="pendingLoading"
          :columns="pendingColumns"
          :data="pendingData"
          :pagination="false"
          :scroll-x="900"
        />
      </NSpace>
    </NCard>

    <div ref="pendingAdjustmentSectionRef">
      <NCard title="待结算调整" :bordered="false">
        <NSpace vertical :size="16">
          <NSpace justify="space-between" align="center">
            <div style="color: #888">
              已确认结算单后产生的差额调整，正数为补发，负数为扣减。
            </div>

            <NButton type="warning" @click="openManualAdjustment">
              新增手工调整
            </NButton>
          </NSpace>

          <NDataTable
            size="small"
            :loading="pendingAdjustmentLoading"
            :columns="pendingAdjustmentColumns"
            :data="pendingAdjustmentData"
            :pagination="false"
            :scroll-x="1000"
          />
        </NSpace>
      </NCard>
    </div>

    <div ref="settlementListSectionRef">
      <NCard title="业绩结算单" :bordered="false">
        <NSpace vertical :size="16">
          <NForm inline label-placement="left">
            <NFormItem label="结算单号">
              <NInput v-model:value="listQuery.settlementNo" clearable placeholder="结算单号"/>
            </NFormItem>

            <NFormItem label="结算类型">
              <NSelect
                v-model:value="listQuery.settlementType"
                :options="settlementTypeOptions"
                clearable
                style="width: 150px"
              />
            </NFormItem>

            <NFormItem label="员工">
              <NInput v-model:value="listQuery.userName" clearable placeholder="员工姓名"/>
            </NFormItem>

            <NFormItem label="状态">
              <NSelect
                v-model:value="listQuery.status"
                :options="statusOptions"
                clearable
                style="width: 130px"
              />
            </NFormItem>

            <NFormItem>
              <NButton type="primary" :loading="listLoading" @click="getSettlementList">
                查询
              </NButton>
            </NFormItem>
          </NForm>

          <NDataTable
            remote
            size="small"
            :loading="listLoading"
            :columns="settlementColumns"
            :data="settlementData"
            :scroll-x="1800"
            :pagination="{
            page: listQuery.pageNum,
            pageSize: listQuery.pageSize,
            itemCount: total,
            showSizePicker: true,
            pageSizes: [10, 20, 50, 100],
            onUpdatePage: handlePageChange,
            onUpdatePageSize: handlePageSizeChange
          }"
          />
        </NSpace>
      </NCard>
    </div>
    <div ref="adjustmentListSectionRef">
      <NCard title="业绩调整单" :bordered="false">
        <NSpace vertical :size="16">
          <NForm inline label-placement="left">
            <NFormItem label="调整单号">
              <NInput
                v-model:value="adjustmentQuery.adjustmentNo"
                clearable
                placeholder="调整单号"
              />
            </NFormItem>

            <NFormItem label="业绩类型">
              <NSelect
                v-model:value="adjustmentQuery.settlementType"
                :options="settlementTypeOptions"
                clearable
                style="width: 150px"
              />
            </NFormItem>

            <NFormItem label="来源">
              <NSelect
                v-model:value="adjustmentQuery.adjustSource"
                :options="adjustSourceOptions"
                clearable
                style="width: 130px"
              />
            </NFormItem>

            <NFormItem label="员工">
              <NInput
                v-model:value="adjustmentQuery.userName"
                clearable
                placeholder="员工姓名"
              />
            </NFormItem>

            <NFormItem label="订单号">
              <NInput
                v-model:value="adjustmentQuery.orderNo"
                clearable
                placeholder="订单号"
              />
            </NFormItem>

            <NFormItem label="结算状态">
              <NSelect
                v-model:value="adjustmentQuery.settleStatus"
                :options="adjustmentSettleStatusOptions"
                clearable
                style="width: 130px"
              />
            </NFormItem>

            <NFormItem label="状态">
              <NSelect
                v-model:value="adjustmentQuery.status"
                :options="adjustmentStatusOptions"
                clearable
                style="width: 130px"
              />
            </NFormItem>

            <NFormItem>
              <NButton
                type="primary"
                :loading="adjustmentLoading"
                @click="getAdjustmentList"
              >
                查询
              </NButton>
            </NFormItem>
          </NForm>

          <NDataTable
            remote
            size="small"
            :loading="adjustmentLoading"
            :columns="adjustmentColumns"
            :data="adjustmentData"
            :scroll-x="1900"
            :pagination="{
        page: adjustmentQuery.pageNum,
        pageSize: adjustmentQuery.pageSize,
        itemCount: adjustmentTotal,
        showSizePicker: true,
        pageSizes: [10, 20, 50, 100],
        onUpdatePage: handleAdjustmentPageChange,
        onUpdatePageSize: handleAdjustmentPageSizeChange
      }"
          />
        </NSpace>
      </NCard>
    </div>

    <NDrawer v-model:show="showDetailDrawer" width="1080" placement="right">
      <NDrawerContent title="业绩结算单详情" closable>
        <NSpace v-if="detail" vertical :size="16">
          <NCard title="结算单信息" size="small">
            <NDescriptions bordered :column="3" size="small">
              <NDescriptionsItem label="结算单号">
                {{ detail.settlement?.settlementNo }}
              </NDescriptionsItem>

              <NDescriptionsItem label="结算类型">
                {{ settlementTypeLabel(detail.settlement?.settlementType) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="员工">
                {{ detail.settlement?.userName }}
              </NDescriptionsItem>

              <NDescriptionsItem label="结算周期">
                {{ detail.settlement?.periodStartDate }} 至 {{ detail.settlement?.periodEndDate }}
              </NDescriptionsItem>

              <NDescriptionsItem label="明细数量">
                {{ detail.settlement?.itemCount }}
              </NDescriptionsItem>

              <NDescriptionsItem label="状态">
                {{ statusLabel(detail.settlement?.status) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="业绩总额">
                {{ money(detail.settlement?.totalPerformanceAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="关联应收">
                {{ money(detail.settlement?.totalReceivableAmount) }}
              </NDescriptionsItem>

              <NDescriptionsItem label="关联利润">
                {{ money(detail.settlement?.totalProfitAmount) }}
              </NDescriptionsItem>
            </NDescriptions>
          </NCard>

          <NCard title="结算明细" size="small">
            <NDataTable
              size="small"
              :data="detail.items || []"
              :pagination="false"
              :scroll-x="1500"
              :columns="[
    {
      title: '来源',
      key: 'sourceType',
      width: 110,
      render: row => sourceTypeLabel(row.sourceType)
    },
    {
      title: '调整单号',
      key: 'adjustmentNoSnapshot',
      width: 170
    },
    {
      title: '订单号',
      key: 'orderNoSnapshot',
      width: 170
    },
    {
      title: '客户',
      key: 'customerNameSnapshot',
      width: 150
    },
    {
      title: '订单类型',
      key: 'orderType',
      width: 120
    },
    {
      title: '业务状态',
      key: 'businessStatus',
      width: 140
    },
    {
      title: '调整前',
      key: 'beforePerformanceAmount',
      width: 110,
      render: row => money(row.beforePerformanceAmount)
    },
    {
      title: '调整后',
      key: 'afterPerformanceAmount',
      width: 110,
      render: row => money(row.afterPerformanceAmount)
    },
    {
      title: '业绩金额',
      key: 'performanceAmount',
      width: 110,
      render: row => money(row.performanceAmount)
    },
    {
      title: '关联应收',
      key: 'relatedReceivableAmount',
      width: 110,
      render: row => money(row.relatedReceivableAmount)
    },
    {
      title: '关联利润',
      key: 'relatedProfitAmount',
      width: 110,
      render: row => money(row.relatedProfitAmount)
    },
    {
      title: '订单时间',
      key: 'orderCreateTime',
      width: 170
    }
  ]"
            />

          </NCard>
        </NSpace>
      </NDrawerContent>
    </NDrawer>

    <NModal
      v-model:show="showCancelModal"
      preset="card"
      title="作废结算单"
      style="width: 560px"
    >
      <NForm label-placement="left" label-width="110">
        <NFormItem label="结算单号">
          <NInput :value="currentSettlement?.settlementNo" disabled/>
        </NFormItem>

        <NFormItem label="作废原因" required>
          <NInput
            v-model:value="cancelForm.reason"
            type="textarea"
            placeholder="请输入作废原因"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showCancelModal = false">取消</NButton>
          <NButton type="error" @click="submitCancel">
            确认作废
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal
      v-model:show="showManualAdjustmentModal"
      preset="card"
      title="新增手工业绩调整"
      style="width: 640px"
    >
      <NForm label-placement="left" label-width="120">
        <NFormItem label="业绩类型" required>
          <NSelect
            v-model:value="manualAdjustmentForm.settlementType"
            :options="settlementTypeOptions"
            @update:value="handleManualSettlementTypeChange"
          />
        </NFormItem>

        <NFormItem :label="employeeSelectLabel(manualAdjustmentForm.settlementType)" required>
          <NSelect
            v-model:value="manualAdjustmentForm.userId"
            :options="manualUserOptions"
            :loading="manualUserLoading"
            filterable
            clearable
            placeholder="请选择人员"
            @update:value="handleManualUserChange"
          />
        </NFormItem>

        <NFormItem label="已选员工">
          <NInput :value="manualAdjustmentForm.userName" disabled/>
        </NFormItem>

        <NFormItem label="关联订单ID">
          <NInput
            v-model:value="manualAdjustmentForm.orderId"
            placeholder="可选，关联订单ID"
          />
        </NFormItem>

        <NFormItem label="调整金额" required>
          <NInputNumber
            v-model:value="manualAdjustmentForm.adjustAmount"
            style="width: 220px"
            placeholder="正数补发，负数扣减"
          />

          <span style="margin-left: 8px; color: #999">
        正数为补发，负数为扣减
      </span>
        </NFormItem>

        <NFormItem label="调整日期">
          <NDatePicker
            v-model:value="manualAdjustmentForm.adjustmentDateValue"
            type="date"
            clearable
            style="width: 220px"
          />
        </NFormItem>

        <NFormItem label="调整原因" required>
          <NInput
            v-model:value="manualAdjustmentForm.reason"
            type="textarea"
            placeholder="请输入调整原因"
          />
        </NFormItem>

        <NFormItem label="备注">
          <NInput
            v-model:value="manualAdjustmentForm.remark"
            type="textarea"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showManualAdjustmentModal = false">取消</NButton>

          <NButton type="primary" @click="submitManualAdjustment">
            确认新增
          </NButton>
        </NSpace>
      </template>
    </NModal>


    <NModal
      v-model:show="showCancelAdjustmentModal"
      preset="card"
      title="取消业绩调整单"
      style="width: 560px"
    >
      <NForm label-placement="left" label-width="110">
        <NFormItem label="调整单号">
          <NInput :value="currentAdjustment?.adjustmentNo" disabled/>
        </NFormItem>

        <NFormItem label="调整金额">
          <strong>{{ money(currentAdjustment?.adjustAmount) }}</strong>
        </NFormItem>

        <NFormItem label="取消原因" required>
          <NInput
            v-model:value="cancelAdjustmentForm.reason"
            type="textarea"
            placeholder="请输入取消原因"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showCancelAdjustmentModal = false">取消</NButton>
          <NButton type="error" @click="submitCancelAdjustment">
            确认取消
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <StaffPerformanceSettlementPrintDrawer
      v-model:show="showPrintDrawer"
      :settlement-id="printSettlementId"
    />

  </NSpace>
</template>
