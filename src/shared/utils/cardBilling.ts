import type { Card } from '@store/cardsStore'
import type { Transaction } from '@store/financeStore'

export function normalizeCardRef(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized ? normalized.toLowerCase() : null
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>

    const candidates = [record.id, record.cardId, record.card_id, record.card, record.name]

    for (const candidate of candidates) {
      if (typeof candidate === 'string') {
        const normalized = candidate.trim()
        if (normalized) {
          return normalized.toLowerCase()
        }
      }
    }
  }

  return null
}

function resolveTransactionCardId(transaction: Transaction, cards: Card[] = []) {
  const directValue = (transaction as Transaction & { cardId?: unknown; card_id?: unknown; card?: unknown }).cardId ?? (transaction as Transaction & { cardId?: unknown; card_id?: unknown; card?: unknown }).card_id ?? (transaction as Transaction & { cardId?: unknown; card_id?: unknown; card?: unknown }).card

  const directRef = normalizeCardRef(directValue)
  if (directRef) {
    const exactCard = cards.find((card) => card.id.toLowerCase() === directRef || card.name.trim().toLowerCase() === directRef)
    if (exactCard) {
      return exactCard.id
    }

    return directRef
  }

  return null
}

export function getCardBillsById(transactions: Transaction[], cards: Card[] = []) {
  const billMap = new Map<string, number>()

  transactions.forEach((transaction) => {
    if (transaction.type !== 'expense') {
      return
    }

    const cardId = resolveTransactionCardId(transaction, cards)
    if (!cardId) {
      return
    }

    billMap.set(cardId, (billMap.get(cardId) ?? 0) + transaction.amount)
  })

  return billMap
}

export function getCardUsageDetails(limit: number, bill: number) {
  const percentage = limit > 0 ? Math.min(Math.round((bill / limit) * 100), 100) : 0
  const available = Math.max(limit - bill, 0)

  return {
    percentage,
    available,
  }
}
