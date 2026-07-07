#!/usr/bin/env node
// Orchestrator behind `pnpm test:a11y`. Mirrors tests/rls/run-rls.mjs. When a local Supabase stack is
// reachable it (1) injects the stack URL + publishable key so Playwright's webServer build inlines
// NEXT_PUBLIC_*, and (2) seeds ONE login-able test user via the admin API HERE — the only place the
// service-role key is read, in the hook-exempt tests/ tree — passing its credentials to Playwright
// via env (E2E_USER_EMAIL / E2E_USER_PASSWORD). auth.setup.ts then signs in through the real login
// form, so supabase-js never loads inside Playwright's module loader (its conditional exports break
// it). Without a stack the authed routes self-skip and only the public axe runs. Exits nonzero only
// if Playwright fails.
// SOURCE: docs/harness/README.md (axe regression net); tests/rls/run-rls.mjs (env-injection pattern)
import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

function statusEnv() {
  try {
    return execFileSync('supabase', ['status', '-o', 'env'], { encoding: 'utf8', timeout: 15_000 })
  } catch {
    return ''
  }
}

// Plain string scan (no dynamic regex / computed object access) to stay clear of the security lints.
const out = statusEnv()
const read = (key) => {
  for (const line of out.split('\n')) {
    if (line.startsWith(`${key}=`)) return line.slice(key.length + 1).replace(/^"|"$/g, '')
  }
  return ''
}
const url = read('API_URL')
const pub = read('PUBLISHABLE_KEY')
const svc = read('SERVICE_ROLE_KEY')
if (url && !process.env['NEXT_PUBLIC_SUPABASE_URL']) process.env['NEXT_PUBLIC_SUPABASE_URL'] = url
if (pub && !process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'])
  process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] = pub

// Seed (or re-seed) a login-able user, idempotent on the fixed email.
async function seed(admin, email, password) {
  const { data: list } = await admin.auth.admin.listUsers()
  const existing = list?.users.find((u) => u.email === email)
  if (existing) await admin.auth.admin.deleteUser(existing.id)
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
  })
  if (error) throw error
  // PROJECT ROLE SEEDING GOES HERE: insert whatever rows your app needs for this user to reach
  // its authed surfaces (role grants, profile rows, …) via `admin` and data.user.id.
  return data.user.id
}

if (url && pub && svc) {
  const admin = createClient(url, svc, { auth: { persistSession: false } })
  const user = { email: 'e2e-user@a11y.local', password: 'A11y-user-Aa1!' }
  await seed(admin, user.email, user.password)
  process.env['E2E_USER_EMAIL'] = user.email
  process.env['E2E_USER_PASSWORD'] = user.password
} else {
  console.log('[a11y] local stack not fully configured — running public routes only')
}

execFileSync('pnpm', ['exec', 'playwright', 'test'], { env: process.env, stdio: 'inherit' })
