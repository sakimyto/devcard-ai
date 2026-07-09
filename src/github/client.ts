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
    // 3並列: repos(PUBLIC) / repos(PRIVATE) / contributions。合算クエリは GitHub の応答時間
    // 上限で 502 になるため分割し、さらに repos を privacy で分ける（All-repos インストール時に
    // private が流入し単一 repos が 9〜11s まで肥大化して 502 が再発するため）。public は軽量で
    // 確実に成功する主系。private / contributions の失敗はカード全体を殺さず劣化描画に落とす。
    const [pubRes, privRes, contribRes] = await Promise.all([
      graphql(USER_REPOS_QUERY, { login, since, privacy: 'PUBLIC' }),
      graphql(USER_REPOS_QUERY, { login, since, privacy: 'PRIVATE' }).catch(
        (error): GitHubQueryResponse | null => {
          if (isNotFoundError(error)) return null
          console.error('private repos query failed, degrading to public-only:', error)
          return null
        },
      ),
      graphql(USER_CONTRIBUTIONS_QUERY, { login, contribSince: since, yearAgo }).catch(
        (error): GitHubQueryResponse | null => {
          if (isNotFoundError(error)) return null
          console.error('contributions query failed, degrading:', error)
          return null
        },
      ),
    ])
    // public が主系: null（NOT_FOUND / ユーザー不在）ならカード成立せず null を返す。
    const user = pubRes.user
    if (!user) return null

    const privateNodes = privRes?.user?.repositories.nodes ?? []
    // public + private をマージし pushedAt 降順で再ソート（無効日時は末尾へ）。private が
    // 1件でもあれば all-repos 表示。順序を安定させるため同値/無効時は元の相対順を保つ。
    const mergedNodes = [...user.repositories.nodes, ...privateNodes].sort((a, b) => {
      const ta = Date.parse(a.pushedAt)
      const tb = Date.parse(b.pushedAt)
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0)
    })

    const contribUser = contribRes?.user
    // Private data reaches the card through two channels: private repo nodes (languages /
    // commit messages) and private rows in commitContributionsByRepository (which feed RANGE
    // even when the private repos query degrades on a 502). Label `all repos` if EITHER is
    // present, so a public-only-degradation never mislabels a card that private activity
    // still influenced. Repo names are never surfaced regardless.
    const privateContrib =
      contribUser?.contributionsCollection?.commitContributionsByRepository?.some(
        (r) => r.repository.isPrivate && r.contributions.totalCount > 0,
      ) ?? false
    return {
      ...user,
      repositories: { nodes: mergedNodes },
      includesPrivate: privateNodes.length > 0 || privateContrib,
      contributionsCollection: contribUser?.contributionsCollection ?? null,
      yearContributions: contribUser?.yearContributions ?? null,
    }
  } catch (error) {
    if (isNotFoundError(error)) return null
    throw error
  }
}
