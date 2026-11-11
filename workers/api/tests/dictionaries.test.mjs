import assert from 'node:assert/strict'
import { test } from 'node:test'
import { service } from './helpers/service.mjs'
import { snapshot, commit, update } from '../src/repositories/management.mjs'
import { authenticate } from '../src/modules/auth.mjs'
const data = (result) => {
  assert.equal(result.status, 200, JSON.stringify(result.body))
  return result.body.data
}
const type = (extra = {}) => ({
  name: 'Test dictionary',
  code: 'test_dict',
  remark: null,
  sortOrder: 0,
  status: 1,
  ...extra
})
const item = (extra = {}) => ({
  label: 'First',
  value: '1',
  tagType: 'success',
  remark: null,
  sortOrder: 0,
  status: 1,
  ...extra
})
const post = (json, token) => ({ method: 'POST', json, ...(token ? { token } : {}) })
const put = (json, token) => ({ method: 'PUT', json, ...(token ? { token } : {}) })

test('dictionary CRUD is authenticated and permission checked; business options need login only', async (t) => {
  const f = await service(t)
  for (const path of [
    '/system/dict-types',
    '/system/dict-types/1/items',
    '/system/dictionaries/sys_notice_type'
  ])
    assert.equal((await f.call(path, { token: null })).status, 401)
  for (const path of ['/system/dict-types', '/system/dict-types/1/items']) {
    assert.equal((await f.call(path, { token: f.viewer })).status, 403)
    assert.equal((await f.call(path, post({}, f.viewer))).status, 403)
  }
  assert.equal((await f.call('/system/dict-types/1', put(type(), f.viewer))).status, 403)
  assert.equal(
    (await f.call('/system/dict-types/1/items/1', { method: 'DELETE', token: f.viewer })).status,
    403
  )
  assert.equal(
    data(await f.call('/system/dictionaries/sys_notice_type', { token: f.viewer })).length,
    2
  )
  assert.equal((await f.call('/system/dictionaries/sys_notice_type', post({}))).status, 405)
  assert.equal((await f.call('/system/dict-types/9007199254740992')).status, 404)
  assert.equal((await f.call('/system/dict-types/0/items')).status, 404)
  const routes = data(await f.call('/auth/routes'))
  assert.ok(JSON.stringify(routes).includes('system/dict/index'))
})

test('type and item CRUD preserve unique values, parent ownership, filtering and disabled semantics', async (t) => {
  const f = await service(t)
  const created = data(await f.call('/system/dict-types', post(type())))
  const base = `/system/dict-types/${created.id}`
  const entry = data(await f.call(`${base}/items`, post(item())))
  assert.equal(entry.dictTypeId, created.id)
  assert.equal(entry.value, '1')
  assert.equal((await f.call(`${base}/items`, post(item()))).status, 409)
  assert.equal((await f.call(base, put(type({ code: 'changed' })))).status, 400)
  assert.equal((await f.call('/system/dict-types', post(type()))).status, 409)
  assert.equal((await f.call(`/system/dict-types/1/items/${entry.id}`, put(item()))).status, 404)
  assert.equal((await f.call(base, { method: 'DELETE' })).status, 409)
  data(await f.call(`${base}/items`, post(item({ value: 'A', label: 'Second', sortOrder: 10 }))))
  data(await f.call(`${base}/items`, post(item({ value: 'a', label: 'Third', status: 0 }))))
  const list = data(await f.call(`${base}/items?page=2&pageSize=1&status=1`))
  assert.equal(list.total, 2)
  assert.equal(list.list[0].value, 'A')
  assert.equal(data(await f.call('/system/dict-types?keyword=test_dict')).list[0].itemCount, 3)
  assert.equal(data(await f.call('/system/dictionaries/test_dict')).length, 2)
  data(await f.call(`${base}/items/${entry.id}`, put(item({ status: 0 }))))
  assert.deepEqual(
    data(await f.call('/system/dictionaries/test_dict')).map((row) => row.value),
    ['A']
  )
  data(await f.call(base, put(type({ status: 0 }))))
  assert.deepEqual(data(await f.call('/system/dictionaries/test_dict')), [])
  data(await f.call(`${base}/items/${entry.id}`, { method: 'DELETE' }))
  assert.equal(
    (await f.call(`${base}/items`, post(item()))).status,
    409,
    'deleted values stay reserved'
  )
  const remaining = data(await f.call(`${base}/items`)).list
  for (const row of remaining) data(await f.call(`${base}/items/${row.id}`, { method: 'DELETE' }))
  data(await f.call(base, { method: 'DELETE' }))
  assert.equal((await f.call('/system/dictionaries/test_dict')).status, 404)
  assert.equal((await f.call('/system/dict-types', post(type()))).status, 409)
})

