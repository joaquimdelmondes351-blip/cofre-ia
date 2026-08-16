import { ChangeEvent, useMemo, useState } from 'react'
import { ArrowDownRight, CheckCircle2, FileSpreadsheet, UploadCloud, Wand2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useFinanceStore } from '@store/financeStore'

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

const parseAmount = (value: string): number | null => {
  if (!value) {
    return null
  }

  let cleaned = value.replace(/[^0-9,\.\-()]/g, '').trim()

  if (!cleaned) {
    return null
  }

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
  const directDate = new Date(trimmed)
  if (!Number.isNaN(directDate.getTime())) {
    return directDate
  }

  const patterns = [
    /^\d{4}-\d{2}-\d{2}$/, // yyyy-mm-dd
    /^\d{2}[-/]\d{2}[-/]\d{4}$/, // dd/mm/yyyy or dd-mm-yyyy
    /^\d{4}[-/]\d{2}[-/]\d{2}$/, // yyyy/mm/dd
    /^\d{2}\/\d{2}\/\d{2}$/, // dd/mm/yy
  ]

  for (const pattern of patterns) {
    if (pattern.test(trimmed)) {
      if (trimmed.includes('-') && trimmed.length === 10 && trimmed[4] === '-') {
        const [year, month, day] = trimmed.split('-').map(Number)
        return new Date(year, month - 1, day)
      }

      if (trimmed.includes('/') && trimmed.length >= 8) {
        const [first, second, third] = trimmed.split(/[\/]/)
        const day = Number(first)
        const month = Number(second)
        const year = Number(third.length === 2 ? `20${third}` : third)

        if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
          return new Date(year, month - 1, day)
        }
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

  if (/(mercado|supermercado|padaria|aliment|hortifrut|compras|feira|mercado)/.test(normalized)) {
    return 'Mercado / Alimentação'
  }

  if (/(uber|transporte|taxi|onibus|ônibus|metro|combust|carro|locacao|locação)/.test(normalized)) {
    return 'Uber / Transporte'
  }

  if (/(aluguel|condominio|moradia|apartamento|casa|iptu|conta de energia|luz|agua|água)/.test(normalized)) {
    return 'Aluguel / Moradia'
  }

  if (/(salario|salário|renda|receita|bonus|pagamento|freela|venda)/.test(normalized)) {
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

export function ImportSpreadsheetPage() {
  const transactions = useFinanceStore((state) => state.transactions)
  const addTransaction = useFinanceStore((state) => state.addTransaction)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewRows, setPreviewRows] = useState<RowData[]>([])
  const [columnMap, setColumnMap] = useState<ColumnMap>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const availableHeaders = useMemo(() => {
    if (!previewRows.length) {
      return []
    }

    return Object.keys(previewRows[0])
  }, [previewRows])

  const previewHeaders = useMemo(() => availableHeaders.length ? availableHeaders : [], [availableHeaders])

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setSelectedFile(file)
    setStatusMessage('')

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
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<RowData>(worksheet, { defval: '', raw: false })

      if (!rows.length) {
        setPreviewRows([])
        setColumnMap({})
        setStatusMessage('A planilha está vazia ou não foi possível ler as linhas.')
        return
      }

      setPreviewRows(rows.slice(0, 8))
      setColumnMap(getAutoDetectedColumns(rows))
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

  const handleImport = async () => {
    if (!previewRows.length || !selectedFile) {
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

    setIsProcessing(true)
    setStatusMessage('')

    try {
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

      const existingKeys = new Set(transactions.map((transaction) => buildTransactionKey({
        name: transaction.name,
        category: transaction.category,
        amount: transaction.amount,
        type: transaction.type,
        date: new Date(transaction.date.includes('/') ? transaction.date.split('/').reverse().join('-') : transaction.date),
      })))

      const transactionsToSave = importRows.filter((transaction) => !existingKeys.has(buildTransactionKey(transaction)))

      if (!transactionsToSave.length) {
        setStatusMessage('Todas as movimentações desta importação já estão cadastradas.')
        return
      }

      for (const transaction of transactionsToSave) {
        await addTransaction({
          name: transaction.name,
          category: transaction.category,
          amount: transaction.amount,
          type: transaction.type,
          date: transaction.date,
        })
      }

      const importedCount = transactionsToSave.length
      setStatusMessage(`${importedCount} movimentação${importedCount > 1 ? 'ões' : ' '} importada${importedCount > 1 ? 's' : ''} com sucesso.`)
      setSelectedFile(null)
      setPreviewRows([])
      setColumnMap({})
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

        {previewRows.length > 0 && (
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
