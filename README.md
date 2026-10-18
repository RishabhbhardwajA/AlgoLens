# AlgoLens — Interactive DSA Learning & Visual Debugging Platform

AlgoLens is an interactive Data Structures & Algorithms (DSA) learning and execution-debugging platform designed for computer science students, competitive programmers, and technical interview candidates.

Unlike conventional code visualizers that merely render static animations, AlgoLens synchronizes source code line-by-line with AST graph animations, deterministic variable state transitions (`oldValue → newValue`), structured educational explanations (*What*, *Why*, and *Invariant*), predict-the-next-step quizzes, and an interactive Bug Lab for inspecting classic boundary mistakes.

---

## 1. Architecture & Directory Structure

AlgoLens is organized into a clean, decoupled monorepo with dedicated `frontend/` and `backend/` packages:

```text
algolens/
├── frontend/                     # React 19 + TypeScript + Vite + Tailwind CSS v4
│   ├── public/                   # Static icons and assets
│   ├── src/
│   │   ├── algorithms/           # 23 Implemented Algorithms across 7 categories
│   │   │   ├── arrays/           # Binary Search, Linear Search
│   │   │   ├── twoPointer/       # Two Sum II, Reverse String, Move Zeroes, etc.
│   │   │   ├── sorting/          # Bubble, Insertion, Merge Sort
│   │   │   ├── trees/            # BST Search, Traversals, Invert Tree, Height
│   │   │   ├── recursion/        # Fibonacci, Factorial
│   │   │   ├── dp/               # Climbing Stairs (Guided Recursion-to-DP lesson)
│   │   │   ├── linkedList/       # Reverse Linked List, Floyd's Cycle Detection
│   │   │   ├── graphs/           # BFS Graph Traversal
│   │   │   └── registry.ts       # Algorithm lookup registry
│   │   ├── components/           # Reusable UI & Panel Components
│   │   │   ├── CodeEditor/       # Monaco Editor with dynamic line highlight
│   │   │   ├── VariablesPanel/   # Reactive state transitions (old -> new diffing)
│   │   │   ├── ExplanationPanel/ # 3-Part Structured Explanations + Interview Mentor
│   │   │   ├── ExecutionControls/# Playback controls, scrubber, speed & audio
│   │   │   ├── ChallengeMode/    # Predict-the-next-step quiz modal
│   │   │   └── ...
│   │   ├── features/
│   │   │   └── debugging/        # Bug Lab deliberate mistake catalog & inspector
│   │   ├── engine/               # Pure Execution Controller & Step Engine
│   │   │   ├── executionTypes.ts # Discriminated union events & step types
│   │   │   ├── stepBuilder.ts    # Fluent step builder API
│   │   │   ├── useExecutionController.ts # Zustand controller store
│   │   │   └── audioEngine.ts    # Web Audio synthesis for step chimes
│   │   ├── pages/                # Visualizer, Explorer, Playground, Auth pages
│   │   ├── utils/                # Challenge generator, structured explanations
│   │   ├── App.tsx & main.tsx    # App root and router setup
│   │   └── index.css             # Tailwind v4 theme & utility tokens
│   ├── tests/                    # Frontend test suites (Engine, Algos, Predictions)
│   │   ├── executionEngine.test.ts
│   │   ├── algorithms.test.ts
│   │   └── predictionsAndBugs.test.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/                      # Node.js + Express 5 + SQLite + Passport.js
│   ├── data/                     # Persistent storage outside src/ and dist/
│   │   ├── algolens.db           # Persistent production/dev SQLite database
│   │   └── algolens.db.backup    # Verified data backup
│   ├── src/
│   │   ├── config/               # Environment & JWT secret configuration
│   │   ├── database/             # SQLite connection (node:sqlite) & schema
│   │   ├── repositories/         # Parameterized SQL query repositories
│   │   ├── services/             # Business logic (auth, bookmarks, progress)
│   │   ├── controllers/          # Request handlers
│   │   ├── middleware/           # Passport JWT auth, validation, logging, OWASP
│   │   ├── validators/           # Strict payload validation rules
│   │   ├── routes/               # Modular Express routers (/api/auth, /api/user)
│   │   ├── app.ts                # Express application factory & middleware chain
│   │   └── server.ts             # Server entrypoint
│   ├── tests/                    # Backend test suites (Auth, Repositories, HTTP API)
│   │   ├── auth.test.ts
│   │   └── api.test.ts
│   └── package.json
├── docs/
│   └── architecture-audit.md     # Baseline architecture audit and design decisions
├── .env.example                  # Environment variable template
├── .gitignore
├── package.json                  # Root npm workspaces orchestrator
└── README.md
```

---

## 2. Core Features & Capabilities

### A. Source-Code Synchronization
- Execution steps are explicitly mapped to source code line numbers in TypeScript.
- The Monaco Editor dynamically adds line decorations (`code-line-active` gutter markers) and scrolls the active line into viewport center.
- Stepping through algorithms highlights the exact line executing at each point in time.

### B. Deterministic Variable Diffing (`oldValue → newValue`)
- `VariablesPanel` deterministically compares `currentStep.localVariables` with `prevStep.localVariables`.
- Changed variables display an immediate visual transition: `oldValue → newValue` (e.g. `left: 0 → 4`).
- A top-level **State Delta** banner surfaces modified variables and links to the active source code line.

### C. 3-Part Structured Explanations
Every execution step provides a standardized breakdown:
1. **What happened?** (Concrete action: pointer moved, midpoint calculated, comparison evaluated).
2. **Why did it happen?** (Algorithmic reasoning: e.g. `arr[mid] < target` eliminates the entire left partition).
3. **Condition & Invariant:** (Guarantees maintained: e.g. target must reside in `[left, right]`).

