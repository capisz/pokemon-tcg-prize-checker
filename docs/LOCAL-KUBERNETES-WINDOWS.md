# PrizeCheck on Windows with WSL 2

This guide records the Windows lab verified by the user on September 11, 2026 and provides a repeatable setup. Production remains on Vercel; Firebase remains on Spark without billing. Use only the image's compiled `demo-prizecheck` emulator configuration. Guest practice needs no emulator. See [architecture and configuration](LOCAL-KUBERNETES.md) and [evidence and limits](LOCAL-KUBERNETES-RESULTS.md).

## Choose the right terminal

Run one command at a time. `PS C:\...>` means PowerShell; `chris@DESKTOP...$` means Ubuntu, even when they share a terminal window. From PowerShell, enter the installed distro:

```powershell
wsl -d Ubuntu
```

All subsequent shell commands here run in Ubuntu from the repository root. A Windows `C:\Users\...` folder is available under `/mnt/c/Users/...`; quote paths containing spaces. Use your actual checkout path, inspect `git status`, and preserve changes before syncing. Do not import the old bundle: infrastructure is already in `main` at `1446828`.

`sudo` asks for the Linux password, not the Windows PIN; typing is invisible. This setup uses sudo for Docker and a root-owned kubeconfig. It does not require adding the user to the Docker group. The application inside the image still runs as UID/GID 1000.

## Prerequisites and installation

Verified PC: Windows 10 Home 22H2, WSL 2 Ubuntu 26.04 LTS, AMD64, Docker Engine 29.8.0, kind 0.32.0, kubectl 1.36.4, Kubernetes 1.36.1. These are recorded versions, not a requirement to downgrade another working installation. Recheck disk space with `df -h` before downloading images; builds and the Playwright test image consume additional space.

