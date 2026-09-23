# Reasoning Backend Integration

**Status:** Implemented and deployed; live owner verification pending  
**Last updated:** 2026-09-23

This document is the backend-side companion to the Reasoning documentation in `Upskilledusolutions/Aprioriedunext`.

## 1. Current deployment

Backend production service:

- Render workspace: **Tech's workspace**
- Render service: **Backend**
- Repository: `Upskilledusolutions/Backend`
- Branch: `main`
- Reasoning implementation commit: `6c353c4529fe3b5c613deb3396f8a00b8d1ce500`
- Render state: **LIVE**
- Later documentation-only commits may appear as the latest Render deployment without changing the Reasoning implementation.
- Production URL: `https://backend-575y.onrender.com`

The backend uses automatic deployment from `main`. The implementation commit above is part of the live deployment chain; deployment history may subsequently show documentation-only commits.

## 2. Shared authentication and identity

Reasoning uses the existing shared Auth identity. It does not create a second login or learner account system.

The current server session is:

- cookie: `ups_auth_session`;
- HttpOnly;
- signed with HMAC-SHA256;
- session lifetime: 8 hours;
- production cookie: `SameSite=None; Secure`;
- signing secret: `AUTH_SESSION_SECRET`, stored only as a Render environment variable.

The server resolves the active learner from the existing Auth model. The browser must not be treated as the authority for learner identity.

### Important Auth model rule

`models/Authmodel.js` creates and exports the existing Auth model. Other files must import that model instead of compiling another `Auth` model on the same connection.

Backend commit `8005d16ca76afda782e5ae9fb82b01284870e119` removed duplicate Auth model registration from `routes/dynamicRoutes.js`.

## 3. Reasoning Level access

Reasoning access is stored in the shared Auth user record under:

`reasoningAccess`

Approved values:

```
reasoningL1
reasoningL2
reasoningL3
reasoningL4
reasoningL5
reasoningL6
reasoningL7
reasoningL8
reasoningL9
```

This is separate from the Foreign Languages `next` field.

### Access endpoints

```
GET /api/reasoning/access/:userId
PUT /api/reasoning/access/:userId
```

Authorization rules:

- authenticated learners can read only their own Reasoning access;
- authenticated administrators can read/manage another learner's access;
- learners cannot modify Reasoning access;
- Level access is selective, not progressive;
- changing access does not reset, replace or migrate existing Reasoning learning records.

The backend is the authorization authority for these operations.

## 4. Durable Reasoning question-attempt persistence

Reasoning attempts use a separate database namespace:

```
Database: Reasoning
Collection: question_attempts
Model: ReasoningQuestionAttempt
```

### Endpoints

```
POST /api/reasoning/attempts
GET  /api/reasoning/attempts
```

### Stored fields

The current foundation records:

- authenticated `userId`;
- `activityAttemptId`;
- stable `questionId`;
- track;
- Level and Stage;
- Explore/Extend half;
- Activity and Module;
- optional topic, concept, question type, content mode and difficulty metadata;
- selected and correct response values;
- correctness for answered attempts;
- response status (`answered` or `expired`);
- time limit;
- response time;
- recording/timestamp fields.

A unique index on `userId + activityAttemptId + questionId` makes the write idempotent for the same learner/activity/question combination.

### Ownership and access checks

The POST endpoint derives learner ownership from the authenticated session and does not trust a browser-supplied `userId`.

The POST endpoint also requires the authenticated learner to have the corresponding Reasoning Level access.

The GET endpoint automatically scopes results to the authenticated learner.

The endpoint does not expose the stored `correctAnswer` field in GET responses.

## 5. Current grading boundary

The durable attempt layer is a capture foundation, not the final authoritative grading engine.

The active Reasoning question banks remain in the frontend repository. Therefore the current frontend Activity Player supplies the recorded correctness value and response metadata.

The server is authoritative for:

- learner identity;
- Level access authorization;
- ownership of persisted attempts;
- storage and retrieval separation.

The server is not yet independently resolving the correct answer from a backend Question Bank.

Future authoritative grading can be introduced without changing the shared learner identity or the Reasoning data namespace.

## 6. Frontend integration

The frontend Activity Player uses:

`src/utils/reasoningAttempts.js`

and records:

- answered questions when the learner submits an answer;
- timed-out questions when the per-question timer expires.

The implementation is in frontend commit:

`e22ccb1bc800f41689fc62a07c52b664783c3cfb`

The corresponding Vercel production deployment is **READY**.

## 7. Foreign Languages separation

Reasoning data must not be merged into:

- Foreign Languages `next` access;
- Foreign Languages `completedQuizzes`;
- Foreign Languages performance/score structures;
- Foreign Languages leaderboard data.

The Reasoning attempt store is separate.

Existing legacy Foreign Languages endpoints remain outside the Reasoning persistence boundary unless they are explicitly remediated in a future approved security project.

## 8. Environment and deployment contract

Required runtime environment includes:

- `DB_URI`;
- `AUTH_SESSION_SECRET`;
- `PORT` may use Render's supplied port/default behavior.

Never place any secret value in GitHub documentation or source code.

The current Render service is configured as a Node web service with:

- build command: `npm install`;
- start command: `node index.js`;
- port: `10000`;
- auto-deploy from `main`.

## 9. Verification status

The implementation and deployments are complete.

The remaining verification gate is a live production test covering:

1. authorized learner access;
2. unauthorized Level rejection;
3. learner inability to modify access;
4. administrator access assignment/removal;
5. answered-attempt persistence;
6. timed-out-attempt persistence;
7. correct learner ownership;
8. separation from Foreign Languages records.

Until this is verified, describe the Reasoning backend as **implemented/deployed, verification pending**.

## 10. Cross-repository source of truth

Use the frontend Reasoning documents for product requirements and acceptance:

- `Aprioriedunext/docs/REASONING_DEVELOPMENT_STATUS.md`
- `Aprioriedunext/docs/DATA_AND_PROGRESS.md`
- `Aprioriedunext/docs/PRODUCT_ARCHITECTURE.md`
- `Aprioriedunext/docs/REASONING_PROFILE_MASTERY_ANALYTICS_AND_LEVEL_ACCESS.md`
- `Aprioriedunext/docs/REASONING_STAGE_LAUNCH_AND_VERIFICATION_STANDARD.md`
- `Aprioriedunext/docs/REASONING_STAGE_1_3_VERIFICATION_RECORD.md`
- `Aprioriedunext/docs/REASONING_REMEDIATION_HISTORY.md`

Use this document for the corresponding backend implementation contract.

## 11. Build and change discipline

Before changing a Reasoning backend contract:

```
inspect frontend requirement
        ↓
inspect current Backend implementation
        ↓
make one coherent backend change
        ↓
validate syntax/route/model consistency
        ↓
deploy to Render
        ↓
verify exact commit
        ↓
update both repositories' documentation
```

Do not infer backend behavior from an old frontend documentation entry when the current backend implementation is newer. Update the relevant cross-repository documentation together.

