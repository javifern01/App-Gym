---
phase: 2
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - src/index.css
autonomous: true
requirements: [SESS-01, SESS-02, SESS-04, REST-01, REST-02]
must_haves:
  truths:
    - "All Phase 2 design tokens defined in :root: --radius-pill, --touch-min, --display-set, --accent-flash, --strip-height, --strip-height-active"
    - "Phase 2 component classes are reachable via grep: .focus-card, .focus-card__display, .stepper, .stepper__btn, .rir-chip, .ex-strip, .ex-chip, .rest-strip, .rest-strip--active, .rest-strip--alert, .rest-panel, .rest-dial, .handoff-overlay, .summary-card, .summary-chip, .summary-chip--ok, .summary-chip--warn, .summary-chip--bad, .toast, .pause-dialog, .session-indicator, .label-strong"
    - "Tap targets ≥ 56px on .btn-primary, .btn-success, .stepper__btn, .rir-chip, primary CTAs (verified via min-height/min-width: var(--touch-min))"
    - "Display role uses var(--display-set) with tabular-nums on .focus-card__display and .rest-panel__count"
    - "Auto-light variant defined for new --accent-flash, --strip-height tokens via @media (prefers-color-scheme: light) where applicable"
    - "Reduced-motion guard: @media (prefers-reduced-motion: reduce) sets transitions ≤ 100ms or removes pulse animations on .rest-strip--alert and .handoff-overlay"
  artifacts:
    - path: "src/index.css"
      provides: "Phase 2 tokens + component classes (additive, legacy classes preserved)"
      contains: "--display-set"
  key_links:
    - from: ".focus-card__display, .rest-panel__count"
      to: "--display-set"
      via: "font-size: var(--display-set); font-variant-numeric: tabular-nums"
      pattern: "font-variant-numeric: tabular-nums"
    - from: ".rest-strip--alert"
      to: "--accent-flash"
      via: "background: var(--accent-flash) keyframe pulse"
      pattern: "var\\(--accent-flash\\)"
---

<objective>
Add the Phase 2 visual primitives to `src/index.css` so all session/* components in plans 02-07 and 02-08 can render against a stable token + class surface without bloating their own files.

Purpose: Lock the visual contract before any component is written. Plans 07/08 must NOT redefine tokens; they only consume.
Output: Extended `src/index.css` with new tokens in `:root` and new component classes appended below the legacy section. Existing classes (`.card`, `.pill`, `.set-row`, `.btn`, `.btn-primary`, `.btn-success`, `.radio-card`, `.input`, `.label`, `.alert`) are NOT modified (D-21 grandfathering).
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/02-guided-session-rest-timer/02-CONTEXT.md
@.planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md
@src/index.css

**Stack constraint (D-22 — LOCKED):** No Tailwind, no PostCSS plugins, no design-tooling deps. Plain CSS + tokens only. If you find yourself wanting to install `clsx`, `cva`, or any utility, stop.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Phase 2 design tokens to :root (and light-mode override) in src/index.css</name>
  <read_first>
    - src/index.css (full file — to understand current :root token block lines 1-32 and the @media (prefers-color-scheme: light) override block lines 34-46)
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"New tokens to introduce in Phase 2" (lines 36-46)
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Spacing Scale" (4/8/16/24/32/48/64 + 56 touch-target exception)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-21 (tap targets ≥ 56×56, XL set numbers, contraste)
  </read_first>
  <action>
Inside the existing `:root { ... }` block in `src/index.css` (immediately after the line `--radius-sm: 12px;`), insert Phase 2 tokens EXACTLY:

```css
  /* Phase 2 tokens */
  --radius-pill: 999px;
  --touch-min: 56px;
  --display-set: clamp(48px, 14vw, 72px);
  --accent-flash: color-mix(in srgb, var(--primary-2), transparent 30%);
  --strip-height: 64px;
  --strip-height-active: 88px;

  /* Spacing scale (multiples of 4) */
  --sp-xs: 4px;
  --sp-sm: 8px;
  --sp-md: 16px;
  --sp-lg: 24px;
  --sp-xl: 32px;
  --sp-2xl: 48px;
  --sp-3xl: 64px;

  /* Phase 2 status colors */
  --warn: #f59e0b;
