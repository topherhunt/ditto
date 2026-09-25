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

# --- Summary -------------------------------------------------------------------------------
# One SSH round trip prints KEY=value facts; epochs are computed on the host so clock skew can't matter.
facts="$(remote_sudo "env SERVICE_NAME='${SERVICE_NAME}' APP_PORT='${APP_PORT}' APP_DIR='${APP_DIR}' DATA_DIR='${DATA_DIR}' BACKUP_DIR='${BACKUP_DIR}' APP_NODE_DIR='${APP_NODE_DIR}' bash -s" <<'REMOTE'
epoch() { [ -n "$1" ] && [ "$1" != n/a ] && date -d "$1" +%s 2>/dev/null || true; }
echo "NOW=$(date +%s)"
echo "ACTIVE=$(systemctl show "${SERVICE_NAME}" -p ActiveState --value)/$(systemctl show "${SERVICE_NAME}" -p SubState --value)"
echo "RESTARTS=$(systemctl show "${SERVICE_NAME}" -p NRestarts --value)"
echo "UP_SINCE=$(epoch "$(systemctl show "${SERVICE_NAME}" -p ActiveEnterTimestamp --value)")"
echo "MEM_CUR=$(systemctl show "${SERVICE_NAME}" -p MemoryCurrent --value)"
echo "MEM_MAX=$(systemctl show "${SERVICE_NAME}" -p MemoryMax --value)"
echo "LISTEN=$(ss -tln | awk -v p=":${APP_PORT}\$" '$4 ~ p {print $4}' | paste -sd, -)"
echo "HEALTH_LOCAL=$(curl -fsS --max-time 5 "http://127.0.0.1:${APP_PORT}/health" 2>/dev/null)"
echo "NODE=$("${APP_NODE_DIR}/bin/node" -v 2>/dev/null)"
echo "DEPLOYED=$(stat -c %Y "${APP_DIR}/dist/web/index.html" 2>/dev/null)"
echo "DB_BYTES=$(stat -c %s "${DATA_DIR}/app.db" 2>/dev/null)"
# stderr reaches journald at info priority, so `journalctl -p err` misses app errors; count "Error:" headers instead.
echo "ERRORS_24H=$(journalctl -u "${SERVICE_NAME}" --since '24 hours ago' -q -o cat --no-pager | grep -c 'Error:')"
latest="$(ls -1t "${BACKUP_DIR}"/app-*.db 2>/dev/null | head -1)"
echo "BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/app-*.db 2>/dev/null | wc -l)"
echo "BACKUP_LATEST=$([ -n "${latest}" ] && stat -c %Y "${latest}")"
echo "BACKUP_RESULT=$(systemctl show "${SERVICE_NAME}-backup.service" -p Result --value)"
echo "BACKUP_NEXT=$(epoch "$(systemctl show "${SERVICE_NAME}-backup.timer" -p NextElapseUSecRealtime --value)")"
free -m | awk '/^Mem:/ {print "HOST_MEM_AVAIL=" $7; print "HOST_MEM_TOTAL=" $2} /^Swap:/ {print "HOST_SWAP_USED=" $3}'
echo "LOAD1=$(cut -d' ' -f1 /proc/loadavg)"
echo "CORES=$(nproc)"
echo "DISK_PCT=$(df --output=pcent / | tail -1 | tr -dc 0-9)"
echo "DISK_AVAIL=$(df -h --output=avail / | tail -1 | tr -d ' ')"
REMOTE
)"
while IFS='=' read -r k v; do
  case "$k" in [A-Z_]*) printf -v "S_$k" '%s' "$v" ;; esac
done <<< "${facts}"

HEALTH_PUBLIC="$(curl -fsS --max-time 10 "https://${DOMAIN}/health" 2>/dev/null || true)"
cert_end="$(echo | openssl s_client -servername "${DOMAIN}" -connect "${DOMAIN}:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
CERT_DAYS="$([ -n "${cert_end}" ] && node -e 'console.log(Math.floor((Date.parse(process.argv[1]) - Date.now()) / 864e5))' "${cert_end}" || true)"

if [ -t 1 ]; then G=$'\e[32m'; Y=$'\e[33m'; R=$'\e[31m'; D=$'\e[2m'; B=$'\e[1m'; X=$'\e[0m'; else G=; Y=; R=; D=; B=; X=; fi
ago() {
  [ -n "$1" ] || { echo never; return; }
  local s=$(( S_NOW - $1 ))
  if [ "$s" -lt 3600 ]; then echo "$(( s / 60 ))m ago"; elif [ "$s" -lt 86400 ]; then echo "$(( s / 3600 ))h $(( s % 3600 / 60 ))m ago"; else echo "$(( s / 86400 ))d $(( s % 86400 / 3600 ))h ago"; fi
}
row() { # row <OK|WARN|FAIL|INFO> <label> <value>
  local c
  case "$1" in OK) c=$G ;; WARN) c=$Y ;; FAIL) c=$R ;; *) c=$D ;; esac
  printf "  ${c}%-4s${X}  %-14s %s\n" "$1" "$2" "$3"
}
mb() { echo "$(( ${1:-0} / 1048576 ))MB"; }

echo
echo "${B}==> ${SERVICE_NAME} summary  ${D}(https://${DOMAIN}, 127.0.0.1:${APP_PORT})${X}"
echo "  ${D}----  -------------- ------------------------------------------------${X}"

