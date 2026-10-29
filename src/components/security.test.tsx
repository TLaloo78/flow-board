// Regression: card ownership from the security audit. Only a card's creator can
// delete it; the UI hides delete on other people's cards, and a delete the
// server's RLS blocks is reported and rolled back instead of failing silently.
import { act, renderHook, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useBoard } from '../hooks/useBoard'
import { cardItem, renderBoard, titlesIn } from '../test/render'
import { db, makeRow, ME, TEAMMATE } from '../test/supabaseMock'

describe('card ownership', () => {
  it("offers Move and Edit but not Delete on a teammate's card", async () => {
    await renderBoard([makeRow({ title: 'Mine' }), makeRow({ title: 'Theirs', created_by: TEAMMATE })])

    expect(within(cardItem('Mine')).getByRole('button', { name: 'Delete Mine' })).toBeInTheDocument()
    const theirs = within(cardItem('Theirs'))
    expect(theirs.queryByRole('button', { name: /^Delete/ })).not.toBeInTheDocument()
    expect(theirs.getByRole('button', { name: 'Edit Theirs' })).toBeInTheDocument()
    expect(theirs.getByRole('button', { name: 'Move Theirs' })).toBeInTheDocument()
  })

  it("has no Delete button in the editor for a teammate's card", async () => {
    const { user } = await renderBoard([makeRow({ title: 'Theirs', created_by: TEAMMATE })])
    await user.click(screen.getByRole('button', { name: 'Edit Theirs' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Edit card' }))
    expect(dialog.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(dialog.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it('lets teammates edit each other’s cards (shared board)', async () => {
    const { user } = await renderBoard([makeRow({ title: 'Theirs', created_by: TEAMMATE })])
    await user.click(screen.getByRole('button', { name: 'Theirs' }))
    await user.type(screen.getByRole('textbox', { name: 'Card title' }), ' (reviewed){Enter}')
    await waitFor(() => expect(db.rows[0].title).toBe('Theirs (reviewed)'))
  })

  it('"Clear completed" only removes my own Done cards', async () => {
    const mine = makeRow({ title: 'My done', column_id: 'done' })
    const { user } = await renderBoard([mine, makeRow({ title: 'Their done', column_id: 'done', created_by: TEAMMATE })])

    await user.click(screen.getByRole('button', { name: 'Clear completed' }))
    expect(titlesIn('Done')).toEqual(['Their done'])
    expect(screen.getByRole('status')).toHaveTextContent('Deleted 1 completed card')

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))
    await waitFor(() => expect(db.callsOf('delete')).toHaveLength(1))
    expect(db.callsOf('delete')[0].filters[0].value).toEqual([mine.id])
    expect(db.rows.map((r) => r.title)).toEqual(['Their done'])
  })

  it('hides "Clear completed" when none of the Done cards are mine', async () => {
    await renderBoard([makeRow({ title: 'Their done', column_id: 'done', created_by: TEAMMATE })])
    expect(screen.queryByRole('button', { name: 'Clear completed' })).not.toBeInTheDocument()
  })

  it('reports a delete that RLS blocked and restores the card', async () => {
    const theirs = makeRow({ title: 'Theirs', created_by: TEAMMATE })
    db.reset([theirs], ME)
    const { result } = renderHook(() => useBoard(ME))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(() => result.current.deleteCards([theirs.id]))

    expect(result.current.error).toBe("Couldn't delete the card: only a card's creator can delete it.")
    await waitFor(() => expect(result.current.cards.map((c) => c.title)).toEqual(['Theirs']))
    expect(db.rows).toHaveLength(1)
  })
})
