import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const apiPath = resolve('src/service/api/biz/repair-review.ts');
const pagePath = resolve('src/views/biz/repairreview/index.vue');

assert.equal(existsSync(apiPath), true, 'repair review API module should exist');
assert.equal(existsSync(pagePath), true, 'repair review page should exist for menu component biz/repairreview/index');

const apiSource = readFileSync(apiPath, 'utf8');
assert.equal(apiSource.includes("'/biz/repairReview'"), true, 'repair review API base path should match backend');
assert.equal(apiSource.includes('fetchRepairReviewList'), true, 'repair review list API should be exported');

const pageSource = readFileSync(pagePath, 'utf8');
assert.equal(pageSource.includes('fetchRepairReviewList'), true, 'repair review page should load records from API');
assert.equal(pageSource.includes('NDrawer'), true, 'repair review page should use a drawer for record detail');
