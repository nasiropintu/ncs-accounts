/**
 * NCS Accounts — Accounting Core Tests
 * Tests: calc(), cashBook(), cash() with Sale / Purchase / Adjustment / Void entries.
 * Run: node --test tests/accounting.test.js
 */

'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calc, cashBook, cash, makeState, makeEntry, r2 } = require('./helpers');

// ─── cash() unit tests ───────────────────────────────────────────────────────
describe('cash() — entry cash impact', () => {
  it('Cash Sale adds full amount', () => {
    const e = makeEntry('Sale', 1000, { pay: 'Cash' });
    assert.equal(cash(e), 1000);
  });

  it('Mobile Banking Sale contributes 0 to cash', () => {
    const e = makeEntry('Sale', 500, { pay: 'Mobile Banking' });
    assert.equal(cash(e), 0);
  });

  it('Due Sale contributes 0 to cash', () => {
    const e = makeEntry('Sale', 800, { pay: 'Due' });
    assert.equal(cash(e), 0);
  });

  it('Cash Purchase subtracts from cash', () => {
    const e = makeEntry('Purchase', 300, { pay: 'Cash' });
    assert.equal(cash(e), -300);
  });

  it('Mobile Banking Purchase contributes 0 to cash', () => {
    const e = makeEntry('Purchase', 300, { pay: 'Mobile Banking' });
    assert.equal(cash(e), 0);
  });

  it('Positive Adjustment adds to cash', () => {
    const e = makeEntry('Adjustment', 200);
    assert.equal(cash(e), 200);
  });

  it('Negative Adjustment subtracts from cash', () => {
    const e = makeEntry('Adjustment', -150);
    assert.equal(cash(e), -150);
  });

  it('Voided entry contributes 0 regardless of type', () => {
    const sale = makeEntry('Sale', 5000, { pay: 'Cash', void: true });
    const buy  = makeEntry('Purchase', 2000, { pay: 'Cash', void: true });
    assert.equal(cash(sale), 0);
    assert.equal(cash(buy),  0);
  });

  it('Ledger cash-in adds to cash (no wallet)', () => {
    const e = makeEntry('Ledger', 400, { ld: 'in' });
    assert.equal(cash(e), 400);
  });

  it('Ledger cash-out subtracts from cash (no wallet)', () => {
    const e = makeEntry('Ledger', 400, { ld: 'out' });
    assert.equal(cash(e), -400);
  });

  it('Ledger with wallet (w set) does NOT affect cash', () => {
    const e = makeEntry('Ledger', 400, { ld: 'in', w: 'bk' });
    assert.equal(cash(e), 0);
  });
});

