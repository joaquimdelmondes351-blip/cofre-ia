import test from 'node:test'
import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { detectVisualFinanceImport } from './visualImportParser.ts'

test('detectVisualFinanceImport reads only real receive/pay rows and blocks suspicious summaries', () => {
  const rows = [
    ['', '', '', 'SETEMBRO', '', '09/2026', '', '', '', '', '', '', '', '', ''],
    ['À RECEBER', '', '', '', '', '', '', 'À PAGAR', '', '', 'SALDO', '', '', '', ''],
    ['15/9/26', 'VALE', 'R$ 1.280,00', '', '', '', '', '', '', '', '', '-R$ 252,33', '', '', ''],
    ['9/9/26', 'Aline (Note. 11/12=200,00+Show 3/5=22,50+Panelas 3/6=44,45+Perf. Hiromi 2/4=61,10+Passagem 4/5=240,00)', 'R$ 328,05', '', '', '', '', '7/9/26', 'Consórcio 9/12', 'R$ 150,00', '', '', '', '', ''],
    ['9/9/26', 'Mayara (Azul Via Viagem 3/6=978,27)', 'R$ 868,27', '', '', '', '', '9/9/26', 'Recarga Claro', 'R$ 50,00', '', '', '', '', ''],
    ['', 'TOTAL', 'R$ 8.894,82', '', '', '', '', '', 'TOTAL', 'R$ 9.147,15', '', '', '', '', ''],
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  const result = detectVisualFinanceImport(worksheet, 'Fatos Sep.26')

  assert.ok(result)
  assert.equal(result.transactions.length, 3)
  assert.equal(result.totals.income, 2476.32)
  assert.equal(result.totals.expense, 200)
  assert.equal(result.previewTotal, 2676.32)
  assert.equal(result.isValid, true)
  assert.equal(result.transactions[0].sheetName, 'Fatos Sep.26')
  assert.ok(result.transactions[0].sourceRow > 0)
})
