# LifeLine Progress

## 2026-10-19

- Initialized the Next.js client and Express API workspace.
- Added PostgreSQL and Redis development services, Prisma configuration, the API health endpoint, and CI checks.
- Added an initial landing page and a health endpoint test.
- Verified the client and API start locally; `/api/v1/health` returns `{"status":"ok"}`.
- Updated Next.js, Tailwind, Vitest, and Prisma to patched release lines; `npm audit` reports no vulnerabilities.
- Generated the Prisma 7 client and verified a clean `npm ci`.
- Completed and pushed the initial foundation as `8582ca1`; GitHub Actions passed lint, tests, and build.
- Known issue: `vercel.md` was not included with the project or the pasted build plan.
- Known issue: Docker Compose is not installed in this environment, so the local PostgreSQL and Redis containers cannot be started here.

## 2026-10-20

- Added default brand, surface, warning, focus, and dark-mode tokens and wired them into Tailwind CSS.
- The initial GitHub Actions workflow completed successfully.
- Completed and pushed the design-token checkpoint as `533e24d`; GitHub Actions passed lint, tests, and build.
- Implemented the Day 2 Prisma schema, indexes, PostgreSQL client adapter, database error middleware, and repeatable fictional demo seed (1 admin, 20 helpers, 10 organizations, and 15 requests).
- Pushed the database milestone as `f17ac7a`; the GitHub Actions run applied migrations, seeded PostgreSQL, and passed lint, tests, and build.
- Day 2 local validation: Prisma schema validation, lint, 3 tests, both TypeScript builds, and `npm audit` passed.
- Implemented Day 3 registration/login, protected profiles, short-lived JWT access tokens, hashed and rotating httpOnly refresh cookies, password resets, account-block checks, and role guards.
- Day 3 local validation: lint, 20 tests, both TypeScript builds, Prisma validation, and dependency audit passed.
- Completed the app shell and sign-in/requester/helper registration UI. The client restores sessions through the refresh-cookie endpoint and keeps access tokens in memory rather than browser storage.
- Day 4 local validation: lint, all 20 API tests, and production client/server builds passed. The client UI was also checked in a local production preview.
- Implemented emergency request browsing, cursor pagination, category/urgency filters, requester-only request creation, and owner-only request history using the existing schema.
- Added public coordinate rounding so open requests don't disclose exact locations, and kept request details/addresses behind the owner-only endpoint.
- Day 5 local validation: lint, all 28 API tests, and production client/server builds passed.
- Next: add request response/acceptance workflows and volunteer availability matching.
- Known issue: Docker Compose and PostgreSQL are not installed locally; database migration and seed were validated in GitHub Actions instead.
- Known issue: production password-reset email delivery is not configured; the API reports this explicitly until a provider is added.