// ─── calc() — running balance map ────────────────────────────────────────────
describe('calc() — running balance per entry', () => {
  it('empty entries returns empty map, start=0', () => {
    const S = makeState();
    assert.deepEqual(calc(S), {});
  });

  it('single Sale: balance = start + sale', () => {
    const S = makeState({ start: 10000 });
    const e = makeEntry('Sale', 5000, { id: 1, pay: 'Cash' });
    S.entries.push(e);
    const m = calc(S);
    assert.equal(m[1].p,   10000);
    assert.equal(m[1].bal, 15000);
  });

  it('Sale then Purchase: running balance correct', () => {
    const S = makeState({ start: 0 });
    const s = makeEntry('Sale',     10000, { id: 1, pay: 'Cash' });
    const p = makeEntry('Purchase',  3000, { id: 2, pay: 'Cash' });
    S.entries.push(s, p);
    const m = calc(S);
    assert.equal(m[1].bal, 10000);
    assert.equal(m[2].p,   10000);
    assert.equal(m[2].bal,  7000);
  });

  it('Void entry is skipped — balance unchanged', () => {
    const S = makeState({ start: 5000 });
    const v = makeEntry('Sale', 3000, { id: 1, pay: 'Cash', void: true });
    const g = makeEntry('Sale', 1000, { id: 2, pay: 'Cash' });
    S.entries.push(v, g);
    const m = calc(S);
    assert.equal(m[1], undefined, 'voided entry must not appear in calc map');
    assert.equal(m[2].p,   5000);
    assert.equal(m[2].bal, 6000);
  });

  it('df (difference) is null when act is not set', () => {
    const S = makeState({ start: 0 });
    const e = makeEntry('Sale', 1000, { id: 1, pay: 'Cash' });
    S.entries.push(e);
    const m = calc(S);
    assert.equal(m[1].df, null);
  });

  it('df = act − bal when act is set', () => {
    const S = makeState({ start: 0 });
    // Sale 10000, bal becomes 10000, act=10200 → df=200
    const e = makeEntry('Sale', 10000, { id: 1, pay: 'Cash', act: 10200 });
    S.entries.push(e);
    const m = calc(S);
    assert.equal(m[1].bal, 10000);
    assert.equal(m[1].df,    200);
  });

  it('negative df (cash short)', () => {
    const S = makeState({ start: 0 });
    const e = makeEntry('Sale', 10000, { id: 1, pay: 'Cash', act: 9800 });
    S.entries.push(e);
    const m = calc(S);
    assert.equal(m[1].df, -200);
  });

  it('entries sorted by date+time regardless of push order', () => {
    const S = makeState({ start: 0 });
    // Push later entry first
    const e2 = makeEntry('Purchase', 2000, { id: 2, d: '2026-11-20', t: '12:00', pay: 'Cash' });
    const e1 = makeEntry('Sale',     5000, { id: 1, d: '2026-11-20', t: '08:00', pay: 'Cash' });
    S.entries.push(e2, e1);
    const m = calc(S);
    // e1 runs first: p=0, bal=5000; e2: p=5000, bal=3000
    assert.equal(m[1].bal, 5000);
    assert.equal(m[2].p,   5000);
    assert.equal(m[2].bal, 3000);
  });

  it('r2 rounding: 0.1 + 0.2 entries balance correctly', () => {
    const S = makeState({ start: 0 });
    const e1 = makeEntry('Sale', 0.1, { id: 1, pay: 'Cash' });
    const e2 = makeEntry('Sale', 0.2, { id: 2, pay: 'Cash' });
    S.entries.push(e1, e2);
    const m = calc(S);
    assert.equal(m[2].bal, 0.3, 'floating point must be r2-rounded');
  });
});

// ─── cashBook() — closing balance ────────────────────────────────────────────
describe('cashBook() — closing cash balance', () => {
  it('no entries → returns S.start', () => {
    const S = makeState({ start: 50000 });
    assert.equal(cashBook(S), 50000);
  });

  it('single Sale → start + sale', () => {
    const S = makeState({ start: 10000 });
    S.entries.push(makeEntry('Sale', 5000, { id: 1, pay: 'Cash' }));
    assert.equal(cashBook(S), 15000);
  });

  it('multiple mixed entries — returns final balance', () => {
    const S = makeState({ start: 0 });
    S.entries.push(
      makeEntry('Sale',     55100, { id: 1, pay: 'Cash' }),
      makeEntry('Purchase', 27560, { id: 2, pay: 'Cash' }),
      makeEntry('Adjustment', 9010, { id: 3 }),
      makeEntry('Sale',     37500, { id: 4, pay: 'Cash' }),
      makeEntry('Purchase', 24360, { id: 5, pay: 'Cash' }),
    );
    // 0 + 55100 - 27560 + 9010 + 37500 - 24360 = 49690
    assert.equal(cashBook(S), 49690);
  });

  it('voiding a Sale reduces final balance', () => {
    const S = makeState({ start: 0 });
    S.entries.push(
      makeEntry('Sale', 10000, { id: 1, pay: 'Cash' }),
      makeEntry('Sale',  5000, { id: 2, pay: 'Cash', void: true }),
    );
    assert.equal(cashBook(S), 10000);
  });

  it('all entries voided → returns S.start', () => {
    const S = makeState({ start: 1000 });
    S.entries.push(
      makeEntry('Sale', 9999, { id: 1, pay: 'Cash', void: true }),
    );
    assert.equal(cashBook(S), 1000);
  });

  it('mobile banking entries do NOT affect cashBook', () => {
    const S = makeState({ start: 5000 });
    S.entries.push(
      makeEntry('Sale',     3000, { id: 1, pay: 'Mobile Banking' }),
      makeEntry('Purchase', 1000, { id: 2, pay: 'Mobile Banking' }),
    );
    assert.equal(cashBook(S), 5000);
  });

  it('mixed cash + due: only Cash entries count', () => {
    const S = makeState({ start: 0 });
    S.entries.push(
      makeEntry('Sale', 10000, { id: 1, pay: 'Cash' }),
      makeEntry('Sale',  5000, { id: 2, pay: 'Due'  }),
    );
    assert.equal(cashBook(S), 10000);
  });
});
