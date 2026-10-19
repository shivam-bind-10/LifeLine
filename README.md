# LifeLine

Find nearby emergency help from volunteers and service providers for blood, oxygen, transport, hospital beds, and medicine.

> LifeLine connects volunteers and providers. It is not a replacement for emergency services. In a life-threatening emergency call 112 (India) or 108 (ambulance) immediately.

## Local setup

1. Install Node.js 22.12 or newer and Docker Compose.
2. Install dependencies with `npm ci`.
3. Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env.local`.
4. Start PostgreSQL and Redis with `docker compose up -d`.
5. Start both applications with `npm run dev`.

The client runs at [http://localhost:3000](http://localhost:3000). The API health check is at [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health).

## Validation

Run `npm run lint`, `npm test`, and `npm run build` from the repository root.
