import { USER_REPOS_QUERY } from './queries'
import type { GitHubQueryResponse, GitHubUser } from './types'

type GraphqlFn = (query: string, variables: Record<string, unknown>) => Promise<GitHubQueryResponse>

export async function fetchUserData(
  login: string,
  graphql: GraphqlFn,
  since: string,
): Promise<GitHubUser | null> {
  const response = await graphql(USER_REPOS_QUERY, { login, since })
  return response.user
}
