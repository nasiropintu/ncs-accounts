# Project Workflow Rules

1. **Always give commit commands, never push automatically**
   - Never run `git push` automatically.
   - At the end of any task that modifies files, always provide the exact `git add` and `git commit` commands for the user to review and run.

2. **Always update the app version for releases**
   - Before running `npm run prepare-www`, always bump `APP_VERSION` in `src/js/10-sound-clock.js` (and add corresponding `VERS` / `UPC` / `BUGS` changelog entries) as well as `version` in `package.json`.
   - GitHub Actions (`.github/workflows/build.yml`) only builds and publishes new Windows `.exe` and Android `.apk` releases when `APP_VERSION` in `index.html` is newer than existing GitHub releases.
