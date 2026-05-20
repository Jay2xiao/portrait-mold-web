import { request } from '@/service/request';

const BASE_URL = '/biz/productType';

export interface ProductTypeQuery {
  pageNum?: number;
  pageSize?: number;
  typeCode?: string;
  typeName?: string;
  status?: string;
}

export interface ProductTypeVO {
  id?: string | number;
  typeCode?: string;
  typeName?: string;
  status?: string;
  orderNum?: number;
  remark?: string;
  createTime?: string;
}

export type ProductTypeForm = Partial<ProductTypeVO>;

export function fetchProductTypeList(params: ProductTypeQuery) {
  return request<any>({
    url: `${BASE_URL}/list`,
    method: 'get',
    params
  });
}

export function fetchProductTypeDetail(id: string | number) {
  return request<any>({
    url: `${BASE_URL}/${id}`,
    method: 'get'
  });
}

export function addProductType(data: ProductTypeForm) {
  return request<any>({
    url: BASE_URL,
    method: 'post',
    data
  });
}

export function updateProductType(data: ProductTypeForm) {
  return request<any>({
    url: BASE_URL,
    method: 'put',
    data
  });
}

export function deleteProductType(ids: string | number | Array<string | number>) {
  return request<any>({
    url: `${BASE_URL}/${ids}`,
    method: 'delete'
  });
}

export async function fetchProductTypeOptions() {
  const res = await fetchProductTypeList({
    pageNum: 1,
    pageSize: 999,
    status: 'ENABLE'
  });

  const data = res.data || res;
  const rows = data.rows || [];

  return rows.map((item: ProductTypeVO) => ({
    label: item.typeName,
    value: item.typeCode,
    raw: item
  }));
}
