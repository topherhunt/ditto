#!/usr/bin/env bash
# Shared configuration for Ditto's VPS scripts. Values come from devops/deploy.env (gitignored) or the environment.
set -euo pipefail
_config_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${_config_dir}/deploy.env" ]; then . "${_config_dir}/deploy.env"; fi

DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_USER="${DEPLOY_USER:-root}"
SSH_PORT="${SSH_PORT:-22}"
SERVICE_NAME="${SERVICE_NAME:-ditto}"
SERVICE_USER="${SERVICE_USER:-ditto}"
DOMAIN="${DOMAIN:-ditto.topherhunt.com}"
APP_PORT="${APP_PORT:-3005}"
REMOTE_DIR="${REMOTE_DIR:-/srv/${SERVICE_NAME}}"
REGISTRY_DIR="${REGISTRY_DIR:-/srv/registry}"
# Code is replaced on every deploy; data/ (SQLite) and backups/ are never touched by rsync.
APP_DIR="${REMOTE_DIR}/app"
DATA_DIR="${REMOTE_DIR}/data"
BACKUP_DIR="${REMOTE_DIR}/backups"
BACKUP_KEEP="${BACKUP_KEEP:-14}"
# Secrets (GOOGLE_CLIENT_ID, OPENAI_API_KEY, ...) live only here on the host; push-env.sh writes it.
ENV_FILE="/etc/${SERVICE_NAME}.env"
# Ditto needs Node >= 24 but the shared host's /usr/bin/node serves other tenants, so Ditto gets its own.
# Deliberately not named NODE_MAJOR: host-setup.sh uses that to change the host-wide Node.
APP_NODE_MAJOR="${APP_NODE_MAJOR:-24}"
APP_NODE_DIR="/opt/node${APP_NODE_MAJOR}"

require_host() {
  if [ -z "${DEPLOY_HOST}" ]; then echo "ERROR: DEPLOY_HOST is not set." >&2; exit 1; fi
}
remote() { ssh -p "${SSH_PORT}" "${DEPLOY_USER}@${DEPLOY_HOST}" "$@"; }
remote_sudo() {
  if [ "${DEPLOY_USER}" = root ]; then ssh -p "${SSH_PORT}" "${DEPLOY_USER}@${DEPLOY_HOST}" "$@";
  else ssh -p "${SSH_PORT}" "${DEPLOY_USER}@${DEPLOY_HOST}" "sudo $*"; fi
}
