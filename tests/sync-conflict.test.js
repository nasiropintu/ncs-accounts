/**
 * NCS Accounts — Sync Conflict Tests
 * Tests: revision conflict detection logic and merge-or-conflict decision,
 * mirroring the behaviour of Code.gs isConflict check and the client-side
 * pull() / push() conflict guard.
 * Run: node --test tests/sync-conflict.test.js
 */

'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// ─── isConflict — mirrors Code.gs push handler logic ─────────────────────────
// Server: const isConflict = cur.rev > 0 && cur.rev !== (d.base || 0)
function isConflict(curRev, clientBase) {
  return curRev > 0 && curRev !== (clientBase || 0);
}

// ─── Client pull decision — mirrors 03-accounts.js pull() ───────────────────
// After pull: if remote rev > synced, check isDirty before applying
function isDirty(S) {
  return (S.rev || 0) !== (S.synced || 0);
}

function pullDecision(remote, S) {
  if (!remote.ok) return 'bad_key';
  if (remote.rev > (S.synced || 0)) {
    if (isDirty(S)) return 'conflict';   // Both sides changed → conflict
    return 'apply_remote';               // We're clean → safe to apply
  }
  if (isDirty(S)) return 'push';         // Local changes, remote unchanged
  return 'ok';                           // Everything in sync
}

// ─── Conflict detection (server-side logic) ───────────────────────────────────
describe('isConflict() — server-side revision guard', () => {
  it('fresh sheet (rev=0): no conflict for any client base', () => {
    assert.equal(isConflict(0, 0), false);
    assert.equal(isConflict(0, 1), false);
  });

  it('client base matches server rev → no conflict', () => {
    assert.equal(isConflict(5, 5), false);
  });

  it('client base is behind server → conflict', () => {
    assert.equal(isConflict(10, 7), true);
  });

  it('client base is ahead of server (stale server) → conflict', () => {
    // Shouldn't happen in normal operation, but guard must catch it
    assert.equal(isConflict(5, 8), true);
  });

  it('client base = 0 (new device first push) → no conflict when server=0', () => {
    assert.equal(isConflict(0, 0), false);
  });

  it('client base = 0, server has data → conflict', () => {
    // New device trying to overwrite an existing sheet
    assert.equal(isConflict(3, 0), true);
  });

  it('server rev=1, client base=1 → no conflict (normal sync cycle)', () => {
    assert.equal(isConflict(1, 1), false);
  });
});

// ─── Monotonic revision increment ────────────────────────────────────────────
describe('Monotonic revision — server assigns nextRev = cur.rev + 1', () => {
  const nextRev = cur => (cur || 0) + 1;

  it('first push: 0 → 1', () => {
    assert.equal(nextRev(0), 1);
  });

  it('subsequent push increments by 1', () => {
    assert.equal(nextRev(1), 2);
    assert.equal(nextRev(42), 43);
  });

  it('never decrements', () => {
    for (let i = 0; i < 100; i++) {
      assert.ok(nextRev(i) > i, `nextRev(${i}) must be > ${i}`);
    }
  });

  it('client synced rev matches returned rev after successful push', () => {
    // Simulates: S.synced = r.rev (line 532 of 03-accounts.js)
    const curRev = 7;
    const serverNextRev = nextRev(curRev);
    // After push succeeds, client's S.synced and S.rev = serverNextRev
    const S = { rev: serverNextRev, synced: serverNextRev };
    assert.equal(isDirty(S), false, 'after successful push, isDirty must be false');
  });
});

