---
phase: 07
slug: map-intelligence-portal
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-28
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | MAP-01 | — | `/intelligence` route serving index.html | build | `npm run build` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | MAP-01 | — | modular JS code compiles and loads | build | `npm run build` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 1 | MAP-03 | — | property matching engine scores and filters correctly | unit | `npx vitest run tests/matching.test.js` | ❌ W0 | ⬜ pending |
| 07-01-04 | 01 | 1 | MAP-04 | — | lead capture form validation and submissions | unit | `npx vitest run tests/leads.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Add `vitest` dependency: `npm install -D vitest`
- [ ] `tests/matching.test.js` — validates filter logic against test properties
- [ ] `tests/leads.test.js` — validates lead submission form handler

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Map renders satellite background and layers properly | MAP-01 | WebGL canvas requires visual rendering | Open `/intelligence` in browser and verify base satellite map loads and displays city boundary layers. |
| Zoom interaction Country -> City -> Trade Area | MAP-02 | Visual animation and transitions | Click India base pin, zoom to Pune city polygon, click Koregaon Park pin to display stats. |
| Light Editorial theme styling matches tokens | MAP-03 | Visual layout and color fidelity | Verify panel backgrounds use warm cream (#FAFAF5), headers use Playfair Display, text uses forest green (#004337). |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
