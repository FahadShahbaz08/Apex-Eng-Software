const { test } = require('node:test');
const assert = require('node:assert/strict');

test('editing expense replaces accounting entry, preserves identity, and moves payment between accounts', async () => {
  const { postExpense, updateExpense, accountBalance } = await import('../lib/erp.js');
  const state = { accounts: [{ id: 'cash', name: 'Cash', openingBalance: 1000 }, { id: 'bank', name: 'Bank', openingBalance: 2000 }], expenseCategories: [{ id: 'transport', name: 'Transport' }, { id: 'power', name: 'Electricity' }], expenses: [], journal: [], audit: [], payments: [] };
  const expense = postExpense(state, { accountId: 'cash', categoryId: 'transport', date: '2026-01-01', description: 'Delivery', amount: 100, payee: 'Driver' });
  assert.equal(accountBalance(state, 'cash', '2026-12-31'), 900);
  const values = { accountId: 'bank', categoryId: 'power', date: '2026-01-02', description: 'Power bill', amount: 250, payee: 'Utility' };
  updateExpense(state, expense.id, values);
  assert.equal(state.expenses.length, 1);
  assert.equal(state.expenses[0].id, expense.id);
  assert.equal(state.expenses[0].document, expense.document);
  assert.equal(state.expenses[0].category, 'Electricity');
  assert.equal(state.expenses[0].payee, 'Utility');
  assert.equal(state.journal.length, 1);
  assert.equal(state.journal[0].date, '2026-01-02');
  assert.equal(state.journal[0].lines[0].debit, 250);
  assert.equal(accountBalance(state, 'cash', '2026-12-31'), 1000);
  assert.equal(accountBalance(state, 'bank', '2026-12-31'), 1750);
  updateExpense(state, expense.id, values);
  assert.equal(accountBalance(state, 'bank', '2026-12-31'), 1750);
  assert.match(state.audit[0].action, /Updated expense/);
  for (const invalid of [{ amount: -1 }, { amount: Infinity }, { accountId: 'missing' }, { categoryId: 'missing' }, { description: '' }, { date: '' }]) {
    const before = JSON.stringify(state);
    assert.throws(() => updateExpense(state, expense.id, { ...values, ...invalid }));
    assert.equal(JSON.stringify(state), before);
  }
  assert.throws(() => updateExpense(state, 'missing', values), /no longer exists/);
});
