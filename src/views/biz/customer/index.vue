<script setup lang="ts">
import {onMounted, reactive, ref} from 'vue';
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPopconfirm,
  NSelect,
  NSpace,
  useMessage
} from 'naive-ui';
import {
  addCustomer,
  deleteCustomer,
  fetchCustomerList,
  updateCustomer,
  type CustomerForm,
  type CustomerVO
} from '@/service/api/biz/customer';

const message = useMessage();

const loading = ref(false);
const tableData = ref<CustomerVO[]>([]);
const total = ref(0);

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  customerName: '',
  phone: '',
  wechatNo: '',
  sourceType: '',
  status: ''
});

const showModal = ref(false);
const modalTitle = ref('新增客户');

const form = reactive<CustomerForm>({
  id: undefined,
  customerName: '',
  phone: '',
  wechatNo: '',
  address: '',
  sourceType: 'WECHAT',
  tags: '',
  status: 'NORMAL',
  remark: '',
  settlementType: 'IMMEDIATE',
  allowUnpaidDelivery: '0',
  settlementCycleDays: 30,
  creditLimit: 0

});

const settlementTypeOptions = [
  {label: '现结：发货前必须结清', value: 'IMMEDIATE'},
  {label: '周期结算：先发货，定期结算', value: 'PERIODIC'},
  {label: '月结：月底统一结算', value: 'MONTHLY'}
];

const yesNoOptions = [
  {label: '是', value: '1'},
  {label: '否', value: '0'}
];


const sourceOptions = [
  {label: '微信', value: 'WECHAT'},
  {label: '到店', value: 'STORE'},
  {label: '电话', value: 'PHONE'},
  {label: '复购', value: 'REBUY'},
  {label: '转介绍', value: 'REFERRAL'}
];

const statusOptions = [
  {label: '正常', value: 'NORMAL'},
  {label: '停用', value: 'DISABLED'}
];

