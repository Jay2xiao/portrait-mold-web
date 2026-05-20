<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  NSpace,
  NTag,
  useMessage
} from 'naive-ui';

import {
  fetchMyPrintTaskList,
  finishPrintTask,
  recordPrintMaterial,
  startPrintTask,
  type PrintTaskVO
} from '@/service/api/biz/print-task';

import BizFileViewer from '@/views/biz/components/BizFileViewer.vue';
import BizFileUpload from '@/views/biz/components/BizFileUpload.vue';
import BizFileThumbs from '@/views/biz/components/BizFileThumbs.vue';

defineOptions({
  name: 'BizMyPrintTask'
});

const message = useMessage();

const loading = ref(false);
const tableData = ref<PrintTaskVO[]>([]);
const total = ref(0);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  status: ''
});

const currentTask = ref<PrintTaskVO | null>(null);

const showFinishModal = ref(false);
const finishPhotoFileIdList = ref<Array<string | number>>([]);

const showMaterialModal = ref(false);

const entityWeightPhotoFileIdList = ref<Array<string | number>>([]);
const supportWeightPhotoFileIdList = ref<Array<string | number>>([]);

const materialForm = reactive({
  entityWeightG: 0,
  supportWeightG: 0,
  entityUnitPrice: 0,
  supportUnitPrice: 0,
  basePrintFee: 0,
  postProcessFee: 0,
  finalAmount: 0,
  remark: ''
});


const finishForm = reactive({
  remark: ''
});

const statusOptions = [
  { label: '待开始打印', value: 'WAIT_START' },
  { label: '打印中', value: 'PRINTING' },
  { label: '待材料录入', value: 'WAIT_MATERIAL_RECORD' },
  { label: '已完成', value: 'COMPLETED' }
];

function statusLabel(value?: string) {
  return statusOptions.find(item => item.value === value)?.label || value || '-';
}

function statusTagType(value?: string) {
  if (value === 'COMPLETED') return 'success';
  if (value === 'PRINTING') return 'info';
  if (value === 'WAIT_MATERIAL_RECORD') return 'warning';
  return 'default';
}

const columns = [
  {
    title: '任务号',
    key: 'taskNo',
    width: 160,
    fixed: 'left'
  },
  {
    title: '订单号',
    key: 'orderNoSnapshot',
    width: 160,
    fixed: 'left'
  },
  {
    title: '客户',
    key: 'customerNameSnapshot',
    width: 120,
    fixed: 'left'
  },
  {
    title: '产品',
    key: 'productNameSnapshot',
    width: 180
  },
  {
    title: '输入模型',
    key: 'inputModelFileIds',
    width: 180,
    render(row: PrintTaskVO) {
      return h(BizFileThumbs, {
        fileIds: row.inputModelFileIds,
        mode: 'download',
        max: 2
      });
    }
  },
  {
    title: '完成照片',
    key: 'finishPhotoFileIds',
    width: 120,
    render(row: PrintTaskVO) {
      return h(BizFileThumbs, {
        fileIds: row.finishPhotoFileIds,
        mode: 'image',
        max: 1,
        thumbSize: 48
      });
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 130,
    render(row: PrintTaskVO) {
      return h(
        NTag,
        { type: statusTagType(row.status) as any },
        { default: () => statusLabel(row.status) }
      );
    }
  },
  {
    title: '预估价',
    key: 'estimateAmount',
    width: 100
  },
  {
    title: '实体称重',
    key: 'entityWeightPhotoFileIds',
    width: 100,
    render(row: PrintTaskVO) {
      return h(BizFileThumbs, {
        fileIds: row.entityWeightPhotoFileIds,
        mode: 'image',
        max: 1,
        thumbSize: 48
      });
    }
  },
  {
    title: '支撑称重',
    key: 'supportWeightPhotoFileIds',
    width: 100,
    render(row: PrintTaskVO) {
      return h(BizFileThumbs, {
        fileIds: row.supportWeightPhotoFileIds,
        mode: 'image',
        max: 1,
        thumbSize: 48
      });
    }
  },
  {
    title: '开始时间',
    key: 'startTime',
    width: 170
  },
  {
    title: '完成时间',
    key: 'finishTime',
    width: 170
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    fixed: 'right',
    render(row: PrintTaskVO) {
      const buttons: any[] = [];

      if (row.status === 'WAIT_START') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'success',
              onClick: () => handleStart(row)
            },
            { default: () => '开始打印' }
          )
        );
      }

      if (row.status === 'PRINTING') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => openFinish(row)
            },
            { default: () => '完成打印' }
          )
        );
      }

      if (row.status === 'WAIT_MATERIAL_RECORD') {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              onClick: () => openMaterialRecord(row)
            },
            { default: () => '材料录入' }
          )
        );
      }

      if (buttons.length === 0) {
        buttons.push(
          h(
            NButton,
            {
              size: 'small',
              disabled: true
            },
            { default: () => '无操作' }
          )
        );
      }

      return h(
        NSpace,
        {},
        {
          default: () => buttons
        }
      );
    }
  }
];

