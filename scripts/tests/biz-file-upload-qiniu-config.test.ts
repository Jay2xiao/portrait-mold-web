import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/views/biz/components/BizFileUpload.vue'), 'utf8');

assert.equal(
  source.includes('uploadURL'),
  false,
  'BizFileUpload should not use uploadURL because qiniu-js v3 ignores that field'
);

assert.equal(
  source.includes('uphost:'),
  true,
  'BizFileUpload should pass backend uploadUrl to qiniu-js through uphost'
);

assert.equal(
  source.includes('upprotocol:'),
  true,
  'BizFileUpload should preserve the upload protocol when converting backend uploadUrl to qiniu-js config'
);

assert.equal(
  source.includes('forceDirect: true'),
  false,
  'BizFileUpload should not force direct upload because qiniu-js needs resumable upload for files larger than 4MB'
);

assert.equal(
  source.includes('timeout: QINIU_COMPLETE_TIMEOUT'),
  true,
  'BizFileUpload should use a longer timeout for the backend Qiniu complete callback'
);
