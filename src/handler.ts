import { detectAssistedSignal } from './analyzers/aiPatterns'
import { analyzeBuilderType } from './analyzers/builderType'
import { isAiCommit } from './analyzers/coauthor'
import { analyzeElement } from './analyzers/element'
import { analyzeEquipped } from './analyzers/equipped'
import { flavorText } from './analyzers/flavor'
import { analyzeLanguagesV2 } from './analyzers/languages'
import { analyzePattern } from './analyzers/pattern'
import { analyzeRecord } from './analyzers/record'
import { analyzeStats } from './analyzers/stats'
import { analyzeToolAttributionV2 } from './analyzers/toolAttribution'
import { analyzeTraits } from './analyzers/traits'
import type { CardDataV2 } from './analyzers/types'
import { analyzeUsage } from './analyzers/usage'
import { WINDOW_DAYS, filterToWindow } from './analyzers/window'
import type { CardTheme, GlowStyle } from './card/customization'
import { artSeed, cardSerial } from './card/serial'
import { fetchUserData } from './github/client'
import type { GitHubCommit, GitHubQueryResponse } from './github/types'
import { renderErrorCard } from './svg/card'
import { renderCardV2 } from './svg/v2/cardV2'

export type HandlerKind = 'ok' | 'not_found' | 'no_repos' | 'no_ai' | 'error'

export interface HandlerResult {
  svg: string
  status: number
  kind: HandlerKind
  // ギャラリー記録用の表示専用値（ok のみ設定）。element は element.id。
  power?: number
  element?: string
  epithet?: string
}

type GraphqlFn = (query: string, variables: Record<string, unknown>) => Promise<GitHubQueryResponse>

// Fetches an avatar and returns its raw base64 + mime, or null on any failure. Injected
// so tests can exercise medallion assembly without network I/O.
export type AvatarFetcher = (url: string) => Promise<{ base64: string; mime: string } | null>

const AVATAR_TIMEOUT_MS = 3000
const AVATAR_CHUNK = 0x2000 // 8KB — bound String.fromCharCode arg count (stack-safe)

// Restrict to a bare `image/<subtype>` token: strips `;charset=…` params and, crucially,
// guarantees the mime carries no `"` so the assembled data URI needs no escaping.
function sanitizeImageMime(raw: string): string {
  const base = raw.split(';')[0].trim().toLowerCase()
  return /^image\/[a-z0-9.+-]+$/.test(base) ? base : 'image/png'
}

// アバターの取得元は GitHub のアバター CDN だけ。URL は GraphQL の応答由来（= 事実上
// 信頼できる）だが、ここは worker が唯一「外から与えられた URL を fetch する」場所なので、
// ホストを固定してリダイレクト追従も切る。SSRF の踏み台にしないための構造的な閉じ方。
const AVATAR_HOST_ALLOWLIST = ['https://avatars.githubusercontent.com/', 'https://github.com/']
// 128px のアバターは数十 KB。上限は「取り込んだ画像がそのままキャッシュ1件の大きさになる」
// ことへの歯止めで、GitHub 側が size パラメータを守ることに依存しないためにある
const AVATAR_MAX_BYTES = 256 * 1024

const defaultAvatarFetcher: AvatarFetcher = async (url) => {
  if (!url) return null
  if (!AVATAR_HOST_ALLOWLIST.some((prefix) => url.startsWith(prefix))) return null
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(AVATAR_TIMEOUT_MS),
      redirect: 'manual',
    })
    if (!res.ok) return null
    const declared = Number(res.headers.get('content-length') ?? '0')
    if (declared > AVATAR_MAX_BYTES) return null
    const mime = sanitizeImageMime(res.headers.get('content-type') ?? 'image/png')
    const bytes = new Uint8Array(await res.arrayBuffer())
    // Content-Length は無い/嘘の可能性があるので実バイト数でも切る
    if (bytes.length > AVATAR_MAX_BYTES) return null
    // Chunked to avoid a stack overflow from spreading a large array into fromCharCode.
    let binary = ''
    for (let i = 0; i < bytes.length; i += AVATAR_CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + AVATAR_CHUNK))
    }
    return { base64: btoa(binary), mime }
  } catch {
    return null
  }
}

