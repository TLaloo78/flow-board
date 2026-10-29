import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cardItem, column, renderBoard, titlesIn } from '../test/render'
import { db, makeRow } from '../test/supabaseMock'

/** The Move menu that a card's Move button controls. */
async function openMoveMenu(user: Awaited<ReturnType<typeof renderBoard>>['user'], title: string) {
  const trigger = screen.getByRole('button', { name: `Move ${title}` })
  await user.click(trigger)
  return within(document.getElementById(trigger.getAttribute('aria-controls')!)!)
}

describe('Board: creating cards', () => {
  it('adds a card from the form to the top of Backlog and saves it', async () => {
    const { user } = await renderBoard()

    await user.click(screen.getByRole('button', { name: 'Add card' }))
    const dialog = within(screen.getByRole('dialog', { name: 'New card' }))
    await user.type(dialog.getByLabelText('Title'), 'Write release notes')
    await user.type(dialog.getByLabelText('Assignee'), 'Ana')
    await user.selectOptions(dialog.getByLabelText('Priority'), 'High')
    await user.type(dialog.getByLabelText('Due date (optional)'), '2026-11-03')
    await user.click(dialog.getByRole('button', { name: 'Add card' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(titlesIn('Backlog')).toEqual(['Write release notes'])
    expect(within(cardItem('Write release notes')).getByText('High')).toBeInTheDocument()
    await waitFor(() => expect(db.rows).toHaveLength(1))
    expect(db.rows[0]).toMatchObject({ title: 'Write release notes', assignee: 'Ana', priority: 'High', due_date: '2026-11-03' })
  })

  it('will not submit without the required title and assignee', async () => {
    const { user } = await renderBoard()

    await user.click(screen.getByRole('button', { name: 'Add card' }))
    const dialog = within(screen.getByRole('dialog', { name: 'New card' }))
    await user.click(dialog.getByRole('button', { name: 'Add card' }))

    expect(dialog.getByLabelText('Title')).toBeInvalid()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(db.callsOf('insert')).toHaveLength(0)
  })
})

describe('Board: editing cards', () => {
  it('edits every field through the modal', async () => {
    const { user } = await renderBoard([makeRow({ title: 'Draft spec', assignee: 'Sam', priority: 'Low' })])

    await user.click(screen.getByRole('button', { name: 'Edit Draft spec' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Edit card' }))
    await user.clear(dialog.getByLabelText('Title'))
    await user.type(dialog.getByLabelText('Title'), 'Final spec')
    await user.clear(dialog.getByLabelText('Assignee'))
    await user.type(dialog.getByLabelText('Assignee'), 'Lee')
    await user.selectOptions(dialog.getByLabelText('Priority'), 'High')
    await user.click(dialog.getByRole('button', { name: 'Save changes' }))

    expect(titlesIn('Backlog')).toEqual(['Final spec'])
    await waitFor(() => expect(db.rows[0]).toMatchObject({ title: 'Final spec', assignee: 'Lee', priority: 'High' }))
  })

  it('renames a card inline: Enter saves, Escape cancels', async () => {
    const { user } = await renderBoard([makeRow({ title: 'Old name' })])

    await user.click(screen.getByRole('button', { name: 'Old name' }))
    await user.clear(screen.getByRole('textbox', { name: 'Card title' }))
    await user.type(screen.getByRole('textbox', { name: 'Card title' }), 'New name{Enter}')
    expect(titlesIn('Backlog')).toEqual(['New name'])
    await waitFor(() => expect(db.rows[0].title).toBe('New name'))

    await user.click(screen.getByRole('button', { name: 'New name' }))
    await user.type(screen.getByRole('textbox', { name: 'Card title' }), 'Throwaway{Escape}')
    expect(titlesIn('Backlog')).toEqual(['New name'])
    expect(db.callsOf('update')).toHaveLength(1)
  })
})

describe('Board: moving cards', () => {
  it('moves a card to another column with the Move menu and announces it', async () => {
    const { user } = await renderBoard([makeRow({ title: 'Ship it', column_id: 'in-progress' })])

    const menu = await openMoveMenu(user, 'Ship it')
    // The card's own column isn't offered.
    expect(menu.queryByRole('button', { name: 'Move to In Progress' })).not.toBeInTheDocument()
    await user.click(menu.getByRole('button', { name: 'Move to In Review' }))

    expect(titlesIn('In Progress')).toEqual([])
    expect(titlesIn('In Review')).toEqual(['Ship it'])
    expect(screen.getByText('Moved "Ship it" to In Review')).toBeInTheDocument()
    await waitFor(() => expect(db.rows[0].column_id).toBe('in-review'))
  })

  it('reorders with Move up / Move down, disabled at the ends', async () => {
    const { user } = await renderBoard([
      makeRow({ title: 'A', position: 1000 }),
      makeRow({ title: 'B', position: 2000 }),
      makeRow({ title: 'C', position: 3000 }),
    ])

    let menu = await openMoveMenu(user, 'A')
    expect(menu.getByRole('button', { name: 'Move up' })).toBeDisabled()
    await user.click(menu.getByRole('button', { name: 'Move down' }))
    expect(titlesIn('Backlog')).toEqual(['B', 'A', 'C'])

    menu = await openMoveMenu(user, 'C')
    expect(menu.getByRole('button', { name: 'Move down' })).toBeDisabled()
    await user.click(menu.getByRole('button', { name: 'Move up' }))
    expect(titlesIn('Backlog')).toEqual(['B', 'C', 'A'])
    expect(screen.getByText('Moved "C" up')).toBeInTheDocument()
  })

  it('keeps keyboard focus on the card after it moves column', async () => {
    const { user } = await renderBoard([makeRow({ title: 'Focus me' })])

    const menu = await openMoveMenu(user, 'Focus me')
    await user.click(menu.getByRole('button', { name: 'Move to Done' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Move Focus me' })).toHaveFocus())
    expect(within(column('Done')).getByRole('button', { name: 'Move Focus me' })).toBeInTheDocument()
  })
})

describe('Board: deleting cards (Undo toast)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('hides the card at once but only deletes it on the server when the toast is dismissed', async () => {
    const { user } = await renderBoard([makeRow({ title: 'Old task' })])

    await user.click(screen.getByRole('button', { name: 'Delete Old task' }))

    expect(titlesIn('Backlog')).toEqual([])
    expect(screen.getByRole('status')).toHaveTextContent('Deleted "Old task"')
    expect(db.callsOf('delete')).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    await waitFor(() => expect(db.rows).toHaveLength(0))
    expect(db.callsOf('delete')).toHaveLength(1)
  })

  it('Undo brings the card back without touching the server', async () => {
    const { user } = await renderBoard([makeRow({ title: 'Keep me' })])

    await user.click(screen.getByRole('button', { name: 'Delete Keep me' }))
    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(titlesIn('Backlog')).toEqual(['Keep me'])
    expect(screen.getByText('Restored "Keep me"')).toBeInTheDocument()
    expect(db.callsOf('delete')).toHaveLength(0)
    expect(db.rows).toHaveLength(1)
  })

  it('Ctrl+Z undoes the delete', async () => {
    const { user } = await renderBoard([makeRow({ title: 'Oops' })])

    await user.click(screen.getByRole('button', { name: 'Delete Oops' }))
    await user.keyboard('{Control>}z{/Control}')

    expect(titlesIn('Backlog')).toEqual(['Oops'])
    expect(db.callsOf('delete')).toHaveLength(0)
  })

  it('commits the delete automatically after 6 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = await renderBoard([makeRow({ title: 'Timed' })], { advanceTimers: vi.advanceTimersByTime })

    await user.click(screen.getByRole('button', { name: 'Delete Timed' }))
    // Move the pointer and focus off the toast: hovering or keyboard focus pauses it (WCAG 2.2.1).
    await user.click(screen.getByRole('searchbox'))
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(db.callsOf('delete')).toHaveLength(0)

    await act(() => vi.advanceTimersByTimeAsync(1500))
    await waitFor(() => expect(db.callsOf('delete')).toHaveLength(1))
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
  })

  it('a second delete finalises the first', async () => {
    const first = makeRow({ title: 'First' })
    const { user } = await renderBoard([first, makeRow({ title: 'Second' })])

    await user.click(screen.getByRole('button', { name: 'Delete First' }))
    await user.click(screen.getByRole('button', { name: 'Delete Second' }))

    await waitFor(() => expect(db.callsOf('delete')).toHaveLength(1))
    expect(db.callsOf('delete')[0].filters[0].value).toEqual([first.id])
    expect(screen.getByRole('status')).toHaveTextContent('Deleted "Second"')
  })

  it('deletes from the edit modal too', async () => {
    const { user } = await renderBoard([makeRow({ title: 'Via modal' })])

    await user.click(screen.getByRole('button', { name: 'Edit Via modal' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(titlesIn('Backlog')).toEqual([])
    expect(screen.getByRole('status')).toHaveTextContent('Deleted "Via modal"')
  })
})