Inspect WSL in PowerShell with `wsl --list --verbose`. If missing, follow [Microsoft's WSL installation guide](https://learn.microsoft.com/en-us/windows/wsl/install), including its Windows prerequisites and restart. Use the distro names actually returned by `wsl --list --online`; the older installer on the verified PC rejected `Ubuntu-24.04` but accepted `Ubuntu`.

Inside Ubuntu, install Docker Engine through [Docker's official Ubuntu apt instructions](https://docs.docker.com/engine/install/ubuntu/), checking the supported Ubuntu release first. The lab used `docker-ce`, `docker-ce-cli`, `containerd.io` and `docker-buildx-plugin`. Compose is not needed. Docker Engine is Apache-2.0 licensed; this route used no Docker Desktop subscription or cloud billing. Inspect existing installations before replacing packages. Installation requires local administrator/sudo authorization.

Install Linux binaries for your architecture using the [kind quick start](https://kind.sigs.k8s.io/docs/user/quick-start/) and [kubectl Linux guide](https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/); verify published checksums before installing. The PC used `/usr/local/bin`. Match the kind node to a supported [kind release](https://github.com/kubernetes-sigs/kind/releases/tag/v0.32.0) and observe [kubectl version skew](https://kubernetes.io/releases/version-skew-policy/); this lab's client and server share minor 1.36.

Verify the environment before creating anything:

```bash
sudo docker version
sudo docker buildx version
sudo docker context show
sudo docker ps -a
sudo kind get clusters
kubectl version --client
```

Use the local Docker Engine (`default` on the verified PC), not a remote daemon or the Mac's Colima context. If Docker is unavailable, inspect its service using the official installation troubleshooting steps. Do not install a second runtime to conceal a configuration problem.

## Build and run the standalone app

From the repository root:

```bash
sudo docker buildx build --load -t prizecheck:local-v1 .
```

Inspect an existing container named `prizecheck-local` before reusing or replacing it. For a new container:

```bash
sudo docker run -d --name prizecheck-local -p 127.0.0.1:3100:3000 prizecheck:local-v1
```

```bash
sudo docker exec prizecheck-local id
sudo docker inspect prizecheck-local --format '{{.State.Health.Status}}'
```

Wait for healthy, then open http://localhost:3100 in Windows. A health response alone does not verify card data or account flows; run the isolated harness below for broader coverage. No host Node or Java installation is needed for that harness.

## Start or reuse the local cluster

If `prizecheck` already exists, inspect it and skip creation. For a new lab:

```bash
sudo kind create cluster --name prizecheck --config deploy/kind.yaml --image kindest/node:v1.36.1@sha256:3489c7674813ba5d8b1a9977baea8a6e553784dab7b84759d1014dbd78f7ebd5 --kubeconfig /var/tmp/prizecheck-kubeconfig --wait 120s
```

For an existing cluster whose lab kubeconfig is missing, regenerate only that file:

```bash
sudo kind export kubeconfig --name prizecheck --kubeconfig /var/tmp/prizecheck-kubeconfig
```

Define this helper in each new Ubuntu terminal. It always names the local context and namespace:

```bash
k() { sudo kubectl --kubeconfig /var/tmp/prizecheck-kubeconfig --context kind-prizecheck -n prizecheck-local "$@"; }
```

```bash
sudo kind load docker-image prizecheck:local-v1 --name prizecheck
k apply -f deploy/local.yaml
k rollout status deployment/prizecheck --timeout=180s
k get deployments,pods,services
```

Applying the manifest restores the checked-in baseline; use scale/resume below if merely paused. Expect two ready replicas. Start browser access and leave this command running:

```bash
k port-forward --address 127.0.0.1 service/prizecheck 3200:3000
```

Open http://localhost:3200 in Windows and try guest practice. Ctrl-C stops forwarding, not the app. Pod replacement can disconnect forwarding because it selects one pod; restart the forward afterward. The process-health request below uses Service DNS from inside a pod, independently of forwarding:

```bash
k exec deployment/prizecheck -- node -e "fetch('http://prizecheck:3000/api/health').then(async r=>{console.log(r.status,await r.text());if(!r.ok)process.exit(1)}).catch(e=>{console.error(e);process.exit(1)})"
```

## Account tests and reliability practice

Run the account harness from the repository root:

```bash
sudo bash scripts/verify-container-accounts.sh prizecheck:local-v1
```

The harness builds its test image, checks non-root/demo-only app configuration, and sequentially runs checks, rules, smoke and browsers against private emulators. It needs internet for downloads but no Firebase login. Browser tests inside the private network do not make interactive accounts available in your Windows browser. Use guest practice there unless you deliberately set up host emulators as documented in the main guide. Runtime ConfigMap edits cannot alter compiled `NEXT_PUBLIC_*` settings.

Save the printed report directory if needed; `/tmp` evidence is not durable. Disposable test containers are removed automatically; cached images and the separate lab remain.

The existing reliability script already includes rollback safeguards. To use it with this PC's kubeconfig, first inspect that it targets `kind-prizecheck`, then pass the kubeconfig explicitly:

```bash
sudo env KUBECONFIG=/var/tmp/prizecheck-kubeconfig bash scripts/verify-local-k8s.sh
```

This invocation is a documentation adaptation, not a newly verified Windows execution. The recorded PC session performed the exercises manually. The script deletes one app pod, changes the pod template, tests a missing image, and attempts rollback to the recorded working revision. Inspect `k get pods` and `k rollout history deployment/prizecheck` after any interruption; use `k rollout undo deployment/prizecheck --to-revision=NUMBER` only with the actual recorded working revision. Wait with `k rollout status deployment/prizecheck --timeout=180s`. Undo restores the pod template, not database data.

Two replicas on one node demonstrate controller recovery. They do not survive loss of the PC, WSL or node. A successful Service request during failure does not establish continuously measured zero downtime.

## Pause, resume and cleanup

Each command affects this named lab only. Define `k` above first.

Pause Kubernetes app, retaining cluster:

```bash
k scale deployment/prizecheck --replicas=0
```

Resume:

```bash
k scale deployment/prizecheck --replicas=2
k rollout status deployment/prizecheck --timeout=180s
```

Stop or restart the independent Docker app:

```bash
sudo docker stop prizecheck-local
sudo docker start prizecheck-local
```

Optional deletion of this lab (not needed to pause):

```bash
sudo kind delete cluster --name prizecheck
sudo docker rm -f prizecheck-local
```

Cached images and the lab kubeconfig file remain. Do not globally prune Docker, delete other clusters or unregister Ubuntu as routine cleanup. Stopping all WSL can affect other work. No cloud cleanup is needed.

## Troubleshooting

- `invalid option` near `pipefail`, or `$'\r'` errors: inspect `git ls-files --eol 'scripts/*.sh'`. The repository's `*.sh text eol=lf` attribute keeps future Git checkouts in LF even with Windows `core.autocrlf=true`. Existing modified files may retain CRLF: preserve edits and use the editor's LF setting on only the affected script. Do not reset the checkout or renormalize unrelated files. See [Git attributes](https://git-scm.com/docs/gitattributes).
- Docker socket or kubeconfig permission error: use the sudo commands and explicit kubeconfig above. Do not blindly reuse Mac helpers or change global Docker/kubectl contexts.
- `ErrImageNeverPull`: inspect the Deployment image and load the matching image into this kind cluster. During the failure exercise, this error is intentional; restore the recorded working revision.
- Port 3100/3200 occupied: inspect the existing app or forward before starting another. Do not expose ports on `0.0.0.0` to fix localhost access.
- Agent reports `Wsl/Service/E_ACCESSDENIED` but Ubuntu works interactively: the recorded workaround was for the user to run commands in Ubuntu, one at a time. Do not bypass agent permissions or reinstall a working WSL environment.

## Review and publication boundary

This guide and LF attribute do not alter UI, Firebase rules/client, tests, or hosting configuration. `vercel.json` disables Git deployments for `prizecheck/local-infrastructure` and this review branch, `prizecheck/windows-wsl-docs`. Other branches retain their default behavior, including production hosting from `main`. Check this configuration before publishing future branches.