svc="${S_ACTIVE}, up $(ago "${S_UP_SINCE}" | sed 's/ ago//'), ${S_RESTARTS} restarts"
if [ "${S_ACTIVE}" != active/running ]; then row FAIL Service "${S_ACTIVE}"
elif [ "${S_RESTARTS:-0}" -gt 0 ]; then row WARN Service "${svc} (crashed and was restarted)"
else row OK Service "${svc}"; fi

case "${S_LISTEN}" in
  "127.0.0.1:${APP_PORT}") row OK Listening "${S_LISTEN} (localhost only)" ;;
  "") row FAIL Listening "nothing on port ${APP_PORT}" ;;
  *) row FAIL Listening "${S_LISTEN} (must be 127.0.0.1 only)" ;;
esac

for h in "Health local:${S_HEALTH_LOCAL}" "Health public:${HEALTH_PUBLIC}"; do
  case "${h#*:}" in *'"ok":true'*) row OK "${h%%:*}" "${h#*:}" ;; *) row FAIL "${h%%:*}" "no answer" ;; esac
done

if [ -z "${CERT_DAYS}" ]; then row FAIL "TLS cert" "could not read"
elif [ "${CERT_DAYS}" -lt 7 ]; then row FAIL "TLS cert" "expires in ${CERT_DAYS} days (Caddy renews at ~30)"
elif [ "${CERT_DAYS}" -lt 20 ]; then row WARN "TLS cert" "expires in ${CERT_DAYS} days (Caddy renews at ~30)"
else row OK "TLS cert" "expires in ${CERT_DAYS} days"; fi

row INFO Deployed "$(ago "${S_DEPLOYED}")"
case "${S_NODE}" in "v${APP_NODE_MAJOR}."*) row OK Node "${S_NODE}" ;; *) row FAIL Node "${S_NODE:-missing} (want v${APP_NODE_MAJOR})" ;; esac

if [[ "${S_MEM_CUR}" =~ ^[0-9]+$ && "${S_MEM_MAX}" =~ ^[0-9]+$ ]]; then
  pct=$(( S_MEM_CUR * 100 / S_MEM_MAX ))
  if [ "${pct}" -ge 80 ]; then row WARN "App memory" "$(mb "${S_MEM_CUR}") of $(mb "${S_MEM_MAX}") cap (${pct}%)"
  else row OK "App memory" "$(mb "${S_MEM_CUR}") of $(mb "${S_MEM_MAX}") cap (${pct}%)"; fi
else row INFO "App memory" "${S_MEM_CUR:-?} (cap ${S_MEM_MAX:-?})"; fi

if [ "${S_ERRORS_24H:-0}" -gt 0 ]; then row WARN "Errors (24h)" "${S_ERRORS_24H} in the log; see devops/logs.sh --since '24 hours ago'"
else row OK "Errors (24h)" "none"; fi

if [ -n "${S_DB_BYTES}" ]; then row OK Database "$(( S_DB_BYTES / 1024 ))KB at ${DATA_DIR}/app.db"; else row FAIL Database "missing: ${DATA_DIR}/app.db"; fi

backup_age=$(( S_NOW - ${S_BACKUP_LATEST:-0} ))
backup_val="last $(ago "${S_BACKUP_LATEST}"), ${S_BACKUP_COUNT} kept, next in $(( (${S_BACKUP_NEXT:-$S_NOW} - S_NOW) / 3600 ))h"
if [ -n "${S_BACKUP_RESULT}" ] && [ "${S_BACKUP_RESULT}" != success ]; then row FAIL Backups "last run: ${S_BACKUP_RESULT}; see journalctl -u ${SERVICE_NAME}-backup"
elif [ -z "${S_BACKUP_LATEST}" ]; then row WARN Backups "none yet (${backup_val#last never, })"
elif [ "${backup_age}" -gt 180000 ]; then row FAIL Backups "${backup_val}"
elif [ "${backup_age}" -gt 93600 ]; then row WARN Backups "${backup_val}"
else row OK Backups "${backup_val}"; fi

host_mem="${S_HOST_MEM_AVAIL}MB free of ${S_HOST_MEM_TOTAL}MB, swap used ${S_HOST_SWAP_USED}MB"
if [ "${S_HOST_MEM_AVAIL:-0}" -lt 100 ]; then row FAIL "Host memory" "${host_mem}"
elif [ "${S_HOST_MEM_AVAIL:-0}" -lt 200 ]; then row WARN "Host memory" "${host_mem}"
else row OK "Host memory" "${host_mem}"; fi

if awk -v l="${S_LOAD1}" -v c="${S_CORES}" 'BEGIN { exit !(l > c) }'; then row WARN "Host CPU" "load ${S_LOAD1} on ${S_CORES} core(s)"
else row OK "Host CPU" "load ${S_LOAD1} on ${S_CORES} core(s)"; fi

disk="${S_DISK_PCT}% used, ${S_DISK_AVAIL} free"
if [ "${S_DISK_PCT:-0}" -ge 90 ]; then row FAIL "Host disk" "${disk}"
elif [ "${S_DISK_PCT:-0}" -ge 80 ]; then row WARN "Host disk" "${disk}"
else row OK "Host disk" "${disk}"; fi
