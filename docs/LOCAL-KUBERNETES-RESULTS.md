# Local infrastructure verification and portfolio notes

Verified September 10, 2026 on an Apple Silicon Mac. See [setup and architecture](LOCAL-KUBERNETES.md).

## GitHub CI and final review

[Draft PR #3](https://github.com/capisz/pokemon-tcg-prize-checker/pull/3) published branch `prizecheck/local-infrastructure` at `6bbc89be172de284043e3c5a3eaedb2e3d907f67`, based on unchanged `main` at `af6ddcffff1f575bc644e371593ae19ea7c65489`.

Both [pull-request CI](https://github.com/capisz/pokemon-tcg-prize-checker/actions/runs/34555318159) and [push CI](https://github.com/capisz/pokemon-tcg-prize-checker/actions/runs/34555304132) completed successfully. The PR job logs independently confirmed:

- Linux AMD64 image build, UID 1000 runtime assertion, health, page, bundled JavaScript and packaged card-data smoke checks passed.
- TypeScript, 40 unit/API tests, card-data checks and the Next.js build passed.
- 14 Firebase rules tests and 51 desktop/mobile browser tests passed, with five intentional platform skips, against `demo-prizecheck` emulators.

The CI `verify` job tests a source-built app; the `container` job smoke-tests the Docker image. Full browser/account testing of the Docker image and Kubernetes recovery/rollback remain the separately recorded Mac verification below. Kubernetes was not tested on the Windows PC or in GitHub Actions.

Final review found no blocking code issues. The app UI, Firebase client/rules and dependencies match the baseline. The runtime additions are a health endpoint and a container-only standalone build option. The documentation update records existing results and changes no executable code. Floating base-image tags, single-node availability and lack of load testing remain documented limitations.

The PC handoff reported no GitHub deployments for the reviewed commit. `vercel.json` disables automatic Git deployments only for this feature branch; it does not change `main` behavior. The PR stays draft and unmerged. A merge can trigger the existing production hosting integration and requires a separate decision. No production, Firebase or billing action was performed as part of this review.

## Isolated branch follow-up

Branch `prizecheck/local-infrastructure` starts at `af6ddcffff1f575bc644e371593ae19ea7c65489`, in the separate worktree `/private/tmp/prizecheck-local-infrastructure`. Only infrastructure changes were copied from the original checkout. The app UI, account/sync implementation, Firestore rules, dependency lockfile, and original tests remain identical to production. The original checkout was left unchanged.

The clean ARM64 application build passed. Image `prizecheck:infra-review` resolved to `sha256:1a9578da9e9319a3e392cfe842c8cd650d9f48a85a8beccd1ae11033adcc8b87`. The harness verified UID 1000 and a demo-only browser bundle before starting tests.

The new test harness shares the app container's private network with its browser and emulators. No host ports, credentials, or data mounts are used. Rules and browser tests run sequentially against `demo-prizecheck`. This resolved the previous host-port limitation without editing the Firebase client or any existing tests.

The clean image was also loaded into kind and verified in a temporary `prizecheck-review` namespace. Two replicas became ready; pod replacement, rolling update, failed-image availability and rollback passed. Service HTTP health, page access and card lookup passed after rollback. The review namespace was deleted afterward; the original lab deployment was left intact.

An initial harness run passed unit/rules checks but Playwright inherited source-server startup through config merging. Fixed only the new container config to explicitly replace that setting, then reran the entire harness. No app/test assertions were changed to obtain passing results.

| Clean-branch check | Result |
| --- | --- |
| TypeScript, unit/API, card data | Passed; 40 tests across 7 test files and the card-index smoke check. |
| Firebase rules | 14 passed against disposable `demo-prizecheck` emulators. |
| Container browser suite | 51 passed, 5 intentional desktop skips of mobile-specific tests, zero retries; 2.6 minutes. All account tests ran. |
| Account flows | Desktop and mobile save/reload, owner isolation, load/delete, guest transfer, account deletion, revision history, storage outage and offline reconnect passed. |
| Image/runtime smoke | Non-root/demo-bundle guard, health, page, static JavaScript and card API passed. |
| Kubernetes | Clean image passed two-replica rollout, pod replacement, failed rollout retaining availability, rollback and Service HTTP checks. Temporary review namespace cleaned up. |
| Repository checks | Shell syntax, YAML parsing, diff whitespace and original-checkout content hashes passed. Existing app/client/rules/tests/lockfile unchanged from baseline. |
| Remote actions at local verification time | None. The later branch publication and successful CI are recorded above. |

Session evidence: `/private/tmp/prizecheck-infra-verification.log`, `/private/tmp/prizecheck-infra-k8s-review/result.log`, and the HTML report under `/var/folders/v9/b7ynlw1s5kq7kygk7bkwqmd00000gp/T/prizecheck-account-results.tWemgr/playwright-report/`. These paths are temporary; reproduce the checks with the documented scripts. The original baseline's smaller test count is intentional: unpublished tests remain in the original checkout.

## Initial working-tree verification (historical)

The following first-pass results apply to the original dirty working tree. They are retained to distinguish that earlier app version from the isolated branch.

### Results

| Check | Observed result |
| --- | --- |
| Remote baseline | `af6ddcffff1f575bc644e371593ae19ea7c65489` at both start and finish; no push. |
| Existing work preservation | Compared pre-task and final tracked diffs. Of previously modified tracked files, only `next.config.mjs` changed, by the standalone opt-in addition. No rebase, checkout replacement, or commit. |
| TypeScript / unit / dataset | `npm run check`: TypeScript passed, 47 tests passed across 10 files, card-index smoke passed. |
| Docker build | Multi-stage ARM64 build passed with locked npm dependencies, Next.js 16.3.4 and Node 22 Bookworm base. |
| Image identity | Local image `prizecheck:local-v1`, image ID `sha256:8090ebe746f849ea82ff942d6b865e308658a4e6a5338294ae31a26d941b99a3`. Rebuilds can change this. |
| Runtime identity | `uid=1000(node) gid=1000(node)`; Docker health reported `healthy`. |
| Runtime packaging | Verified no `.env.local`, `.git`, `.firebase`, or Firebase CLI under `/app`; recursive browser chunk inspection found one demo-project chunk and zero `prizecheck-f33ad` chunks. This is a targeted check, not a comprehensive secret scan. |
| Docker HTTP | Smoke passed at `127.0.0.1:3100`: health, page, bundled JavaScript, and card API with packaged dataset. |
| Rules | 14 tests passed against an isolated Firestore emulator on 18080, using a temporary copy of the existing rules test with only its hardcoded port changed. Live Firebase was not used. |
| Guest browser suite | Clean final container run: 41 passed, 21 skipped in 1.3 minutes. Skips include 16 account tests with emulator mode tests disabled and five platform-specific skips. |
| Guest isolation | Separate library guest test: 2 passed, desktop and mobile; no Firebase requests during guest practice. |
| Kubernetes | kind 0.32.0, Kubernetes 1.36.1, kubectl 1.36.4; manifests accepted, Deployment 2/2 ready and available. |
| Kubernetes HTTP | Smoke passed through loopback port-forward at 3200; in-cluster `http://prizecheck:3000/api/health` returned HTTP 200. |
| Recovery | Deleted one pod; replacement reached Ready and Deployment returned to two available replicas. |
| Rolling update | Pod-template annotation change created a new ReplicaSet and completed rollout. |
| Failed rollout | `prizecheck:deliberately-missing` produced `ErrImageNeverPull`; rollout timed out as intended while two existing replicas remained available. |
| Rollback | `rollout undo` restored `prizecheck:local-v1`; Deployment returned to 2/2 with no unavailable-image pod. |
| Stop / resume | Scaled Deployment to zero, resumed to two, and waited for successful rollout. |
| Dependency warnings | Install reported nine moderate advisories across all dependencies. `npm audit --omit=dev` reported zero runtime advisories at verification time. No dependency versions changed. |
| Repository hygiene | Shell syntax and diff whitespace checks passed. New CI job added; no remote workflow run triggered. |

### Troubleshooting encountered

1. Docker Desktop's recorded install was an empty application directory. Installed Colima, Docker CLI/buildx, kind, and kubectl, then created a dedicated local VM.
2. Homebrew's buildx plugin was outside Docker's default discovery path. Used its absolute executable path without overwriting Docker configuration.
3. Existing Java process occupied port 8080. The initial standard-port rules command stopped without running tests; left that process/data untouched and verified rules on temporary port 18080 instead. Full container account tests against standard-port emulators remain unverified in this session.
4. Playwright's required Chromium revision was missing. Installed it, then reran the tests.
5. Two overlapping browser runs collided in Playwright's shared artifact directory, producing ENOENT report errors. Reran the complete guest suite alone with its own temporary output directory; all applicable tests passed. Run browser suites sequentially or give each a distinct output directory.
6. A port-forward attached to a replaced pod disconnected. In-cluster Service HTTP succeeded; restarting the port-forward restored browser access. This distinction is documented in the setup guide.

## Limits and follow-up

- No production deployment, live database write, Firebase configuration/rules change, billing action, or image publication occurred. Existing public hosting and approved UI remain as they were.
- GitHub Actions passed for reviewed code commit `6bbc89b` on both push and PR events. AMD64 container smoke coverage is remote; full container account and Kubernetes exercises are local. These checks are not production or load-test evidence.
- The isolated follow-up exercised all account tests present in the production baseline, including simulated OAuth, save/load, owner isolation, account deletion and offline reconnect. Real Google OAuth and live Firebase remain outside this verification. Unpublished tests in the original checkout were not copied into this branch.
- Requests/limits are lab starting values. A Docker snapshot during browser checks showed about 67 MiB used; this is not peak-load measurement or evidence of capacity. No load testing, metrics server, autoscaling, network policies, node failure, or disaster recovery test was performed.
- Health probes were exercised during startup/readiness and healthy operation. No separate induced liveness timeout was tested. Pod replacement tests controller recovery, not every failure mode.
- The lab is local, single-node, with ephemeral emulator data. Do not claim production Kubernetes operations, multi-node availability, or production SLAs.
- Disposable verification containers and the temporary Kubernetes review namespace were removed. The original kind cluster, original lab deployment, and cached images were retained. Full cluster deletion/recreation was not exercised.
- The base image uses a moving Node 22 tag; pinning an approved digest and scheduling deliberate updates would be a useful next reproducibility improvement. Helm remains deferred until multiple real configuration variants justify it.

## Resume bullets

Use wording you can explain and reproduce in an interview:

- Containerized a Next.js/TypeScript application with a multi-stage Docker build, non-root runtime, explicit public build-time configuration, and Firebase emulator isolation.
- Deployed PrizeCheck to a local Kubernetes cluster using kind, configuring a two-replica Deployment, ClusterIP Service, ConfigMap, health probes, and CPU/memory requests and limits.
- Verified pod replacement, rolling updates, failed-rollout behavior, and rollback; documented troubleshooting and repeatable local setup and cleanup procedures.
- Built and verified GitHub Actions automation for a Linux AMD64 container build and smoke checks alongside TypeScript, unit/API, Firebase rules and desktop/mobile browser tests.

Describe the project as **“PrizeCheck — production web app with a local Kubernetes learning environment.”** The production web app and local Kubernetes experience are separate claims. Successful push and PR runs support the CI claim; avoid implying long-term operational history or production Kubernetes experience.

## Interview demonstration

1. Explain why public Firebase variables are compiled into the image and why a runtime ConfigMap cannot change them.
2. Show `status`, the two ready pods, and the app through port-forward.
3. Run the smoke check and explain why it includes the card dataset, beyond a simple health endpoint.
4. Run the reliability script and explain the controller, ReplicaSet, readiness, surge, and rollback behavior.
5. Explain why a dropped port-forward is different from a failed Service, and why two pods on one node do not provide host-level availability.
6. Show the cost boundary, emulator isolation, CI changes, and cleanup commands.
