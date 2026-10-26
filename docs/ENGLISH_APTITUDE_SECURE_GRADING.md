# English Aptitude Secure Grading — Backend Feature Branch

**Branch:** `english-aptitude-secure-grading`  
**Base:** Backend `main` (unchanged)  
**Status:** Draft implementation; not merged or deployed.

## Scope

- Adds an English Aptitude-only `POST /api/english-aptitude/grade` route protected by the existing `requireAuth` session middleware.
- Uses a backend-only answer-key allowlist for the 16 single-select questions in `ENG-L1-S1-EXP-01`.
- Accepts only activity ID, question ID and selected option text. The browser cannot submit its own correctness value or answer key.
- Returns correctness and feedback; explanation is returned only after a correct response.
- Route is disabled unless `ENGLISH_APTITUDE_PREVIEW_ENABLED=true`. Keep this unset until the feature is reviewed and deliberately deployed.
- Adds isolated grading logic and tests without modifying shared Auth, Reasoning, Foreign Languages, or the production backend branch.

## Important limitations

- This is a bounded preview grader, not a complete content-delivery or persistence API.
- Answer keys are duplicated from the frontend editable bank; this is intentional for the isolated proof-of-concept but creates a synchronization obligation. Before enabling, reconcile keys against the approved source bank and move to a maintained canonical server-side content source.
- It does not save attempts or analytics and does not add English Aptitude entitlement fields. Existing authentication confirms active shared-account identity only; any selective product access policy must be defined before release.
- Do not merge/deploy until the frontend removes answer keys from its client bundle, server grading is integrated, auth/access requirements are agreed, and regression/security tests pass.

## Test

`npm run test:english-aptitude-grading`


## Answer-key synchronization

The server answer-key file is generated from the frontend's editable story bank to reduce manual drift. From the Backend repository, with both repositories cloned as sibling folders on the same drive, run:

```cmd
npm run sync:english-aptitude-answer-keys -- ..\\Aprioriedunext\\content\\EnglishAptitude\\editable\\L1\\S1\\english-L1-S1-story-01.json
npm run check:english-aptitude-answer-keys -- ..\\Aprioriedunext\\content\\EnglishAptitude\\editable\\L1\\S1\\english-L1-S1-story-01.json
npm run test:english-aptitude-grading
```

The sync command writes only `data/englishAptitudeL1S1StoryAnswers.js` in this backend branch. The check command is read-only and fails if the generated server key differs from the editable bank. Repeat the check whenever that source bank changes. These commands do not deploy the backend or enable the feature flag.

This is a synchronization safeguard, not a substitute for moving answer keys out of the frontend bundle or reviewing the draft content before learner release.
