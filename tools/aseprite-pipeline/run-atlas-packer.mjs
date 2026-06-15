import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const packerPath = path.join(repoRoot, 'tools', 'p21_atlas_packer.py');

function candidateList() {
  const home = os.homedir();
  return [
    process.env.AETERNA_PYTHON_EXE ? { command: process.env.AETERNA_PYTHON_EXE, args: [] } : null,
    process.env.PYTHON ? { command: process.env.PYTHON, args: [] } : null,
    {
      command: path.join(home, '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'python', 'python.exe'),
      args: [],
    },
    { command: 'python', args: [] },
    { command: 'py', args: ['-3'] },
  ].filter(Boolean);
}

function hasPillow(candidate) {
  const result = spawnSync(candidate.command, [...candidate.args, '-c', 'from PIL import Image'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'ignore',
  });
  return result.status === 0;
}

const python = candidateList().find(hasPillow);

if (!python) {
  console.error('No Python runtime with Pillow found. Set AETERNA_PYTHON_EXE to a Python executable with Pillow installed.');
  process.exit(1);
}

const result = spawnSync(
  python.command,
  [...python.args, packerPath, ...process.argv.slice(2)],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 1);
