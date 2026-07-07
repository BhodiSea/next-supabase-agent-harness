// Placeholder registry. Every {{TOKEN}} used anywhere under template/ MUST be
// declared here (scripts/hygiene.mjs enforces closure in both directions).
export const PLACEHOLDERS = {
  PROJECT_NAME: {
    prompt: 'Human-readable project name (e.g. "Acme Portal")',
    default: (ctx) => ctx.dirName ?? 'My Project',
  },
  PROJECT_SLUG: {
    prompt: 'Package/machine name (kebab-case)',
    default: (ctx) =>
      (ctx.answers.PROJECT_NAME ?? ctx.dirName ?? 'my-project')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
  },
  GITHUB_OWNER: {
    prompt: 'GitHub org/user that owns the repo',
    default: (ctx) => ctx.gitOwner ?? 'your-github-owner',
  },
  SECURITY_OWNERS: {
    prompt: 'GitHub handle/team for auth+data sign-off (CODEOWNERS)',
    default: (ctx) => `@${ctx.answers.GITHUB_OWNER ?? ctx.gitOwner ?? 'your-github-owner'}`,
  },
  DEFAULT_BRANCH: {
    prompt: 'Default git branch',
    default: () => 'main',
  },
}

const TOKEN_RE = /\{\{([A-Z0-9_]+)\}\}/g

export function render(text, answers) {
  return text.replace(TOKEN_RE, (whole, name) => {
    if (name in answers) return answers[name]
    return whole // unknown tokens are left intact and flagged by doctor/hygiene
  })
}

export function tokensIn(text) {
  const found = new Set()
  for (const m of text.matchAll(TOKEN_RE)) found.add(m[1])
  return found
}
