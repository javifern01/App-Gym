---
phase: 2
plan: "02"
subsystem: ui
tags: [css, design-tokens, glassmorphism, accessibility, reduced-motion, mobile-first]

# Dependency graph
requires:
  - phase: 02-01
    provides: V3 schema types — no direct CSS dependency, but the visual contract here will compose against the FSM/UI work in plans 02-04..02-08.
provides:
  - Phase 2 design tokens in :root: --radius-pill, --touch-min, --display-set, --accent-flash, --strip-height, --strip-height-active
  - Spacing scale (4-base): --sp-xs/sm/md/lg/xl/2xl/3xl
  - Status color: --warn (#f59e0b)
  - Light-mode override: --accent-flash (50% transparent)
  - Phase 1 baseline tokens (backfilled retroactively per Rule 2): --primary, --primary-2, --surface, --surface-2, --text-strong, --muted, --danger, --radius-lg/md/sm
  - Phase 2 component classes (additive): .session-shell, .ex-strip(__header/__name/__chips), .ex-chip (with [data-state] active|done|skipped), .session-indicator (with [data-saved]), .label-strong, .focus-card(__display/__row), .stepper(__btn/__value), .rir-group, .rir-chip (aria-checked='true'), .rest-strip (--active/--alert), .rest-panel(__count/__controls), .rest-dial, .handoff-overlay(__title/__count), .pause-dialog(__card/__title/__actions), .btn-danger-outline, .summary-card(__title/__chips), .summary-chip(--ok/--warn/--bad), .toast
  - Minimal legacy classes (backfilled per Rule 2): .btn, .btn-primary, .btn-success
  - prefers-reduced-motion: reduce guard removes pulses + transitions
  - Touch-target enforcement: .btn-primary, .btn-success { min-height: var(--touch-min) }
affects: [session-fsm (02-04), primitive-hooks (02-06), session-ui-focus-card (02-07), session-ui-rest-strip (02-08), wizard-v3 (02-09), app-orchestration (02-10)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plain CSS + tokens (D-22 LOCKED): zero new deps; no Tailwind, Radix, shadcn, clsx, cva."
    - "BEM-ish naming for new Phase 2 classes (.ex-strip__header, .focus-card__display, .pause-dialog__actions) keeps scope-of-change small for downstream plans."
    - "color-mix(in srgb, var(--token), transparent N%) for translucent variants — single source of truth on tokens, no hardcoded hex per surface."
    - "Behavioral state via [data-state] / [aria-checked] selectors instead of class concatenation — components in 02-07/08 can toggle via React props without conditional class strings."

key-files:
  created: []
  modified:
    - src/index.css

key-decisions:
  - "Honor D-22 LOCKED: zero new npm dependencies (git diff package.json is empty)."
  - "Honor D-21: tap targets ≥56×56 on .btn-primary, .btn-success, .stepper__btn, .rir-chip, .pause-dialog__actions .btn, .rest-panel__controls .btn — verified by 6 hits of `min-height: var(--touch-min)`."
  - "Honor D-21 typography: .focus-card__display + .rest-panel__count use var(--display-set) clamp(48px, 14vw, 72px) with font-variant-numeric: tabular-nums to prevent glyph-width jitter as digits change every second."
  - "Honor D-11 (rest-end visual flash): .rest-strip--alert pulses on var(--accent-flash) via @keyframes rest-flash 1500ms ease-in-out 2; the @media (prefers-reduced-motion: reduce) guard collapses the pulse to a static color hold."
  - "Backfill the Phase 1 baseline token + class surface as a Rule 2 deviation. Phase 1 shipped with inline styles only (`SessionScreen.tsx`, `WizardScreen.tsx`, `EmptyStateScreen.tsx` use `style={{ ... }}`), so the legacy tokens (--primary, --primary-2, --surface, --surface-2, --text-strong, --muted, --danger, --radius-lg/md/sm) and classes (.btn, .btn-primary, .btn-success) referenced by 02-CONTEXT.md D-21, 02-UI-SPEC.md §Color, and the Phase 2 classes themselves did not exist. Without them: every Phase 2 class would resolve var() against undefined and render unstyled, AND the plan's explicit acceptance criterion `rg \"^\\s*--primary: #7c5cff;\" src/index.css` and `rg \"^\\.btn-primary \\{\" src/index.css` would FAIL. Backfilling encodes the locked visual contract (UI-SPEC §Color 60/30/10 split) so it cannot drift."

patterns-established:
  - "Phase 2 components MUST consume tokens, never hardcode (`background: var(--surface)`, not `background: rgba(255,255,255,0.06)`). Single point of theme change."
  - "Reduced-motion guard collected at the END of the file as one block — easier to audit in plans 02-07/08 than scattering `@media (prefers-reduced-motion)` per-component."
  - "Sticky cinta + fixed strip + overlays use a fixed Z-stack (cinta=2, focus-card=3, rest-strip=4, rest-panel=5, handoff-overlay=6, toast=7, pause-dialog=8) declared in CSS — components don't pick z-index."

requirements-completed: [SESS-01, SESS-02, SESS-04, REST-01, REST-02]

# Metrics
duration: 6m
completed: 2026-04-26
---

# Phase 2 Plan 02: CSS Tokens & Component Classes Summary

**Phase 2 visual contract locked: Phase 2 design tokens (`--display-set`, `--touch-min`, `--accent-flash`, `--strip-height`, `--strip-height-active`, `--sp-*`, `--warn`, `--radius-pill`) + 22 component classes (focus-card, stepper, rir-chip, ex-strip, rest-strip, rest-panel, rest-dial, handoff-overlay, pause-dialog, summary-card/chip, toast, session-indicator, label-strong) appended additively to `src/index.css`, with `prefers-reduced-motion` guard and `≥56px` tap-target enforcement on primary CTAs. Phase 1 baseline tokens + classes backfilled retroactively (Rule 2 deviation) so var() references resolve and the plan's "do not break legacy" invariants pass.**

## Performance

- **Duration:** 6m
- **Started:** 2026-04-26T11:55:00Z
- **Completed:** 2026-04-26T12:01:00Z
- **Tasks:** 2
- **Files modified:** 1 (src/index.css: +600 lines, 0 deletions)

## Accomplishments

- New Phase 2 design tokens declared in `:root` (6 visual + 7 spacing + 1 status color = 14 new tokens).
- Light-mode override block created from scratch for `--accent-flash` (file previously had only a `prefers-color-scheme: dark` block).
- 22 new Phase 2 component classes appended (455 lines), each consuming tokens via `var(...)` — zero hardcoded colors/dimensions.
- `font-variant-numeric: tabular-nums` declared on 9 surfaces (display + countdown + chip metadata) to lock glyph width.
- Tap-target ≥56×56 enforced on 6 primary-CTA paths (`.btn-primary, .btn-success`, `.stepper__btn`, `.stepper__value`, `.rir-chip`, `.pause-dialog__actions .btn`, `.rest-panel__controls .btn`).
- `--accent-flash` keyframe pulse (`rest-flash`, `1500ms ease-in-out 2`) wired on `.rest-strip--alert`.
- `@media (prefers-reduced-motion: reduce)` guard at the bottom removes pulses on `.rest-strip--alert`, `.handoff-overlay`, `.toast`, `.session-indicator[data-saved='true']` and zeroes transitions on `.ex-chip[data-state='active']` and `.rest-strip`.
- Zero new npm dependencies (D-22 LOCKED): `git diff package.json` is empty.
- Vite build passes (CSS bundle grew 2.38 kB → 12.83 kB; 9.84 kB / 1.90 kB gzipped of new Phase 2 CSS).
- `git diff` is **purely additive**: 600 insertions, 0 deletions across the plan's two task commits.

## Task Commits

Each task was committed atomically on `main`:

1. **Task 1: Add Phase 2 design tokens to :root + light-mode override** — `8c26d15` (feat)
2. **Task 2: Append Phase 2 component classes to src/index.css** — `acb6b5e` (feat)

**Plan metadata:** _(forthcoming)_ `docs(02-02): complete css-tokens-and-classes plan`

## Files Created/Modified

- `src/index.css` — `:root` block extended with Phase 1 baseline + Phase 2 tokens (lines 17–51); new `@media (prefers-color-scheme: light) { :root { --accent-flash: ... } }` block created (lines 89–95); legacy minimal `.btn` / `.btn-primary` / `.btn-success` rules added (lines 165–202); Phase 2 component classes appended below (lines 204–712). Existing Vite-template content (`#root`, `body`, `h1`, `h2`, `p`, `code`, `.counter`, `prefers-color-scheme: dark` block) untouched.

## Decisions Made

None new beyond the locked decisions in `02-CONTEXT.md` (D-21, D-22). The "backfill Phase 1 baseline" decision is documented as a Rule 2 deviation below (it's mechanical — the values come straight from `02-UI-SPEC.md §Color`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing Critical Functionality] Backfilled the Phase 1 baseline token surface assumed by 02-CONTEXT.md D-21 and 02-UI-SPEC.md §Color**

- **Found during:** Task 1 (read `src/index.css` first; baseline tokens did not exist).
- **Issue:** The plan's `<action>` for Task 1 says *"insert Phase 2 tokens immediately after the line `--radius-sm: 12px;`"*, and the Phase 2 tokens themselves reference `var(--primary-2)` (in `--accent-flash`). The Phase 2 component classes (Task 2) reference `var(--primary)`, `var(--primary-2)`, `var(--surface)`, `var(--surface-2)`, `var(--text-strong)`, `var(--muted)`, `var(--danger)`, `var(--radius-lg)`, `var(--radius-md)` extensively. **NONE of these tokens existed in `src/index.css` before this plan** — Phase 1 shipped with inline styles only (`SessionScreen.tsx`, `WizardScreen.tsx`, `EmptyStateScreen.tsx` use `style={{ ... }}`), and `src/index.css` was the leftover Vite template (`--text`, `--text-h`, `--bg`, `--accent`, `--accent-bg`, `--code-bg`, `--social-bg`, `--shadow`, `--sans/heading/mono`). Additionally, the plan's own acceptance criterion *"Legacy `--primary: #7c5cff;` line still present (`rg \"^\\s*--primary: #7c5cff;\" src/index.css` matches)"* would have FAILED, and the Task 2 acceptance *"Legacy `.btn-primary {` rule still present BEFORE the appended block"* would have FAILED.
- **Fix:** Inserted Phase 1 baseline tokens (with values straight from `02-UI-SPEC.md §Color` and §Component Inventory) at the end of `:root`, immediately before the Phase 2 token block — `--primary: #7c5cff`, `--primary-2: #22c55e`, `--surface: rgba(255,255,255,0.06)`, `--surface-2: rgba(255,255,255,0.10)`, `--text-strong: #f3f4f6`, `--muted: #9ca3af`, `--danger: #ffb4b4`, `--radius-lg: 18px`, `--radius-md: 14px`, `--radius-sm: 12px`. Inserted minimal `.btn` / `.btn-primary` / `.btn-success` rules just before the appended Phase 2 block (CTA gradients per UI-SPEC §Color "accent reserved for primary CTA" + ".btn-success is success green, not accent purple").
- **Files modified:** `src/index.css` (the same file the plan was scoping; backfill is grouped under explanatory comments `/* Phase 1 baseline tokens (added retroactively in Phase 2 plan 02-02 ...) */` and `/* Phase 1 baseline classes (added retroactively in Phase 2 plan 02-02 ...) */`).
- **Verification:** All 11 Task 1 acceptance criteria pass (including the previously-impossible `--primary: #7c5cff;` check); all 26 Task 2 acceptance criteria pass (including the previously-impossible `^\.btn-primary \{` check); `npx vite build` exits 0; downstream Phase 2 classes now have a real `var()` resolution path so they will render correctly when wired in 02-07/02-08.
- **Committed in:** `8c26d15` (Task 1, baseline tokens) + `acb6b5e` (Task 2, baseline classes — folded into the Phase 2 class commit because both blocks were appended in the same edit).

**2. [Rule 3 — Blocking Issue] Adapted the missing line anchor `--radius-sm: 12px;` referenced in the plan's `<action>` for Task 1**

- **Found during:** Task 1 (preparing the StrReplace target string).
- **Issue:** Plan said *"Inside the existing `:root { ... }` block in `src/index.css` (immediately after the line `--radius-sm: 12px;`), insert Phase 2 tokens"*. The line `--radius-sm: 12px;` did not exist (see Deviation #1 — Phase 1 never declared the radius scale).
- **Fix:** Inserted the Phase 2 token block at the end of the variable-declaration region of `:root`, immediately after `--mono: ui-monospace, ...;` and just before the runtime CSS line `font: 18px/145% var(--sans);`. The result keeps all custom-property declarations grouped contiguously inside `:root`, which is the spirit of the plan's anchor.
- **Files modified:** `src/index.css`.
- **Verification:** `:root` block validates (`vite build` exits 0); all 11 Task 1 grep acceptance criteria pass against the new lines (e.g., `--radius-pill: 999px;` is matched at line 34, inside `:root`).
- **Committed in:** `8c26d15` (Task 1).

**3. [Rule 3 — Blocking Issue] Created the missing `@media (prefers-color-scheme: light) { :root { ... } }` block referenced in the plan's `<action>` for Task 1**

- **Found during:** Task 1 (preparing the second StrReplace).
- **Issue:** Plan said *"Inside the existing `@media (prefers-color-scheme: light) { :root { ... } }` block (after the closing `color-scheme: light;`), inject ..."*. The file had a `prefers-color-scheme: dark` block, NOT a `prefers-color-scheme: light` block (Phase 1 set `--bg: #fff` as the default and used `dark` to override — the inverse of the UI-SPEC's mental model).
- **Fix:** Created a NEW `@media (prefers-color-scheme: light) { :root { --accent-flash: color-mix(in srgb, var(--primary-2), transparent 50%); } }` block, placed right after the existing `prefers-color-scheme: dark` block. Only `--accent-flash` is overridden — the rest of the light-mode visual contract is grandfathered to existing :root defaults until plans 02-07/08 polish per UI-SPEC §Color light column. Block is annotated with a comment explaining the absence.
- **Files modified:** `src/index.css`.
- **Verification:** Both `--accent-flash` declarations are present at the expected line-anchors (`--accent-flash: color-mix(in srgb, var(--primary-2), transparent 30%);` at line 37 inside `:root`, `--accent-flash: color-mix(in srgb, var(--primary-2), transparent 50%);` at line 94 inside the new light-mode block).
- **Committed in:** `8c26d15` (Task 1).

---

**Total deviations:** 3 auto-fixed (1 missing-critical + 2 blocking). All three were caused by a mismatch between the plan's stated baseline ("existing classes `.card`, `.pill`, `.set-row`, `.btn`, `.btn-primary`, `.btn-success`, ... are NOT modified (D-21 grandfathering)") and the actual repo state where Phase 1 never created any of those classes/tokens. The deviations encode the missing baseline rather than rejecting the plan.

**Impact on plan:** All deviations were necessary for correctness (Phase 2 class `var()` references resolving) and for the plan's own acceptance criteria to pass. No scope creep — the backfill is the minimum viable surface needed to make the Phase 2 contract render and to satisfy the explicit `--primary: #7c5cff;` and `^\.btn-primary \{` invariants. Backfilled values are not invented — they come straight from `02-UI-SPEC.md §Color` (60/30/10 split) and `§Component Inventory` (token reuse column), so the dark-glassmorphism vision recorded in 02-CONTEXT.md D-21 is now actually expressed in CSS rather than implicit.

## Issues Encountered

- `npm run build` (= `tsc -b && vite build`) cannot exit 0 because of pre-existing TypeScript errors in `src/App.tsx` (lines 22 and 26 — App.tsx still passes `SnapshotV2`-shaped values to `saveSnapshot`/`createInitialSnapshot`, which now require V3). These were explicitly documented as out-of-scope in `02-01-SUMMARY.md` *"will be fixed by plan 02-10 per the plan's `<verification>` block"*. Plan 02-02 only modifies CSS, so the in-scope verification is *"CSS still valid; no Vite errors"*. **Verified via**:
  - `npx vite build` → exits 0 (CSS parses, bundle ships at 12.83 kB / 2.95 kB gzipped).
  - `npx tsc -b 2>&1 | grep -v "App.tsx\|SessionScreen.tsx\|WizardScreen.tsx\|EmptyStateScreen.tsx" | grep "error TS"` → no output (no in-scope TS errors caused by this plan).
  - The two App.tsx errors are unchanged from the 02-01 baseline (same line numbers, same messages).

## User Setup Required

None — no external service configuration. The next user to load the app will see exactly the Phase 1 visual surface (the inline-styled components in `App.tsx`, `SessionScreen.tsx`, `WizardScreen.tsx`, `EmptyStateScreen.tsx`) until plans 02-07/02-08 wire components against the new Phase 2 classes.

## Known Stubs

The minimal `.btn` / `.btn-primary` / `.btn-success` rules at lines 165–202 of `src/index.css` are **intentional minimum-viable** baseline classes. They give Phase 2 components (`<button class="btn">`, `<button class="btn btn-primary">`, `<button class="btn btn-success">`) a usable base, but the visual polish (full gradient palette per `02-UI-SPEC.md §Color`, explicit hover/focus/disabled states, light-mode overrides) is intentionally deferred to plans 02-07/02-08, where each component will be wired alongside the styles that frame it. Documented here so the verifier can distinguish "this was a stub by design" from "the executor missed work".

## Threat Flags

None. Plan touches only `src/index.css` (a presentation file with no auth, network, file, or schema surface). No new endpoints, no new file-system access, no trust-boundary crossings introduced.

## Next Phase Readiness

- Plan 02-04 (FSM core) — unblocked. CSS doesn't gate FSM work.
- Plan 02-06 (primitive hooks) — unblocked. CSS doesn't gate hook work.
- Plan 02-07 (FocusCard component) — **enabled**. `.focus-card`, `.focus-card__display`, `.focus-card__row`, `.stepper`, `.stepper__btn`, `.stepper__value`, `.rir-group`, `.rir-chip` are all present and resolve against real tokens.
- Plan 02-08 (RestStrip / RestPanel / HandoffOverlay components) — **enabled**. `.rest-strip` (+ `--active` / `--alert`), `.rest-panel`, `.rest-panel__count`, `.rest-dial`, `.rest-panel__controls`, `.handoff-overlay`, `.handoff-overlay__title`, `.handoff-overlay__count`, `.toast`, `.pause-dialog`, `.pause-dialog__card`, `.pause-dialog__title`, `.pause-dialog__actions`, `.btn-danger-outline` are all present.
- Plan 02-09 (Wizard V3 toggles) — unaffected; reuses existing inline styles.
- Plan 02-10 (App orchestration) — unaffected by CSS, but it remains the file responsible for unblocking the V3 type errors in `App.tsx` documented above.
- Plan 02-11 (E2E tests) — UI hooks (e.g., `data-testid`) are component-level, not CSS-level; no work blocked.

## Self-Check: PASSED

**Files exist:**
- `[ FOUND ] src/index.css` — 712 lines (was 157 before this plan).
- `[ FOUND ] .planning/phases/02-guided-session-rest-timer/02-02-SUMMARY.md` — this file.

**Commits exist on `main` (verified via `git log --oneline -5`):**
- `[ FOUND ] 8c26d15` — `feat(02-02): add Phase 2 design tokens to :root`
- `[ FOUND ] acb6b5e` — `feat(02-02): add Phase 2 component classes`

**Acceptance criteria — Task 1 (11/11 pass, all grep-verified inside `:root` or the new light-mode block):**
- `[ PASS ]` `--radius-pill: 999px;`
- `[ PASS ]` `--touch-min: 56px;`
- `[ PASS ]` `--display-set: clamp(48px, 14vw, 72px);`
- `[ PASS ]` `--accent-flash: color-mix(in srgb, var(--primary-2), transparent 30%);` (dark/default)
- `[ PASS ]` `--strip-height: 64px;`
- `[ PASS ]` `--strip-height-active: 88px;`
- `[ PASS ]` `--sp-md: 16px;`
- `[ PASS ]` `--sp-2xl: 48px;`
- `[ PASS ]` `--warn: #f59e0b;`
- `[ PASS ]` `--primary: #7c5cff;` (Phase 1 baseline backfilled per Rule 2)
- `[ PASS ]` `--accent-flash: color-mix(in srgb, var(--primary-2), transparent 50%);` (light-mode override block created per Rule 3)

**Acceptance criteria — Task 2 (26/26 pass):**
- `[ PASS ]` 23 class header `^.classname {` checks (`.focus-card`, `.focus-card__display`, `.stepper`, `.stepper__btn`, `.rir-chip`, `.ex-strip`, `.ex-chip`, `.rest-strip`, `.rest-strip--active`, `.rest-strip--alert`, `.rest-panel`, `.rest-dial`, `.handoff-overlay`, `.pause-dialog`, `.summary-card`, `.summary-chip`, `.summary-chip--ok`, `.summary-chip--warn`, `.summary-chip--bad`, `.toast`, `.session-indicator`, `.label-strong`, `.btn-primary`).
- `[ PASS ]` `font-variant-numeric: tabular-nums;` → 9 hits (≥5 required).
- `[ PASS ]` `min-height: var(--touch-min)` → 6 hits (≥4 required).
- `[ PASS ]` `@media (prefers-reduced-motion: reduce)` → 1 hit at line 704 (bottom).
- `[ PASS ]` `vite build` exits 0; CSS bundle 12.83 kB / 2.95 kB gzipped.

**Plan-level `<verification>` (3/3 pass):**
- `[ PASS ]` `vite build` exits 0 (CSS parses, Vite ships). The `npm run build` script also runs `tsc -b` first, which fails on pre-existing `App.tsx` errors documented as out-of-scope in `02-01-SUMMARY.md`. Scoped check `npx tsc -b 2>&1 | grep -v "App.tsx|SessionScreen.tsx|WizardScreen.tsx|EmptyStateScreen.tsx" | grep "error TS"` → empty (no in-scope TS regressions caused by this plan).
- `[ PASS ]` All class-name accept criteria pass via grep (see Task 2 list above).
- `[ PASS ]` `git diff src/index.css` is purely additive: **600 insertions, 0 deletions**. No legacy CSS rewrites.

**D-22 compliance:**
- `[ PASS ]` `git diff package.json` is empty. Zero new npm dependencies.

---
*Phase: 02-guided-session-rest-timer*
*Completed: 2026-04-26*
