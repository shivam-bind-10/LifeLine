# Blockers

- `vercel.md`, required for the UI design tokens and future interface work, was not present in the workspace or the supplied build-plan attachment.
- Docker Compose is not installed in this environment, so the PostgreSQL and Redis containers cannot be started here.
- PostgreSQL is not available on localhost:5432 in this environment, so database migrations and seeding run in CI rather than on this machine.
- Password-reset email delivery is not configured; production reset requests return `503 PASSWORD_RESET_UNAVAILABLE` until a delivery provider is added.
