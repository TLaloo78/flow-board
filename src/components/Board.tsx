import { useCallback, useEffect, useRef, useState } from 'react'
import { useBoard } from '../hooks/useBoard'
import { supabase } from '../lib/supabase'
import { COLUMNS, type Card, type CardDraft, type ColumnId } from '../types'
import { RENAME_HINT_ID, type MoveTarget } from './Card'
import { Column } from './Column'
import { CardModal } from './CardModal'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { Toast } from './Toast'

type ModalState = { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; card: Card }

/** Cards hidden from the board while their Undo toast is showing. */
interface PendingDelete {
  key: number
  ids: string[]
  message: string
  restoredMessage: string
}

const columnLabel = (id: ColumnId) => COLUMNS.find((c) => c.id === id)?.label ?? id

const isTextField = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

export function Board({ userId, userEmail }: { userId: string; userEmail: string }) {
  const {
    cards: allCards,
    loading,
    error,
    clearError,
    addCard,
    updateCard,
    deleteCards,
    moveCard,
  } = useBoard(userId)
  // Deletes wait until the toast closes, so Undo just un-hides the cards and
  // nothing has to be recreated on the server.
  const [pending, setPending] = useState<PendingDelete | null>(null)
  const pendingRef = useRef<PendingDelete | null>(null)
  const mainRef = useRef<HTMLElement>(null)
  const toastRegionRef = useRef<HTMLDivElement>(null)
  const cards = pending ? allCards.filter((c) => !pending.ids.includes(c.id)) : allCards

  // Each screen sets its own tab title (WCAG 2.4.2); AuthForm sets the sign-in one.
  useEffect(() => {
    document.title = 'Flow Board'
  }, [])
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })
  const [query, setQuery] = useState('')
  const [announcement, setAnnouncement] = useState('')
  // Card whose Move button should get focus once it re-renders in its new spot.
  const [focusCardId, setFocusCardId] = useState<string | null>(null)

  // Screen readers skip a live region whose text doesn't change, so a trailing
  // non-breaking space is toggled to make repeat messages announce again.
  const announce = (message: string) =>
    setAnnouncement((prev) => (prev === message ? `${message} ` : message))

  useEffect(() => {
    if (!focusCardId) return
    const frame = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-card-id="${focusCardId}"] .card-move-btn`)?.focus()
      setFocusCardId(null)
    })
    return () => cancelAnimationFrame(frame)
  }, [focusCardId, cards])

  const keyword = query.trim().toLowerCase()
  const visibleCards = keyword
    ? cards.filter((c) =>
        [c.title, c.assignee, c.priority].some((field) => field.toLowerCase().includes(keyword)),
      )
    : cards

  const handleSave = (draft: CardDraft) => {
    if (modal.mode === 'edit') {
      updateCard(modal.card.id, draft)
      announce(`Saved "${draft.title}"`)
    } else {
      addCard(draft)
      announce(`Added "${draft.title}" to ${columnLabel('backlog')}`)
    }
    setModal({ mode: 'closed' })
  }

  const handleRename = (id: string, title: string) => {
    updateCard(id, { title })
    announce(`Renamed card to "${title}"`)
  }

  const handleMove = (id: string, columnId: ColumnId, beforeId?: string, menuTarget?: MoveTarget) => {
    const card = cards.find((c) => c.id === id)
    if (!card || id === beforeId) return
    moveCard(id, columnId, beforeId)
    if (menuTarget === 'up' || menuTarget === 'down') {
      announce(`Moved "${card.title}" ${menuTarget}`)
    } else if (columnId === card.columnId) {
      announce(`Moved "${card.title}" within ${columnLabel(columnId)}`)
    } else {
      announce(`Moved "${card.title}" to ${columnLabel(columnId)}`)
    }
    if (menuTarget) setFocusCardId(id)
  }

  const showPending = (next: PendingDelete | null) => {
    pendingRef.current = next
    setPending(next)
  }

  /** Send the pending delete to the server now. The ref guards against committing twice. */
  const commitPending = useCallback(() => {
    const current = pendingRef.current
    if (!current) return Promise.resolve()
    pendingRef.current = null
    setPending(null)
    return deleteCards(current.ids)
  }, [deleteCards])

  // If focus was on the toast when it goes away, park it on the board rather than the page.
  const keepFocusAfterToast = () => {
    if (toastRegionRef.current?.contains(document.activeElement)) mainRef.current?.focus()
  }

  const handleToastClose = useCallback(() => {
    keepFocusAfterToast()
    void commitPending()
  }, [commitPending])

  const handleUndo = useCallback(() => {
    const current = pendingRef.current
    if (!current) return
    const hadFocus = toastRegionRef.current?.contains(document.activeElement)
    showPending(null)
    announce(current.restoredMessage)
    if (current.ids.length === 1) setFocusCardId(current.ids[0])
    else if (hadFocus) mainRef.current?.focus()
  }, [])

  // Finish any pending delete if the board goes away (e.g. session expiry).
  const commitRef = useRef(commitPending)
  useEffect(() => {
    commitRef.current = commitPending
  }, [commitPending])
  useEffect(() => () => void commitRef.current(), [])

  // Ctrl/Cmd+Z undoes the last delete, except while typing (text fields keep their own undo).
  useEffect(() => {
    if (!pending) return
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !isTextField(e.target)) {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pending, handleUndo])

  /** Hide cards now and delete them when the Undo toast closes. */
  const startDelete = (ids: string[], message: string, restoredMessage: string) => {
    void commitPending() // a newer delete replaces the toast, so finish the older one
    showPending({ key: Date.now(), ids, message, restoredMessage })
    setModal({ mode: 'closed' })
  }

  const handleDelete = (id: string) => {
    const card = cards.find((c) => c.id === id)
    // The UI only offers delete on your own cards; RLS enforces the same rule.
    if (!card || card.createdBy !== userId) return
    startDelete([id], `Deleted "${card.title}"`, `Restored "${card.title}"`)
  }

  // Only your own cards can be deleted, so "Clear completed" covers just those,
  // including any hidden by the current search.
  const myDoneIds = cards.filter((c) => c.columnId === 'done' && c.createdBy === userId).map((c) => c.id)

  const handleClearDone = () => {
    const count = myDoneIds.length
    const noun = count === 1 ? 'card' : 'cards'
    startDelete(myDoneIds, `Deleted ${count} completed ${noun}`, `Restored ${count} completed ${noun}`)
  }

  const handleSignOut = async () => {
    await commitPending() // send the delete while the session is still valid
    await supabase.auth.signOut()
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <Logo />
          <h1>Flow Board</h1>
        </div>
        <div className="search">
          <input
            type="search"
            className="search-input"
            placeholder="Search cards…"
            aria-label="Search cards by title, assignee or priority"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setQuery('')
            }}
          />
          {keyword && (
            <span className="search-count" aria-live="polite">
              {visibleCards.length} of {cards.length}
            </span>
          )}
        </div>
        <div className="header-actions">
          <span className="user-email" title={userEmail}>
            {userEmail}
          </span>
          <ThemeToggle />
          <button type="button" className="btn" onClick={() => void handleSignOut()}>
            Sign out
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setModal({ mode: 'add' })}>
            <span aria-hidden="true">+ </span>Add card
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="icon-btn" onClick={clearError} aria-label="Dismiss error">
            ✕
          </button>
        </div>
      )}

      <main ref={mainRef} className="board" aria-busy={loading} tabIndex={-1}>
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            id={col.id}
            label={col.label}
            cards={visibleCards.filter((c) => c.columnId === col.id)}
            filtered={keyword !== ''}
            loading={loading}
            onMoveCard={handleMove}
            onEditCard={(card) => setModal({ mode: 'edit', card })}
            onDeleteCard={handleDelete}
            currentUserId={userId}
            onRenameCard={handleRename}
            onClear={col.id === 'done' && myDoneIds.length > 0 ? handleClearDone : undefined}
            clearLabel="Clear completed"
          />
        ))}
      </main>

      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      <span id={RENAME_HINT_ID} className="sr-only">
        Press to rename
      </span>

      {/* Always mounted so screen readers announce the toast when it appears. */}
      <div ref={toastRegionRef} className="toast-region" role="status">
        {pending && (
          <Toast key={pending.key} message={pending.message} onUndo={handleUndo} onClose={handleToastClose} />
        )}
      </div>

      {modal.mode !== 'closed' && (
        <CardModal
          card={modal.mode === 'edit' ? modal.card : undefined}
          onSave={handleSave}
          onDelete={modal.mode === 'edit' && modal.card.createdBy === userId ? handleDelete : undefined}
          onClose={() => setModal({ mode: 'closed' })}
        />
      )}
    </div>
  )
}
