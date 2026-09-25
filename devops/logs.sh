#!/usr/bin/env bash
# Tail the app's journald logs. Extra args pass to journalctl, e.g. devops/logs.sh --since "1 hour ago".
. "$(cd "$(dirname "$0")" && pwd)/config.sh"
require_host
remote_sudo journalctl -u "${SERVICE_NAME}.service" -f -n 100 "$@"
