/**
 * NCS Accounts — Ledger Tests
 * Tests: lBal() due in/out balance, lCombinedBal() parent+sub aggregation,
 * void entry exclusion, and lSubAccounts() parent-child resolution.
 * Run: node --test tests/ledger.test.js
 */

'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { lBal, lSubAccounts, lCombinedBal, makeState, makeLtx, r2 } = require('./helpers');

// ─── lBal() — single customer ledger balance ─────────────────────────────────
describe('lBal() — customer ledger balance', () => {
  it('no transactions → 0', () => {
    const S = makeState();
    assert.equal(lBal(S, 101), 0);
  });

  it('single "in" (পেলাম) → positive balance (we received)', () => {
    const S = makeState();
    S.ltx.push(makeLtx(101, 'in', 5000, { id: 1 }));
    // dir=in means we received money → balance positive → they owe us nothing, we owe them
    assert.equal(lBal(S, 101), 5000);
  });

  it('single "out" (দিলাম) → negative balance (they received from us)', () => {
    const S = makeState();
    S.ltx.push(makeLtx(101, 'out', 3000, { id: 1 }));
    assert.equal(lBal(S, 101), -3000);
  });

  it('in then partial out → correct net', () => {
    const S = makeState();
    S.ltx.push(
      makeLtx(101, 'in',  10000, { id: 1 }),
      makeLtx(101, 'out',  4000, { id: 2 }),
    );
    assert.equal(lBal(S, 101), 6000);
  });

  it('perfectly settled → 0', () => {
    const S = makeState();
    S.ltx.push(
      makeLtx(101, 'in',  7500, { id: 1 }),
      makeLtx(101, 'out', 7500, { id: 2 }),
    );
    assert.equal(lBal(S, 101), 0);
  });

  it('voided entry is excluded from balance', () => {
    const S = makeState();
    S.ltx.push(
      makeLtx(101, 'in',  5000, { id: 1 }),
      makeLtx(101, 'in',  3000, { id: 2, void: true }), // should be ignored
    );
    assert.equal(lBal(S, 101), 5000);
  });

  it('transactions for other customers do not affect balance', () => {
    const S = makeState();
    S.ltx.push(
      makeLtx(101, 'in', 5000, { id: 1 }),
      makeLtx(202, 'in', 9999, { id: 2 }), // different customer
    );
    assert.equal(lBal(S, 101), 5000);
    assert.equal(lBal(S, 202), 9999);
  });

  it('r2 rounding on fractional amounts', () => {
    const S = makeState();
    S.ltx.push(
      makeLtx(101, 'in',  100.1, { id: 1 }),
      makeLtx(101, 'in',  200.2, { id: 2 }),
    );
    assert.equal(lBal(S, 101), 300.3);
  });

  it('multiple out payments reduce balance below zero (they owe us)', () => {
    const S = makeState();
    S.ltx.push(
      makeLtx(101, 'out', 8000, { id: 1 }),  // we gave
      makeLtx(101, 'in',  3000, { id: 2 }),  // they gave back
    );
    // bal = 3000 - 8000 = -5000 (they still owe us 5000)
    assert.equal(lBal(S, 101), -5000);
  });
});

// ─── lSubAccounts() — parent-child resolution ────────────────────────────────
describe('lSubAccounts() — sub-account lookup', () => {
  it('no customers → empty array', () => {
    const S = makeState();
    assert.deepEqual(lSubAccounts(S, 1), []);
  });

  it('customer with no parent set → not returned as sub', () => {
    const S = makeState();
    S.cust.push({ id: 10, name: 'Alice' });
    assert.deepEqual(lSubAccounts(S, 10), []);
  });

  it('customer with parent → returned in sub list', () => {
    const S = makeState();
    S.cust.push({ id: 10, name: 'Parent Corp' });
    S.cust.push({ id: 11, name: 'Branch A', parent: 10 });
    S.cust.push({ id: 12, name: 'Branch B', parent: 10 });
    const subs = lSubAccounts(S, 10);
    assert.equal(subs.length, 2);
    assert.ok(subs.some(c => c.id === 11));
    assert.ok(subs.some(c => c.id === 12));
  });

  it('archived (del=1) sub-accounts are excluded', () => {
    const S = makeState();
    S.cust.push({ id: 10, name: 'Parent' });
    S.cust.push({ id: 11, name: 'Active Branch',   parent: 10 });
    S.cust.push({ id: 12, name: 'Archived Branch', parent: 10, del: 1 });
    const subs = lSubAccounts(S, 10);
    assert.equal(subs.length, 1);
    assert.equal(subs[0].id, 11);
  });
});

