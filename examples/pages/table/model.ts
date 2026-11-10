import type { TableQuery } from '@/composables/usePaginatedTable'
export const taskCategories = ['design', 'engineering', 'operations'] as const
export const taskStatuses = ['draft', 'active', 'completed'] as const
export interface TaskInput {
  name: string
  category: (typeof taskCategories)[number]
  status: (typeof taskStatuses)[number]
  budget: number
}
export interface DemoTask extends TaskInput {
  id: number
  code: string
  createdAt: string
}
export interface TaskFilters {
  keyword: string
  category: string
  status: string
}
export function createTaskSeed(): DemoTask[] {
  return Array.from({ length: 32 }, (_, index) => ({
    id: index + 1,
    code: `TASK-${String(index + 1).padStart(3, '0')}`,
    name: `Workspace iteration ${index + 1}`,
    category: taskCategories[index % 3]!,
    status: taskStatuses[index % 3]!,
    budget: (index + 1) * 1200,
    createdAt: new Date(Date.UTC(2026, 9, 1 + index, 9, 0)).toISOString()
  }))
}
export function validTask(input: TaskInput): boolean {
  return (
    typeof input.name === 'string' &&
    Boolean(input.name.trim()) &&
    input.name.trim().length <= 100 &&
    taskCategories.includes(input.category) &&
    taskStatuses.includes(input.status) &&
    Number.isFinite(input.budget) &&
    input.budget >= 0 &&
    input.budget <= 10000000
  )
}
export function queryTasks(items: readonly DemoTask[], query: TableQuery<TaskFilters>): DemoTask[] {
  const keyword = query.filters.keyword.trim().toLowerCase()
  const list = items.filter(
    (item) =>
      (!keyword || `${item.name} ${item.code}`.toLowerCase().includes(keyword)) &&
      (!query.filters.category || item.category === query.filters.category) &&
      (!query.filters.status || item.status === query.filters.status)
  )
  const prop = ['name', 'budget', 'createdAt'].includes(query.sort.prop)
    ? (query.sort.prop as 'name' | 'budget' | 'createdAt')
    : 'createdAt'
  if (query.sort.order)
    list.sort((a, b) => {
      const comparison =
        prop === 'budget'
          ? a.budget - b.budget
          : String(a[prop]).localeCompare(String(b[prop]), undefined, { numeric: true })
      return (comparison || a.id - b.id) * (query.sort.order === 'ascending' ? 1 : -1)
    })
  return list
}
