import { nextTick, onScopeDispose, ref, watch } from 'vue'
import { getTokenVersion } from '@/api/auth/token-storage'

// DTO 对象的键顺序不影响比较；有集合语义的数组由调用方排序。
function snapshot(value: unknown): string {
  return JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]])
        )
      : item
  )
}

/** 编辑无变化时关闭；校验和提交期间拦截重复操作。 */
export function useFormSubmit<Input>(options: {
  active: () => boolean
  editing: () => boolean
  saving: () => boolean
  validate: () => Promise<boolean | undefined>
  close: () => void
  submit: (input: Input) => void | Promise<void>
}) {
  const submitting = ref(false)
  let initial = '',
    version = 0
  watch(options.active, (active) => {
    if (!active) {
      version++
      submitting.value = false
    }
  })
  onScopeDispose(() => {
    version++
  })
  function reset(input: Input) {
    version++
    submitting.value = false
    initial = snapshot(input)
  }
  async function submit(input: Input | undefined) {
    if (input === undefined || !options.active() || options.saving() || submitting.value) return
    const current = version,
      token = getTokenVersion()
    submitting.value = true
    try {
      if (options.editing() && snapshot(input) === initial) {
        options.close()
        return
      }
      if (
        !(await options.validate()) ||
        current !== version ||
        token !== getTokenVersion() ||
        !options.active() ||
        options.saving()
      )
        return
      await options.submit(input)
    } finally {
      // 等父页面的 saving 属性更新后再允许下一次提交。
      await nextTick()
      if (current === version) submitting.value = false
    }
  }
  return { reset, submit, submitting }
}
