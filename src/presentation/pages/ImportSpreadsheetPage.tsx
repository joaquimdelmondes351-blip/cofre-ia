import { ChangeEvent, useMemo, useState } from 'react'
import { ArrowDownRight, CheckCircle2, FileSpreadsheet, UploadCloud, Wand2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useFinanceStore } from '@store/financeStore'
import { detectVisualFinanceImport, type AutoDetectedImportSummary } from '@shared/utils/visualImportParser'

type ColumnKey = 'date' | 'description' | 'amount' | 'type' | 'category'
type RowData = Record<string, unknown>
type ColumnMap = Partial<Record<ColumnKey, string>>

type ParsedImport = {
  name: string
  category: string
  amount: number
  type: 'income' | 'expense'
  date: Date
}

const columnLabels: Record<ColumnKey, string> = {
  date: 'Data',
  description: 'Descrição',
  amount: 'Valor',
  type: 'Tipo',
  category: 'Categoria',
}

const columnSuggestions: Record<ColumnKey, string[]> = {
  date: ['data', 'date', 'data transacao', 'data da transacao', 'dt'],
  description: ['descricao', 'descrição', 'description', 'nome', 'titulo', 'item'],
  amount: ['valor', 'valor total', 'amount', 'montante', 'valor transacao'],
  type: ['tipo', 'type', 'natureza', 'entrada_saida'],
  category: ['categoria', 'category', 'classificacao', 'grupo'],
}

const normalizeHeader = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value: unknown) => normalizeHeader(String(value ?? ''))

const parseAmount = (value: string): number | null => {
  if (!value) {
    return null
  }

  const raw = value.trim()
  if (!raw || raw.startsWith('=')) {
    return null
  }

  let cleaned = raw.replace(/[^0-9,\.\-()R$\s]/gi, '').trim()

  if (!cleaned) {
    return null
  }

  cleaned = cleaned.replace(/R\$/gi, '').trim()

  if (cleaned.includes('(') && cleaned.includes(')')) {
    cleaned = `-${cleaned.replace(/[()]/g, '')}`
  }

  const hasComma = cleaned.includes(',')
  const hasDot = cleaned.includes('.')

  if (hasComma && hasDot) {
    const separator = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.') ? ',' : '.'
    const thousandSeparator = separator === ',' ? '.' : ','
    cleaned = cleaned.replace(new RegExp(`\\${thousandSeparator}`, 'g'), '').replace(separator, '.')
  } else if (hasComma) {
    const parts = cleaned.split(',')
    if (parts.length > 1 && parts[parts.length - 1].length === 2) {
      cleaned = parts.join('.')
    } else {
      cleaned = cleaned.replace(',', '.')
    }
  }

  const numericValue = Number(cleaned)
  return Number.isFinite(numericValue) ? numericValue : null
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

const inferTypeFromText = (value: string, amount: number) => {
  const normalized = normalizeHeader(value)

  if (/despesa|gasto|saida|saída|expense|debit|debito|pagamento|retirada|compra/.test(normalized)) {
    return 'expense'
  }

  if (/receita|entrada|renda|income|credito|credito|salario|salário|ganho|bonus/.test(normalized)) {
    return 'income'
  }

  if (amount < 0) {
    return 'expense'
  }

  if (amount > 0) {
    return 'income'
  }

  return 'expense'
}

const suggestCategory = (description: string, rawCategory?: string): string => {
  const trimmed = (rawCategory ?? '').trim()
  if (trimmed) {
    return trimmed
  }

  const normalized = normalizeHeader(description)

  if (/(mercado|supermercado|padaria|aliment|hortifrut|compras|feira)/.test(normalized)) {
    return 'Mercado / Alimentação'
  }

  if (/(uber|transporte|taxi|onibus|metro|combust|carro|locacao|locação)/.test(normalized)) {
    return 'Uber / Transporte'
  }

  if (/(aluguel|condominio|moradia|apartamento|casa|iptu|energia|luz|agua|água)/.test(normalized)) {
    return 'Aluguel / Moradia'
  }

  if (/(salario|salário|renda|receita|bonus|freela|venda)/.test(normalized)) {
    return 'Salário / Receita'
  }

  return 'Outros'
}

const getAutoDetectedColumns = (rows: RowData[]): ColumnMap => {
  if (!rows.length) {
    return {}
  }

  const headers = Object.keys(rows[0])
  const matches: ColumnMap = {}

  for (const key of Object.keys(columnLabels) as ColumnKey[]) {
    for (const columnName of headers) {
      const normalizedColumn = normalizeHeader(columnName)
      const suggestions = columnSuggestions[key]

      if (suggestions.some((value) => normalizedColumn === normalizeHeader(value))) {
        matches[key] = columnName
        break
      }
    }
  }

  return matches
}

const buildTransactionKey = (transaction: ParsedImport) => `${transaction.name.toLowerCase()}|${transaction.amount}|${transaction.date.toISOString()}|${transaction.category.toLowerCase()}|${transaction.type}`

const isVisualSummaryText = (text: string) => {
  const normalized = normalizeText(text)
  if (!normalized) {
    return true
  }

  return /^(saldo|total|subtotal|resumo|mes|mês|meses|titulo|title|receber|pagar|à receber|à pagar|a receber|a pagar)$/i.test(normalized)
    || /(saldo|total|subtotal|resumo|mes|mês|titulo|title)/i.test(normalized)
}

const isLikelyDescriptionCell = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('=') || isVisualSummaryText(trimmed)) {
    return false
  }

  if (parseAmount(trimmed) !== null || parseDateValue(trimmed) !== null) {
    return false
  }

  const normalized = normalizeText(trimmed)
  if (!normalized || normalized.length < 3) {
    return false
  }

  return !/^(parcela|parcelas|observacao|observação|obs|titulo|title|mes|mês|saldo|total|subtotal|resumo)$/i.test(normalized)
    && !/\b(parcela|observacao|observação|obs|titulo|mes|mês)\b/i.test(normalized)
}

