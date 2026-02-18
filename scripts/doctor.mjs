import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'
import dns from 'node:dns/promises'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')

const OK = 'OK'
const WARN = 'WARN'
const FAIL = 'FAIL'

const checks = []

function parseMajor(version) {
  const m = String(version).match(/^v?(\d+)/)
  return m ? Number(m[1]) : NaN
}

function run(command) {
  try {
    const out = execSync(command, { stdio: ['ignore', 'pipe', 'pipe'] })
    return String(out).trim()
  } catch {
    return ''
  }
}

function add(status, title, details) {
  checks.push({ status, title, details })
}

function checkNode() {
  const major = parseMajor(process.version)
  if (major === 20) {
    add(OK, 'Node.js', `Detected ${process.version} (recommended major: 20).`)
    return
  }
  if (!Number.isFinite(major)) {
    add(FAIL, 'Node.js', `Cannot parse Node.js version: ${process.version}.`)
    return
  }
  add(WARN, 'Node.js', `Detected ${process.version}. Recommended major is 20 for this project.`)
}

function checkPnpm() {
  const pnpm = run('pnpm -v')
  if (!pnpm) {
    add(
      FAIL,
      'pnpm',
      'pnpm not found. Install with `corepack enable && corepack prepare pnpm@9.12.3 --activate`.',
    )
    return
  }
  add(OK, 'pnpm', `Detected pnpm ${pnpm}. packageManager: ${pkg.packageManager}.`)
}

async function checkGitHubDns() {
  try {
    const records = await dns.lookup('github.com', { all: true })
    const loopback = records.some((r) => r.address === '127.0.0.1' || r.address === '::1')
    if (loopback) {
      add(
        WARN,
        'DNS / GitHub',
        'github.com resolves to loopback (127.0.0.1 or ::1). Native prebuild downloads may fail.',
      )
      return
    }
    add(OK, 'DNS / GitHub', 'github.com DNS resolution looks normal.')
  } catch (error) {
    add(WARN, 'DNS / GitHub', `Cannot resolve github.com: ${String(error?.message ?? error)}`)
  }
}

function checkWindowsBuildTools() {
  if (process.platform !== 'win32') return
  const clPath = run('where cl')
  if (clPath) {
    add(OK, 'MSVC Build Tools', 'C++ toolchain detected (cl.exe found).')
    return
  }
  add(
    WARN,
    'MSVC Build Tools',
    'Not detected. Usually fine with prebuilt binaries, but local native rebuild may fail without it.',
  )
}

function checkMacBuildTools() {
  if (process.platform !== 'darwin') return
  const xcodePath = run('xcode-select -p')
  if (xcodePath) {
    add(OK, 'Xcode CLT', `Detected at ${xcodePath}.`)
    return
  }
  add(WARN, 'Xcode CLT', 'Not detected. Install with `xcode-select --install` for native modules.')
}

function printAndExit() {
  for (const c of checks) {
    console.log(`[${c.status}] ${c.title}: ${c.details}`)
  }

  const hasFail = checks.some((c) => c.status === FAIL)
  const hasWarn = checks.some((c) => c.status === WARN)
  if (hasFail) {
    console.log('\nEnvironment check failed. Fix FAIL items first.')
    process.exit(1)
  }
  if (hasWarn) {
    console.log('\nEnvironment check passed with warnings.')
    process.exit(0)
  }
  console.log('\nEnvironment check passed.')
}

async function main() {
  checkNode()
  checkPnpm()
  await checkGitHubDns()
  checkWindowsBuildTools()
  checkMacBuildTools()
  printAndExit()
}

void main()
