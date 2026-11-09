import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const sources = await Promise.all([
  readFile(new URL('../web/shared/keymanager.js', import.meta.url), 'utf8'),
  readFile(new URL('../web/writer/app.js', import.meta.url), 'utf8'),
]);
const config = JSON.parse(await readFile(new URL('../samples.config.json', import.meta.url), 'utf8'));

function writer(keymanager) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        textContent: '', hidden: false, disabled: false, listeners: {},
        addEventListener(type, listener) { this.listeners[type] = listener; },
        setAttribute() {}, focus() {},
      });
    }
    return elements.get(id);
  }
  let ready;
  const context = {
    KM_SAMPLE_CONFIG: config,
    tizen: { keymanager },
    document: {
      getElementById: element,
      querySelectorAll: () => Array.from(elements.values()),
      addEventListener(type, listener) { if (type === 'DOMContentLoaded') ready = listener; },
    },
  };
  context.window = context;
  sources.forEach((source) => vm.runInNewContext(source, context));
  ready();
  return {
    click(id) { element(id).listeners.click(); },
    status() { return element('status').textContent; },
    disabled(id) { return element(id).disabled; },
  };
}

test('failed revocation recommends retrying NONE and never re-granting READ', () => {
  const calls = [];
  const ui = writer({
    setPermission(query, target, permission, success, failure) {
      calls.push(permission);
      failure({ name: 'SecurityError' });
    },
  });
  ui.click('revoke');
  assert.deepEqual(calls, ['NONE']);
  assert.match(ui.status(), /실패 대상:.*SecurityError/);
  assert.match(ui.status(), /공유 해제를 다시 실행/);
  assert.doesNotMatch(ui.status(), /READ/);
  assert.equal(ui.disabled('revoke'), false);
});

test('unavailable permission method reports failure without claiming completion', () => {
  const ui = writer({});
  ui.click('revoke');
  assert.match(ui.status(), /권한 해제에 실패/);
  assert.doesNotMatch(ui.status(), /완료|저장됐|READ/);
});

test('successful save and failed ACL keep the item and only recommend an ACL retry', () => {
  let saves = 0;
  let removes = 0;
  const ui = writer({
    getData() { throw { name: 'NotFoundError' }; },
    saveData(key, value, password, success) { saves += 1; success(); },
    setPermission(query, target, permission, success, failure) { failure({ name: 'SecurityError' }); },
    removeData() { removes += 1; },
  });
  ui.click('save');
  assert.equal(saves, 1);
  assert.equal(removes, 0);
  assert.match(ui.status(), /저장은 완료됐고 항목은 유지/);
  assert.match(ui.status(), /READ 다시 부여/);
  ui.click('retry');
  assert.equal(saves, 1);
  assert.equal(removes, 0);
});
