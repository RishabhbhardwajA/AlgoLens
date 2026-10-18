# AlgoLens — Complete DevOps, Docker & Kubernetes Deployment Guide

> **Audience:** Computer Science Students, Full-Stack Engineers & DevOps Practitioners  
> **Repository:** AlgoLens Interactive DSA Platform  

---

## 1. System & Production Architecture

AlgoLens utilizes a unified, single-container production architecture. Rather than running separate frontend and backend servers behind an external reverse proxy, Node.js and Express serve both the authenticated REST API (`/api/*`) and the precompiled React single-page application (SPA) (`/*`).

```text
               User Browser (Desktop / Mobile)
                              │
                              ▼ Port 5000
    ┌─────────────────────────────────────────────────────┐
    │          Express 5 Web & API Server                 │
    │                                                     │
    │  ├── Security Middleware (OWASP, CSP, Rate-Limit)   │
    │  ├── /api/health    ──► Lightweight unauth probe    │
    │  ├── /api/auth/*    ──► Passport.js & JWT auth      │
    │  ├── /api/user/*    ──► Bookmarks, progress, profile│
    │  └── /*             ──► express.static(dist) + SPA  │
    └─────────────────────────┬───────────────────────────┘
                              │
                              ▼ Embedded DatabaseSync
    ┌─────────────────────────────────────────────────────┐
    │          SQLite Persistent Storage                  │
    │  Location: $DATABASE_PATH (/data/algolens.db)        │
    │  Mode: Write-Ahead Logging (PRAGMA journal_mode=WAL)│
    │  Foreign Keys: ON (Cascading integrity)             │
    └─────────────────────────────────────────────────────┘
```

---

## 2. DevOps Core Concepts (Student Mentor Guide)

To help you understand how modern cloud infrastructure works, here is how standard DevOps concepts map directly to this project:

| Concept | Industry Definition | Role in AlgoLens |
| :--- | :--- | :--- |
| **Image** | A read-only, immutable package containing code, runtime, system tools, and dependencies. | `algolens:local` — built using `Dockerfile`, containing Alpine Linux, Node 22, and compiled dist files. |
| **Container** | A running, isolated instance of an image sharing the host OS kernel. | `algolens-app` — the active running process hosting Express on port 5000. |
| **Pod** | The smallest deployable computing unit in Kubernetes, containing one or more containers. | `algolens-deployment-xxxx-yyyy` — holds the AlgoLens container, temporary volume, and storage mounts. |
| **Deployment** | A Kubernetes controller that declares desired state, replicas, rollout strategy, and updates. | `algolens-deployment` — maintains exactly 1 replica and manages rolling updates with zero downtime. |
| **Service** | A stable network abstraction (IP and DNS name) routing traffic to dynamic Pod IPs. | `algolens-service` — provides a stable `ClusterIP` pointing to port 5000 of matching AlgoLens pods. |
| **ConfigMap** | Stores non-sensitive configuration keys and values outside container images. | `algolens-config` — injects `PORT="5000"`, `NODE_ENV="production"`, and `DATABASE_PATH="/data/algolens.db"`. |
| **Secret** | Stores sensitive credentials (tokens, passwords) separately from configuration. | `algolens-secrets` — injects `JWT_SECRET` generated imperatively via `openssl rand -base64 48`. |
| **PersistentVolumeClaim (PVC)** | A request for persistent, durable disk storage that survives Pod restarts and deletions. | `algolens-data-pvc` — 1Gi storage volume mounted at `/data` where SQLite preserves user accounts. |
| **CI/CD Pipeline** | Automated sequence of validation, testing, building, and publishing triggered by code changes. | `.github/workflows/ci.yml` — runs `npm test`, builds images, scans vulnerabilities, and pushes to GHCR. |

---

## 3. Local Docker Workflow

### Prerequisites
- Docker Engine or Docker Desktop installed.

### 1. Build the Multi-Stage Production Image
The `Dockerfile` executes `npm test` as a build gate. If any test fails, image creation terminates immediately:
```bash
docker build -t algolens:local .
```

### 2. Configure Local Environment
Copy `.env.example` to create your local `.env` file and generate a secure JWT secret:
```bash
cp .env.example .env
```
Generate a 48-byte cryptographically random secret:
```bash
# On Linux / macOS / Git Bash:
openssl rand -base64 48

# On Windows PowerShell:
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```
Paste this into your `.env` file under `JWT_SECRET`.

### 3. Run with Docker Compose
```bash
# Start container in detached background mode
docker compose up -d

# Verify container status and health
docker compose ps

# Inspect real-time application logs
docker compose logs -f
```

### 4. Verify Database Persistence Across Restarts
To prove your SQLite database persists across container updates:
1. Open `http://localhost:5000` and register a new test user.
2. Stop and recreate the container:
   ```bash
   docker compose down
   docker compose up -d
   ```
