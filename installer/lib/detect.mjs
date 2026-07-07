// Target-directory detection: bootstrap (empty / no package.json) vs
// retrofit (existing Next.js project). src/ layouts are rejected in v1 —
// every gate, glob, and boundary element assumes root-level app/ + lib/.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { execFileSync } from 'node:child_process'

export function detect(targetDir) {
  const pkgPath = join(targetDir, 'package.json')
  if (!existsSync(pkgPath)) {
    const entries = existsSync(targetDir)
      ? readdirSync(targetDir).filter((e) => e !== '.git' && e !== '.DS_Store')
      : []
    return { mode: 'bootstrap', empty: entries.length === 0 }
  }
  let pkg = {}
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch {
    throw new Error(`unreadable package.json at ${pkgPath}`)
  }
  const hasNext = Boolean(pkg.dependencies?.next ?? pkg.devDependencies?.next)
  if (!hasNext) {
    throw new Error(
      'target has a package.json but no `next` dependency — the harness supports Next.js 16 + Supabase projects only',
    )
  }
  if (existsSync(join(targetDir, 'src'))) {
    throw new Error(
      'src/ layout detected. v1 of the harness assumes root-level app/, components/, lib/ ' +
        '(every gate glob, knip path, and boundary element depends on it). ' +
        'Either migrate to the root layout first, or track the srcRoots fast-follow in the harness repo.',
    )
  }
  return { mode: 'retrofit', pkg }
}

export function detectContext(targetDir) {
  const ctx = { dirName: basename(targetDir), gitOwner: null, answers: {} }
  try {
    const url = execFileSync('git', ['-C', targetDir, 'remote', 'get-url', 'origin'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    const m = url.match(/[:/]([^/:]+)\/[^/]+?(\.git)?$/)
    if (m) ctx.gitOwner = m[1]
  } catch {
    // no git remote — defaults cover it
  }
  return ctx
}
