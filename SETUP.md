# NCS Accounts: Android + Windows Apps & Cloud Sync Setup

This guide covers one-time initial setup, Google Apps Script sync configuration, credential management, security guidelines, and the release process.

---

## 1. Zero-Trust Security & Repository Setup

The GitHub repository is **Public** so that mobile and desktop clients can download automated live updates from GitHub Releases.

> [!IMPORTANT]
> **Zero-Trust Rule**: Never commit secrets (API keys, tokens, or live Google Apps Script URLs) to GitHub.
> - `config.js` and `Code.gs` are strictly ignored by `.gitignore` and must never be committed.
> - Reference templates with dummy placeholders are provided in the repo:
>   - `config.example.js` (client config template)
>   - `Code.example.gs` (Google Apps Script sync backend template)
> - Live credentials belong **only** inside device local storage (via in-app Settings) or your private Google Apps Script project.

### Initial Repository Upload
1. Clone or download your repository.
2. Ensure `.gitignore` includes `config.js` and `Code.gs`.
3. Commit and push the project files to your GitHub repository (`nasiropintu/ncs-accounts`).
4. Ensure GitHub Actions workflow permissions allow publishing:
   **Settings → Actions → General → Workflow permissions → Read and write permissions → Save**.

---

## 2. Google Apps Script Sync Backend Setup

1. Open your target Google Sheet (or create a new one).
2. Go to **Extensions → Apps Script**.
3. Copy the entire contents of [`Code.example.gs`](file:///c:/Users/User/Desktop/NCS%20WORK%20-%20STATION/ncs-accounts-main/Code.example.gs) into the editor (replacing all code).
4. Configure your secret token:
   Generate a high-entropy secret token (32+ random characters), for example using Node.js:
   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```
   Add it to `VALID_KEYS` in your Apps Script:
   ```javascript
   const VALID_KEYS = [
     'YOUR_STRONG_SECRET_TOKEN_HERE'
   ];
   ```
5. Click **Save** (Ctrl+S).
6. Click **Deploy → New deployment**:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Click **Deploy** and copy the **Web app URL** (ends in `/exec`).

---

## 3. Configuring Sync on Each Device

On each device (Web PWA, Android APK, or Windows PC):
1. Open the NCS Accounts app.
2. Go to **More → Settings (System Settings)**.
3. Paste the **Web app URL** into the `Google Sheet sync URL (Web App)` field.
4. Enter the matching token into the `Sync API Key / Token` field.
5. Tap **⚡ Test Connection** to verify connection, authentication, and current server revision.
6. Tap **Save**. Sync will immediately pull current state and begin auto-syncing.

> [!TIP]
> **Shared Workstations**: If using a public or shared computer, use the **🗑 Clear Credentials** button in Settings or Diagnostics to purge the stored URL and Key from `localStorage` before leaving.

### Seamless Token Rotation (Zero-Downtime)
To rotate a compromised or retired key:
1. Generate a new secret token.
2. In Google Apps Script, add the new token to `VALID_KEYS` alongside the old one:
   ```javascript
   const VALID_KEYS = [
     'NEW_STRONG_SECRET_TOKEN',
     'OLD_TOKEN_DURING_MIGRATION'
   ];
   ```
3. Deploy as a **New Version**.
4. Update each device via **Settings → Sync API Key**.
5. Once all devices are updated, remove the old token from `VALID_KEYS` and redeploy.

---

## 4. Android Code Signing Setup (CI Pipeline)

To allow the Android app to sign release builds and auto-update:
1. Open `PRIVATE-signing-secrets.txt` on your local PC (keep this file secure; never upload to git).
2. In your repository on GitHub, go to **Settings → Secrets and variables → Actions → New repository secret**.
3. Create two secrets:
   - `ANDROID_KEYSTORE_PASSWORD`: Keystore password from your private file.
   - `ANDROID_KEYSTORE_B64`: Base64 string of the keystore from your private file.

---

## 5. Automated Build & Verification Pipeline

Builds run entirely in the cloud via GitHub Actions (`.github/workflows/build.yml`):
- **Automated QA Gate**: Runs `npm test` (97 unit tests covering accounting, wallets, ledger balance, and sync conflict resolution). The build will fail fast if any test breaks.
- **APK Verification Gate**: Mandatorily verifies cryptographic signature with `apksigner verify` before releasing.
- **Artifacts Produced**:
  - `NCS-Accounts-<version>.apk` (Android)
  - `NCS-Accounts-Setup-<version>.exe` (Windows x64)
  - `www.zip` + `update.json` (OTA differential updates)

---

## 6. Installation & Client Updates

- **Phone (Android)**: Download the `.apk` from the Releases page and install. Subsequent updates apply over-the-air in the background (restart prompt appears).
- **PC (Windows)**: Run `NCS-Accounts-Setup-<version>.exe`. Background updates are handled automatically by electron-updater.
- **Web PWA**: Access the GitHub Pages deployment; updates refresh automatically through Service Worker cache invalidation (`sw.js`).

---

## 7. Releasing an Update (Development Protocol)

1. Make changes in `src/` following the Two-Tree contract (Rule 39).
2. **Version Bump Protocol**:
   - `APP_VERSION` in `src/js/10-sound-clock.js` (canonical source)
   - Add new entry at index 0 of `VERS` and `UPC` in `src/js/10-sound-clock.js`
   - Bump version in `package.json` and `.native-version.json`
   - Increment Service Worker cache version in `sw.js` (e.g., `ncs-v88`)
   - Update script asset tag `?v=<version>` in `src/template.html`
   - Log release in `HANDOVER.md`
3. **Compile and Test**:
   ```bash
   npm run prepare-www
   ```
   This automatically runs `npm test` (all 97 tests must pass) and compiles `src/` into `index.html` and `www/`.
4. **Mirror & Commit**:
   Mirror files to the local git clone, commit, and push to `origin/main`.
   GitHub Actions will automatically trigger, run tests, build native binaries, and publish the release.

---

## 8. Storage & Client-Side Security Architecture

- **Browser Storage Boundary (SEC-05)**:
  `localStorage` and `IndexedDB` rely on OS-level device access controls (Android screen lock / biometric, Windows user account isolation).
- **Disaster Recovery Rollbacks**:
  Disaster recovery cloud overwrites require Admin PIN confirmation and automatically generate an immutable snapshot in Google Sheets (`Snapshot_PreRecovery_<datetime>`).
- **Encrypted Manual Backups**:
  Use **More → Settings → Download data backup** with the **Password-protected (AES-GCM encrypted)** option to export encrypted backups (`.json.enc`) using PBKDF2 (100,000 iterations) + AES-GCM-256.

---

## Files in this Project

| Path | Purpose |
|---|---|
| `src/` | Modular ES6/JS source code, CSS, and HTML template |
| `tests/` | Automated QA test suites (accounting, wallet, ledger, sync-conflict) |
| `index.html` | Compiled single-page web app bundle |
| `sw.js` | Service Worker providing offline caching for PWA |
| `config.example.js` | Template for client-side configuration (gitignored `config.js`) |
| `Code.example.gs` | Template for Google Apps Script sync backend (gitignored `Code.gs`) |
| `scripts/build.js` | AST-validated modular JS compiler |
| `scripts/prepare-www.js` | Prepares `www/` payload for native apps and runs QA tests |
| `scripts/android-setup.js` | Generates Capacitor Android project |
| `electron/` | Electron Windows shell and auto-updater scripts |
| `.github/workflows/build.yml` | GitHub Actions CI/CD release workflow |
| `HANDOVER.md` | Primary architectural and protocol documentation |
