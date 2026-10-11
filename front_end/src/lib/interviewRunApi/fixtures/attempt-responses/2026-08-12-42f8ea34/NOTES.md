# Attempt package — 2026-08-12 · `42f8ea34…`

Captured Finished-scene download from a live `/interview?briefId=42f8ea34-9144-4b77-b3fd-35d58d02c6ce` walk.

| File | Role |
|------|------|
| `interview-response.json` | Full `InterviewResponse` SSOT dump (~94 KB) |
| `talk-sections.json` | Sidecar Talk titles/blurbs by `topicId`. Live brief landing copy wins only when `topicId`/`phaseId` match; never index-align a different brief. |
| `editor-tapes.json` | Editor History Capture companion (`vurify/editor-tapes`) — Form / Coding / Writing synthetic tapes for Verify playback |
| `attempt-report.json` | `vurify/attempt-report` three-layer projection (`rescore.mjs`) |
| `soft-grade-v1.json` | Re-scored package via `scoreAttempt` (`template_role_v1`) |
| `soft-grade-v1.summary.json` | Compact softGrade / formGate / artifact counts |
| `rescore.mjs` | Regenerator — `npx tsx …/rescore.mjs` |

Source download name:
`interview-response-42f8ea34-9144-4b77-b3fd-35d58d02c6ce-2026-08-12T15-28-26-715Z.json`

## Pipeline audit (vs assessors plan)

### Ran as expected

| Check | Result |
|-------|--------|
| All 6 phases completed, **0 skipped** | Yes — no accidental timer forfeit |
| Free-pass after weak scores | Yes — form fail, coding 0/4, thin writing still advanced |
| Tool grains + packages | Form / coding / writing all filled under `analysis.tools` + `toolPackages` |
| Coding assess suite | `mark.code.tests.v1` **0/4** + `mark.code.method.v1` with justifications (not visible-only stub) |
| Form answer-key mark | `mark.form.key.v1` **4/16** Fail with per-item gaps |
| Writing thin path | Empty → lowest bands + honest justification |
| Talk `after_turn` delivery-only | Only `iv.delivery.v1` / `iv.question.v1` on turns (no mid-chat `iv.content` / ownership) |
| Talk `topic_end` goals + synth | `iv.content` / `iv.ownership` + `synth.topic` filled with justifications over full topics |
| Interview-end rollup | `rollup.attempt.v1` filled; lists topics + tool package summaries |

### Minor gaps (not blockers)

1. **2 pending `iv.delivery.v1` after_turn grains** — Next raced background after_turn; topic_end / tools still filled. Harmless for Decision package; ideal would drain or leave explicit `skipped`.
2. **Closing topic `topic.2i4r1d`** — only `iv.question.v1` was attached. Runtime now schedules that id on **after_turn** and leaves `topicEndTemplateIds` empty (no fallback to the full attach list). `synth.*` is **not scheduled** unless attached. This fixture’s topic_end `byTemplate` may still omit synth — that is honest, not a drop.
3. **Candidate content quality** — scores correctly reflect thin/empty tool work and evasive Talk on reliability; that is assessor honesty, not a pipeline miss.

## Fair interpretation re-score (`template_role_v1`)

| Soft key | Unit | Included |
|----------|------|----------|
| codingTests | 0 | yes |
| codingMethod | 0 | yes |
| essay | 0 (composite from lowest bands) | yes |
| interviewDelivery | ~0.170 (per-topic means, then bucket mean) | yes |
| interviewContent | 0.25 | yes |
| **overall** | **~0.109** | — |

| Gate / artifacts | Value |
|------------------|-------|
| formGate | fail · 4/16 graded · 0 ungraded |
| topicSynths | 3 |
| toolSynths | 3 |
| Collect/narrative | Present in artifacts; **not** blended into soft % |

## Verdict

**Yes — the assessor + analysis pipeline ran as designed** for this walk: tools assessed on complete, Talk goals at topic end, no forfeits, rollup + JSON package present. Soft grade now separates grade vs collect vs narrative; bombed attempt soft overall ≈ 11% with form gate fail.
