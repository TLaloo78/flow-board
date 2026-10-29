// In-memory stand-in for the Supabase client. setup.ts swaps it in for
// src/lib/supabase, so no test can reach the real database. It implements only
// the calls the app makes, and mirrors the server rules the app relies on:
// RLS (only a card's creator may delete it) and PostgREST dropping undefined fields.
import type { Database } from '../lib/database.types'

export type CardRow = Database['public']['Tables']['cards']['Row']

type Op = 'select' | 'insert' | 'update' | 'delete'
type Filter = { kind: 'eq' | 'in'; column: string; value: unknown }
type Result = { data: unknown; error: { message: string } | null }

/** One request the app sent, for assertions. */
export interface RecordedCall {
  op: Op
  payload?: Record<string, unknown>
  filters: Filter[]
  /** Columns requested back with `.select()` after a write, e.g. `'id'`. */
  returning?: string
}

const state = {
  rows: [] as CardRow[],
  userId: '',
  calls: [] as RecordedCall[],
  failures: [] as string[],
  signInError: null as string | null,
  authListeners: new Set<(event: string, session: unknown) => void>(),
  session: null as null | { user: { id: string; email: string } },
}

/** PostgREST omits undefined values from the JSON body, so they never reach the database. */
const defined = (obj: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))

class Query implements PromiseLike<Result> {
  private op: Op | undefined
  private payload: Record<string, unknown> | undefined
  private filters: Filter[] = []
  private returning: string | undefined

  select(columns = '*') {
    if (this.op) this.returning = columns
    else this.op = 'select'
    return this
  }
  order() {
    return this
  }
  insert(row: Record<string, unknown>) {
    this.op = 'insert'
    this.payload = defined(row)
    return this
  }
  update(changes: Record<string, unknown>) {
    this.op = 'update'
    this.payload = defined(changes)
    return this
  }
  delete() {
    this.op = 'delete'
    return this
  }
  eq(column: string, value: unknown) {
    this.filters.push({ kind: 'eq', column, value })
    return this
  }
  in(column: string, value: unknown[]) {
    this.filters.push({ kind: 'in', column, value })
    return this
  }

  then<A = Result, B = never>(
    onFulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
    onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    // Resolve on a later microtask, like a real network call.
    return Promise.resolve()
      .then(() => this.execute())
      .then(onFulfilled, onRejected)
  }

  private matches(row: CardRow) {
    return this.filters.every((f) => {
      const value = row[f.column as keyof CardRow]
      return f.kind === 'eq' ? value === f.value : (f.value as unknown[]).includes(value)
    })
  }

  private execute(): Result {
    const op = this.op ?? 'select'
    state.calls.push({ op, payload: this.payload, filters: this.filters, returning: this.returning })
    const failure = op === 'select' ? undefined : state.failures.shift()
    if (failure) return { data: null, error: { message: failure } }

    switch (op) {
      case 'select':
        return { data: [...state.rows].sort((a, b) => a.position - b.position).map((r) => ({ ...r })), error: null }
      case 'insert': {
        const row = makeRow({ created_by: state.userId, updated_by: state.userId, ...this.payload } as Partial<CardRow>)
        // RLS insert check: created_by must be the signed-in user.
        if (row.created_by !== state.userId) {
          return { data: null, error: { message: 'new row violates row-level security policy' } }
        }
        state.rows.push(row)
        return { data: null, error: null }
      }
      case 'update':
        state.rows = state.rows.map((r) =>
          this.matches(r) ? { ...r, ...this.payload, updated_by: state.userId } : r,
        )
        return { data: null, error: null }
      case 'delete': {
        // RLS delete policy: rows created by someone else are silently skipped.
        const removed = state.rows.filter((r) => this.matches(r) && r.created_by === state.userId)
        state.rows = state.rows.filter((r) => !removed.includes(r))
        return { data: this.returning ? removed.map((r) => ({ id: r.id })) : null, error: null }
      }
    }
  }
}

let idCounter = 0

/** A complete cards row with sensible defaults. */
export function makeRow(overrides: Partial<CardRow> = {}): CardRow {
  idCounter += 1
  return {
    id: `00000000-0000-4000-8000-${String(idCounter).padStart(12, '0')}`,
    title: `Card ${idCounter}`,
    assignee: 'Sam',
    priority: 'Medium',
    due_date: null,
    column_id: 'backlog',
    position: idCounter * 1000,
    created_by: ME,
    created_at: '2026-10-29T00:00:00Z',
    updated_at: '2026-10-29T00:00:00Z',
    updated_by: ME,
    ...overrides,
  }
}

export const fakeSupabase = {
  from: () => new Query(),
  channel: () => {
    const channel = {
      on: () => channel,
      subscribe: (callback?: (status: string) => void) => {
        queueMicrotask(() => callback?.('SUBSCRIBED'))
        return channel
      },
    }
    return channel
  },
  removeChannel: async () => 'ok',
  auth: {
    getSession: async () => ({ data: { session: state.session }, error: null }),
    onAuthStateChange: (listener: (event: string, session: unknown) => void) => {
      state.authListeners.add(listener)
      return { data: { subscription: { unsubscribe: () => state.authListeners.delete(listener) } } }
    },
    signInWithPassword: async ({ email }: { email: string; password: string }) => {
      if (state.signInError) return { data: { session: null }, error: { message: state.signInError } }
      state.session = { user: { id: state.userId, email } }
      state.authListeners.forEach((l) => l('SIGNED_IN', state.session))
      return { data: { session: state.session }, error: null }
    },
    signOut: async () => {
      state.session = null
      state.authListeners.forEach((l) => l('SIGNED_OUT', null))
      return { error: null }
    },
  },
}

/** Test controls for the fake. */
export const db = {
  /** Start a test: the table holds `rows`, and requests run as `userId`. */
  reset(rows: CardRow[] = [], userId = ME) {
    state.userId = userId
    state.rows = rows.map((r) => ({ ...r }))
    state.calls = []
    state.failures = []
    state.signInError = null
    state.session = null
    state.authListeners.clear()
  },
  get rows() {
    return state.rows
  },
  get calls() {
    return state.calls
  },
  callsOf(op: Op) {
    return state.calls.filter((c) => c.op === op)
  },
  /** Make the next write (insert/update/delete) fail with this message. */
  failNextWrite(message: string) {
    state.failures.push(message)
  },
  signIn(email = 'me@example.com') {
    state.session = { user: { id: state.userId, email } }
  },
  failSignIn(message: string) {
    state.signInError = message
  },
}

export const ME = 'aaaaaaaa-0000-4000-8000-000000000001'
export const TEAMMATE = 'bbbbbbbb-0000-4000-8000-000000000002'
