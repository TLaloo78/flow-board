import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect } from 'vitest'
import { Board } from '../components/Board'
import { db, ME, type CardRow } from './supabaseMock'

/**
 * Render the full board against the fake database and wait for the first load.
 * Pass `advanceTimers` when the test uses fake timers.
 */
export async function renderBoard(
  rows: CardRow[] = [],
  { userId = ME, advanceTimers }: { userId?: string; advanceTimers?: (ms: number) => unknown } = {},
) {
  db.reset(rows, userId)
  const user = userEvent.setup(advanceTimers ? { advanceTimers } : undefined)
  render(<Board userId={userId} userEmail="me@example.com" />)
  await waitFor(() => expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'false'))
  return { user }
}

/** A board column, found the way assistive tech finds it: a region named by its heading. */
export const column = (name: string) => screen.getByRole('region', { name })

/** Card titles in a column, top to bottom. */
export const titlesIn = (name: string) =>
  within(column(name))
    .queryAllByRole('heading', { level: 3 })
    .map((h) => h.textContent)

/** The `<li>` for a card, found by its title. */
export const cardItem = (title: string) => {
  const item = screen.getByRole('heading', { level: 3, name: title }).closest('li')
  if (!item) throw new Error(`No card titled ${title}`)
  return item
}
