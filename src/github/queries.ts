// リポジトリ/コミット履歴クエリ。contributions と合算すると GitHub 側ゲートウェイの
// 応答時間上限（~10s）を超えて 502 になるため、2クエリに分割して並列実行する
// （2026-07-09 本番 502 を分解検証で実証: repos 5.2s + contributions 2.4s、合算で落ちる）。
// history.since は GitTimestamp 型。
export const USER_REPOS_QUERY = `
  query($login: String!, $since: GitTimestamp!) {
    user(login: $login) {
      login
      avatarUrl(size: 128)
      repositories(
        first: 50
        orderBy: { field: PUSHED_AT, direction: DESC }
        isFork: false
      ) {
        nodes {
          name
          pushedAt
          defaultBranchRef {
            target {
              ... on Commit {
                history(first: 100, since: $since) {
                  nodes {
                    oid
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
          primaryLanguage { name color }
        }
      }
    }
  }
`

// contributions クエリ（12週窓 + 1年グラフ）。contributionsCollection.from は
// DateTime 型（GitTimestamp 変数を渡すとスキーマ検証で拒否される — 本番で実証済み）。
export const USER_CONTRIBUTIONS_QUERY = `
  query($login: String!, $contribSince: DateTime!, $yearAgo: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $contribSince) {
        totalCommitContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalIssueContributions
        restrictedContributionsCount
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
      yearContributions: contributionsCollection(from: $yearAgo) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
            }
          }
        }
      }
    }
  }
`
