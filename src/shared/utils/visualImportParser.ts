import * as XLSX from 'xlsx'

export type VisualImportType = 'income' | 'expense'

export type VisualTransaction = {
  name: string
  category: string
  amount: number
  type: VisualImportType
  date: Date
  sourceSheet: string
  sourceRow: number
}

export type AutoDetectedImportSummary = {
  transactions: VisualTransaction[]
  ignored: string[]
  totals: {
    income: number
    expense: number
  }
  previewTotal: number
  isValid: boolean
  validationMessage?: string
}

const normalizeHeader = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const isSummaryCell = (value: string) => {
  const normalized = normalizeHeader(value)
  if (!normalized) {
    return true
  }

  return /^(total|saldo|resumo|subtotal|cartoes|cartões|terceiros|reservas|casa|titulo|title|mes|mês|receber|pagar|a receber|à receber|a pagar|à pagar|cartao|cartão)$/i.test(normalized)
    || /(total|saldo|resumo|subtotal|cartoes|cartões|terceiros|reservas|casa|titulo|title|mes|mês|cartao|cartão)/i.test(normalized)
}

const parseDateValue = (value: string): Date | null => {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('=')) {
    return null
  }

  const directDate = new Date(trimmed)
  if (!Number.isNaN(directDate.getTime())) {
    return directDate
  }

  const patterns = [
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{2}[-/]\d{2}[-/]\d{4}$/,
    /^\d{4}[-/]\d{2}[-/]\d{2}$/,
    /^\d{2}\/\d{2}\/\d{2}$/,
    /^\d{1,2}\/\d{1,2}$/,
    /^\d{1,2}-\d{1,2}$/,
  ]

  for (const pattern of patterns) {
    if (!pattern.test(trimmed)) {
      continue
    }

    if (trimmed.includes('-') && trimmed.length === 10 && trimmed[4] === '-') {
      const [year, month, day] = trimmed.split('-').map(Number)
      return new Date(year, month - 1, day)
    }

    if (trimmed.includes('/') && trimmed.split('/').length >= 2) {
      const parts = trimmed.split('/')
      if (parts.length === 2) {
        const [day, month] = parts.map(Number)
        if (!Number.isNaN(day) && !Number.isNaN(month)) {
          return new Date(new Date().getFullYear(), month - 1, day)
        }
      }

      const [first, second, third] = parts
      const day = Number(first)
      const month = Number(second)
      const year = Number(third.length === 2 ? `20${third}` : third)

      if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
        return new Date(year, month - 1, day)
      }
    }

    if (trimmed.includes('-') && trimmed.split('-').length === 2) {
      const [day, month] = trimmed.split('-').map(Number)
      if (!Number.isNaN(day) && !Number.isNaN(month)) {
        return new Date(new Date().getFullYear(), month - 1, day)
      }
    }
  }

  return null
}

const sanitizeAmountValue = (value: string): string | null => {
  const raw = value.trim().replace(/\s+/g, '')
  if (!raw || raw.startsWith('=')) {
    return null
  }

  let cleaned = raw.replace(/R\$/gi, '').replace(/\u00A0/g, '').replace(/\(|\)/g, '')

  if (!cleaned) {
    return null
  }

  if (cleaned.startsWith('-')) {
    cleaned = `-${cleaned.slice(1)}`
  }

  cleaned = cleaned.replace(/[^0-9+\-.,]/g, '')

  if (!cleaned || !/[0-9]/.test(cleaned)) {
    return null
  }

  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',')
    const lastDot = cleaned.lastIndexOf('.')
    const decimalSeparator = lastComma > lastDot ? ',' : '.'
    const thousandSeparator = decimalSeparator === ',' ? '.' : ','
    cleaned = cleaned.replace(new RegExp(`\\${thousandSeparator}`, 'g'), '').replace(decimalSeparator, '.')
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/,/g, '.')
  }

  if (!/^[0-9+\-.,]+$/.test(cleaned)) {
    return null
  }

  return cleaned
}

const parseAmount = (value: string): number | null => {
  const cleaned = sanitizeAmountValue(value)
  if (!cleaned) {
    return null
  }

  try {
    const numericValue = Function(`"use strict"; return (${cleaned});`)()
    if (typeof numericValue !== 'number' || !Number.isFinite(numericValue)) {
      return null
    }
    return numericValue
  } catch {
    return null
  }
}

