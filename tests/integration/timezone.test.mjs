import assert from 'node:assert/strict'
import { computed, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { installMemoryStorage, createTestServer } from '../helpers/environment.mjs'

installMemoryStorage()
const server = await createTestServer()
try {
  const load = (path) => server.ssrLoadModule(`/src/${path}`)
  const { TIME_ZONE } = await load('types/timezone.ts')
  const { dateTimeConfig } = await load('config/datetime.ts')
  const { parseZonedTime, zonedDate, activeTimeZone } = await load('utils/datetime.ts')
  const { fromPickerRange, toPickerRange, startOfZonedDay } = await load(
    'components/DateRangePicker/model.ts'
  )
  const { useAppStore } = await load('store/modules/app/index.ts')
  const { resolveAppSettings } = await load('store/modules/app/config.ts')
  const { localStorageService } = await load('utils/storage/index.ts')
  const { STORAGE_KEYS } = await load('constants/storage.ts')
  const { formatDate, applyLocale } = await load('locales/index.ts')
  assert.equal(dateTimeConfig.defaultTimeZone, 'Asia/Shanghai')
  assert.equal(Object.keys(TIME_ZONE).length, 31)
  for (const zone of Object.values(TIME_ZONE))
    assert.doesNotThrow(() => zonedDate(0, zone).format())
  const pinia = createPinia()
  setActivePinia(pinia)
  const app = useAppStore()
  assert.equal(app.settings.timeZone, TIME_ZONE.SHANGHAI)
  app.updateSettings({ timeZone: TIME_ZONE.UTC })
  applyLocale('zh-CN')
  const value = Date.UTC(2026, 0, 1, 18)
  const displayed = computed(() => formatDate(value))
  assert.equal(displayed.value, '2026-01-01 18:00')
  app.updateSettings({ timeZone: TIME_ZONE.SHANGHAI })
  await nextTick()
  assert.equal(displayed.value, '2026-01-02 02:00')
  assert.equal(
    formatDate('2026-01-01', 'date'),
    '2026-01-01',
    'civil dates never shift across days'
  )
  assert.equal(localStorageService.get(STORAGE_KEYS.APP_SETTINGS).timeZone, 'Asia/Shanghai')
  const restored = useAppStore(createPinia())
  restored.restoreSettings()
  assert.equal(restored.settings.timeZone, TIME_ZONE.SHANGHAI)
  assert.equal(activeTimeZone.value, TIME_ZONE.SHANGHAI)
  assert.equal(resolveAppSettings({ timeZone: 'invalid/zone' }).timeZone, TIME_ZONE.SHANGHAI)
  assert.equal(resolveAppSettings({ timeZone: 8 }).timeZone, TIME_ZONE.SHANGHAI)
  assert.equal(resolveAppSettings({ layout: { showLogo: false } }).timeZone, TIME_ZONE.SHANGHAI)
  restored.resetSettings()
  assert.equal(activeTimeZone.value, TIME_ZONE.SHANGHAI)
  assert.equal(displayed.value, '2026-01-02 02:00')
  assert.equal(parseZonedTime('1970-01-01 00:00:00.000', TIME_ZONE.UTC), 0)
  assert.equal(
    parseZonedTime('2026-01-01 08:00:00.123', TIME_ZONE.SHANGHAI),
    Date.UTC(2026, 0, 1, 0, 0, 0, 123)
  )
  assert.equal(parseZonedTime('2026-02-30 00:00:00.000', TIME_ZONE.UTC), null)
  assert.equal(
    parseZonedTime('2026-03-08 02:30:00.000', TIME_ZONE.NEW_YORK),
    null,
    'DST gap is invalid'
  )
  assert.equal(
    parseZonedTime('2026-11-01 01:30:00.000', TIME_ZONE.NEW_YORK),
    Date.UTC(2026, 10, 1, 5, 30),
    'overlap consistently chooses the earlier instant'
  )
  const spring = fromPickerRange(['2026-03-08', '2026-03-08'], TIME_ZONE.NEW_YORK, false)
  assert.equal(spring[1] - spring[0] + 1, 23 * 3600000)
  const autumn = fromPickerRange(['2026-11-01', '2026-11-01'], TIME_ZONE.NEW_YORK, false)
  assert.equal(autumn[1] - autumn[0] + 1, 25 * 3600000)
  assert.equal(startOfZonedDay('2026-02-30', TIME_ZONE.UTC), null)
  assert.equal(fromPickerRange(['2026-01-01', '2026-02-30'], TIME_ZONE.UTC, false), null)
  assert.equal(fromPickerRange(['2026-02-02', '2026-02-01'], TIME_ZONE.UTC, false), null)
  const actual = [Date.UTC(2026, 0, 1), Date.UTC(2026, 0, 1, 1)]
  const original = [...actual]
  const strings = toPickerRange(actual, TIME_ZONE.SHANGHAI, true)
  assert.deepEqual(fromPickerRange(strings, TIME_ZONE.SHANGHAI, true), actual)
  toPickerRange(actual, TIME_ZONE.NEW_YORK, true)
  assert.deepEqual(actual, original, 'display conversion cannot mutate timestamps')
  console.log(
    '通过：31 时区、北京默认值与 UTC 切换、本机偏好恢复与重置、响应式显示、毫秒往返、跨日及夏令时 23/25 小时区间。'
  )
} finally {
  await server.close()
}
