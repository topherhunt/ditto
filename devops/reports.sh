#!/usr/bin/env bash
# Problem reports between production and the dev DB (see scripts/reports.ts). Usage:
#   devops/reports.sh pull                         save production's reports to data/reports.json and mirror them into the dev DB
#   devops/reports.sh close "<resolution>" <id>...   close triaged reports on production once their fix is deployed
. "$(cd "$(dirname "$0")" && pwd)/config.sh"
require_host
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# As the service user, so a write never leaves root-owned WAL files the app can't open.
on_host() { remote_sudo "runuser -u '${SERVICE_USER}' -- '${APP_NODE_DIR}/bin/node' '${APP_DIR}/scripts/reports.ts' $(printf '%q ' "$@")"; }

case "${1:-}" in
  pull)
    mkdir -p "${REPO_ROOT}/data"
    on_host export "${DATA_DIR}/app.db" > "${REPO_ROOT}/data/reports.json.new"
    mv "${REPO_ROOT}/data/reports.json.new" "${REPO_ROOT}/data/reports.json"
    node "${REPO_ROOT}/scripts/reports.ts" import "${DATABASE_PATH:-${REPO_ROOT}/data/app.db}" "${REPO_ROOT}/data/reports.json"
    ;;
  close)
    shift
    on_host close "${DATA_DIR}/app.db" "$@"
    ;;
  *)
    echo "Usage: devops/reports.sh pull | close \"<resolution>\" <id>..." >&2
    exit 1
    ;;
esac
