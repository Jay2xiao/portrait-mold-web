<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, VNodeChild } from 'vue';

import {
  NAlert,
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
  type PrintTaskSpecVO,
  type PrintTaskVO
} from '@/service/api/biz/print-task';


import BizFileViewer from '@/views/biz/components/BizFileViewer.vue';
import BizFileUpload from '@/views/biz/components/BizFileUpload.vue';
import BizFileThumbs from '@/views/biz/components/BizFileThumbs.vue';
import PrintTaskDetailDrawer from '@/views/biz/components/PrintTaskDetailDrawer.vue';

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
const showDetailDrawer = ref(false);
const detailTaskId = ref<string | number | undefined>();

const showFinishModal = ref(false);
const finishPhotoFileIdList = ref<Array<string | number>>([]);

const showMaterialModal = ref(false);

const entityWeightPhotoFileIdList = ref<Array<string | number>>([]);
const supportWeightPhotoFileIdList = ref<Array<string | number>>([]);

interface MaterialSpecRow extends PrintTaskSpecVO {
  actualEntityWeightG?: number;       // 原: number | null | undefined
  actualSupportWeightG?: number;      // 原: number | null | undefined
  actualEntityUnitPrice?: number;     // 原: number | null | undefined
  actualSupportUnitPrice?: number;    // 原: number | null | undefined
  entityWeightPhotoFileIdList?: Array<string | number>;
  supportWeightPhotoFileIdList?: Array<string | number>;
  materialRemark?: string;
}

const materialSpecRows = ref<MaterialSpecRow[]>([]);

