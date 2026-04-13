import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)

const electronBinary = require('electron')
const electronVersion = require('electron/package.json').version
const nativeModules = ['better-sqlite3']
const defaultMirror = 'https://npmmirror.com/mirrors/better-sqlite3'
const githubReleaseHost = 'https://github.com/WiseLibs/better-sqlite3/releases/download'
const probeScript = `
try {
  const Database = require('better-sqlite3')
  const db = new Database(':memory:')
  db.close()
  process.stdout.write('native-ok')
  process.exit(0)
} catch (error) {
  process.stderr.write(String(error?.stack ?? error))
  process.exit(42)
}
`

function resolvePackageManager() {
  const execPath = process.env.npm_execpath
  if (execPath) {
    return { command: process.execPath, prefixArgs: [execPath] }
  }
  return { command: 'pnpm', prefixArgs: [] }
}

function runPackageManager(args, env = process.env, label = 'package manager') {
  const { command, prefixArgs } = resolvePackageManager()
  const result = spawnSync(command, [...prefixArgs, ...args], {
    stdio: 'inherit',
    env,
  })
  if (result.status !== 0) {
    if (result.error) {
      console.error(`native:electron failed to run ${label}: ${result.error.message}`)
    }
    process.exit(result.status ?? 1)
  }
}

function probeNative() {
  return spawnSync(electronBinary, ['-e', probeScript], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
    },
    encoding: 'utf8',
  })
}

function prebuildEnv(overrides = {}) {
  return {
    ...process.env,
    npm_config_runtime: 'electron',
    npm_config_target: electronVersion,
    npm_config_arch: process.arch,
    npm_config_cache:
      process.env.npm_config_cache ?? path.join(os.tmpdir(), 'lolpro-npm-cache-electron-native'),
    ...overrides,
  }
}

function tryPrebuild(label, env) {
  console.log(`native:electron trying prebuilt native modules (${label})...`)
  const { command, prefixArgs } = resolvePackageManager()
  const prebuild = spawnSync(command, [...prefixArgs, 'rebuild', ...nativeModules], {
    stdio: 'inherit',
    env,
  })
  if (prebuild.status !== 0 && prebuild.error) {
    console.error(`native:electron prebuild failed to start: ${prebuild.error.message}`)
  }
  if (prebuild.status === 0) {
    const postProbe = probeNative()
    if (postProbe.status === 0 && postProbe.stdout?.includes('native-ok')) {
      console.log('native:electron prebuilt restore complete')
      process.exit(0)
    }
  }
}

function hasWindowsBuildTools() {
  if (process.platform !== 'win32') return true
  const result = spawnSync('where', ['cl'], { encoding: 'utf8' })
  return result.status === 0 && String(result.stdout || '').trim().length > 0
}

function listDirs(p) {
  try {
    return fs
      .readdirSync(p, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  } catch {
    return []
  }
}

function pickLatestVersion(dir) {
  const versions = listDirs(dir)
  const sorted = versions
    .map((v) => v.split('.').map((n) => Number(n)))
    .filter((parts) => parts.every((n) => Number.isFinite(n)))
    .sort((a, b) => {
      for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
        const diff = (a[i] || 0) - (b[i] || 0)
        if (diff !== 0) return diff
      }
      return 0
    })
  if (!sorted.length) return ''
  return sorted[sorted.length - 1].join('.')
}

function resolveMsvcBin() {
  if (process.platform !== 'win32') return ''
  const roots = [
    path.join('C:\\', 'Program Files (x86)', 'Microsoft Visual Studio'),
    path.join('C:\\', 'Program Files', 'Microsoft Visual Studio'),
  ]
  const editions = new Set(['BuildTools', 'Community', 'Professional', 'Enterprise'])
  for (const root of roots) {
    for (const versionDir of listDirs(root)) {
      const base = path.join(root, versionDir)
      for (const edition of editions) {
        const vcRoot = path.join(base, edition, 'VC', 'Tools', 'MSVC')
        const latest = pickLatestVersion(vcRoot)
        if (!latest) continue
        const candidate = path.join(vcRoot, latest, 'bin', 'Hostx64', 'x64')
        if (fs.existsSync(path.join(candidate, 'cl.exe'))) {
          return candidate
        }
      }
    }
  }
  return ''
}

const probe = probeNative()

if (probe.status === 0 && probe.stdout?.includes('native-ok')) {
  console.log('native:electron up to date, skip rebuild')
  process.exit(0)
}

console.log('native:electron mismatch detected, rebuilding...')
if (probe.stderr?.trim()) {
  console.log(probe.stderr.trim())
}

const mirror =
  process.env.npm_config_better_sqlite3_binary_host_mirror ??
  process.env.npm_config_better_sqlite3_binary_host ??
  defaultMirror

tryPrebuild(`mirror: ${mirror}`, prebuildEnv({ npm_config_better_sqlite3_binary_host_mirror: mirror }))

if (!process.env.npm_config_better_sqlite3_binary_host) {
  tryPrebuild('GitHub releases', prebuildEnv({ npm_config_better_sqlite3_binary_host: githubReleaseHost }))
}

let msvcBin = ''
if (!hasWindowsBuildTools()) {
  msvcBin = resolveMsvcBin()
}
if (!hasWindowsBuildTools() && !msvcBin) {
  console.error(
    [
      'native:electron local rebuild requires MSVC Build Tools, but cl.exe was not found.',
      'Install Visual Studio Build Tools 2022 with "Desktop development with C++" (MSVC v143 + Windows SDK).',
      'Then reopen your terminal and rerun: pnpm run native:electron',
      'If you want to avoid local builds, ensure prebuilt binaries are available for your Electron version,',
      'or set npm_config_better_sqlite3_binary_host to a mirror that hosts them.',
    ].join('\n'),
  )
  process.exit(1)
}

const rebuildEnv = msvcBin
  ? {
      ...process.env,
      PATH: `${msvcBin};${process.env.PATH ?? ''}`,
    }
  : process.env

runPackageManager(['exec', 'electron-builder', 'install-app-deps'], rebuildEnv, 'electron-builder')
runPackageManager(
  ['exec', 'electron-rebuild', '-f', '-w', nativeModules.join(',')],
  rebuildEnv,
  'electron-rebuild',
)
console.log('native:electron rebuild complete')
