import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

const environment = process.env['ENV'] ?? 'local';

if (!['local', 'production', 'test'].includes(environment)) {
  throw new Error(`Unsupported ENV: ${environment}`);
}

config({ path: `.env.${environment}`, quiet: true });

export default defineConfig({
  schema: 'schema.prisma',
  migrations: { path: 'migraciones' },
  datasource: { url: env('MANAGEMENT_DATABASE_URL') },
});
