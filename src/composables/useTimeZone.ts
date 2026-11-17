import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/store/modules/app'
import { TIME_ZONE } from '@/types/timezone'
import { isAppTimeZone } from '@/utils/datetime'

export function useTimeZone() {
  const app = useAppStore()
  const { t } = useI18n({ useScope: 'global' })
  return {
    timeZone: computed(() => app.settings.timeZone),
    timeZoneOptions: computed(() =>
      Object.entries(TIME_ZONE).map(([key, value]) => ({
        value,
        label: `${t(`timezone.${key}`)} · ${value}`
      }))
    ),
    setTimeZone(value: unknown) {
      if (isAppTimeZone(value)) app.updateSettings({ timeZone: value })
    }
  }
}