const isLikelyAmountCell = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('=') || isVisualSummaryText(trimmed)) {
    return false
  }

  const normalized = normalizeText(trimmed)
  if (!normalized || /^(parcela|parcelas|observacao|observação|obs|titulo|title|mes|mês)$/i.test(normalized)) {
    return false
  }

  const numericValue = parseAmount(trimmed)
  return numericValue !== null && Math.abs(numericValue) >= 1
}

const detectVisualFinanceImport = (worksheet: XLSX.WorkSheet): AutoDetectedImportSummary | null => {
  const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, raw: false, defval: '' }) as string[][]

  if (!rows.length) {
    return null
  }

  const transactions: ParsedImport[] = []
  const ignored: string[] = []
  const seen = new Set<string>()
  const usedAmounts = new Map<'income' | 'expense', Set<number>>()
  usedAmounts.set('income', new Set())
  usedAmounts.set('expense', new Set())

  let activeSection: 'income' | 'expense' | null = null

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? []
    const rawText = row.join(' ').trim()
    const normalizedText = normalizeText(rawText)

    if (!normalizedText) {
      continue
    }

    if (/(à receber|a receber|receber)/i.test(normalizedText)) {
      activeSection = 'income'
      continue
    }

    if (/(à pagar|a pagar|pagar)/i.test(normalizedText)) {
      activeSection = 'expense'
      continue
    }

    if (isVisualSummaryText(rawText) || /\b(total|saldo|resumo|subtotal)\b/i.test(normalizedText)) {
      ignored.push(`Linha ${rowIndex + 1}: ${rawText}`)
      continue
    }

    if (!activeSection) {
      continue
    }

    const cells = row.map((cell) => String(cell ?? '').trim())
    const descriptionCandidates = cells.filter(isLikelyDescriptionCell)
    const amountCells = cells.filter(isLikelyAmountCell)

    if (descriptionCandidates.length === 0 || amountCells.length !== 1) {
      ignored.push(`Linha ${rowIndex + 1}: ${rawText}`)
      continue
    }

    const amount = parseAmount(amountCells[0])
    if (amount === null) {
      ignored.push(`Linha ${rowIndex + 1}: ${rawText}`)
      continue
    }

    const amountKey = Math.round(Math.abs(amount) * 100)
    const sectionSet = usedAmounts.get(activeSection)
    if (sectionSet && sectionSet.has(amountKey)) {
      ignored.push(`Linha ${rowIndex + 1}: ${rawText} (valor repetido)`)
      continue
    }
    sectionSet?.add(amountKey)

    const description = descriptionCandidates
      .filter((cell) => !/^(r\$|rs|\$)$/i.test(cell))
      .join(' ')
      .trim()

    if (!description || /\b(parcela|observacao|observação|obs)\b/i.test(description)) {
      ignored.push(`Linha ${rowIndex + 1}: ${rawText}`)
      continue
    }

    const parsed = {
      name: description,
      category: suggestCategory(description),
      amount: Math.abs(amount),
      type: activeSection,
      date: new Date(),
    }

    const nonSummaryRow = cells.some((cell) => /\d{1,2}[-/]\d{1,2}/.test(cell) || /\d{4}-\d{2}-\d{2}/.test(cell) || /\d{2}\/\d{2}\/\d{4}/.test(cell))
    if (!nonSummaryRow) {
      ignored.push(`Linha ${rowIndex + 1}: ${rawText}`)
      continue
    }

    const dateCandidate = cells.find((cell) => parseDateValue(cell) !== null && !isVisualSummaryText(cell))
    if (!dateCandidate) {
      ignored.push(`Linha ${rowIndex + 1}: ${rawText}`)
      continue
    }

    const date = parseDateValue(dateCandidate)
    if (!date) {
      ignored.push(`Linha ${rowIndex + 1}: ${rawText}`)
      continue
    }

    parsed.date = date

    const key = buildTransactionKey({ ...parsed, date })
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    transactions.push(parsed)
  }

  if (!transactions.length) {
    return null
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

  return { transactions, ignored, totals }
}