// CardDataV2 の形（フィールドの追加・改名・意味変更）を変えたら必ず上げる。上げ忘れると
// 旧世代の解析結果が新しい描画コードに流れ込み、NaN / undefined が色や数値として SVG に
// 焼き込まれたまま fresh として配信される。tests/handler.test.ts のガードが形の変化を検知する。
export const CARD_DATA_REV = 1

export interface BuildResult {
  kind: HandlerKind
  data?: CardDataV2
  errorMessage?: string
  // その人自身が GitHub App を自分のアカウントに入れているか（api/index.ts が解決して載せる）。
  // 「本人がオプトインした」ことを示せる唯一の信号で、召喚ギャラリー掲載の可否がこれに乗る。
  optedIn?: boolean
}

// Analysis core shared by the SVG card (/) and the PNG share image (/og). Returns
// the analyzed data or a typed failure; rendering is left to each caller so the two
// surfaces can draw the same result differently (vertical card vs landscape share).
// theme / glow を受け取らないのは意図的 — この層の結果は見た目の選択に一切依存せず、
// だからこそ外観の組み合わせ数と無関係に user 単位でキャッシュできる（api/index.ts）。
export async function buildCardData(
  user: string,
  graphql: GraphqlFn,
  now: Date = new Date(),
  avatarFetcher: AvatarFetcher = defaultAvatarFetcher,
): Promise<BuildResult> {
  try {
    // 12週窓の下限を GraphQL 側にも伝え、窓外コミットの取得自体を止める（per-repo 100件上限を窓内に使う）
    const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
    // 表示専用の 1 年アクティビティグラフ用。contributionsCollection の from/to は最大1年なので
    // 364d で安全側に寄せる（12週窓の指標とは独立、POWER には算入しない）
    const yearAgo = new Date(now.getTime() - 364 * 24 * 60 * 60 * 1000).toISOString()
    const userData = await fetchUserData(user, graphql, since, yearAgo)
    if (!userData) {
      return { kind: 'not_found', errorMessage: 'User not found' }
    }

    const repos = userData.repositories.nodes
    if (repos.length === 0) {
      return { kind: 'no_repos', errorMessage: 'No public repos' }
    }

    const allCommits: GitHubCommit[] = repos.flatMap((r) =>
      (r.defaultBranchRef?.target.history.nodes ?? []).map((c) => ({
        ...c,
        repoFullName: `${userData.login}/${r.name}`,
      })),
    )

    // v2: 全指標を「直近12週・公開リポ」窓に統一する（since 済みだが未来時刻/クロックずれ防御で再フィルタ）
    const windowCommits = filterToWindow(allCommits, now)
    // AI 関与 = committed（トレーラー/マーカー/bot）または assisted（本文レビュー文脈）
    const involvedCommits = windowCommits.filter(
      (c) =>
        isAiCommit(c.message, c.author?.user?.login ?? null) ||
        detectAssistedSignal(c.message) !== null,
    )

    const equipped = analyzeEquipped(repos)

    if (involvedCommits.length === 0) {
      return { kind: 'no_ai', errorMessage: 'No public AI activity in the last 12 weeks' }
    }

    const toolAttribution = analyzeToolAttributionV2(involvedCommits)
    const usage = analyzeUsage(involvedCommits)
    const languages = analyzeLanguagesV2(repos)
    // alternationScore must classify assisted commits as AI too (same set as the aiRate
    // numerator), otherwise assisted-only histories are misread as human.
    const involvedOids = new Set(involvedCommits.map((c) => c.oid))
    const pattern = analyzePattern(windowCommits, involvedCommits.length, involvedOids)

    // DIVERSITY 重複排除: committed が最上位、次に assisted、最後に equipped。
    // 同一ツールは最上位の証跡でのみ数える。
    const committedIds = new Set(toolAttribution.tools.map((t) => t.toolId))
    const assistedIds = new Set(toolAttribution.assisted.map((a) => a.toolId))
    const equippedOnlyCount = equipped.equipped.filter(
      (e) => !committedIds.has(e.toolId) && !assistedIds.has(e.toolId),
    ).length

    // 窓内コミットが1件以上あるリポジトリ数（RANGE の活動リポ幅）。正本は
    // commitContributionsByRepository（正確・per-repo 100件キャップなし）。フィールド欠落時
    // （権限制限・pre-Task-21 fixture）は従来の history 由来 repoFullName 集合へフォールバック。
    const commitRepos = userData.contributionsCollection?.commitContributionsByRepository
    const activeRepoCount = commitRepos
      ? commitRepos.filter((r) => r.contributions.totalCount > 0).length
      : new Set(
          windowCommits.map((c) => c.repoFullName).filter((n): n is string => n !== undefined),
        ).size

    const stats = analyzeStats({
      windowAiCommits: involvedCommits,
      commitToolCount: toolAttribution.tools.filter((t) => t.toolId !== 'unknown').length,
      assistedToolCount: toolAttribution.assisted.filter((a) => a.toolId !== 'unknown').length,
      equippedOnlyCount,
      usage,
      totalCommitsInWindow: windowCommits.length,
      alternationScore: pattern.alternationScore,
      langCount: languages.languages.length,
      activeRepoCount,
      now,
    })

    // Avatar is fetched server-side and inlined as a data URI: GitHub blocks remote
    // <image href> in the camo/img context, so a raw avatarUrl would never render.
    const avatar = await avatarFetcher(userData.avatarUrl ?? '')
    const avatarDataUri = avatar ? `data:${avatar.mime};base64,${avatar.base64}` : null

    // Contribution record over the same 12-week window; degrades to zeros when the field
    // is absent/restricted. Display-only — not fed into stats/power. Feeds traits.
    const record = analyzeRecord(userData.contributionsCollection, now, userData.yearContributions)

    // v2.6 TCG-density signals (all display-only, no POWER impact).
    const element = analyzeElement(stats)
    const epithet = analyzeBuilderType(stats)
    const traits = analyzeTraits({
      stats,
      record,
      toolAttribution,
      equipped,
      languages,
      involvedCommits,
      windowCommits,
      now,
    })

    const data: CardDataV2 = {
      username: userData.login,
      stats,
      toolAttribution,
      equipped,
      usage,
      languages,
      pattern,
      record,
      element,
      epithet,
      traits,
      flavor: flavorText({
        pattern: pattern.pattern,
        topToolName: toolAttribution.tools.find((t) => t.toolId !== 'unknown')?.toolName ?? null,
        consistency: stats.consistency,
      }),
      serial: cardSerial(userData.login),
      seed: artSeed(userData.login),
      issuedYear: now.getUTCFullYear(),
      avatarDataUri,
      includesPrivate: userData.includesPrivate ?? false,
    }

    return { kind: 'ok', data }
  } catch (error) {
    const isRateLimit = error instanceof Error && error.message.includes('rate limit')
    console.error(`buildCardData error [${isRateLimit ? 'rate_limit' : 'unknown'}]:`, error)
    const message = isRateLimit ? 'GitHub API rate limit exceeded' : 'Temporarily unavailable'
    return { kind: 'error', errorMessage: message }
  }
}

// 解析結果 → カード SVG。純関数なので、キャッシュ済みの解析結果に対して
// リクエスト毎の theme / glow で描き直せる（api/index.ts の描画層）。
export function renderCardResult(
  r: BuildResult,
  appearance: { theme: CardTheme; glow: GlowStyle },
): HandlerResult {
  const { theme, glow } = appearance
  if (r.kind === 'ok' && r.data) {
    return {
      svg: renderCardV2(r.data, { theme, glow }),
      status: 200,
      kind: 'ok',
      power: r.data.stats.power,
      element: r.data.element.id,
      epithet: r.data.epithet,
    }
  }
  return {
    svg: renderErrorCard(r.errorMessage ?? 'Temporarily unavailable', theme),
    status: 200,
    kind: r.kind,
  }
}
