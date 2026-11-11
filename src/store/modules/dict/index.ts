import { defineStore } from 'pinia'
import { ref, shallowReactive } from 'vue'
import { getDictOptions } from '@/api/modules/dict'
import { getTokenVersion } from '@/api/auth/token-storage'
import type { DictOption } from '@/api/types/dict'

interface Entry {
  options: DictOption[]
  expires: number
  loading: boolean
  error: unknown
}
const ttl = 5 * 60 * 1000
const capacity = 100

/** Session-only cache: never persists another user's dictionary data. */
export const useDictStore = defineStore('dict', () => {
  const entries = shallowReactive(new Map<string, Entry>())
  const revision = ref(0)
  const pending = new Map<string, { controller: AbortController; promise: Promise<DictOption[]> }>()
  let session = getTokenVersion()
  function reset() {
    for (const request of pending.values()) request.controller.abort()
    pending.clear()
    entries.clear()
    session = getTokenVersion()
    revision.value++
  }
  async function load(code: string, force = false): Promise<DictOption[]> {
    if (session !== getTokenVersion()) reset()
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(code)) return []
    const old = entries.get(code)
    if (!force && old && old.expires > Date.now()) return old.options
    if (!force && pending.has(code)) return pending.get(code)!.promise
    pending.get(code)?.controller.abort()
    if (!entries.has(code) && entries.size >= capacity) {
      const oldest = entries.keys().next().value!
      pending.get(oldest)?.controller.abort()
      pending.delete(oldest)
      entries.delete(oldest)
    }
    const controller = new AbortController()
    const entry: Entry = { options: old?.options ?? [], expires: 0, loading: true, error: null }
    entries.set(code, entry)
    const token = getTokenVersion()
    const current = () =>
      token === getTokenVersion() && entries.get(code) === entry && !controller.signal.aborted
    const promise = getDictOptions(code, controller.signal)
      .then((options) => {
        if (!current()) return []
        entries.set(code, { options, expires: Date.now() + ttl, loading: false, error: null })
        return options
      })
      .catch((error: unknown) => {
        if (current()) entries.set(code, { ...entry, loading: false, error })
        throw error
      })
      .finally(() => {
        if (pending.get(code)?.controller === controller) pending.delete(code)
      })
    pending.set(code, { controller, promise })
    return promise
  }
  return { entries, revision, load, reset }
})
