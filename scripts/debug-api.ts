/**
 * Debug script to investigate why tools detection returns "None detected" for sakimyto.
 *
 * Usage:
 *   GITHUB_TOKEN=<pat> bun run scripts/debug-api.ts
 *
 * The GITHUB_TOKEN must be either:
 *   - A GitHub App installation token for the devcard-ai app, OR
 *   - A classic PAT with `repo` scope (to access public repos)
 *
 * If using the GitHub App, set all three:
 *   GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY (PEM), GITHUB_APP_INSTALLATION_ID
 */

const LOGIN = 'sakimyto'

// --- GraphQL query (mirrors src/github/queries.ts) ---
const USER_REPOS_QUERY = `
  query($login: String!) {
    user(login: $login) {
      login
      repositories(
        first: 20
        orderBy: { field: PUSHED_AT, direction: DESC }
        privacy: PUBLIC
        isFork: false
      ) {
        nodes {
          name
          pushedAt
          defaultBranchRef {
            target {
              ... on Commit {
                history(first: 100) {
                  nodes {
                    message
                    committedDate
                    author {
                      user {
                        login
                      }
                    }
                  }
                  totalCount
                }
              }
            }
          }
          claudeMd: object(expression: "HEAD:CLAUDE.md") { id }
          agentsMd: object(expression: "HEAD:AGENTS.md") { id }
          cursorrules: object(expression: "HEAD:.cursorrules") { id }
          cursorrulesDir: object(expression: "HEAD:.cursor/rules") { id }
          githubCopilot: object(expression: "HEAD:.github/copilot-instructions.md") { id }
          claudeDir: object(expression: "HEAD:.claude") { id }
        }
      }
    }
  }
`

// --- Minimal GraphQL client using fetch ---
async function graphql(token: string, query: string, variables: Record<string, unknown>) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'devcard-ai-debug/1.0',
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }

  const json = await res.json() as { data?: unknown; errors?: unknown }

  if (json.errors) {
    console.error('GraphQL errors:', JSON.stringify(json.errors, null, 2))
  }

  return json.data
}

// --- Main ---
async function main() {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.error('ERROR: Set GITHUB_TOKEN environment variable')
    process.exit(1)
  }

  console.log(`\n=== Fetching repos for: ${LOGIN} ===\n`)

  const data = await graphql(token, USER_REPOS_QUERY, { login: LOGIN }) as {
    user: {
      login: string
      repositories: {
        nodes: Array<{
          name: string
          pushedAt: string
          claudeMd: { id: string } | null
          agentsMd: { id: string } | null
          cursorrules: { id: string } | null
          cursorrulesDir: { id: string } | null
          githubCopilot: { id: string } | null
          claudeDir: { id: string } | null
          defaultBranchRef: {
            target: {
              history: {
                nodes: Array<{ message: string; committedDate: string }>
                totalCount: number
              }
            }
          } | null
        }>
      }
    } | null
  }

  if (!data.user) {
    console.error('User not found or GitHub App lacks access to this user.')
    console.error('\nPossible causes:')
    console.error('  1. GitHub App is not installed on sakimyto\'s account')
    console.error('  2. GitHub App installation has "Selected repositories" access, not "All repositories"')
    console.error('  3. The PAT token does not have sufficient scope')
    process.exit(1)
  }

  const repos = data.user.repositories.nodes
  console.log(`Total repos returned by API: ${repos.length}`)
  console.log('(Query fetches up to 20 public, non-fork repos ordered by pushedAt DESC)\n')

  if (repos.length === 0) {
    console.warn('WARNING: 0 repos returned.')
    console.warn('Possible causes:')
    console.warn('  1. GitHub App installation has "Selected repositories" with none selected')
    console.warn('  2. No PUBLIC non-fork repos exist for this user')
    console.warn('  3. The GraphQL query is running as the App installation which only sees')
    console.warn('     repos it has been granted access to - even for public repos via GraphQL')
    process.exit(1)
  }

  // Config file detection summary
  const configFields = ['claudeMd', 'agentsMd', 'cursorrules', 'cursorrulesDir', 'githubCopilot', 'claudeDir'] as const

  console.log('=== Per-repo config file detection ===\n')

  let anyConfigFound = false

  for (const repo of repos) {
    const found = configFields.filter((f) => repo[f] !== null)
    const pushed = new Date(repo.pushedAt).toISOString().slice(0, 10)

    if (found.length > 0) {
      anyConfigFound = true
      console.log(`[HIT]  ${repo.name} (pushed ${pushed})`)
      for (const f of found) {
        console.log(`         ${f}: ${repo[f]?.id}`)
      }
    } else {
      console.log(`[miss] ${repo.name} (pushed ${pushed}) - no AI config files`)
    }
  }

  console.log('\n=== Summary ===\n')

  if (!anyConfigFound) {
    console.log('RESULT: No config files found in any repo -> tools.tools will be []')
    console.log('\nMost likely root cause:')
    console.log('  The GitHub App installation uses "Selected repositories" access.')
    console.log('  Even though GraphQL can list repos (public data), the object() calls')
    console.log('  for file-existence checks return null for repos outside the App\'s scope.')
    console.log('\n  Alternatively, sakimyto\'s public repos genuinely do not contain')
    console.log('  CLAUDE.md / .claude / .cursorrules / .cursor/rules /')
    console.log('  .github/copilot-instructions.md / AGENTS.md at HEAD of their default branch.')
    console.log('\n  Check: does ~/sakimemo or ~/devcard-ai have CLAUDE.md at repo root?')
    console.log('  These repos may be PRIVATE - the query only fetches PUBLIC repos.')
  } else {
    console.log(`RESULT: ${repos.filter((r) => configFields.some((f) => r[f] !== null)).length} repo(s) have AI config files`)
    console.log('Tools detection should work. Check analyzer logic if card still shows "None detected".')
  }

  // Raw response for the first 3 repos
  console.log('\n=== Raw response (first 3 repos, truncated commits) ===\n')
  for (const repo of repos.slice(0, 3)) {
    const summary = {
      name: repo.name,
      pushedAt: repo.pushedAt,
      claudeMd: repo.claudeMd,
      agentsMd: repo.agentsMd,
      cursorrules: repo.cursorrules,
      cursorrulesDir: repo.cursorrulesDir,
      githubCopilot: repo.githubCopilot,
      claudeDir: repo.claudeDir,
      commitCount: repo.defaultBranchRef?.target.history.totalCount ?? 'N/A (no defaultBranchRef)',
      firstCommit: repo.defaultBranchRef?.target.history.nodes[0]?.message.slice(0, 60) ?? null,
    }
    console.log(JSON.stringify(summary, null, 2))
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
