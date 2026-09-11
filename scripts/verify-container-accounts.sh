#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Pass the app image built from THIS checkout; all emulator ports stay private.
image=${1:-prizecheck:local-v1}
results=$(mktemp -d "${TMPDIR:-/tmp}/prizecheck-account-results.XXXXXX")
web=''
runner=''
cleanup() {
  if [[ -n "$runner" ]]; then
    docker cp "$runner:/app/playwright-report" "$results/" 2>/dev/null || true
    docker cp "$runner:/app/test-results" "$results/" 2>/dev/null || true
    docker logs "$runner" > "$results/verification.log" 2>&1 || true
    docker rm -f "$runner" >/dev/null || true
  fi
  if [[ -n "$web" ]]; then docker rm -f "$web" >/dev/null || true; fi
  echo "Verification reports: $results"
}
trap cleanup EXIT
# Direct plugin path supports Homebrew installations without editing Docker config.
if docker buildx version >/dev/null 2>&1; then
  docker buildx build --load -f deploy/Dockerfile.verify -t prizecheck:account-tests .
else
  "$(brew --prefix)/lib/docker/cli-plugins/docker-buildx" build --load -f deploy/Dockerfile.verify -t prizecheck:account-tests .
fi
web=$(docker run -d --init "$image")
# Refuse a live or unrecognized browser build before any account tests run.
docker exec -i "$web" node <<'JS'
const fs = require('node:fs')
const root = '/app/.next/static/chunks'
const js = fs.readdirSync(root, { recursive: true })
  .filter(p => p.endsWith('.js')).map(p => fs.readFileSync(`${root}/${p}`, 'utf8')).join('\n')
if (!js.includes('demo-prizecheck') || js.includes('prizecheck-f33ad')) {
  throw new Error('Account tests require the demo-only browser image')
}
if (process.getuid() === 0) throw new Error('Application image must run non-root')
console.log('PASS: non-root application and demo-only browser bundle')
JS
runner=$(docker create --init --shm-size=1g --network "container:$web" prizecheck:account-tests)
docker start -a "$runner"
status=$(docker inspect "$runner" --format '{{.State.ExitCode}}')
exit "$status"
