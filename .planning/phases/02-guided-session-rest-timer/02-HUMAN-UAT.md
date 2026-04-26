---
status: partial
phase: 02-guided-session-rest-timer
source: [02-VERIFICATION.md]
started: 2026-04-26T15:30:00Z
updated: 2026-04-26T15:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Wake Lock en móvil real
expected: La pantalla permanece encendida durante el entreno (status === 'in_progress') — no se apaga sola mientras hay una sesión activa
result: [pending]

### 2. Cue de audio al expirar el descanso en iOS
expected: Sonido de beep audible (~880 Hz, 200 ms) en Safari/iOS tras completar primer gesto de usuario (tap "Iniciar sesión") y esperar que expire un descanso
result: [pending]

### 3. Vibración al expirar el descanso en Android
expected: El dispositivo vibra ~200 ms en Chrome Android cuando finaliza un descanso con restAlertVibration activado en el wizard
result: [pending]

### 4. Dial cónico de RestPanel
expected: El arco --progress del conic-gradient crece suavemente del 0% al 100% mientras el contador baja (tap en RestStrip durante un descanso para expandir el panel)
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
