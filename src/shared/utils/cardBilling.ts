import type { Transaction } from '@store/financeStore'

export function resolveCardId(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized ? normalized : null
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>

    if (typeof record.id === 'string') {
      const normalized = record.id.trim()
      if (normalized) {
        return normalized
      }
    }

    if (typeof record.cardId === 'string') {
      const normalized = record.cardId.trim()
      if (normalized) {
        return normalized
      }
    }

    if (typeof record.card_id === 'string') {
      const normalized = record.card_id.trim()
      if (normalized) {
        return normalized
      }
    }
  }

  return null
}

export function getCardBillsById(transactions: Transaction[]) {
  const billMap = new Map<string, number>()

  transactions.forEach((transaction) => {
    if (transaction.type !== 'expense') {
      return
    }

    const normalizedCardId = resolveCardId((transaction as Transaction & { cardId?: unknown; card_id?: unknown; card?: unknown }).cardId ?? (transaction as Transaction & { cardId?: unknown; card_id?: unknown; card?: unknown }).card_id ?? (transaction as Transaction & { cardId?: unknown; card_id?: unknown; card?: unknown }).card)

    if (!normalizedCardId) {
      return
    }

    billMap.set(normalizedCardId, (billMap.get(normalizedCardId) ?? 0) + transaction.amount)
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
