import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const globalForPrisma = globalThis as typeof globalThis & {
  lifelinePrisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL must be configured before using the database.',
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export const prisma =
  process.env.NODE_ENV === 'production'
    ? createPrismaClient()
    : (globalForPrisma.lifelinePrisma ??= createPrismaClient());