```

Inside the existing `@media (prefers-color-scheme: light) { :root { ... } }` block (after the closing `color-scheme: light;`), inject:

```css
    --accent-flash: color-mix(in srgb, var(--primary-2), transparent 50%);
```

Do NOT modify any other line in `:root` or the legacy classes. The legacy `--bg`, `--surface`, `--primary`, `--primary-2`, `--radius-lg/md/sm`, `--shadow`, `--sans` stay exactly as they are.
  </action>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <acceptance_criteria>
    - `rg "^\s*--radius-pill: 999px;" src/index.css` matches inside the :root block
    - `rg "^\s*--touch-min: 56px;" src/index.css` matches
    - `rg "^\s*--display-set: clamp\(48px, 14vw, 72px\);" src/index.css` matches
    - `rg "^\s*--accent-flash: color-mix\(in srgb, var\(--primary-2\), transparent 30%\);" src/index.css` matches
    - `rg "^\s*--strip-height: 64px;" src/index.css` matches
    - `rg "^\s*--strip-height-active: 88px;" src/index.css` matches
    - `rg "^\s*--sp-md: 16px;" src/index.css` matches
    - `rg "^\s*--sp-2xl: 48px;" src/index.css` matches
    - `rg "^\s*--warn: #f59e0b;" src/index.css` matches
    - Legacy `--primary: #7c5cff;` line still present (`rg "^\s*--primary: #7c5cff;" src/index.css` matches)
    - `npm run build` exits 0 (CSS still valid; no Vite errors)
  </acceptance_criteria>
  <done>Tokens declared once in :root; light-mode override touches only --accent-flash; legacy tokens untouched.</done>
</task>

<task type="auto">
  <name>Task 2: Add Phase 2 component classes appended to src/index.css</name>
  <read_first>
    - src/index.css (existing classes — to ensure we DO NOT redefine them; appended classes must use new BEM-ish names)
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Component Inventory (Phase 2)" — token reuse column
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Layout & Responsive Rules" (sticky cinta, fixed strip, z-index stack)
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Color" (60/30/10, accent reserved-for list, --warn bound)
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Typography" (4 sizes, 2 weights, tabular-nums on display)
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Interaction & Motion" (timings + reduced-motion)
  </read_first>
  <action>
APPEND the following block to the END of `src/index.css` (after the existing `.hint` rule on the last line). Do not modify earlier rules. Mind that downstream components reference these EXACT class names; renaming is a contract break.

