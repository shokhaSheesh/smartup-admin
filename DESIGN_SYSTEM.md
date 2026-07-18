# Smartup24 Doc — Design System

Extracted verbatim from the client app source so the **admin panel matches exactly**.
Every class string below is copied from working client code, not reconstructed. Copy them as-is.

---

## 1. Stack & setup

```json
"dependencies": {
  "@fontsource/inter": "^5.2.8",
  "lucide-react": "^1.24.0",
  "react": "^19.2.7",
  "react-dom": "^19.2.7",
  "react-router-dom": "^7.18.1",
  "recharts": "^3.9.2"
},
"devDependencies": {
  "@tailwindcss/vite": "^4.3.2",
  "tailwindcss": "^4.3.2",
  "vite": "^8.1.1",
  "typescript": "~6.0.2",
  "oxlint": "^1.71.0"
}
```

**Tailwind v4** — no `tailwind.config.js`. Theme lives in CSS via `@theme`.
**Icons** — `lucide-react` only. Never mix icon libraries.
**Charts** — `recharts`.

### `src/index.css` — copy this file exactly

```css
@import "tailwindcss";
@import "@fontsource/inter/400.css";
@import "@fontsource/inter/500.css";
@import "@fontsource/inter/600.css";
@import "@fontsource/inter/700.css";

@theme {
  --font-sans: "Inter", system-ui, "Segoe UI", Roboto, Arial, sans-serif;

  /* Smartup24 Doc brand colors (from Figma) */
  --color-Smart-blue: #1b9cd8;
  --color-Smart-green: #43b02a;
}

:root {
  font-family: var(--font-sans);
  color-scheme: light;
}

html,
body,
#root {
  height: 100%;
  margin: 0;
}
```

### `src/lib/cn.ts` — the only className helper

```ts
/** Tiny className joiner — filters falsy values. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
```

No `clsx`, no `tailwind-merge`. Keep it this way.

---

## 2. Tokens

### Colors

| Token | Value | Usage |
|---|---|---|
| `Smart-blue` | `#1b9cd8` | Primary actions, active states, focus rings, links, selected checks |
| `Smart-green` | `#43b02a` | Create/confirm CTAs, positive money actions ("Пополнить") |
| Shell navy | `#28374A` | Sidebar + app background (raw hex, not a token) |
| Content bg | `bg-slate-50` | Main content area behind cards |
| Surface | `bg-white` | All cards, tables, inputs |

Used as `bg-Smart-blue`, `text-Smart-blue`, `border-Smart-blue`, `outline-Smart-blue`, `bg-Smart-blue/5`, `accent-Smart-blue`.

**Semantic / status colors** (Tailwind defaults — stay consistent):

| Meaning | Text | Background |
|---|---|---|
| Success / signed | `text-emerald-600` | `bg-green-100` |
| Pending / warning | `text-amber-400` | `bg-amber-50` |
| Danger / canceled | `text-red-600` | `bg-red-100` |
| Danger action | `text-red-500` | `hover:bg-red-50` |
| Neutral / disabled | `text-gray-400` | `bg-gray-50` |

**Text hierarchy:** `text-slate-900` → `text-slate-800` (headings) → `text-slate-700` (labels) → `text-slate-600` → `text-gray-500` (placeholder/muted) → `text-gray-400` (disabled).

### Typography

Inter, weights 400/500/600/700 only.

| Role | Classes |
|---|---|
| Page/section heading | `text-lg font-semibold text-slate-800` |
| Card title | `text-lg font-semibold text-slate-800` |
| Stat value | `text-2xl font-bold leading-8` |
| Body / input text | `text-base font-normal leading-6 text-neutral-900` |
| Field label | `text-sm font-medium leading-5 text-slate-700` |
| Floating label (forms) | `text-xs text-gray-500` |
| Table header | `text-xs font-medium text-gray-900` |
| Table cell | `text-sm text-gray-900` |
| Button | `text-sm font-semibold` (`text-base` at `lg`) |
| Hint / helper | `text-sm text-gray-500` |

### Radius

`rounded-sm` checkbox · `rounded-md` cards, badges, small buttons · `rounded-lg` **default** (inputs, buttons, dropdowns) · `rounded-xl` stat cards, tables, drop zones · `rounded-2xl` modals, `rounded-tl-2xl` content shell · `rounded-full` pagination buttons, avatars, dots

### Shadows — use these exact values

