import { request } from '../client'
import type { PageResult } from '../types/common'
import type {
  DictType,
  DictTypeInput,
  DictItem,
  DictItemInput,
  DictOption,
  DictQuery
} from '../types/dict'

const types = '/system/dict-types'
const items = (typeId: number) => `${types}/${typeId}/items`
export const getDictTypes = (query: DictQuery, signal?: AbortSignal) =>
  request.get<PageResult<DictType>>(types, { query: { ...query }, signal })
export const createDictType = (input: DictTypeInput) =>
  request.post<DictType>(types, { json: input })
export const updateDictType = (id: number, input: DictTypeInput) =>
  request.put<DictType>(`${types}/${id}`, { json: input, extensions: { retry: 0 } })
export const deleteDictType = (id: number) =>
  request.delete<null>(`${types}/${id}`, { extensions: { retry: 0 } })
export const getDictItems = (typeId: number, query: DictQuery, signal?: AbortSignal) =>
  request.get<PageResult<DictItem>>(items(typeId), { query: { ...query }, signal })
export const createDictItem = (typeId: number, input: DictItemInput) =>
  request.post<DictItem>(items(typeId), { json: input })
export const updateDictItem = (typeId: number, id: number, input: DictItemInput) =>
  request.put<DictItem>(`${items(typeId)}/${id}`, { json: input, extensions: { retry: 0 } })
export const deleteDictItem = (typeId: number, id: number) =>
  request.delete<null>(`${items(typeId)}/${id}`, { extensions: { retry: 0 } })
export const getDictOptions = (code: string, signal?: AbortSignal) =>
  request.get<DictOption[]>(`/system/dictionaries/${encodeURIComponent(code)}`, { signal })
