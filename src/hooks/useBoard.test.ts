import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, makeRow, ME } from '../test/supabaseMock'
import { useBoard } from './useBoard'

async function renderBoardHook() {
  const hook = renderHook(() => useBoard(ME))
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

const titles = (cards: { title: string }[]) => cards.map((c) => c.title)

describe('useBoard', () => {
  beforeEach(() => db.reset())

  it('loads every card once the live channel connects, sorted by position', async () => {
    db.reset([
      makeRow({ title: 'Second', position: 2000 }),
      makeRow({ title: 'First', position: 1000 }),
    ])
    const { result } = await renderBoardHook()
    expect(titles(result.current.cards)).toEqual(['First', 'Second'])
    expect(result.current.cards[0]).toMatchObject({ columnId: 'backlog', createdBy: ME })
  })

  describe('creating', () => {
    it('adds the card straight away and inserts it into Backlog after the last card', async () => {
      db.reset([makeRow({ title: 'Existing', position: 3000 })])
      const { result } = await renderBoardHook()

      act(() =>
        result.current.addCard({ title: 'New', assignee: 'Ana', priority: 'High', dueDate: '2026-11-03' }),
      )

      expect(titles(result.current.cards)).toEqual(['Existing', 'New'])
      await waitFor(() => expect(db.callsOf('insert')).toHaveLength(1))
      expect(db.callsOf('insert')[0].payload).toMatchObject({
        title: 'New',
        assignee: 'Ana',
        priority: 'High',
        due_date: '2026-11-03',
        column_id: 'backlog',
        position: 4000,
      })
      // Ownership is stamped server-side (column default auth.uid(), checked by RLS),
      // never taken from the client.
      expect(db.callsOf('insert')[0].payload).not.toHaveProperty('created_by')
      expect(db.rows.find((r) => r.title === 'New')?.created_by).toBe(ME)
      expect(result.current.cards.find((c) => c.title === 'New')?.createdBy).toBe(ME)
    })
  })

  describe('editing', () => {
    it('sends only the fields that changed', async () => {
      const row = makeRow({ title: 'Old title', assignee: 'Sam' })
      db.reset([row])
      const { result } = await renderBoardHook()

      act(() => result.current.updateCard(row.id, { title: 'New title' }))

      expect(result.current.cards[0].title).toBe('New title')
      await waitFor(() => expect(db.callsOf('update')).toHaveLength(1))
      const call = db.callsOf('update')[0]
      expect(call.payload).toEqual({ title: 'New title' })
      expect(call.filters).toEqual([{ kind: 'eq', column: 'id', value: row.id }])
      expect(db.rows[0]).toMatchObject({ title: 'New title', assignee: 'Sam' })
    })
  })

  describe('moving', () => {
    it('moves a card to the end of another column', async () => {
      const card = makeRow({ title: 'Mover', column_id: 'backlog', position: 1000 })
      db.reset([card, makeRow({ title: 'Reviewing', column_id: 'in-review', position: 5000 })])
      const { result } = await renderBoardHook()

      act(() => result.current.moveCard(card.id, 'in-review'))

      const moved = result.current.cards.find((c) => c.id === card.id)
      expect(moved).toMatchObject({ columnId: 'in-review', position: 6000 })
      await waitFor(() => expect(db.callsOf('update')).toHaveLength(1))
      expect(db.callsOf('update')[0].payload).toEqual({ column_id: 'in-review', position: 6000 })
    })

    it('places a card between its new neighbours when dropped before one', async () => {
      const a = makeRow({ title: 'A', position: 1000 })
      const b = makeRow({ title: 'B', position: 2000 })
      const c = makeRow({ title: 'C', position: 3000 })
      db.reset([a, b, c])
      const { result } = await renderBoardHook()

      act(() => result.current.moveCard(c.id, 'backlog', b.id))

      expect(titles(result.current.cards)).toEqual(['A', 'C', 'B'])
      expect(result.current.cards[1].position).toBe(1500)
    })

    it('does nothing when a card is dropped onto itself', async () => {
      const a = makeRow({ title: 'A' })
      db.reset([a])
      const { result } = await renderBoardHook()

      act(() => result.current.moveCard(a.id, 'backlog', a.id))

      await Promise.resolve()
      expect(db.callsOf('update')).toHaveLength(0)
    })
  })

  describe('deleting', () => {
    it('removes the cards and deletes exactly those ids, asking for the deleted rows back', async () => {
      const keep = makeRow({ title: 'Keep' })
      const drop1 = makeRow({ title: 'Drop 1' })
      const drop2 = makeRow({ title: 'Drop 2' })
      db.reset([keep, drop1, drop2])
      const { result } = await renderBoardHook()

      await act(() => result.current.deleteCards([drop1.id, drop2.id]))

      expect(titles(result.current.cards)).toEqual(['Keep'])
      const call = db.callsOf('delete')[0]
      expect(call.filters).toEqual([{ kind: 'in', column: 'id', value: [drop1.id, drop2.id] }])
      expect(call.returning).toBe('id')
      expect(db.rows.map((r) => r.title)).toEqual(['Keep'])
      expect(result.current.error).toBeNull()
    })
  })

  it('shows the error and reloads the true state when a write fails', async () => {
    const row = makeRow({ title: 'Original' })
    db.reset([row])
    const { result } = await renderBoardHook()
    db.failNextWrite('network down')

    act(() => result.current.updateCard(row.id, { title: 'Lost edit' }))

    await waitFor(() => expect(result.current.error).toBe("Couldn't save the card: network down"))
    await waitFor(() => expect(result.current.cards[0].title).toBe('Original'))
  })
})
