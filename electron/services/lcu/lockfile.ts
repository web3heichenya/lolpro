import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export type LockfileInfo = {
  name: string
  pid: number
  port: number
  password: string
  protocol: 'https'
}

function tryReadRegistryValue(key: string, valueName: string): string | null {
  try {
    const output = execSync(`reg query "${key}" /v ${valueName}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    })
    const match = output.match(new RegExp(`${valueName}\\s+REG_\\w+\\s+(.+)$`, 'm'))
    if (!match?.[1]) return null
    return match[1].trim()
  } catch {
    return null
  }
}

function normalizeInstallRoot(inputPath: string): string | null {
  let p = inputPath.trim().replace(/^["']|["']$/g, '')
  if (!p) return null
  p = p.replace(/\//g, '\\')
  if (/\.exe$/i.test(p)) p = path.dirname(p)
  p = p.replace(/[\\/]TCLS(?:[\\/].*)?$/i, '')
  p = p.replace(/[\\/]LeagueClient(?:[\\/].*)?$/i, '')
  p = p.replace(/[\\/]+$/, '')
  return p || null
}

function getWindowsRegistryInstallRoots(): string[] {
  const roots: string[] = []
  const seen = new Set<string>()
  const add = (value: string | null) => {
    if (!value) return
    const normalized = normalizeInstallRoot(value)
    if (!normalized) return
    if (seen.has(normalized)) return
    seen.add(normalized)
    roots.push(normalized)
  }

  add(tryReadRegistryValue('HKCU\\SOFTWARE\\Tencent\\LOL', 'InstallPath'))
  add(tryReadRegistryValue('HKCU\\SOFTWARE\\Tencent\\LOL', 'setup'))

  return roots
}

export async function readLockfile(lockfilePath: string): Promise<LockfileInfo> {
  const raw = await fs.readFile(lockfilePath, 'utf8')
  const parts = raw.trim().split(':')
  if (parts.length < 5) throw new Error(`Invalid lockfile format: ${lockfilePath}`)
  const [name, pid, port, password, protocol] = parts
  return {
    name,
    pid: Number(pid),
    port: Number(port),
    password,
    protocol: protocol === 'https' ? 'https' : 'https',
  }
}

export function getDefaultLockfileCandidates(): string[] {
  const candidates: string[] = []
  const seen = new Set<string>()

  const add = (p: string | null | undefined) => {
    if (!p) return
    const normalized = p.replace(/^["']|["']$/g, '').trim()
    if (!normalized) return
    if (seen.has(normalized)) return
    seen.add(normalized)
    candidates.push(normalized)
  }

  const addInstallRootCandidates = (installRoot: string) => {
    add(path.join(installRoot, 'lockfile'))
    add(path.join(installRoot, 'LeagueClient', 'lockfile'))
    add(path.join(installRoot, 'Game', 'lockfile'))
  }

  // Allow explicit path override.
  add(process.env.LOL_LOCKFILE_PATH)

  const platform = process.platform
  if (platform === 'win32') {
    const driveCandidates = ['C', 'D', 'E', 'F', 'G', 'H']
    const installRoots = [
      'Riot Games\\League of Legends',
      'Program Files\\Riot Games\\League of Legends',
      'Program Files (x86)\\Riot Games\\League of Legends',
      'WeGameApps\\英雄联盟',
      '腾讯游戏\\英雄联盟',
      'Program Files\\腾讯游戏\\英雄联盟',
      'Program Files (x86)\\腾讯游戏\\英雄联盟',
    ]

    for (const drive of driveCandidates) {
      for (const root of installRoots) addInstallRootCandidates(`${drive}:\\${root}`)
    }

    if (process.env.SystemDrive) {
      const sysDrive = process.env.SystemDrive.replace(/[\\/]+$/, '')
      for (const root of installRoots) addInstallRootCandidates(path.join(`${sysDrive}\\`, root))
    }

    for (const root of getWindowsRegistryInstallRoots()) {
      addInstallRootCandidates(root)
    }
  } else if (platform === 'darwin') {
    add('/Applications/League of Legends.app/Contents/LoL/lockfile')
    // Some installs place it under a per-user Riot Games directory; keep this as a best-effort guess.
    add(path.join(os.homedir(), 'Applications', 'League of Legends.app', 'Contents', 'LoL', 'lockfile'))
  }

  return candidates
}

export async function findReadableLockfile(candidates: string[]): Promise<string | null> {
  for (const p of candidates) {
    try {
      await fs.access(p)
      const stat = await fs.stat(p)
      if (!stat.isFile()) continue
      if (stat.size <= 0) continue
      const raw = await fs.readFile(p, 'utf8')
      const parts = raw.trim().split(':')
      if (parts.length < 5) continue
      return p
    } catch {
      // continue
    }
  }
  return null
}
