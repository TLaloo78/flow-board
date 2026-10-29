import { useAuth } from './hooks/useAuth'
import { AuthForm } from './components/AuthForm'
import { Board } from './components/Board'

export default function App() {
  const session = useAuth()

  if (session === undefined)
    return (
      // role="status" goes on the text: on <main> it would replace the main landmark.
      <main className="loading">
        <span role="status">Loading…</span>
      </main>
    )
  if (!session) return <AuthForm />
  return <Board userId={session.user.id} userEmail={session.user.email ?? ''} />
}
