# Backend Documentation

This repository is the shared Node/Express backend used by Apriori Edu Next / Upskilleduonline.

## Repository relationship

- Frontend repository: `Upskilledusolutions/Aprioriedunext`
- Backend repository: `Upskilledusolutions/Backend`
- Frontend backend URL: `NEXT_PUBLIC_BACKENDURL`
- Render production service: `Backend`
- Production branch: `main`

Reasoning-specific backend contracts are documented in `REASONING_INTEGRATION.md`.

The frontend Reasoning documentation remains the product source of truth for learner-facing requirements, curriculum, acceptance criteria and verification. This repository documents the server implementation that satisfies those requirements.

## Safety rule

Do not create duplicate Auth models, duplicate learner identities or undocumented Reasoning endpoints. The existing `models/Authmodel.js` export is the shared Auth model authority.
