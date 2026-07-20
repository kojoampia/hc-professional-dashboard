# HealthConnect — Professional Portal
## Frontend Technical Specification (v2)

> Source: `HC-Professional.pdf` (static mockup, 8 pages/screens).
> Purpose: This document reverse-engineers the mockup into a component-level, frontend-only spec an engineering agent can implement against. It does not define backend contracts, only the shape of data each component expects via `@Input()`/bound properties.

### 0.1 Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Angular 19** | Standalone components (no `NgModule` scaffolding), signals-based state (`signal`, `computed`, `effect`) preferred over `BehaviorSubject` for local component state; use the new control-flow syntax (`@if`, `@for`, `@switch`) instead of `*ngIf`/`*ngFor`. |
| Design system | **Material 3 (M3)** via Angular Material | Use M3 theming (`mat.theme()` / M3 tokens) for base components: buttons, checkboxes, tables (`mat-table` or CDK table), dialogs (`MatDialog` for the Activity Log modal and Case Detail overlay), form fields, tabs, menus (`mat-menu` for the closed-case hamburger menu), badges. |
| Styling / utility layer | **TailwindCSS** | Used for layout (grid/flex utilities), spacing, color tokens, and one-off styling on top of M3 components. Tailwind config should expose the color tokens in §2.2 as custom theme colors (e.g. `card-urgent`, `card-open`, `card-closed`) so M3 and Tailwind share a single palette source of truth. |
| Charts | Angular-friendly chart lib (e.g. `ngx-charts` or `Chart.js` via `ng2-charts`) | Wraps the Line/Pie/Bar charts in §3.1 as standalone Angular components. |
| State management | Angular signals + a thin service layer (`PatientService`, `CaseService`, `DutyRosterService`, `AuthService`) | No heavier state library required at this scope; escalate to NgRx only if cross-feature state sharing becomes complex. |
| Routing | Angular Router | Route map in §5 maps directly to Angular routes; Patient Detail Record and Case Detail should use **named/auxiliary routes or route-driven `MatDialog`** so they remain deep-linkable overlays as described in §3.3. |

Component-naming convention below (`AppHeader`, `StatCard`, etc.) should map to Angular standalone components, e.g. `AppHeaderComponent`, `StatCardComponent`, using `app-` selector prefix (`app-stat-card`, `app-data-table`, etc.).

### 0.2 Shell Application: JHipster

This frontend is implemented **inside an existing JHipster application**, which already provides the Angular workspace, build tooling, authentication/account module, and base navbar/footer. This spec's component list (§6) describes the target UI regardless of shell; the notes below map that target onto what JHipster already supplies so nothing is duplicated or rebuilt from scratch.

| Spec concept | JHipster equivalent | Guidance |
|---|---|---|
| App shell (outer frame, header, footer) | JHipster's generated `layouts/navbar` and `layouts/footer` components | **Extend, don't replace.** Add the `AuthorityRoleBadgeComponent` and optional active-shift label into the existing navbar; keep JHipster's existing account/session menu, language selector, and alerts intact. |
| `AuthorityRole` (§1.1) | JHipster's built-in authority/role system (`ROLE_USER`, `ROLE_ADMIN`, plus any custom authorities defined in the app's security config) | See the mapping table in §1.1 — the 8 clinical roles are additional custom authorities layered on top of JHipster's existing two defaults, not a replacement for them. |
| Route guarding (`authorityRoleGuard`) | JHipster's existing `UserRouteAccessService` / functional route guards pattern | Implement `authorityRoleGuard` following the same functional-guard convention JHipster already uses elsewhere in the app, rather than introducing a second guarding mechanism. |
| Entities (`Patient`, `Case`, `DutyRoster`, etc.) | JHipster JDL / entity sub-generator | This spec is frontend-only and does not define backend contracts (see Purpose above), but if/when a backend is generated, the `interface`s in §1 and §3 should be used as the basis for a JDL model so generated entity DTOs line up with these frontend shapes. Flagged as a follow-up, not part of this frontend build. |
| Styling (Bootstrap + SCSS) | JHipster ships Bootstrap-based theming by default | Tailwind and M3 tokens (§2.2) must be layered alongside JHipster's existing Bootstrap/SCSS setup, not swapped in as a full replacement — scope Tailwind's preflight/reset so it doesn't fight Bootstrap's base styles. |
| i18n | JHipster's built-in `ngx-translate` setup | All new copy introduced by this spec (stat card labels, panel headers, button text, Duty Roster strings) should go through the existing translation files/keys convention rather than hardcoded strings, so the new screens stay consistent with JHipster's existing language-switching behavior. |
| Folder structure | JHipster's generated `webapp/app/` layout (`entities/`, `shared/`, `layouts/`, feature folders) | New components from §6 should be placed following this existing convention (e.g. shared/reusable primitives under `shared/`, screen-specific components under a new feature folder per screen) rather than introducing a parallel folder structure. |

