# Secure Grading Hardening — Backend Work Branch

**Branch:** `secure-grading-hardening`  
**Status:** Checkpoint 2 implementation scaffold added; generation against the local frontend checkout and full bank-coverage verification are still pending.  
**Production impact:** None intended. This branch is not `main`; no Render deployment, route registration, feature flag, or production setting has been changed.

## Scope

This branch introduces the server-only answer-key manifest contract and an exporter that resolves the same question sets used by the current frontend. It is designed to run from the local Backend checkout while reading the sibling Aprioriedunext checkout. It writes the generated manifest only under the Backend repository, never under the frontend source tree.

Default local folders:
- Frontend: `D:\Aprioriedunext`
- Backend: `D:\Backend`

If the folders are different, the exporter supports `FRONTEND_REPO_PATH` as an override.

## New files

- `grading/answerKeyRegistry.js`: validates the manifest schema and provides a server-only lookup registry. It is not mounted on an API route yet.
- `scripts/exportSecureGradingAnswerKeys.js`: reads frontend language banks and the current learner-facing Reasoning runtime/calibration functions. It writes:
  - `data/secure-grading/answer-keys.generated.json` — intended to remain server-side;
  - `data/secure-grading/answer-key-export-audit.json` — source coverage and any unresolved question formats.
- `scripts/testSecureGradingAnswerKeyRegistry.js`: tests schema validation, key lookup, duplicate rejection and invalid answer-key rejection.

The generated manifest is not committed by the implementation code in this branch and has not been generated in this environment. The first local run must prove the current frontend checkout can be loaded and that every question in the selected banks has an understood grading rule.

## Coverage included by the exporter

Foreign Languages bank families:
- `src/Data/ExerciseData`;
- direct quiz-time banks named `*questions.js`;
- `src/Data/Practicetests`;
- `src/Data/ReadingAssignments`;
- `src/Data/ListeningAssignments`.

Reasoning:
- Uses the active Activity Player's runtime question-resolution rules for currently learner-facing L1 Stages 1–3 and L2 Stage 1.
- Exports from calibrated/runtime questions, not incomplete raw/canonical copies.
- Excludes L1 Stage 4 and later because those stages are not currently accepted learner-facing content. Revisit that scope only after the relevant stages are approved.

Supported answer formats detected by the current exporter include choice-index answers, typed exact-text answers, matching pairs, word ordering, multi-select, word categorisation, and Reasoning multiple choice. Unknown formats or malformed answer keys are reported as issues; the exporter removes any previous generated manifest and exits unsuccessfully rather than creating a partial or stale manifest.

## Run and verify locally

Run from Command Prompt in `D:\Backend` after the `secure-grading-hardening` branch is checked out. The exporter uses the Next.js/SWC package from the local frontend repository; if Next.js is missing there, install the frontend's locked dependencies first.

```bat
npm run secure-grading:check-answer-key-tools
npm run secure-grading:export-answer-keys
```

Expected first-command output includes:

```
Secure grading answer-key registry tests passed.
```

The JavaScript files have passed a static syntax check in this session, but the actual Node/npm command and exporter have **not** yet been run on the owner's Windows checkout. The export should report counts for Foreign Languages and Reasoning and write the manifest only if there are **zero unresolved issues**. If it stops with an issue count, inspect `data\secure-grading\answer-key-export-audit.json`; do not bypass the check or hand-create answer keys. Resolve the specific source-format or runtime-bank issue and rerun the export. No export result or generated manifest has yet been verified from the owner's Windows environment.

## Boundaries

- This is a key-source/export preparation step only. There is no new grading API route and no frontend player cutover in this branch.
- The manifest is not safe to import into frontend code, serve in API responses, or copy into `Aprioriedunext`.
- No question bank is altered by the exporter.
- No database, separate Render service, new dependency, or service setting is required by these changes.
- The existing live Render service auto-deploys from `main`; this branch is not `main` and no deployment has been requested.
- The plan remains at 8 major checkpoints (expected range 8–10; maximum 11 before a revised estimate is agreed with the owner).
