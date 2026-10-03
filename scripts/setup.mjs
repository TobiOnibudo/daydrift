#!/usr/bin/env node
// Idempotent local provisioning: .env -> docker -> wait-healthy -> migrate -> seed.
// Safe to re-run; each step skips when already satisfied. See docs/12-developer-experience.md.
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });
const step = (msg) => console.log(`\n→ ${msg}`);

// 1. Seed .env from the example only if missing (never clobber).
const envPath = resolve(root, '.env');
if (existsSync(envPath)) {
  step('.env already exists — leaving it untouched');
} else {
  step('Creating .env from .env.example');
  copyFileSync(resolve(root, '.env.example'), envPath);
  console.log('  Edit .env to set a real AUTH_SECRET before deploying.');
}

// 2. Start backing services.
step('Starting docker-compose (Postgres + Redis)');
run('docker compose up -d');

// 3. Wait for health so migrations never race a cold database.
step('Waiting for containers to report healthy');
const deadline = Date.now() + 60_000;
const healthy = (name) => {
  try {
    const out = execSync(`docker inspect --format "{{.State.Health.Status}}" ${name}`, {
      cwd: root,
    })
      .toString()
      .trim();
    return out === 'healthy';
  } catch {
    return false;
  }
};
const services = ['daydrift-postgres-1', 'daydrift-redis-1'];
while (Date.now() < deadline) {
  if (services.every(healthy)) break;
  await new Promise((r) => setTimeout(r, 2000));
}
if (!services.every(healthy)) {
  console.warn('  Containers not healthy yet; continuing — re-run if migrate fails.');
}

// 4. Apply schema.
step('Running migrations');
run('pnpm db:migrate');

// 5. Seed a sample city so the app has data on first boot.
step('Seeding a sample city');
run('pnpm seed');

step('Setup complete. Run `pnpm dev` to start api + worker + web.');
