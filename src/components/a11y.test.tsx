// Regression: fixes from the WCAG 2.2 AA accessibility audit and the UX review.
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { cardItem, column, renderBoard } from '../test/render'
import { db, makeRow } from '../test/supabaseMock'
import { AuthForm } from './AuthForm'
import { Board } from './Board'

const COLUMN_NAMES = ['Backlog', 'In Progress', 'In Review', 'On Hold', 'Done']

describe('Board structure (1.3.1)', () => {
  it('exposes each column as a region named by its heading', async () => {
    await renderBoard()
    for (const name of COLUMN_NAMES) {
      const region = column(name)
      expect(within(region).getByRole('heading', { level: 2, name })).toBeInTheDocument()
    }
  })

  it('reads column counts as "N cards", not a bare number', async () => {
    await renderBoard([makeRow(), makeRow(), makeRow({ column_id: 'done' })])
    const count = (name: string) => column(name).querySelector('.column-count')?.textContent
    expect(count('Backlog')).toBe('2 cards')
    expect(count('Done')).toBe('1 card')
  })

  it('labels assignee and due date for screen readers', async () => {
    await renderBoard([
      makeRow({ title: 'Dated', assignee: 'Ana', due_date: '2026-11-03' }),
      makeRow({ title: 'Undated', assignee: 'Lee', due_date: null }),
    ])
    expect(within(cardItem('Dated')).getByText('Assignee:')).toBeInTheDocument()
    expect(within(cardItem('Dated')).getByText('Due:')).toBeInTheDocument()
    expect(within(cardItem('Undated')).getByText('No due date')).toBeInTheDocument()
    expect(within(cardItem('Undated')).queryByText('Due:')).not.toBeInTheDocument()
  })

  it('describes the card title button as renamable without changing the heading', async () => {
    await renderBoard([makeRow({ title: 'Plan sprint' })])
    expect(screen.getByRole('button', { name: 'Plan sprint' })).toHaveAccessibleDescription('Press to rename')
    expect(screen.getByRole('heading', { level: 3, name: 'Plan sprint' })).toBeInTheDocument()
  })
})

describe('Status and loading (4.1.3)', () => {
  it('says "Loading cards…" until the first load finishes, then "Drop cards here"', async () => {
    db.reset()
    render(<Board userId={db.rows[0]?.created_by ?? 'me'} userEmail="me@example.com" />)
    expect(screen.getAllByText('Loading cards…')).toHaveLength(5)
    await waitFor(() => expect(screen.getAllByText('Drop cards here')).toHaveLength(5))
    expect(screen.queryByText('Loading cards…')).not.toBeInTheDocument()
  })

  it('shows the loading screen as a main region containing a status message', () => {
    db.reset()
    render(<App />)
    expect(within(screen.getByRole('main')).getByRole('status')).toHaveTextContent('Loading…')
  })

  it('puts the Undo toast inside a status region', async () => {
    const { user } = await renderBoard([makeRow({ title: 'Gone' })])
    await user.click(screen.getByRole('button', { name: 'Delete Gone' }))
    expect(within(screen.getByRole('status')).getByRole('button', { name: 'Undo' })).toBeInTheDocument()
  })
})

describe('Controls (4.1.2, 2.5.3, 2.4.3)', () => {
  it('names the add button "Add card" (the "+" is hidden from screen readers)', async () => {
    await renderBoard()
    expect(screen.getByRole('button', { name: 'Add card' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /\+/ })).not.toBeInTheDocument()
  })

  it('reports the Move menu state with aria-expanded and aria-controls', async () => {
    const { user } = await renderBoard([makeRow({ title: 'Task' })])
    const move = screen.getByRole('button', { name: 'Move Task' })
    expect(move).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById(move.getAttribute('aria-controls')!)).not.toBeNull()

    await user.click(move)
    expect(move).toHaveAttribute('aria-expanded', 'true')
    // Focus lands on the first enabled item; a lone card can't move up or down.
    const menu = within(document.getElementById(move.getAttribute('aria-controls')!)!)
    expect(menu.getByRole('button', { name: 'Move up' })).toBeDisabled()
    expect(menu.getByRole('button', { name: 'Move to In Progress' })).toHaveFocus()
  })

  it('moves focus to Undo when the deleted card took focus with it', async () => {
    const { user } = await renderBoard([makeRow({ title: 'Focus test' })])
    screen.getByRole('button', { name: 'Delete Focus test' }).focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus())
  })
})

describe('Sign-in screen (2.4.2, 1.3.1, 3.3.1)', () => {
  it('has its own page title and a main region', () => {
    render(<AuthForm />)
    expect(document.title).toBe('Sign in · Flow Board')
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1, name: 'Flow Board' }))
  })

  it('announces sign-in errors', async () => {
    db.reset()
    db.failSignIn('Invalid login credentials')
    const user = userEvent.setup()
    render(<AuthForm />)
    await user.type(screen.getByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
  })

  it('signs in to the board, which sets the board page title', async () => {
    db.reset()
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Flow Board' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Backlog' })).toBeInTheDocument()
    expect(document.title).toBe('Flow Board')
  })
})