```css
/* ========================================================================
 * Phase 2 — Guided Session UI primitives.
 * Source: 02-UI-SPEC.md (Component Inventory + Color + Spacing + Typography).
 * Locked by D-22: plain CSS + existing tokens. NO Tailwind, NO Radix.
 * ====================================================================== */

/* Session shell layout */
.session-shell {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: var(--sp-md);
  min-height: calc(100svh - 80px);
}

/* Cinta superior (sticky exercise + progress strip) */
.ex-strip {
  position: sticky;
  top: env(safe-area-inset-top, 0);
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: var(--sp-sm);
  padding: var(--sp-sm) var(--sp-md);
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface), transparent 0%);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-md);
}

.ex-strip__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-sm);
  flex-wrap: wrap;
}

.ex-strip__name {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: var(--text-strong);
  margin: 0;
}

.ex-strip__chips {
  display: flex;
  gap: var(--sp-xs);
  flex-wrap: wrap;
}

.ex-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 32px;
  padding: 0 var(--sp-sm);
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
  position: relative;
  font-variant-numeric: tabular-nums;
}

.ex-chip[data-state='active'] {
  border-color: color-mix(in srgb, var(--primary), transparent 0%);
  background: color-mix(in srgb, var(--primary), transparent 80%);
  color: var(--text-strong);
  transform: scale(1.04);
  transition: transform 160ms ease, border-color 160ms ease;
}

.ex-chip[data-state='done'] {
  border-color: color-mix(in srgb, var(--primary-2), transparent 55%);
  background: color-mix(in srgb, var(--primary-2), transparent 88%);
  color: var(--text-strong);
}

.ex-chip[data-state='skipped'] {
  border-color: var(--border);
  color: var(--muted);
  text-decoration: line-through;
}

/* Hit-area extender for chips (visual 40x32; tappable 48x48) */
.ex-chip::before {
  content: '';
  position: absolute;
  inset: -8px;
}

.session-indicator {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-xs);
  padding: 4px var(--sp-sm);
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.session-indicator[data-saved='true'] {
  border-color: color-mix(in srgb, var(--primary), transparent 35%);
  animation: session-pulse 1000ms ease-out 1;
}

@keyframes session-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(124, 92, 255, 0); }
  50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--primary), transparent 80%); }
}

.label-strong {
  font-weight: 700;
  color: var(--text-strong);
  font-size: 13px;
  letter-spacing: 0.2px;
  text-transform: uppercase;
}

/* Focus card — 70% viewport for current set */
.focus-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-md);
  padding: var(--sp-lg);
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.focus-card__display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--sp-md);
  font-size: var(--display-set);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--text-strong);
  font-variant-numeric: tabular-nums;
}

.focus-card__display small {
  font-size: 22px;
  font-weight: 700;
  color: var(--muted);
}

.focus-card__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-md);
}

@media (max-width: 480px) {
  .focus-card__row { grid-template-columns: 1fr; }
}

/* Stepper — ±1 reps / ±2.5 kg */
.stepper {
  display: grid;
  grid-template-columns: var(--touch-min) 1fr var(--touch-min);
  align-items: stretch;
  gap: var(--sp-sm);
}

.stepper__btn {
  appearance: none;
  min-width: var(--touch-min);
  min-height: var(--touch-min);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-strong);
  font-size: 28px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 80ms ease, border-color 120ms ease;
}

.stepper__btn:active { transform: scale(0.96); }

.stepper__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.stepper__value {
  width: 100%;
  min-height: var(--touch-min);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-2);
  color: var(--text-strong);
  text-align: center;
  font-size: 32px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  outline: none;
}

.stepper__value:focus {
  border-color: color-mix(in srgb, var(--primary), transparent 35%);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary), transparent 85%);
}

/* RIR chips 0–4 */
.rir-group {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--sp-sm);
}

.rir-chip {
  appearance: none;
  min-height: var(--touch-min);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-strong);
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.rir-chip small {
  font-size: 11px;
  font-weight: 400;
  color: var(--muted);
}

.rir-chip[aria-checked='true'] {
  border-color: color-mix(in srgb, var(--primary), transparent 0%);
  background: color-mix(in srgb, var(--primary), transparent 80%);
}

/* Rest strip — fixed bottom */
.rest-strip {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 4;
  min-height: var(--strip-height);
  padding: var(--sp-sm) var(--sp-md);
  padding-bottom: calc(var(--sp-sm) + env(safe-area-inset-bottom, 0));
  border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface), transparent 0%);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-md);
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: min-height 200ms ease, background 200ms ease;
}

.rest-strip--active { min-height: var(--strip-height-active); }

.rest-strip--alert {
  background: var(--accent-flash);
  animation: rest-flash 1500ms ease-in-out 2;
}

@keyframes rest-flash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

/* Rest panel — expanded */
.rest-panel {
  position: fixed;
  left: 0; right: 0; bottom: 0; top: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-lg);
  padding: var(--sp-xl);
  background: color-mix(in srgb, var(--bg), transparent 5%);
  backdrop-filter: blur(16px);
}

.rest-panel__count {
  font-size: var(--display-set);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-strong);
  font-variant-numeric: tabular-nums;
}

.rest-dial {
  width: 220px; height: 220px;
  border-radius: 50%;
  background: conic-gradient(
    color-mix(in srgb, var(--primary), transparent 0%) calc(var(--progress, 0) * 1%),
    color-mix(in srgb, var(--surface-2), transparent 0%) calc(var(--progress, 0) * 1%)
  );
  display: flex;
  align-items: center;
  justify-content: center;
}

.rest-dial::after {
  content: '';
  width: 180px; height: 180px;
  border-radius: 50%;
  background: var(--bg);
}

.rest-panel__controls {
  display: flex;
  gap: var(--sp-sm);
  flex-wrap: wrap;
  justify-content: center;
}

.rest-panel__controls .btn {
  min-height: var(--touch-min);
  min-width: var(--touch-min);
}

/* Hand-off overlay — 3s transition between exercises */
.handoff-overlay {
  position: fixed;
  inset: 0;
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-lg);
  padding: var(--sp-2xl);
  background: color-mix(in srgb, var(--bg), transparent 5%);
  backdrop-filter: blur(16px);
  animation: handoff-enter 220ms cubic-bezier(0.2, 0.8, 0.2, 1) 1;
}

@keyframes handoff-enter {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}

.handoff-overlay__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-strong);
  letter-spacing: -0.3px;
  margin: 0;
  text-align: center;
}

.handoff-overlay__count {
  font-size: var(--display-set);
  font-weight: 700;
  color: var(--primary);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

/* Pause dialog */
.pause-dialog {
  position: fixed;
  inset: 0;
  z-index: 8;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-md);
  background: color-mix(in srgb, var(--bg), transparent 0%);
  backdrop-filter: blur(20px);
}

.pause-dialog__card {
  max-width: 420px;
  width: 100%;
  padding: var(--sp-lg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: var(--sp-md);
}

.pause-dialog__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-strong);
  letter-spacing: -0.3px;
}

.pause-dialog__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-sm);
}

.pause-dialog__actions .btn { min-height: var(--touch-min); }

.btn-danger-outline {
  border-color: color-mix(in srgb, var(--danger), transparent 35%);
  color: var(--danger);
}

/* Summary screen */
.summary-card {
  display: flex;
  flex-direction: column;
  gap: var(--sp-md);
  padding: var(--sp-lg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.summary-card__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-strong);
  border-bottom: 2px solid color-mix(in srgb, var(--primary-2), transparent 65%);
  padding-bottom: var(--sp-xs);
}

.summary-card__chips {
  display: flex;
  gap: var(--sp-sm);
  flex-wrap: wrap;
}

.summary-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-xs);
  padding: var(--sp-sm) var(--sp-md);
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.summary-chip--ok   { border-color: color-mix(in srgb, var(--primary-2), transparent 35%); }
.summary-chip--warn { border-color: color-mix(in srgb, var(--warn),      transparent 35%); color: var(--warn); }
.summary-chip--bad  { border-color: color-mix(in srgb, var(--danger),    transparent 35%); color: var(--danger); }

/* Toast (skip undo) */
.toast {
  position: fixed;
  left: 50%;
  bottom: calc(var(--strip-height) + var(--sp-md) + env(safe-area-inset-bottom, 0));
  transform: translateX(-50%);
  z-index: 7;
  display: inline-flex;
  align-items: center;
  gap: var(--sp-md);
  padding: var(--sp-sm) var(--sp-md);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 700;
  box-shadow: var(--shadow);
  animation: toast-enter 180ms cubic-bezier(0.2, 0.8, 0.2, 1) 1;
}

@keyframes toast-enter {
  from { opacity: 0; transform: translate(-50%, 12px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}

/* Touch-target enforcement on Phase 2 primary CTAs */
.btn-primary, .btn-success {
  min-height: var(--touch-min);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .ex-chip[data-state='active'] { transition: none; }
  .rest-strip { transition: none; }
  .rest-strip--alert { animation: none; background: var(--accent-flash); }
  .handoff-overlay { animation: none; }
  .toast { animation: none; }
  .session-indicator[data-saved='true'] { animation: none; }
}
```

