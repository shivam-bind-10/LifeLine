# LifeLine

LifeLine connects people seeking community support with nearby volunteers for blood, oxygen, transport, medicine, and other urgent needs.

> LifeLine is not an emergency service. In India, call **112** or **108** for urgent medical help.

## Run locally

Requirements: Node.js 22.12+ and Docker Compose.

```powershell
npm ci
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env.local
docker compose up -d
```

Set private local values for `SEED_PASSWORD` and `JWT_ACCESS_SECRET` in `server\.env`. Then start the database schema and demo data:

```powershell
npm run db:migrate --workspace @lifeline/server
npm run db:seed --workspace @lifeline/server
npm run dev
```

- Web app: [http://localhost:3000](http://localhost:3000)
- API health: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)

The fictional demo accounts share the configured seed password. Demo organizations and contact details are not real emergency resources.

## What it includes

- Requester and volunteer accounts with protected sessions.
- Browse and create requests, volunteer matching, and assignment management.
- Private messaging and notifications for accepted requests.
- One review per participant after a request is fulfilled.
- Password reset flow. Development writes reset tokens to the API log; production email requires a verified Resend sender and `RESEND_API_KEY`.

## Checks

```powershell
npm run lint
npm test
npm run build
```

Production requires a PostgreSQL database, a unique `JWT_ACCESS_SECRET`, `CLIENT_URL`, `NEXT_PUBLIC_API_URL`, and configured reset-email credentials. Apply migrations with `npm run db:deploy --workspace @lifeline/server`; do not seed production.