// ─── Client pull() decision ──────────────────────────────────────────────────
describe('pullDecision() — client action after fetching remote', () => {
  it('auth failure → bad_key', () => {
    const S = { rev: 1, synced: 1 };
    assert.equal(pullDecision({ ok: false }, S), 'bad_key');
  });

  it('remote rev same as synced, no local changes → ok', () => {
    const S = { rev: 3, synced: 3 };
    assert.equal(pullDecision({ ok: true, rev: 3 }, S), 'ok');
  });

  it('remote has newer data, local is clean → apply_remote', () => {
    const S = { rev: 3, synced: 3 };
    assert.equal(pullDecision({ ok: true, rev: 5 }, S), 'apply_remote');
  });

  it('remote has newer data AND local is dirty → conflict', () => {
    // Local has uncommitted changes (rev bumped, synced still behind)
    const S = { rev: 4, synced: 3 };
    assert.equal(pullDecision({ ok: true, rev: 5 }, S), 'conflict');
  });

  it('remote unchanged, local is dirty → push needed', () => {
    const S = { rev: 4, synced: 3 };
    assert.equal(pullDecision({ ok: true, rev: 3 }, S), 'push');
  });

  it('brand new device (no synced), remote has data → apply_remote', () => {
    const S = {}; // no rev, no synced
    assert.equal(pullDecision({ ok: true, rev: 7 }, S), 'apply_remote');
  });

  it('brand new device (no synced), remote empty → ok', () => {
    const S = {};
    assert.equal(pullDecision({ ok: true, rev: 0 }, S), 'ok');
  });
});

// ─── Conflict retry budget ────────────────────────────────────────────────────
describe('Push retry budget — max 4 merge attempts', () => {
  // Mirrors: if(!isRecovery && tries < 4 && await mergeRemote()) return push(false, tries+1)
  function shouldRetry(isRecovery, tries) {
    return !isRecovery && tries < 4;
  }

  it('first conflict (tries=0, not recovery) → retry allowed', () => {
    assert.ok(shouldRetry(false, 0));
  });

  it('tries=3 → still allows one more retry', () => {
    assert.ok(shouldRetry(false, 3));
  });

  it('tries=4 → no more retries, set conflict state', () => {
    assert.ok(!shouldRetry(false, 4));
  });

  it('recovery push → never retries (no auto-merge on disaster recovery)', () => {
    assert.ok(!shouldRetry(true, 0));
  });
});

// ─── State isolation: LOCAL keys preserved on applyRemote ────────────────────
describe('applyRemote — LOCAL preference keys preserved', () => {
  // Mirrors 03-accounts.js: const LOCAL = [...] and applyRemote(r)
  const LOCAL = ['theme','dayStart','dayEnd','lang','lockout','sync','snaps',
                 'logSent','synced','posSince','motion','sound','lastBackup','cardSettings'];

  function applyRemote(remote, localS) {
    // Extract LOCAL keys from local state
    const preserve = {};
    LOCAL.forEach(k => { if (k in localS) preserve[k] = localS[k]; });
    // Merge: remote state base, overridden by preserved local keys + revisions
    return Object.assign({}, JSON.parse(remote.state), preserve, {
      rev: remote.rev, synced: remote.rev
    });
  }

  it('theme preference survives remote apply', () => {
    const remote = {
      ok: true, rev: 5,
      state: JSON.stringify({ entries: [], theme: 'light', sound: false })
    };
    const localS = { theme: 'dark', sound: true, rev: 3, synced: 3 };
    const result = applyRemote(remote, localS);
    assert.equal(result.theme, 'dark', 'local theme must be preserved');
    assert.equal(result.sound, true,   'local sound pref must be preserved');
  });

  it('rev and synced are set to remote.rev after apply', () => {
    const remote = { ok: true, rev: 10, state: JSON.stringify({ entries: [] }) };
    const localS = { rev: 7, synced: 7 };
    const result = applyRemote(remote, localS);
    assert.equal(result.rev,    10);
    assert.equal(result.synced, 10);
    assert.equal(isDirty(result), false, 'must not be dirty after apply');
  });

  it('remote entries replace local entries', () => {
    const remoteEntries = [{ id: 99, type: 'Sale', amt: 1000 }];
    const remote = { ok: true, rev: 2, state: JSON.stringify({ entries: remoteEntries }) };
    const localS = { entries: [{ id: 1, type: 'Purchase', amt: 500 }], rev: 1, synced: 1 };
    const result = applyRemote(remote, localS);
    assert.deepEqual(result.entries, remoteEntries);
  });
});
