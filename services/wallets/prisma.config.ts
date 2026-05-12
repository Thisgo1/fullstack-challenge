import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'bun ./prisma/seed.ts',
    path: 'prisma/migrations'
  },
  datasource: {
    url: process.env.DATABASE_URL!
  }
});
