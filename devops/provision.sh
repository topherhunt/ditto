#!/usr/bin/env bash
# Provision Ditto's tenant only: user, dirs, private Node, systemd units, Caddy site, registry entry.
# Idempotent. The shared host setup (Caddy, system Node, registry) already exists on racknerd1.
. "$(cd "$(dirname "$0")" && pwd)/config.sh"
require_host
echo "==> Provisioning ${SERVICE_NAME}: ${DOMAIN} -> 127.0.0.1:${APP_PORT}, ${REMOTE_DIR}, Node ${APP_NODE_MAJOR} in ${APP_NODE_DIR}"
remote_sudo "env SERVICE_NAME='${SERVICE_NAME}' SERVICE_USER='${SERVICE_USER}' DOMAIN='${DOMAIN}' APP_PORT='${APP_PORT}' REMOTE_DIR='${REMOTE_DIR}' REGISTRY_DIR='${REGISTRY_DIR}' APP_DIR='${APP_DIR}' DATA_DIR='${DATA_DIR}' BACKUP_DIR='${BACKUP_DIR}' LOG_DIR='${LOG_DIR}' BACKUP_KEEP='${BACKUP_KEEP}' ENV_FILE='${ENV_FILE}' APP_NODE_MAJOR='${APP_NODE_MAJOR}' APP_NODE_DIR='${APP_NODE_DIR}' bash -s" <<'REMOTE'
set -euo pipefail
if [ -d "${REGISTRY_DIR}" ]; then
  for f in "${REGISTRY_DIR}"/*.app; do
    [ -e "$f" ] || continue
    other_name="$(sed -n 's/^SERVICE_NAME=//p' "$f")"
    other_domain="$(sed -n 's/^DOMAIN=//p' "$f")"
    other_port="$(sed -n 's/^APP_PORT=//p' "$f")"
    if [ "${other_domain}" = "${DOMAIN}" ] && [ "${other_name}" != "${SERVICE_NAME}" ]; then
      echo "ERROR: domain ${DOMAIN} is already registered by ${other_name}." >&2; exit 1
    fi
    if [ "${other_port}" = "${APP_PORT}" ] && [ "${other_name}" != "${SERVICE_NAME}" ]; then
      echo "ERROR: port ${APP_PORT} is already registered by ${other_name}." >&2; exit 1
    fi
  done
fi

if ! "${APP_NODE_DIR}/bin/node" -v 2>/dev/null | grep -q "^v${APP_NODE_MAJOR}\."; then
  [ "$(uname -m)" = x86_64 ] || { echo "ERROR: expected x86_64, got $(uname -m)" >&2; exit 1; }
  base="https://nodejs.org/dist/latest-v${APP_NODE_MAJOR}.x"
  sums="$(curl -fsSL "${base}/SHASUMS256.txt")"
  tarball="$(printf '%s\n' "${sums}" | awk '/linux-x64\.tar\.gz$/ {print $2}')"
  tmp="$(mktemp -d)"
  curl -fsSL -o "${tmp}/${tarball}" "${base}/${tarball}"
  (cd "${tmp}" && printf '%s\n' "${sums}" | grep " ${tarball}\$" | sha256sum -c -)
  rm -rf "${APP_NODE_DIR}.new"; mkdir -p "${APP_NODE_DIR}.new"
  tar -xzf "${tmp}/${tarball}" -C "${APP_NODE_DIR}.new" --strip-components=1
  rm -rf "${APP_NODE_DIR}" "${tmp}"; mv "${APP_NODE_DIR}.new" "${APP_NODE_DIR}"
fi
echo "Node: $("${APP_NODE_DIR}/bin/node" -v)"

if ! id -u "${SERVICE_USER}" >/dev/null 2>&1; then
  adduser --system --group --home "${REMOTE_DIR}" --no-create-home --shell /usr/sbin/nologin "${SERVICE_USER}"
fi
install -d -m 755 "${REMOTE_DIR}"
install -d -o "${SERVICE_USER}" -g "${SERVICE_USER}" -m 755 "${APP_DIR}"
install -d -o "${SERVICE_USER}" -g "${SERVICE_USER}" -m 750 "${DATA_DIR}" "${BACKUP_DIR}"
install -d -m 750 "${LOG_DIR}"
install -d -m 755 "${REGISTRY_DIR}" /etc/caddy/sites

cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<UNIT
[Unit]
Description=${SERVICE_NAME} (Ditto dictation trainer: API, SPA and audio)
After=network.target

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${APP_DIR}
# Required: the unit refuses to start until push-env.sh has written it.
EnvironmentFile=${ENV_FILE}
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=${APP_PORT}
Environment=DATABASE_PATH=${DATA_DIR}/app.db
Environment=SPEAK_AUDIO_DIR=${DATA_DIR}/speak-audio
ExecStart=${APP_NODE_DIR}/bin/node server/index.ts
Restart=on-failure
RestartSec=2
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
# Node ~130 MB at rest.
MemoryMax=512M

[Install]
WantedBy=multi-user.target
UNIT

cat > "/etc/systemd/system/${SERVICE_NAME}-backup.service" <<UNIT
[Unit]
Description=${SERVICE_NAME} SQLite backup

[Service]
Type=oneshot
User=${SERVICE_USER}
Group=${SERVICE_USER}
ExecStart=${APP_NODE_DIR}/bin/node ${APP_DIR}/scripts/backup-db.ts ${DATA_DIR}/app.db ${BACKUP_DIR} ${BACKUP_KEEP}
UNIT
cat > "/etc/systemd/system/${SERVICE_NAME}-backup.timer" <<UNIT
[Unit]
Description=Nightly ${SERVICE_NAME} SQLite backup

[Timer]
OnCalendar=*-*-* 03:30:00
RandomizedDelaySec=30m
Persistent=true

[Install]
WantedBy=timers.target
UNIT

# journald is size-capped and shared with every tenant, so warnings and errors are copied out daily into files nothing deletes.
install -m 755 /dev/stdin "/usr/local/sbin/${SERVICE_NAME}-archive-logs" <<'SCRIPT'
#!/bin/sh
# Usage: archive-logs <service> <dir>. Writes <dir>/YYYY-MM-DD.log (warnings and worse) for each of the last 3 days that has no file yet.
set -eu
service="$1"; dir="$2"
for n in 3 2 1; do
  day="$(date -d "${n} days ago" +%F)"
  [ -e "${dir}/${day}.log" ] && continue
  journalctl -q -u "${service}.service" -p warning -o short-iso --no-pager \
    --since "@$(date -d "${day}" +%s)" --until "@$(date -d "${day} + 1 day" +%s)" > "${dir}/${day}.log.tmp"
  mv "${dir}/${day}.log.tmp" "${dir}/${day}.log"
done
SCRIPT
cat > "/etc/systemd/system/${SERVICE_NAME}-archive-logs.service" <<UNIT
[Unit]
Description=${SERVICE_NAME} warning and error log archive

[Service]
Type=oneshot
UMask=0077
ExecStart=/usr/local/sbin/${SERVICE_NAME}-archive-logs ${SERVICE_NAME} ${LOG_DIR}
UNIT
cat > "/etc/systemd/system/${SERVICE_NAME}-archive-logs.timer" <<UNIT
[Unit]
Description=Daily ${SERVICE_NAME} warning and error log archive

[Timer]
OnCalendar=*-*-* 00:10:00
Persistent=true

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service"
systemctl enable --now "${SERVICE_NAME}-backup.timer" "${SERVICE_NAME}-archive-logs.timer"

cat > "/etc/caddy/sites/${SERVICE_NAME}.caddy" <<CADDY
# ${SERVICE_NAME}: one Node process serves the SPA, API and audio.
${DOMAIN} {
	encode zstd gzip
	# Hold requests while the app restarts instead of returning 502.
	reverse_proxy 127.0.0.1:${APP_PORT} {
		lb_try_duration 30s
		lb_try_interval 250ms
	}
}
CADDY
cat > "${REGISTRY_DIR}/${SERVICE_NAME}.app" <<MANIFEST
# ${SERVICE_NAME} -- registered by provision.sh. Discover all apps with: cat /srv/registry/*.app
SERVICE_NAME=${SERVICE_NAME}
DOMAIN=${DOMAIN}
APP_PORT=${APP_PORT}
SERVICE_USER=${SERVICE_USER}
REMOTE_DIR=${REMOTE_DIR}
UNIT=${SERVICE_NAME}.service
CADDY_SITE=/etc/caddy/sites/${SERVICE_NAME}.caddy
ENV_FILE=${ENV_FILE}
DATABASE=${DATA_DIR}/app.db
BACKUPS=${BACKUP_DIR} (${SERVICE_NAME}-backup.timer, nightly)
LOGS=${LOG_DIR} (${SERVICE_NAME}-archive-logs.timer, daily warnings and errors)
NODE=${APP_NODE_DIR}/bin/node
PROVISIONED=$(date -u +%Y-%m-%dT%H:%M:%SZ)
MANIFEST
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl reload caddy
echo "==> Provisioned. Next: devops/push-env.sh, then devops/deploy.sh"
REMOTE
