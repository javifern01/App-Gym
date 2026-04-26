---
phase: 2
plan: 09
subsystem: pre-session-ui
tags: [empty-state, wizard, audio-priming, preferences-v3, rest-alerts, effort-metric]
dependency_graph:
  requires: [02-01, 02-02, 02-06]
  provides: [EmptyStateScreen-v3, WizardScreen-v3]
  affects: [App.tsx, 02-11-e2e]
tech_stack:
  added: []
  patterns: [Web Audio gesture priming (RESEARCH §Pattern 3), PreferencesV3 form, CSS class tokens]
key_files:
  created: []
  modified:
    - src/components/EmptyStateScreen.tsx
    - src/components/WizardScreen.tsx
    - src/App.tsx
decisions:
  - "App.tsx migrated to SnapshotV3 to fix pre-existing TSC failures from plan 02-01 (Rule 3 deviation)"
  - "SessionScreen cast as any in App.tsx — Phase-1 placeholder, replaced entirely in plan 02-07"
  - "Audio prime is fire-and-forget so failures never block session start (RESEARCH §Pitfall 1)"
metrics:
  duration: ~10 min
  completed: 2026-04-26
  completed_tasks: 2
  total_tasks: 2
  files_modified: 3
---

# Phase 2 Plan 09: Pre-Session UI Updates Summary

One-liner: **EmptyStateScreen previews seed routine + primes iOS audio gesture; WizardScreen collects all 5 PreferencesV3 fields (restAlertSound, restAlertVibration, effortMetric).**

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Update EmptyStateScreen — seed preview + audio gesture prime | aeb921d | src/components/EmptyStateScreen.tsx |
| 2 | Update WizardScreen — restAlertSound, restAlertVibration, effortMetric | 70853fa | src/components/WizardScreen.tsx, src/App.tsx |

## Diff Summary

### src/components/EmptyStateScreen.tsx
- **Before:** 28 lines — minimal button, no routine preview, direct `onClick={onStartSession}` (no audio priming)
- **After:** 56 lines — SEED_ROUTINE constant, useAudioCue import, handleStart() primes audio before dispatching onStartSession, CSS class tokens, mini-routine bullet list
- Lines: +51 / -21

### src/components/WizardScreen.tsx
- **Before:** ~93 lines — SnapshotV2 typed, only goalFocus + equipmentNote fields, inline styles
- **After:** 167 lines — PreferencesV3 typed, adds restAlertSound checkbox, restAlertVibration checkbox, effortMetric radio (RIR/RPE), CSS class tokens, all 5 fields submitted
- Lines: +140 / -66

### src/App.tsx (Rule 3 deviation)
- **Before:** Used SnapshotV2 throughout — causing 2 pre-existing TSC errors from plan 02-01 + 1 new error from WizardScreen type change
- **After:** SnapshotV3 used for state and persist; SessionScreen cast as any (V1 placeholder); onStartSession updated to V3 session structure
- Lines: ~+20 / -15

## New test-ids

| testid | Component | Purpose |
|--------|-----------|---------|
| `pref-rest-sound` | WizardScreen | REST-01 sound alert toggle (plan 02-11 E2E reuse) |
| `pref-rest-vibrate` | WizardScreen | REST-01 vibration alert toggle (plan 02-11 E2E reuse) |
| `pref-effort-rir` | WizardScreen | RIR effort metric radio (plan 02-11 E2E reuse) |
| `pref-effort-rpe` | WizardScreen | RPE effort metric radio (plan 02-11 E2E reuse) |

Pre-existing selectors preserved: `start-session`, `wizard-submit`, `equipment-note`

## Compliance

- **D-22 (zero new deps):** ✅ No new npm packages. useAudioCue from plan 02-06, PreferencesV3 from plan 02-01.
- **D-24 (preference additions):** ✅ restAlertSound, restAlertVibration, effortMetric collected in wizard.
- **RESEARCH §Pattern 3 (gesture priming):** ✅ audioCue.prime() called inside handleStart (real user gesture handler).
- **RESEARCH §Pitfall 1 (iOS audio):** ✅ Prime fire-and-forget; session start never blocked by audio failure.
- **D-07 (RIR/RPE):** ✅ Description "Reps en reserva (0=fallo, 4=fácil)" matches D-07 RIR convention.
- **SESS-01 (no blank screen):** ✅ EmptyStateScreen now previews the seed routine before user commits.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migrated App.tsx from SnapshotV2 to SnapshotV3**
- **Found during:** Task 2 verification (npx tsc -b)
- **Issue:** App.tsx used SnapshotV2 for state, persist, and updateSnapshot. Plan 02-01 migrated snapshot.ts to SnapshotV3 but left App.tsx behind (2 pre-existing TSC errors). Task 2's WizardScreen type change added a 3rd error (WizardScreen.initialPreferences expected PreferencesV3, App.tsx passed SnapshotV2['preferences']).
- **Fix:** Changed `SnapshotV2` → `SnapshotV3` throughout App.tsx; SessionScreen cast as `any` (it's a Phase-1 placeholder replaced in plan 02-07); onStartSession updated to V3 session structure.
- **Files modified:** src/App.tsx
- **Commit:** 70853fa

## Known Stubs

None — both components are fully wired. EmptyStateScreen previews live SEED_ROUTINE constant. WizardScreen submits all 5 fields to parent via onSubmit.

## Threat Flags

None — no new network endpoints, auth paths, or file access patterns introduced. Both components are pure UI with local state; data flows to parent via callbacks.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/components/EmptyStateScreen.tsx exists | ✅ FOUND |
| src/components/WizardScreen.tsx exists | ✅ FOUND |
| src/App.tsx exists | ✅ FOUND |
| commit aeb921d (Task 1) | ✅ FOUND |
| commit 70853fa (Task 2 + Rule 3) | ✅ FOUND |
| npx tsc -b exits 0 | ✅ PASSED |
