#!/usr/bin/env bash
# Service state, listening socket, health (local + public), backups, and host resources.
. "$(cd "$(dirname "$0")" && pwd)/config.sh"
require_host
echo "--> systemd"
remote_sudo systemctl --no-pager --lines=5 status "${SERVICE_NAME}.service" || true
echo "--> listening on ${APP_PORT} (expect 127.0.0.1 only)"
remote_sudo "ss -tlnp | grep ':${APP_PORT} ' || echo '(nothing listening)'"
echo "--> health: localhost"
if remote "curl -fsS http://127.0.0.1:${APP_PORT}/health"; then echo; else echo "  FAILED"; fi
echo "--> health: https://${DOMAIN}/health"
if curl -fsS --max-time 10 "https://${DOMAIN}/health"; then echo; else echo "  FAILED"; fi
echo "--> backups (${BACKUP_DIR})"
remote_sudo "systemctl list-timers --no-pager '${SERVICE_NAME}-backup.timer' | head -2; ls -lh '${BACKUP_DIR}' | tail -3; ls -lh '${DATA_DIR}'"
echo "--> host"
remote "free -h; uptime; df -h / | tail -1"
