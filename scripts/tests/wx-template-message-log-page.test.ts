import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const apiPath = 'src/service/api/wx/template-message-log.ts';
const pagePath = 'src/views/wx/templateMessageLog/index.vue';

assert.equal(existsSync(resolve(apiPath)), true, `${apiPath} should exist`);
assert.equal(existsSync(resolve(pagePath)), true, `${pagePath} should exist`);

const apiSource = readFileSync(resolve(apiPath), 'utf8');
const pageSource = readFileSync(resolve(pagePath), 'utf8');
const routeImportsSource = readFileSync(resolve('src/router/elegant/imports.ts'), 'utf8');
const routeTransformSource = readFileSync(resolve('src/router/elegant/transform.ts'), 'utf8');

assert.equal(apiSource.includes('/wx/template-message-log/list'), true, 'API should query wx template message logs');
assert.equal(apiSource.includes('/wx/template-message-log/') && apiSource.includes('/resend'), true, 'API should expose resend endpoint');
assert.equal(pageSource.includes('fetchWxTemplateMessageLogList'), true, 'page should load wx template message log list');
assert.equal(pageSource.includes('fetchResendWxTemplateMessageLog'), true, 'page should call resend endpoint');
assert.equal(pageSource.includes('重发'), true, 'page should render resend button');
assert.equal(routeImportsSource.includes('wx_templatemessagelog:'), true, 'route import should register wx_templatemessagelog');
assert.equal(routeTransformSource.includes('"wx_templatemessagelog": "/wx/templatemessagelog"'), true, 'route transform should register wx template message log path');
