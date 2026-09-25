# VPS deployment

Ditto runs on the shared VPS `racknerd1` at https://ditto.topherhunt.com. One Node process serves the SPA, the JSON API, `/health` and `/audio`; Caddy only terminates TLS and reverse-proxies to `127.0.0.1:3005` (`APP_PORT`). Like the other tenants (khet, openheroes, aurora) it has its own system user, systemd unit, Caddy site (`/etc/caddy/sites/ditto.caddy`) and registry entry (`/srv/registry/ditto.app`).

Unlike the games, Ditto keeps state and secrets, and needs Node 24:

| Path on host | What | Touched by deploy? |
| --- | --- | --- |
| `/srv/ditto/app` | `server/`, `shared/`, `content/` (incl. audio), `dist/web`, `scripts/backup-db.ts` | Replaced (rsync `--delete`, allow-list in `deploy.sh`) |
| `/srv/ditto/app/node_modules` | Production deps, installed on the host | Reinstalled only when `package-lock.json` changed |
| `/srv/ditto/data/app.db` | SQLite (WAL). Migrations run on boot. | Never |
| `/srv/ditto/backups` | Nightly `VACUUM INTO` snapshots, newest 14 kept (`ditto-backup.timer`) | Never |
| `/etc/ditto.env` | Secrets from `devops/production.env`, mode 640 root:ditto | Only by `push-env.sh` |
| `/opt/node24` | Ditto's own Node 24. The host's `/usr/bin/node` (22) serves the other tenants and is left alone. | Only by `provision.sh` |

## First time

The shared host setup (`host-setup.sh`: Caddy, system Node, `/srv/registry`) is already done on racknerd1; don't re-run it. If you ever do, leave `NODE_MAJOR` at 22: it changes the Node every tenant runs on.

1. DNS: A record `ditto.topherhunt.com` -> `107.172.63.9` (the racknerd1 IP khet resolves to). Check with `dig +short ditto.topherhunt.com`.
2. Google Cloud console: add `https://ditto.topherhunt.com` to the OAuth client's authorized JavaScript origins.
3. `cp devops/deploy.env.example devops/deploy.env` (already done; defaults are Ditto's).
4. `bash devops/provision.sh`: user, dirs, Node 24, the service and backup units, Caddy site, registry entry. Refuses a domain or port another app registered.
5. `cp devops/production.env.example devops/production.env`, fill it in, then `bash devops/push-env.sh`.
6. `bash devops/deploy.sh`.

## Release

`bash devops/deploy.sh` ships the local working tree, committed or not. It stops before shipping unless typecheck, `npm test`, the audio-complete check (`node scripts/validate-content.ts --require-audio`) and `npm run build` all pass. It then rsyncs, runs `npm ci --omit=dev` only when `package-lock.json` changed, restarts, and polls `https://ditto.topherhunt.com/health`. Sessions live in SQLite, so a restart logs no one out.

## Operate

- `bash devops/status.sh`: unit state, socket, local + public health, latest backups, host memory/disk.
- `bash devops/logs.sh [--since "1 hour ago"]`: tail journald.
- `bash devops/restart.sh`: restart without deploying.
- `bash devops/push-env.sh`: update secrets; restarts the app if it is running.
- Backup now: `ssh racknerd1 systemctl start ditto-backup.service`. Pull one: `scp racknerd1:/srv/ditto/backups/<file> .`
