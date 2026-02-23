import esbuild from 'esbuild'
import { spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import process from 'node:process'
import path from 'node:path'

const require = createRequire(import.meta.url)
const electronBinary = require('electron')

const args = new Set(process.argv.slice(2))
const watch = args.has('--watch')

const rootDir = process.cwd()
const outdir = path.join(rootDir, 'dist-electron')

/** @type {import('node:child_process').ChildProcess | null} */
let electronProc = null

function startElectron() {
  const entry = path.join(outdir, 'main.cjs')
  if (electronProc) return

  // Spawn Electron binary directly for cross-platform reliability.
  electronProc = spawn(electronBinary, [entry], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
  })

  electronProc.on('exit', () => {
    electronProc = null
  })
}

function restartElectron() {
  if (!electronProc) {
    startElectron()
    return
  }
  const p = electronProc
  electronProc = null
  p.removeAllListeners('exit')
  p.on('exit', () => startElectron())
  p.kill()
}

async function buildAll({ watchMode }) {
  if (!watchMode) {
    // Ensure stale artifacts from previous builds are removed before packaging.
    await rm(outdir, { recursive: true, force: true })
    await mkdir(outdir, { recursive: true })
  }

  const common = {
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    sourcemap: watchMode ? 'inline' : false,
    outdir,
    outExtension: { '.js': '.cjs' },
    logLevel: 'info',
    // Keep native deps external so electron-builder can ship them as-is.
    external: ['electron', 'better-sqlite3'],
    define: {
      'process.env.NODE_ENV': JSON.stringify(watchMode ? 'development' : 'production'),
    },
  }

  const restartPlugin = {
    name: 'restart-electron',
    setup(build) {
      build.onEnd((result) => {
        if (!watchMode) return
        if (result.errors?.length) return
        // First successful build starts Electron; subsequent ones restart.
        if (!electronProc) startElectron()
        else restartElectron()
      })
    },
  }

  const ctx = await esbuild.context({
    ...common,
    entryPoints: {
      main: path.join(rootDir, 'electron', 'main', 'index.ts'),
      'preload-main': path.join(rootDir, 'electron', 'preload', 'main.ts'),
      'preload-overlay': path.join(rootDir, 'electron', 'preload', 'overlay.ts'),
    },
    plugins: [restartPlugin],
  })

  if (!watchMode) {
    await ctx.rebuild()
    await ctx.dispose()
    return
  }

  await ctx.watch()
  // First start happens from plugin onEnd.
}

buildAll({ watchMode: watch }).catch((err) => {
  console.error(err)
  process.exit(1)
})
