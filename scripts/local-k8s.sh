#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Every kubectl call names the local context, never the user's current cluster.
k() { kubectl --context kind-prizecheck -n prizecheck-local "$@"; }
case "${1:-}" in
  start)
    if ! kind get clusters | grep -qx prizecheck; then
      kind create cluster --name prizecheck --config deploy/kind.yaml --wait 120s
    fi
    kind load docker-image prizecheck:local-v1 --name prizecheck
    k apply -f deploy/local.yaml
    k rollout status deployment/prizecheck --timeout=180s
    ;;
  access)
    k port-forward --address 127.0.0.1 service/prizecheck 3200:3000
    ;;
  status)
    k get deployments,pods,services
    ;;
  stop)
    k scale deployment/prizecheck --replicas=0
    ;;
  resume)
    k scale deployment/prizecheck --replicas=2
    k rollout status deployment/prizecheck --timeout=180s
    ;;
  cleanup)
    kind delete cluster --name prizecheck
    ;;
  *)
    echo 'Usage: bash scripts/local-k8s.sh {start|access|status|stop|resume|cleanup}' >&2
    exit 2
    ;;
esac
