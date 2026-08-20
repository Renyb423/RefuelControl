# Refuel Control Design System

This file is the implementation-facing visual contract for Refuel Control. It documents the system that is present in the application today so that new screens and components can reuse it without introducing competing rules. Source code remains authoritative when this document and the UI diverge.

## Scope and evidence

### Evidence labels

- **Observed** — declared directly in a local source file.
- **Derived** — a reusable rule inferred from repeated observed usage; it is not a new token.
- **Absent** — not declared in the inspected source, so no value or behavior is prescribed.

### Implementation boundary

| Concern | Current source of truth | Rule |
| --- | --- | --- |
| Utility styling | Tailwind CSS import in `src/styles.css:3`; classes in component templates | Reuse the existing utility vocabulary. Do not introduce a parallel CSS token layer unless it is deliberately added to the application. |
| Screen composition | `src/app/app.routes.ts:10-16` and each route template | Keep route layout separate from feature content. |
| Shared domain state | `RefuelService` computations and signals | Present domain state in components; do not duplicate calculation or filtering rules in visual components. |
| Component-local interaction state | Component signals/properties, notably `IngresoDatosComponent` | Keep visibility and feedback state owned by the component that renders it. |
| Icon assets | Inline SVGs in templates and `public/favicon-repostaje.svg` | Use the established outline SVG language; no icon package is declared. |

### Observed application map

| Route | Screen | Visual responsibility | Evidence |
| --- | --- | --- | --- |
| `/login` | Sign in | Centered authentication card, error feedback, submit action, registration link | `src/app/login/login.html:2-54` |
| `/register` | Registration | Same authentication shell plus name field and success feedback | `src/app/register/register.html:2-72` |
| `/dashboard` | Fuel dashboard | Sticky application header, responsive content shell, month summary, entry panel, and history panel | `src/app/dashboard/dashboard.html:1-74` |
| `/` | Redirect | Redirects to `/login`; it has no independent screen | `src/app/app.routes.ts:15` |

**Observed:** the root component contains only a router outlet (`src/app/app.html:3`). There is no shared application shell outside the dashboard route.

## Visual direction

**Derived:** the UI is a light, data-oriented fuel-management interface. It pairs neutral `slate` surfaces with `indigo` as the action and financial-data accent. `emerald`, `rose`, `amber`, and `blue` communicate status or data category. Large rounded containers, restrained borders, and shallow shadows separate layers.

The visible product copy is Spanish, while `src/index.html:2` declares the document language as `en`. This is an observed mismatch; this document does not select a replacement language.

## Foundations

### Color roles

All values below are the exact utility tokens declared in local templates. Their resolved color values are **not locally declared** because the project has no Tailwind theme configuration.

| Role | Observed utility tokens | Use |
| --- | --- | --- |
| App canvas | `bg-slate-100` on auth; `bg-slate-50` on dashboard | Full-screen background |
| Elevated surface | `bg-white`, `border-slate-200/80`, `shadow-sm` or `shadow-lg` | Authentication cards, panels, secondary metric cards, header |
| Primary action and emphasis | `bg-indigo-600`, `hover:bg-indigo-700`, `text-white` | Submit/add actions and primary metric card |
| Primary soft surface | `bg-indigo-50`, `bg-indigo-50/40`, `border-indigo-100/80`, `border-indigo-200`, `text-indigo-600/700/900` | Section icons, calculated total field, welcome/session treatments |
| Header brand gradient | `from-indigo-600 to-violet-600` | Dashboard brand mark only |
| Positive feedback | `bg-emerald-50`, `border-emerald-200`, `text-emerald-700`; `bg-emerald-500` for active-session dot | Success alerts and activity indicator |
| Error/destructive feedback | `bg-rose-50`, `border-rose-200`, `text-rose-700`; `hover:text-rose-600` | Validation/server alerts and delete/logout hover states |
| Categorical data | `bg-blue-50 text-blue-600/700` for diesel; `bg-amber-50 text-amber-600/700` for gasoline/average price | Fuel labels and metric identity |
| Primary text | `text-slate-900`, `text-slate-800` | Headings and key values |
| Secondary and muted text | `text-slate-700`, `text-slate-600`, `text-slate-500`, `text-slate-400` | Labels, helper copy, table metadata, placeholders/icons |

