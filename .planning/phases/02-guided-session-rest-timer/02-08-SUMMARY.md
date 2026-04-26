---
phase: 2
plan: "08"
subsystem: session-ui
tags: [components, pure-presentational, rest-deviation, a11y]
dependency_graph:
  requires:
    - "02-04 (FSM reducer — SessionState)"
    - "02-05 (computeRestDeviation, formatTime)"
    - "02-06 (useUndoableToast → ToastEntry)"
  provides:
    - "HandoffOverlay: 3s transition overlay between exercises"
    - "Toast: undo toast for skip-exercise"
    - "PauseDialog: pause escape hatch with Resume/Discard"
    - "SummaryScreen: terminal session state with REST-02 deviation"
  affects:
    - "02-10 (App.tsx wires these components into session flow)"
tech_stack:
  added: []
  patterns:
    - "Pure-presentational React components (no hooks, no side effects)"
    - "computeRestDeviation imported for REST-02 deviation chip"
    - "formatTime imported for elapsed time display"
key_files:
  created:
    - src/components/session/HandoffOverlay.tsx
    - src/components/session/Toast.tsx
    - src/components/session/PauseDialog.tsx
    - src/components/session/SummaryScreen.tsx
  modified: []
decisions:
  - "D-22 honored: zero new npm deps; plain React + TS only"
  - "D-08: HandoffOverlay uses 'Empezar ya' CTA (NOT back-to-summary)"
  - "D-13: Toast exposes 5s undo for skip-exercise via ToastEntry.onAction"
  - "SummaryScreen deviation chip thresholds: ≤10s=ok, ≤30s=warn, >30s=bad"
metrics:
  duration: "~10m"
  completed: "2026-04-26"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 0
---

# Phase 2 Plan 08: Session Auxiliary UI — Summary

**One-liner:** Four pure-presentational session-transition components: HandoffOverlay (3s D-08), Toast (5s undo D-13), PauseDialog (escape hatch D-04), and SummaryScreen with REST-02 deviation chip.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | HandoffOverlay + Toast | `91d314e` | HandoffOverlay.tsx, Toast.tsx |
| 2 | PauseDialog | `61269ea` | PauseDialog.tsx |
| 3 | SummaryScreen (REST-02) | `a30b4ac` | SummaryScreen.tsx |

---

## Component Prop Tables

### HandoffOverlay

| Prop | Type | Description |
|------|------|-------------|
| `nextExerciseName` | `string` | Exercise name shown in "Siguiente: {name}" |
| `msRemaining` | `number` | Milliseconds remaining; used to compute countdown seconds |
| `onContinue` | `() => void` | Called when user taps "Empezar ya" (D-08 shortcut) |

### Toast

| Prop | Type | Description |
|------|------|-------------|
| `entry` | `ToastEntry \| null` | Current toast entry from `useUndoableToast`; renders null if absent |
| `onDismiss` | `() => void` | Called when user taps close (×) |

### PauseDialog

| Prop | Type | Description |
|------|------|-------------|
| `elapsedSeconds` | `number` | Total elapsed since session start (display-only) |
| `setsCompleted` | `number` | Sets logged so far (display-only) |
| `onResume` | `() => void` | Primary CTA — dispatch RESUME |
| `onDiscard` | `() => void` | Destructive CTA — dispatch DISCARD |

### SummaryScreen

| Prop | Type | Description |
|------|------|-------------|
| `snapshot` | `SnapshotV3` | Full session snapshot (= `SessionState`) |
| `endedAtMs` | `number` | Epoch ms for total time computation |
| `onStartNewSession` | `() => void` | Resets session to idle state |

---

## Copy Strings Used (verbatim — UI-SPEC §Copywriting)

| Component | String | UI-SPEC Reference |
|-----------|--------|-------------------|
| HandoffOverlay | `Siguiente: {nextExerciseName}` | Hand-off heading |
| HandoffOverlay | `Empezar ya` | Primary CTA — accept hand-off |
| Toast | `Deshacer` (via `entry.actionLabel`) | Secondary CTA — undo skip |
| PauseDialog | `Sesión en pausa` | Pause prompt heading |
| PauseDialog | `Reanudar` | Pause prompt — primary |
| PauseDialog | `Descartar sesión` | Pause prompt — destructive |
| SummaryScreen | `¡Sesión completada!` | Summary heading |
| SummaryScreen | `Tiempo total:` | Summary chips |
| SummaryScreen | `Sets registrados:` | Summary chips |
| SummaryScreen | `Δ descanso: —` | Δ chip when samples=0 |
| SummaryScreen | `Δ descanso: {+/-}N s` | Δ chip when samples>0 |
| SummaryScreen | `↷` / `✓` | Per-exercise status icons (SESS-04) |
| SummaryScreen | `saltado` | Skipped exercise label (SESS-04) |
| SummaryScreen | `Empezar otra sesión` | New session CTA |

---

## D-22 Compliance Confirmed

- Zero new npm dependencies introduced.
- All four components use plain React + TypeScript only.
- No Tailwind, Radix, shadcn, or other UI library.
- `computeRestDeviation` and `formatTime` are internal project utilities (02-05).
- `ToastEntry` type is imported from the internal `useUndoableToast` hook (02-06).

---

## Deviation from Plan

None — plan executed exactly as written.

---

## Known Stubs

None — all components render real data from their props. No hardcoded mock values or TODO placeholders.

---

## Self-Check

### Files exist:
- [x] `src/components/session/HandoffOverlay.tsx`
- [x] `src/components/session/Toast.tsx`
- [x] `src/components/session/PauseDialog.tsx`
- [x] `src/components/session/SummaryScreen.tsx`

### Commits exist:
- [x] `91d314e` — feat(02-08): add HandoffOverlay and Toast components
- [x] `61269ea` — feat(02-08): add PauseDialog component
- [x] `a30b4ac` — feat(02-08): add SummaryScreen component (REST-02 visible)

### Pure-presentational verified:
- [x] No `useReducer` in any of the 4 files
- [x] No `localStorage` in any of the 4 files
- [x] No `Date.now` in any of the 4 files

## Self-Check: PASSED
