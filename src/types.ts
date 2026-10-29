export type ColumnId = 'backlog' | 'in-progress' | 'in-review' | 'on-hold' | 'done'

export type Priority = 'High' | 'Medium' | 'Low'

export interface Card {
  id: string
  title: string
  assignee: string
  priority: Priority
  /** ISO date string (YYYY-MM-DD), or null when the card has no due date. */
  dueDate: string | null
  columnId: ColumnId
  /** Sort order within the column; lower comes first. */
  position: number
  /** User id of the card's creator; only they can delete it (enforced by RLS). */
  createdBy: string
}

export type CardDraft = Omit<Card, 'id' | 'columnId' | 'position' | 'createdBy'>

export const COLUMNS: { id: ColumnId; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'in-review', label: 'In Review' },
  { id: 'on-hold', label: 'On Hold' },
  { id: 'done', label: 'Done' },
]

export const PRIORITIES: Priority[] = ['High', 'Medium', 'Low']
