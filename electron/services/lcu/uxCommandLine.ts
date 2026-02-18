import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type UxCredentials = {
  port: number
  authToken: string
}

const portRegex = /--app-port(?:=|\s+)["']?([0-9]+)["']?/
const remotingAuth = /--remoting-auth-token(?:=|\s+)["']?([^"\s']+)["']?/

function parseCredentials(cmd: string): UxCredentials | null {
  const [, portStr] = cmd.match(portRegex) || []
  const [, token] = cmd.match(remotingAuth) || []
  if (!portStr || !token) return null
  const port = Number(portStr)
  if (!Number.isFinite(port) || port <= 0) return null
  return { port, authToken: token }
}

async function queryRegValue(key: string, valueName: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('reg.exe', ['query', key, '/v', valueName], { timeout: 1800 })
    const match = stdout.match(new RegExp(`${valueName}\\s+REG_\\w+\\s+(.+)$`, 'm'))
    return match?.[1]?.trim() ?? null
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

async function getWindowsInstallRoots(): Promise<string[]> {
  const roots: string[] = []
  const seen = new Set<string>()
  const add = (value: string | null | undefined) => {
    if (!value) return
    const normalized = normalizeInstallRoot(value)
    if (!normalized) return
    if (seen.has(normalized)) return
    seen.add(normalized)
    roots.push(normalized)
  }

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
    for (const root of installRoots) add(`${drive}:\\${root}`)
  }

  add(await queryRegValue('HKCU\\SOFTWARE\\Tencent\\LOL', 'InstallPath'))
  add(await queryRegValue('HKCU\\SOFTWARE\\Tencent\\LOL', 'setup'))

  return roots
}

async function queryWindowsFromUxLogs(): Promise<UxCredentials | null> {
  const roots = await getWindowsInstallRoots()
  const logDirs = roots.flatMap((root) => [path.join(root, 'LeagueClient'), root])
  const seen = new Set<string>()

  for (const dir of logDirs) {
    if (seen.has(dir)) continue
    seen.add(dir)

    let files: string[] = []
    try {
      files = await fs.readdir(dir)
    } catch {
      continue
    }

    const uxLogs = files.filter((f) => f.includes('LeagueClientUx.log') && !f.includes('Helper'))
    if (!uxLogs.length) continue

    const logsWithMtime: Array<{ file: string; mtime: number }> = []
    for (const file of uxLogs) {
      const full = path.join(dir, file)
      try {
        const stat = await fs.stat(full)
        logsWithMtime.push({ file: full, mtime: stat.mtimeMs })
      } catch {
        // continue
      }
    }

    logsWithMtime.sort((a, b) => b.mtime - a.mtime)
    for (const entry of logsWithMtime.slice(0, 24)) {
      try {
        const content = await fs.readFile(entry.file, 'utf8')
        if (!content) continue
        const parsed = parseCredentials(content)
        if (parsed) return parsed
      } catch {
        // continue
      }
    }
  }

  return null
}

async function queryPosix(): Promise<UxCredentials | null> {
  const { stdout } = await execFileAsync('ps', ['axww', '-o', 'command='], { timeout: 1500 })
  const lines = stdout
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => l.includes('LeagueClientUx'))

  for (const line of lines) {
    const parsed = parseCredentials(line)
    if (parsed) return parsed
  }

  return null
}

async function queryWindows(): Promise<UxCredentials | null> {
  // WMIC is deprecated on newer Windows, so use PowerShell CIM query.
  const scripts = [
    `[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; Get-CimInstance Win32_Process -Filter "Name='LeagueClientUx.exe' OR Name='LeagueClient.exe'" | Select-Object -ExpandProperty CommandLine | ConvertTo-Json -Compress`,
    `[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*--app-port*' -and $_.CommandLine -like '*--remoting-auth-token*' } | Select-Object -ExpandProperty CommandLine | ConvertTo-Json -Compress`,
  ]

  for (const script of scripts) {
    try {
      const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', script], {
        timeout: 3500,
      })
      const out = stdout.trim()
      if (!out) continue

      let cmdlines: string[] = []
      try {
        const json = JSON.parse(out) as unknown
        if (typeof json === 'string') cmdlines = [json]
        else if (Array.isArray(json)) cmdlines = json.filter((x) => typeof x === 'string') as string[]
      } catch {
        cmdlines = out
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
      }

      for (const cmd of cmdlines) {
        const parsed = parseCredentials(cmd)
        if (parsed) return parsed
      }
    } catch {
      // Access denied on process command line is common in some Windows setups.
      // Continue to fallback strategies instead of aborting lookup.
    }
  }

  return await queryWindowsFromUxLogs()
}

export async function queryLeagueClientUxCredentials(): Promise<UxCredentials | null> {
  try {
    if (process.platform === 'win32') return await queryWindows()
    return await queryPosix()
  } catch {
    return null
  }
}
