# Smartup24 Doc — Супер-админ

Internal back-office for the **Smartup24 operator** — the platform-wide admin panel for the
EDM/EDO SaaS product. Not a tenant-facing tool.

The tenant-facing client app lives in a separate repo. This panel deliberately reuses its
design language byte-for-byte: shell, tokens, and components were ported from the client
source rather than reconstructed.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 (theme in CSS via `@theme` — no `tailwind.config.js`)
- `react-router-dom` for routing
- `lucide-react` for icons (never mix icon libraries)
- `recharts` for charts

## Getting started

```bash
npm install
npm run dev      # dev server
npm run build    # tsc -b && vite build
npm run lint     # oxlint
```

There is no backend yet. All screens read from a deterministic seeded mock dataset in
[`src/data/mock.ts`](src/data/mock.ts) — stable across reloads, so screenshots and demos
stay consistent. Mutations are local `useState` only.

## Documentation

- [ADMIN_PANEL_PLAN.md](ADMIN_PANEL_PLAN.md) — product spec: modules, billing model, page-by-page requirements
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) — styling contract shared with the client app. **Read before touching UI.**

## Structure

```
src/
  components/
    layout/    AppLayout · AppSidebar · AppTopbar · nav.ts
    ui/        shared primitives (DataTable, Toolbar, Pagination, StatCard, …)
    brand/     LogoMark
  data/mock.ts seeded mock dataset + aggregation helpers
  lib/         cn, format, date, download
  pages/       one file per route (billing/ and admin/ subfolders)
  types/       domain types + Russian label maps
```

## Conventions

Beyond the design system, a few rules specific to this panel:

1. **UI language is Russian.** All labels, placeholders, empty states.
2. **Destructive and audit-sensitive actions are never one-click.** They go through
   `ConfirmDialog` with a **mandatory reason** that is stated to be audit-logged —
   blocking a tenant, adjusting a balance, viewing document content, changing roles.
3. **Append-only means append-only.** The transaction ledger and audit log expose no
   edit or delete actions. Corrections are new compensating entries.
4. **Environment indicator** is always visible in the topbar so nobody confuses staging
   with production (`ENVIRONMENT` in `AppTopbar.tsx`).
5. **No yellow buttons.** Yellow is Didox signing parity in the client app and carries no
   meaning here. Confirm is `primary`; destructive is the danger outline.
6. **Config-driven tables.** Columns are `{ key, header, show?, cls?, cell }` arrays
   filtered on `show`, never branched in JSX.
7. **Money is right-aligned** in tables; positive `text-emerald-600`, negative `text-red-600`.

## Billing model in one screen

Charge applies to **outgoing documents on successful send only** — incoming and signing
are free. One price per document, never per document type. The waterfall:

```
1. Free monthly allowance (10 docs)  → charge 0, decrement allowance
2. Active subscription quota         → charge 0, decrement quota
3. Quota exhausted                   → tenant picks resolution A / B / C
4. PAYG balance ≥ tier price         → deduct tier price
5. Otherwise                         → BLOCK send
```

When a quota is exhausted mid-period the tenant chooses: **A** re-buy the same plan ·
**B** switch plan · **C** continue pay-per-doc for the remaining period. Admins can apply
any of the three on the tenant's behalf from the Subscriptions page or the tenant's
Billing tab. See [ADMIN_PANEL_PLAN.md](ADMIN_PANEL_PLAN.md) §2 for the full spec.