```
Elevated card    shadow-[0px_4px_12px_0px_rgba(0,0,0,0.08)]
Form card        shadow-[0px_1px_2px_0px_rgba(16,24,40,0.06)]
Button           shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]
Dropdown / menu  shadow-[0px_12px_24px_0px_rgba(91,104,113,0.24)]
Modal            shadow-xl
```

### The outline convention (important)

Inputs and buttons use **`outline`, not `border`**, with a negative offset so the ring sits inside:

```
outline outline-1 outline-offset-[-1px] outline-gray-200
focus-within:outline-Smart-blue
```

Tables, cards, and icon buttons use regular `border border-gray-200`. Don't mix them up — it changes hover geometry.

### Icon sizing

`size-3` inside checkbox · `size-4` in menus/buttons/inline · `size-5` toolbar & topbar · `size-6` sidebar nav.
Nav icons use `strokeWidth={1.6}`, stat icons `strokeWidth={1.8}`, checkbox check `strokeWidth={3}`.

---

## 3. App shell

```tsx
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#28374A]">
      <AppSidebar collapsed={collapsed} />
      <div className="flex flex-1 flex-col overflow-hidden rounded-tl-2xl bg-slate-50">
        <AppTopbar collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} />
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

The signature detail: the navy shell shows through, and the content pane is clipped with `rounded-tl-2xl`.

### Sidebar

```tsx
<aside className={cn(
  'flex h-screen shrink-0 flex-col bg-[#28374A] transition-all duration-200',
  collapsed ? 'w-20 px-3' : 'w-72 px-4',
)}>
```

Nav row:

```tsx
'flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition'
// active:   'bg-white/10 text-white'
// inactive: 'text-slate-300 hover:bg-white/5 hover:text-white'
// danger:   'text-red-500 hover:bg-white/5'
// collapsed: add 'justify-center px-0' and set title={label}
```

Expandable groups use `ChevronUp` rotated 180° when closed, children indented `pl-3`.
Bottom nav separated by `border-t border-white/10 py-4`.
Logo block: `flex items-center gap-2 py-6`, wordmark `text-2xl font-semibold tracking-tight text-white`.

### Topbar

```tsx
<header className="flex h-14 items-center justify-between border-b border-slate-100 bg-white px-6">
```

Round icon buttons: `flex size-10 items-center justify-center rounded-full bg-slate-50`.
Notification dot: `absolute right-2.5 top-2 size-1.5 rounded-full bg-red-500 ring-1 ring-white`.
Collapse toggle: `flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50` with `ChevronsLeft`/`ChevronsRight`.

**For the admin panel:** keep the shell identical. Replace the tenant balance/ИНН widgets with admin context (environment badge, admin name + role). Recommend a visible non-production indicator so nobody confuses prod with staging.

---

## 4. Components

### Button

```tsx
type Hierarchy = 'primary' | 'secondary-gray'
type Size = 'sm' | 'md' | 'lg'

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-3.5 py-2.5 text-sm',
  lg: 'px-4 py-2.5 text-base',
}

const hierarchyClasses: Record<Hierarchy, string> = {
  primary:
    'bg-Smart-blue text-white outline outline-1 outline-offset-[-1px] outline-Smart-blue shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:brightness-105 active:brightness-95',
  'secondary-gray':
    'bg-white text-slate-700 outline outline-1 outline-offset-[-1px] outline-gray-200 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:bg-gray-50 active:bg-gray-100',
}

// base:
'inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg font-semibold leading-6 transition disabled:cursor-not-allowed disabled:opacity-50'
```

Props: `hierarchy` (default `primary`), `size` (default `lg`), `fullWidth`, `leadingIcon`, `trailingIcon`.

**Hover is `brightness-105`, never a different color.** This is the house style — apply it to any custom colored button.

#### Additional button styles in use

```tsx
// Green create CTA
'flex items-center gap-2 rounded-lg bg-Smart-green px-4 py-2.5 text-base font-semibold text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition hover:brightness-105'

// Blue outline (secondary save)
'rounded-lg border border-Smart-blue px-6 py-2.5 text-sm font-semibold text-Smart-blue transition hover:bg-blue-50'

// Danger outline (cancel)
'rounded-lg border border-red-300 px-6 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50'

// Yellow sign (Didox parity — document forms only)
'rounded-lg bg-yellow-400 px-6 py-2.5 text-sm font-semibold text-slate-900 transition hover:brightness-105'

// Text/link button
'text-sm font-semibold text-Smart-blue hover:underline'

// Square icon button (toolbar)
'flex size-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50'

