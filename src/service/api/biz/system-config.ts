import { request } from '@/service/request';

const BASE_URL = '/biz/system-config';

export interface BizSystemConfigOptionVO {
  label?: string;
  value?: string;
}

export interface BizSystemConfigDefinitionVO {
  configGroup?: string;
  groupName?: string;
  configKey?: string;
  configName?: string;
  configDesc?: string;
  configValue?: string;
  defaultValue?: string;
  valueType?: string;
  formType?: string;
  options?: BizSystemConfigOptionVO[];
  required?: boolean;
  editable?: boolean;
  sortOrder?: number;
}

export function fetchSystemConfigList(params?: { configGroup?: string }) {
  return request<any>({
    url: `${BASE_URL}/list`,
    method: 'get',
    params
  });
}

export function fetchSystemConfigMap() {
  return request<any>({
    url: `${BASE_URL}/map`,
    method: 'get'
  });
}

export function fetchSystemConfigRuntimeMap() {
  return request<any>({
    url: `${BASE_URL}/runtime-map`,
    method: 'get'
  });
}

export function saveSystemConfig(data: any) {
  return request<any>({
    url: `${BASE_URL}/save`,
    method: 'post',
    data
  });
}

export function resetSystemConfig(configKey: string) {
  return request<any>({
    url: `${BASE_URL}/${encodeURIComponent(configKey)}/reset`,
    method: 'post'
  });
}