---

## 1. Application Overview

HealthConnect Professional is a clinician-facing web dashboard for managing patients, cases, and clinical activity. The mockup shows four core surfaces:

1. **Dashboard** — top-level KPIs + case analytics charts.
2. **Patient Directory** — searchable list of patients with drill-down.
3. **Patient Detail Record** — a multi-panel clinical record (profile, cases, visitations, activity trail, medications, reports) with a "Case" sub-view and an "Activity Log" modal.
4. **Case Queue (Urgent/Open/Closed)** — a triage-style list of cases filtered by status, with resolve/detail actions.

All screens share a persistent **App Shell** (top bar, logo, role badge, stat strip, footer) — in this implementation, the top bar/logo/footer are JHipster's existing navbar/footer, extended per §0.2 rather than built new; the stat strip (§2.2, §6) is new and specific to this application.

### 1.1 Authority Roles

Every authenticated user in the system holds one **Authority Role**, which governs feature/data visibility (e.g. who can edit a Diagnosis vs. only view it, who can be assigned to a case, who appears in on-call rosters). Supported roles:

- `Doctor`
- `Nurse`
- `Paramedic`
- `Pharmacist`
- `Therapist`
- `Carer`
- `Admin`
- `User`

```ts
type AuthorityRole =
  | 'Doctor'
  | 'Nurse'
  | 'Paramedic'
  | 'Pharmacist'
  | 'Therapist'
  | 'Carer'
  | 'Admin'
  | 'User';

interface Professional {
  id: string;
  name: string;
  role: AuthorityRole;
  dutyRosterId: string; // see 1.2 DutyRoster
}
```

The `"PROFESSIONAL"` badge shown in `AppHeader` (§2.5, §3.1) should be generalized to render the **current user's `AuthorityRole`** rather than a hardcoded "PROFESSIONAL" string — e.g. `AppHeaderComponent` takes an `@Input() authorityRole: AuthorityRole` and renders it in the same pill/badge style. `Admin` and `User` are non-clinical roles and should be treated as first-class citizens in route guarding (e.g. `Admin` may reach system configuration screens not in this mockup; `User` may be a restricted/read-only viewer role) — scope explicitly before build (see §4, Gap 1).

Role should drive an Angular route guard (`authorityRoleGuard`) and structural directive (e.g. `*appHasRole="['Doctor','Nurse']"`) for conditionally showing edit affordances (Edit/Save/Copy buttons, Recommendation checkboxes, Activity Log creation) versus read-only rendering for lower-privilege roles such as `Carer` or `User`.

**JHipster authority mapping.** Per §0.2, `AuthorityRole` is layered on top of JHipster's existing authority system rather than replacing it. Recommended mapping, to be confirmed with the team owning the JHipster security config before build:

| `AuthorityRole` | JHipster authority | Notes |
|---|---|---|
| `Admin` | `ROLE_ADMIN` | Maps directly to JHipster's built-in admin authority; retains access to JHipster's existing admin screens (user management, metrics, etc.) in addition to this app's clinical screens. |
| `User` | `ROLE_USER` | Maps directly to JHipster's built-in default authority; treated as the most restricted/read-only viewer role in this spec (§1.1). |
| `Doctor` | `ROLE_DOCTOR` (custom) | New custom authority to be added to the JHipster security config/authority table. |
| `Nurse` | `ROLE_NURSE` (custom) | New custom authority. |
| `Paramedic` | `ROLE_PARAMEDIC` (custom) | New custom authority. |
| `Pharmacist` | `ROLE_PHARMACIST` (custom) | New custom authority. |
| `Therapist` | `ROLE_THERAPIST` (custom) | New custom authority. |
| `Carer` | `ROLE_CARER` (custom) | New custom authority; expected to be the second-most restricted role after `User` (§1.1 recommends read-only rendering for Diagnosis/Case-editing affordances for this role, to be confirmed). |

