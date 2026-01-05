import { defineConfig } from '@prisma/config';

try {
  process.loadEnvFile();
} catch {
  // no .env file
}

export default defineConfig({
  migrations: {
    seed: './prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL || '',
  },
});