export function ImportSpreadsheetPage() {
  const transactions = useFinanceStore((state) => state.transactions)
  const addTransaction = useFinanceStore((state) => state.addTransaction)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewRows, setPreviewRows] = useState<RowData[]>([])
  const [columnMap, setColumnMap] = useState<ColumnMap>({})
  const [autoDetectedImport, setAutoDetectedImport] = useState<AutoDetectedImportSummary | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const availableHeaders = useMemo(() => {
    if (!previewRows.length) {
      return []
    }

    return Object.keys(previewRows[0])
  }, [previewRows])

  const previewHeaders = useMemo(() => availableHeaders.length ? availableHeaders : [], [availableHeaders])

  const hasSuspiciousAutoImport = Boolean(autoDetectedImport && autoDetectedImport.transactions.length > 0 && !autoDetectedImport.isValid)

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setSelectedFile(file)
    setStatusMessage('')
    setAutoDetectedImport(null)

    const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.ms-excel']

    if (!allowedTypes.includes(file.type) && !/\.(xlsx|csv)$/i.test(file.name)) {
      setPreviewRows([])
      setColumnMap({})
      setStatusMessage('Formato inválido. Envie um arquivo .xlsx ou .csv.')
      return
    }

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const rawRows = XLSX.utils.sheet_to_json<RowData>(worksheet, { defval: '', raw: false })

      if (!rawRows.length) {
        setPreviewRows([])
        setColumnMap({})
        setStatusMessage('A planilha está vazia ou não foi possível ler as linhas.')
        return
      }

      const detected = detectVisualFinanceImport(workbook)
      if (detected && detected.transactions.length > 0) {
        setAutoDetectedImport(detected)
        setPreviewRows(rawRows.slice(0, 8))
        setColumnMap({})
        setStatusMessage(detected.isValid
          ? 'Formato visual detectado automaticamente. Revise a prévia e confirme a importação.'
          : detected.validationMessage ?? 'Prévia bloqueada. Corrija os dados da planilha antes de confirmar.')
        return
      }

      setPreviewRows(rawRows.slice(0, 8))
      setColumnMap(getAutoDetectedColumns(rawRows))
    } catch {
      setPreviewRows([])
      setColumnMap({})
      setStatusMessage('Não foi possível processar a planilha no navegador.')
    }
  }

  const updateColumnMap = (key: ColumnKey, value: string) => {
    setColumnMap((current) => ({
      ...current,
      [key]: value || undefined,
    }))
  }

  const persistTransactions = async (rows: ParsedImport[]) => {
    const seenInImport = new Set<string>()
    const existingKeys = new Set(transactions.map((transaction) => buildTransactionKey({
      name: transaction.name,
      category: transaction.category,
      amount: transaction.amount,
      type: transaction.type,
      date: new Date(transaction.date),
    })))

    const rowsToSave = rows.filter((transaction) => {
      const key = buildTransactionKey(transaction)
      if (seenInImport.has(key) || existingKeys.has(key)) {
        return false
      }
      seenInImport.add(key)
      return true
    })

    if (!rowsToSave.length) {
      return 0
    }

    for (const transaction of rowsToSave) {
      await addTransaction({
        name: transaction.name,
        category: transaction.category,
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date,
      })
    }

    return rowsToSave.length
  }

  const handleImport = async () => {
    if (!selectedFile) {
      setStatusMessage('Selecione uma planilha antes de continuar.')
      return
    }

    setIsProcessing(true)
    setStatusMessage('')

    try {
      if (autoDetectedImport && autoDetectedImport.transactions.length > 0) {
        if (!autoDetectedImport.isValid) {
          setStatusMessage(autoDetectedImport.validationMessage ?? 'Prévia bloqueada. Corrija os dados da planilha antes de confirmar.')
          return
        }

        const importedCount = await persistTransactions(autoDetectedImport.transactions.map((transaction) => ({
          name: transaction.name,
          category: transaction.category,
          amount: transaction.amount,
          type: transaction.type,
          date: transaction.date,
        })))

        if (!importedCount) {
          setStatusMessage('Todas as movimentações desta importação já estão cadastradas.')
          return
        }

        setStatusMessage(`${importedCount} movimentação${importedCount > 1 ? 'ões' : ' '} importada${importedCount > 1 ? 's' : ''} com sucesso.`)
        setSelectedFile(null)
        setPreviewRows([])
        setColumnMap({})
        setAutoDetectedImport(null)
        const fileInput = document.getElementById('spreadsheet-input') as HTMLInputElement | null
        if (fileInput) {
          fileInput.value = ''
        }
        return
      }

      if (!previewRows.length) {
        setStatusMessage('Selecione uma planilha antes de continuar.')
        return
      }

      const dateColumn = columnMap.date
      const descriptionColumn = columnMap.description
      const amountColumn = columnMap.amount

      if (!dateColumn || !descriptionColumn || !amountColumn) {
        setStatusMessage('Mapeie as colunas de data, descrição e valor para importar.')
        return
      }

      const importRows: ParsedImport[] = []
      const seenInImport = new Set<string>()

      for (const row of previewRows) {
        const dateRaw = String(row[dateColumn] ?? '').trim()
        const descriptionRaw = String(row[descriptionColumn] ?? '').trim()
        const amountRaw = String(row[amountColumn] ?? '').trim()

        if (!dateRaw || !descriptionRaw || !amountRaw) {
          continue
        }

        const parsedDate = parseDateValue(dateRaw)
        const parsedAmount = parseAmount(amountRaw)

        if (!parsedDate || parsedAmount === null) {
          continue
        }

        const resolvedType = columnMap.type
          ? (() => {
            const rawType = String(row[columnMap.type] ?? '').trim()
            return inferTypeFromText(rawType, parsedAmount)
          })()
          : inferTypeFromText(descriptionRaw, parsedAmount)

        const category = suggestCategory(descriptionRaw, columnMap.category ? String(row[columnMap.category] ?? '').trim() : undefined)
        const normalizedName = descriptionRaw || 'Movimentação importada'
        const transaction: ParsedImport = {
          name: normalizedName,
          category,
          amount: Math.abs(parsedAmount),
          type: resolvedType,
          date: parsedDate,
        }

        const key = buildTransactionKey(transaction)

        if (seenInImport.has(key)) {
          continue
        }

        seenInImport.add(key)
        importRows.push(transaction)
      }

      if (!importRows.length) {
        setStatusMessage('Nenhuma movimentação válida foi encontrada na planilha.')
        return
      }

      const importedCount = await persistTransactions(importRows)

      if (!importedCount) {
        setStatusMessage('Todas as movimentações desta importação já estão cadastradas.')
        return
      }

      setStatusMessage(`${importedCount} movimentação${importedCount > 1 ? 'ões' : ' '} importada${importedCount > 1 ? 's' : ''} com sucesso.`)
      setSelectedFile(null)
      setPreviewRows([])
      setColumnMap({})
      setAutoDetectedImport(null)
      const fileInput = document.getElementById('spreadsheet-input') as HTMLInputElement | null
      if (fileInput) {
        fileInput.value = ''
      }
    } catch {
      setStatusMessage('Não foi possível salvar as movimentações importadas.')
    } finally {
      setIsProcessing(false)
    }
  }

  const previewRowsToDisplay = previewRows.slice(0, 5)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <p className="text-sm font-medium text-emerald-600">IMPORTAÇÃO</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Importar planilha</h1>
      <p className="mt-2 text-slate-500">Carregue um arquivo Excel ou CSV e confirme as movimentações antes de salvar no seu COFRE IA.</p>

      <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <label htmlFor="spreadsheet-input" className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50 px-6 py-10 text-center transition hover:border-emerald-300 hover:bg-emerald-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
            <UploadCloud size={28} />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">Selecionar planilha</p>
            <p className="mt-1 text-sm text-slate-500">Arquivos .xlsx ou .csv</p>
          </div>
          <input id="spreadsheet-input" type="file" accept=".xlsx,.csv" onChange={handleFileSelection} className="hidden" />
        </label>

        {selectedFile && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <span className="inline-flex items-center gap-2 font-medium"><FileSpreadsheet size={16} className="text-emerald-600" /> {selectedFile.name}</span>
            <span className="text-slate-500">{previewRows.length} linha(s) lidas</span>
          </div>
        )}

        {autoDetectedImport && autoDetectedImport.transactions.length > 0 && (
          <div className="mt-6 space-y-5">
<div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-700">Receitas</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">R$ {autoDetectedImport.totals.income.toFixed(2).replace('.', ',')}</p>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-rose-700">Despesas</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">R$ {autoDetectedImport.totals.expense.toFixed(2).replace('.', ',')}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-600">Lançamentos</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{autoDetectedImport.transactions.length}</p>
                </div>
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-indigo-700">Total da prévia</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">R$ {autoDetectedImport.previewTotal.toFixed(2).replace('.', ',')}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Wand2 size={16} className="text-emerald-600" />
                <h2 className="font-semibold text-slate-900">Prévia detectada automaticamente</h2>
              </div>

              <div className="space-y-2">
                {autoDetectedImport.transactions.slice(0, 8).map((transaction, index) => (
                  <div key={`${transaction.name}-${transaction.sourceSheet}-${transaction.sourceRow}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{transaction.name}</p>
                      <p className="text-xs text-slate-500">{transaction.category} • {transaction.sourceSheet} • linha {transaction.sourceRow}</p>
                    </div>
                    <div className="text-right">
                      <p className={transaction.type === 'income' ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>
                        {transaction.type === 'income' ? '+' : '-'} R$ {transaction.amount.toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-xs text-slate-500">{transaction.date.toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>

              {autoDetectedImport.ignored.length > 0 && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-600">Linhas ignoradas</p>
                  <div className="space-y-1 text-xs text-slate-500">
                    {autoDetectedImport.ignored.slice(0, 8).map((ignoredLine, index) => (
                      <p key={`${ignoredLine}-${index}`}>{ignoredLine}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-sm text-slate-500">{hasSuspiciousAutoImport ? 'Prévia suspeita: valores repetidos ou bloco sem receita/despesa coerentes; importação bloqueada.' : 'O sistema detectou o formato visual do bloco mensal e não pediu mapeamento manual.'}</p>
              <button
                type="button"
                onClick={handleImport}
                disabled={isProcessing || hasSuspiciousAutoImport}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing ? 'Importando...' : hasSuspiciousAutoImport ? 'Prévia bloqueada' : 'Confirmar importação'}
              </button>
            </div>
          </div>
        )}

        {previewRows.length > 0 && !autoDetectedImport && (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Wand2 size={16} className="text-emerald-600" />
                <h2 className="font-semibold text-slate-900">Mapear colunas</h2>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(Object.keys(columnLabels) as ColumnKey[]).map((key) => (
                  <label key={key} className="flex flex-col gap-2 text-sm">
                    <span className="font-medium text-slate-700">{columnLabels[key]}</span>
                    <select
                      value={columnMap[key] ?? ''}
                      onChange={(event) => updateColumnMap(key, event.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 outline-none ring-emerald-400 transition focus:ring-2"
                    >
                      <option value="">Selecionar coluna</option>
                      {previewHeaders.map((header) => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      {previewHeaders.map((header) => (
                        <th key={header} className="px-3 py-3 font-medium">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRowsToDisplay.map((row, index) => (
                      <tr key={`${String(Object.values(row)[0] ?? 'row')}-${index}`} className="border-t border-slate-100">
                        {previewHeaders.map((header) => (
                          <td key={`${header}-${index}`} className="px-3 py-3 text-slate-600">
                            {String(row[header] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-sm text-slate-500">A categoria será sugerida automaticamente quando a coluna não vier preenchida.</p>
              <button
                type="button"
                onClick={handleImport}
                disabled={isProcessing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing ? 'Importando...' : 'Confirmar importação'}
              </button>
            </div>
          </div>
        )}

        {statusMessage && (
          <div className={`mt-5 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${statusMessage.includes('sucesso') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
            {statusMessage.includes('sucesso') ? <CheckCircle2 size={16} /> : <ArrowDownRight size={16} />}
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    </div>
  )
}
