// リポジトリ/コミット履歴クエリ。contributions と合算すると GitHub 側ゲートウェイの
// 応答時間上限（~10s）を超えて 502 になるため、2クエリに分割して並列実行する
// （2026-07-09 本番 502 を分解検証で実証: repos 5.2s + contributions 2.4s、合算で落ちる）。
// history.since は GitTimestamp 型。
// 2026-07-10 Task 21: languages(first:8) を各リポに追加。gh api graphql 実測で repos 7.5s /
// contributions 2.4s（いずれも単独で上限内・502 なし）を確認済み。分割は維持する。
// 2026-07-10 Task 21 追補: App を All repositories でインストールすると installation token に
// private リポが流入し、単一 repos クエリが 9〜11s（本番 502 が 5回中1回再発）まで肥大化する
// ことを gh api graphql 実測で確認（public 2.3s / private 9〜11s）。そこで `$privacy` 変数で
// PUBLIC / PRIVATE を別クエリ化し client.ts で 3並列（public+private+contributions）実行する。
// public は常に軽量・確実に成功し、重い private が 502 しても public のみで劣化描画を継続する
// （フォールトアイソレーション）。private の 502 はカード全体を殺さない。
export const USER_REPOS_QUERY = `
  query($login: String!, $since: GitTimestamp!, $privacy: RepositoryPrivacy!) {
    user(login: $login) {
      login
      avatarUrl(size: 128)
      repositories(
        first: 50
        privacy: $privacy
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
          languages(first: 8, orderBy: { field: SIZE, direction: DESC }) {
            totalSize
            edges {
              size
              node { name color }
            }
          }
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
        commitContributionsByRepository(maxRepositories: 50) {
          repository {
            name
            primaryLanguage { name color }
            isPrivate
          }
          contributions { totalCount }
        }
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
