/**
 * Jest globalSetup for e2e tests: loads .env.test (so DATABASE_URL points at
 * the test Postgres instance, not dev), applies pending migrations, and
 * runs the seed script (roles, chart of accounts, finance/approver/admin
 * users, demo investment product/opportunity). Idempotent — safe to run
 * every test session.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

function loadEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

module.exports = async function globalSetup() {
  loadEnvFile(path.join(__dirname, '..', '..', '.env.test'));

  execSync('npx prisma migrate deploy', {
    cwd: path.join(__dirname, '..', '..'),
    env: process.env,
    stdio: 'inherit',
  });
  execSync('npx prisma db seed', {
    cwd: path.join(__dirname, '..', '..'),
    env: process.env,
    stdio: 'inherit',
  });
};
