#!/usr/bin/env bash
# Upload devops/production.env (gitignored) to the host's ENV_FILE, readable only by root and the app user.
. "$(cd "$(dirname "$0")" && pwd)/config.sh"
require_host
SRC="${_config_dir}/production.env"
[ -f "${SRC}" ] || { echo "ERROR: ${SRC} not found. Copy production.env.example and fill it in." >&2; exit 1; }
grep -Eq '^GOOGLE_CLIENT_ID=.+' "${SRC}" || { echo "ERROR: GOOGLE_CLIENT_ID is empty in ${SRC}." >&2; exit 1; }
if grep -Eq '^(DEV_LOGIN|NODE_ENV|HOST|PORT|DATABASE_PATH)=' "${SRC}"; then
  echo "ERROR: ${SRC} sets a var the systemd unit owns (or DEV_LOGIN, which production refuses)." >&2; exit 1
fi
remote_sudo "umask 077 && cat > '${ENV_FILE}.new' && chown root:'${SERVICE_USER}' '${ENV_FILE}.new' && chmod 640 '${ENV_FILE}.new' && mv '${ENV_FILE}.new' '${ENV_FILE}'" < "${SRC}"
echo "==> Wrote ${ENV_FILE} on ${DEPLOY_HOST}"
remote_sudo systemctl try-restart "${SERVICE_NAME}.service"
