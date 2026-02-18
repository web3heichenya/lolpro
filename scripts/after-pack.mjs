import fs from 'node:fs'
import path from 'node:path'

function removeIfExists(targetPath) {
  if (!fs.existsSync(targetPath)) return
  fs.rmSync(targetPath, { recursive: true, force: true })
}

function pruneBetterSqlite3(moduleDir) {
  const keepTopLevel = new Set(['build', 'lib', 'package.json', 'LICENSE', 'LICENSE.txt', 'LICENSE.md'])
  for (const entry of fs.readdirSync(moduleDir)) {
    if (keepTopLevel.has(entry)) continue
    removeIfExists(path.join(moduleDir, entry))
  }

  const buildDir = path.join(moduleDir, 'build')
  if (fs.existsSync(buildDir)) {
    for (const entry of fs.readdirSync(buildDir)) {
      if (entry === 'Release') continue
      removeIfExists(path.join(buildDir, entry))
    }
  }

  const releaseDir = path.join(buildDir, 'Release')
  if (fs.existsSync(releaseDir)) {
    for (const entry of fs.readdirSync(releaseDir)) {
      if (entry.endsWith('.node')) continue
      removeIfExists(path.join(releaseDir, entry))
    }
  }
}

function tryPruneAtResources(resourcesDir) {
  const moduleDir = path.join(resourcesDir, 'app.asar.unpacked', 'node_modules', 'better-sqlite3')
  if (!fs.existsSync(moduleDir)) return false
  pruneBetterSqlite3(moduleDir)
  return true
}

export default async function afterPack(context) {
  const appOutDir = context.appOutDir
  const productFilename = context.packager?.appInfo?.productFilename ?? 'LOLPro'

  const resourceCandidates = [
    path.join(appOutDir, 'resources'),
    path.join(appOutDir, `${productFilename}.app`, 'Contents', 'Resources'),
  ]

  for (const resourcesDir of resourceCandidates) {
    if (tryPruneAtResources(resourcesDir)) {
      console.log(`[afterPack] pruned better-sqlite3 at ${resourcesDir}`)
      return
    }
  }

  console.warn(`[afterPack] better-sqlite3 not found under ${appOutDir}`)
}
