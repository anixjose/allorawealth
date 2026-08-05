/**
 * Fallback local Postgres runner for environments without Docker (e.g. this
 * sandbox). Boots a self-contained `embedded-postgres` cluster on disk under
 * `.local-db/`, matching the credentials in docker-compose.yml / .env.example
 * so the rest of the app doesn't need to know which one is running.
 *
 * Usage: node scripts/local-db.mjs dev    (port 5432, db investment_platform, persistent)
 *        node scripts/local-db.mjs test   (port 5433, db investment_platform_test, persistent)
 */
import EmbeddedPostgres from 'embedded-postgres';
import path from 'node:path';
import fs from 'node:fs';

const target = process.argv[2] ?? 'dev';

const configs = {
  dev: { dir: '.local-db/dev', port: 5432, db: 'investment_platform' },
  test: { dir: '.local-db/test', port: 5433, db: 'investment_platform_test' },
};

const config = configs[target];
if (!config) {
  console.error(`Unknown target "${target}". Use "dev" or "test".`);
  process.exit(1);
}

async function main() {
  const databaseDir = path.join(process.cwd(), config.dir);
  const pg = new EmbeddedPostgres({
    databaseDir,
    user: 'platform',
    password: 'platform',
    port: config.port,
    persistent: true,
  });

  const isNew = !fs.existsSync(path.join(databaseDir, 'PG_VERSION'));
  if (isNew) {
    await pg.initialise();
  }
  await pg.start();

  if (isNew) {
    await pg.createDatabase(config.db);
  }

  console.log(`Postgres (${target}) listening on port ${config.port}, database "${config.db}"`);
  console.log('Press Ctrl+C to stop.');

  const shutdown = async () => {
    console.log(`\nStopping Postgres (${target})...`);
    await pg.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
