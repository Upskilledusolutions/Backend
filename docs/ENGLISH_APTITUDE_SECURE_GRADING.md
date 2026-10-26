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

## Tests

Existing grading unit tests:

```cmd
npm run test:english-aptitude-grading
```

Route security tests:

```cmd
npm run test:english-aptitude-route-security
```

The route security suite verifies that the real shared authentication middleware rejects requests without a session, the route remains disabled unless its feature flag is explicitly enabled, client-supplied correctness is ignored, and grading responses do not expose answer-key fields. The route-level flag/response checks use an isolated authentication stub so they do not require a database; this does not replace end-to-end authenticated testing against a configured backend.

## Answer-key synchronization

The server answer-key file is generated from the frontend's editable story bank to reduce manual drift. From the Backend repository, with both repositories cloned as sibling folders on the same drive, run:

```cmd
npm run sync:english-aptitude-answer-keys -- ..\\Aprioriedunext\\content\\EnglishAptitude\\editable\\L1\\S1\\english-L1-S1-story-01.json
npm run check:english-aptitude-answer-keys -- ..\\Aprioriedunext\\content\\EnglishAptitude\\editable\\L1\\S1\\english-L1-S1-story-01.json
npm run test:english-aptitude-grading
npm run test:english-aptitude-route-security
```

The sync command writes only `data/englishAptitudeL1S1StoryAnswers.js` in this backend branch. The check command is read-only and fails if the generated server key differs from the editable bank. Repeat the check whenever that source bank changes. These commands do not deploy the backend or enable the feature flag.

This is a synchronization safeguard, not a substitute for moving answer keys out of the frontend bundle or reviewing the draft content before learner release.

## Checkpoint — 2026-10-26

The user ran `npm run test:english-aptitude-route-security` in the local Windows Backend checkout on branch `english-aptitude-secure-grading`. The suite passed: the real shared middleware returned 401 without a session; authenticated requests remained blocked with the feature flag disabled; when enabled only inside the isolated test, server grading ignored client-supplied correctness and responses did not expose answer/options/feedback-key fields; explanations were withheld for incorrect answers. During the run, the auth module logged a database connection warning: the configured connection string did not start with `mongodb://` or `mongodb+srv://`. The route suite still passed because its route-level checks use a test auth stub and the real middleware check only verifies unauthenticated rejection. Treat this warning as an unresolved local database configuration issue; this run does not verify a valid authenticated database-backed session.

Keep `ENGLISH_APTITUDE_PREVIEW_ENABLED` unset and do not merge or deploy. Next safe step: audit the frontend implementation and bundle for answer-key exposure, then design the smallest frontend change to submit selected answers to the server route. Do not enable the route or ship integration until client-side keys are removed and the backend is reachable with correctly configured auth/database settings.
