# Vessel & Voyage Operations Control System — Frontend Scaffold

This directory houses the frontend web application of the **Vessel & Voyage Operations Control System** modular monolith.

---

## 🚀 How to Boot

### Prerequisites
Ensure Node.js v22+ and `pnpm` are installed.

### Development Boot
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Run the development server (runs on port `5173` per D-14):
   ```bash
   pnpm run dev
   ```
4. Access the scaffold landing page at `http://localhost:5173`. Port parity proxy `/api` will route calls to the backend on `localhost:8000`.

### Production Build
Validate production bundling via:
```bash
pnpm run build
```
Assets compile under the `dist/` directory.

---

## 🛠️ How to Regenerate Types

End-to-end type safety across the network boundary is enforced using our OpenAPI schema generation pipeline. If backend models or DTO contract attributes change, regenerate the client types:

1. Ensure the backend FastAPI server has generated the latest OpenAPI schema (saved at `openapi/openapi.json`).
2. Run the codegen script:
   ```bash
   pnpm run codegen
   ```
   This triggers `openapi-typescript` to read `../openapi/openapi.json` and compile TypeScript interfaces directly into [src/api/schema.ts](file:///Users/theprince/Documents/LT%20DIMMARE/Product/ERP_Operations/frontend/src/api/schema.ts).
3. Verify compilation:
   ```bash
   pnpm run typecheck
   ```
   If backend contract breaks exist, the frontend compilation will immediately fail.

---

## 🧭 Routing Approach Rationale

We have selected **Code-Based Routing** (via TanStack Router manual route tree mapping) for the application.

### Why Code-Based Routing?
1. **Scaffold Simplicity**: Avoids the filesystem compiler overhead, keeping the project structure thin and readable with zero features.
2. **Explicit Dependency Tree**: Declaring routing layers explicitly in code allows developers to trace route definitions easily.
3. **No magic**: Easier compilation and lint validation inside testing setups.

---

## ❄️ Feature Page Freeze Contract

> [!WARNING]
> **Hard Scope Boundary**: Zero feature pages.
> The current milestone is strictly a project shell and foundation scaffold. **No real feature screens or voyage modules may be introduced in this milestone.**
> Block 4 holds the mandate for building the first real UI pages (Vessel Schedule & Gantt chart).

---

## 📐 Folder Structure & Boundaries

Architectural boundaries are strictly enforced via ESLint rules in [.eslintrc.cjs](file:///Users/theprince/Documents/LT%20DIMMARE/Product/ERP_Operations/frontend/.eslintrc.cjs):

```
src/
├── api/             # Generated OpenAPI schema + typed fetch client wrapper
├── auth/            # AuthContext and RequireAuth route guards
├── lib/             # Sensible defaults (queryClient, ErrorBoundary)
├── routes/          # Route tree definitions
├── components/      # (Future) Reusable global visual components
└── modules/         # (Future) Isolated domain features (Gantt, PortCall, delays, etc.)
```

### Boundary Import Restrictions:
- Reusable `components` can only import from utility contexts (`lib`, `auth`, `api`).
- Domain `modules` cannot import from other domain modules (maintaining absolute modular boundary parity with the Python monolith).
- Modules cannot import from the `routes` directory (routing binds modules, modules do not bind routing).
