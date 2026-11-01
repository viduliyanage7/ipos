const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup({ failUpdate = false } = {}) {
  let orders = [{ order_id: 1, total: 100, status: 2 }, { order_id: 2, total: 200, status: 1 }];
  let payments = [{ order_id: 1, amount: 40 }];
  let snapshot;
  const handlers = {};
  const paid = id => payments.filter(p => p.order_id === id).reduce((sum, p) => sum + p.amount, 0);
  const execute = async (sql, params = []) => {
    if (sql.includes('SELECT total FROM orders')) return [orders.filter(o => o.order_id === Number(params[0]))];
    if (sql.includes('AS paid_amount FROM order_payments WHERE')) return [[{ paid_amount: paid(Number(params[0])) }]];
    if (sql.includes('INSERT INTO order_payments')) {
      payments.push({ order_id: Number(params[0]), amount: params[2] });
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('UPDATE orders SET status')) {
      if (failUpdate) throw new Error('status update failed');
      orders.find(o => o.order_id === Number(params[1])).status = params[0];
      return [{ affectedRows: 1 }];
    }
    if (sql.includes('WHERE o.total > COALESCE(p.paid_amount, 0)')) {
      return [orders.filter(o => o.total > paid(o.order_id)).map(o => ({
        ...o, bill_total: o.total, paid_amount: paid(o.order_id), outstanding_amount: o.total - paid(o.order_id),
      }))];
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  };
  const connection = {
    execute,
    beginTransaction: async () => { snapshot = structuredClone({ orders, payments }); },
    commit: async () => { snapshot = null; },
    rollback: async () => { ({ orders, payments } = snapshot); },
    release() {},
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../routes/collectPayment.js'), 'utf8'), {
    require: name => name === 'express'
      ? { Router: () => ({ get: (route, fn) => { handlers[route] = fn; }, post: (route, fn) => { handlers[route] = fn; } }) }
      : { execute, getConnection: async () => connection },
    module: { exports: {} }, console: { error() {} },
  });
  return {
    state: () => ({ orders, payments }),
    async request(route, body = {}) {
      const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
      await handlers[route]({ body }, res);
      return res;
    },
  };
}

test('partial settlement updates paid and outstanding amounts on the reloaded pending list', async () => {
  const app = setup();
  const res = await app.request('/settle-pending', { order_id: 1, payment: 25, userId: 9 });
  assert.equal(res.code, 200);
  assert.equal(res.data.balance, 35);
  const pending = (await app.request('/pending')).data.rows;
  assert.equal(pending[0].paid_amount, 65);
  assert.equal(pending[0].outstanding_amount, 35);
  assert.equal(pending[0].bill_total, 100);
  assert.equal(app.state().orders[0].status, 2);
  assert.equal(pending[1].paid_amount, 0);
  assert.equal(pending[1].outstanding_amount, 200);
});

test('full settlement marks the bill paid and removes it from pending without changing other bills', async () => {
  const app = setup();
  const res = await app.request('/settle-pending', { order_id: 1, payment: 60, userId: 9 });
  assert.equal(res.code, 200);
  assert.equal(res.data.balance, 0);
  assert.equal(app.state().orders[0].status, 3);
  assert.equal(app.state().payments.reduce((sum, p) => sum + p.amount, 0), 100);
  assert.deepEqual((await app.request('/pending')).data.rows.map(o => o.order_id), [2]);
  // A stale modal must not allow another settlement on the paid bill.
  assert.equal((await app.request('/settle-pending', { order_id: 1, payment: 1, userId: 9 })).code, 400);
  assert.equal(app.state().payments.length, 2);
});

test('overpayment and invalid amounts leave bill and payments unchanged', async () => {
  for (const payment of [61, 0, -1, 1.001, 'invalid']) {
    const app = setup();
    const before = structuredClone(app.state());
    assert.equal((await app.request('/settle-pending', { order_id: 1, payment, userId: 9 })).code, 400);
    assert.deepEqual(app.state(), before);
  }
});

test('status update failure rolls back the inserted payment', async () => {
  const app = setup({ failUpdate: true });
  const before = structuredClone(app.state());
  assert.equal((await app.request('/settle-pending', { order_id: 1, payment: 60, userId: 9 })).code, 500);
  assert.deepEqual(app.state(), before);
});
