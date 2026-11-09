import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../web/shared/keymanager.js', import.meta.url), 'utf8');
const config = {
  writerPackageId: 'KmWriter01',
  readerPackageId: 'KmReader01',
  nativePackageId: '',
  key: 'tcstring',
  value: 'sample_tcstring_value',
};

function makeSample(keymanager) {
  const defaults = {
    getData: () => 'sample_tcstring_value',
    saveData: (key, value, password, success) => success(),
    setPermission: (query, packageId, permission, success) => success(),
    removeData: () => {},
  };
  const context = { tizen: keymanager ? { keymanager: Object.assign(defaults, keymanager) } : undefined };
  context.window = context;
  vm.runInNewContext(source, context, { filename: 'keymanager.js' });
  return context.KeyManagerSample;
}

function missing(name = 'NotFoundError') {
  const error = new Error(name);
  error.name = name;
  return error;
}

test('same-app read distinguishes a real empty value and classifies the sample string', () => {
  const api = makeSample({ getData: () => '' });
  assert.equal(api.classify('', 'sample_tcstring_value'), 'empty');
  assert.equal(api.classify('sample_tcstring_value', 'sample_tcstring_value'), 'match');
  assert.equal(api.classify('changed', 'sample_tcstring_value'), 'different');
  let value;
  api.readOwned('tcstring', (found) => { value = found; }, assert.fail);
  assert.equal(value, '');
});

test('reader uses the writer owner package id for cross-app lookup', () => {
  let request;
  const api = makeSample({ getData: (query, password) => { request = { query, password }; return 'sample_tcstring_value'; } });
  api.readShared('KmWriter01', 'tcstring', assert.equal.bind(null, 'sample_tcstring_value'), assert.fail);
  assert.equal(JSON.stringify(request.query), JSON.stringify({ packageId: 'KmWriter01', name: 'tcstring' }));
  assert.equal(request.password, null);
});

test('new save first checks for existence and never overwrites an existing value', () => {
  let saved = false;
  let result;
  const api = makeSample({
    getData: () => 'prior value',
    saveData: () => { saved = true; },
    setPermission: () => assert.fail('must not change ACL for a pre-existing key'),
  });
  api.saveNew(config, (value) => { result = value; });
  assert.equal(saved, false);
  assert.equal(result.exists, true);
});

test('NotFound creates once and grants READ only to configured targets', () => {
  let saves = 0;
  const permissions = [];
  let result;
  const api = makeSample({
    getData: () => { throw missing(); },
    saveData: (key, value, password, success) => { saves += 1; success(); },
    setPermission: (query, packageId, permission, success) => { permissions.push({ query, packageId, permission }); success(); },
  });
  api.saveNew(config, (value) => { result = value; });
  assert.equal(saves, 1);
  assert.equal(JSON.stringify(permissions), JSON.stringify([{ query: { name: 'tcstring' }, packageId: 'KmReader01', permission: 'READ' }]));
  assert.equal(result.error, null);
  assert.equal(result.permissions.results[0].error, null);
});

test('save succeeds even when READ permission fails and ACL retry does not save again', () => {
  let saves = 0;
  let failAcl = true;
  let result;
  const api = makeSample({
    getData: () => { if (saves === 0) { throw missing(); } return 'sample_tcstring_value'; },
    saveData: (key, value, password, success) => { saves += 1; success(); },
    setPermission: (query, packageId, permission, success, failure) => {
      if (failAcl) { failure(missing('SecurityError')); } else { success(); }
    },
  });
  api.saveNew(config, (value) => { result = value; });
  assert.equal(saves, 1);
  assert.equal(result.error, null);
  assert.equal(result.permissions.results[0].error.name, 'SecurityError');
  failAcl = false;
  api.retryReadPermissions(config, (retry) => { result = retry; });
  assert.equal(saves, 1);
  assert.equal(result.results[0].error, null);
});

test('revocation sends NONE and excludes an unset native package', () => {
  const calls = [];
  const api = makeSample({ setPermission: (query, packageId, permission, success) => { calls.push({ packageId, permission }); success(); } });
  let result;
  api.revokeReadPermissions(config, (value) => { result = value; });
  assert.deepEqual(calls, [{ packageId: 'KmReader01', permission: 'NONE' }]);
  assert.equal(result.results[0].error, null);
});

test('duplicate callback is ignored and synchronous API exceptions are reported once', () => {
  let calls = 0;
  let result;
  const api = makeSample({
    setPermission: (query, packageId, permission, success, failure) => {
      success();
      failure(missing('LateError'));
    },
  });
  api.retryReadPermissions(config, (value) => { calls += 1; result = value; });
  assert.equal(calls, 1);
  assert.equal(result.results[0].error, null);

  const broken = makeSample({ getData: () => { throw missing('SecurityError'); } });
  broken.readOwned('tcstring', assert.fail, (error) => { result = error; });
  assert.equal(result.name, 'SecurityError');
});

test('missing KeyManager API fails explicitly without a local fallback', () => {
  const api = makeSample(null);
  let result;
  api.readOwned('tcstring', assert.fail, (error) => { result = error; });
  assert.equal(result.name, 'KeyManagerUnavailable');
  assert.equal(api.errorName(result), 'KeyManagerUnavailable');
});

test('explicit demo deletion affects only the configured key', () => {
  let query;
  const api = makeSample({ removeData: (value) => { query = value; } });
  let error;
  api.removeOwned(config, (value) => { error = value; });
  assert.equal(error, null);
  assert.equal(JSON.stringify(query), JSON.stringify({ name: 'tcstring' }));
});
