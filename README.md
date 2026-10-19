# LifeLine

Find nearby emergency help from volunteers and service providers for blood, oxygen, transport, hospital beds, and medicine.

> LifeLine connects volunteers and providers. It is not a replacement for emergency services. In a life-threatening emergency call 112 (India) or 108 (ambulance) immediately.

## Local setup

1. Install Node.js 22.12 or newer and Docker Compose.
2. Install dependencies with `npm ci`.
3. Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env.local`. Set a private development value for `SEED_PASSWORD` in `server/.env`.
4. Start PostgreSQL and Redis with `docker compose up -d`.
5. Start both applications with `npm run dev`.

The client runs at [http://localhost:3000](http://localhost:3000). The API health check is at [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health).

## Database and demo data

With PostgreSQL running and `server/.env` configured, run `npm run db:migrate --workspace @lifeline/server` and then `npm run db:seed --workspace @lifeline/server`. The repeatable seed creates one admin, 20 helpers, 10 unverified demo organizations, and 15 demo requests. All seeded accounts use the configured `SEED_PASSWORD`; demo contact details and organization listings are fictional and must not be used to request real emergency assistance.

## Authentication API

The API is prefixed with `/api/v1`. Authentication routes include `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /me`, and `PATCH /me`. Registration accepts requester and helper roles; admin accounts cannot be self-registered.

Passwords are hashed with bcrypt at cost 12. Access tokens expire after 15 minutes. Refresh tokens are opaque, stored as SHA-256 hashes, rotated on refresh, and sent only in an httpOnly cookie. Configure `JWT_ACCESS_SECRET` with at least 32 random characters. Protected API calls use `Authorization: Bearer <accessToken>`. In development, a password reset token is written to the API console; production reset requests return `503 PASSWORD_RESET_UNAVAILABLE` until an email-delivery provider is configured.

## Validation

Run `npm run lint`, `npm test`, and `npm run build` from the repository root.
