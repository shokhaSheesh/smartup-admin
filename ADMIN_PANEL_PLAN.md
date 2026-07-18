# Smartup24 Doc — Super Admin Panel Plan

Internal back-office for the **Smartup24 operator**. Not a tenant-facing tool.
Separate repo from the client app; reuses the same design language.

> **Styling: see [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)** — tokens, shell, every component and page pattern, extracted verbatim from the client source. Copy that file into the admin repo alongside this plan.

---

## 1. Decisions locked

| Question | Decision |
|---|---|
| Audience | Smartup24 operator (us) — platform-wide back-office |
| Placement | Separate repo (planning only for now) |
| Tenant document access | **Full access, including document content** |
| v1 modules | Tenants & users · Billing/tariffs/payments (+ Dashboard, Admin roles, Audit log as dependencies) |
| Billing paths | **Subscription (quota of N docs)** OR **pay-as-you-go (prepaid balance)** |
| Pricing | **Flat price per document + volume tiers** — never per document type |
| Charge trigger | **Outgoing only, on successful send.** Incoming/signing is free |
| Free tier | **10 free outgoing documents/month** |
| Quota exhausted mid-period | Tenant picks one of **3 resolutions**: re-buy same plan · buy a different plan · continue the remaining period pay-per-doc |
| Onboarding | Auto-approved, self-serve (no verification queue) |
| Admin access model | Multiple admin roles + full audit log |
| Tenant actions | Block/suspend/reactivate · Edit company & user data |
| Explicitly **excluded** from v1 | Impersonation ("log in as tenant"), password reset/E-Imzo management |

### Market research that drove the pricing decision