// Small square add/remove (tables, repeatable rows)
'flex size-7 items-center justify-center rounded-md border border-green-200 text-Smart-green hover:bg-green-50'
'flex size-7 items-center justify-center rounded-md border border-gray-200 text-red-500 hover:bg-red-50'
```

**Admin note:** the yellow "Подписать" button exists for Didox visual parity in tenant document forms. Don't use yellow in the admin panel — use `primary` for confirm and the danger outline for destructive.

### Input

```tsx
// wrapper
'flex w-full flex-col items-start gap-1.5'
// label
'text-sm font-medium leading-5 text-slate-700'
// field box
'flex w-full items-center gap-2 overflow-hidden rounded-lg bg-white px-3.5 py-2.5 outline outline-1 outline-offset-[-1px] transition'
//   normal:      'outline-gray-200 focus-within:outline-Smart-blue'
//   destructive: 'outline-red-300 focus-within:outline-red-400'
// input
'flex-1 bg-transparent text-base font-normal leading-6 text-neutral-900 outline-none placeholder:text-gray-500'
// hint
'text-sm leading-5 text-gray-500'   // destructive → 'text-red-600'
```

Props: `label`, `hint`, `destructive`, `leadingIcon`, `trailingIcon`. Uses `useId()` to link label ↔ input.

### Floating-label field (document forms)

Distinct from `Input` — used inside document create forms, label sits above the value in the same box.

```tsx
// normal
'relative flex flex-col rounded-lg border border-gray-300 bg-white px-3.5 py-1.5'
// disabled
'relative flex flex-col rounded-lg border border-gray-200 bg-gray-50'

// label
<span className="text-xs text-gray-500">
  {label}{required && <span className="text-red-500"> *</span>}
</span>

// value
'w-full bg-transparent text-sm outline-none'
//   normal:   'text-slate-800'
//   disabled: 'text-gray-400'

// dropdown affordance
<ChevronDown className="pointer-events-none absolute right-3 top-4 size-4 text-gray-400" />
```

**Disabled = auto-populated.** Grey means "the system filled this from tax data", not "broken".

### Select

Custom dropdown, not native `<select>`.

```tsx
// trigger
'flex w-full items-center gap-2 overflow-hidden rounded-lg bg-white px-3.5 py-2.5 outline outline-1 outline-offset-[-1px] transition'
//   open ? 'outline-Smart-blue' : 'outline-gray-200'
// value: selected ? 'text-neutral-900' : 'text-gray-500'
// chevron: 'size-5 shrink-0 text-gray-500 transition' + open && 'rotate-180'

// menu
'absolute z-10 mt-1.5 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg'
// option
'flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-base text-neutral-900 hover:bg-gray-50'
// selected mark
<Check className="size-4 text-Smart-blue" />
```

Closes on outside click via a `mousedown` listener on `document` + a `ref` — reuse that pattern for every popover.

### PillSelect (compact dropdown)

```tsx
// trigger
'flex items-center gap-1 rounded-2xl border border-gray-200 bg-gray-50 py-1.5 pl-4 pr-2.5 text-sm font-medium text-slate-700 transition hover:bg-gray-100'
// menu — scrollable, capped height
'absolute left-0 z-30 mt-2 max-h-64 w-64 overflow-y-auto rounded-xl border border-gray-100 bg-white py-1 shadow-[0px_12px_24px_0px_rgba(91,104,113,0.24)]'
// row
'flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm font-medium transition hover:bg-gray-50'
//   selected: 'text-Smart-blue' + <Check className="size-4 text-Smart-blue" />
```

### Checkbox

```tsx
'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border transition'
//   checked:   'border-Smart-blue bg-Smart-blue text-white'
//   unchecked: 'border-gray-200 bg-white hover:border-Smart-blue'
// check icon: <Check className="size-3" strokeWidth={3} />
```

Native checkboxes elsewhere use `className="size-4 accent-Smart-blue"`.

### StatusBadge

```tsx
'inline-flex items-center rounded-md px-3 py-1 text-sm font-medium'

const styles = {
  signed:   'bg-green-100 text-emerald-600',
  pending:  'bg-amber-50 text-amber-400',
  canceled: 'bg-red-100 text-red-600',
}
```

**Admin panel extension** — same shape, new semantics:

```tsx
// Tenant status
active:     'bg-green-100 text-emerald-600'
blocked:    'bg-red-100 text-red-600'
suspended:  'bg-amber-50 text-amber-500'

// Subscription status
active:           'bg-green-100 text-emerald-600'
expiring:         'bg-amber-50 text-amber-500'
quota_exhausted:  'bg-orange-100 text-orange-600'   // needs action
expired:          'bg-gray-100 text-gray-500'
cancelled:        'bg-gray-100 text-gray-500'

