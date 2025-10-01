#!/usr/bin/env bash
set -euo pipefail

INFO(){ printf "[bootstrap] %s\n" "$1"; }
WARN(){ printf "[bootstrap][warn] %s\n" "$1" >&2; }
FAIL(){ printf "[bootstrap][error] %s\n" "$1" >&2; exit 1; }

if ! command -v doppler >/dev/null 2>&1; then
  FAIL "Doppler CLI not found. Reopen in container or install Doppler first."
fi

MGMT_TOKEN="${DOPPLER_MANAGEMENT_TOKEN:-${DOPPLER_TOKEN:-}}"
if [ -z "$MGMT_TOKEN" ]; then
  WARN "No Doppler management token detected (DOPPLER_MANAGEMENT_TOKEN or DOPPLER_TOKEN)."
  WARN "Obtain a service token with Project Admin rights and export it before rerunning."
  FAIL "Aborting bootstrap."
fi

INFO "Using provided Doppler management token for project bootstrap."

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
DEFAULT_NAME=$(basename "$REPO_ROOT")
DEFAULT_NAME=${DEFAULT_NAME// /-}
DEFAULT_NAME=$(printf '%s' "$DEFAULT_NAME" | tr '[:upper:]' '[:lower:]')
DEFAULT_CONFIG="dev"

read -rp "Project name [$DEFAULT_NAME]: " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-$DEFAULT_NAME}
read -rp "Config name [$DEFAULT_CONFIG]: " CONFIG_NAME
CONFIG_NAME=${CONFIG_NAME:-$DEFAULT_CONFIG}

INFO "Project => $PROJECT_NAME"
INFO "Config  => $CONFIG_NAME"

DOPPLER_TOKEN="$MGMT_TOKEN" doppler projects get "$PROJECT_NAME" >/dev/null 2>&1 && PROJECT_EXISTS=true || PROJECT_EXISTS=false
if [ "$PROJECT_EXISTS" = false ]; then
  INFO "Creating Doppler project $PROJECT_NAME"
  DOPPLER_TOKEN="$MGMT_TOKEN" doppler projects create "$PROJECT_NAME" --description "Auto-created for $PROJECT_NAME" || FAIL "Failed to create project"
else
  WARN "Project $PROJECT_NAME already exists; reusing"
fi

DOPPLER_TOKEN="$MGMT_TOKEN" doppler configs get "$CONFIG_NAME" --project "$PROJECT_NAME" >/dev/null 2>&1 && CONFIG_EXISTS=true || CONFIG_EXISTS=false
if [ "$CONFIG_EXISTS" = false ]; then
  INFO "Creating config $CONFIG_NAME"
  DOPPLER_TOKEN="$MGMT_TOKEN" doppler configs create "$CONFIG_NAME" --project "$PROJECT_NAME" || FAIL "Failed to create config"
else
  WARN "Config $CONFIG_NAME already exists; reusing"
fi

if [ -f "$REPO_ROOT/env.sample" ]; then
  INFO "Seeding secrets from env.sample"
  while IFS= read -r line; do
    case "$line" in
      ''|'#'*) continue ;;
      *)
        KEY=${line%%=*}
        VALUE=${line#*=}
        VALUE=${VALUE%%[[:space:]]*}
        INFO "- setting $KEY"
        DOPPLER_TOKEN="$MGMT_TOKEN" doppler secrets set "$KEY"="$VALUE" --project "$PROJECT_NAME" --config "$CONFIG_NAME" --silent || WARN "Unable to set $KEY"
        ;;
    esac
  done < "$REPO_ROOT/env.sample"
else
  WARN "No env.sample found; skipping secret seeding"
fi

INFO "Running doppler setup to link repo"
doppler setup --project "$PROJECT_NAME" --config "$CONFIG_NAME" --no-interactive || WARN "doppler setup failed; run manually"

if doppler auth whoami >/dev/null 2>&1; then
  INFO "Personal Doppler auth detected."
else
  WARN "No personal Doppler login detected. Run 'doppler login' to finish setup."
fi

INFO "Bootstrap complete."
