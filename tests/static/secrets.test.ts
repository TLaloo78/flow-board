// @vitest-environment node
// Regression: secret handling from the security audit.
import { describe, expect, it } from 'vitest'
import { read, walk } from './files.ts'

const SECRET = /service_role|sb_secret_|eyJhbGciOi[\w-]+\.[\w-]+/

describe('secrets', () => {
  it('ships no secret or service-role key in the app source or page', () => {
    const shipped = [...walk('src').filter((f) => !/\.test\.tsx?$|[\\/]test[\\/]/.test(f)), 'index.html']
    const leaks = shipped.filter((f) => SECRET.test(read(f)))
    expect(leaks).toEqual([])
  })

  it('keeps local env files out of git', () => {
    expect(read('.gitignore').split(/\r?\n/)).toContain('*.local')
  })

  it('documents only public VITE_ settings in .env.example', () => {
    // Comments may warn about the service_role key by name; only settings are checked.
    const settings = read('.env.example')
      .split(/\r?\n/)
      .filter((line) => /^\w+=/.test(line))
    expect(settings.length).toBeGreaterThan(0)
    for (const line of settings) {
      expect(line.split('=')[0]).toMatch(/^VITE_/)
      expect(line).not.toMatch(SECRET)
    }
  })

  it('reads only the publishable key in the Supabase client', () => {
    const client = read('src/lib/supabase.ts')
    expect(client).toContain('VITE_SUPABASE_PUBLISHABLE_KEY')
    expect(client).not.toMatch(/SERVICE|SECRET/i)
  })
})
