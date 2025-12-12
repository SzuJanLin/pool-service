import { defineConfig } from '@prisma/config';

try {
  process.loadEnvFile();
} catch {
  // no .env file
}

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || '',
  },
});