async function getList() {
  loading.value = true;
  try {
    const res = await fetchMyPrintTaskList(queryParams);
    const data = res.data || res;
    tableData.value = data.rows || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.status = '';
  queryParams.pageNum = 1;
  getList();
}

async function handleStart(row: PrintTaskVO) {
  if (!row.id) return;

  await startPrintTask(row.id);
  message.success('已开始打印');
  getList();
}

function openFinish(row: PrintTaskVO) {
  currentTask.value = row;
  finishPhotoFileIdList.value = row.finishPhotoFileIds ? row.finishPhotoFileIds.split(',') : [];
  finishForm.remark = '';
  showFinishModal.value = true;
}

async function submitFinish() {
  if (!currentTask.value?.id) return;

  if (finishPhotoFileIdList.value.length === 0) {
    message.warning('请上传打印完成照片');
    return;
  }

  await finishPrintTask(currentTask.value.id, {
    finishPhotoFileIds: finishPhotoFileIdList.value.join(','),
    remark: finishForm.remark
  });

  message.success('打印已完成，进入待材料录入');
  showFinishModal.value = false;
  getList();
}

function handlePageChange(page: number) {
  queryParams.pageNum = page;
  getList();
}

function handlePageSizeChange(pageSize: number) {
  queryParams.pageSize = pageSize;
  queryParams.pageNum = 1;
  getList();
}

function openMaterialRecord(row: PrintTaskVO) {
  currentTask.value = row;

  materialForm.entityWeightG = row.entityWeightG || 0;
  materialForm.supportWeightG = row.supportWeightG || 0;
  materialForm.entityUnitPrice = row.entityUnitPrice || 0;
  materialForm.supportUnitPrice = row.supportUnitPrice || 0;
  materialForm.basePrintFee = row.basePrintFee || 0;
  materialForm.postProcessFee = row.postProcessFee || 0;
  materialForm.finalAmount = row.finalAmount || 0;
  materialForm.remark = '';

  entityWeightPhotoFileIdList.value = row.entityWeightPhotoFileIds
    ? row.entityWeightPhotoFileIds.split(',')
    : [];

  supportWeightPhotoFileIdList.value = row.supportWeightPhotoFileIds
    ? row.supportWeightPhotoFileIds.split(',')
    : [];

  calcFinalAmount();

  showMaterialModal.value = true;
}

function calcFinalAmount() {
  const entityAmount = Number(materialForm.entityWeightG || 0) * Number(materialForm.entityUnitPrice || 0);
  const supportAmount = Number(materialForm.supportWeightG || 0) * Number(materialForm.supportUnitPrice || 0);
  const baseFee = Number(materialForm.basePrintFee || 0);
  const postFee = Number(materialForm.postProcessFee || 0);

  materialForm.finalAmount = Number((entityAmount + supportAmount + baseFee + postFee).toFixed(2));
}

async function submitMaterialRecord() {
  if (!currentTask.value?.id) return;

  if (entityWeightPhotoFileIdList.value.length === 0) {
    message.warning('请上传实体材料称重照片');
    return;
  }

  if (supportWeightPhotoFileIdList.value.length === 0) {
    message.warning('请上传支撑材料称重照片');
    return;
  }

  await recordPrintMaterial(currentTask.value.id, {
    ...materialForm,
    entityWeightPhotoFileIds: entityWeightPhotoFileIdList.value.join(','),
    supportWeightPhotoFileIds: supportWeightPhotoFileIdList.value.join(',')
  });

  message.success('材料录入完成，订单进入待交付');
  showMaterialModal.value = false;
  getList();
}


onMounted(() => {
  getList();
});
</script>

<template>
  <NCard title="我的打印任务" :bordered="false">
    <NSpace vertical :size="16">
      <NForm inline label-placement="left">
        <NFormItem label="状态">
          <NSelect
            v-model:value="queryParams.status"
            :options="statusOptions"
            clearable
            style="width: 160px"
          />
        </NFormItem>

        <NFormItem>
          <NSpace>
            <NButton type="primary" @click="getList">查询</NButton>
            <NButton @click="resetQuery">重置</NButton>
          </NSpace>
        </NFormItem>
      </NForm>

      <NDataTable
        remote
        size="small"
        :single-line="false"
        :loading="loading"
        :columns="columns"
        :data="tableData"
        :scroll-x="1500"
        :pagination="{
          page: queryParams.pageNum,
          pageSize: queryParams.pageSize,
          itemCount: total,
          showSizePicker: true,
          pageSizes: [10, 20, 50],
          onUpdatePage: handlePageChange,
          onUpdatePageSize: handlePageSizeChange
        }"
      />
    </NSpace>

    <NModal v-model:show="showFinishModal" preset="card" title="完成打印" style="width: 680px">
      <NForm label-placement="left" label-width="120">
        <NFormItem label="输入模型">
          <BizFileViewer
            :file-ids="currentTask?.inputModelFileIds"
            mode="download"
            :max="5"
          />
        </NFormItem>

        <NFormItem label="完成照片" required>
          <BizFileUpload
            v-model="finishPhotoFileIdList"
            biz-type="PRINT_TASK"
            :biz-id="currentTask?.id"
            :order-id="currentTask?.orderId"
            :task-id="currentTask?.id"
            file-stage="PRINT_OUTPUT"
            file-type="PRINT_FINISH_PHOTO"
            :max="10"
          />
        </NFormItem>

        <NFormItem label="备注">
          <NInput v-model:value="finishForm.remark" type="textarea" placeholder="请输入备注" />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showFinishModal = false">取消</NButton>
          <NButton type="primary" @click="submitFinish">确认完成</NButton>
        </NSpace>
      </template>
    </NModal>

    <NModal v-model:show="showMaterialModal" preset="card" title="打印材料录入" style="width: 760px">
      <NForm label-placement="left" label-width="130">
        <NFormItem label="输入模型">
          <BizFileViewer
            :file-ids="currentTask?.inputModelFileIds"
            mode="download"
            :max="5"
          />
        </NFormItem>

        <NFormItem label="打印完成照片">
          <BizFileViewer
            :file-ids="currentTask?.finishPhotoFileIds"
            mode="image"
            :max="5"
            :thumb-size="80"
          />
        </NFormItem>

        <NFormItem label="实体材料克数">
          <NInputNumber
            v-model:value="materialForm.entityWeightG"
            :min="0"
            style="width: 220px"
            @update:value="calcFinalAmount"
          />
        </NFormItem>

        <NFormItem label="实体单克价格">
          <NInputNumber
            v-model:value="materialForm.entityUnitPrice"
            :min="0"
            style="width: 220px"
            @update:value="calcFinalAmount"
          />
        </NFormItem>

        <NFormItem label="实体称重照片" required>
          <BizFileUpload
            v-model="entityWeightPhotoFileIdList"
            biz-type="PRINT_TASK"
            :biz-id="currentTask?.id"
            :order-id="currentTask?.orderId"
            :task-id="currentTask?.id"
            file-stage="PRINT_MATERIAL"
            file-type="ENTITY_WEIGHT_PHOTO"
            :max="5"
          />
        </NFormItem>

        <NFormItem label="支撑材料克数">
          <NInputNumber
            v-model:value="materialForm.supportWeightG"
            :min="0"
            style="width: 220px"
            @update:value="calcFinalAmount"
          />
        </NFormItem>

        <NFormItem label="支撑单克价格">
          <NInputNumber
            v-model:value="materialForm.supportUnitPrice"
            :min="0"
            style="width: 220px"
            @update:value="calcFinalAmount"
          />
        </NFormItem>

        <NFormItem label="支撑称重照片" required>
          <BizFileUpload
            v-model="supportWeightPhotoFileIdList"
            biz-type="PRINT_TASK"
            :biz-id="currentTask?.id"
            :order-id="currentTask?.orderId"
            :task-id="currentTask?.id"
            file-stage="PRINT_MATERIAL"
            file-type="SUPPORT_WEIGHT_PHOTO"
            :max="5"
          />
        </NFormItem>

        <NFormItem label="基础打印费">
          <NInputNumber
            v-model:value="materialForm.basePrintFee"
            :min="0"
            style="width: 220px"
            @update:value="calcFinalAmount"
          />
        </NFormItem>

        <NFormItem label="后处理费">
          <NInputNumber
            v-model:value="materialForm.postProcessFee"
            :min="0"
            style="width: 220px"
            @update:value="calcFinalAmount"
          />
        </NFormItem>

        <NFormItem label="打印最终金额">
          <NInputNumber
            v-model:value="materialForm.finalAmount"
            :min="0"
            style="width: 220px"
          />
        </NFormItem>

        <NFormItem label="备注">
          <NInput
            v-model:value="materialForm.remark"
            type="textarea"
            placeholder="请输入备注"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showMaterialModal = false">取消</NButton>
          <NButton type="primary" @click="submitMaterialRecord">确认完成</NButton>
        </NSpace>
      </template>
    </NModal>

  </NCard>
</template>
