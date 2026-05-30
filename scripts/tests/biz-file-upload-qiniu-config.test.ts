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
  'BizFileUpload should not force direct upload'
);

assert.equal(
  source.includes('const QINIU_FORCE_DIRECT_UPLOAD = false;'),
  false,
  'BizFileUpload should not claim forceDirect=false forces resumable multipart upload'
);

assert.equal(
  source.includes('function isMicrosoftEdgeBrowser()'),
  true,
  'BizFileUpload should detect Microsoft Edge for upload host compatibility'
);

assert.equal(
  source.includes("return 'up-z2.qiniup.com';"),
  true,
  'BizFileUpload should force the Qiniu z2 source upload host when backend returns upload-z2.qiniup.com'
);

assert.equal(
  source.includes("if (host === 'upload-z2.qiniup.com')"),
  true,
  'BizFileUpload should override upload-z2.qiniup.com for every browser'
);

assert.equal(
  source.includes("if (isMicrosoftEdgeBrowser() && host === 'upload-z2.qiniup.com')"),
  false,
  'BizFileUpload should not limit upload-z2.qiniup.com override to Microsoft Edge'
);

assert.equal(
  source.includes('if (isMicrosoftEdgeBrowser()) {\n    return false;\n  }'),
  true,
  'BizFileUpload should avoid forcing direct upload in Microsoft Edge'
);

assert.equal(
  source.includes('checkByServer: false'),
  true,
  'BizFileUpload should disable Qiniu pre-upload server check in every browser'
);

assert.equal(
  source.includes('checkByServer: !isMicrosoftEdgeBrowser()'),
  false,
  'BizFileUpload should not limit Qiniu pre-upload server check disabling to Microsoft Edge'
);

assert.equal(
  source.includes('forceDirect: shouldUseDirectQiniuUpload(rawFile)'),
  true,
  'BizFileUpload should use direct upload only for non-Edge image files'
);

assert.equal(
  source.includes('timeout: QINIU_COMPLETE_TIMEOUT'),
  true,
  'BizFileUpload should use a longer timeout for the backend Qiniu complete callback'
);

assert.equal(
  source.includes('const QINIU_UPLOAD_STALL_TIMEOUT_MS = 30 * 1000;'),
  true,
  'BizFileUpload should define a 30 second no-progress watchdog for Qiniu upload'
);

assert.equal(
  source.includes('subscription?.unsubscribe?.();'),
  true,
  'BizFileUpload should cancel the Qiniu subscription when the no-progress watchdog fires'
);

assert.equal(
  source.includes("new Error('上传连接超时，请重试')"),
  true,
  'BizFileUpload should show a clear timeout retry message when Qiniu upload stalls'
);
