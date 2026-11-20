/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  NCS Daily Accounts — Google Apps Script Sync Backend
 *  TEMPLATE FILE — Copy this to your Apps Script project.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  SETUP INSTRUCTIONS:
 *  1. Open your Google Sheet → Extensions → Apps Script
 *  2. Paste this entire file, replacing any existing code
 *  3. Replace the placeholder key(s) in VALID_KEYS with your own secret token
 *     (generate a strong random string, e.g. 32+ characters)
 *  4. Click Save, then Deploy → New Deployment → Web App
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  5. Copy the deployment URL into the app's Settings → Google Sheet sync URL
 *  6. Enter the same token into Settings → Sync API Key / Token
 *
 *  SECURITY NOTES:
 *  - NEVER commit a Code.gs with real keys to a public repository.
 *    Code.gs is listed in .gitignore for this reason.
 *  - Use VALID_KEYS as a dual-key array during key rotation:
 *    add new key first, then remove old key after all devices update.
 *  - Redeploy (New Version) after any change to this file.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── CONFIGURE THESE ─────────────────────────────────────────────────────────
// Replace with your own strong secret token(s).
// Use at least 32 random characters. Example generator:
//   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
const VALID_KEYS = [
  'YOUR_SECRET_TOKEN_HERE'
  // During rotation, temporarily add a second key:
  // 'YOUR_NEW_SECRET_TOKEN_HERE'
];
// ─────────────────────────────────────────────────────────────────────────────

const CH = 40000;

function isAuth_(token) {
  if (!token || typeof token !== 'string') return false;
  return VALID_KEYS.indexOf(token.trim()) !== -1;
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_(n) {
  const s = SpreadsheetApp.getActive();
  return s.getSheetByName(n) || s.insertSheet(n);
}

function read_() {
  const sh = sheet_('State');
  const rev = +sh.getRange('B1').getValue() || 0;
  const n = sh.getLastRow();
  const state = n > 1 ? sh.getRange(2, 1, n - 1, 1).getValues().map(r => r[0]).join('') : '';
  return { rev: rev, state: state };
}

function write_(sh, rev, state) {
  sh.clear();
  sh.getRange('A1').setValue('State (do not edit)');
  sh.getRange('B1').setValue(rev);
  const parts = [];
  for (let i = 0; i < state.length; i += CH) {
    parts.push([state.slice(i, i + CH)]);
  }
  if (parts.length) {
    sh.getRange(2, 1, parts.length, 1).setValues(parts);
  }
}

/**
 * Neutralizes spreadsheet formula injection:
 * Prepends a single quote (') if string starts with '=', '+', '-', '@', '\t', '\r'.
 */
function escFormula_(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' && /^[=+\-@\t\r]/.test(val)) {
    return "'" + val;
  }
  return val;
}