**Observed asset color:** `public/favicon-repostaje.svg:3-21` uses `#4f39f6` for the fuel-pump artwork and `#FFFFFF` for its display detail. No relationship between that hex value and a Tailwind utility is declared locally.

### Typography

| Level | Observed utilities | Typical use |
| --- | --- | --- |
| Product heading | `text-lg font-bold text-slate-900` | Header brand |
| Screen greeting | `text-3xl sm:text-4xl font-extrabold tracking-tight` | Dashboard welcome |
| Section heading | `text-xl font-bold`; `text-lg font-bold` | Month summary; panel headings |
| Metric value | `text-2xl sm:text-3xl font-bold` or `font-extrabold` | Summary cards |
| Body / controls | `text-xs sm:text-sm`; `text-sm` | Forms, select controls, table content |
| Labels and metadata | `text-xs font-semibold`, `text-[11px]`, `text-[10px] uppercase tracking-wider` | Field labels, metric labels, table headers |

**Observed:** all screen roots use `font-sans`. **Absent:** a local font-face, font family, line-height scale, or typography theme. Do not name a font family or assign an undeclared type scale in new work.

### Spacing, shape, and elevation

| Pattern | Observed utilities | Application |
| --- | --- | --- |
| Standard panel | `p-6 rounded-2xl border border-slate-200/80 shadow-sm` | Entry and history panels |
| Authentication card | `p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200/80` | Login and registration |
| Form/control height rhythm | `px-3.5 py-2.5 rounded-xl` | Inputs and full-width controls |
| Compact control rhythm | `px-2.5 py-1.5` or `px-3 py-1.5` | Filters, selectors, compact buttons |
| Primary action rhythm | `px-4 py-3 rounded-xl` | Submit actions |
| Layout gaps | `gap-2`, `gap-3`, `gap-4`, `gap-8`; `space-y-4`, `space-y-8` | Local groups, form rows, dashboard sections |
| Section divider | `pb-4 border-b border-slate-100` | Panel headers and history header |
| Data badge | `rounded-md`, `px-2`/`px-2.5`, `py-0.5` | Station and fuel-type labels |

**Absent:** locally declared pixel conversions, spacing scale, border-width scale, radius scale, or shadow definitions. The utility names above, rather than assumed resolved values, are the reusable contract.

### Responsive behavior

| Context | Base behavior | `sm:` behavior | `lg:` behavior | Evidence |
| --- | --- | --- | --- | --- |
| Auth shell | `p-4` | `p-6` | — | Login/register `:2` |
| Auth card | `p-6`, `w-full max-w-md` | `p-8` | — | Login/register `:3` |
| Dashboard container | `px-4` | `px-6` | `px-8` | `dashboard.html:4,39` |
| Welcome/summary headers | Stack vertically | Horizontal flex alignment; some text grows | — | `dashboard.html:41-53`, `resumen-mes.html:2-20` |
| Metric cards | One column | Two columns | Four columns | `resumen-mes.html:23` |
| Fuel form rows | One column | Two columns | — | `ingreso-datos.html:48,78,117` |
| Dashboard work area | One column | — | 12-column grid: entry spans 5, history spans 7 | `dashboard.html:62-71` |
| Header identity | Email is hidden | Email is visible | — | `dashboard.html:20-24` |

**Absent:** a local Tailwind breakpoint configuration. The source declares `sm:` and `lg:` behavior, but does not declare their pixel thresholds.

## Layout recipes

### Authentication screens

1. Render a `min-h-screen` centered flex canvas with `bg-slate-100`, `p-4 sm:p-6`, and `font-sans`.
2. Place a `w-full max-w-md` white card inside it, using the authentication-card recipe.
3. Center a 12-by-12 indigo icon tile above the title and helper text.
4. Put feedback before the form, form fields in `space-y-4`, then a full-width primary submit action.
5. Finish with compact, centered account-navigation copy and an indigo text link.

The login and registration templates intentionally share this recipe; use it for further authentication screens rather than creating a second auth shell.

### Dashboard screen

