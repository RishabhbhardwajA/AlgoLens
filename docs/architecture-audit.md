# AlgoLens — Architecture Audit & Baseline Summary

> **Date:** October 2026 | **Author:** Senior Full-Stack Architect

---

## 1. Executive Summary & Baseline Status

AlgoLens is an interactive Data Structures and Algorithms learning and visual debugging platform. Before refactoring, the repository contained a mixed root structure where frontend React code and backend Express code shared a single root `package.json`.

### Baseline Verification Results
* **Frontend TypeScript & Vite Build**: Passed cleanly (`tsc && vite build` succeeded in 872ms, 0 errors).
* **Backend Unit & Integration Tests**: Passed cleanly (8 unit tests in `server/test-auth.ts` passing, 7 HTTP middleware & validation tests in `server/test-api.ts` passing).
* **Database State**: Persistent SQLite database located at `server/db/algolens.db` (80 KB) with active user records, bookmarks, progress, and custom snippets.

---

## 2. Component & System Inventory

| Layer | Technology | Current Implementation | Architectural Health |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React 19, Tailwind CSS v4, Lucide Icons, Framer Motion | Pages in `src/pages/`, UI components in `src/components/`, layout in `src/App.tsx`. | **Good**: High visual polish, clean component structure. Needs cleaner feature grouping. |
| **Code Editor** | Monaco Editor (`@monaco-editor/react`) | Integrated for read-only visualization in `CodeEditorPanel.tsx`. | **Good**: Supports multi-language syntax highlighting. Needs to be shared with Playground. |
| **Execution Engine** | TypeScript, Zustand 5 | `stepBuilder.ts`, `useExecutionController.ts`, `executionTypes.ts`. Generates discrete timeline of `ExecutionStep` events. | **Strong**: Fluent API, pure deterministic step generator. Needs explicit state diffing. |
| **Visualizers** | React DOM, SVG, ReactFlow 11 | `ArrayVisualizer`, `TreeVisualizer`, `LinkedListVisualizer`, `GridVisualizer`. | **Good**: 22 algorithms functional. Needs 2D matrix mode for DP. |
| **Backend API** | Node.js v22, Express v5, TypeScript (`tsx`) | `server/index.ts`, `server/routes/authRoutes.ts`, `server/routes/userRoutes.ts`. | **Functional**: Handled auth, validation, and rate limiting, but lacked layered architecture (controllers, services, repositories). |
| **Database** | Node built-in `node:sqlite` (`DatabaseSync`) | `server/db/database.ts` with WAL mode & foreign keys. Schema: `users`, `user_bookmarks`, `user_progress`, `saved_snippets`, `password_resets`. | **Robust**: Zero external daemon dependency, persistent, ultra-fast. |
| **Authentication**| Passport.js, `passport-jwt`, `passport-local`, bcryptjs | Local strategy + Bearer JWT tokens (7-day validity). | **Secure**: OWASP-compliant headers, rate-limiting, and validation middlewares active. |

---

## 3. Key Execution & Data Flow

```text
[User Selects Algorithm / Enters Code]
               │
               ▼
   [Algorithm.execute(input)]
               │ (Uses StepBuilder)
               ▼
      [Array of ExecutionStep]
   ├── line: number
   ├── event: COMPARE | SWAP | POINTER | etc.
   ├── variables: { left, right, mid, ... }
   ├── callStack: Frame[]
   └── visualizationState: (Array / Tree / List)
               │
               ▼
    [useExecutionStore (Zustand)]
   ├── currentStepIndex
   ├── isPlaying / playbackSpeed
   └── navigation dispatchers (next, prev, jump)
               │
               ▼
[Synchronized UI Presentation]
   ├── Monaco Editor (deltaDecorations highlight current line)
   ├── Visualizer Canvas (Animates pointers & bar heights)
   ├── Variables Panel (Inspects active state values)
   └── Explanation Copilot (Step commentary)
```

---

## 4. Deficiencies & Refactoring Strategy

