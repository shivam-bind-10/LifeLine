# Blockers

- The referenced `vercel.md` design guide was not supplied, so the interface uses the documented LifeLine design tokens rather than an unavailable external specification.
- Docker Compose and PostgreSQL are unavailable in this environment. CI applies the migrations against PostgreSQL 16, but a deployment database still needs provisioning and migration.
- Password-reset delivery is implemented through Resend. Production setup still requires a verified sender, `RESEND_API_KEY`, and public `CLIENT_URL`.
- No production hosting target, domain, database credentials, Resend credentials, or deployment secrets were supplied, so deployment and live-service verification cannot be performed from this workspace.
