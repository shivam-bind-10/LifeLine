import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

loadEnv({ path: resolve(process.cwd(), 'server', '.env') });

export default defineConfig({
  test: {
    include: ['server/src/**/*.test.ts'],
    environment: 'node',
  },
});
