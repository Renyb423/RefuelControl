#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.prod.yml"
ENV_FILE="${SCRIPT_DIR}/.env"
LAST_GOOD_ENV_FILE="${SCRIPT_DIR}/.env.last-good"
LOCK_FILE="${SCRIPT_DIR}/.deploy.lock"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-refuel-control}"
readonly SERVICE_NAME="refuelcontrol-web"
readonly PROXY_NETWORK="proxy_net"
HEALTH_ATTEMPTS="${DEPLOY_HEALTH_ATTEMPTS:-30}"
HEALTH_INTERVAL="${DEPLOY_HEALTH_INTERVAL:-2}"

die() {
  printf 'Deployment configuration error: %s\n' "$1" >&2
  exit 2
}

is_valid_repository() {
  [[ "$1" =~ ^ghcr\.io/[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*$ ]] &&
    [[ "$1" != *..* ]] && [[ "$1" != */ ]]
}

is_valid_digest() {
  [[ "$1" =~ ^sha256:[0-9a-f]{64}$ ]]
}

is_valid_positive_integer() {
  [[ "$1" =~ ^[0-9]+$ ]] && ((10#$1 > 0))
}

[[ $# -eq 3 ]] || die "Usage: deploy.sh IMAGE_REPOSITORY GITHUB_SHA IMAGE_DIGEST"

IMAGE_REPOSITORY=$1
GITHUB_SHA=$2
IMAGE_DIGEST=$3
IMAGE_TAG="sha-${GITHUB_SHA}"
EXPECTED_IMAGE="${IMAGE_REPOSITORY}@${IMAGE_DIGEST}"

is_valid_repository "$IMAGE_REPOSITORY" || die "IMAGE_REPOSITORY must be a lowercase ghcr.io repository."
[[ "$GITHUB_SHA" =~ ^[0-9a-f]{40}$ ]] || die "GITHUB_SHA must be a full lowercase commit SHA."
is_valid_digest "$IMAGE_DIGEST" || die "IMAGE_DIGEST must be a lowercase SHA-256 OCI digest."
[[ "$PROJECT_NAME" =~ ^[a-z0-9][a-z0-9_-]*$ ]] || die "COMPOSE_PROJECT_NAME is invalid."
is_valid_positive_integer "$HEALTH_ATTEMPTS" || die "DEPLOY_HEALTH_ATTEMPTS must be positive."
is_valid_positive_integer "$HEALTH_INTERVAL" || die "DEPLOY_HEALTH_INTERVAL must be positive."
[[ -f "$COMPOSE_FILE" ]] || die "docker-compose.prod.yml is missing."
command -v docker >/dev/null 2>&1 || die "Docker is not installed."
command -v flock >/dev/null 2>&1 || die "flock is not installed."

umask 077
exec 9>>"$LOCK_FILE"
chmod 600 "$LOCK_FILE"
flock -n 9 || die "Another deployment or rollback is already running."

docker compose version >/dev/null 2>&1 || die "Docker Compose is unavailable."
docker network inspect "$PROXY_NETWORK" >/dev/null 2>&1 || die "Required external Docker network ${PROXY_NETWORK} does not exist."

LAST_GOOD_IMAGE_REPOSITORY=""
LAST_GOOD_IMAGE_TAG=""
LAST_GOOD_IMAGE_DIGEST=""
LAST_GOOD_PROJECT_NAME=""

if [[ -f "$LAST_GOOD_ENV_FILE" ]]; then
  while IFS='=' read -r key value || [[ -n "$key" ]]; do
    case "$key" in
      IMAGE_REPOSITORY) LAST_GOOD_IMAGE_REPOSITORY=$value ;;
      IMAGE_TAG) LAST_GOOD_IMAGE_TAG=$value ;;
      IMAGE_DIGEST) LAST_GOOD_IMAGE_DIGEST=$value ;;
      COMPOSE_PROJECT_NAME) LAST_GOOD_PROJECT_NAME=$value ;;
    esac
  done < "$LAST_GOOD_ENV_FILE"
fi

ROLLBACK_AVAILABLE=0
if is_valid_repository "$LAST_GOOD_IMAGE_REPOSITORY" &&
  [[ "$LAST_GOOD_IMAGE_REPOSITORY" == "$IMAGE_REPOSITORY" ]] &&
  [[ "$LAST_GOOD_IMAGE_TAG" =~ ^sha-[0-9a-f]{40}$ ]] &&
  is_valid_digest "$LAST_GOOD_IMAGE_DIGEST" &&
  [[ "$LAST_GOOD_IMAGE_DIGEST" != "$IMAGE_DIGEST" ]] &&
  [[ "$LAST_GOOD_PROJECT_NAME" == "$PROJECT_NAME" ]]; then
  ROLLBACK_AVAILABLE=1
fi

write_env() {
  local target=$1
  local repository=$2
  local tag=$3
  local digest=$4
  local project=$5
  local next="${target}.next"

  {
    printf 'COMPOSE_PROJECT_NAME=%s\n' "$project"
    printf 'IMAGE_REPOSITORY=%s\n' "$repository"
    printf 'IMAGE_TAG=%s\n' "$tag"
    printf 'IMAGE_DIGEST=%s\n' "$digest"
  } > "$next"
  chmod 600 "$next"
  mv -f -- "$next" "$target"
}

migrate_legacy_last_good() {
  local ids config_image image_id repo_digests repo_digest digest="" matches=0
  [[ -z "$LAST_GOOD_IMAGE_DIGEST" ]] || return 0
  is_valid_repository "$LAST_GOOD_IMAGE_REPOSITORY" &&
    [[ "$LAST_GOOD_IMAGE_REPOSITORY" == "$IMAGE_REPOSITORY" ]] &&
    [[ "$LAST_GOOD_IMAGE_TAG" =~ ^sha-[0-9a-f]{40}$ ]] &&
    [[ "$LAST_GOOD_PROJECT_NAME" == "$PROJECT_NAME" ]] || return 0
  mapfile -t ids < <(docker ps --filter "label=com.docker.compose.project=${PROJECT_NAME}" \
    --filter "label=com.docker.compose.service=${SERVICE_NAME}" --format '{{.ID}}')
  ((${#ids[@]} == 1)) || die "Legacy last-good migration requires exactly one running Compose service container."
  config_image=$(docker inspect --format '{{.Config.Image}}' "${ids[0]}") || die "Cannot inspect the deployed container image."
  [[ "$config_image" == "${LAST_GOOD_IMAGE_REPOSITORY}:${LAST_GOOD_IMAGE_TAG}" ]] || die "The deployed container does not match legacy last-good state."
  image_id=$(docker inspect --format '{{.Image}}' "${ids[0]}") || die "Cannot resolve the deployed image ID."
  is_valid_digest "$image_id" || die "The deployed container has an invalid image ID."
  repo_digests=$(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$image_id") || die "Cannot inspect deployed image digests."
  while IFS= read -r repo_digest; do
    [[ "${repo_digest%@*}" == "$LAST_GOOD_IMAGE_REPOSITORY" ]] || continue
    digest=${repo_digest#*@}
    is_valid_digest "$digest" || die "The deployed image has an invalid repository digest."
    matches=$((matches + 1))
  done <<< "$repo_digests"
  ((matches == 1)) || die "Legacy last-good migration requires exactly one matching repository digest."
  write_env "$LAST_GOOD_ENV_FILE" "$LAST_GOOD_IMAGE_REPOSITORY" "$LAST_GOOD_IMAGE_TAG" "$digest" "$LAST_GOOD_PROJECT_NAME" || die "Cannot persist migrated last-good state."
  LAST_GOOD_IMAGE_DIGEST=$digest
  ROLLBACK_AVAILABLE=0
  [[ "$digest" == "$IMAGE_DIGEST" ]] || ROLLBACK_AVAILABLE=1
}

migrate_legacy_last_good

compose() {
  docker compose \
    --project-name "$PROJECT_NAME" \
    --env-file "$ENV_FILE" \
    --file "$COMPOSE_FILE" \
    "$@"
}

container_id() {
  local id
  id=$(compose ps -q "$SERVICE_NAME" 2>/dev/null) || return 1
  [[ -n "$id" && "$id" != *$'\n'* ]] || return 1
  printf '%s\n' "$id"
}

wait_for_health() {
  local attempt id status

  for ((attempt = 1; attempt <= 10#$HEALTH_ATTEMPTS; attempt++)); do
    id=$(container_id 2>/dev/null || true)
    if [[ -n "$id" ]]; then
      status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$id" 2>/dev/null || true)
      if [[ "$status" == "healthy" ]]; then
        return 0
      fi
    fi
    sleep "$HEALTH_INTERVAL"
  done

  return 1
}

verify_image() {
  local expected=$1
  local id actual

  id=$(container_id) || return 1
  actual=$(docker inspect --format '{{.Config.Image}}' "$id") || return 1
  [[ "$actual" == "$expected" ]]
}

show_diagnostics() {
  printf '%s\n' '--- docker compose ps ---' >&2
  compose ps "$SERVICE_NAME" >&2 || true
  printf '%s\n' "--- last 100 ${SERVICE_NAME} log lines ---" >&2
  compose logs --tail 100 "$SERVICE_NAME" >&2 || true
}

rollback() {
  local last_good_image="${LAST_GOOD_IMAGE_REPOSITORY}@${LAST_GOOD_IMAGE_DIGEST}"

  write_env \
    "$ENV_FILE" \
    "$LAST_GOOD_IMAGE_REPOSITORY" \
    "$LAST_GOOD_IMAGE_TAG" \
    "$LAST_GOOD_IMAGE_DIGEST" \
    "$LAST_GOOD_PROJECT_NAME" || return 1
  compose pull "$SERVICE_NAME" || return 1
  compose up -d "$SERVICE_NAME" || return 1
  wait_for_health || return 1
  verify_image "$last_good_image" || return 1
  compose ps "$SERVICE_NAME" || return 1
}

handle_failure() {
  local message=$1

  trap - ERR
  set +e
  printf 'Deployment failed: %s\n' "$message" >&2
  show_diagnostics

  if ((ROLLBACK_AVAILABLE)); then
    printf '%s\n' 'Attempting rollback to the previous immutable digest.' >&2
    if rollback; then
      printf '%s\n' 'Rollback succeeded; the deployment still returns failure.' >&2
    else
      printf '%s\n' 'Rollback failed.' >&2
      show_diagnostics
    fi
  else
    printf '%s\n' 'No valid previous immutable digest is available for rollback.' >&2
  fi

  exit 1
}

trap 'status=$?; line=$LINENO; handle_failure "unexpected error at line ${line} (exit ${status})"' ERR

write_env "$ENV_FILE" "$IMAGE_REPOSITORY" "$IMAGE_TAG" "$IMAGE_DIGEST" "$PROJECT_NAME"

if ! compose pull "$SERVICE_NAME"; then
  handle_failure "unable to pull the requested image"
fi

if ! compose up -d "$SERVICE_NAME"; then
  handle_failure "unable to start the web service"
fi

if ! wait_for_health; then
  handle_failure "the web service did not become healthy"
fi

if ! verify_image "$EXPECTED_IMAGE"; then
  handle_failure "the running container image does not match the requested immutable digest"
fi

if ! compose ps "$SERVICE_NAME"; then
  handle_failure "unable to confirm the Compose service state"
fi

write_env "$LAST_GOOD_ENV_FILE" "$IMAGE_REPOSITORY" "$IMAGE_TAG" "$IMAGE_DIGEST" "$PROJECT_NAME"
printf 'Deployment succeeded with image %s.\n' "$EXPECTED_IMAGE"