const hasMaterialSpecs = computed(() => materialSpecRows.value.length > 0);


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
    fixed: 'left' as const
  },
  {
    title: '订单号',
    key: 'orderNoSnapshot',
    width: 160,
    fixed: 'left' as const
  },
  {
    title: '客户',
    key: 'customerNameSnapshot',
    width: 120,
    fixed: 'left' as const
  },
  {
    title: '产品',
    key: 'productNameSnapshot',
    width: 180
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
    title: '打印规格',
    key: 'printSpecs',
    width: 220,
    render(row: PrintTaskVO) {
      const specs = row.printSpecs || [];

      if (specs.length === 0) {
        return '-';
      }

      return h(
        NSpace,
        {
          vertical: true,
          size: 4
        },
        {
          default: () =>
            specs.map((spec, index) =>
              h(
                NTag,
                {
                  key: spec.id || index,
                  size: 'small',
                  type: 'info',
                  bordered: false,
                  round: true
                },
                {
                  default: () => `${spec.heightCm || '-'}cm / 1件`
                }
              )
            )
        }
      );
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    fixed: 'right' as const,
    render(row: PrintTaskVO) {
      const buttons: VNodeChild[] = [];
      buttons.push(
        h(
          NButton,
          {
            size: 'small',
            onClick: () => openDetail(row)
          },
          { default: () => '详情' }
        )
      );

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

function openDetail(row: PrintTaskVO) {
  detailTaskId.value = row.id;
  showDetailDrawer.value = true;
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
  if (!row.printSpecs || row.printSpecs.length === 0) {
    message.warning('当前打印任务缺少打印规格，请先补充打印规格后再录入材料');
    return;
  }

  currentTask.value = row;

  materialForm.entityWeightG = row.entityWeightG || 0;
  materialForm.supportWeightG = row.supportWeightG || 0;
  materialForm.entityUnitPrice = row.entityUnitPrice || 0;
  materialForm.supportUnitPrice = row.supportUnitPrice || 0;
  materialForm.basePrintFee = row.basePrintFee || 0;
  materialForm.postProcessFee = row.postProcessFee || 0;
  materialForm.finalAmount = row.finalAmount || 0;
  materialForm.remark = '';

  materialSpecRows.value = (row.printSpecs || []).map(item => ({
    ...item,
    actualEntityWeightG: item.actualEntityWeightG ?? 0,
    actualSupportWeightG: item.actualSupportWeightG ?? 0,
    actualEntityUnitPrice: item.actualEntityUnitPrice ?? row.entityUnitPrice ?? 0,
    actualSupportUnitPrice: item.actualSupportUnitPrice ?? row.supportUnitPrice ?? 0,
    actualEntityWeightPhotoFileIds: item.actualEntityWeightPhotoFileIds || '',
    actualSupportWeightPhotoFileIds: item.actualSupportWeightPhotoFileIds || '',
    entityWeightPhotoFileIdList: item.actualEntityWeightPhotoFileIds ? item.actualEntityWeightPhotoFileIds.split(',') : [],
    supportWeightPhotoFileIdList: item.actualSupportWeightPhotoFileIds ? item.actualSupportWeightPhotoFileIds.split(',') : [],
    materialRemark: item.materialRemark || ''
  }));

  entityWeightPhotoFileIdList.value = row.entityWeightPhotoFileIds
    ? row.entityWeightPhotoFileIds.split(',')
    : [];

  supportWeightPhotoFileIdList.value = row.supportWeightPhotoFileIds
    ? row.supportWeightPhotoFileIds.split(',')
    : [];

  calcFinalAmount();

  showMaterialModal.value = true;
}


function toNumber(value: unknown) {
  const result = Number(value || 0);

  return Number.isFinite(result) ? result : 0;
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function round4(value: number) {
  return Number(value.toFixed(4));
}

function calcSpecAmount(row: MaterialSpecRow) {
  const entityAmount = toNumber(row.actualEntityWeightG) * toNumber(row.actualEntityUnitPrice);
  const supportAmount = toNumber(row.actualSupportWeightG) * toNumber(row.actualSupportUnitPrice);

  return round2(entityAmount + supportAmount);
}

function calcFinalAmount() {
  const baseFee = toNumber(materialForm.basePrintFee);
  const postFee = toNumber(materialForm.postProcessFee);

  if (hasMaterialSpecs.value) {
    let entityWeight = 0;
    let supportWeight = 0;
    let entityAmount = 0;
    let supportAmount = 0;

    materialSpecRows.value.forEach(row => {
      const rowEntityWeight = toNumber(row.actualEntityWeightG);
      const rowSupportWeight = toNumber(row.actualSupportWeightG);
      const rowEntityPrice = toNumber(row.actualEntityUnitPrice);
      const rowSupportPrice = toNumber(row.actualSupportUnitPrice);

      entityWeight += rowEntityWeight;
      supportWeight += rowSupportWeight;
      entityAmount += rowEntityWeight * rowEntityPrice;
      supportAmount += rowSupportWeight * rowSupportPrice;
    });

    materialForm.entityWeightG = round2(entityWeight);
    materialForm.supportWeightG = round2(supportWeight);
    materialForm.entityUnitPrice = entityWeight > 0 ? round4(entityAmount / entityWeight) : 0;
    materialForm.supportUnitPrice = supportWeight > 0 ? round4(supportAmount / supportWeight) : 0;
    materialForm.finalAmount = round2(entityAmount + supportAmount + baseFee + postFee);

    return;
  }

  const entityAmount = toNumber(materialForm.entityWeightG) * toNumber(materialForm.entityUnitPrice);
  const supportAmount = toNumber(materialForm.supportWeightG) * toNumber(materialForm.supportUnitPrice);

  materialForm.finalAmount = round2(entityAmount + supportAmount + baseFee + postFee);
}

function validateMaterialSpecs() {
  if (!hasMaterialSpecs.value) {
    message.warning('当前打印任务缺少打印规格，不能录入材料');
    return false;
  }

  for (const [index, row] of materialSpecRows.value.entries()) {
    const entityWeight = toNumber(row.actualEntityWeightG);
    const supportWeight = toNumber(row.actualSupportWeightG);
    const entityPrice = toNumber(row.actualEntityUnitPrice);
    const supportPrice = toNumber(row.actualSupportUnitPrice);

    if (entityWeight + supportWeight <= 0) {
      message.warning(`第 ${index + 1} 条打印规格至少需要录入实体或支撑材料克数`);
      return false;
    }

    if (entityWeight > 0 && entityPrice <= 0) {
      message.warning(`第 ${index + 1} 条打印规格请填写实体材料单克价格`);
      return false;
    }

    if (supportWeight > 0 && supportPrice <= 0) {
      message.warning(`第 ${index + 1} 条打印规格请填写支撑材料单克价格`);
      return false;
    }

    if (!row.entityWeightPhotoFileIdList || row.entityWeightPhotoFileIdList.length === 0) {
      message.warning(`第 ${index + 1} 条打印规格请上传实体称重照片`);
      return false;
    }
  }

  return true;
}

function buildMaterialSpecPayload() {
  if (!hasMaterialSpecs.value) {
    return [];
  }

  return materialSpecRows.value.map(row => ({
    id: row.id,
    sourceCollabSpecId: row.sourceCollabSpecId,

    heightCm: row.heightCm,
    quantity: row.quantity,
    estimatedWeightG: row.estimatedWeightG ?? null,
    estimatedAmount: row.estimatedAmount ?? null,

    actualEntityWeightG: toNumber(row.actualEntityWeightG),
    actualSupportWeightG: toNumber(row.actualSupportWeightG),
    actualEntityUnitPrice: toNumber(row.actualEntityUnitPrice),
    actualEntityWeightPhotoFileIds: (row.entityWeightPhotoFileIdList || []).join(','),
    actualSupportWeightPhotoFileIds: (row.supportWeightPhotoFileIdList || []).join(','),
    actualSupportUnitPrice: toNumber(row.actualSupportUnitPrice),

    materialRemark: row.materialRemark || '',
    remark: row.remark || ''
  }));
}


async function submitMaterialRecord() {
  if (!currentTask.value?.id) return;

  if (!hasMaterialSpecs.value && entityWeightPhotoFileIdList.value.length === 0) {
    message.warning('请上传实体材料称重照片');
    return;
  }

  if (!hasMaterialSpecs.value && supportWeightPhotoFileIdList.value.length === 0) {
    message.warning('请上传支撑材料称重照片');
    return;
  }

  if (!validateMaterialSpecs()) {
    return;
  }

  calcFinalAmount();

  await recordPrintMaterial(currentTask.value.id, {
    ...materialForm,
    entityWeightPhotoFileIds: entityWeightPhotoFileIdList.value.join(','),
    supportWeightPhotoFileIds: supportWeightPhotoFileIdList.value.join(','),
    printSpecs: buildMaterialSpecPayload()
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

        <NCard
          v-if="hasMaterialSpecs"
          title="按打印规格录入真实材料"
          size="small"
          :bordered="true"
          style="margin-bottom: 12px"
        >
          <NSpace vertical :size="12">
            <NAlert type="warning" show-icon>
              当前打印任务包含多条打印规格。请按每种高度录入真实实体克数、支撑克数和单克价格。最终金额以后端按真实数据计算为准。
            </NAlert>

            <NCard
              v-for="(row, index) in materialSpecRows"
              :key="row.id || index"
              size="small"
              :bordered="true"
            >
              <template #header>
                <NSpace align="center">
                  <NTag type="info" size="small" :bordered="false" round>
                    规格 {{ index + 1 }}
                  </NTag>

                  <span>
            高度：{{ row.heightCm || '-' }} cm，单件规格
          </span>

                  <span style="color: #999">
            参考：{{ row.estimatedWeightG || 0 }}g / {{ row.estimatedAmount || 0 }}元
          </span>
                </NSpace>
              </template>

              <NSpace vertical :size="8">
                <NSpace :size="12" align="center" wrap>
                  <NFormItem label="实体克数">
                    <NInputNumber
                      v-model:value="row.actualEntityWeightG"
                      :min="0"
                      :precision="2"
                      style="width: 150px"
                      @update:value="calcFinalAmount"
                    />
                  </NFormItem>

                  <NFormItem label="实体单价">
                    <NInputNumber
                      v-model:value="row.actualEntityUnitPrice"
                      :min="0"
                      :precision="4"
                      style="width: 150px"
                      @update:value="calcFinalAmount"
                    />
                  </NFormItem>

                  <NFormItem label="支撑克数">
                    <NInputNumber
                      v-model:value="row.actualSupportWeightG"
                      :min="0"
                      :precision="2"
                      style="width: 150px"
                      @update:value="calcFinalAmount"
                    />
                  </NFormItem>

                  <NFormItem label="支撑单价">
                    <NInputNumber
                      v-model:value="row.actualSupportUnitPrice"
                      :min="0"
                      :precision="4"
                      style="width: 150px"
                      @update:value="calcFinalAmount"
                    />
                  </NFormItem>

                  <NFormItem label="小计">
                    <NTag type="success" :bordered="false" round>
                      {{ calcSpecAmount(row) }} 元
                    </NTag>
                  </NFormItem>
                </NSpace>

                <NSpace :size="12" align="start" wrap>
                  <NFormItem label="实体称重照片" required>
                    <BizFileUpload
                      v-model="row.entityWeightPhotoFileIdList"
                      biz-type="PRINT_TASK_SPEC"
                      :biz-id="row.id"
                      :order-id="currentTask?.orderId"
                      :task-id="currentTask?.id"
                      file-stage="PRINT_MATERIAL"
                      file-type="SPEC_ENTITY_WEIGHT_PHOTO"
                      :max="3"
                    />
                  </NFormItem>

                  <NFormItem label="支撑称重照片">
                    <BizFileUpload
                      v-model="row.supportWeightPhotoFileIdList"
                      biz-type="PRINT_TASK_SPEC"
                      :biz-id="row.id"
                      :order-id="currentTask?.orderId"
                      :task-id="currentTask?.id"
                      file-stage="PRINT_MATERIAL"
                      file-type="SPEC_SUPPORT_WEIGHT_PHOTO"
                      :max="3"
                    />
                  </NFormItem>
                </NSpace>

                <NInput
                  v-model:value="row.materialRemark"
                  placeholder="该规格材料备注，可选"
                />
              </NSpace>
            </NCard>
          </NSpace>
        </NCard>


        <template v-if="!hasMaterialSpecs">
          <NAlert type="error" show-icon>
            当前打印任务缺少打印规格，不能录入材料。请先在订单或协作发单流程补齐打印规格。
          </NAlert>
        </template>

        <template v-if="false">
          <!-- 原来的实体材料克数、实体单克价格、支撑材料克数、支撑单克价格 -->

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
        </template>

        <template v-else>
          <NFormItem label="汇总实体克数">
            <NInputNumber
              v-model:value="materialForm.entityWeightG"
              disabled
              style="width: 220px"
            />
          </NFormItem>

          <NFormItem label="汇总支撑克数">
            <NInputNumber
              v-model:value="materialForm.supportWeightG"
              disabled
              style="width: 220px"
            />
          </NFormItem>

          <NFormItem label="实体加权单价">
            <NInputNumber
              v-model:value="materialForm.entityUnitPrice"
              disabled
              style="width: 220px"
            />
          </NFormItem>

          <NFormItem label="支撑加权单价">
            <NInputNumber
              v-model:value="materialForm.supportUnitPrice"
              disabled
              style="width: 220px"
            />
          </NFormItem>
        </template>

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
            :disabled="hasMaterialSpecs"
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

    <PrintTaskDetailDrawer
      v-model:show="showDetailDrawer"
      :task-id="detailTaskId"
    />

  </NCard>
</template>