3. Refresh `http://localhost:5000` and log in with your account. All bookmarks, progress, and accounts remain intact because the volume `algolens-sqlite-data` is external to the container filesystem.

---

## 4. Kubernetes Deployment Guide

### Architectural Scaling Rule (SQLite)
> [!IMPORTANT]
> **Single-Replica Deployment:** AlgoLens sets `replicas: 1` in `k8s/base/deployment.yaml`. SQLite operates on local file locks with WAL journal mode. If multiple pods simultaneously mount a shared ReadWriteMany network disk, concurrent writes cause database corruption (`SQLITE_BUSY` or locking faults). To scale horizontally, migrate the data layer to PostgreSQL or MySQL.

### 1. Start Local Cluster
```bash
# Minikube
minikube start

# Or kind
kind create cluster --name algolens
```

### 2. Load Local Image into Cluster
```bash
# If using Minikube:
minikube image load algolens:local

# If using kind:
kind load docker-image algolens:local --name algolens
```

### 3. Create Namespace & Imperative Secret
Never commit secret values to Git:
```bash
# 1. Create namespace
kubectl apply -f k8s/base/namespace.yaml

# 2. Inject real random secret
kubectl create secret generic algolens-secrets \
  --namespace algolens \
  --from-literal=JWT_SECRET="$(openssl rand -base64 48)"
```

### 4. Deploy Manifests using Kustomize
```bash
# Validate manifests via dry-run
kubectl apply --dry-run=client -k k8s/base

# Deploy to cluster
kubectl apply -k k8s/base
```

### 5. Access the Application via Port-Forwarding
```bash
kubectl port-forward service/algolens-service 5000:5000 -n algolens
```
Open `http://localhost:5000`.

### 6. Inspecting Health Probes
AlgoLens defines three health probes in `deployment.yaml`:
- **`startupProbe`**: Gives Node.js up to 30 seconds to boot before checking readiness.
- **`readinessProbe`**: Determines when the pod is ready to accept HTTP traffic from the Service.
- **`livenessProbe`**: Restarts the pod if the process deadlocks or terminates unexpectedly.

Check probe status:
```bash
kubectl describe pod -l app.kubernetes.io/name=algolens -n algolens
```

---

## 5. Security & Sandbox Boundary Documentation

AlgoLens implements a multi-layered defense-in-depth model:

### 1. Production JWT Enforcement
- Startup validation in `backend/src/config/env.ts` enforces that when `NODE_ENV === "production"`, `JWT_SECRET` must be set, must not match documented public examples, and must be at least 32 characters long.
- Missing or weak secrets trigger immediate fatal exit (`process.exit(1)`).

### 2. Custom-Code Worker Thread Isolation
- Untrusted user code executed in the Playground is evaluated inside a dedicated Web Worker (`customCodeWorker.ts`).
- **Watchdog Timeout:** A 2,500ms timer runs on the main thread. If user code contains an infinite loop (e.g. `while(true){}`), `worker.terminate()` destroys the worker thread, preventing UI lockups.
- **Network API Lockdown:** In the worker global scope, `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, and `importScripts` are overridden to throw explicit security violation errors.
- **Scope Shadowing:** `new Function()` parameters shadow `window`, `document`, `localStorage`, and `sessionStorage` as `undefined`.

### 3. Content Security Policy (CSP)
- HTTP response headers set a strict policy:
  `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src 'self' blob:; connect-src 'self' http://localhost:5000 http://127.0.0.1:5000;`
- Outbound requests to external domains (e.g. `https://evil.com`) are blocked by the browser network layer before leaving the client.

### 4. Security Boundary Notice
> [!NOTE]
> Client-side Web Workers provide **thread isolation and computational timeout protection** against accidental infinite loops. They are not a hardware-isolated kernel sandbox. User code never executes on the Express server process.

---

## 6. Backup & Disaster Recovery

### Creating a Safe SQLite Backup
Because SQLite operates with Write-Ahead Logging (`WAL`), copying `algolens.db` directly while active can miss un-checkpointed WAL frames. Use SQLite's online backup API:

```bash
# Docker Compose:
docker compose exec algolens node -e "
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync('/app/backend/data/algolens.db');
  db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  console.log('WAL flushed.');
"
docker cp algolens-app:/app/backend/data/algolens.db ./backup-$(date +%Y%m%d).db

# Kubernetes:
POD=$(kubectl get pod -n algolens -l app.kubernetes.io/name=algolens -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n algolens $POD -- node -e "
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync('/data/algolens.db');
  db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
"
kubectl cp algolens/$POD:/data/algolens.db ./backup-$(date +%Y%m%d).db
```

### Restoring from Backup
```bash
# Docker Compose:
docker compose down
docker cp ./backup-20261018.db algolens-app:/app/backend/data/algolens.db
docker compose up -d

# Kubernetes:
kubectl cp ./backup-20261018.db algolens/$POD:/data/algolens.db
kubectl rollout restart deployment/algolens-deployment -n algolens
```
