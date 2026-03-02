import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { getConnectionUrl } from './src/lib/db/connection';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: getConnectionUrl(),
  },
});
