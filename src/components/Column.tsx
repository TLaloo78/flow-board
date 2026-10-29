import { useState, type DragEvent } from 'react'
import type { Card as CardType, ColumnId } from '../types'
import { Card, CARD_DRAG_TYPE, type MoveTarget } from './Card'

interface ColumnProps {
  id: ColumnId
  label: string
  cards: CardType[]
  /** `menuTarget` is set when the move came from a card's Move menu rather than drag and drop. */
  onMoveCard: (cardId: string, columnId: ColumnId, beforeId?: string, menuTarget?: MoveTarget) => void
  onEditCard: (card: CardType) => void
  onDeleteCard: (cardId: string) => void
  /** Delete is only offered on cards this user created. */
  currentUserId: string
  onRenameCard: (cardId: string, title: string) => void
  /** True when a search is hiding some cards. */
  filtered: boolean
  /** True until the first load finishes, so empty columns don't claim to be empty. */
  loading: boolean
  /** When given, shows a button that removes every card in the column. */
  onClear?: () => void
  clearLabel?: string
}

export function Column({
  id,
  label,
  cards,
  onMoveCard,
  onEditCard,
  onDeleteCard,
  currentUserId,
  onRenameCard,
  filtered,
  loading,
  onClear,
  clearLabel = 'Clear',
}: ColumnProps) {
  const [isOver, setIsOver] = useState(false)

  const handleDragOver = (e: DragEvent<HTMLElement>) => {
    if (!e.dataTransfer.types.includes(CARD_DRAG_TYPE)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!isOver) setIsOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLElement>) => {
    // Ignore leave events fired when moving between child elements.
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsOver(false)
  }

  const handleDrop = (e: DragEvent<HTMLElement>, beforeId?: string) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOver(false)
    const cardId = e.dataTransfer.getData(CARD_DRAG_TYPE)
    if (cardId) onMoveCard(cardId, id, beforeId)
  }

  // Up/down step past the visible neighbours, so moves match what a search shows.
  const handleMenuMove = (index: number, target: MoveTarget) => {
    const cardId = cards[index].id
    if (target === 'up') onMoveCard(cardId, id, cards[index - 1].id, target)
    else if (target === 'down') onMoveCard(cardId, id, cards[index + 2]?.id, target)
    else onMoveCard(cardId, target, undefined, target)
  }

  return (
    <section
      className={`column${isOver ? ' column--over' : ''}`}
      aria-labelledby={`column-${id}-heading`}
      data-column={id}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e)}
    >
      <header className="column-header">
        <h2 id={`column-${id}-heading`}>{label}</h2>
        <span className="column-count">
          {cards.length}
          <span className="sr-only"> {cards.length === 1 ? 'card' : 'cards'}</span>
        </span>
        {onClear && (
          <button type="button" className="column-clear" onClick={onClear}>
            {clearLabel}
          </button>
        )}
      </header>
      <ul className="column-cards">
        {cards.map((card, index) => (
          <Card
            key={card.id}
            card={card}
            onEdit={() => onEditCard(card)}
            onDelete={card.createdBy === currentUserId ? () => onDeleteCard(card.id) : undefined}
            onRename={(title) => onRenameCard(card.id, title)}
            onDropBefore={(e) => handleDrop(e, card.id)}
            onMove={(target) => handleMenuMove(index, target)}
            canMoveUp={index > 0}
            canMoveDown={index < cards.length - 1}
          />
        ))}
        {cards.length === 0 && (
          <li className="column-empty">
            {loading ? 'Loading cards…' : filtered ? 'No matching cards' : 'Drop cards here'}
          </li>
        )}
      </ul>
    </section>
  )
}
