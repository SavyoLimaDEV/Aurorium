
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const candidates = [
  resolve(root, 'node_modules', 'vite', 'bin', 'vite.js'),
  resolve(root, 'frontend', 'node_modules', 'vite', 'bin', 'vite.js')
];

const viteCli = candidates.find(existsSync);

if (!viteCli) {
  console.error('Vite nao encontrado. Execute npm install na raiz do projeto.');
  process.exit(1);
}

const processes = [];
let stopping = false;

function stop() {
  if (stopping) return;
  stopping = true;

  for (const child of processes) {
    if (child.exitCode === null && !child.killed) {
      child.kill();
    }
  }
}

function start(name, args, cwd) {
  const child = spawn(process.execPath, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
    windowsHide: false
  });

  processes.push(child);

  child.on('error', error => {
    console.error(`${name}: ${error.message}`);
    stop();
  });

  child.on('exit', code => {
    if (!stopping && code !== 0) {
      console.error(`${name} encerrado: ${code}`);
      stop();
    }
  });
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

start(
  'API',
  ['--experimental-sqlite', resolve(root, 'backend', 'server.mjs')],
  root
);

start(
  'Frontend',
  [viteCli, '--host', '127.0.0.1'],
  resolve(root, 'frontend')
);
