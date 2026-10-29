// @vitest-environment node
// Regression: Row Level Security from the security audit, checked against the
// migrations so a later migration can't quietly loosen it.
import { describe, expect, it } from 'vitest'
import { read, walk } from './files.ts'

/** Every migration, applied in filename (timestamp) order. */
const sql = walk('supabase/migrations')
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => read(f))
  .join('\n')
  .toLowerCase()

/** The policies on public.cards that are still in force after all migrations. */
function activePolicies() {
  const policies = new Map<string, string>()
  const statement = /(create|drop) policy "([^"]+)"\s+on public\.cards([\s\S]*?);/g
  for (const [, verb, name, body] of sql.matchAll(statement)) {
    if (verb === 'create') policies.set(name, body)
    else policies.delete(name)
  }
  return policies
}

describe('cards table security (supabase/migrations)', () => {
  it('has Row Level Security enabled', () => {
    expect(sql).toContain('alter table public.cards enable row level security')
  })

  it('gives signed-out visitors no access', () => {
    expect(sql).toMatch(/revoke all on public\.cards from anon, authenticated/)
    expect(sql).not.toMatch(/grant [^;]* on public\.cards to [^;]*\banon\b/)
    for (const body of activePolicies().values()) expect(body).toMatch(/to authenticated/)
  })

  it('has exactly one policy per action, all blocking anonymous accounts', () => {
    const actions = [...activePolicies().values()].map((b) => b.match(/for (select|insert|update|delete)/)?.[1])
    expect(actions.sort()).toEqual(['delete', 'insert', 'select', 'update'])
    for (const body of activePolicies().values()) expect(body).toContain("'is_anonymous'")
  })

  it('only lets a card’s creator delete it', () => {
    const [deletePolicy] = [...activePolicies().values()].filter((b) => /for delete/.test(b))
    expect(deletePolicy).toMatch(/created_by = \(select auth\.uid\(\)\)/)
  })

  it('stamps new cards with the signed-in user', () => {
    const [insertPolicy] = [...activePolicies().values()].filter((b) => /for insert/.test(b))
    expect(insertPolicy).toMatch(/created_by = \(select auth\.uid\(\)\)/)
  })

  it('never lets clients write ownership or audit columns', () => {
    const grants = sql.match(/grant (insert|update) \(([^)]*)\)\s+on public\.cards/g) ?? []
    const updateGrant = grants.find((g) => g.startsWith('grant update'))
    expect(updateGrant).toBeDefined()
    expect(updateGrant).not.toMatch(/created_by|updated_by|created_at|updated_at/)
    for (const grant of grants) expect(grant).not.toMatch(/updated_by/)
  })

  it('records who last changed a card, server-side', () => {
    expect(sql).toMatch(/new\.updated_by = auth\.uid\(\)/)
  })

  it('rejects NaN and infinite positions', () => {
    expect(sql).toMatch(/constraint cards_position_finite\s+check \(position between -1e15 and 1e15\)/)
  })
})
