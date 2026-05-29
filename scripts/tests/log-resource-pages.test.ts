import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const expectedFiles = [
  'src/service/api/biz/order-log.ts',
  'src/views/biz/orderLog/index.vue',
  'src/service/api/biz/finance-operation-log.ts',
  'src/views/log/financeOperationLog/index.vue',
  'src/service/api/biz/tenant-resource-order.ts',
  'src/views/resource/tenantResourceOrder/index.vue',
  'src/service/api/biz/tenant-resource-usage-log.ts',
  'src/views/resource/tenantResourceUsageLog/index.vue'
];

for (const file of expectedFiles) {
  assert.equal(existsSync(resolve(file)), true, `${file} should exist`);
}

const orderLogApi = readFileSync(resolve('src/service/api/biz/order-log.ts'), 'utf8');
const financeLogApi = readFileSync(resolve('src/service/api/biz/finance-operation-log.ts'), 'utf8');
const resourceOrderApi = readFileSync(resolve('src/service/api/biz/tenant-resource-order.ts'), 'utf8');
const resourceUsageApi = readFileSync(resolve('src/service/api/biz/tenant-resource-usage-log.ts'), 'utf8');
const routeStoreSource = readFileSync(resolve('src/store/modules/route/index.ts'), 'utf8');
const routeImportsSource = readFileSync(resolve('src/router/elegant/imports.ts'), 'utf8');

assert.equal(orderLogApi.includes('/biz/orderLog/list'), true, 'order log API should use order log list endpoint');
assert.equal(financeLogApi.includes('/log/financeOperationLog/list'), true, 'finance log API should use finance log list endpoint');
assert.equal(resourceOrderApi.includes('/resource/tenantResourceOrder/list'), true, 'resource order API should use purchase record endpoint');
assert.equal(resourceUsageApi.includes('/resource/tenantResourceUsageLog/list'), true, 'resource usage API should use usage log endpoint');

for (const key of [
  'biz_orderlog',
  'log_financeoperationlog',
  'resource_tenantresourceorder',
  'resource_tenantresourceusagelog'
]) {
  assert.equal(routeImportsSource.includes(`${key}:`), true, `${key} should be registered in route imports`);
}

assert.equal(
  routeStoreSource.includes('plainRouteName') && routeStoreSource.includes('views[plainRouteName'),
  true,
  'dynamic menu component normalization should fall back to generated camelCase route keys'
);
