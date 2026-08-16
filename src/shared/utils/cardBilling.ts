import type { Transaction } from '@store/financeStore'

export function getCardBillsById(transactions: Transaction[]) {
  const billMap = new Map<string, number>()

  transactions.forEach((transaction) => {
    if (transaction.type !== 'expense' || !transaction.cardId) {
      return
    }

    billMap.set(transaction.cardId, (billMap.get(transaction.cardId) ?? 0) + transaction.amount)
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