Verified against Uzbek EDO operators — **none charge differently by document type**. [edocs.uz](https://edocs.uz/) states tarification applies to outgoing documents at "Sent" status regardless of type (Счет-фактура, Акт, ТТН…). What varies is volume tier.

| Operator | Model | Price/doc | Free tier |
|---|---|---|---|
| L-Factura | per-doc | 199–249 sum | — |
| E-docs | per-doc | 190–750 sum | 10 outgoing/mo |
| Soliqservis | per-doc | 300–500 sum | 10 docs/mo |
| Didox | per-doc | 350–800 sum | 10 outgoing/mo |
| 1UZ Courier | per-doc | 300 sum | 150 docs |
| Faktura.uz | subscription | 50 000 sum/mo | — |

Sources: [buxgalter.uz operator comparison](https://buxgalter.uz/publish/doc/text171838_kak_opredelitsya_s_operatorom_esf_sravnitelnaya_tablica) · [edocs.uz](https://edocs.uz/) · [Didox](https://didox.uz/) · [Faktura.uz](https://faktura.uz/)

---

## 2. Billing model spec

### Charge waterfall (per outgoing document, on successful send)

```
1. Free monthly allowance   → 10 outgoing docs/month remaining?   → charge 0, decrement allowance
2. Active subscription      → quota remaining?                    → charge 0, decrement quota
3. Quota exhausted?         → see "Quota exhaustion" below
4. PAYG tenant              → balance ≥ tier price?               → deduct tier price
5. Otherwise                → BLOCK send, surface "insufficient funds"
```

Incoming documents and signing are always free and never touch this waterfall.

### Quota exhaustion — the three-way branch

When a subscription's quota hits zero mid-period, sending **pauses** and the tenant chooses one of three resolutions:

| # | Resolution | Effect |
|---|---|---|
| **A** | **Re-buy the same plan** | Quota resets to N, period restarts from now for the plan's full duration. |
| **B** | **Buy a different plan** | New plan's quota + period start immediately, replacing the old subscription. |
| **C** | **Continue pay-per-doc for the remaining period** | Subscription stays active but exhausted. Every further outgoing document is charged from prepaid balance at the tenant's tier price until `period_end`, then normal renewal applies. |

**Model implications**
- `Subscription.status` gains **`quota_exhausted`**
- `Subscription.overage_mode` = `null` (blocked, awaiting choice) | `payg` (resolution C active)
- Only resolution **C** makes a tenant effectively **hybrid** — subscription + balance consumption simultaneously. Balance must be topped up or sending still blocks.
- Documents charged under resolution C are tagged `charge_type = payg_overage`, distinct from ordinary PAYG, so overage revenue is separable in reporting.

**Period & reset rule (no pro-rata):** a subscription period runs its duration and **quota resets when the duration ends** — full stop. Re-buying or switching mid-period simply starts a fresh period with a fresh quota. There is no remainder credit, no forfeiture accounting, and no partial-period math anywhere in the system.

**Admin panel needs to:** see who is exhausted, see which resolution they chose, and apply any of the three on the tenant's behalf (support scenario).

### Volume tiers (example shape — values configurable)

| Tier | Monthly sent volume | Price per document |
|---|---|---|
| 1 | 0 – 1 000 | 500 sum |
| 2 | 1 001 – 10 000 | 350 sum |
| 3 | 10 001+ | 250 sum |

Tier is evaluated on the tenant's rolling monthly sent count. A tenant can also be pinned to a **custom price or custom plan** (negotiated deals).

### Overrides supported
- **Custom price / custom plan per tenant** — overrides the standard tier table
- **Manual balance adjustment** — admin credits/debits a balance by hand; **reason is mandatory** and written to the audit log

### Charge types (used across Documents, Transactions, reporting)
`free_tier` · `quota` · `payg` · `payg_overage`

---

## 3. Information architecture

```
Dashboard
Tenants
  ├─ All companies
  └─ Company detail (Overview · Users · Billing · Documents · Activity)
Users              (global tenant-employee search)
Documents          (platform-wide document registry, full content)
Billing
  ├─ Tariff plans
  ├─ Pricing tiers
  ├─ Subscriptions
  ├─ Balances & top-ups
  ├─ Transactions
  └─ Manual adjustments
Administration
  ├─ Admin team
  ├─ Roles & permissions
  └─ Audit log
Settings
```

---

## 4. Page specifications

### 4.1 Login
Admin-only auth, separate from tenant login.
**Fields:** Email/Login · Password · 2FA code (TOTP)
**Notes:** rate-limited; failed attempts written to audit log.

---

### 4.2 Dashboard
Leads with **platform usage + revenue** (as chosen).

**KPI tiles**
- Documents sent (today / 7d / 30d) + trend vs previous period
- Active companies · New companies (30d)
- Revenue (30d) · MRR from subscriptions
- Total balance held across tenants (liability)
- Free-tier consumption rate

**Charts**
- Documents sent per day (line, 30/90d)
- Documents by type (bar — all 16 types)
- Revenue split: subscriptions vs pay-as-you-go (stacked)
- New companies per week

**"Needs attention" list**
- **Quota exhausted, awaiting choice** — sending is paused for these tenants (highest urgency: revenue + support calls)
- **On pay-per-doc overage with low/zero balance** — will block on next send
- Tenants approaching quota (>80% used)
- Tenants with low balance (< 10 docs' worth)
- Subscriptions expiring in 7 days
- Failed top-up payments
- Blocked companies

---

### 4.3 Tenants — list `/tenants`

**Columns:** ИНН/ПИНФЛ · Company name · Status (Active/Blocked/Suspended) · Billing mode (Subscription / PAYG) · Plan · Balance · Docs sent (30d) · Employees · Registered at · Last activity

**Filters:** status · billing mode · plan · region · registered date range · balance range · has custom pricing · activity (active/dormant)

**Search:** ИНН, company name, director, phone, email

**Bulk actions:** export CSV · block/unblock

---

### 4.4 Tenant detail `/tenants/:id`

#### Tab: Overview
**Company fields (editable):** ИНН/ПИНФЛ · Наименование компании · Адрес · Регион/район · ОКЭД · Директор (ПИНФЛ + ФИО) · Глав. бух. (ПИНФЛ + ФИО) · Телефон · Моб. телефон · Email · Веб-сайт
**Bank fields:** МФО/SWIFT · Название банка · Расчётный счёт
**Account fields (read-only):** Registered at · Status · Status reason · Last login · Source/referral

**Actions:** Edit · Block / Suspend / Reactivate (reason required) · Add internal note

#### Tab: Users
Employees of this company.
**Columns:** ФИО · ПИНФЛ · Role (Director/Accountant/Operator) · Email · Phone · Status · Last login · E-Imzo key bound (yes/no)
**Actions:** Edit user · Block/unblock user

#### Tab: Billing
- Current mode: Subscription · PAYG · **Subscription + pay-per-doc overage**
- Active plan · quota used / total · period start–end · auto-renew
- **If quota exhausted:** banner showing the state and the three resolution buttons (re-buy · switch plan · enable pay-per-doc)
- **Overage this period:** documents sent past quota + sum charged
- Balance (current) + top-up history
- Effective price per document (tier or custom)
- **Custom pricing override** — set custom per-doc price or pin a custom plan
- **Manual adjustment** — amount, direction (credit/debit), mandatory reason
- Invoice/receipt history

#### Tab: Documents
This tenant's documents, **full content viewable**.
**Columns:** № · Type (16 types) · Direction (in/out) · Counterparty ИНН + name · Status · Amount · Created · Sent · Charged (sum / free / quota)
**Filters:** type · direction · status · date range · counterparty ИНН · charged-vs-free
**Actions:** Open document (renders full content — **audit-logged**) · Download PDF

#### Tab: Activity
Chronological feed for this tenant: logins, documents sent, payments, plan changes, blocks, admin actions taken on them.

---

### 4.5 Users — global `/users`
Cross-tenant employee search.
**Columns:** ФИО · ПИНФЛ · Company (ИНН + name) · Role · Email · Phone · Status · Last login
**Filters:** role · status · company · last-login range
**Actions:** Open user · Edit · Block/unblock

---

### 4.6 Documents — platform registry `/documents`
Every document on the platform. Full content access.
**Columns:** № · Type · Sender (ИНН + name) · Receiver (ИНН + name) · Status (Draft/Sent/Signed/Rejected/Cancelled) · Amount · Created · Sent · Charge (sum / free-tier / quota)
**Filters:** type (all 16) · status · direction · date range · sender ИНН · receiver ИНН · amount range · charge type
**Actions:** Open full document · Download PDF · Export CSV
**Guardrail:** opening document content writes an audit entry (who, which document, when).

---

### 4.7 Billing — Tariff plans `/billing/plans`
CRUD for subscription plans.
**Plan fields:** Name (RU/UZ) · Description · Price per period · Period (month/quarter/year) · **Included document quota (N)** · Overage behaviour · Max employees · Features (flags) · Active/archived · Sort order · Visible to new signups
**Actions:** Create · Edit · Archive · Duplicate
**Column list:** Name · Price · Period · Quota · Active subscribers · Status

---

### 4.8 Billing — Pricing tiers `/billing/pricing`
The pay-as-you-go tier table. **One price per document — not per type.**
**Tier fields:** Tier name · Volume from · Volume to · Price per document · Effective from
**Global fields:** Free monthly allowance (default **10**) · Currency · What counts as billable (outgoing on successful send) · Rounding rule
**Actions:** Add tier · Edit · Reorder · Set effective date (scheduled price changes)

---

### 4.9 Billing — Subscriptions `/billing/subscriptions`
**Columns:** Company (ИНН + name) · Plan · Status (Active / Expiring / **Quota exhausted** / Expired / Cancelled) · Period start · Period end · Quota used / total · **Overage mode** (— / Pay-per-doc) · Overage docs & sum this period · Auto-renew · Amount paid
**Filters:** plan · status · **quota exhausted** · **overage mode** · expiring in 7/30 days · auto-renew on/off · quota used > 80% (early warning)
**Actions:** Extend period · Change plan · Cancel · Toggle auto-renew · Reset quota (reason required)

**Resolution actions** — apply on the tenant's behalf when they call support:
- **A — Re-buy same plan** → resets quota, restarts period
- **B — Switch plan** → pick new plan, quota + period replace current
- **C — Enable pay-per-doc for remaining period** → sets `overage_mode = payg`; warns if balance is zero

All three are audit-logged with the acting admin and a reason.

---

### 4.10 Billing — Balances & top-ups `/billing/topups`
**Columns:** Company · Current balance · Last top-up · Total topped up (all time) · Total consumed · Status
**Top-up record fields:** Date · Company · Amount · Method (card / bank transfer / manual) · Payment reference · Status (Pending/Success/Failed) · Card mask
**Filters:** status · method · date range · amount range
**Actions:** View payment detail · Retry/reconcile failed payment · Export

---

### 4.11 Billing — Transactions `/billing/transactions`
Immutable ledger of every balance movement.
**Columns:** Date/time · Company · Type (Top-up / Document charge / Manual adjustment / Refund / Subscription payment) · Amount (+/−) · Balance after · Related document № · Related admin (if manual) · Reason
**Filters:** type · company · date range · amount range · admin
**Actions:** Export CSV · Open related document
**Rule:** append-only. Corrections are new compensating entries, never edits.

---

### 4.12 Billing — Manual adjustments `/billing/adjustments`
**Fields:** Company (search by ИНН) · Direction (Credit / Debit) · Amount · **Reason (required, free text)** · Category (Compensation / Refund / Goodwill / Correction / Promo) · Attachment (optional)
**List columns:** Date · Company · Direction · Amount · Category · Reason · Performed by
**Rule:** every adjustment appears in Transactions and Audit log.

---

### 4.13 Administration — Admin team `/admin/team`
**Columns:** ФИО · Email · Role · Status · Last login · 2FA enabled · Created at
**Admin user fields:** ФИО · Email · Phone · Role · Status (Active/Disabled) · 2FA required
**Actions:** Invite admin · Change role · Disable · Force 2FA re-enrolment

---

### 4.14 Administration — Roles & permissions `/admin/roles`

Proposed roles:

| Role | Tenants | Documents (content) | Billing config | Manual adjustments | Admin team | Audit log |
|---|---|---|---|---|---|---|
| **Super admin** | Full | Full | Full | Full | Full | Full |
| **Support agent** | View + edit, block | **Full** (audit-logged) | View | — | — | Own actions |
| **Finance** | View | Metadata only | Full | Full | — | Own actions |
| **Read-only / analyst** | View | Metadata only | View | — | — | — |

**Permission fields per role:** module · view / create / edit / delete / special (block, adjust, view-content)
Roles are editable; the permission matrix is the page.

---

### 4.15 Administration — Audit log `/audit`
Non-negotiable given full document-content access.
**Columns:** Timestamp · Admin (name + role) · Action · Target type (Company/User/Document/Plan/Balance) · Target (ИНН / doc №) · IP · Result (Success/Denied) · Details/diff
**Logged actions (minimum):** admin login (success + failed) · view document content · edit company/user · block/unblock · manual balance adjustment · plan or pricing change · subscription change · role/permission change · data export
**Filters:** admin · action type · target type · date range · IP
**Rules:** append-only, immutable, exportable, retained ≥ 1 year.

---

### 4.16 Settings `/settings`
Platform-wide configuration.
**Sections:** Currency & rounding · Free allowance default · Billing period rules · Notification templates (low balance, expiring subscription, failed payment) · Integration endpoints (ГНК/tax committee, E-Imzo, payment provider) with connection status · Data retention · Maintenance mode

---

## 5. Data model sketch

```
Company        id, inn, name, address, region, oked, director_pinfl, director_name,
               accountant_pinfl, accountant_name, phone, mobile, email, website,
               mfo, bank_name, account_number, status, status_reason,
               billing_mode (subscription|payg), custom_price_per_doc?, created_at, last_active_at

TenantUser     id, company_id, pinfl, full_name, role, email, phone, status,
               eimzo_bound, last_login_at

Plan           id, name_ru, name_uz, description, price, period, doc_quota,
               max_employees, features[], is_active, sort_order

PriceTier      id, name, volume_from, volume_to, price_per_doc, effective_from

Subscription   id, company_id, plan_id, status, period_start, period_end,
               quota_total, quota_used, auto_renew, amount_paid,
               overage_mode (null|payg), overage_docs, overage_amount,
               previous_subscription_id?, resolution (rebuy|switch|payg)?
               # status: active | expiring | quota_exhausted | expired | cancelled

BalanceAccount company_id, balance, free_allowance_total, free_allowance_used,
               allowance_period

Transaction    id, company_id, type, amount, balance_after, document_id?,
               admin_id?, reason?, created_at        # append-only

Payment        id, company_id, amount, method, provider_ref, card_mask,
               status, created_at

Document       id, company_id, type, direction, number, counterparty_inn,
               counterparty_name, status, amount, created_at, sent_at,
               charge_type (free_tier|quota|payg|payg_overage), charge_amount

AdminUser      id, full_name, email, phone, role_id, status, twofa_enabled, last_login_at

Role           id, name, permissions{}

AuditLog       id, admin_id, action, target_type, target_id, ip, result,
               details, created_at                    # append-only, immutable
```

---

## 6. Scope

### v1 (this plan)
Dashboard · Tenants & users · Documents registry · Billing (plans, tiers, subscriptions, balances, transactions, adjustments) · Admin team & roles · Audit log · Settings

### v2 backlog
- **Support & moderation** — ticket inbox, conversation view, SLA/assignment, announcements to tenants
- **Reference data** — ИКПУ catalog, document type/variant config, banks/МФО, regions/districts, units, VAT rates
- **Deeper analytics** — cohort retention, churn, per-type revenue attribution
- **System health** — integration status (ГНК / E-Imzo / bank), API error rates, queue backlogs
- **Promo codes & trials**
- **Impersonation** — deliberately deferred; if added, must be consent-gated and audit-logged
- **Tenant verification queue** — only if auto-approval proves abusable

---

## 7. Open questions to resolve before build

1. **Free allowance reset** — calendar month, or rolling 30 days from registration?
2. **Volume tier evaluation** — rolling 30-day sent count, or calendar-month count?
3. **Refunds** — can a document charge be reversed if a send fails downstream at ГНК?
4. **Data retention** — how long do we keep document content for churned tenants (legal requirement in UZ likely 5 years for tax documents — needs legal confirmation)?
5. **Content-access guardrail** — is a plain audit entry enough, or should viewing tenant document content require a stated reason at the moment of access?

---

*Plan drafted from the client app's existing structure (auth, dashboard, documents ×16 types, tariffs/billing, products, profile) and verified market pricing research.*
