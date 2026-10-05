#!/usr/bin/env bash
# The app's journald logs. No args follows the last 100 lines; args pass to journalctl instead and print once,
# e.g. devops/logs.sh --since "1 hour ago" -p warning. ssh joins args into one string, so each is escaped with %q.
. "$(cd "$(dirname "$0")" && pwd)/config.sh"
require_host
if [ $# -eq 0 ]; then set -- -f -n 100; fi
remote_sudo "journalctl -u '${SERVICE_NAME}.service' --no-pager $(printf '%q ' "$@")"
