export const formCategories = ['design', 'engineering', 'operations'] as const
export const priorities = ['low', 'normal', 'high'] as const
export interface ExampleFormData {
  name: string
  category: (typeof formCategories)[number]
  owner: string
  description: string
  dates: string[]
  budget: number
  priority: (typeof priorities)[number]
  members: string[]
  notify: boolean
  email: string
  agreed: boolean
}
export const ownersByCategory: Record<ExampleFormData['category'], string[]> = {
  design: ['Alex Chen', 'Mia Lin'],
  engineering: ['Noah Wang', 'Emma Li'],
  operations: ['Leo Zhang', 'Olivia Liu']
}
export function createExampleForm(): ExampleFormData {
  return {
    name: '',
    category: 'engineering',
    owner: '',
    description: '',
    dates: [],
    budget: 0,
    priority: 'normal',
    members: [],
    notify: false,
    email: '',
    agreed: false
  }
}
export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(new Date(`${value}T00:00:00Z`).getTime()) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  )
}
export function formErrors(form: ExampleFormData): Partial<Record<keyof ExampleFormData, string>> {
  const errors: Partial<Record<keyof ExampleFormData, string>> = {}
  if (!form.name.trim() || form.name.trim().length > 100) errors.name = 'nameRule'
  if (!formCategories.includes(form.category)) errors.category = 'categoryRule'
  if (!ownersByCategory[form.category]?.includes(form.owner)) errors.owner = 'ownerRule'
  if (form.description.length > 500) errors.description = 'descriptionRule'
  if (
    !Array.isArray(form.dates) ||
    form.dates.length !== 2 ||
    !form.dates.every(validDate) ||
    form.dates[0]! > form.dates[1]!
  )
    errors.dates = 'dateRule'
  if (!Number.isFinite(form.budget) || form.budget < 0 || form.budget > 10000000)
    errors.budget = 'budgetRule'
  if (!priorities.includes(form.priority)) errors.priority = 'priorityRule'
  if (
    form.members.length > 5 ||
    !form.members.every((member) => Object.values(ownersByCategory).flat().includes(member))
  )
    errors.members = 'membersRule'
  if (form.notify && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || form.email.length > 255))
    errors.email = 'emailRule'
  if (!form.agreed) errors.agreed = 'agreementRule'
  return errors
}
export function resolveFormDraft(value: unknown): ExampleFormData | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Record<string, unknown>,
    defaults = createExampleForm()
  if (source.version !== 1 || !source.data || typeof source.data !== 'object') return null
  const data = source.data as Record<string, unknown>
  for (const key of ['name', 'owner', 'description', 'email'] as const) {
    if (typeof data[key] !== 'string' || data[key].length > 1000) return null
    defaults[key] = data[key]
  }
  if (
    !formCategories.includes(data.category as ExampleFormData['category']) ||
    !priorities.includes(data.priority as ExampleFormData['priority'])
  )
    return null
  if (
    !Array.isArray(data.dates) ||
    data.dates.length > 2 ||
    !data.dates.every((value) => typeof value === 'string' && validDate(value))
  )
    return null
  if (
    !Array.isArray(data.members) ||
    data.members.length > 5 ||
    !data.members.every(
      (value) => typeof value === 'string' && Object.values(ownersByCategory).flat().includes(value)
    )
  )
    return null
  if (
    typeof data.budget !== 'number' ||
    !Number.isFinite(data.budget) ||
    data.budget < 0 ||
    data.budget > 10000000 ||
    typeof data.notify !== 'boolean' ||
    typeof data.agreed !== 'boolean'
  )
    return null
  return {
    ...defaults,
    category: data.category as ExampleFormData['category'],
    priority: data.priority as ExampleFormData['priority'],
    dates: [...data.dates],
    members: [...data.members],
    budget: data.budget,
    notify: data.notify,
    agreed: data.agreed
  }
}

export function validAttachment(file: { name: string; size?: number }): boolean {
  return (
    typeof file.size === 'number' &&
    Number.isFinite(file.size) &&
    file.size >= 0 &&
    file.size <= 2 * 1024 * 1024 &&
    /\.(pdf|png|jpe?g|txt)$/i.test(file.name)
  )
}
