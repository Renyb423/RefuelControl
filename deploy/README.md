# Production deployment

The workflow builds and tests the Angular SPA in Docker, publishes immutable and `latest` tags to GHCR, and deploys only the `refuelcontrol-web` Compose service behind the server's external Traefik v3 stack. The server stores no source code or Dockerfile.

## Quick path

1. Configure the repository variables and SSH secret listed below.
2. Install Docker Engine with the Compose plugin on the server and complete the one-time setup below.
3. Point the `refuelcontrol.fetek.es` DNS records to the server running Traefik.
4. Ensure `DEPLOY_PATH` is writable by `SSH_USER`.
5. Push to `main` or run **Deploy production** manually from `main`.
6. Confirm the immutable image, container health, and public HTTPS responses.

## GitHub configuration

Set these repository **Actions variables**:

| Variable | Required value |
| --- | --- |
| `SUPABASE_URL` | Public Supabase project URL used at build time. |
| `SUPABASE_KEY` | Browser-safe anon or publishable key used at build time. Never use a `service_role` or secret key. |
| `SSH_HOST` | Deployment server hostname or IPv4 address. |
| `SSH_USER` | Existing unprivileged deployment user. |
| `SSH_PORT` | SSH port. |
| `SSH_KNOWN_HOSTS` | Trusted `known_hosts` entry for `SSH_HOST` and `SSH_PORT`. Obtain and verify it out of band. |
| `DEPLOY_PATH` | Absolute server directory dedicated to this application. |

Set exactly one repository **Actions secret**:

| Secret | Purpose |
| --- | --- |
| `SSH_PRIVATE_KEY` | Private key for `SSH_USER`. |

`GITHUB_TOKEN` is created automatically for each workflow run; do not create a PAT for Actions. Existing secret names could not be inspected because `gh secret list` returned HTTP 404, so verify the names above directly in repository settings.

The Supabase URL and anon/publishable key are compiled into browser JavaScript and are therefore public by design. Row Level Security must protect the data.

## One-time server setup

Traefik is an external stack that this pipeline does not create or modify. It must run Traefik v3 with the Docker provider, use `exposedByDefault=false`, and provide all of the following resources:

| Resource | Required value |
| --- | --- |
| Public domain | `refuelcontrol.fetek.es` |
| External Docker network | `proxy_net` |
| HTTPS entrypoint | `websecure` |
| Certificate resolver | `dev_resolver` |

Configure DNS `A` and `AAAA` records for `refuelcontrol.fetek.es` to point to the public addresses handled by Traefik. Traefik already owns the global HTTP-to-HTTPS redirect.

Verify that the pre-existing external network is available. The deployment checks it but never creates it:

```sh
docker network inspect proxy_net
```

The server must also provide `flock`. The deployment script uses a persistent lock file in `DEPLOY_PATH` to fail fast when another automated deployment or manual rollback is already running.

Authenticate the server to GHCR once with a classic PAT scoped only to `read:packages`:

```sh
read -r -s GHCR_PAT
printf '%s' "$GHCR_PAT" | docker login ghcr.io --username '<github-user>' --password-stdin
unset GHCR_PAT
```

Do not place this PAT in GitHub Actions. Docker stores the server credential for subsequent `docker compose pull refuelcontrol-web` commands.

If the container package existed before this repository published it, open the package settings and grant this repository **Manage Actions access** with the **Admin** role. The cleanup action needs that relationship to retain four versions.

## Verify the deployed image

Run from `DEPLOY_PATH` on the server:

```sh
container_id=$(docker compose --env-file .env --file docker-compose.prod.yml ps -q refuelcontrol-web)
docker inspect --format 'image={{.Config.Image}} health={{.State.Health.Status}}' "$container_id"
curl --fail --silent --show-error https://refuelcontrol.fetek.es/healthz
curl --fail --silent --show-error https://refuelcontrol.fetek.es/ | grep -F '<app-root></app-root>'
```

The image must be `ghcr.io/renyb423/refuelcontrol:sha-<40-character-commit>`, health must be `healthy`, `/healthz` must return `ok`, and the root response must contain the Angular shell.

## Manual rollback

Rollback is possible only while that immutable tag is one of the four `sha-<commit>` tags still retained in GHCR.

```sh
bash ./deploy.sh ghcr.io/renyb423/refuelcontrol REPLACE_WITH_40_CHARACTER_SHA
```

This uses the same lock, bounded health check, exact image verification, and automatic recovery path as the workflow. The script updates `.env.last-good` atomically only after the requested image is healthy and the Compose service state succeeds. A failed candidate restores `.env` from `.env.last-good` without changing the last-known-good state, and the script still returns failure after a successful automatic recovery.

## Server footprint

The workflow copies only `docker-compose.prod.yml` and `deploy.sh`. The script maintains mode-`600` candidate state in `.env`, durable last-known-good state in `.env.last-good`, and a persistent `.deploy.lock` file. Application code, the Dockerfile, build credentials, and Supabase configuration files are never copied to the server.
