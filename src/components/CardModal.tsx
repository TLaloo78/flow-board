import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PRIORITIES, type Card, type CardDraft, type Priority } from '../types'

interface CardModalProps {
  /** Card being edited; omit to create a new card. */
  card?: Card
  onSave: (draft: CardDraft) => void
  /** Omitted when the user can't delete this card (only its creator can). */
  onDelete?: (id: string) => void
  onClose: () => void
}

export function CardModal({ card, onSave, onDelete, onClose }: CardModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState(card?.title ?? '')
  const [assignee, setAssignee] = useState(card?.assignee ?? '')
  const [priority, setPriority] = useState<Priority>(card?.priority ?? 'Medium')
  const [dueDate, setDueDate] = useState(card?.dueDate ?? '')

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.close()
  }, [])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSave({ title: title.trim(), assignee: assignee.trim(), priority, dueDate: dueDate || null })
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="card-modal-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself) closes the modal.
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form className="modal-body" onSubmit={handleSubmit}>
        <h2 id="card-modal-title">{card ? 'Edit card' : 'New card'}</h2>

        <label className="field">
          <span>Title</span>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            maxLength={120}
          />
        </label>

        <label className="field">
          <span>Assignee</span>
          <input
            name="assignee"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            required
            maxLength={60}
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Priority</span>
            <select name="priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Due date (optional)</span>
            <input type="date" name="dueDate" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
        </div>

        <div className="modal-actions">
          {card && onDelete && (
            <button type="button" className="btn btn-danger" onClick={() => onDelete(card.id)}>
              Delete
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {card ? 'Save changes' : 'Add card'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
