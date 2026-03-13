# Excalidraw for Nextcloud (Extended Fork)

Nextcloud app for opening, editing, and browsing `.excalidraw` files — with a dedicated navigator page and public sharing support.

Based on [excalidraw-nextcloud](https://github.com/KaustubhPatange/excalidraw-nextcloud) by KaustubhPatange.

**Compatible with Nextcloud 28–32.**

---

## Features

### Original (preserved)
- **File handler**: click any `.excalidraw` file in Files → fullscreen Excalidraw editor
- **Auto-save**: changes saved via WebDAV with 2-second debounce
- **Bundled fonts**: served locally, CSP-compliant

### New in this fork

#### Navigator page
A dedicated page in the Nextcloud top menu (alongside Files, Contacts, Talk):
- **Folder tree sidebar** — configure watched folders for `.excalidraw` files
- **File grid** — browse all drawings with cards (name, size, date)
- **Quick actions** — open for editing, jump to file in Files app

#### Public share viewer
Share `.excalidraw` files via public link:
- **Read-only Excalidraw** renders the drawing in the browser
- **Export buttons** — visitors can export to PNG or SVG
- **Zoom and pan** — full navigation of the drawing
- Works with password-protected and expiring shares

---

## Installation

```bash
# Clone the fork
git clone https://github.com/YOUR_USERNAME/excalidraw-nextcloud.git
cd excalidraw-nextcloud

# Install & build
npm install
npm run build

# Copy to Nextcloud
cp -r . /var/www/html/custom_apps/excalidraw

# Register MIME type (create file if it doesn't exist)
# Add to <nextcloud-root>/config/mimetypemapping.json:
# { "excalidraw": ["application/vnd.excalidraw+json"] }

# Enable & update
php /var/www/html/occ app:enable excalidraw
php /var/www/html/occ maintenance:mimetype:update-js
php /var/www/html/occ maintenance:mimetype:update-db
```

### Docker

```bash
docker exec -it nextcloud-app bash
cd /var/www/html/custom_apps
git clone <repo-url> excalidraw && cd excalidraw
npm install && npm run build
php /var/www/html/occ app:enable excalidraw
php /var/www/html/occ maintenance:mimetype:update-js
chown -R www-data:www-data /var/www/html/custom_apps/excalidraw
```

---

## Development

```bash
npm run dev   # Watch mode — rebuilds on file changes
```

### Webpack entry points

| Entry | Output | Purpose |
|---|---|---|
| `src/fileaction.jsx` | `js/fileaction.js` | File handler in Files app (original) |
| `src/navigator.js` | `js/navigator.js` | Navigator page (new) |
| `src/public.jsx` | `js/public.js` | Public share viewer (new) |

---

## Project structure

```
excalidraw/
├── appinfo/
│   ├── info.xml                  # Metadata, NC 28-32, navigation
│   └── routes.php                # Page, API, public routes
├── lib/
│   ├── AppInfo/Application.php   # Bootstrap + providers
│   ├── Controller/
│   │   ├── PageController.php    # Navigator page
│   │   ├── ApiController.php     # REST API (tree, settings)
│   │   └── PublicViewController.php
│   ├── Listeners/
│   │   └── FilesLoadAdditionalScriptsListener.php  (original)
│   └── Provider/
│       └── ExcalidrawPublicShareProvider.php
├── templates/
│   ├── navigator.php
│   └── public.php
├── src/
│   ├── fileaction.jsx             (original, untouched)
│   ├── navigator.js               # Vue navigator entry
│   ├── public.jsx                 # React public viewer entry
│   ├── NavigatorApp.vue
│   └── components/
│       ├── TreeNode.vue
│       └── FileCard.vue
├── css/navigator.css
├── img/app.svg
├── webpack.config.js
└── package.json
```

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/apps/excalidraw/api/v1/tree` | File tree for watched folders |
| GET | `/apps/excalidraw/api/v1/file?path=...` | Raw file content |
| GET | `/apps/excalidraw/api/v1/settings` | User settings |
| PUT | `/apps/excalidraw/api/v1/settings` | Update watched folders |

## License

AGPL-3.0 — see [LICENSE](LICENSE).
