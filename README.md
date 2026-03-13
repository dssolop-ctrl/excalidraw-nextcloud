# Excalidraw for Nextcloud (Extended Fork)

Open, edit, and browse `.excalidraw` files in Nextcloud — with a dedicated navigator page and public sharing viewer.

Based on [excalidraw-nextcloud](https://github.com/KaustubhPatange/excalidraw-nextcloud) by KaustubhPatange. **Compatible with Nextcloud 28–32.**

---

## Features

| Feature | Description |
|---|---|
| **File editor** | Click any `.excalidraw` file in Files → fullscreen Excalidraw editor with auto-save |
| **Navigator page** | Dedicated page in the NC top menu with folder tree sidebar and file grid |
| **Public viewer** | Share `.excalidraw` via public link → read-only viewer with PNG/SVG export |

---

## Installation

### One-line install (inside Nextcloud container)

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/excalidraw-nextcloud/master/install.sh | bash
```

For TrueNAS Scale / Docker:

```bash
# Find your Nextcloud container name
docker ps | grep -i next

# Run the installer inside it
docker exec -it <container-name> bash -c \
  "curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/excalidraw-nextcloud/master/install.sh | bash"
```

If Nextcloud root is not `/var/www/html`:

```bash
NC_ROOT=/path/to/nextcloud curl -fsSL ... | bash
```

### What the installer does

1. Downloads the latest pre-built release from GitHub Releases
2. Extracts to `custom_apps/excalidraw/`
3. Registers the `.excalidraw` MIME type
4. Ensures `custom_apps` path is in `config.php`
5. Enables the app via `occ`
6. Sets correct file permissions

### Uninstall

```bash
docker exec -it <container-name> bash -c \
  "curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/excalidraw-nextcloud/master/uninstall.sh | bash"
```

---

## Updating

Re-run the install command. It removes the old version and installs the latest release.

---

## Development

```bash
git clone https://github.com/YOUR_USERNAME/excalidraw-nextcloud.git
cd excalidraw-nextcloud
npm install
npm run dev   # Watch mode
```

### Creating a release

Push a version tag — GitHub Actions builds and publishes automatically:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The workflow runs `npm install && npm run build`, strips dev files, packages a clean `excalidraw-v0.2.0.tar.gz`, and attaches it to the GitHub Release. The install script fetches this asset.

### Webpack entry points

| Entry | Output | Purpose |
|---|---|---|
| `src/fileaction.jsx` | `js/fileaction.js` | File handler in Files app (original) |
| `src/navigator.js` | `js/navigator.js` | Navigator page with sidebar |
| `src/public.jsx` | `js/public.js` | Public share viewer |

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
│   ├── navigator.js
│   ├── public.jsx
│   ├── NavigatorApp.vue
│   └── components/
│       ├── TreeNode.vue
│       └── FileCard.vue
├── css/navigator.css
├── img/app.svg
├── install.sh
├── uninstall.sh
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
