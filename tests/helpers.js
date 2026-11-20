/**
 * NCS Accounts — Test Helpers
 * Shared state factory and pure-function implementations extracted from
 * src/js/01-core.js, src/js/02-calc.js, src/js/09-mgmt.js for Node --test.
 * These must stay in sync with the source files whenever logic changes.
 */

'use strict';

// ─── Core math ───────────────────────────────────────────────────────────────
const r2 = x => Math.round((+x || 0) * 100) / 100;

// ─── Wallet taxonomy (mirrors 02-calc.js) ────────────────────────────────────
const WLT = { bk:'Bkash Personal', ng:'Nagad', rk:'Rocket', bka:'Bkash Agent',
              gp:'GP Recharge', robi:'Robi Recharge', cir:'Circkle Recharge' };
const WLTC = {
  Purchase: { 'Bk In - Personal':'bk', 'Nagad In - Personal':'ng',
              'Rocket In - Personal':'rk', 'Bkash Cash Out':'bka',
              'Recharge Balance - DSR GP':'gp', 'Recharge Balance - DSR Robi':'robi',
              'Recharge Balance - DSR Circkle':'cir', 'Bkash B2B Balance Receive':'bka' },
  Sale:     { 'Bk Sent - Personal':'bk', 'Nagad Sent - Personal':'ng',
              'Rocket Sent - Personal':'rk', 'Bkash Cash IN':'bka',
              'Recharge - GP':'gp', 'Recharge - Robi':'robi', 'Recharge - Circkle':'cir' }
};
const WLT_MFS = ['bk','ng','rk','bka'];
const WLT_RCR = ['gp','robi','cir'];
const isWalletTransfer = e => !!(WLTC[e.type] && WLTC[e.type][e.cat]);

// ─── cash() — mirrors 01-core.js line 326 ────────────────────────────────────
// Cash impact of a single entry on the running cash balance.
const cash = e => {
  if (e.void || e.removed) return 0;
  if (e.type === 'Sale')       return e.pay === 'Cash' ? e.amt : 0;
  if (e.type === 'Purchase')   return e.pay === 'Cash' ? -e.amt : 0;
  if (e.type === 'Ledger')     return e.w ? 0 : (e.ld === 'in' ? e.amt : -e.amt);
  if (e.type === 'Deposit')    return e.amt;
  if (e.type === 'Withdrawal') return -e.amt;
  return e.amt; // Adjustment etc.
};

// ─── sorted() — mirrors 01-core.js line 325 ──────────────────────────────────
const sorted = S =>
  [...S.entries].filter(e => !e.removed)
    .sort((a, b) => {
      const x = a.d + a.t, y = b.d + b.t;
      return x < y ? -1 : x > y ? 1 : a.id - b.id;
    });

// ─── calc() — mirrors 02-calc.js line 1 ─────────────────────────────────────
// Returns map of { [id]: { p, bal, df } } for all non-void entries.
const calc = S => {
  let p = +S.start || 0;
  const m = {};
  sorted(S).forEach(e => {
    if (e.void) return;
    const bal = r2(p + cash(e));
    m[e.id] = { p, bal, df: e.act == null ? null : r2(e.act - bal) };
    p = bal;
  });
  return m;
};

// ─── cashBook() — mirrors 09-mgmt.js line 99 ─────────────────────────────────
// Final (closing) cash balance.
const cashBook = S => {
  const a = sorted(S).filter(e => !e.void);
  const m = calc(S);
  return a.length ? m[a[a.length - 1].id].bal : (+S.start || 0);
};

// ─── lBal() — mirrors 07-pos-products.js line 275 ────────────────────────────
// Net ledger balance for a customer (positive = we owe, negative = they owe).
const lBal = (S, custId) =>
  r2(S.ltx.filter(x => x.c === custId && !x.void)
      .reduce((s, x) => s + (x.dir === 'in' ? x.amt : -x.amt), 0));

// ─── lCombinedBal() — mirrors 07-pos-products.js line 270 ───────────────────
// Combined balance for a parent account + its direct sub-accounts.
const lSubAccounts = (S, parentId) =>
  S.cust.filter(c => c.parent === parentId && !c.del);

const lCombinedBal = (S, custId) =>
  r2(lBal(S, custId) +
     lSubAccounts(S, custId).reduce((sum, sub) => sum + lBal(S, sub.id), 0));

// ─── Minimal fresh state factory ─────────────────────────────────────────────
const makeState = (overrides = {}) => ({
  start: 0,
  entries: [],
  ltx: [],
  cust: [],
  products: [],
  bills: [],
  moves: [],
  atts: [],
  tasks: [],
  days: {},
  log: [],
  wallets: {},
  wManual: {},
  walletDates: [],
  ...overrides
});

// ─── Entry builder ───────────────────────────────────────────────────────────
let _id = 1;
const makeEntry = (type, amt, opts = {}) => ({
  id: opts.id ?? _id++,
  d: opts.d ?? '2026-11-20',
  t: opts.t ?? '10:00',
  type,
  desc: opts.desc ?? type,
  cat: opts.cat ?? '',
  pay: opts.pay ?? 'Cash',
  amt,
  ...(opts.act !== undefined ? { act: opts.act } : {}),
  ...(opts.void ? { void: 1 } : {}),
  ...(opts.ld ? { ld: opts.ld } : {}),
  ...(opts.w  ? { w:  opts.w  } : {}),
});

// ─── Ledger tx builder ───────────────────────────────────────────────────────
const makeLtx = (custId, dir, amt, opts = {}) => ({
  id: opts.id ?? _id++,
  c: custId,
  dir,
  amt,
  d: opts.d ?? '2026-11-20',
  m: opts.m ?? 'Cash',
  who: opts.who ?? '',
  note: opts.note ?? '',
  ...(opts.void ? { void: 1 } : {}),
});

module.exports = {
  r2, WLT, WLTC, WLT_MFS, WLT_RCR,
  isWalletTransfer, cash, sorted, calc, cashBook,
  lBal, lSubAccounts, lCombinedBal,
  makeState, makeEntry, makeLtx,
};
