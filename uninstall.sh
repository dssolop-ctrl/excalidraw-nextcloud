#!/usr/bin/env bash
set -euo pipefail

NC_ROOT="${NC_ROOT:-/var/www/html}"

echo "Disabling excalidraw app..."
php "$NC_ROOT/occ" app:disable excalidraw 2>/dev/null || true

echo "Removing files..."
rm -rf "$NC_ROOT/custom_apps/excalidraw"

echo "Done. Excalidraw app has been removed."
echo "Note: .excalidraw files in your storage are not affected."
