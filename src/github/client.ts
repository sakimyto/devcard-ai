import { USER_REPOS_QUERY } from './queries'
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
    const response = await graphql(USER_REPOS_QUERY, { login, since, yearAgo })
    return response.user
  } catch (error) {
    if (isNotFoundError(error)) return null
    throw error
  }
}
