#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ──────────────────────────────────────────
# Change this to your GitHub username/repo after forking
REPO="dssolop-ctrl/excalidraw-nextcloud"
NC_ROOT="${NC_ROOT:-/var/www/html}"
CUSTOM_APPS="$NC_ROOT/custom_apps"
MIME_CONFIG="$NC_ROOT/config/mimetypemapping.json"
APP_DIR="$CUSTOM_APPS/excalidraw"

# ─── Colors ─────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ─── Pre-flight checks ─────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Excalidraw for Nextcloud — Installer        ║"
echo "║  Navigator + Public Viewer Fork              ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Check we're inside a Nextcloud installation
if [ ! -f "$NC_ROOT/occ" ] || [ ! -f "$NC_ROOT/config/config.php" ]; then
  error "This does not look like a Nextcloud installation (checked $NC_ROOT).
       Run this script inside the Nextcloud container, or set NC_ROOT:
       NC_ROOT=/path/to/nextcloud curl -fsSL ... | bash"
fi

# Check Nextcloud version
NC_VERSION=$(php "$NC_ROOT/occ" status --output=json 2>/dev/null | php -r "echo json_decode(file_get_contents('php://stdin'),true)['versionstring'] ?? 'unknown';" 2>/dev/null || echo "unknown")
info "Nextcloud version: $NC_VERSION"

# Check PHP is available
command -v php >/dev/null 2>&1 || error "PHP is not available in this environment"

# ─── Download latest release ────────────────────────────────
info "Fetching latest release from $REPO..."

LATEST_TAG=$(curl -fsSLI -o /dev/null -w '%{url_effective}' \
  "https://github.com/$REPO/releases/latest" | grep -o '[^/]*$')

if [ -z "$LATEST_TAG" ] || [ "$LATEST_TAG" = "latest" ]; then
  error "Could not determine the latest release tag.
       Make sure a published release exists at:
       https://github.com/$REPO/releases"
fi

DOWNLOAD_URL="https://github.com/$REPO/releases/download/$LATEST_TAG/excalidraw-${LATEST_TAG}.tar.gz"
info "Downloading $LATEST_TAG..."
curl -fsSL "$DOWNLOAD_URL" -o /tmp/excalidraw-release.tar.gz || \
  error "Download failed. Check that the release asset exists at:
       $DOWNLOAD_URL"

# ─── Install ────────────────────────────────────────────────
# Create custom_apps if it doesn't exist
mkdir -p "$CUSTOM_APPS"

# Remove previous installation
if [ -d "$APP_DIR" ]; then
  warn "Removing previous installation..."
  rm -rf "$APP_DIR"
fi

info "Extracting to $APP_DIR..."
tar -xzf /tmp/excalidraw-release.tar.gz -C "$CUSTOM_APPS"
rm -f /tmp/excalidraw-release.tar.gz

# Verify extraction
if [ ! -f "$APP_DIR/appinfo/info.xml" ]; then
  error "Extraction failed — appinfo/info.xml not found in $APP_DIR"
fi

# ─── Fix permissions ────────────────────────────────────────
# Detect the web server user (www-data, apache, nginx, nobody...)
WEB_USER=$(stat -c '%U' "$NC_ROOT/config/config.php" 2>/dev/null || echo "www-data")
info "Setting ownership to $WEB_USER..."
chown -R "$WEB_USER:$WEB_USER" "$APP_DIR" 2>/dev/null || \
  warn "Could not chown — you may need to run: chown -R $WEB_USER:$WEB_USER $APP_DIR"

# ─── Register MIME type ─────────────────────────────────────
info "Registering .excalidraw MIME type..."
if [ ! -f "$MIME_CONFIG" ]; then
  echo '{"excalidraw":["application/vnd.excalidraw+json"]}' > "$MIME_CONFIG"
else
  # Merge into existing config without overwriting other entries
  php -r "
    \$f = '$MIME_CONFIG';
    \$m = json_decode(file_get_contents(\$f), true) ?: [];
    \$m['excalidraw'] = ['application/vnd.excalidraw+json'];
    file_put_contents(\$f, json_encode(\$m, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
  "
fi

# ─── Ensure custom_apps path is in config.php ───────────────
if ! grep -q "custom_apps" "$NC_ROOT/config/config.php" 2>/dev/null; then
  warn "custom_apps path not found in config.php"
  warn "Adding apps_paths configuration..."
  php -r "
    \$cf = '$NC_ROOT/config/config.php';
    \$c = include \$cf;
    if (!isset(\$c['apps_paths'])) {
      \$c['apps_paths'] = [
        ['path' => '$NC_ROOT/apps',        'url' => '/apps',        'writable' => false],
        ['path' => '$CUSTOM_APPS',          'url' => '/custom_apps', 'writable' => true],
      ];
      file_put_contents(\$cf, '<?php' . PHP_EOL . 'return ' . var_export(\$c, true) . ';' . PHP_EOL);
    }
  " 2>/dev/null || warn "Could not auto-patch config.php — add apps_paths manually if the app doesn't appear"
fi

# ─── Enable the app ─────────────────────────────────────────
info "Enabling excalidraw app..."
php "$NC_ROOT/occ" app:enable excalidraw || \
  error "Failed to enable the app. Check the logs: php $NC_ROOT/occ log:tail"

# Update MIME type database
info "Updating MIME type database..."
php "$NC_ROOT/occ" maintenance:mimetype:update-js 2>/dev/null || true
php "$NC_ROOT/occ" maintenance:mimetype:update-db 2>/dev/null || true

# ─── Done ───────────────────────────────────────────────────
echo ""
info "Installation complete!"
echo ""
echo "  ✦ Excalidraw appears in the top navigation menu"
echo "  ✦ Click any .excalidraw file in Files to edit"
echo "  ✦ Share .excalidraw files via public link for read-only viewing"
echo ""
echo "  Version: $LATEST_TAG"
echo "  Installed to: $APP_DIR"
echo ""
