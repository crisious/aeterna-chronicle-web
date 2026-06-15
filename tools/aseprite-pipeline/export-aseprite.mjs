import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findAsepriteExecutable } from './find-aseprite.mjs';

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(TOOL_DIR, 'aseprite.config.json');

export function loadConfig() {
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
}

export function buildExportArgs({ sourceFile, sheetFile, dataFile, categoryConfig }) {
  const args = [
    '-b',
    sourceFile,
    '--list-tags',
    '--list-layers',
    '--format',
    'json-array',
    '--sheet-type',
    categoryConfig.sheetType,
    '--sheet',
    sheetFile,
    '--data',
    dataFile,
  ];

  if (categoryConfig.sheetType === 'packed') {
    args.push('--sheet-pack');
  }

  if (Number.isInteger(categoryConfig.sheetColumns) && categoryConfig.sheetColumns > 0) {
    args.push('--sheet-columns', String(categoryConfig.sheetColumns));
  }

  if (Number.isInteger(categoryConfig.sheetRows) && categoryConfig.sheetRows > 0) {
    args.push('--sheet-rows', String(categoryConfig.sheetRows));
  }

  return args;
}

export function resolveExportTarget(config, category, sourceFile) {
  const basename = path.basename(sourceFile, path.extname(sourceFile));
  const exportDir = path.join(config.exportRoot, category);

  return {
    sheetFile: path.join(exportDir, `${basename}.png`),
    dataFile: path.join(exportDir, `${basename}.aseprite.json`),
  };
}

function isSubPath(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath);

  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

export function resolveSourceFile(config, category, sourceFile) {
  const categoryRoot = path.resolve(config.sourceRoot, category);
  const resolvedSourceFile = path.resolve(sourceFile);
  const extension = path.extname(resolvedSourceFile).toLowerCase();

  if (!isSubPath(categoryRoot, resolvedSourceFile)) {
    throw new Error(`Aseprite source file must be inside ${categoryRoot}: ${sourceFile}`);
  }

  if (extension !== '.ase' && extension !== '.aseprite') {
    throw new Error(`Aseprite source file must use .ase or .aseprite extension: ${sourceFile}`);
  }

  return path.relative(process.cwd(), resolvedSourceFile) || resolvedSourceFile;
}

export function exportAseprite({ category, sourceFile, asepriteExe, dependencies = {} }) {
  const {
    loadConfig: loadConfigDependency = loadConfig,
    findAsepriteExecutable: findAsepriteExecutableDependency = findAsepriteExecutable,
    mkdirSync: mkdirSyncDependency = mkdirSync,
    spawnSync: spawnSyncDependency = spawnSync,
  } = dependencies;
  const config = loadConfigDependency();
  const categoryConfig = config.categories?.[category];

  if (!categoryConfig) {
    throw new Error(`Unknown Aseprite category: ${category}`);
  }

  const resolvedAsepriteExe = asepriteExe ?? findAsepriteExecutableDependency();

  if (!resolvedAsepriteExe) {
    throw new Error('Aseprite executable not found. Run npm run art:aseprite:check or set ASEPRITE_EXE.');
  }

  const resolvedSourceFile = resolveSourceFile(config, category, sourceFile);
  const target = resolveExportTarget(config, category, resolvedSourceFile);
  mkdirSyncDependency(path.dirname(target.sheetFile), { recursive: true });

  const args = buildExportArgs({
    sourceFile: resolvedSourceFile,
    sheetFile: target.sheetFile,
    dataFile: target.dataFile,
    categoryConfig,
  });

  const result = spawnSyncDependency(resolvedAsepriteExe, args, {
    encoding: 'utf8',
    windowsHide: true,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr ? `\n${result.stderr}` : '';
    const stdout = result.stdout ? `\n${result.stdout}` : '';
    throw new Error(`Aseprite export failed with status ${result.status}.${stderr}${stdout}`);
  }

  return target;
}

function normalizeEntrypointPath(candidate, platform) {
  const normalized = path.normalize(path.resolve(candidate));

  return platform === 'win32' ? normalized.toLowerCase() : normalized;
}

export function isCliEntrypoint(argvPath = process.argv[1], moduleUrl = import.meta.url, platform = process.platform) {
  if (!argvPath) {
    return false;
  }

  const modulePath = fileURLToPath(moduleUrl);

  return normalizeEntrypointPath(modulePath, platform) === normalizeEntrypointPath(argvPath, platform);
}

if (isCliEntrypoint()) {
  const [, , category, sourceFile] = process.argv;

  if (!category || !sourceFile) {
    console.error('Usage: node tools/aseprite-pipeline/export-aseprite.mjs <category> <source-file>');
    process.exit(1);
  }

  try {
    console.log(JSON.stringify(exportAseprite({ category, sourceFile }), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
