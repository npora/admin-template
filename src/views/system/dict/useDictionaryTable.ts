import { useManagementTable } from '@/composables/useManagementTable'
import { useDictStore } from '@/store/modules/dict'
import type { DictQuery } from '@/api/types/dict'
import type { PageResult } from '@/api/types/common'

interface DictionaryResource<Row, Input> {
  permission: 'dict' | 'dict-item'
  list: (query: DictQuery, signal?: AbortSignal) => Promise<PageResult<Row>>
  create: (input: Input) => Promise<unknown>
  update: (id: number, input: Input) => Promise<unknown>
  remove: (id: number) => Promise<unknown>
}

export function useDictionaryTable<Row, Input>(resource: DictionaryResource<Row, Input>) {
  const dictionaries = useDictStore()
  return useManagementTable({ ...resource, onChanged: () => dictionaries.reset() })
}
