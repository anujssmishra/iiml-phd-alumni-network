#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != Linux ]]; then
  echo "This explicit CI bootstrap requires Linux." >&2
  exit 1
fi
verification_uid="$(id -u)"
verification_gid="$(id -g)"
verification_runner_user="$(id -un)"
verification_runner_home="$(getent passwd "$verification_uid" | cut -d: -f6)"
verification_node="$(command -v node)"
verification_parent_namespace="$(readlink /proc/self/ns/net)"
if [[ "$verification_uid" == 0 ]]; then
  echo "Start the CI bootstrap as the non-root runner, not root." >&2
  exit 1
fi

# Sudo is explicit, never an automatic fallback. Only the new network
# namespace is configured as root; the workload regains neither root nor caps.
exec sudo --preserve-env=APP_ENV,DATABASE_URL,NEXTAUTH_URL,NEXTAUTH_SECRET,GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,ACADEMIC_EMAIL_DOMAINS,NEXT_TELEMETRY_DISABLED,BROWSER_SERVER_MODE,BROWSER_APP_ENV,ENABLE_AUTO_CONFERENCE_SYNC \
  unshare --net -- bash --noprofile --norc -c '
    set -euo pipefail
    verification_uid=$1
    verification_gid=$2
    verification_node=$3
    verification_directory=$4
    verification_runtime_path=$5
    verification_parent_namespace=$6
    verification_runner_home=$7
    verification_runner_user=$8
    shift 8
    if [[ "$(readlink /proc/self/ns/net)" == "$verification_parent_namespace" ]]; then
      echo "Network namespace did not change." >&2
      exit 1
    fi
    ip link set lo up
    cd "$verification_directory"
    exec setpriv --reuid "$verification_uid" --regid "$verification_gid" --init-groups \
      --bounding-set=-all --inh-caps=-all --ambient-caps=-all --no-new-privs \
      env PATH="$verification_runtime_path" HOME="$verification_runner_home" \
      USER="$verification_runner_user" LOGNAME="$verification_runner_user" \
      NODE_OPTIONS= VERIFICATION_EXPECT_UID="$verification_uid" \
      "$verification_node" scripts/offline-run.mjs --inside "$@"
  ' offline-ci "$verification_uid" "$verification_gid" "$verification_node" "$PWD" "$PATH" "$verification_parent_namespace" "$verification_runner_home" "$verification_runner_user" "$@"
