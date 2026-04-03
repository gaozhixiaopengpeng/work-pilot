import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const cliEntry = path.join(projectRoot, 'dist', 'cli', 'index.js');

const CASE_TIMEOUT_MS = 30_000;

/**
 * 无副作用冒烟用例：仅覆盖帮助、版本与 dry-run 路径。
 * 目标是发布前快速确认所有公开命令可调用且退出码正常。
 */
const cases = [
  ['--help'],
  ['--version'],
  ['day', '--help'],
  ['week', '--help'],
  ['month', '--help'],
  ['commit', '--help'],
  ['copy', '--help'],
  ['day', '--dry-run'],
  ['day', 'yesterday', '--dry-run'],
  ['day', 'last', '--dry-run'],
  ['day', '2024-01-01', '--dry-run'],
  ['day', '--from', '2026-01-01', '--to', '2026-01-01', '--dry-run'],
  ['week', '--dry-run'],
  ['week', 'last', '--dry-run'],
  ['week', '1', '--dry-run'],
  ['week', '--from', '2026-W10', '--to', '2026-W16', '--dry-run'],
  ['month', '--dry-run'],
  ['month', 'last', '--dry-run'],
  ['month', '1', '--dry-run'],
  ['month', '--from', '2026-01', '--to', '2026-03', '--dry-run'],
  ['copy', '--text', 'smoke'],
];

function runOne(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cliEntry, ...args], {
      cwd: projectRoot,
      env: {
        ...process.env,
        NO_COLOR: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let killedByTimeout = false;

    const timer = setTimeout(() => {
      killedByTimeout = true;
      child.kill('SIGTERM');
    }, CASE_TIMEOUT_MS);

    child.stdout.on('data', (d) => {
      stdout += String(d);
    });
    child.stderr.on('data', (d) => {
      stderr += String(d);
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({
        args,
        code: code ?? 1,
        signal: signal ?? null,
        stdout,
        stderr,
        killedByTimeout,
      });
    });
  });
}

async function main() {
  let failed = 0;

  console.log(`CLI smoke start: ${cases.length} cases`);
  for (const args of cases) {
    const cmdText = `node dist/cli/index.js ${args.join(' ')}`.trim();
    process.stdout.write(`\n[RUN ] ${cmdText}\n`);
    const result = await runOne(args);
    if (result.code === 0 && !result.killedByTimeout) {
      process.stdout.write(`[PASS] ${cmdText}\n`);
      continue;
    }

    failed += 1;
    process.stderr.write(`[FAIL] ${cmdText}\n`);
    process.stderr.write(`  exit=${result.code} signal=${result.signal ?? 'none'} timeout=${result.killedByTimeout}\n`);
    if (result.stdout.trim()) {
      process.stderr.write('  stdout:\n');
      process.stderr.write(result.stdout + (result.stdout.endsWith('\n') ? '' : '\n'));
    }
    if (result.stderr.trim()) {
      process.stderr.write('  stderr:\n');
      process.stderr.write(result.stderr + (result.stderr.endsWith('\n') ? '' : '\n'));
    }
  }

  if (failed > 0) {
    process.stderr.write(`\nCLI smoke failed: ${failed}/${cases.length}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`\nCLI smoke passed: ${cases.length}/${cases.length}\n`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  process.stderr.write(message + '\n');
  process.exitCode = 1;
});
