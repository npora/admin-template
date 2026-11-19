import test from 'node:test'
import assert from 'node:assert/strict'

import { permissionPreview } from '../src/modules/permission-preview.mjs'
import { service } from './helpers/service.mjs'

function requestPreview(env, userId, token) {
  const request = new Request(
    `https://api.example.test/system/users/${userId}/permission-preview`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }
  )
  return permissionPreview(request, env, userId)
}

test('permission preview enforces its own permission and respects a revoked grant', async (t) => {
  const { env, sqlite, viewer, admin } = await service(t)
  await assert.rejects(requestPreview(env, 3), { status: 401 })
  await assert.rejects(requestPreview(env, 999, viewer), { status: 403 })
  await assert.rejects(requestPreview(env, 999, admin), { status: 404 })
  sqlite.exec(`
    INSERT INTO sys_role_menu(role_id,menu_id)
    SELECT 3,id FROM sys_menu WHERE permission='system:user:permission-preview';
  `)
  const response = await requestPreview(env, 3, viewer)
  const { data } = await response.json()
  assert.equal(response.status, 200)
  assert.equal(data.userId, 3)
  sqlite.exec(`
    DELETE FROM sys_role_menu WHERE role_id=3 AND menu_id=
      (SELECT id FROM sys_menu WHERE permission='system:user:permission-preview');
  `)
  await assert.rejects(requestPreview(env, 3, viewer), { status: 403 })
})

test('permission preview reports direct grants, restored parents and valid buttons', async (t) => {
  const { env, sqlite, admin, editor, call } = await service(t)
  sqlite.exec(`
    INSERT INTO sys_role(id,code,name,status) VALUES (200,'sample-second','Sample second',1),
      (201,'sample-disabled','Sample disabled',0),(202,'sample-empty','Sample empty',1);
    INSERT INTO sys_user_role(user_id,role_id) VALUES (3,200),(3,201),(3,202);
    INSERT INTO sys_menu(id,parent_id,type,title,path)
    VALUES (900,NULL,1,'测试空目录','/sample-empty');
    DELETE FROM sys_role_menu WHERE role_id=2 AND menu_id=10;
    INSERT INTO sys_role_menu(role_id,menu_id) VALUES
      (200,11),(200,21),(201,31),(202,900),(200,51);
    UPDATE sys_menu SET status=0 WHERE id=50;
    UPDATE sys_menu SET visible=0, route_query='{"sample":"query-hidden-test"}' WHERE id=20;
  `)
  const preview = await requestPreview(env, 3, admin)
  const { data } = await preview.json()
  assert.equal(preview.status, 200)
  assert.deepEqual(Object.keys(data).sort(), ['entries', 'isSuperAdmin', 'roles', 'userId'])
  assert.deepEqual(
    data.roles.map(({ id }) => id),
    [200, 202, 2]
  )
  assert.equal(data.isSuperAdmin, false)

  const entries = new Map(data.entries.map((entry) => [entry.id, entry]))
  assert.deepEqual(entries.get(1), {
    id: 1,
    parentId: null,
    type: 'directory',
    title: '系统管理',
    permission: null,
    roleIds: [2, 200],
    source: 'inherited'
  })
  assert.equal(entries.get(10).source, 'inherited')
  assert.deepEqual(entries.get(10).roleIds, [2, 200])
  assert.equal(entries.get(20).source, 'inherited')
  assert.deepEqual(entries.get(20).roleIds, [200])
  assert.deepEqual(entries.get(11).roleIds, [2, 200])
  assert.equal(entries.get(11).source, 'role')
  assert.equal(entries.get(11).permission, 'system:user:list')
  assert.equal(entries.has(31), false)
  assert.equal(entries.has(900), false)
  assert.equal(entries.has(51), false)
  assert.ok(!JSON.stringify(data).includes('query-hidden-test'))

  const routes = (await call('/auth/routes', { token: editor })).body.data
  const effectiveNames = routes[0].children.map((row) => row.name)
  assert.deepEqual(effectiveNames, ['SystemUser', 'SystemRole'])
  const profile = (await call('/auth/user', { token: editor })).body.data
  assert.deepEqual(
    data.entries.filter((entry) => entry.type === 'permission').map((entry) => entry.permission),
    profile.permissions
  )
})

test('permission preview treats disabled users and super administrators as distinct sources', async (t) => {
  const { env, sqlite, admin } = await service(t)
  const { data: privileged } = await (await requestPreview(env, 1, admin)).json()
  assert.equal(privileged.isSuperAdmin, true)
  assert.equal(privileged.roles[0].id, 1)
  assert.ok(privileged.entries.length > 0)
  assert.ok(privileged.entries.every((row) => row.source === 'superAdmin' && !row.roleIds.length))
  sqlite.exec('UPDATE sys_user SET status=0 WHERE id=3')
  const { data: disabled } = await (await requestPreview(env, 3, admin)).json()
  assert.deepEqual(disabled, { userId: 3, isSuperAdmin: false, roles: [], entries: [] })
  sqlite.exec('UPDATE sys_user SET deleted_at=1 WHERE id=3')
  await assert.rejects(requestPreview(env, 3, admin), { status: 404 })
})
