#!/usr/bin/env bash
set -euo pipefail

SERVER_HOST="${SERVER_HOST:-root@165.232.145.239}"
APP_ROOT="${APP_ROOT:-/opt/synvibe/pulse-reaction-chat-project}"
ENV_PATH="${ENV_PATH:-/etc/synvibe/signaling-backend.env}"
DATA_DIR="${DATA_DIR:-/var/lib/synvibe}"
SERVICE_NAME="${SERVICE_NAME:-synvibe-signaling-backend}"
DEPLOY_NGINX="${DEPLOY_NGINX:-1}"
NGINX_AVAILABLE="${NGINX_AVAILABLE:-/etc/nginx/sites-available/synvibe.app}"
NGINX_ENABLED="${NGINX_ENABLED:-/etc/nginx/sites-enabled/synvibe.app}"
ADMIN_HTPASSWD="${ADMIN_HTPASSWD:-/etc/nginx/synvibe-admin.htpasswd}"

command -v ssh >/dev/null
command -v rsync >/dev/null

case "$APP_ROOT" in
  */pulse-reaction-chat-project) ;;
  *)
    echo "Refusing to deploy to APP_ROOT=$APP_ROOT; expected a path ending in pulse-reaction-chat-project." >&2
    exit 41
    ;;
esac

echo "Preparing remote backend directories on $SERVER_HOST"
ssh "$SERVER_HOST" "
  set -euo pipefail
  mkdir -p '$APP_ROOT' '$DATA_DIR' \"\$(dirname '$ENV_PATH')\"
  if [ ! -f '$ENV_PATH' ]; then
    echo 'Missing $ENV_PATH. Create it from apps/signaling-backend/.env.production.example and set SYNVIBE_ADMIN_TOKEN.' >&2
    exit 42
  fi
  if ! grep -Eq '^SYNVIBE_ADMIN_TOKEN=.{16,}$' '$ENV_PATH'; then
    echo 'SYNVIBE_ADMIN_TOKEN must be set to a private token of at least 16 characters in $ENV_PATH.' >&2
    exit 43
  fi
  if ! command -v sqlite3 >/dev/null; then
    echo 'Missing sqlite3 on the server. Install sqlite3 before starting the backend service.' >&2
    exit 45
  fi
  chown -R www-data:www-data '$DATA_DIR'
"

echo "Syncing repository to $SERVER_HOST:$APP_ROOT"
rsync -az --delete \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude 'apps/browser-client/dist/' \
  --exclude 'tmp/' \
  --exclude 'output/' \
  --exclude 'research-data/' \
  ./ "$SERVER_HOST:$APP_ROOT/"

tmp_service="$(mktemp)"
sed "s|WorkingDirectory=.*|WorkingDirectory=$APP_ROOT|" \
  deployment/systemd/synvibe-signaling-backend.service.example > "$tmp_service"
scp "$tmp_service" "$SERVER_HOST:/tmp/$SERVICE_NAME.service"
rm "$tmp_service"

echo "Installing backend service"
ssh "$SERVER_HOST" "
  set -euo pipefail
  cd '$APP_ROOT'
  pnpm install --frozen-lockfile
  mv '/tmp/$SERVICE_NAME.service' '/etc/systemd/system/$SERVICE_NAME.service'
  systemctl daemon-reload
  systemctl enable '$SERVICE_NAME'
  systemctl restart '$SERVICE_NAME'
  systemctl --no-pager --lines=40 status '$SERVICE_NAME'
  for attempt in \$(seq 1 20); do
    if curl -fsS 'http://127.0.0.1:1060/api/health' >/dev/null; then
      exit 0
    fi
    sleep 1
  done
  echo 'Backend health check did not pass within 20 seconds.' >&2
  journalctl -u '$SERVICE_NAME' --no-pager -n 80 >&2
  exit 46
"

if [ "$DEPLOY_NGINX" = "1" ]; then
  echo "Installing nginx proxy config"
  scp deployment/nginx/synvibe.app.conf.example "$SERVER_HOST:/tmp/synvibe.app.conf"
  ssh "$SERVER_HOST" "
    set -euo pipefail
    if [ ! -f '$ADMIN_HTPASSWD' ]; then
      echo 'Missing $ADMIN_HTPASSWD. Create it before exposing /admin.' >&2
      exit 44
    fi
    mv /tmp/synvibe.app.conf '$NGINX_AVAILABLE'
    ln -sfn '$NGINX_AVAILABLE' '$NGINX_ENABLED'
    nginx -t
    systemctl reload nginx
  "
fi

echo "Signaling backend deployed. Run scripts/smoke-production-api.sh with ADMIN_TOKEN set to verify public routing."
