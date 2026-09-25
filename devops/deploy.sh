#!/usr/bin/env bash
# Check and build locally, rsync the working tree's runtime files, install deps if the lockfile changed, restart.
. "$(cd "$(dirname "$0")" && pwd)/config.sh"
require_host
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Local checks + build"
# Production refuses to boot with missing audio, so catch that here instead of in a crash loop.
( cd "${REPO_ROOT}" && npm run typecheck && npm test && node scripts/validate-content.ts --require-audio && npm run build )

remote_sudo "test -f '${ENV_FILE}'" || { echo "ERROR: ${ENV_FILE} is missing on the host. Run devops/push-env.sh first." >&2; exit 1; }

echo "==> rsync -> ${DEPLOY_HOST}:${APP_DIR}"
if [ "${DEPLOY_USER}" = root ]; then RSYNC_PATH=rsync; else RSYNC_PATH="sudo rsync"; fi
# Allow-list: rsync ignores .gitignore, so .env, data/, tools/ etc. must never be reachable by an include.
# Excluded paths (node_modules on the host) are also protected from --delete.
rsync -az --delete --delay-updates --rsync-path="${RSYNC_PATH}" -e "ssh -p ${SSH_PORT}" \
  --exclude='.DS_Store' \
  --include='/package.json' --include='/package-lock.json' \
  --include='/server/***' --include='/shared/***' --include='/content/***' \
  --include='/dist/' --include='/dist/web/***' \
  --include='/scripts/' --include='/scripts/backup-db.ts' \
  --exclude='*' \
  "${REPO_ROOT}/" "${DEPLOY_USER}@${DEPLOY_HOST}:${APP_DIR}/"

echo "==> Permissions + runtime deps"
remote_sudo "env SERVICE_USER='${SERVICE_USER}' SERVICE_NAME='${SERVICE_NAME}' APP_DIR='${APP_DIR}' APP_NODE_DIR='${APP_NODE_DIR}' bash -s" <<'REMOTE'
set -euo pipefail
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${APP_DIR}"
find "${APP_DIR}" -path "${APP_DIR}/node_modules" -prune -o -type d -exec chmod 755 {} + -o -type f -exec chmod 644 {} +
cd "${APP_DIR}"
if ! cmp -s package-lock.json node_modules/.deployed-lock; then
  install -d -o "${SERVICE_USER}" -g "${SERVICE_USER}" "/tmp/${SERVICE_NAME}-home" "/tmp/${SERVICE_NAME}-npm-cache"
  # npm's shebang is `env node`, so PATH must put Ditto's Node ahead of the host's /usr/bin/node.
  runuser -u "${SERVICE_USER}" -- env PATH="${APP_NODE_DIR}/bin:/usr/bin:/bin" HOME="/tmp/${SERVICE_NAME}-home" \
    NPM_CONFIG_CACHE="/tmp/${SERVICE_NAME}-npm-cache" npm ci --omit=dev --no-audit --no-fund
  runuser -u "${SERVICE_USER}" -- cp package-lock.json node_modules/.deployed-lock
else
  echo "package-lock.json unchanged; skipping npm ci"
fi
REMOTE

echo "==> Restart"
remote_sudo systemctl restart "${SERVICE_NAME}.service"
health_ok=0
for attempt in $(seq 1 20); do
  if health_body="$(curl -fsS --max-time 5 "https://${DOMAIN}/health" 2>/dev/null)"; then
    printf '%s\n' "${health_body}"
    health_ok=1
    break
  fi
  echo "Waiting for public health check (${attempt}/20)..." >&2
  sleep 1
done
if [ "${health_ok}" -ne 1 ]; then
  echo >&2 "ERROR: public health check failed. Inspect: devops/status.sh and devops/logs.sh"
  exit 1
fi
echo "==> Deployed: https://${DOMAIN}/ at $(date "+%Y-%m-%d %H:%M")"
