# flagcdn.io Memory

## Project shape

- This is a small PHP website, not a Node or framework app.
- Main entry pages are `index.php`, `docs.php`, `issues.php`, and `changelog.php`.
- Shared layout is split across `header.php` and `footer.php`.
- Frontend behavior lives mostly in `assets/app.js`, `assets/i18n.js`, and `assets/site.js`.
- Data storage is file-based under `data/`.

## Important runtime details

- `header.php` reads `GOOGLE_MAPS_API_KEY` from the project-root `.env`.
- The site uses clean URLs like `/docs/`, `/issues/`, and `/changelog/`.
- Apache routing and dotfile protection are defined in `.htaccess`.
- `.env` is currently inside the web root, so web-server blocking of dotfiles is important.

## What was changed on 2026-04-03

- Added `assets/site.js` to centralize shared page scripts:
  - visitor country flag
  - GitHub stars
  - latest release announcement
  - footer back-to-top behavior
- Updated `footer.php` to load `assets/site.js` globally.
- Removed duplicated shared header/footer JS from `docs.php`, `issues.php`, and `changelog.php`.
- Fixed race conditions in `api/download-count.php` by using a single locked read-modify-write flow.
- Fixed race conditions in `api/issues.php` rate limiting by locking the per-IP temp file during the full update.
- Added `.htaccess` with:
  - clean URL rewrites for `/docs/`, `/issues/`, `/changelog/`
  - dotfile blocking such as `.env`
  - `DirectoryIndex index.php`

## Current architecture notes

- Download stats are stored in `data/download-count.txt`.
- Feedback items are stored in `data/issues.json`.
- Rate limiting for feedback uses temp files in `sys_get_temp_dir()`.
- Pages still call third-party APIs directly from the browser for geo IP and GitHub metadata.

## Good next improvements

- Move GitHub and geo-IP fetches behind local cached PHP endpoints.
- Either complete or hide partially supported languages in `assets/i18n.js` (`ja`, `de`, `ru`, `ar` are mostly fallback content).
- Consider moving `.env` outside the web root if deployment allows it.
