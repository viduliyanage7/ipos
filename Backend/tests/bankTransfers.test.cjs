const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup({ failTransfer = false } = {}) {
  const handlers = {};
  const calls = [];
  let id = 100;
  const connection = {
    beginTransaction: async () => calls.push('begin'),
    rollback: async () => calls.push('rollback'),
    commit: async () => calls.push('commit'),
    release: () => calls.push('release'),
    execute: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('HAVING outstanding_amount')) return [[
        { order_id: 1, total: '40.00', paid_amount: '10.00', outstanding_amount: '30.00' },
        { order_id: 2, total: '70.00', paid_amount: '0.00', outstanding_amount: '70.00' },
      ]];
      if (sql.includes('INSERT INTO bank_transfers') && failTransfer) throw new Error('transfer insert failed');
      return [{ insertId: ++id }];
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../routes/collectPayment.js'), 'utf8'), {
    require: name => name === 'express' ? { Router: () => ({ get() {}, post: (route, fn) => { handlers[route] = fn; } }) } : { getConnection: async () => connection },
    module: { exports: {} }, console: { error() {} },
  });
  return {
    calls,
    async pay(body) {
      const response = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
      await handlers['/complete-payment']({ body: { order_id: 2, customer_id: 5, userId: 1, ...body } }, response);
      return response;
    },
  };
}

test('12-digit reference with leading zeros follows each payment allocation', async () => {
  const { calls, pay } = setup();
  const result = await pay({ payment: 50, payment_method: 'bank_transfer', reference_number: '001234567890' });
  assert.equal(result.code, 200);
  const payments = calls.filter(call => call.sql?.includes('INSERT INTO order_payments'));
  const transfers = calls.filter(call => call.sql?.includes('INSERT INTO bank_transfers'));
  assert.deepEqual(payments.map(call => call.params[1]), [2, 2]);
  assert.deepEqual(transfers.map(call => call.params[4]), [30, 20]);
  assert(transfers.every(call => call.params[3] === '001234567890'));
  assert.equal(transfers[0].params[0], 101);
  assert.equal(result.data.data.balance, 50);
  assert(calls.includes('commit'));
});

test('invalid references, zero transfers and excess transfers do not commit', async () => {
  for (const body of [
    { payment: 1, reference_number: '' },
    { payment: 1, reference_number: '1234567890123' },
    { payment: 1, reference_number: 'abc123' },
    { payment: 1, reference_number: 123 },
    { payment: 0, reference_number: '123' },
    { payment: 101, reference_number: '123' },
  ]) {
    const { calls, pay } = setup();
    assert.equal((await pay({ ...body, payment_method: 'bank_transfer' })).code, 400);
    assert(!calls.includes('commit'));
    assert(!calls.some(call => call.sql?.includes('INSERT INTO')));
  }
});

test('transfer insert failure rolls back the payment too', async () => {
  const { calls, pay } = setup({ failTransfer: true });
  assert.equal((await pay({ payment: 50, payment_method: 'bank_transfer', reference_number: '123' })).code, 500);
  assert(calls.includes('rollback'));
  assert(!calls.includes('commit'));
  assert(calls.includes('release'));
});

test('cash retains zero payments and change, with no transfer rows', async () => {
  for (const amount of [0, 50, 100, 150]) {
    const { calls, pay } = setup();
    const result = await pay({ payment: amount });
    assert.equal(result.code, 200);
    assert.equal(result.data.data.change, Math.max(0, amount - 100));
    assert.equal(result.data.data.amountApplied, Math.min(100, amount));
    assert(!calls.some(call => call.sql?.includes('INSERT INTO bank_transfers')));
  }
});