1. Keep the white `h-16` sticky header at `top-0 z-30` with `border-b border-slate-200 shadow-xs`.
2. Use a centered `max-w-7xl w-full` main container with responsive horizontal padding, `py-8`, and `space-y-8`.
3. Lead with the low-contrast indigo-to-purple welcome band: `rounded-2xl`, `p-6`, `border-indigo-100/80`, `shadow-2xs`.
4. Render the month summary before the task panels.
5. At `lg:`, place the entry panel before the history panel in a 5/7 column split; preserve one-column order below that prefix.

## Component contracts

### Buttons and links

| Variant | Base treatment | Interaction treatment | Observed use |
| --- | --- | --- | --- |
| Primary | `bg-indigo-600 text-white font-semibold rounded-xl shadow-sm` | `hover:bg-indigo-700`; some actions add `hover:shadow-indigo-500/25 transition-all duration-200` | Login/register submit; add and save refuel |
| Neutral | `bg-slate-100 text-slate-600 font-semibold rounded-xl` | `hover:bg-slate-200 transition-all` | Cancel entry form |
| Outline/destructive hover | `border border-slate-200 text-slate-600` | `hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50` | Log out |
| Icon-only destructive | `p-1.5 text-slate-400 rounded-lg` | `hover:text-rose-600 hover:bg-rose-50 transition-all` | Delete row |
| Text link | `text-indigo-600 font-semibold` | `hover:text-indigo-800 transition-colors` | Authentication route links |

**Absent:** disabled, pressed, loading, keyboard-visible, or permission-denied button variants. Do not represent those as existing states.

### Inputs and selects

**Base field recipe (observed):** full width, `bg-slate-50 border border-slate-200 rounded-xl`, `text-slate-800`, `px-3.5 py-2.5`, and `focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500`. Use `text-xs sm:text-sm` in dashboard fields and `text-sm` in auth fields.

**Calculated-total exception (observed):** the refuel total field uses `bg-indigo-50/40 border-indigo-200 font-semibold text-indigo-900`, with indigo currency decoration (`ingreso-datos.html:139-153`). It remains editable; it is not disabled or read-only.

**Compact control recipe (observed):** filters and month selection use `px-2.5`/`px-3`, `py-1.5`, `text-xs sm:text-sm`, a slate or white surface, and the same indigo focus treatment.

Every current auth/refuel field has a visible `<label>` associated by `for`/`id`. The history search field has only a placeholder; no visible or programmatic label is declared (`historial.html:27-37`).

### Feedback and state rendering

| State | Visual contract | Trigger/source |
| --- | --- | --- |
| Validation/error alert | `mb-4 p-3`, rose soft surface/border/text, `text-xs`, `rounded-xl`, outline warning SVG, `flex gap-2` | Login/register validation or Supabase failure; refuel validation/persistence failure |
| Success alert | Same geometry as error, with emerald soft surface/border/text and check SVG | Register success; successful refuel save |
| Collapsed entry form | Only panel header and indigo “Add refuel” action are visible | `showForm` starts `false` (`ingreso-datos.ts:20`) |
| Expanded entry form | Form and any error alert appear; header action becomes neutral cancel | `showForm` toggles in `ingreso-datos.ts:26-30` |
| Success after refuel save | Form closes; success alert remains outside the conditional form and clears after 3 seconds | `ingreso-datos.ts:87-97`; `ingreso-datos.html:32-39` |
| Empty history | Centered `py-12` block with 12-by-12 muted circular icon, title, and guidance | `historial.html:101-110` |
| Active session | Emerald dot with `animate-pulse`, shown at `sm:` and above | `dashboard.html:50-53` |

**Absent:** loading/skeleton/progress UI, offline UI, pagination/loading-more state, field-level error styling, and disabled inputs. Errors are component-level alerts rather than per-field messages.

### Data display

- **Metric grid:** one featured indigo gradient card followed by three white bordered cards. Each has uppercase micro-label, 9-by-9 rounded icon tile, large value, and muted period detail (`resumen-mes.html:23-89`).
- **History table:** left-aligned date/station/fuel columns and right-aligned numeric columns. Rows use `py-3 px-2`, a `divide-slate-100` body, and `hover:bg-slate-50/70` (`historial.html:42-100`).
- **Semantic badges:** station uses neutral slate; diesel uses blue; gasoline uses amber. These are data labels, not actions (`historial.html:62-76`).
- **Overflow:** the table parent declares `overflow-x-auto`; preserve this containment for future columns (`historial.html:42`).