// Charge type
free_tier:     'bg-blue-50 text-Smart-blue'
quota:         'bg-green-100 text-emerald-600'
payg:          'bg-gray-100 text-slate-600'
payg_overage:  'bg-amber-50 text-amber-600'

// Billing mode
subscription:  'bg-blue-50 text-Smart-blue'
payg:          'bg-gray-100 text-slate-600'
hybrid:        'bg-purple-50 text-purple-600'
```

### SegmentedControl

```tsx
// container
'flex w-full items-center gap-2 rounded-lg bg-gray-50 p-1 outline outline-1 outline-offset-[-1px] outline-gray-200'
// segment
'flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-md px-3 py-2 text-sm font-semibold leading-5 transition'
//   active:   'bg-white text-slate-700 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.06)]'
//   inactive: 'text-gray-500 hover:text-slate-700'
```

### Modal

```tsx
// overlay — closes on click
'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
// panel — stopPropagation on click
`w-full ${maxWidth} overflow-hidden rounded-2xl bg-white shadow-xl`   // default max-w-md
// header
'flex items-center justify-between border-b border-gray-100 px-6 py-4'
'text-lg font-semibold text-slate-900'
// close button
'flex size-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600'
```

Closes on `Escape` via a keydown listener. Always wire both Escape and overlay click.

### RowMenu (⋮ actions)

```tsx
// trigger
'flex size-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600'
// menu
'absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-[0px_12px_24px_0px_rgba(91,104,113,0.24)]'
// item
'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium transition'
//   normal:   'text-slate-700 hover:bg-gray-50'
//   danger:   'text-red-500 hover:bg-red-50'
//   disabled: 'cursor-not-allowed text-gray-300'
```

Item type: `{ label, icon?, onClick, disabled?, danger? }`.
In table rows, wrap the cell in `onClick={(e) => e.stopPropagation()}` so the menu doesn't trigger row navigation.

---

## 5. Page patterns

### Page card

Everything sits inside a white card on `bg-slate-50`.

```tsx
// List/data page (elevated)
'rounded-md bg-white p-6 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.08)]'

// Form section card (flat)
'rounded-md bg-white p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.06)]'

// Stacked form sections
<div className="flex flex-col gap-4"> …cards… </div>
```

### Data table

```tsx
<div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
  <table className="w-full border-collapse text-sm">
    <thead>
      <tr className="bg-gray-50">
        <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-900">…</th>
      </tr>
    </thead>
    <tbody>
      <tr className="cursor-pointer border-b border-gray-200 transition last:border-b-0 hover:bg-gray-50">
        <td className="h-16 px-4 text-gray-900">…</td>
      </tr>
    </tbody>
  </table>
</div>
```

Row height is `h-16` on the cells (not the row). Empty state:

```tsx
<td colSpan={n} className="px-4 py-12 text-center text-gray-400">Документы не найдены</td>
```

### Toolbar (search + actions)

```tsx
<div className="flex items-center gap-3">
  {/* search grows */}
  <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5">
    <Search className="size-5 text-gray-400" />
    <input className="flex-1 bg-transparent text-base text-gray-700 outline-none placeholder:text-gray-500" />
  </div>
  {/* size-11 icon buttons */}
  {/* filter toggle — active state: */}
  // 'border-Smart-blue bg-Smart-blue/5 text-Smart-blue'
  // inactive: 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
  {/* green CTA last */}
</div>
```

### Status tabs with count pills

```tsx
<div className="mt-6 flex items-center gap-6 border-b border-gray-200">
  <button className={cn(
    'flex h-12 items-center gap-3 border-b-2 px-3.5 text-sm font-medium transition',
    active ? 'border-Smart-blue text-slate-800'
           : 'border-transparent text-gray-400 hover:text-slate-600',
  )}>
    {label}
    <span className={cn(
      'flex min-w-6 items-center justify-center rounded-2xl px-2 py-0.5 text-xs text-white',
      pill,  // bg-gray-300 | bg-amber-300 | bg-green-400 | bg-red-500
    )}>{count}</span>
  </button>
