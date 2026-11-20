/**
 * NCS Accounts — Wallet Tests
 * Tests: isWalletTransfer(), WLT_MFS vs WLT_RCR separation,
 * wallet key mapping from WLTC, and balance group sums.
 * Run: node --test tests/wallet.test.js
 */

'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isWalletTransfer, WLT, WLTC, WLT_MFS, WLT_RCR, makeEntry } = require('./helpers');

// ─── Wallet taxonomy ─────────────────────────────────────────────────────────
describe('Wallet taxonomy — MFS vs Recharge SIM separation', () => {
  it('MFS wallets are bk, ng, rk, bka', () => {
    assert.deepEqual(WLT_MFS, ['bk', 'ng', 'rk', 'bka']);
  });

  it('Recharge wallets are gp, robi, cir', () => {
    assert.deepEqual(WLT_RCR, ['gp', 'robi', 'cir']);
  });

  it('No wallet key belongs to both groups', () => {
    const overlap = WLT_MFS.filter(k => WLT_RCR.includes(k));
    assert.deepEqual(overlap, [], 'MFS and Recharge groups must be disjoint');
  });

  it('All WLT keys are covered by MFS or Recharge groups', () => {
    const all = Object.keys(WLT);
    const covered = all.every(k => WLT_MFS.includes(k) || WLT_RCR.includes(k));
    assert.ok(covered, 'Every WLT key must be in MFS or Recharge group');
  });

  it('WLT display names are non-empty strings', () => {
    Object.entries(WLT).forEach(([k, v]) => {
      assert.ok(typeof v === 'string' && v.length > 0, `WLT[${k}] must be a non-empty string`);
    });
  });
});

// ─── WLTC category mapping ───────────────────────────────────────────────────
describe('WLTC — category → wallet key mapping', () => {
  it('Bkash Purchase category maps to MFS bk wallet', () => {
    assert.equal(WLTC.Purchase['Bk In - Personal'], 'bk');
  });

  it('Nagad Purchase category maps to MFS ng wallet', () => {
    assert.equal(WLTC.Purchase['Nagad In - Personal'], 'ng');
  });

  it('Rocket Purchase category maps to MFS rk wallet', () => {
    assert.equal(WLTC.Purchase['Rocket In - Personal'], 'rk');
  });

  it('Bkash Agent Purchase maps to MFS bka wallet', () => {
    assert.equal(WLTC.Purchase['Bkash Cash Out'], 'bka');
  });

  it('GP Recharge Purchase maps to Recharge gp wallet', () => {
    assert.equal(WLTC.Purchase['Recharge Balance - DSR GP'], 'gp');
  });

  it('Robi Recharge Purchase maps to Recharge robi wallet', () => {
    assert.equal(WLTC.Purchase['Recharge Balance - DSR Robi'], 'robi');
  });

  it('Circkle Recharge Purchase maps to Recharge cir wallet', () => {
    assert.equal(WLTC.Purchase['Recharge Balance - DSR Circkle'], 'cir');
  });

  it('Bkash Sale category maps to MFS bk wallet', () => {
    assert.equal(WLTC.Sale['Bk Sent - Personal'], 'bk');
  });

  it('GP Sale Recharge maps to gp wallet', () => {
    assert.equal(WLTC.Sale['Recharge - GP'], 'gp');
  });

  it('All WLTC Purchase wallet keys resolve to known WLT key', () => {
    Object.entries(WLTC.Purchase).forEach(([cat, wk]) => {
      assert.ok(WLT[wk], `WLTC.Purchase["${cat}"] = "${wk}" is not in WLT`);
    });
  });

  it('All WLTC Sale wallet keys resolve to known WLT key', () => {
    Object.entries(WLTC.Sale).forEach(([cat, wk]) => {
      assert.ok(WLT[wk], `WLTC.Sale["${cat}"] = "${wk}" is not in WLT`);
    });
  });
});

// ─── isWalletTransfer() ──────────────────────────────────────────────────────
describe('isWalletTransfer() — entry classification', () => {
  it('Purchase with wallet category → true', () => {
    const e = makeEntry('Purchase', 500, { cat: 'Bk In - Personal' });
    assert.ok(isWalletTransfer(e));
  });

  it('Sale with wallet category → true', () => {
    const e = makeEntry('Sale', 500, { cat: 'Bk Sent - Personal' });
    assert.ok(isWalletTransfer(e));
  });

  it('Recharge Sale → true (Recharge - GP)', () => {
    const e = makeEntry('Sale', 200, { cat: 'Recharge - GP' });
    assert.ok(isWalletTransfer(e));
  });

  it('Recharge Purchase → true (Recharge Balance - DSR Robi)', () => {
    const e = makeEntry('Purchase', 200, { cat: 'Recharge Balance - DSR Robi' });
    assert.ok(isWalletTransfer(e));
  });

  it('Ordinary Sale (Printing) → false', () => {
    const e = makeEntry('Sale', 1000, { cat: 'Printing' });
    assert.ok(!isWalletTransfer(e));
  });

  it('Ordinary Purchase (Stock) → false', () => {
    const e = makeEntry('Purchase', 500, { cat: 'Stock' });
    assert.ok(!isWalletTransfer(e));
  });

  it('Adjustment → false', () => {
    const e = makeEntry('Adjustment', 100);
    assert.ok(!isWalletTransfer(e));
  });

  it('Ledger entry → false', () => {
    const e = makeEntry('Ledger', 300, { ld: 'in' });
    assert.ok(!isWalletTransfer(e));
  });

  it('Purchase with unknown category → false', () => {
    const e = makeEntry('Purchase', 300, { cat: 'Unknown Category XYZ' });
    assert.ok(!isWalletTransfer(e));
  });

  it('Voided wallet transfer still returns true (type+cat present)', () => {
    // isWalletTransfer only looks at type/cat, not void flag
    const e = makeEntry('Purchase', 500, { cat: 'Bk In - Personal', void: true });
    assert.ok(isWalletTransfer(e));
  });
});
