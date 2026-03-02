/**
 * Builds the PostgreSQL connection URL from PG* environment variables.
 *
 * Required (PG*): PGHOST, PGUSER, PGPASSWORD, PGDATABASE
 * Optional: PGPORT (default 5432), PGSSLMODE (default require)
 *
 * Fallback: DATABASE_URL — used if PG* vars are not set.
 */
export function getConnectionUrl(): string {
  const host = process.env.PGHOST;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE;

  if (host && user && password && database) {
    const port = process.env.PGPORT ?? '5432';
    const sslmode = process.env.PGSSLMODE ?? 'require';
    const encodedPassword = encodeURIComponent(password);
    return `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}?sslmode=${sslmode}`;
  }

  const url = process.env.DATABASE_URL;
  if (url) {
    return url;
  }

  throw new Error(
    'Missing database config. Set PGHOST, PGUSER, PGPASSWORD, PGDATABASE (or DATABASE_URL).',
  );
}

/** Pool config with SSL that accepts RDS self-signed certs. Use for node-pg Pool. */
export function getPoolConfig(): {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: { rejectUnauthorized: boolean };
} {
  const host = process.env.PGHOST;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE;

  if (host && user && password && database) {
    const port = parseInt(process.env.PGPORT ?? '5432', 10);
    const useSsl =
      process.env.PGSSLMODE !== 'disable' && process.env.PGSSLMODE !== 'allow';
    return {
      host,
      port,
      user,
      password,
      database,
      ...(useSsl && {
        ssl: { rejectUnauthorized: false },
      }),
    };
  }

  const url = process.env.DATABASE_URL;
  if (url) {
    const useSsl =
      process.env.PGSSLMODE !== 'disable' && process.env.PGSSLMODE !== 'allow';
    return {
      connectionString: url,
      ...(useSsl && {
        ssl: { rejectUnauthorized: false },
      }),
    };
  }

  throw new Error(
    'Missing database config. Set PGHOST, PGUSER, PGPASSWORD, PGDATABASE (or DATABASE_URL).',
  );
}
