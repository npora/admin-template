export const isStatus = (value: unknown): value is 0 | 1 => value === 0 || value === 1
export const isId = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) > 0
export const isSortOrder = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 4294967295
export const text = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max
export const optionalText = (value: unknown, max: number) =>
  value === null || (typeof value === 'string' && value.length <= max)
export const nullable = (value: string | null): string | null => value?.trim() || null
export function pageQuery(query: Record<string, unknown>) {
  const page = Number(query.page ?? 1),
    pageSize = Number(query.pageSize ?? 10)
  return Number.isSafeInteger(page) && page > 0 && [10, 20, 50].includes(pageSize)
    ? { page, pageSize }
    : null
}
