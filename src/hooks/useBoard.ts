import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/database.types'
import type { Card, CardDraft, ColumnId, Priority } from '../types'

type CardRow = Database['public']['Tables']['cards']['Row']

const POSITION_STEP = 1000

function fromRow(row: CardRow): Card {
  return {
    id: row.id,
    title: row.title,
    assignee: row.assignee,
    priority: row.priority as Priority,
    dueDate: row.due_date,
    columnId: row.column_id as ColumnId,
    position: row.position,
    createdBy: row.created_by,
  }
}

function upsert(cards: Card[], card: Card): Card[] {
  const exists = cards.some((c) => c.id === card.id)
  return exists ? cards.map((c) => (c.id === card.id ? card : c)) : [...cards, card]
}

function lastPosition(cards: Card[], columnId: ColumnId): number {
  return cards
    .filter((c) => c.columnId === columnId)
    .reduce((max, c) => Math.max(max, c.position), 0)
}

/** `userId` is the signed-in user; it stamps new cards and limits clearing to their own. */
export function useBoard(userId: string) {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    const { data, error } = await supabase.from('cards').select('*').order('position')
    if (error) {
      setError(`Couldn't load cards: ${error.message}`)
    } else {
      setCards(data.map(fromRow))
    }
    setLoading(false)
  }, [])

  // Subscribe to live changes, then (re)load the full board each time the
  // channel connects so nothing is missed between the fetch and subscribe.
  useEffect(() => {
    const channel = supabase
      .channel('cards-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = (payload.old as Partial<CardRow>).id
          if (id) setCards((prev) => prev.filter((c) => c.id !== id))
        } else {
          setCards((prev) => upsert(prev, fromRow(payload.new as CardRow)))
        }
      })
      .subscribe((status) => {
        // Load on connect; also load if live updates are unavailable.
        if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          void refetch()
        }
      })
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [refetch])

  /**
   * Run a write; on failure show the error and reload the true state.
   * RLS makes a blocked delete succeed with zero rows, so deletes pass
   * `expectedRows` (with `.select('id')`) to catch rows that weren't removed.
   */
  const persist = useCallback(
    async (
      action: string,
      write: PromiseLike<{ error: { message: string } | null; data?: unknown }>,
      expectedRows?: number,
    ) => {
      const { error, data } = await write
      const affected = Array.isArray(data) ? data.length : 0
      if (error) {
        setError(`Couldn't ${action}: ${error.message}`)
      } else if (expectedRows !== undefined && affected < expectedRows) {
        setError(`Couldn't ${action}: only a card's creator can delete it.`)
      } else {
        return
      }
      await refetch()
    },
    [refetch],
  )

  const addCard = useCallback(
    (draft: CardDraft) => {
      const card: Card = {
        ...draft,
        id: crypto.randomUUID(),
        columnId: 'backlog',
        position: lastPosition(cards, 'backlog') + POSITION_STEP,
        createdBy: userId,
      }
      setCards((prev) => [...prev, card])
      void persist(
        'add the card',
        supabase.from('cards').insert({
          id: card.id,
          title: card.title,
          assignee: card.assignee,
          priority: card.priority,
          due_date: card.dueDate,
          column_id: card.columnId,
          position: card.position,
        }),
      )
    },
    [cards, persist, userId],
  )

  /** Update some or all of a card's fields. Omitted fields are left unchanged. */
  const updateCard = useCallback(
    (id: string, changes: Partial<CardDraft>) => {
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...changes } : c)))
      // Undefined values are dropped from the request body, so only the
      // given fields are written.
      void persist(
        'save the card',
        supabase
          .from('cards')
          .update({
            title: changes.title,
            assignee: changes.assignee,
            priority: changes.priority,
            due_date: changes.dueDate,
          })
          .eq('id', id),
      )
    },
    [persist],
  )

  /**
   * Delete cards by id (by id, so a card moved meanwhile isn't caught up in a
   * bulk clear). Resolves once the server has answered.
   */
  const deleteCards = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return Promise.resolve()
      setCards((prev) => prev.filter((c) => !ids.includes(c.id)))
      return persist(
        ids.length === 1 ? 'delete the card' : 'delete the cards',
        supabase.from('cards').delete().in('id', ids).select('id'),
        ids.length,
      )
    },
    [persist],
  )

  /**
   * Move a card to a column. If `beforeId` is given, the card is placed
   * directly before that card; otherwise it goes to the end of the column.
   */
  const moveCard = useCallback(
    (id: string, columnId: ColumnId, beforeId?: string) => {
      if (id === beforeId) return
      const others = cards
        .filter((c) => c.columnId === columnId && c.id !== id)
        .sort((a, b) => a.position - b.position)
      const index = beforeId ? others.findIndex((c) => c.id === beforeId) : -1
      let position: number
      if (index === -1) {
        position = (others.at(-1)?.position ?? 0) + POSITION_STEP
      } else {
        const next = others[index].position
        const prev = index > 0 ? others[index - 1].position : next - POSITION_STEP
        position = (prev + next) / 2
      }
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, columnId, position } : c)))
      void persist(
        'move the card',
        supabase.from('cards').update({ column_id: columnId, position }).eq('id', id),
      )
    },
    [cards, persist],
  )

  const sortedCards = useMemo(() => [...cards].sort((a, b) => a.position - b.position), [cards])

  return {
    cards: sortedCards,
    loading,
    error,
    clearError: () => setError(null),
    addCard,
    updateCard,
    deleteCards,
    moveCard,
  }
}
