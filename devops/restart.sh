#!/usr/bin/env bash
# Restart the app without deploying code.
. "$(cd "$(dirname "$0")" && pwd)/config.sh"
require_host
remote_sudo systemctl restart "${SERVICE_NAME}.service"
remote_sudo systemctl --no-pager --lines=10 status "${SERVICE_NAME}.service"
