import { USER_CONTRIBUTIONS_QUERY, USER_REPOS_QUERY } from './queries'
import type { GitHubQueryResponse, GitHubUser } from './types'

type GraphqlFn = (query: string, variables: Record<string, unknown>) => Promise<GitHubQueryResponse>

interface GraphqlErrorEntry {
  type?: string
}

// octokit.graphql は存在しないユーザーで user:null を返さず GraphqlResponseError を
// 投げる（errors[].type === 'NOT_FOUND'）。ここで null に正規化しないと呼び出し側の
// not_found 分岐（404 契約・KV キャッシュによるクォータ吸収）が永遠に到達しない
function isNotFoundError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const errors = (error as { errors?: GraphqlErrorEntry[] }).errors
  return Array.isArray(errors) && errors.some((e) => e?.type === 'NOT_FOUND')
}

export async function fetchUserData(
  login: string,
  graphql: GraphqlFn,
  since: string,
  yearAgo: string,
): Promise<GitHubUser | null> {
  try {
    // repos と contributions は分割して並列実行（合算クエリは GitHub の応答時間上限で
    // 502 になる）。contributions 側の失敗はカード全体を殺さず劣化描画に落とす。
    const [reposRes, contribRes] = await Promise.all([
      graphql(USER_REPOS_QUERY, { login, since }),
      graphql(USER_CONTRIBUTIONS_QUERY, { login, contribSince: since, yearAgo }).catch(
        (error): GitHubQueryResponse | null => {
          if (isNotFoundError(error)) return null
          console.error('contributions query failed, degrading:', error)
          return null
        },
      ),
    ])
    const user = reposRes.user
    if (!user) return null
    const contribUser = contribRes?.user
    return {
      ...user,
      contributionsCollection: contribUser?.contributionsCollection ?? null,
      yearContributions: contribUser?.yearContributions ?? null,
    }
  } catch (error) {
    if (isNotFoundError(error)) return null
    throw error
  }
}
