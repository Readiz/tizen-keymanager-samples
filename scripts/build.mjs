#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apps = [
  { name: 'KmKeyWriter', folder: 'writer', appIdField: 'writerAppId' },
  { name: 'KmKeyReader', folder: 'reader', appIdField: 'readerAppId' }
];

function usage() {
  return 'Usage: npm run build | npm run build:signed -- --profile PROFILE [--tizen PATH]';
}

function parseArgs(argv) {
  const signed = argv.includes('--signed');
  const rest = argv.filter((arg) => arg !== '--signed');
  let profile = '';
  let tizen = 'tizen';
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--profile' && rest[i + 1]) profile = rest[++i];
    else if (arg === '--tizen' && rest[i + 1]) tizen = rest[++i];
    else throw new Error(`Unknown or incomplete option: ${arg}\n${usage()}`);
  }
  if (signed && !profile) throw new Error(`--profile is required for signed WGTs.\n${usage()}`);
  if (!signed && (profile || tizen !== 'tizen')) throw new Error(`--profile and --tizen are only valid with build:signed.\n${usage()}`);
  return { signed, profile, tizen };
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: 'inherit',
      shell: false,
      windowsHide: true
    });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} failed (${signal || `exit ${code}`})`));
    });
  });
}

async function getPython() {
  for (const candidate of [process.env.PYTHON ?? '', 'python3', 'python']) {
    if (!candidate) continue;
    try {
      await run(candidate, ['-c', 'import sys; sys.version_info >= (3, 9) or sys.exit(1)']);
      return candidate;
    } catch {
      // Try the next executable and report one actionable error if none work.
    }
  }
  throw new Error('Python 3.9+ is required; install Python and retry.');
}

async function prepare(python, output) {
  await run(python, [path.join(root, 'scripts', 'build_web.py'), 'prepare', '--root', root, '--output', output]);
}

async function buildUnsigned(python) {
  const stage = path.join(root, 'build', 'web');
  const output = path.join(root, 'dist', 'unsigned');
  await rm(stage, { recursive: true, force: true });
  await rm(output, { recursive: true, force: true });
  await prepare(python, stage);
  await mkdir(output, { recursive: true });
  for (const app of apps) {
    const project = path.join(stage, app.folder);
    const wgtPath = path.join(output, `${app.name}.wgt`);
    await run(python, [path.join(root, 'scripts', 'build_web.py'), 'package', '--project', project, '--output', wgtPath]);
    const config = JSON.parse(await readFile(path.join(root, 'samples.config.json'), 'utf8'));
    await run(python, [path.join(root, 'scripts', 'build_web.py'), 'verify', '--wgt', wgtPath, '--app-id', config[app.appIdField]]);
    console.log(`Created unsigned WGT: ${path.relative(root, wgtPath)}`);
  }
  const lines = [];
  for (const app of apps) {
    const name = `${app.name}.wgt`;
    const bytes = await readFile(path.join(output, name));
    lines.push(`${createHash('sha256').update(bytes).digest('hex')}  ${name}`);
  }
  await writeFile(path.join(output, 'SHA256SUMS'), `${lines.join('\n')}\n`, 'utf8');
}

async function findFreshWgt(project, before) {
  const children = await readdir(project, { withFileTypes: true });
  const candidates = [];
  for (const entry of children) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.wgt')) continue;
    const file = path.join(project, entry.name);
    const info = await stat(file);
    if (!before.has(entry.name) || info.mtimeMs >= before.get(entry.name)) candidates.push(file);
  }
  if (candidates.length !== 1) {
    throw new Error(`Expected exactly one new WGT from the Tizen CLI in ${project}; found ${candidates.length}.`);
  }
  return candidates[0];
}

async function inspectSignedWgt(python, wgt, expectedAppId) {
  await run(python, [path.join(root, 'scripts', 'build_web.py'), 'verify', '--wgt', wgt, '--app-id', expectedAppId, '--signed']);
}

async function buildSigned(python, profile, tizen) {
  const stage = path.join(root, 'build', 'signed');
  const output = path.join(root, 'dist', 'signed');
  await rm(stage, { recursive: true, force: true });
  await rm(output, { recursive: true, force: true });
  await prepare(python, stage);
  await mkdir(output, { recursive: true });
  const config = JSON.parse(await readFile(path.join(root, 'samples.config.json'), 'utf8'));
  for (const app of apps) {
    const project = path.join(stage, app.folder);
    const before = new Map();
    for (const entry of await readdir(project, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.wgt')) {
        before.set(entry.name, (await stat(path.join(project, entry.name))).mtimeMs);
      }
    }
    try {
      await run(tizen, ['package', '-t', 'wgt', '-s', profile, '--', '.'], { cwd: project });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        throw new Error(`Tizen CLI not found (${tizen}). Install the Samsung TV Tizen SDK or pass --tizen /path/to/tizen.`);
      }
      throw error;
    }
    const produced = await findFreshWgt(project, before);
    const expectedAppId = config[app.appIdField];
    await inspectSignedWgt(python, produced, expectedAppId);
    const destination = path.join(output, `${app.name}.wgt`);
    await copyFile(produced, destination);
    console.log(`Created signed WGT: ${path.relative(root, destination)}`);
  }
}

try {
  const args = parseArgs(process.argv.slice(2));
  const python = await getPython();
  if (args.signed) await buildSigned(python, args.profile, args.tizen);
  else await buildUnsigned(python);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