A given JHipster account may hold more than one authority simultaneously (JHipster's model is many-to-many between users and authorities) — where an account holds more than one of the roles above, the frontend should resolve to the **highest-privilege** role for badge display purposes (e.g. `Admin` > `Doctor` > others), while still evaluating `*appHasRole` checks against the full authority set, not just the displayed one.

### 1.2 Duty Roster

Each `Professional` **subscribes to a Duty Roster** — the schedule/rotation that determines when they are on-call/on-shift and, by extension, which patients' urgent/open cases (§3.4) are routed to them.

```ts
interface DutyRoster {
  id: string;
  name: string;                // e.g. "Ward 3 — Night Shift"
  subscribedProfessionalIds: string[]; // Professionals subscribed to this roster
  shifts: DutyShift[];
}

interface DutyShift {
  id: string;
  rosterId: string;
  professionalId: string;
  startsAt: string;   // ISO datetime
  endsAt: string;     // ISO datetime
  status: 'upcoming' | 'active' | 'completed';
}
```

**Frontend implications for this spec:**
- `AppHeader` should optionally surface the current professional's **active/next shift** from their subscribed `DutyRoster` (e.g. a small "On duty until 8:00 PM" or "Next shift: Tomorrow 6:00 AM" indicator) — not present in the static mockup, recommended as a v2 addition adjacent to the role badge.
- A new **Duty Roster screen** (`/duty-roster`) is implied but not present in the mockup pages supplied; recommended component: `DutyRosterCalendarComponent` (weekly/monthly view of shifts, subscribe/unsubscribe action per roster, list of rosters available to subscribe to). Flagged as an open scope item — see §4, Gap 13.
- The Case Queue (§3.4) urgent/open filtering should, in a future iteration, be able to filter by "My Roster" (cases relevant to the current professional's subscribed roster/shift) in addition to the global status filters — add a `rosterScope: 'all' | 'mine'` toggle to `DataTable`/`StatCardRow` interactions.
- `CaseQueueRow` (§3.4) should gain an optional `assignedProfessionalId` / `assignedRosterId` field so cases can be traced back to the roster that owns them:
  ```ts
  interface CaseQueueRow {
    id: string;
    date: string;
    brief: string;
    status: 'urgent' | 'open' | 'closed';
    assignedProfessionalId?: string;
    assignedRosterId?: string;
  }
  ```

---

## 2. Global Design System

### 2.1 Layout
- Fixed-width contained layout, max content width ~1160px, centered, with a thick blue (`--color-shell-border: #3E7CB1` approx) outer frame border (8–10px) top/left/right/bottom — treat as the app's outer chrome/background in a browser tab or kiosk-style container.
- Vertical rhythm: Top bar → Header (logo + role badge) → Stat card row → Body content (white card / panel) → Footer.
- Body content sits on a white background card (`--color-surface: #FFFFFF`) with soft rounded corners against a dark, blurred hero background (`--color-hero-bg: radial gradient, near-black/navy #0B0F1A → #1B2A45`) used only behind the header/stat area, not behind body content.

### 2.2 Color Tokens
| Token | Approx Value | Usage |
|---|---|---|
| `--color-primary-blue` | `#3E7CB1` | Outer chrome border, top URL bar |
| `--color-shell-bg` | `#0B0F1A`–`#1B2A45` (radial/blurred) | Header hero background |
| `--color-surface` | `#FFFFFF` | Body/content panels |
| `--color-card-neutral` | `#7C8792` (gray) | Patient/Female/Male/Kids stat cards |
| `--color-card-urgent-bg` | `#FBE2E1` | Urgent stat card |
| `--color-card-open-bg` | `#E7F0FB` | Open stat card |
| `--color-card-closed-bg` | `#DFF2E1` | Closed stat card |
| `--color-text-primary` | `#FFFFFF` (on dark) / `#2B2B2B` (on light) | Header/labels |
| `--color-text-muted` | `#6B7280` | Table secondary text |
| `--color-accent-teal` | `#1FBE9C` / `#0E7C6B` | Chart lines/bars |
| `--color-accent-blue-chart` | `#5B9BD5` / `#1B3A57` | Pie chart segments |
| `--color-success` | `#3EAE5B` | Resolved/checkmark icon |
| `--color-warning-row` | `#FBE9E7` (pink tint) | Urgent row/table header tint |
| `--color-open-row` | `#EAF2FB` (blue tint) | Open row/table header tint |
| `--color-closed-row` | `#E6F6E9` (green tint) | Closed row/table header tint |
| `--color-highlight-edit` | `#FBE7B8` | Edit button (amber) |
| `--color-highlight-copy` | `#D9F2DC` | Copy button (mint) |
| `--color-highlight-close` | `#5A5A5A` | Close button (dark gray) |

### 2.3 Typography
- Display/label font: a rounded, hand-drawn/marker-style display face (mockup placeholder — recommend a friendly geometric sans like "Baloo 2", "Fredoka", or "Comic Neue" for stat labels/headers; recommend a clean neutral sans, e.g. "Inter" or "Source Sans Pro", for tabular/body data in production).
- Stat numbers rendered as a circular badge overlapping the bottom-right corner of each card (white circle, dark border, bold number).
- Table headers: bold, larger size than row text.

### 2.4 Iconography
- Eye icon = "View" action (row-level, opens detail).
- Pencil/edit icon = inline edit affordance (per-panel and per-field).
- Diagonal arrow (expand) icon = "expand panel" / "view all" affordance.
- Upload/cloud icon = document upload trigger (Reports panel).
- Green checkmark circle = "resolved / acknowledged" state indicator.
- Hamburger/menu (☰) icon = row contextual menu (secondary actions).
- Magnifying glass = search input adornment.

### 2.5 Reusable Primitives (must be built as shared components)
- `AppHeader` (logo + role badge + top URL bar)
- `StatCard` (label + count badge), variant: neutral | urgent | open | closed
- `DataTable` (generic: columns, rows, row actions, pagination, tint variants)
- `SearchInput`
- `PaginatedList` (`<< Prev 1 2 3 ... 10 Next >>` control, used 5x independently per patient record)
- `Modal` (Activity Log style: title + close button + body + footer actions)
- `SlidePanel` / `DetailOverlay` (Patient Detail Record, full-bleed overlay above dashboard)
- `IconButton` (Print / Edit / Copy / Close / Save / Cancel — pill-shaped, color-coded)
- `Checkbox` (Recommendations list)
- `TextArea` (Symptoms / Diagnosis / Activity Log description)
- `ChartCard` wrapper for Line / Pie / Bar charts
- `AppFooter` (Legal | Management, copyright, vendor logo)

---

## 3. Screen-by-Screen Component Spec

### 3.1 Screen: Dashboard (`/dashboard`) — Page 1

**Purpose:** Landing view giving the clinician a quick census + case analytics.

**Components:**
- `AppHeader`
  - `logoUrl: string` ("HealthConnect" wordmark, blue/green)
  - `authorityRole: AuthorityRole` (renders as badge, e.g. "DOCTOR", "NURSE", "ADMIN" — see §1.1; mockup shows "PROFESSIONAL" as a placeholder generic label)
  - `topBarUrl: string` (displays `https://www.healthconnect.com`)
  - `activeShiftLabel?: string` (optional, from subscribed `DutyRoster`, see §1.2 — not in original mockup)
- `StatCardRow` (row 1 — demographics)
  - `StatCard { label: "PATIENTS", value: 116, variant: "neutral" }`
  - `StatCard { label: "FEMALE", value: 69, variant: "neutral" }`
  - `StatCard { label: "MALE", value: 47, variant: "neutral" }`
  - `StatCard { label: "KIDS", value: 37, variant: "neutral" }`
- `StatCardRow` (row 2 — case status; identical component reused elsewhere, see §3.4)
  - `StatCard { label: "URGENT", value: 2, variant: "urgent", onClick: navigateTo('/cases?status=urgent') }`
  - `StatCard { label: "OPEN", value: 5, variant: "open", onClick: navigateTo('/cases?status=open') }`
  - `StatCard { label: "CLOSED", value: 109, variant: "closed", onClick: navigateTo('/cases?status=closed') }`
- `ChartCard title="Case - Time"` → `LineChart`
  - Props: `series: Array<{x: Date|string, y: number}>`, single or dual line, teal + dark-teal strokes, no gridlines/axis labels shown in mock (implement with labeled axes in v2 for accessibility).
- `ChartCard title="Case Distribution"` → `PieChart` (no legend shown in mock — add legend in v2)
  - Props: `segments: Array<{label: string, value: number, color: string}>` — mock shows 3 segments (light blue ~50%, mid blue ~30%, dark navy ~20%).
- `ChartCard title="Case - Patient"` → `GroupedBarChart`
  - Props: `groups: Array<{label: string, bars: Array<{value: number, color: string}>}>` — 2 groups of 2 bars each (teal vs. dark-teal), suggesting a comparison such as "New vs. Returning" or "This month vs. Last month" per patient category. **Needs clarification/labeling in v2** — mock provides no axis labels or legend.
- `AppFooter`
  - `left: "Legal | Management"` (likely two separate links)
  - `center: "Copyright 2022 Jojo Addison Information Systems - All Rights Reserved"`
  - `right: vendor logo badge "<jojoaddison/>"` (linkable, likely to vendor site)

**Interactions:**
- Clicking a demographic `StatCard` should filter the Patient Directory (§3.2) by that segment (e.g., clicking "FEMALE" → `/patients?gender=female`).
- Clicking URGENT/OPEN/CLOSED navigates to the Case Queue screen (§3.4) pre-filtered.
- Charts are read-only in the mock; v2 should support hover tooltips showing exact values and date-range filtering.

---

### 3.2 Screen: Patient Directory (`/patients`) — Page 2

**Components:**
- `AppHeader` (same as 3.1)
- `StatCardRow` (demographics — identical to 3.1, always visible/persistent across patient-related screens)
- `SearchInput`
  - `placeholder: "search"`
  - `props: { value, onChange, debounceMs: 300 }`
  - Should filter the table client-side or trigger server query on patient name/date.
- `DataTable` (Patient list)
  - Columns: `Date` (last activity/visit timestamp), `Patient` (full name), `Action` (icon button)
  - Row action: eye icon → opens `PatientDetailOverlay` (§3.3) for that patient, `onClick: navigateTo('/patients/{id}')`
  - Row data model:
    ```ts
    interface PatientListRow {
      id: string;
      lastActivityDate: string; // e.g. "21 May, 2022 05:43 AM"
      patientName: string;
    }
    ```
  - Example rows from mock:
    - `21 May, 2022 05:43 AM — Kojo Ampia-Addison`
    - `19 May, 2022 08:20 PM — Kwabena Adda Frimpong`
    - `14 Apr, 2022 07:12 AM — Nii Adjei Osae`
  - No visible pagination control on this table in the mock — **recommend adding pagination/infinite scroll in v2** since 116 patients exist but only 3 rows shown.
- `AppFooter`

---

### 3.3 Screen/Overlay: Patient Detail Record (`/patients/{id}`) — Pages 3–5

Rendered as a full-screen overlay (dark border frame + white modal card) above the Directory, not a route replacement — implies a modal/drawer pattern in v2 (e.g., route-driven modal so it's deep-linkable).

**Top Bar (within overlay):**
- `title: "Patient: {patientName}"`
- `IconButtonGroup`: `Print`, `Edit` (amber highlight = currently in edit-affordance state), `Copy`, `Close`
  - `Print` → triggers browser print / PDF export of current panel state
  - `Edit` → toggles edit mode across panels (fields become editable; icons per-panel show pencil = enter edit, arrow = expand/pop-out)
  - `Copy` → duplicates this patient record as a template for a new patient (or copies record link — **ambiguous in mock, recommend duplicate-record behavior with confirmation**)
  - `Close` → dismisses overlay, returns to Directory

**Panel Grid (2 rows × 3 columns):**

1. **Patient Identity Panel** (top-left)
   - `avatarUrl?: string` (fallback silhouette icon shown, with pencil overlay to upload/change photo)
   - Fields (label:value pairs, each independently editable via pencil icon):
     - `name: string` (e.g. "Kojo Ampia-Addison")
     - `dateOfBirth: string` (e.g. "19th April, 1976")
     - `phone: string` (e.g. "0242286304")
     - `email: string` (e.g. "kojo@jac.net")
     - `angel: string` — caregiver/next-of-kin/case-manager contact name (e.g. "Ophelia Gaisie") — **term "Angel" is domain-specific; confirm meaning with stakeholders (likely "guardian angel"/designated emergency contact)**
     - `angelPhone: string` (e.g. "0502286304")
   - Header-level actions: edit icon, expand icon.

2. **Cases Panel** (top-center)
   - `PaginatedList` of case summaries: `{ date: string, label: string }` e.g. `30-Nov-2021 — Case 1`
   - Row click → opens **Case Detail View** (§3.3.1)
   - Pagination: `<< Prev | 1..10 | Next >>` (static page-number pagination, 10 pages visible)
   - Header actions: edit icon, expand icon.

3. **Visitations Panel** (top-right)
   - `PaginatedList` of `{ date: string, label: string }` e.g. `30-Nov-2021 — Grooming`
   - Same pagination pattern.
   - **Note:** "Grooming" as a repeated visitation type suggests this may be a veterinary or personal-care context rather than a strictly human hospital context — confirm domain with stakeholders since "Prostate"/"HPV" fields elsewhere suggest human patients. Flag as a content/domain inconsistency in the source mock.

4. **Activity Trail Panel** (bottom-left)
   - `PaginatedList` of `{ date: string, description: string }` e.g. `30-Nov-2021 — Urea test recommended`
   - Header actions: edit icon, expand icon (expand opens `ActivityLogModal`, see §3.3.2).

5. **Medications Panel** (bottom-center)
   - `PaginatedList` of `{ date: string, description: string }` e.g. `30-Nov-2021 — Urea prescription`
   - Same pagination pattern; header actions: edit icon, expand icon.

6. **Reports Panel** (bottom-right)
   - `PaginatedList` of `{ date: string, description: string }` e.g. `12-Dec-2021 — Lab test report for Urea`
   - Header action: **Upload** icon (cloud/upload glyph, replacing the pencil seen elsewhere) → opens file picker / upload dialog for attaching a new report document; expand icon also present.

**Shared list-row data model:**
```ts
interface RecordEntry {
  date: string;      // display format "DD-Mon-YYYY"
  label: string;      // short description
}
```

**Shared pagination control:**
```ts
interface PaginationProps {
  currentPage: number;
  totalPages: number;       // mock shows up to 10
  onPrev: () => void;
  onNext: () => void;
  onPageSelect: (page: number) => void;
}
```

---

#### 3.3.1 Sub-view: Case Detail (`/patients/{id}/cases/{caseId}`) — Page 4

Replaces the panel grid within the same overlay frame when a case row is opened.

**Top bar:** `Patient: {patientName}` (left) · `Case # {caseNumber}` (center, underlined) · `Print`, `Save`, `Cancel` (right)

**Body — 3 columns:**
- **Symptoms** (`TextArea`, editable, freeform clinician notes)
- **Diagnosis** (`TextArea`, editable, freeform clinician notes)
- **Recommendations** (`CheckboxList`)
  - Options observed: `HPV` (checked), `Kidney stones`, `X-Ray`, `Prostate diagnosis test`
  - Data model:
    ```ts
    interface Recommendation {
      id: string;
      label: string;
      checked: boolean;
    }
    ```
  - **Note:** this checkbox list is almost certainly patient-specific/condition-specific rather than a fixed global enum — v2 should support a configurable recommendation catalog rather than hardcoding these 4 items.

**Actions:**
- `Print` → export/print this case
- `Save` → persist Symptoms/Diagnosis text + Recommendation checkbox states, returns to Patient Detail Record panel grid
- `Cancel` → discard changes, return to panel grid

---

#### 3.3.2 Modal: Activity Log (`/patients/{id}` overlay-on-overlay) — Page 5

Triggered from the Activity Trail panel's expand icon. Rendered as a centered modal on top of the Patient Detail Record (dimmed background of the record still visible behind it).

**Components:**
- `ModalHeader`: title `"Activity Log"` + icon (pencil/log glyph) + `Close` button (top-right)
- `TextInput`: `placeholder: "Title of event"`
- `TextArea`: `placeholder: "Detailed description of event."`
- `Footer`: `Save` button (bottom-right of modal body)

**Data model:**
```ts
interface ActivityLogEntry {
  title: string;
  description: string;
  createdAt: string; // set on save, not user-editable
}
```

**Behavior:** On `Save`, appends a new entry to the Activity Trail panel's list and closes the modal. On `Close`, discards the draft.

---

### 3.4 Screen: Case Queue / Triage List (`/cases?status={status}`) — Pages 6–8

Three visual states of essentially the same table, keyed by which stat card was clicked (`urgent`, `open`, `closed`). Table header tint and row action icons change based on status.

**Components:**
- `AppHeader`
- `StatCardRow`: `URGENT (2)`, `OPEN (5)`, `CLOSED (109)` — active/selected state should be visually indicated (e.g. border or elevated tint); mock does not clearly show a "selected" state, **recommend adding one in v2** (e.g. bold border or filled background on the active filter).
- `DataTable`
  - **Urgent/Open variant** (pages 6–7): columns `Date`, `Brief`, `Action` (eye icon → view detail)
  - **Closed variant** (page 8): columns `Date`, `Brief`, `Action` — but Action column shows **two icons**: a green checkmark (resolved/acknowledged indicator, likely read-only status) and a hamburger/menu icon (opens contextual menu: e.g. "Reopen", "View", "Delete", "Archive" — exact options not shown in mock, **must be defined in v2**).
  - Row data model:
    ```ts
    interface CaseQueueRow {
      id: string;
      date: string;          // "21 May, 2022 05:43 AM"
      brief: string;         // "Severe pain due to a fall."
      status: "urgent" | "open" | "closed";
    }
    ```
  - Example rows (shared across urgent/open states in mock — likely placeholder duplication rather than real distinct data):
    - `21 May, 2022 05:43 AM — Severe pain due to a fall.`
    - `19 May, 2022 08:20 PM — High fever temperature recorded`
  - Table header background tint matches the currently selected status filter (pink for urgent, blue for open, green for closed) — implement as a `DataTable` prop `headerVariant: "urgent" | "open" | "closed"`.
- `AppFooter`

**Interaction:** Row action (eye icon) opens the relevant **Case Detail** view (§3.3.1), scoped to that case regardless of which patient it belongs to (implies the Case Detail view must also be reachable independent of the Patient Detail overlay, i.e. as its own route `/cases/{caseId}` that internally resolves the parent patient).

---

## 4. Cross-Cutting Concerns for v2 (Gaps Identified in the Mockup)

These are not shown/resolved in the static mockup and should be explicitly scoped before implementation:

1. **Authentication/roles**: largely resolved by the JHipster authority mapping in §1.1/§0.2 — login/SSO is handled by JHipster's existing account module, and the 8 `AuthorityRole`s map onto `ROLE_ADMIN`/`ROLE_USER` plus 6 new custom authorities. What's still open: the exact **permission matrix** per role (e.g. can `Carer` edit Diagnosis? can `User` view Reports?) — the mapping table only sets up the authority names, not the per-screen permission rules, which still need to be defined before build.
2. **Empty/loading/error states**: no empty-state, skeleton loader, or error messaging shown for any table/chart — must be designed.
3. **Chart accessibility**: none of the three dashboard charts have axis labels, legends, or units in the mock — must be specified with real data before build (units for "Case - Time" Y-axis, legend for "Case Distribution" pie segments, category labels for "Case - Patient" bar groups).
4. **Table pagination on Patient Directory**: 116 patients but only 3 rows/no pager shown — needs a pagination or virtualized-scroll spec.
5. **"Angel" terminology**: confirm real-world meaning (guardian, emergency contact, case manager) before building the field into production copy/labels.
6. **Domain consistency**: "Grooming" as a Visitation type sits oddly alongside HPV/Prostate/Urea clinical content — confirm target vertical (human healthcare vs. veterinary/personal care) since this affects taxonomy for Visitations, Recommendations, and Reports.
7. **Recommendations catalog**: the 4 checkbox options in Case Detail (HPV, Kidney stones, X-Ray, Prostate diagnosis test) should be modeled as a configurable, condition-specific catalog, not a hardcoded global list.
8. **Closed-case menu**: the hamburger icon on closed rows (Page 8) has no defined menu contents — needs product definition.
9. **Search scope**: the Patient Directory search field's matched fields (name only? date? phone?) are undefined — needs a spec.
10. **Responsive/mobile behavior**: mockup is desktop-only; no breakpoints defined.
11. **Print behavior**: `Print` buttons appear on both the Patient Record and Case Detail — exact print layout/output format (PDF vs. browser print) needs definition.
12. **Copy button**: ambiguous — assumed "duplicate record," needs confirmation.
13. **Duty Roster screen**: Professionals subscribe to a `DutyRoster` (§1.2), but no roster/calendar screen exists in the supplied mockup pages — full UI (subscribe/unsubscribe, shift calendar, roster-scoped case filtering) needs to be designed from scratch.
14. **Backend/JDL alignment**: this spec is frontend-only (see Purpose); once a JHipster backend/entities are generated for `Patient`, `Case`, `DutyRoster`, etc., the generated DTOs need to be checked against the `interface`s defined in §1 and §3 so the frontend models don't drift from the generated backend contracts.

---

## 5. Suggested Route Map

| Route | Screen |
|---|---|
| `/dashboard` | Dashboard (§3.1) |
| `/patients` | Patient Directory (§3.2) |
| `/patients/:patientId` | Patient Detail Record overlay (§3.3) |
| `/patients/:patientId/cases/:caseId` | Case Detail sub-view (§3.3.1) |
| `/cases?status=urgent\|open\|closed` | Case Queue (§3.4) |
| `/cases/:caseId` | Case Detail (deep-linkable, independent of patient context) |
| `/duty-roster` | Duty Roster calendar/subscription screen (§1.2, new) |

---

## 6. Component Inventory (Build Checklist)

> All components below are Angular 19 standalone components (`app-` prefix), styled with M3 (Angular Material) base primitives plus TailwindCSS utility classes for layout/spacing, per §0.1. Items marked **(JHipster: extend existing)** map onto components JHipster's generator already created — extend those in place rather than building a parallel component; everything else is net-new for this application (see §0.2).

- [ ] `AppShellComponent` **(JHipster: extend existing — `layouts/` shell, not rebuilt)**
- [ ] `AppHeaderComponent` **(JHipster: extend existing navbar with `AuthorityRoleBadgeComponent` + optional active-shift label)**
- [ ] `AppFooterComponent` **(JHipster: extend existing footer)**
- [ ] `StatCardComponent` (variants: neutral, urgent, open, closed — M3 `mat-card` + Tailwind color utility) — net-new
- [ ] `StatCardRowComponent` — net-new
- [ ] `SearchInputComponent` (M3 `mat-form-field` + `matInput`)
- [ ] `DataTableComponent` (generic, wraps CDK Table/`mat-table`, with `headerVariant` + row actions + optional pagination via `mat-paginator`)
- [ ] `PaginatedListComponent` (10-page numbered pager; can wrap `mat-paginator` or a custom control matching the mockup's `<< Prev 1..10 Next >>` style)
- [ ] `ChartCardComponent` + `LineChartComponent` + `PieChartComponent` + `GroupedBarChartComponent`
- [ ] `PatientIdentityPanelComponent`
- [ ] `RecordListPanelComponent` (reused for Cases/Visitations/Activity Trail/Medications/Reports)
- [ ] `IconButtonComponent` (Print/Edit/Copy/Close/Save/Cancel — M3 `mat-button`/`mat-icon-button` variants)
- [ ] `ModalComponent` (wraps `MatDialog`) + `ActivityLogModalComponent`
- [ ] `CaseDetailViewComponent` (Symptoms/Diagnosis/Recommendations)
- [ ] `CheckboxListComponent` (M3 `mat-checkbox`)
- [ ] `TextAreaComponent`, `TextInputComponent` (M3 `mat-form-field` variants)
- [ ] `FileUploadTriggerComponent` (Reports panel)
- [ ] `ContextMenuComponent` (wraps `mat-menu`; closed-case hamburger menu)
- [ ] `AuthorityRoleBadgeComponent` (renders any of the 8 roles from §1.1 resolved from JHipster authorities per the mapping table, consistent styling) — net-new
- [ ] `authorityRoleGuard` **(JHipster: follow existing `UserRouteAccessService`/functional guard convention)**
- [ ] `DutyRosterCalendarComponent` (new — subscribe/unsubscribe, shift calendar; see §4 Gap 13)
- [ ] `RosterScopeToggleComponent` (new — "All cases" vs. "My roster" toggle for Case Queue, §1.2)

---

*End of specification.*