// ─── lCombinedBal() — parent + sub aggregate balance ────────────────────────
describe('lCombinedBal() — parent + sub combined balance', () => {
  it('no subs → same as lBal for parent', () => {
    const S = makeState();
    S.cust.push({ id: 10, name: 'Solo' });
    S.ltx.push(makeLtx(10, 'in', 5000, { id: 1 }));
    assert.equal(lCombinedBal(S, 10), 5000);
  });

  it('parent + 1 sub → sum of both balances', () => {
    const S = makeState();
    S.cust.push({ id: 10, name: 'Parent' });
    S.cust.push({ id: 11, name: 'Branch', parent: 10 });
    // Parent: received 8000; Branch: given out 3000
    S.ltx.push(
      makeLtx(10, 'in',  8000, { id: 1 }),
      makeLtx(11, 'out', 3000, { id: 2 }),
    );
    // lBal(10) = 8000; lBal(11) = -3000; combined = 5000
    assert.equal(lCombinedBal(S, 10), 5000);
  });

  it('parent + 2 subs → all three balances aggregated', () => {
    const S = makeState();
    S.cust.push({ id: 10, name: 'Corp' });
    S.cust.push({ id: 11, name: 'Branch A', parent: 10 });
    S.cust.push({ id: 12, name: 'Branch B', parent: 10 });
    S.ltx.push(
      makeLtx(10, 'in',  10000, { id: 1 }),
      makeLtx(11, 'in',   5000, { id: 2 }),
      makeLtx(12, 'out',  2000, { id: 3 }),
    );
    // 10000 + 5000 + (-2000) = 13000
    assert.equal(lCombinedBal(S, 10), 13000);
  });

  it('archived sub-account balance is excluded from combined', () => {
    const S = makeState();
    S.cust.push({ id: 10, name: 'Parent' });
    S.cust.push({ id: 11, name: 'Active',   parent: 10 });
    S.cust.push({ id: 12, name: 'Archived', parent: 10, del: 1 });
    S.ltx.push(
      makeLtx(10, 'in', 5000, { id: 1 }),
      makeLtx(11, 'in', 3000, { id: 2 }),
      makeLtx(12, 'in', 9999, { id: 3 }), // archived → excluded from combined
    );
    // combined = lBal(10) + lBal(11) = 5000 + 3000 = 8000 (sub 12 excluded)
    assert.equal(lCombinedBal(S, 10), 8000);
  });

  it('voided tx in sub not counted', () => {
    const S = makeState();
    S.cust.push({ id: 10, name: 'Parent' });
    S.cust.push({ id: 11, name: 'Branch', parent: 10 });
    S.ltx.push(
      makeLtx(10, 'in', 5000, { id: 1 }),
      makeLtx(11, 'in', 2000, { id: 2, void: true }),
    );
    assert.equal(lCombinedBal(S, 10), 5000);
  });

  it('perfectly settled combined balance = 0', () => {
    const S = makeState();
    S.cust.push({ id: 10, name: 'Parent' });
    S.cust.push({ id: 11, name: 'Branch', parent: 10 });
    S.ltx.push(
      makeLtx(10, 'in',  3000, { id: 1 }),
      makeLtx(11, 'out', 3000, { id: 2 }),
    );
    assert.equal(lCombinedBal(S, 10), 0);
  });
});
