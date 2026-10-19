# Decisions

- The repository uses npm workspaces to run the Next.js client and Express API from one root command.
- Day 1 starts with a minimal API health route and landing page; feature routes and the full Prisma schema remain in their planned days.
- Design tokens are deferred until the referenced `vercel.md` design system is available, rather than inventing a conflicting palette.
- Next.js, Tailwind, Vitest, and Prisma use patched major releases where needed to keep the initial dependency audit clear. The Prisma 7 client is generated into `server/generated/`, which is ignored and will be regenerated from the schema.
