export interface CsvColumn<T> {
  label: string
  value: (row: T) => unknown
}

/** 字符串单元格转义引号、换行，并避免被电子表格识别为公式。 */
export function buildCsv<T>(columns: readonly CsvColumn<T>[], rows: readonly T[]): string {
  const cell = (value: unknown): string => {
    let text = value == null ? '' : String(value)
    if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }
  return (
    '\uFEFF' +
    [
      columns.map((column) => cell(column.label)).join(','),
      ...rows.map((row) => columns.map((column) => cell(column.value(row))).join(','))
    ].join('\r\n')
  )
}

export function downloadText(
  filename: string,
  content: string,
  type = 'text/csv;charset=utf-8'
): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