## Iconography and imagery

- **Observed:** interface icons are inline outline SVGs with `fill="none"`, `stroke="currentColor"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, and usually `stroke-width="2"`.
- **Observed size vocabulary:** 3.5, 4, 5, and 6 utility dimensions, with 4 used for inline alert/delete icons and 5 for panel/metric icons.
- **Observed motifs:** fuel pump (brand and volume), plus/check (create/success), warning circle (error), logout, clock/history, search, trash, currency, trend, and clipboard.
- **Observed static asset:** `src/index.html:8` references `favicon-repostaje.svg`; the SVG is in `public/favicon-repostaje.svg`.
- **Absent:** photographic imagery, illustration assets, an external icon library, icon naming registry, and alt-text rules for inline SVGs.

## Accessibility and implementation guardrails

### Observed support

- Native `button`, `form`, `input`, `select`, `table`, heading, `header`, `main`, and `section` elements are used.
- Auth and refuel fields expose visible labels with matching `for` and `id` attributes.
- Native required fields are marked `required`; date and numeric inputs also declare `min` and `step` where applicable.
- Focus styling is consistently declared for inputs/selects through the indigo ring and border pattern.
- Delete provides `title="Eliminar registro"`.
- The history table is horizontally scrollable rather than clipped on narrower viewports.

### Absent or not verifiable from local source

- No `aria-*`, `role`, live-region, `aria-invalid`, or `aria-describedby` attributes are declared in the inspected templates.
- Inline SVGs have no declared accessible name or explicit decorative treatment.
- The search input has no `<label>` or accessible-name attribute beyond its placeholder.
- The history table has no `<caption>` or header `scope` attributes.
- No reduced-motion treatment is declared for the pulsing status indicator.
- No contrast audit, keyboard test, screen-reader test, or focus-visible-specific rule is present.

When these gaps are addressed, add the behavior to the component that owns the interaction and document its source here. Do not claim the state exists before implementation.

## Extension checklist

Before adding a screen or visual component:

- [ ] Choose the route-level recipe (auth shell or dashboard content shell) instead of nesting a duplicate shell.
- [ ] Use observed utility tokens and recipes; label any new token as a deliberate code change, not as a pre-existing design-system value.
- [ ] Preserve one-column-first responsive behavior, then add only the existing `sm:`/`lg:` patterns when appropriate.
- [ ] Reuse primary, neutral, destructive-hover, feedback, and field treatments according to purpose.
- [ ] Keep domain calculations, filtering, and persistence in services; keep local visibility/feedback state in the rendering component.
- [ ] Specify all newly implemented hover, focus, error, disabled, and loading states next to their source evidence.
- [ ] Use native semantics and visible labels; document any intentional accessibility exception.
- [ ] Update the evidence references in this file when a source implementation changes.

## Evidence index

| Area | Local evidence |
| --- | --- |
| Styling pipeline and dependencies | `src/styles.css:3`, `package.json:15-35`, `angular.json:30-32` |
| Routes and root | `src/app/app.routes.ts:10-16`, `src/app/app.html:3` |
| Authentication UI and behavior | `src/app/login/login.html`, `src/app/login/login.ts:23-44`, `src/app/register/register.html`, `src/app/register/register.ts:25-52` |
| Dashboard shell | `src/app/dashboard/dashboard.html`, `src/app/dashboard/dashboard.ts:15-38` |
| Month metrics | `src/app/dashboard/components/resumen-mes/resumen-mes.html`, `resumen-mes.ts:13-18` |
| Refuel entry and feedback | `src/app/dashboard/components/ingreso-datos/ingreso-datos.html`, `ingreso-datos.ts:12-107` |
| History, filters, table, and empty state | `src/app/dashboard/components/historial/historial.html`, `historial.ts:13-54` |
| Shared refuel state and calculated values | `src/app/services/refuel.service.ts:18-88,141-229` |
| Favicon | `src/index.html:8`, `public/favicon-repostaje.svg:1-22` |
