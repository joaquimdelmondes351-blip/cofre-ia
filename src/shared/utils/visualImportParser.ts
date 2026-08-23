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
  return /^(total|saldo|resumo|subtotal|cartoes|terceiros|reservas|casa|titulo|title|mes|meses|receber|pagar|a receber|a pagar|cartao)$/i.test(normalized)
    || /\b(total|saldo|resumo|subtotal|observacao|observacoes|obs|titulo|title)\b/i.test(normalized)
}

const isFormulaCell = (worksheet: XLSX.WorkSheet, rowIndex: number, columnIndex: number) => {
  const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })] as XLSX.CellObject | undefined
  return Boolean(cell?.f) || (typeof cell?.v === 'string' && cell.v.trim().startsWith('='))
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

const buildCandidate = (worksheet: XLSX.WorkSheet, rows: string[][], section: VisualImportType, startColumn: number, endColumn: number, sheetName: string, rowIndex: number) => {
  const row = rows[rowIndex] ?? []
  const cells = row.slice(startColumn, endColumn).map((value) => String(value ?? '').trim())
  const dateOffset = cells.findIndex((value, offset) => value && !isFormulaCell(worksheet, rowIndex, startColumn + offset) && parseDateValue(value) !== null)

  if (dateOffset < 0) {
    return { candidate: null, reason: `Linha ${rowIndex + 1}: data, descrição ou valor precisam de revisão.` }
  }

  const amountOffsets = cells
    .map((value, offset) => ({ value, offset }))
    .filter(({ value, offset }) => offset > dateOffset && value && !isFormulaCell(worksheet, rowIndex, startColumn + offset) && parseAmount(value) !== null)

  const amountCell = amountOffsets[amountOffsets.length - 1]
  if (!amountCell) {
    return { candidate: null, reason: `Linha ${rowIndex + 1}: valor real não identificado com segurança.` }
  }

  const description = cells
    .slice(dateOffset + 1, amountCell.offset)
    .filter((value, offset) => value && !isFormulaCell(worksheet, rowIndex, startColumn + dateOffset + 1 + offset) && !isSummaryCell(value) && parseDateValue(value) === null && parseAmount(value) === null)
    .join(' ')
    .trim()

  if (!description || isSummaryCell(description)) {
    return { candidate: null, reason: `Linha ${rowIndex + 1}: descrição real não identificada com segurança.` }
  }

  const date = parseDateValue(cells[dateOffset])
  const amount = parseAmount(amountCell.value)
  if (!date || amount === null || amount <= 0) {
    return { candidate: null, reason: `Linha ${rowIndex + 1}: data ou valor precisam de revisão.` }
  }

  return {
    candidate: {
      name: description,
      category: 'Outros',
      amount: Math.abs(amount),
      type: section,
      date,
      sourceSheet: sheetName,
      sourceRow: rowIndex + 1,
    },
    reason: null,
  }
}

export const detectVisualFinanceImport = (worksheetOrWorkbook: XLSX.WorkSheet | XLSX.WorkBook, sheetName = 'Planilha'): AutoDetectedImportSummary | null => {
  const sheets = 'Sheets' in worksheetOrWorkbook
    ? Object.entries(worksheetOrWorkbook.Sheets).map(([entryName, value]) => ({ name: entryName, sheet: value }))
    : [{ name: sheetName, sheet: worksheetOrWorkbook }]

  let bestResult: AutoDetectedImportSummary | null = null

  for (const { name, sheet } of sheets) {
    const worksheet = sheet as XLSX.WorkSheet
    const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, raw: false, defval: '' }) as string[][]
    if (!rows.length) {
      continue
    }

    const transactions: VisualTransaction[] = []
    const ignored: string[] = []
    const sectionStarts = rows
      .flatMap((row, rowIndex) => row.map((value, columnIndex) => ({ value: String(value ?? '').trim(), rowIndex, columnIndex })))
      .filter(({ value }) => /^(a receber|a pagar)$/i.test(normalizeHeader(value)))
      .reduce((sections, item) => {
        const type = normalizeHeader(item.value) === 'a receber' ? 'income' : 'expense'
        if (!sections.some((section) => section.type === type)) {
          sections.push({ type, columnIndex: item.columnIndex, headerRow: item.rowIndex })
        }
        return sections
      }, [] as Array<{ type: VisualImportType; columnIndex: number; headerRow: number }>)

    if (!sectionStarts.length) {
      continue
    }

    const sortedSections = [...sectionStarts].sort((left, right) => left.columnIndex - right.columnIndex)
    for (const section of sortedSections) {
      const nextSection = sortedSections.find((candidate) => candidate.columnIndex > section.columnIndex)
      const endColumn = nextSection?.columnIndex ?? Math.max(...rows.map((row) => row.length), section.columnIndex + 1)
      const seenAmounts = new Set<number>()

      for (let rowIndex = section.headerRow + 1; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex] ?? []
        const blockText = row.slice(section.columnIndex, endColumn).join(' ').trim()
        if (!blockText || isSummaryCell(blockText)) {
          continue
        }

        const result = buildCandidate(worksheet, rows, section.type, section.columnIndex, endColumn, name, rowIndex)
        if (!result.candidate) {
          if (result.reason && row.some((value) => String(value ?? '').trim())) {
            ignored.push(result.reason)
          }
          continue
        }

        const amountKey = Math.round(result.candidate.amount * 100)
        if (seenAmounts.has(amountKey)) {
          ignored.push(`Linha ${rowIndex + 1}: valor repetido ignorado (${result.candidate.amount.toFixed(2).replace('.', ',')}).`)
          continue
        }

        seenAmounts.add(amountKey)
        transactions.push(result.candidate)
      }
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
    const validationMessage = transactions.length
      ? 'Prévia validada. Linhas sem data, descrição ou valor foram bloqueadas para revisão.'
      : 'Prévia bloqueada: nenhum lançamento seguro foi identificado. Revise as linhas indicadas.'

    const candidateResult: AutoDetectedImportSummary = {
      transactions,
      ignored,
      totals,
      previewTotal,
      isValid: transactions.length > 0,
      validationMessage,
    }

    if (!bestResult || candidateResult.transactions.length > bestResult.transactions.length) {
      bestResult = candidateResult
    }
  }

  return bestResult
}
