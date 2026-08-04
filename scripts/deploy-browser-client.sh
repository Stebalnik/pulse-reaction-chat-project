#!/usr/bin/env bash
set -euo pipefail

SERVER_HOST="${SERVER_HOST:-root@165.232.145.239}"
WEB_ROOT="${WEB_ROOT:-/var/www/synvibe.app}"
RELEASE_ID="${RELEASE_ID:-$(date -u +%Y%m%d%H%M%S)}"

pnpm --filter @pulse-reaction/browser-client build

ssh "$SERVER_HOST" "mkdir -p '$WEB_ROOT/releases/$RELEASE_ID'"
rsync -az --delete apps/browser-client/dist/ "$SERVER_HOST:$WEB_ROOT/releases/$RELEASE_ID/"
ssh "$SERVER_HOST" "ln -sfn '$WEB_ROOT/releases/$RELEASE_ID' '$WEB_ROOT/current' && chown -R www-data:www-data '$WEB_ROOT' && find '$WEB_ROOT/releases/$RELEASE_ID' -type d -exec chmod 755 {} + && find '$WEB_ROOT/releases/$RELEASE_ID' -type f -exec chmod 644 {} + && nginx -t && systemctl reload nginx"

echo "Deployed browser client release $RELEASE_ID to $SERVER_HOST:$WEB_ROOT/current"
