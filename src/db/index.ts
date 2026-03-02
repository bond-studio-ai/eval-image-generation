import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { getPoolConfig } from '@/lib/db/connection';

const pool = new Pool(getPoolConfig());
export const db = drizzle(pool, { schema });
