export const USER_REPOS_QUERY = `
  query($login: String!, $since: GitTimestamp!, $yearAgo: DateTime!) {
    user(login: $login) {
      login
      avatarUrl(size: 128)
      contributionsCollection(from: $since) {
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