function escRows_(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(r => Array.isArray(r) ? r.map(escFormula_) : [escFormula_(r)]);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET Handler (preserves backward compatibility during client migration)
// ─────────────────────────────────────────────────────────────────────────────
function doGet(e) {
  const p = (e && e.parameter) || {};
  const token = p.token || p.key || '';
  if (!isAuth_(token)) return out_({ ok: false, error: 'auth' });

  const action = p.action || 'pull';

  if (action === 'ping') {
    const sh = sheet_('State');
    const rev = +sh.getRange('B1').getValue() || 0;
    return out_({ ok: true, rev: rev });
  }

  if (action === 'inbox') {
    const since = +(p.since || 0);
    const sh = sheet_('POS_Inbox');
    if (!sh.getLastRow()) return out_({ ok: true, rows: [] });
    const rows = sh.getDataRange().getValues().slice(1)
      .filter(r => +r[0] > since)
      .map(r => ({ seq: +r[0], bill: JSON.parse(r[1]) }));
    return out_({ ok: true, rows: rows });
  }

  if (action === 'catalog') {
    const sh = sheet_('Products');
    if (!sh.getLastRow()) return out_({ ok: true, items: [] });
    const rows = sh.getDataRange().getValues().slice(1).map(r => ({
      id: r[0], name: r[1], barcode: r[2], price: +r[3] || 0, del: !!r[4]
    }));
    return out_({ ok: true, items: rows });
  }

  // Default GET: pull full state
  const data = read_();
  return out_({ ok: true, rev: data.rev, state: data.state });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST Handler (Handles push and secure POST pull/inbox/catalog/ping)
// ─────────────────────────────────────────────────────────────────────────────
function doPost(e) {
  let d = {};
  try {
    d = JSON.parse(e.postData.contents);
  } catch (x) {
    return out_({ ok: false, error: 'bad_json' });
  }

  const token = d.token || d.key || '';
  if (!isAuth_(token)) return out_({ ok: false, error: 'auth' });

  const action = d.action || 'push';

  // 1. POST Ping
  if (action === 'ping') {
    const sh = sheet_('State');
    const rev = +sh.getRange('B1').getValue() || 0;
    return out_({ ok: true, rev: rev });
  }

  // 2. POST Pull (secure pull without tokens in GET URL query)
  if (action === 'pull') {
    const data = read_();
    return out_({ ok: true, rev: data.rev, state: data.state });
  }

  // 3. POST POS Inbox
  if (action === 'inbox') {
    const since = +(d.since || 0);
    const sh = sheet_('POS_Inbox');
    if (!sh.getLastRow()) return out_({ ok: true, rows: [] });
    const rows = sh.getDataRange().getValues().slice(1)
      .filter(r => +r[0] > since)
      .map(r => ({ seq: +r[0], bill: JSON.parse(r[1]) }));
    return out_({ ok: true, rows: rows });
  }

  // 4. POST Catalog
  if (action === 'catalog') {
    const sh = sheet_('Products');
    if (!sh.getLastRow()) return out_({ ok: true, items: [] });
    const rows = sh.getDataRange().getValues().slice(1).map(r => ({
      id: r[0], name: r[1], barcode: r[2], price: +r[3] || 0, del: !!r[4]
    }));
    return out_({ ok: true, items: rows });
  }

  // 5. POST Push (Whole-State Sync)
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const cur = read_();
    const isConflict = cur.rev > 0 && cur.rev !== (d.base || 0);

    if (isConflict) {
      // Disallow routine force overwrite; allow only verified Admin Disaster Recovery
      if (!d.isRecovery) {
        return out_({ ok: false, conflict: true, rev: cur.rev });
      }
      // Mandatory Rollback Protection: take automated snapshot before recovery overwrite
      try {
        const snapName = 'Snapshot_PreRecovery_' + Utilities.formatDate(new Date(), 'Asia/Dhaka', 'yyyyMMdd_HHmmss');
        write_(sheet_(snapName), cur.rev, cur.state);
      } catch (err) {}
    }

    // Monotonic server-assigned revision
    const nextRev = (cur.rev || 0) + 1;

    // 1. Write full state blob
    if (d.state) {
      write_(sheet_('State'), nextRev, d.state);
    }

    // 2. Write human-readable Entries sheet (with formula escaping)
    const H = d.head || [
      'Date', 'Time', 'Type', 'Description', 'Category', 'Payment',
      'Amount', 'Previous Cash', 'Cash Balance', 'Actual Cash', 'Difference',
      'Status', 'Entered by', 'Party', 'Phone'
    ];
    const en = sheet_('Entries');
    en.clear();
    en.getRange(1, 1, 1, H.length).setValues([H]).setFontWeight('bold');
    en.setFrozenRows(1);
    if (d.rows && d.rows.length) {
      const safeRows = escRows_(d.rows);
      en.getRange(2, 1, safeRows.length, H.length).setValues(safeRows);
    }

    // 3. Write Log sheet (with formula escaping)
    if (d.log && d.log.length) {
      const lg = sheet_('Log');
      if (!lg.getLastRow()) lg.appendRow(['Time', 'User', 'Action', 'Detail']);
      const safeLog = escRows_(d.log);
      lg.getRange(lg.getLastRow() + 1, 1, safeLog.length, 4).setValues(safeLog);
    }

    // 4. Write closed day backups
    if (d.snaps && Array.isArray(d.snaps) && d.state) {
      d.snaps.forEach(day => {
        write_(sheet_('Backup ' + day), nextRev, d.state);
      });
    }

    return out_({ ok: true, rev: nextRev });
  } finally {
    lock.releaseLock();
  }
}
