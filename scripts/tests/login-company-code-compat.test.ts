import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('src/views/_builtin/login/modules/pwd-login.vue'), 'utf8');

assert.equal(
  source.includes('^\\d{4,6}$'),
  true,
  'login company code validator should accept new 4-digit codes and legacy 6-digit tenant ids'
);

assert.equal(
  source.includes('^\\d{0,6}$'),
  true,
  'login company code input should allow typing legacy 6-digit tenant ids'
);

assert.equal(
  source.includes('maxlength="6"'),
  true,
  'login company code input should not truncate legacy 6-digit tenant ids'
);
