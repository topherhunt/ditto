#!/usr/bin/env bash
# Provision Ditto's tenant only: user, dirs, private Node, speech worker (Piper venv and voices), systemd units, Caddy site, registry entry.
# Idempotent. The shared host setup (Caddy, system Node, registry) already exists on racknerd1.
. "$(cd "$(dirname "$0")" && pwd)/config.sh"
require_host
echo "==> Provisioning ${SERVICE_NAME}: ${DOMAIN} -> 127.0.0.1:${APP_PORT}, ${REMOTE_DIR}, Node ${APP_NODE_MAJOR} in ${APP_NODE_DIR}"
remote_sudo "env SERVICE_NAME='${SERVICE_NAME}' SERVICE_USER='${SERVICE_USER}' DOMAIN='${DOMAIN}' APP_PORT='${APP_PORT}' REMOTE_DIR='${REMOTE_DIR}' REGISTRY_DIR='${REGISTRY_DIR}' APP_DIR='${APP_DIR}' DATA_DIR='${DATA_DIR}' BACKUP_DIR='${BACKUP_DIR}' BACKUP_KEEP='${BACKUP_KEEP}' ENV_FILE='${ENV_FILE}' APP_NODE_MAJOR='${APP_NODE_MAJOR}' APP_NODE_DIR='${APP_NODE_DIR}' SPEECH_DIR='${SPEECH_DIR}' PIPER_VERSION='${PIPER_VERSION}' PIPER_VOICES='${PIPER_VOICES}' bash -s" <<'REMOTE'
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

# Piper voices the conversation partner.
dpkg -s python3-venv >/dev/null 2>&1 || { apt-get update -q && apt-get install -y -q --no-install-recommends python3-venv; }
[ -x "${SPEECH_DIR}/venv/bin/python" ] || python3 -m venv "${SPEECH_DIR}/venv"
"${SPEECH_DIR}/venv/bin/pip" install -q "piper-tts==${PIPER_VERSION}"
install -d -m 755 "${SPEECH_DIR}/piper-voices"
for v in ${PIPER_VOICES}; do
  # it_IT-paola-medium lives at it/it_IT/paola/medium/ in rhasspy/piper-voices.
  locale="${v%%-*}"; rest="${v#*-}"; name="${rest%-*}"; quality="${rest##*-}"
  for ext in onnx onnx.json; do
    f="${SPEECH_DIR}/piper-voices/${v}.${ext}"
    if [ ! -s "$f" ]; then
      curl -fsSL -o "$f.tmp" "https://huggingface.co/rhasspy/piper-voices/resolve/main/${locale%%_*}/${locale}/${name}/${quality}/${v}.${ext}"
      mv "$f.tmp" "$f"
    fi
  done
done
echo "Piper: $("${SPEECH_DIR}/venv/bin/pip" show piper-tts | sed -n 's/^Version: //p'), voices: $(ls "${SPEECH_DIR}/piper-voices" | grep -c '\.onnx$')"

if ! id -u "${SERVICE_USER}" >/dev/null 2>&1; then
  adduser --system --group --home "${REMOTE_DIR}" --no-create-home --shell /usr/sbin/nologin "${SERVICE_USER}"
fi
install -d -m 755 "${REMOTE_DIR}"
install -d -o "${SERVICE_USER}" -g "${SERVICE_USER}" -m 755 "${APP_DIR}"
install -d -o "${SERVICE_USER}" -g "${SERVICE_USER}" -m 750 "${DATA_DIR}" "${BACKUP_DIR}"
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
Environment=SPEECH_PYTHON=${SPEECH_DIR}/venv/bin/python
Environment=TOOLS_DIR=${SPEECH_DIR}
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
# Node ~130 MB plus the speech worker, 170-250 MB while loaded (it stops after an hour idle).
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
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service"
systemctl enable --now "${SERVICE_NAME}-backup.timer"

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
NODE=${APP_NODE_DIR}/bin/node
PROVISIONED=$(date -u +%Y-%m-%dT%H:%M:%SZ)
MANIFEST
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl reload caddy
echo "==> Provisioned. Next: devops/push-env.sh, then devops/deploy.sh"
REMOTE
