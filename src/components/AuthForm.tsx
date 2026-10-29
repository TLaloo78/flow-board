import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Logo } from './Logo'

// Public sign-ups are disabled on the Supabase project; accounts are added
// by an admin (Dashboard > Authentication > Users > Invite / Add user).
export function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Distinct tab title per screen (WCAG 2.4.2); Board sets it back on sign-in.
  useEffect(() => {
    document.title = 'Sign in · Flow Board'
  }, [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="brand">
          <Logo />
          <h1>Flow Board</h1>
        </div>
        <p className="auth-subtitle">Sign in to your team board</p>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && (
          <p className="form-message form-message--error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Please wait…' : 'Sign in'}
        </button>

        <p className="form-message auth-footnote">Need an account? Ask your board admin for an invite.</p>
      </form>
    </main>
  )
}
