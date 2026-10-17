import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageName = process.argv[2];
if (!packageName) throw new Error('Pass the workspace package name.');

if (!process.env.TURBO_HASH) {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  execSync(`pnpm turbo run build --filter=${packageName}^...`, {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });
}
