const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup({ status = 1, missing = false, fail = false } = {}) {
  const handlers = {};
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push('begin'),
    commit: async () => calls.push('commit'),
    rollback: async () => calls.push('rollback'),
    release: () => calls.push('release'),
    execute: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT order_id')) return [missing ? [] : [{ order_id: 8, status }]];
      if (sql.includes('SELECT product_id')) return [[
        { product_id: 2, quantity: 3 }, { product_id: 2, quantity: 4 },
      ]];
      if (fail && sql.startsWith('DELETE FROM order_items ')) throw new Error('delete failed');
      return [{ affectedRows: 1 }];
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../routes/collectPayment.js'), 'utf8'), {
    require: name => name === 'express'
      ? { Router: () => ({ get() {}, post: (route, fn) => { handlers[route] = fn; } }) }
      : { getConnection: async () => connection },
    module: { exports: {} }, console: { error() {} },
  });
  return { calls, async remove(order_id = 8) {
    const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
    await handlers['/delete-order']({ body: { order_id } }, res);
    return res;
  } };
}

test('deleting restores all stock deductions and removes children before the order', async () => {
  const { calls, remove } = setup();
  assert.equal((await remove()).code, 200);
  const updates = calls.filter(c => c.sql?.startsWith('UPDATE products'));
  assert.deepEqual(updates.map(c => Array.from(c.params)), [[3, 2], [4, 2]]);
  const deletes = calls.filter(c => c.sql?.startsWith('DELETE'));
  assert.deepEqual(deletes.map(c => c.sql.split(' ')[2]), [
    'bank_transfers', 'order_payments', 'order_items_custom', 'order_items', 'inventory_transactions', 'orders',
  ]);
  assert(deletes.every(c => c.params[0] === 8));
  assert(calls.includes('commit'));
  assert(!calls.includes('rollback'));
  assert.equal(calls.at(-1), 'release');
});

test('failure rolls back stock restoration and deletions', async () => {
  const { calls, remove } = setup({ fail: true });
  assert.equal((await remove()).code, 500);
  assert(calls.includes('rollback'));
  assert(!calls.includes('commit'));
  assert.equal(calls.at(-1), 'release');
});

test('invalid, missing and already processed orders cannot be deleted', async () => {
  for (const [options, id, code] of [[{}, -1, 400], [{ missing: true }, 8, 404], [{ status: 2 }, 8, 409], [{ status: 3 }, 8, 409]]) {
    const { calls, remove } = setup(options);
    assert.equal((await remove(id)).code, code);
    assert(!calls.some(c => c.sql?.startsWith('DELETE') || c.sql?.startsWith('UPDATE')));
    assert(!calls.includes('commit'));
  }
});