</div>
```

### Pagination

```tsx
// prev/next
'flex size-9 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-700 transition hover:bg-gray-50 disabled:opacity-40'
// page indicator
'rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-slate-700'
// page-size select
'appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-4 pr-9 text-sm font-semibold text-slate-700 outline-none'
// + <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
// total, right-aligned
<span className="ml-auto …">Итог по количеству: <b className="font-bold text-slate-800">{n}</b></span>
```

Page sizes: `[20, 50, 100]`.

### Stat cards (KPI row)

```tsx
<div className="flex gap-4">
  <div className="flex flex-1 items-center gap-6 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.08)]">
    <div className="flex flex-col gap-1">
      <span className="text-2xl font-bold leading-8">{value}</span>
      <span className="text-base font-semibold text-slate-800">{label}</span>
    </div>
    <div className="ml-auto flex size-14 items-center justify-center rounded-xl {iconBg}">
      <Icon className="size-6 {color}" strokeWidth={1.8} />
    </div>
  </div>
</div>
```

Icon colors: `text-Smart-blue` (total) · `text-emerald-600` (success) · `text-yellow-500` (pending) · `text-red-600` (error) · `text-gray-400` (neutral).

### Chart section

```tsx
<section className="rounded-md bg-white p-4 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.08)]">
  <h2 className="mb-4 text-lg font-semibold text-slate-800">{title}</h2>
  …recharts…
</section>
```

Chart tooltip:

```tsx
'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-md'
// legend dot: 'size-2.5 rounded-full' with inline backgroundColor
// dotted leader line: 'flex-1 border-b border-dashed border-gray-200'
```

### File drop zone

```tsx
<label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-Smart-blue/40 bg-Smart-blue/5 px-6 py-10 text-center transition hover:bg-Smart-blue/10">
  <span className="text-2xl font-bold text-Smart-blue">Перетащите файл сюда</span>
  <span className="mt-2 text-base text-slate-500">или нажмите, чтобы найти на диске</span>
  <span className="mt-1 text-sm text-slate-400">(.pdf не более 10мб)</span>
  <input type="file" className="hidden" />
</label>
```

### Form grids

```tsx
'grid grid-cols-1 gap-4 sm:grid-cols-2 sm:max-w-2xl'   // header fields
'grid grid-cols-1 gap-4 sm:grid-cols-3 sm:max-w-4xl'   // 3-up header
'grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2'      // two-party sections
'flex flex-col gap-3'                                   // stacked fields in a column
```

Bottom action bar (centered, below the cards):

```tsx
<div className="flex flex-col items-center gap-4 pt-2">
  <button className="text-sm font-semibold text-Smart-blue hover:underline">Показать документ</button>
  <div className="flex items-center gap-3">…buttons…</div>
</div>
```

---

## 6. Conventions

1. **Language is Russian.** All labels, placeholders, empty states, buttons. `Сохранить · Отменить · Создать · Поиск по ИНН · Документы не найдены`.
2. **`cn()` for every conditional class.** Never template-string ternaries inline.
3. **Config-driven columns.** Tables define an array of `{ key, header, show?, cls?, cell }` and filter with `.filter(c => c.show !== false)` rather than branching in JSX.
4. **Popovers:** `useRef` + `document` `mousedown` listener to close on outside click. Modals additionally close on `Escape`.
5. **Hover on colored buttons is `brightness-105`.** Never swap to a different hue.
6. **`transition` on every interactive element.** No duration specified (Tailwind default) except the sidebar's `duration-200`.
7. **Disabled = `opacity-50` + `cursor-not-allowed`** for buttons; `bg-gray-50` + `text-gray-400` for inputs.
8. **Numbers:** `toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`. Money is right-aligned in tables.
9. **Required fields:** red asterisk `<span className="text-red-500"> *</span>` after the label.
10. **Path alias `@/`** maps to `src/`.

---

## 7. Admin-specific guidance

Keep the shell, tokens, components, and table/toolbar patterns **byte-identical**. Differences should be semantic, not stylistic:

- **Environment indicator** in the topbar (prod / staging) so admins always know where they are.
- **No yellow buttons.** Yellow is Didox document-signing parity; it has no meaning in admin.
- **Destructive actions** (block tenant, debit balance) use the danger outline button + a `Modal` confirmation with a **mandatory reason field**. Never a bare one-click destructive action.
- **Audit-sensitive actions** (viewing tenant document content) should show a small inline notice that the action is logged — set the expectation in the UI, not just the backend.
- **Money in tables** is right-aligned; positive adjustments `text-emerald-600`, negative `text-red-600`.
- **New badge semantics** are defined in §4 StatusBadge — extend that map rather than inventing new badge shapes.

---

*Extracted from the Smartup24 Doc client app: `src/index.css`, `src/lib/cn.ts`, `src/components/ui/*`, `src/components/layout/*`, `src/features/dashboard/*`, `src/pages/DocumentsListPage.tsx`.*
