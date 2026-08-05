# Investment Platform — Core Ledger MVP

A double-entry accounting core for an investment platform: KYC-stubbed investor onboarding, a wallet that is purely a *view* over the ledger, investment lifecycle with repayment schedules, and a mandatory GL ↔ investor sub-ledger reconciliation control.

Built with NestJS + TypeScript + Prisma + PostgreSQL.

## Non-negotiable design principle

**The wallet is a view of the ledger, not the ledger itself.** No balance is ever stored and mutated directly — every figure the API returns is derived live from posted `wallet_transactions` / `journal_lines`, or written only inside the same DB transaction as the journal entry that caused it.

## What's in this slice

- Double-entry ledger engine (`src/ledger`) — the only code path allowed to write `journal_lines`; rejects any journal where debit ≠ credit.
- Chart of accounts, investors (KYC/AML stubbed as auto-verified — see comment in `investors.service.ts`), wallet projection, investment products/opportunities/companies, investments with generated repayment schedules (monthly/quarterly/bullet).
- Deposit / investment / ROI accrual+receipt / principal repayment / withdrawal flows, each posting balanced journals.
- Withdrawal maker-checker workflow (request → approve → complete), enforcing approver ≠ requester.
- GL ↔ investor sub-ledger reconciliation (`src/reconciliation`) — independently recomputes each control account's balance from business tables and compares it to the ledger; never auto-corrects, only raises exceptions.
- JWT auth + role-based guards for the 7 roles from the blueprint.
- Audit log on every journal post and sensitive action.

**Out of scope for this slice** (stubbed at the schema/status-field level): real KYC/AML vendor integration, payment gateway integration, PDF/Excel report exports, MFA/OTP.

## Running it

Requires Node.js 20+ and PostgreSQL 16 (via Docker, or any local Postgres — adjust `DATABASE_URL`).

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

No Docker available? `npm run db:dev` boots a self-contained Postgres (via `embedded-postgres`) on disk under `.local-db/dev`, using the same credentials as `docker-compose.yml`.

Seeded users (password `ChangeMe123!` for all non-investor roles): `admin@example.com`, `manager@example.com`, `finance@example.com`, `compliance@example.com`, `approver@example.com`, `superadmin@example.com`. A demo investor (`investor.demo@example.com`) and a demo BULLET-12M product/opportunity are also seeded.

## Tests

```bash
npm test              # unit tests — ledger balance/maker-checker validation
npm run db:test       # in a separate terminal, if not using Docker
npm run test:e2e      # full deposit -> invest -> ROI -> repayment -> withdrawal scenario,
                       # reproducing the blueprint's worked example (final balance 7,600),
                       # plus idempotency, maker-checker, and reconciliation checks
```

The e2e suite auto-applies migrations and re-seeds the test database (`.env.test`, port 5433) on every run.

## API surface

`/auth`, `/investors` (+ `/investors/me`), `/accounts`, `/wallets/:investorId/{position,transactions}`, `/investment-companies`, `/investment-products`, `/investment-opportunities`, `/investments`, `/repayment-schedules/:id/accrue-roi`, `/repayments`, `/deposits`, `/withdrawals`, `/reconciliation`, `/reports/summary`.

All financial-write endpoints require a JWT and role check — nothing lets a client mutate a balance directly; every mutation goes through `JournalService.postJournal`. Every "list" or "get" endpoint that takes an investor id enforces self-scoping in the controller: an `INVESTOR`-role caller can only ever see their own data (their id is resolved from the JWT, not trusted from the request), regardless of what id they pass — staff roles (`FINANCE_OFFICER`/`ADMIN`/`SUPER_ADMIN`/etc.) can see any investor's.

## Frontend (`web/`)

A Next.js (App Router) + TypeScript + Tailwind SPA covering both portals the blueprint describes:

- **Investor portal**: register/login, wallet dashboard (available/invested/pending/expected & realised ROI/total position — blueprint §22), opportunities marketplace + invest flow, portfolio with repayment schedules, full wallet statement, withdrawal request + history.
- **Admin/finance portal**: KPI dashboard (blueprint §23), investor directory + detail (position/transactions/investments for any investor), deposit confirmation, withdrawal approve/complete/reject queue (role-gated to match the API's own maker-checker rules), the GL↔sub-ledger reconciliation dashboard with exception drill-down, and investment catalogue management (companies/products/opportunities).

Run it (needs the backend running on port 3000 — see above):

```bash
cd web
npm install
npm run dev      # http://localhost:3100
```

`web/lib/auth-context.tsx` stores the JWT client-side (localStorage) — a reasonable simplification for this pass since every real authorization check still happens server-side via the API's guards. `web/lib/api-client.ts` is the single place that talks to the backend; `web/lib/format-money.ts` formats the backend's fixed-3dp decimal strings without ever parsing them through a JS float.
