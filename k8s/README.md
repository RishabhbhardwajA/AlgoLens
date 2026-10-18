# AlgoLens — Kubernetes Deployment Guide

This directory contains the production-ready Kubernetes manifests for deploying **AlgoLens** using Kustomize.

---

## 1. Kubernetes Architecture Overview

AlgoLens is deployed as a single-replica, containerized service running both the Express API and the Vite single-page application (SPA).

```text
               Kubernetes Cluster (Namespace: algolens)
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   [ Developer / Ingress / Port-Forward (localhost:5000) ]               │
│                                 │                                       │
│                                 ▼                                       │
│                    [Service: algolens-service]                          │
│                      (ClusterIP, Port 5000)                             │
│                                 │                                       │
│                                 ▼                                       │
│                 [Deployment: algolens-deployment]                       │
│                        (Replicas: 1)                                    │
│       ┌─────────────────────────────────────────────────┐               │
│       │ Pod: algolens-xxxx                              │               │
│       │                                                 │               │
│       │  • Non-root user (UID 1000)                     │               │
│       │  • Capabilities: ALL dropped                    │               │
│       │  • Seccomp profile: RuntimeDefault              │               │
│       │  • readOnlyRootFilesystem: true                 │               │
│       │                                                 │               │
│       │  Mounts:                                        │               │
│       │   ├── /tmp (emptyDir)                           │               │
│       │   └── /data ───────► [PVC: algolens-data-pvc]   │               │
│       │                           │ (1Gi ReadWriteOnce) │               │
│       │                           ▼                     │               │
│       │                  algolens.db (SQLite)           │               │
│       └─────────────────────────────────────────────────┘               │
│                                                                         │
│   [ConfigMap: algolens-config]        [Secret: algolens-secrets]        │
│   (NODE_ENV, PORT, DATABASE_PATH)     (JWT_SECRET - injected at runtime)│
└─────────────────────────────────────────────────────────────────────────┘
```

### The Single-Replica Constraint (SQLite)
> [!IMPORTANT]
> **Why `replicas: 1`?**
> AlgoLens uses embedded SQLite (`node:sqlite`) with Write-Ahead Logging (WAL). SQLite relies on OS-level file advisory locks and cannot coordinate concurrent write transactions across multiple Pods simultaneously mounting the same storage volume. Scaling horizontally beyond 1 replica requires migrating to a networked client-server database (e.g. PostgreSQL or MySQL).

---

## 2. Directory Structure

```text
k8s/
├── base/
│   ├── namespace.yaml      # Creates 'algolens' isolated namespace
│   ├── configmap.yaml      # Non-sensitive configuration (PORT, NODE_ENV, DATABASE_PATH)
│   ├── pvc.yaml            # PersistentVolumeClaim for SQLite storage (ReadWriteOnce)
│   ├── deployment.yaml     # Hardened Pod deployment with health probes & non-root user
│   ├── service.yaml        # ClusterIP service exposing port 5000
│   └── kustomization.yaml  # Aggregates resources and manages image tags
└── README.md
```

---

## 3. Step-by-Step Deployment Instructions

### Prerequisites
- `kubectl` v1.28+
- A running Kubernetes cluster (e.g., [Minikube](https://minikube.sigs.k8s.io/) or [kind](https://kind.sigs.k8s.io/))
- Locally built Docker image `algolens:local`

### Step 1: Start your local cluster
```bash
# Option A: Using Minikube
minikube start

# Option B: Using kind
kind create cluster --name algolens-cluster
```

### Step 2: Load the Docker image into the cluster
Since `algolens:local` is built on your host machine, load it directly into your local cluster node so Kubernetes can pull it without an external registry:

```bash
# Build the image locally
docker build -t algolens:local .

# If using Minikube:
minikube image load algolens:local

# If using kind:
kind load docker-image algolens:local --name algolens-cluster
```

### Step 3: Create the namespace and Secret
Kubernetes Secrets must never be stored in source control. Generate a cryptographically random secret and create the secret object imperatively:

```bash
# 1. Create the namespace
kubectl apply -f k8s/base/namespace.yaml

# 2. Generate a secure 48-byte base64 JWT secret and create the secret
JWT_SECRET=$(openssl rand -base64 48)

kubectl create secret generic algolens-secrets \
  --namespace algolens \
  --from-literal=JWT_SECRET="${JWT_SECRET}"
```

> [!CAUTION]
> Kubernetes Secrets are base64-encoded by default and not encrypted at rest unless your cluster has an active EncryptionConfiguration (e.g. KMS provider). Restrict access using RBAC.

### Step 4: Apply the manifests with Kustomize
```bash
# Dry-run validation to preview the generated resources
kubectl apply --dry-run=client -k k8s/base

# Apply to cluster
kubectl apply -k k8s/base
```

### Step 5: Verify rollout status
```bash
# Check rollout progress
kubectl rollout status deployment/algolens-deployment -n algolens

# Verify all objects
kubectl get all,pvc -n algolens
```

Expected output:
```text
NAME                                      READY   STATUS    RESTARTS   AGE
pod/algolens-deployment-xxxx-yyyy         1/1     Running   0          30s

NAME                              TYPE        CLUSTER-IP       PORT(S)    AGE
service/algolens-service          ClusterIP   10.96.120.45     5000/TCP   30s

NAME                                 STATUS   VOLUME         CAPACITY   ACCESS MODES   AGE
persistentvolumeclaim/algolens-data  Bound    pvc-1234abcd   1Gi        RWO            30s
```

---

## 4. Accessing the Application

Since the Service type is `ClusterIP` (internal only), forward a local port to access the application:

```bash
kubectl port-forward service/algolens-service 5000:5000 -n algolens
```

Open your browser to:
- Frontend UI: `http://localhost:5000`
- API Health Check: `http://localhost:5000/api/health`

---

## 5. Operations & Troubleshooting

### Viewing Logs
```bash
# Stream logs from the application pod
kubectl logs -l app.kubernetes.io/name=algolens -n algolens -f
```

### Troubleshooting Failing Probes
If a pod shows `CrashLoopBackOff` or `Unhealthy`:
```bash
# Inspect pod events and failure reasons
kubectl describe pod -l app.kubernetes.io/name=algolens -n algolens
```
Common causes:
1. `algolens-secrets` is missing or does not contain `JWT_SECRET`.
2. `JWT_SECRET` is shorter than 32 characters or uses an example string (server fails startup validation).
3. The PVC is not bound (check `kubectl get pvc -n algolens`).

### Rolling Back a Deployment
If an updated image contains a regression:
```bash
# View rollout history
kubectl rollout history deployment/algolens-deployment -n algolens

# Undo the rollout to the previous revision
kubectl rollout undo deployment/algolens-deployment -n algolens
```

### SQLite Database Backup and Restore
```bash
# Backup: Copy the database file from the running pod to your host machine
POD_NAME=$(kubectl get pods -n algolens -l app.kubernetes.io/name=algolens -o jsonpath="{.items[0].metadata.name}")

kubectl exec -n algolens "${POD_NAME}" -- sqlite3 /data/algolens.db ".backup '/tmp/backup.db'"
kubectl cp "algolens/${POD_NAME}:/tmp/backup.db" ./algolens-k8s-backup.db

# Restore: Copy a verified backup into the PVC and trigger graceful restart
kubectl cp ./algolens-k8s-backup.db "algolens/${POD_NAME}:/data/algolens.db"
kubectl rollout restart deployment/algolens-deployment -n algolens
```
