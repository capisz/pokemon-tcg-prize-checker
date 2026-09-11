#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
k() { kubectl --context kind-prizecheck -n prizecheck-local "$@"; }
ready() { k rollout status deployment/prizecheck --timeout=180s; }
ready
baseline=$(k get deployment prizecheck -o jsonpath='{.spec.template.spec.containers[0].image}')
if [[ "$baseline" != 'prizecheck:local-v1' ]]; then
  echo 'Start with the documented local-v1 image before running this exercise.' >&2
  exit 1
fi
# Recovery after deleting one pod. This is not a node/VM availability test.
old=$(k get pods -l app=prizecheck -o jsonpath='{.items[0].metadata.name}')
k delete pod "$old" --wait=true
k wait --for=condition=Ready pod -l app=prizecheck --timeout=180s
ready
if k get pods -o name | grep -qx "pod/$old"; then exit 1; fi
echo 'PASS: deleted pod replaced; deployment recovered'

# A template change creates a new ReplicaSet and exercises a rolling rollout.
k patch deployment prizecheck --type=merge -p "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"prizecheck.local/exercise\":\"$(date +%s)\"}}}}}"
ready
good_revision=$(k get deployment prizecheck -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}')
echo 'PASS: rolling template update completed'

# Intentionally unavailable local image: maxUnavailable=0 must retain 2 good pods.
# Always attempt to restore the working revision if this exercise fails midway.
restore() { k rollout undo deployment/prizecheck --to-revision="$good_revision"; }
trap 'restore >/dev/null 2>&1 || true' EXIT
k set image deployment/prizecheck web=prizecheck:deliberately-missing
if k rollout status deployment/prizecheck --timeout=25s; then
  echo 'Expected unavailable-image rollout to fail' >&2
  exit 1
fi
available=$(k get deployment prizecheck -o jsonpath='{.status.availableReplicas}')
[[ "$available" -ge 2 ]]
k get pods
echo 'PASS: bad rollout blocked while two replicas remained available'
restore
ready
[[ $(k get deployment prizecheck -o jsonpath='{.spec.template.spec.containers[0].image}') == "$baseline" ]]
trap - EXIT
echo 'PASS: rollback restored the working image'
