import { HttpError, readJson, success } from '../http.mjs'
import { authenticate } from './auth.mjs'
import { requirePermission } from '../security/access.mjs'
import { snapshot, commit, insert, update, nowFields } from '../repositories/management.mjs'
import {
  fieldsOnly,
  text,
  optional,
  sort,
  status,
  invalid,
  conflict,
  nullable,
  pagination
} from './validation.mjs'
import { audit } from './dto.mjs'

const tags = new Set(['primary', 'success', 'warning', 'danger', 'info'])
const commonDto = (row) => ({
  id: row.id,
  remark: row.remark,
  status: row.status,
  sortOrder: row.sort_order,
  ...audit(row)
})
const typeDto = (row) => ({
  ...commonDto(row),
  code: row.code,
  name: row.name,
  itemCount: row.item_count ?? 0
})
const itemDto = (row) => ({
  ...commonDto(row),
  dictTypeId: row.dict_type_id,
  label: row.label,
  value: row.value,
  tagType: row.tag_type
})
const missing = () => {
  throw new HttpError(404, '字典不存在或已被删除', 10004)
}

export async function dictionaries(request, env, { typeId, itemId, items, code }) {
  const actor = await authenticate(request, env.DB)
  if (code) {
    const type = await env.DB.prepare(
      'SELECT id,status FROM sys_dict_type WHERE code=?1 AND deleted_at IS NULL'
    )
      .bind(code)
      .first()
    if (!type) missing()
    if (type.status !== 1) return success([])
    const result = await env.DB.prepare(
      'SELECT label,value,tag_type FROM sys_dict_item WHERE dict_type_id=?1 AND status=1 AND deleted_at IS NULL ORDER BY sort_order,id LIMIT 501'
    )
      .bind(type.id)
      .all()
    if (result.results.length > 500) conflict('字典选项超过上限，请拆分字典')
    return success(
      result.results.map((row) => ({ label: row.label, value: row.value, tagType: row.tag_type }))
    )
  }
  const state = await snapshot(env.DB, actor)
  const action = { GET: 'list', POST: 'create', PUT: 'update', DELETE: 'delete' }[request.method]
  requirePermission(state.access, `system:${items ? 'dict-item' : 'dict'}:${action}`)
  const type = typeId
    ? await env.DB.prepare('SELECT * FROM sys_dict_type WHERE id=?1 AND deleted_at IS NULL')
        .bind(typeId)
        .first()
    : undefined
  if (typeId && !type) missing()
  const table = items ? 'sys_dict_item' : 'sys_dict_type'
  const targetId = items ? itemId : typeId
  const dto = items ? itemDto : typeDto
  let existing = type
  if (items && itemId) {
    existing = await env.DB.prepare(
      'SELECT * FROM sys_dict_item WHERE id=?1 AND dict_type_id=?2 AND deleted_at IS NULL'
    )
      .bind(itemId, typeId)
      .first()
    if (!existing) missing()
  }
  if (request.method === 'GET') {
    const query = pagination(new URL(request.url))
    const params = [query.keyword]
    let where = `deleted_at IS NULL AND instr(lower(${items ? "label || ' ' || value" : "name || ' ' || code"}),lower(?1))>0`
    if (query.status !== null) {
      params.push(query.status)
      where += ` AND status=?${params.length}`
    }
    if (items) {
      params.push(typeId)
      where += ` AND dict_type_id=?${params.length}`
    }
    const countSql = `SELECT count(*) AS total FROM ${table} WHERE ${where}`
    const columns = items
      ? '*'
      : '*, (SELECT count(*) FROM sys_dict_item i WHERE i.dict_type_id=sys_dict_type.id AND i.deleted_at IS NULL) AS item_count'
    const offset = params.length
    const [count, rows] = await env.DB.batch([
      env.DB.prepare(countSql).bind(...params),
      env.DB.prepare(
        `SELECT ${columns} FROM ${table} WHERE ${where} ORDER BY sort_order,id LIMIT ?${offset + 1} OFFSET ?${offset + 2}`
      ).bind(...params, query.pageSize, (query.page - 1) * query.pageSize)
    ])
    return success({ total: count.results[0].total, list: rows.results.map(dto) })
  }
  if (request.method === 'DELETE') {
    if (!items) {
      const count = await env.DB.prepare(
        'SELECT count(*) AS total FROM sys_dict_item WHERE dict_type_id=?1 AND deleted_at IS NULL'
      )
        .bind(typeId)
        .first()
      if (count.total) conflict('请先删除该字典下的数据')
    }
    await commit(env.DB, actor, state, [
      update(env.DB, table, targetId, { deleted_at: new Date().toISOString(), ...nowFields() })
    ])
    return success(null)
  }
  const input = await readJson(request)
  fieldsOnly(input, [
    ...(items ? ['label', 'value', 'tagType'] : ['name', 'code']),
    'remark',
    'sortOrder',
    'status'
  ])
  if (!optional(input.remark, 255) || !sort(input.sortOrder) || !status(input.status))
    invalid('请检查备注、排序和状态')
  let row
  if (items) {
    if (
      !text(input.label, 100) ||
      !text(input.value, 100) ||
      input.value !== input.value.trim() ||
      !tags.has(input.tagType)
    )
      invalid('请检查字典标签、值和标签颜色')
    if (!itemId) {
      const count = await env.DB.prepare(
        'SELECT count(*) AS total FROM sys_dict_item WHERE dict_type_id=?1 AND deleted_at IS NULL'
      )
        .bind(typeId)
        .first()
      if (count.total >= 500) conflict('每个字典最多保留 500 条数据')
    }
    row = {
      dict_type_id: typeId,
      label: input.label.trim(),
      value: input.value,
      tag_type: input.tagType
    }
  } else {
    if (
      !text(input.name, 100) ||
      typeof input.code !== 'string' ||
      !/^[a-z][a-z0-9_]{0,63}$/.test(input.code)
    )
      invalid('请检查字典名称和编码')
    if (existing && existing.code !== input.code) invalid('字典编码创建后不能修改')
    row = { name: input.name.trim(), code: input.code }
  }
  Object.assign(row, {
    remark: nullable(input.remark),
    sort_order: input.sortOrder,
    status: input.status
  })
  const result = await commit(env.DB, actor, state, [
    targetId
      ? update(env.DB, table, targetId, { ...row, ...nowFields() })
      : insert(env.DB, table, row)
  ])
  if (!result[0].results[0]) conflict('数据已变化，请刷新后重试')
  const saved = result[0].results[0]
  if (!items && targetId) {
    const count = await env.DB.prepare(
      'SELECT count(*) AS total FROM sys_dict_item WHERE dict_type_id=?1 AND deleted_at IS NULL'
    )
      .bind(targetId)
      .first()
    saved.item_count = count.total
  }
  return success(dto(saved))
}

export function dictionaryRoute(path) {
  const options = /^\/system\/dictionaries\/([a-z][a-z0-9_]{0,63})$/.exec(path)
  if (options) return ['GET', (request, env) => dictionaries(request, env, { code: options[1] })]
  const match = /^\/system\/dict-types(?:\/([1-9]\d*)(?:\/(items)(?:\/([1-9]\d*))?)?)?$/.exec(path)
  if (!match) return
  const typeId = match[1] ? Number(match[1]) : undefined
  const itemId = match[3] ? Number(match[3]) : undefined
  if ([typeId, itemId].some((id) => id !== undefined && !Number.isSafeInteger(id))) return
  const items = !!match[2]
  const methods = (items ? itemId : typeId) ? 'PUT, DELETE' : 'GET, POST'
  return [methods, (request, env) => dictionaries(request, env, { typeId, itemId, items })]
}
