#!/usr/bin/env bash
# WP8 gate: verify the deployed stack serves what the careers handoff contract
# needs (docs/careers-handoff-contract.md). Run against the live URL:
#   ./smoke.sh                                  # https://professional.abofonsa.com
#   ./smoke.sh http://127.0.0.1:5503            # local compose stack
# Optional deep check through gateway + Consul + JWT + api:
#   SMOKE_ADMIN_USER=admin SMOKE_ADMIN_PASSWORD=... ./smoke.sh <url>
set -u

BASE_URL="${1:-https://professional.abofonsa.com}"
FAIL=0

check() {
  local label="$1" url="$2" expect="$3"
  local code
  code=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 20 "$url")
  if [ "$code" = "$expect" ]; then
    echo "PASS  $label ($code)"
  else
    echo "FAIL  $label (got $code, want $expect)  $url"
    FAIL=1
  fi
}

echo "Smoke against $BASE_URL"

# 1. the SPA serves
check "portal root" "$BASE_URL/" 200

# 2. the careers handoff link target (contract: /register?track&locale&src)
check "careers handoff URL" "$BASE_URL/register?track=ROLE_NURSE&locale=fr&src=web-careers" 200

# 3. the gateway is reachable through the web proxy
check "gateway health via proxy" "$BASE_URL/management/health" 200

# 4. unauthenticated API access is rejected, not broken (401, not 5xx/404)
check "api auth fence" "$BASE_URL/api/account" 401

# 5. optional: JWT round-trip + api routing via Consul
if [ -n "${SMOKE_ADMIN_PASSWORD:-}" ]; then
  TOKEN=$(curl -sk --max-time 20 -H 'Content-Type: application/json' \
    -d "{\"username\":\"${SMOKE_ADMIN_USER:-admin}\",\"password\":\"$SMOKE_ADMIN_PASSWORD\"}" \
    "$BASE_URL/api/authenticate" | sed -n 's/.*"id_token"[: ]*"\([^"]*\)".*/\1/p')
  if [ -n "$TOKEN" ]; then
    echo "PASS  JWT issued by gateway"
    code=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 20 \
      -H "Authorization: Bearer $TOKEN" \
      "$BASE_URL/services/professionalService/api/onboarding/applications")
    if [ "$code" = "200" ]; then
      echo "PASS  api reached through gateway/Consul with the JWT ($code)"
    else
      echo "FAIL  api via gateway (got $code, want 200)"
      FAIL=1
    fi
  else
    echo "FAIL  could not authenticate as ${SMOKE_ADMIN_USER:-admin}"
    FAIL=1
  fi
else
  echo "SKIP  authenticated api round-trip (set SMOKE_ADMIN_PASSWORD to enable)"
fi

exit $FAIL