Do not modify any line above the inserted block. Existing classes such as `.btn`, `.btn-primary`, `.btn-success`, `.set-row`, `.radio-card`, `.input`, `.label`, `.alert`, `.pill`, `.list`, `.card`, `.card-inner`, `.actions`, `.field`, `.section-title`, `.section-subtitle`, `.brand`, `.topbar`, `.app-shell`, `.container`, `.hint` MUST continue to render as Phase 1 has them.

Note that `.btn-primary, .btn-success { min-height: var(--touch-min); }` is the ONLY exception to the "do-not-modify-legacy" rule — it adds a min-height without touching color/border/font.
  </action>
  <verify>
    <automated>npm run build</automated>
  </verify>
  <acceptance_criteria>
    - `rg "^\.focus-card \{" src/index.css` matches
    - `rg "^\.focus-card__display \{" src/index.css` matches
    - `rg "^\.stepper \{" src/index.css` matches
    - `rg "^\.stepper__btn \{" src/index.css` matches
    - `rg "^\.rir-chip \{" src/index.css` matches
    - `rg "^\.ex-strip \{" src/index.css` matches
    - `rg "^\.ex-chip \{" src/index.css` matches
    - `rg "^\.rest-strip \{" src/index.css` matches
    - `rg "^\.rest-strip--active \{" src/index.css` matches
    - `rg "^\.rest-strip--alert \{" src/index.css` matches
    - `rg "^\.rest-panel \{" src/index.css` matches
    - `rg "^\.rest-dial \{" src/index.css` matches
    - `rg "^\.handoff-overlay \{" src/index.css` matches
    - `rg "^\.pause-dialog \{" src/index.css` matches
    - `rg "^\.summary-card \{" src/index.css` matches
    - `rg "^\.summary-chip \{" src/index.css` matches
    - `rg "^\.summary-chip--ok" src/index.css` matches
    - `rg "^\.summary-chip--warn" src/index.css` matches
    - `rg "^\.summary-chip--bad" src/index.css` matches
    - `rg "^\.toast \{" src/index.css` matches
    - `rg "^\.session-indicator \{" src/index.css` matches
    - `rg "^\.label-strong \{" src/index.css` matches
    - `rg "font-variant-numeric: tabular-nums;" src/index.css` returns ≥ 5 matches
    - `rg "min-height: var\(--touch-min\)" src/index.css` returns ≥ 4 matches
    - `rg "@media \(prefers-reduced-motion: reduce\)" src/index.css` matches once at the bottom
    - Legacy `.btn-primary {` rule still present BEFORE the appended block (`rg "^\.btn-primary \{" src/index.css` returns ≥ 1 match)
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>All class names referenced by plans 02-07 and 02-08 are reachable. Reduced-motion guard present. Legacy classes untouched.</done>
</task>

</tasks>

<verification>
- `npm run build` exits 0 (CSS parses, Vite ships).
- All class-name accept criteria pass via grep.
- `git diff src/index.css` shows ONLY additions to `:root` block + ONE `--accent-flash` line in light-mode override + the appended Phase 2 block + the lone `.btn-primary, .btn-success { min-height: var(--touch-min); }` rule. No deletions or rewrites of legacy CSS.
</verification>

<success_criteria>
Visual contract is complete and lockable. Components in plans 02-07 and 02-08 will compile against these classes without inventing new tokens. NO new npm dependencies installed.
</success_criteria>

<output>
After completion, create `.planning/phases/02-guided-session-rest-timer/02-02-SUMMARY.md` documenting:
- New tokens added (table)
- New classes added (table)
- Files modified
- Confirmation of D-22 compliance (zero new deps)
</output>