const buildCandidate = (row: string[], section: VisualImportType, sheetName: string, rowIndex: number) => {
  const dateIndex = section === 'income' ? 0 : 7
  const descriptionIndex = section === 'income' ? 1 : 8
  const amountIndex = section === 'income' ? 2 : 9

  const dateCell = (row[dateIndex] ?? '').trim()
  const descriptionCell = (row[descriptionIndex] ?? '').trim()
  const amountCell = (row[amountIndex] ?? '').trim()

  if (!dateCell || !descriptionCell || !amountCell) {
    return null
  }

  if (dateCell.startsWith('=') || descriptionCell.startsWith('=') || amountCell.startsWith('=')) {
    return null
  }

  if (isSummaryCell(dateCell) || isSummaryCell(descriptionCell) || isSummaryCell(amountCell)) {
    return null
  }

  const parsedDate = parseDateValue(dateCell)
  const parsedAmount = parseAmount(amountCell)
  if (!parsedDate || parsedAmount === null) {
    return null
  }

  return {
    name: descriptionCell,
    category: 'Outros',
    amount: Math.abs(parsedAmount),
    type: section,
    date: parsedDate,
    sourceSheet: sheetName,
    sourceRow: rowIndex + 1,
  }
}

const buildValidation = (transactions: VisualTransaction[]) => {
  if (!transactions.length) {
    return {
      isValid: false,
      validationMessage: 'Nenhum lançamento real foi encontrado na planilha.',
    }
  }

  const repeats = new Map<number, number>()
  for (const transaction of transactions) {
    const key = Math.round(Math.abs(transaction.amount) * 100)
    repeats.set(key, (repeats.get(key) ?? 0) + 1)
  }

  const duplicateAmounts = [...repeats.entries()]
    .filter(([, count]) => count > 1)
    .map(([amount]) => `R$ ${(amount / 100).toFixed(2).replace('.', ',')}`)

  if (duplicateAmounts.length > 0) {
    return {
      isValid: false,
      validationMessage: `Prévia bloqueada: valores repetidos detectados (${duplicateAmounts.join(', ')}).`,
    }
  }

  const previewTotal = transactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  const maxAmount = Math.max(...transactions.map((transaction) => transaction.amount))
  if (transactions.length > 1 && previewTotal > 0 && maxAmount > 0 && previewTotal > maxAmount * transactions.length * 1.5) {
    return {
      isValid: false,
      validationMessage: 'Prévia bloqueada: o total da visualização ficou muito acima dos lançamentos individuais.',
    }
  }

  return {
    isValid: true,
    validationMessage: 'Prévia validada.',
  }
}

export const detectVisualFinanceImport = (worksheetOrWorkbook: XLSX.WorkSheet | XLSX.WorkBook, sheetName = 'Planilha'): AutoDetectedImportSummary | null => {
  const sheets = 'Sheets' in worksheetOrWorkbook
    ? Object.entries(worksheetOrWorkbook.Sheets).map(([entryName, value]) => ({ name: entryName, sheet: value }))
    : [{ name: sheetName, sheet: worksheetOrWorkbook }]

  let bestResult: AutoDetectedImportSummary | null = null

  for (const { name, sheet } of sheets) {
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' }) as string[][]
    if (!rows.length) {
      continue
    }

    const transactions: VisualTransaction[] = []
    const ignored: string[] = []

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] ?? []
      const rawText = row.join(' ').trim()
      if (!rawText) {
        continue
      }

      if (isSummaryCell(rawText)) {
        continue
      }

      const incomeCandidate = buildCandidate(row, 'income', name, rowIndex)
      const expenseCandidate = buildCandidate(row, 'expense', name, rowIndex)
      const candidate = incomeCandidate ?? expenseCandidate

      if (!candidate) {
        continue
      }

      transactions.push(candidate)
    }

    if (!transactions.length) {
      continue
    }

    const totals = transactions.reduce(
      (accumulator, item) => {
        if (item.type === 'income') {
          accumulator.income += item.amount
        } else {
          accumulator.expense += item.amount
        }
        return accumulator
      },
      { income: 0, expense: 0 },
    )

    const previewTotal = totals.income + totals.expense
    const validation = buildValidation(transactions)

    const candidateResult: AutoDetectedImportSummary = {
      transactions,
      ignored,
      totals,
      previewTotal,
      isValid: validation.isValid,
      validationMessage: validation.validationMessage,
    }

    if (!bestResult || candidateResult.transactions.length > bestResult.transactions.length) {
      bestResult = candidateResult
    }
  }

  return bestResult
}