### D. Predict-the-Next-Step Learning Mode
- Toggleable **Quiz Mode** interrupts execution at critical decision points:
  - Midpoint calculation: *"What will index mid become?"*
  - Branch selection: *"Which branch will execute next?"*
  - Pointer movement: *"Which pointer must move to adjust the candidate sum?"*
  - Loop termination: *"Will the loop continue or terminate?"*
- Answers provide immediate educational feedback and track score streaks without impeding normal playback when disabled.

### E. Bug Lab: Deliberate Mistakes Catalog
AlgoLens includes 4 classic student traps with known inputs, expected behavior, root cause analyses, and side-by-side corrected code:
1. **Binary Search Off-by-One:** `while (left < right)` skips the single-element boundary (known input `[2, 5, 8], target: 8` returning `-1`).
2. **Binary Search Infinite Loop:** `left = mid` freezes pointer when `right - left === 1`.
3. **Two Pointers Inverted Branch:** `sum < target` moves `right--` instead of `left++`.
4. **Two Pointers Missing Distinct Guard:** `while (left <= right)` pairs a single number with itself (`[1, 1]`).
- Learners can click **"Step Through Bug in Visualizer"** to observe the failure unfold step-by-step.

### F. Guided Recursion-to-DP Lesson (Climbing Stairs)
Teaches dynamic programming progressively across 5 conceptual stages:
1. Recurrence formulation: $ways(n) = ways(n-1) + ways(n-2)$.
2. Base cases and subproblem tree.
3. Memoization cache lookups avoiding redundant branches.
4. Tabulation: filling the 1D DP table bottom-up in $O(n)$ time.
5. Complexity contrast: $O(2^n)$ naive recursion vs $O(n)$ DP table.

---

## 3. Quick Start & Commands

### Prerequisites
- Node.js v20.x or v22.x (`node:sqlite` built-in)
- npm v10+

### Setup
```bash
# 1. Install all dependencies across frontend and backend workspaces
npm install

# 2. Copy environment variable template
cp .env.example .env
```

### Running in Development
```bash
# Run both frontend (port 5173) and backend (port 5000) concurrently
npm run dev

# Or run separately:
npm run dev:frontend   # Starts Vite dev server at http://localhost:5173
npm run dev:backend    # Starts Express API at http://localhost:5000
```

### Running Tests
```bash
# Run the complete test suite (both backend and frontend)
npm test

# Or run individually:
npm run test:backend   # 18 tests: auth, bcrypt, JWT, SQLite repos, validation, OWASP headers, wrong pass, tampered token, prod JWT reject
npm run test:frontend  # Tests execution engine, 23 algorithms, predictions, bug catalog, source-line sync regression
```

### Production Build & Deployment
```bash
# 1. Compiles both frontend (tsc + vite build) and backend (tsc)
npm run build

# 2. Start unified production server (serves API on /api/* and compiled frontend SPA)
npm start

# Or directly run compiled backend:
npm --prefix backend run start:prod
```

### Docker & Docker Compose
```bash
# Build production multi-stage image (includes automated test gate)
docker build -t algolens:local .

# Run container with persistent SQLite volume and healthcheck
docker compose up -d

# View live application logs
docker compose logs -f
```

### Kubernetes (Minikube / kind)
```bash
# Generate secret and deploy base manifests
kubectl create namespace algolens
kubectl create secret generic algolens-secrets -n algolens --from-literal=JWT_SECRET="$(openssl rand -base64 48)"
kubectl apply -k k8s/base

# Access via port-forwarding
kubectl port-forward svc/algolens-service 5000:5000 -n algolens
```
*For detailed architecture, backup/restore procedures, and troubleshooting, see [docs/deployment.md](docs/deployment.md) and [k8s/README.md](k8s/README.md).*

---

## 4. Environment Variables

Documented in `.env.example`:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Backend Express listening port | `5000` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` |
| `JWT_SECRET` | Secret key for signing and verifying JSON Web Tokens (min 32 chars, cannot be example key in prod) | Required in prod |
| `CLIENT_URL` | Frontend origin for CORS whitelist | `http://localhost:5173` |
| `DATABASE_PATH` | Optional custom SQLite file path | `backend/data/algolens.db` |

---

## 5. Security & Untrusted Code Execution Policy

- **No Server-Side Code Execution:** User-submitted algorithm code is strictly executed on the client and is never transmitted to or executed inside the Node.js Express server process.
- **Client-Side Web Worker Sandboxing:** Playground user code runs in a dedicated browser Web Worker (`customCodeWorker.ts`) with a strict 2500ms execution timeout. Infinite loops (e.g. `while(true){}`) trigger automatic worker termination (`worker.terminate()`), preventing the browser UI and main thread from freezing.
- **Security Boundary Documentation:** Web Workers provide thread isolation and responsiveness against computational lockups. They are not a browser sandbox against malicious web APIs if DOM access were allowed (which is absent in worker context).
- **Production Secret Enforcement:** In `production` mode, the backend halts immediately on startup if `JWT_SECRET` is missing, shorter than 32 characters, or matches any documented public example strings.
- **Backend Protection:** Express routes utilize OWASP security headers, CORS origin restrictions, express-rate-limit guards, input validation with express-validator, and parameterized SQLite queries with WAL mode to prevent SQL injection.
- **Password Safety:** User passwords are encrypted with bcrypt (12 salt rounds) and sensitive authentication credentials are never returned in API payloads or printed to server logs.