test('dictionary validation rejects malformed fields and bounds list and option sizes', async (t) => {
  const f = await service(t)
  for (const extra of [
    { code: 'Upper' },
    { code: '../bad' },
    { name: ' ' },
    { sortOrder: -1 },
    { status: 2 },
    { unknown: true }
  ])
    assert.equal((await f.call('/system/dict-types', post(type(extra)))).status, 400)
  for (const extra of [
    { value: 1 },
    { value: ' 1' },
    { label: '' },
    { tagType: '<script>' },
    { remark: 1 },
    { dictTypeId: 2 }
  ])
    assert.equal((await f.call('/system/dict-types/1/items', post(item(extra)))).status, 400)
  assert.equal((await f.call('/system/dict-types?pageSize=101')).status, 400)
  assert.equal((await f.call('/system/dict-types/1/items?status=3')).status, 400)
  for (let index = 0; index < 498; index++)
    f.sqlite
      .prepare('INSERT INTO sys_dict_item(dict_type_id,label,value) VALUES(1,?,?)')
      .run(`Label ${index}`, `option_${index}`)
  assert.equal(data(await f.call('/system/dictionaries/sys_notice_type')).length, 500)
  assert.equal((await f.call('/system/dict-types/1/items', post(item()))).status, 409)
})

test('dictionary writes advance the revision and stale writes are rolled back', async (t) => {
  const f = await service(t)
  const actor = await authenticate(
    new Request('https://test', { headers: { Authorization: `Bearer ${f.admin}` } }),
    f.db
  )
  const state = await snapshot(f.db, actor)
  data(
    await f.call('/system/dict-types/1', put(type({ code: 'sys_notice_type', name: 'Updated' })))
  )
  await assert.rejects(
    commit(f.db, actor, state, [update(f.db, 'sys_dict_type', 1, { name: 'Stale' })]),
    (error) => error.status === 409
  )
  assert.equal(f.sqlite.prepare('SELECT name FROM sys_dict_type WHERE id=1').get().name, 'Updated')
})

test('dictionary list and enabled-option indexes support filtering and ordering without a temporary sort', async (t) => {
  const f = await service(t)
  const queries = [
    [
      'SELECT * FROM sys_dict_type WHERE deleted_at IS NULL ORDER BY sort_order,id LIMIT 10',
      'idx_dict_type_live_sort'
    ],
    [
      'SELECT * FROM sys_dict_type WHERE deleted_at IS NULL AND status=1 ORDER BY sort_order,id LIMIT 10',
      'idx_dict_type_live_status_sort'
    ],
    [
      'SELECT * FROM sys_dict_item WHERE dict_type_id=1 AND deleted_at IS NULL ORDER BY sort_order,id LIMIT 10',
      'idx_dict_item_live_sort'
    ],
    [
      'SELECT label,value,tag_type FROM sys_dict_item WHERE dict_type_id=1 AND deleted_at IS NULL AND status=1 ORDER BY sort_order,id LIMIT 501',
      'idx_dict_item_live_status_sort'
    ]
  ]
  for (const [query, index] of queries) {
    const plan = f.sqlite
      .prepare(`EXPLAIN QUERY PLAN ${query}`)
      .all()
      .map((row) => row.detail)
      .join('\n')
    assert.ok(plan.includes(index), plan)
    assert.doesNotMatch(plan, /TEMP B-TREE/)
  }
})
