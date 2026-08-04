#!/usr/bin/env bash
set -euo pipefail

PUBLIC_ORIGIN="${PUBLIC_ORIGIN:-https://synvibe.app}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"

echo "Checking $PUBLIC_ORIGIN/api/health"
curl -fsS "$PUBLIC_ORIGIN/api/health" >/dev/null

if [ -n "$ADMIN_TOKEN" ]; then
  echo "Checking admin summary with supplied token"
  curl -fsS "$PUBLIC_ORIGIN/api/admin/summary" \
    -H "x-synvibe-admin-token: $ADMIN_TOKEN" >/dev/null
else
  echo "ADMIN_TOKEN not set; skipping authenticated admin summary smoke"
fi

echo "Checking admin summary rejects missing token"
admin_smoke_body="$(mktemp)"
trap 'rm -f "$admin_smoke_body"' EXIT
status="$(curl -sS -o "$admin_smoke_body" -w '%{http_code}' "$PUBLIC_ORIGIN/api/admin/summary")"
if [ "$status" != "401" ]; then
  echo "Expected 401 for missing admin token, got $status" >&2
  cat "$admin_smoke_body" >&2
  exit 1
fi

echo "Production API smoke passed"
