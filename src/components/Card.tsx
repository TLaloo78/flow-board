import { useRef, useState, type DragEvent, type ToggleEvent } from 'react'
import { COLUMNS, type Card as CardType, type ColumnId } from '../types'
import { AssigneeIcon } from './AssigneeIcon'

export const CARD_DRAG_TYPE = 'application/x-flow-board-card'

/** Id of the shared, visually hidden "Press to rename" hint for card titles. */
export const RENAME_HINT_ID = 'card-rename-hint'

/** Where the Move menu sends a card: one step within its column, or to another column. */
export type MoveTarget = 'up' | 'down' | ColumnId

interface CardProps {
  card: CardType
  onEdit: () => void
  /** Omitted when the user can't delete this card (only its creator can). */
  onDelete?: () => void
  onRename: (title: string) => void
  onDropBefore: (e: DragEvent<HTMLElement>) => void
  onMove: (target: MoveTarget) => void
  canMoveUp: boolean
  canMoveDown: boolean
}

function formatDueDate(iso: string | null): string {
  if (!iso) return 'No due date'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function isOverdue(iso: string | null, columnId: CardType['columnId']): boolean {
  if (!iso || columnId === 'done') return false
  const today = new Date()
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return iso < todayIso
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
      <path d="M15 5l4 4" />
    </svg>
  )
}

function MoveIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2v20M2 12h20M9 5l3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3" />
    </svg>
  )
}

interface MoveMenuProps {
  card: CardType
  canMoveUp: boolean
  canMoveDown: boolean
  onMove: (target: MoveTarget) => void
  onOpenChange: (open: boolean) => void
}

// A popover gives the menu the top layer plus Escape / click-outside dismissal,
// and returns focus to the Move button when it closes.
function MoveMenu({ card, canMoveUp, canMoveDown, onMove, onOpenChange }: MoveMenuProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const menuId = `move-menu-${card.id}`

  // Anchor below the button, right-aligned; flip above when there's no room below.
  const position = (e: ToggleEvent<HTMLDivElement>) => {
    if (e.newState !== 'open' || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const style = e.currentTarget.style
    style.right = `${window.innerWidth - rect.right}px`
    const below = rect.bottom + 4 + 260 <= window.innerHeight
    style.top = below ? `${rect.bottom + 4}px` : 'auto'
    style.bottom = below ? 'auto' : `${window.innerHeight - rect.top + 4}px`
  }

  const handleToggle = (e: ToggleEvent<HTMLDivElement>) => {
    const isOpen = e.newState === 'open'
    setOpen(isOpen)
    onOpenChange(isOpen)
    if (isOpen) menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  }

  const choose = (target: MoveTarget) => {
    menuRef.current?.hidePopover()
    onMove(target)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn card-move-btn"
        popoverTarget={menuId}
        aria-label={`Move ${card.title}`}
        aria-expanded={open}
        aria-controls={menuId}
        title="Move card"
      >
        <MoveIcon />
      </button>
      <div
        ref={menuRef}
        id={menuId}
        className="move-menu"
        popover="auto"
        aria-label={`Move ${card.title}`}
        onBeforeToggle={position}
        onToggle={handleToggle}
      >
        <button type="button" disabled={!canMoveUp} onClick={() => choose('up')}>
          Move up
        </button>
        <button type="button" disabled={!canMoveDown} onClick={() => choose('down')}>
          Move down
        </button>
        <hr />
        <p className="move-menu-heading" aria-hidden="true">
          Move to
        </p>
        {COLUMNS.filter((col) => col.id !== card.columnId).map((col) => (
          // aria-label keeps the visible column name (WCAG 2.5.3) and reads the same in every engine.
          <button key={col.id} type="button" aria-label={`Move to ${col.label}`} onClick={() => choose(col.id)}>
            {col.label}
          </button>
        ))}
      </div>
    </>
  )
}

interface InlineTitleProps {
  title: string
  editing: boolean
  setEditing: (editing: boolean) => void
  onRename: (title: string) => void
}

function InlineTitle({ title, editing, setEditing, onRename }: InlineTitleProps) {
  const [value, setValue] = useState(title)
  // Set once the edit is saved or cancelled, so a blur that follows
  // Enter/Escape doesn't finish it a second time.
  const finished = useRef(false)

  const startEditing = () => {
    finished.current = false
    setValue(title)
    setEditing(true)
  }

  const finish = (save: boolean) => {
    if (finished.current) return
    finished.current = true
    setEditing(false)
    const next = value.trim()
    if (save && next && next !== title) onRename(next)
  }

  if (!editing) {
    return (
      <h3 className="card-title">
        {/* RENAME_HINT_ID is rendered once by Board; a description doesn't change the heading's text. */}
        <button
          type="button"
          className="card-title-btn"
          onClick={startEditing}
          title="Click to rename"
          aria-describedby={RENAME_HINT_ID}
        >
          {title}
        </button>
      </h3>
    )
  }

  return (
    <input
      className="card-title-input"
      aria-label="Card title"
      value={value}
      maxLength={120}
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(true)
        if (e.key === 'Escape') finish(false)
      }}
    />
  )
}

export function Card({
  card,
  onEdit,
  onDelete,
  onRename,
  onDropBefore,
  onMove,
  canMoveUp,
  canMoveDown,
}: CardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const overdue = isOverdue(card.dueDate, card.columnId)

  const handleDragStart = (e: DragEvent<HTMLLIElement>) => {
    e.dataTransfer.setData(CARD_DRAG_TYPE, card.id)
    e.dataTransfer.effectAllowed = 'move'
    setIsDragging(true)
  }

  return (
    <li
      className={`card${isDragging ? ' card--dragging' : ''}${overdue ? ' card--overdue' : ''}`}
      draggable={!editingTitle && !menuOpen}
      data-card-id={card.id}
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDragging(false)}
      onDrop={onDropBefore}
    >
      <div className="card-top">
        <span className={`priority priority--${card.priority.toLowerCase()}`}>{card.priority}</span>
        <div className="card-actions">
          <MoveMenu
            card={card}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            onMove={onMove}
            onOpenChange={setMenuOpen}
          />
          <button
            type="button"
            className="icon-btn"
            onClick={onEdit}
            aria-label={`Edit ${card.title}`}
            title="Edit card"
          >
            <PencilIcon />
          </button>
          {onDelete && (
            <button
              type="button"
              className="icon-btn icon-btn--danger icon-btn--delete"
              onClick={onDelete}
              aria-label={`Delete ${card.title}`}
              title="Delete card"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>
      <InlineTitle title={card.title} editing={editingTitle} setEditing={setEditingTitle} onRename={onRename} />
      <div className="card-meta">
        {/* title tooltips aren't reliably read, so screen readers get hidden labels too. */}
        <span className="card-assignee" title="Assignee">
          <AssigneeIcon name={card.assignee} />
          <span className="sr-only">Assignee: </span>
          {card.assignee}
        </span>
        <span
          className={`card-due${overdue ? ' card-due--overdue' : ''}${card.dueDate ? '' : ' card-due--none'}`}
          title="Due date"
        >
          {card.dueDate && <span className="sr-only">Due: </span>}
          {overdue && 'Overdue · '}
          {formatDueDate(card.dueDate)}
        </span>
      </div>
    </li>
  )
}