1. **Monolithic Directory Structure**:
   - Frontend and backend co-located in root folder with overlapping dependencies in root `package.json`.
   - *Refactoring Action*: Separate cleanly into `frontend/` and `backend/` with dedicated `package.json` files and root workspace scripts.
2. **Backend Architecture Layering**:
   - Routes currently contain route handlers and data access directly.
   - *Refactoring Action*: Introduce standard clean architecture:
     - `backend/src/routes/` (Route declarations & middleware attachment)
     - `backend/src/controllers/` (Request/response parsing & HTTP status codes)
     - `backend/src/services/` (Business logic)
     - `backend/src/repositories/` (Database queries & prepared statements)
3. **Execution State Diffing**:
   - The Variables panel displayed raw key-value pairs without highlighting what specifically mutated between step $N-1$ and step $N$.
   - *Action*: Implement explicit variable diffing (`oldValue -> newValue`) with visual emphasis.
4. **Structured Step Explanations**:
   - Explanations previously relied on single description strings.
   - *Action*: Structure explanations into: (1) What happened, (2) Why it happened, (3) Invariant maintained.
5. **Interactive Bug-Finding Mode**:
   - No interactive playground examples with deliberate bugs for learners to diagnose.
   - *Action*: Add interactive buggy templates (off-by-one boundary, inverted comparison) for Binary Search and Two Pointers with instant test runners.
6. **Guided Recursion-to-DP Lesson**:
   - Missing step-by-step bridge explaining how recursion builds into memoization and tabulation.
   - *Action*: Implement Climbing Stairs progressive lesson (Recursion -> Repeated subproblems -> Memoization -> DP Table).

---

## 5. Independent Verification & Hardening Pass (Post-Refactor)

### Critical Risk Resolutions

1. **JWT Secret Enforcement & Startup Validation (`backend/src/config/env.ts`)**:
   - In production mode (`NODE_ENV === "production"`), the application strictly requires a strong `JWT_SECRET` (>= 32 characters) that does NOT match any documented public example strings. Missing or placeholder keys cause immediate fatal server exit.
   - Verified via automated unit tests in `backend/tests/api.test.ts`.

2. **Custom-Code Execution & Web Worker Boundary (`frontend/src/engine/customCodeWorker.ts`)**:
   - Playground user-provided code is executed off the main thread inside a dedicated Web Worker (`customCodeWorker.ts`) with a strict 2500ms timeout.
   - If user code enters an infinite loop (e.g. `while(true){}`), the worker is automatically terminated via `worker.terminate()`, preventing UI thread freezes.
   - **Documented Boundary**: Client-side Web Workers provide UI responsiveness and isolation against accidental infinite loops. They are NOT a kernel-level security sandbox against browser DOM side-effects if unrestricted APIs are invoked. No custom user code executes in the Express backend process.

3. **SQLite Database Persistence (`backend/src/database/database.ts`)**:
   - The persistent SQLite database is located at `backend/data/algolens.db` (and backed up at `backend/data/algolens.db.backup`).
   - Resolves reliably via `path.resolve(__dirname, "../../data/algolens.db")` across both development (`tsx`) and production (`dist/`), ensuring restarts and builds never overwrite or recreate an empty database.
   - `.gitignore` ignores all live `.db`, `.db-wal`, `.db-shm`, and `.db.backup` files to prevent committing sensitive user data.

4. **Dynamic Source-Line Synchronization (`frontend/src/utils/sourceLineMapper.ts`)**:
   - Execution step line numbers are dynamically resolved against source code statements using `resolveSourceLine(sourceCode, pattern, fallback)` and `getAlgorithmSource()`.
   - Verified via regression test `frontend/tests/sourceLineSync.test.ts`: when comments, docstrings, or blank lines are inserted, step line highlights automatically shift to maintain exact alignment with the executing statement in Monaco.

5. **Production Deployment & SPA Fallback (`backend/src/app.ts`)**:
   - Express detects compiled frontend assets in `frontend/dist`.
   - Serves static assets via `express.static` and provides an SPA fallback middleware for client-side routing, while strictly reserving `/api/*` for REST endpoints.
   - Compatible with Express 5 middleware routing.