const columns = [
  {
    title: '客户编号',
    key: 'customerNo',
    width: 160
  },
  {
    title: '客户姓名',
    key: 'customerName',
    width: 140
  },
  {
    title: '手机号',
    key: 'phone',
    width: 140
  },
  {
    title: '微信号',
    key: 'wechatNo',
    width: 160
  },
  {
    title: '来源',
    key: 'sourceType',
    width: 100
  },
  {
    title: '累计订单',
    key: 'totalOrderCount',
    width: 100
  },
  {
    title: '累计消费',
    key: 'totalAmount',
    width: 120
  },
  {
    title: '未结金额',
    key: 'unpaidAmount',
    width: 120
  },
  {
    title: '结算方式',
    key: 'settlementType',
    width: 140,
    render(row: any) {
      return settlementTypeOptions.find(item => item.value === row.settlementType)?.label || row.settlementType || '-';
    }
  },
  {
    title: '欠款发货',
    key: 'allowUnpaidDelivery',
    width: 100,
    render(row: any) {
      return row.allowUnpaidDelivery === '1' ? '允许' : '不允许';
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 100
  },
  {
    title: '创建时间',
    key: 'createTime',
    width: 180
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    render(row: CustomerVO) {
      return h(
        NSpace,
        {},
        {
          default: () => [
            h(
              NButton,
              {
                size: 'small',
                type: 'primary',
                onClick: () => handleEdit(row)
              },
              {default: () => '编辑'}
            ),
            h(
              NPopconfirm,
              {
                onPositiveClick: () => handleDelete(row)
              },
              {
                trigger: () =>
                  h(
                    NButton,
                    {
                      size: 'small',
                      type: 'error'
                    },
                    {default: () => '删除'}
                  ),
                default: () => '确认删除该客户吗？'
              }
            )
          ]
        }
      );
    }
  }
];

async function getList() {
  loading.value = true;
  try {
    const res = await fetchCustomerList(queryParams);

    // 兼容 RuoYi 常见返回结构
    const data = res.data || res;

    tableData.value = data.rows || [];
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

function resetQuery() {
  queryParams.customerName = '';
  queryParams.phone = '';
  queryParams.wechatNo = '';
  queryParams.sourceType = '';
  queryParams.status = '';
  queryParams.pageNum = 1;
  getList();
}

function resetForm() {
  form.id = undefined;
  form.customerName = '';
  form.phone = '';
  form.wechatNo = '';
  form.address = '';
  form.sourceType = 'WECHAT';
  form.tags = '';
  form.status = 'NORMAL';
  form.remark = '';
}

function handleAdd() {
  resetForm();
  modalTitle.value = '新增客户';
  showModal.value = true;
}

function handleEdit(row: CustomerVO) {
  resetForm();
  Object.assign(form, row);
  modalTitle.value = '编辑客户';
  showModal.value = true;
}

async function handleSubmit() {
  if (!form.customerName) {
    message.warning('请输入客户姓名');
    return;
  }

  if (!form.phone && !form.wechatNo) {
    message.warning('手机号和微信号至少填写一个');
    return;
  }

  if (form.id) {
    await updateCustomer(form);
    message.success('修改成功');
  } else {
    await addCustomer(form);
    message.success('新增成功');
  }

  showModal.value = false;
  getList();
}

async function handleDelete(row: CustomerVO) {
  if (!row.id) return;

  await deleteCustomer(row.id);
  message.success('删除成功');
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

onMounted(() => {
  getList();
});
</script>

<script lang="ts">
import {h} from 'vue';

export default {
  name: 'BizCustomer'
};
</script>

<template>
  <NCard title="客户管理" :bordered="false">
    <NSpace vertical :size="16">
      <NForm inline label-placement="left">
        <NFormItem label="客户姓名">
          <NInput v-model:value="queryParams.customerName" placeholder="请输入客户姓名" clearable/>
        </NFormItem>

        <NFormItem label="手机号">
          <NInput v-model:value="queryParams.phone" placeholder="请输入手机号" clearable/>
        </NFormItem>

        <NFormItem label="微信号">
          <NInput v-model:value="queryParams.wechatNo" placeholder="请输入微信号" clearable/>
        </NFormItem>

        <NFormItem label="来源">
          <NSelect
            v-model:value="queryParams.sourceType"
            :options="sourceOptions"
            clearable
            style="width: 140px"
          />
        </NFormItem>

        <NFormItem label="状态">
          <NSelect
            v-model:value="queryParams.status"
            :options="statusOptions"
            clearable
            style="width: 120px"
          />
        </NFormItem>

        <NFormItem>
          <NSpace>
            <NButton type="primary" @click="getList">查询</NButton>
            <NButton @click="resetQuery">重置</NButton>
            <NButton type="success" @click="handleAdd">新增客户</NButton>
          </NSpace>
        </NFormItem>
      </NForm>

      <NDataTable
        remote
        :loading="loading"
        :columns="columns"
        :data="tableData"
        :pagination="{
          page: queryParams.pageNum,
          pageSize: queryParams.pageSize,
          itemCount: total,
          showSizePicker: true,
          pageSizes: [10, 20, 50, 100],
          onUpdatePage: handlePageChange,
          onUpdatePageSize: handlePageSizeChange
        }"
      />
    </NSpace>

    <NModal v-model:show="showModal" preset="card" :title="modalTitle" style="width: 680px">
      <NForm label-placement="left" label-width="100">
        <NFormItem label="客户姓名" required>
          <NInput v-model:value="form.customerName" placeholder="请输入客户姓名/昵称"/>
        </NFormItem>

        <NFormItem label="手机号">
          <NInput v-model:value="form.phone" placeholder="请输入手机号"/>
        </NFormItem>

        <NFormItem label="微信号">
          <NInput v-model:value="form.wechatNo" placeholder="请输入微信号"/>
        </NFormItem>

        <NFormItem label="结算方式">
          <NSelect
            v-model:value="form.settlementType"
            :options="settlementTypeOptions"
          />
        </NFormItem>

        <NFormItem label="允许欠款发货">
          <NSelect
            v-model:value="form.allowUnpaidDelivery"
            :options="yesNoOptions"
          />
        </NFormItem>

        <NFormItem label="结算周期/天">
          <NInputNumber
            v-model:value="form.settlementCycleDays"
            :min="1"
            style="width: 180px"
          />
        </NFormItem>

        <NFormItem label="授信额度">
          <NInputNumber
            v-model:value="form.creditLimit"
            :min="0"
            style="width: 180px"
          />
        </NFormItem>

        <NFormItem label="默认地址">
          <NInput
            v-model:value="form.address"
            type="textarea"
            placeholder="请输入默认收货地址"
          />
        </NFormItem>

        <NFormItem label="客户来源">
          <NSelect v-model:value="form.sourceType" :options="sourceOptions"/>
        </NFormItem>

        <NFormItem label="客户标签">
          <NInput v-model:value="form.tags" placeholder="例如：老客,高价值,欠款"/>
        </NFormItem>

        <NFormItem label="状态">
          <NSelect v-model:value="form.status" :options="statusOptions"/>
        </NFormItem>

        <NFormItem label="备注">
          <NInput v-model:value="form.remark" type="textarea" placeholder="请输入备注"/>
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showModal = false">取消</NButton>
          <NButton type="primary" @click="handleSubmit">保存</NButton>
        </NSpace>
      </template>
    </NModal>
  </NCard>
</template>
