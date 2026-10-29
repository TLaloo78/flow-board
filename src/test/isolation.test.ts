// Guards the guard: the app's Supabase client is the in-memory fake, and a
// real client can't be created anywhere in the test run.
import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { supabase } from '../lib/supabase'
import { fakeSupabase } from './supabaseMock'

describe('test isolation', () => {
  it('replaces the app client with the in-memory fake', () => {
    expect(supabase).toBe(fakeSupabase)
  })

  it('refuses to create a real Supabase client', () => {
    expect(() => createClient('https://example.supabase.co', 'key')).toThrow(/must not create a real Supabase client/)
  })
})
