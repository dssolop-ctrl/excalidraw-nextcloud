# CLAUDE.md — Excalidraw for Nextcloud (Extended Fork)

## Project overview

Fork of [KaustubhPatange/excalidraw-nextcloud](https://github.com/KaustubhPatange/excalidraw-nextcloud) with these major additions:
1. **Navigator page** — dedicated NC top-menu page with folder tree sidebar + file grid, grid/list toggle, settings panel
2. **Direct editor** — navigator opens files inline in a shared editor overlay (no Files-app round-trip)
3. **Public share viewer** — read-only Excalidraw viewer for public links with PNG/SVG export
4. **File management** — create/delete/rename/share/import `.excalidraw` files from navigator and Files menu ("New canvas")
5. **Nextcloud 32 support** — original only supported NC 28–30
6. **Russian localization** and dark-theme icon variant

Current version: **0.4.7** (see `appinfo/info.xml`, `package.json`).
Repository: `https://github.com/dssolop-ctrl/excalidraw-nextcloud`
Deployed to: Nextcloud on TrueNAS Scale (cloud.thesolop.ru)

## Architecture

### Files-app integration (modified from original)
- `src/fileaction.jsx` — registers a FileAction handler for `.excalidraw` files and a "New canvas" entry in the Files `+` menu (via `addNewFileMenuEntry` from `@nextcloud/files` v3.12, accessed through the `window._nc_newfilemenu` global). Delegates rendering to the shared `editor.jsx` module.
- `src/editor.jsx` — **shared** Excalidraw editor overlay (React) used by both the Files page and the Navigator. Fullscreen overlay with WebDAV autosave (2s debounce). Used via `openExcalidrawEditor()`.
- `lib/Listeners/FilesLoadAdditionalScriptsListener.php` — injects `fileaction.js` on Files page load.

### Navigator page
- **PHP**: `PageController.php` renders `templates/navigator.php`, which mounts the Vue app.
- **Vue**: `NavigatorApp.vue` → uses `@nextcloud/vue` components (`NcContent`, `NcAppNavigation`, `NcAppContent`, `NcDialog`, etc.).
  - `components/TreeNode.vue` — recursive folder tree node with file count badges.
  - `components/FileCard.vue` — card with file name, size, date, action menu (edit / show in files / share link / rename / delete). Inline-opens the shared editor.
  - Grid/list view toggle, "New drawing" button, "Import" button (upload `.excalidraw` from PC), settings panel with folder picker.
- **API**: `ApiController.php` provides:
  - `GET /api/v1/tree` — recursive scan of watched folders, returns nested JSON with `.excalidraw` files.
  - `GET /api/v1/file?path=...` — raw JSON content of a single file.
  - `POST /api/v1/create` — create a new empty `.excalidraw` file.
  - `POST /api/v1/delete` — delete a `.excalidraw` file.
  - `GET /api/v1/folders` — list all folders for the settings folder picker.
  - `GET /api/v1/settings` / `PUT /api/v1/settings` — per-user watched folders list (stored via `OCP\IConfig`).
- Sharing goes through NC's OCS Share API (`generateOcsUrl`) with copy-to-clipboard; inside Files the native sharing panel is opened.
- Default watched folder: `/Excalidraw`. Users can add more via the settings folder picker.

### New: Public share viewer
- **PHP**: `ExcalidrawPublicShareProvider.php` implements `IPublicShareTemplateProvider`.
  - `shouldRespond()` checks if shared file ends with `.excalidraw`.
  - `renderPage()` returns `PublicTemplateResponse` with CSP for canvas/blob rendering + OG meta tags.
- **React**: `src/public.jsx` — standalone React entry (not Vue!) that renders Excalidraw in `viewModeEnabled` mode.
  - Loads file via `/s/{token}/download` public WebDAV endpoint.
  - Export buttons for PNG and SVG using `exportToBlob` / `exportToSvg` from `@excalidraw/excalidraw`.
- **Fallback**: `PublicViewController.php` extends `PublicShareController` as route fallback.

### Navigation entry
- Defined in `appinfo/info.xml` `<navigation>` block (`<name>` tag, not `<n>`).
- Routes to `excalidraw.page.index` → `PageController::index()`.
- Icons: `img/app.svg` (light) and `img/app-dark.svg` (dark theme, Excalidraw brand logo).

## Tech stack

| Layer | Technology |
|---|---|
| Original editor | React 18 + @excalidraw/excalidraw |
| Navigator page | Vue 2.7 + @nextcloud/vue 8 |
| Public viewer | React 18 (same Excalidraw lib) |
| PHP backend | Nextcloud AppFramework (OCP) |
| Build | Webpack 5 (custom config, NOT @nextcloud/webpack-vue2-config) |
| Styling | Scoped Vue CSS + NC CSS variables |

**Why two frameworks?** The original editor and Excalidraw component are React. The navigator uses Vue because that's Nextcloud's standard UI framework (`@nextcloud/vue`). The public viewer is React because it wraps the same Excalidraw component in read-only mode.

## Webpack entry points

| Entry | Source | Output | Purpose |
|---|---|---|---|
| `fileaction` | `src/fileaction.jsx` | `js/fileaction.js` | File handler in Files app (original) |
| `navigator` | `src/navigator.js` | `js/navigator.js` | Navigator page (Vue) |
| `public` | `src/public.jsx` | `js/public.js` | Public share viewer (React) |

Webpack config is custom (not NC preset) because the original used plain webpack. We added `vue-loader` and a second/third entry point.

## Known issues & bugs to fix

### Preview thumbnails not implemented
**Status**: TODO
**Where**: `FileCard.vue`
**Details**: The `file-card__preview` div shows a placeholder icon. The API endpoint `GET /api/v1/file` exists to fetch file content. Need to render a static SVG preview from Excalidraw scene data (elements array) into a canvas thumbnail.

### Apache pretty URLs (environment, not app)
**Status**: KNOWN LIMITATION
**Where**: Apache config on TrueNAS
**Problem**: `/apps/excalidraw/` returns Apache 404, but `/index.php/apps/excalidraw/` works. Apache rewrite / `mod_rewrite` is not properly configured. Not our app's bug.

### Resolved (historical reference)
- ✅ **Double URL encoding on Cyrillic paths** — fixed in `f7ca2a7`. `generateUrl` handles encoding internally; never wrap paths with `encodeURIComponent()` before passing to it.
- ✅ **Navigation icon `<n>` vs `<name>`** — fixed in source (`e36a4c6`).
- ✅ **405 on create file**, **NcContent layout gaps**, **public viewer fullscreen** — all fixed; see commit history if they regress.

## File structure

```
excalidraw/
├── appinfo/
│   ├── info.xml                  # App metadata, NC 28-32, navigation entry
│   └── routes.php                # All routes (page, API, public)
├── lib/
│   ├── AppInfo/Application.php   # Bootstrap: registers listener + public share provider
│   ├── Controller/
│   │   ├── PageController.php    # GET / → navigator page
│   │   ├── ApiController.php     # REST API (tree, file, settings)
│   │   └── PublicViewController.php  # Public share fallback route
│   ├── Listeners/
│   │   └── FilesLoadAdditionalScriptsListener.php  # (original) injects fileaction.js
│   └── Provider/
│       └── ExcalidrawPublicShareProvider.php  # IPublicShareTemplateProvider
├── templates/
│   ├── navigator.php             # Vue mount point: <div id="excalidraw-navigator">
│   └── public.php                # React mount point: <div id="excalidraw-public">
├── src/
│   ├── fileaction.jsx            # FileAction handler + "New canvas" menu entry
│   ├── editor.jsx                # Shared Excalidraw editor overlay (React), used by fileaction + navigator
│   ├── navigator.js              # Vue entry point (exposes openExcalidrawEditor on window)
│   ├── public.jsx                # React public viewer entry
│   ├── NavigatorApp.vue          # Main navigator: sidebar + file grid/list
│   └── components/
│       ├── TreeNode.vue          # Recursive folder tree
│       └── FileCard.vue          # File card with metadata + actions
├── css/navigator.css
├── img/app.svg                   # Navigation menu icon (light theme)
├── img/app-dark.svg              # Navigation menu icon (dark theme)
├── js/                           # BUILD OUTPUT (gitignored)
│   ├── fileaction.js
│   ├── navigator.js
│   ├── public.js
│   └── fonts/                    # Excalidraw fonts (copied by webpack)
├── .github/workflows/
│   ├── release.yml               # Build and Release on tag push
│   └── draft-release.yml         # (original, can be deleted)
├── install.sh                    # One-line installer for NC container
├── uninstall.sh
├── webpack.config.js
├── package.json
└── .gitignore                    # js/ and node_modules/ are excluded
```

## API endpoints

| Method | URL | Auth | Description |
|---|---|---|---|
| GET  | `/apps/excalidraw/` | User | Navigator page |
| GET  | `/apps/excalidraw/api/v1/tree` | User | File tree JSON |
| GET  | `/apps/excalidraw/api/v1/file?path=...` | User | Raw .excalidraw JSON |
| POST | `/apps/excalidraw/api/v1/create` | User | Create new `.excalidraw` file |
| POST | `/apps/excalidraw/api/v1/delete` | User | Delete `.excalidraw` file |
| GET  | `/apps/excalidraw/api/v1/folders` | User | All folders (settings picker) |
| GET  | `/apps/excalidraw/api/v1/settings` | User | Watched folders list |
| PUT  | `/apps/excalidraw/api/v1/settings` | User | Update watched folders |
| GET  | `/apps/excalidraw/s/{token}` | Public | Public share viewer |

## Development workflow

```bash
# Install deps
npm install

# Dev mode (watch)
npm run dev

# Production build
npm run build

# Deploy to NC (inside container)
curl -fsSL https://raw.githubusercontent.com/dssolop-ctrl/excalidraw-nextcloud/master/install.sh | bash
```

### Release process
1. Commit and push to master
2. Create tag: `git tag v0.X.Y && git push origin v0.X.Y`
3. GitHub Actions builds, packages (only runtime files), creates GitHub Release
4. `install.sh` fetches latest release `.tar.gz` automatically

### If you need to re-tag (fix + redeploy)
```bash
git tag -d v0.X.Y
git push origin --delete v0.X.Y
git tag v0.X.Y
git push origin v0.X.Y
```

## Deployment target

- **Server**: TrueNAS Scale → Nextcloud app (Docker container)
- **NC version**: 32
- **Domain**: cloud.thesolop.ru
- **App path inside container**: `/var/www/html/custom_apps/excalidraw/`
- **URL pattern**: requires `/index.php/` prefix (Apache rewrite not configured for pretty URLs)
- **Container access**: TrueNAS UI → Apps → Nextcloud → Container Shell, or `docker exec -it <name> bash`

## Key Nextcloud APIs used

- `IPublicShareTemplateProvider` — intercepts public share rendering for `.excalidraw` files
- `INavigationManager` (via info.xml `<navigation>`) — adds top menu entry
- `IRootFolder` / `Folder` / `File` — filesystem access for tree scanning
- `IConfig::setUserValue/getUserValue` — per-user settings storage
- `LoadAdditionalScriptsEvent` — injects JS on Files page
- `PublicShareController` — handles password-protected public shares
- `@nextcloud/vue` components — NcContent, NcAppNavigation, NcAppContent, NcDialog, etc.
- `@nextcloud/router` `generateUrl()` — route URL generation (handles encoding internally, DO NOT double-encode)
- `@nextcloud/axios` — authenticated HTTP requests to NC API

## Future ideas

- [ ] Canvas preview thumbnails in FileCard using Excalidraw's `exportToBlob` with small dimensions
- [ ] Drag-and-drop `.excalidraw` import from excalidraw.com (basic PC upload via "Import" already exists)
- [ ] Collaborative editing via Excalidraw's collab protocol (major feature)
- [ ] Additional locales beyond Russian
- [ ] Remove legacy `draft-release.yml` workflow
- [ ] Add `package-lock.json` to repo (allows `npm ci` and GitHub Actions caching)

### Recently shipped (for context)
- v0.4.7 "New canvas" entry in Files `+` menu via `addNewFileMenuEntry` (`@nextcloud/files` v3.12, `window._nc_newfilemenu`)
- v0.4.4–0.4.6 Import button, dark app icon, inline SVG icons, delete + rename actions
- v0.4.2–0.4.3 Share link via OCS API with clipboard, public viewer layout fixes
- v0.4.0–0.4.1 Direct editor from navigator, new drawing, grid/list toggle, Russian locale, settings panel
