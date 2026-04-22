import { describe, expect, it } from 'vitest'
import { analyzeUsage } from '~/analyzers/usage'
import type { GitHubCommit } from '~/github/types'

let oidCounter = 0
const commit = (message: string): GitHubCommit => ({
  oid: `sha-${++oidCounter}`,
  message,
  committedDate: '2026-03-14T10:00:00Z',
  author: { user: { login: 'user' } },
})

describe('analyzeUsage', () => {
  it('returns zero categories for empty commits', () => {
    const result = analyzeUsage([])
    expect(result.totalCommits).toBe(0)
    expect(result.categories.every((c) => c.count === 0)).toBe(true)
  })

  it('classifies feat: as feature', () => {
    const result = analyzeUsage([commit('feat: add login')])
    const feat = result.categories.find((c) => c.category === 'feature')
    expect(feat?.count).toBe(1)
    expect(feat?.percentage).toBe(100)
  })

  it('classifies fix: as bugfix', () => {
    const result = analyzeUsage([commit('fix: null check')])
    expect(result.categories.find((c) => c.category === 'bugfix')?.count).toBe(1)
  })

  it('classifies test: as test', () => {
    const result = analyzeUsage([commit('test: add unit tests')])
    expect(result.categories.find((c) => c.category === 'test')?.count).toBe(1)
  })

  it('classifies refactor/chore/docs into refactor', () => {
    const commits = [
      commit('refactor: extract fn'),
      commit('chore: update deps'),
      commit('docs: update readme'),
    ]
    const result = analyzeUsage(commits)
    expect(result.categories.find((c) => c.category === 'refactor')?.count).toBe(3)
  })

  it('defaults to feature for no prefix', () => {
    const result = analyzeUsage([commit('add new thing')])
    expect(result.categories.find((c) => c.category === 'feature')?.count).toBe(1)
  })

  it('sorts categories by count descending', () => {
    const commits = [
      commit('feat: a'), commit('feat: b'), commit('feat: c'),
      commit('fix: d'),
    ]
    const result = analyzeUsage(commits)
    expect(result.categories[0].category).toBe('feature')
    expect(result.categories[1].category).toBe('bugfix')
  })

  it('reclassifies feat commit as test when message mentions test file paths', () => {
    const c = commit('feat: add analyzer\n\nModified tests/analyzers/score.test.ts')
    const result = analyzeUsage([c])
    expect(result.categories.find((cat) => cat.category === 'test')?.count).toBe(1)
    expect(result.categories.find((cat) => cat.category === 'feature')?.count).toBe(0)
  })

  it('reclassifies fix commit as test when message mentions .test. file', () => {
    const c = commit('fix: update logic\n\nChanges in src/handler.test.ts')
    const result = analyzeUsage([c])
    expect(result.categories.find((cat) => cat.category === 'test')?.count).toBe(1)
  })

  it('does not reclassify when test appears as regular word', () => {
    const c = commit('feat: test the new feature')
    const result = analyzeUsage([c])
    expect(result.categories.find((cat) => cat.category === 'feature')?.count).toBe(1)
  })

  it('keeps test: prefix classification', () => {
    const result = analyzeUsage([commit('test: unit test')])
    expect(result.categories.find((cat) => cat.category === 'test')?.count).toBe(1)
  })

  it('reclassifies feat commit as test when message contains "add tests"', () => {
    const c = commit('feat: add login flow\n\nAdds unit tests for the login reducer')
    const result = analyzeUsage([c])
    expect(result.categories.find((cat) => cat.category === 'test')?.count).toBe(1)
  })

  it('reclassifies feat commit as test when message mentions a Go _test.go file', () => {
    const c = commit('feat: add retry\n\nChanges in internal/queue_test.go')
    const result = analyzeUsage([c])
    expect(result.categories.find((cat) => cat.category === 'test')?.count).toBe(1)
  })

  it('reclassifies feat commit as test when message mentions a JVM FooTest.java', () => {
    const c = commit('feat: add auth\n\nAdded AuthServiceTest.java')
    const result = analyzeUsage([c])
    expect(result.categories.find((cat) => cat.category === 'test')?.count).toBe(1)
  })

  it('reclassifies feat commit as test when message mentions a python test_foo.py', () => {
    const c = commit('feat: parser refactor\n\nAdded test_parser.py')
    const result = analyzeUsage([c])
    expect(result.categories.find((cat) => cat.category === 'test')?.count).toBe(1)
  })

  it('reclassifies feat commit as test when message mentions "regression tests"', () => {
    const c = commit('fix: memo overflow\n\nAdded regression tests to cover the edge case')
    const result = analyzeUsage([c])
    expect(result.categories.find((cat) => cat.category === 'test')?.count).toBe(1)
  })

  it('does not reclassify commits that only say "test" as a regular word', () => {
    const c = commit('feat: test run on CI\n\nCI now runs on PRs')
    const result = analyzeUsage([c])
    expect(result.categories.find((cat) => cat.category === 'feature')?.count).toBe(1)
  })
})
