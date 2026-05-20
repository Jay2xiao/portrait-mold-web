import { request } from '@/service/request';

const BASE_URL = '/biz/productCostRule';

export interface ProductCostRuleQuery {
  pageNum?: number;
  pageSize?: number;
  productType?: string;
  repairSource?: string;
  ruleMode?: string;
  status?: string;
}

export interface ProductCostRuleVO {
  id?: string | number;
  productType?: string;
  repairSource?: string;
  ruleMode?: string;
  ratioBase?: string;

  hdAmount?: number;
  aiModelAmount?: number;
  followAmount?: number;
  companyCostAmount?: number;
  repairManualAmount?: number;

  companyCostRate?: number;
  followRate?: number;
  repairManualRate?: number;

  repairLimitHours?: number;
  remindBeforeMinutes?: number;

  status?: string;
  remark?: string;
  createTime?: string;
}

export type ProductCostRuleForm = Partial<ProductCostRuleVO>;

export function fetchProductCostRuleList(params: ProductCostRuleQuery) {
  return request<any>({
    url: `${BASE_URL}/list`,
    method: 'get',
    params
  });
}

export function fetchProductCostRuleDetail(id: string | number) {
  return request<any>({
    url: `${BASE_URL}/${id}`,
    method: 'get'
  });
}

export function addProductCostRule(data: ProductCostRuleForm) {
  return request<any>({
    url: BASE_URL,
    method: 'post',
    data
  });
}

export function updateProductCostRule(data: ProductCostRuleForm) {
  return request<any>({
    url: BASE_URL,
    method: 'put',
    data
  });
}

export function deleteProductCostRule(ids: string | number | Array<string | number>) {
  return request<any>({
    url: `${BASE_URL}/${ids}`,
    method: 'delete'
  });
}

/**
 * 订单录入时预览套规则结果
 * 需要后端补一个 POST /biz/productCostRule/preview
 */
export function previewProductCostRule(data: any) {
  return request<any>({
    url: `${BASE_URL}/preview`,
    method: 'post',
    data
  });
}
