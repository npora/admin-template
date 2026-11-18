export const findLoginUser = (db, username) =>
  db
    .prepare('SELECT * FROM sys_user WHERE username = ?1 COLLATE NOCASE AND deleted_at IS NULL')
    .bind(username)
    .first()

export const findSession = (db, tokenHash, now) =>
  db
    .prepare(
      `SELECT u.*, s.credential_fingerprint FROM sys_auth_session s
    JOIN sys_user u ON u.id = s.user_id
    WHERE s.token_hash = ?1 AND s.expires_at > ?2 AND u.status = 1 AND u.deleted_at IS NULL`
    )
    .bind(tokenHash, now)
    .first()

export async function saveSession(db, user, tokenHash, fingerprint, now, ttl, totpSecret = '') {
  const timestamp = now
  const results = await db.batch([
    db.prepare('DELETE FROM sys_auth_session WHERE expires_at <= ?1').bind(now),
    db
      .prepare(
        `DELETE FROM sys_auth_session WHERE user_id = ?1 AND token_hash NOT IN
      (SELECT token_hash FROM sys_auth_session WHERE user_id = ?1 ORDER BY created_at DESC, token_hash DESC LIMIT 9)`
      )
      .bind(user.id),
    db
      .prepare(
        `INSERT INTO sys_auth_session(token_hash, user_id, credential_fingerprint, created_at, expires_at)
      SELECT ?1, id, ?2, ?3, ?4 FROM sys_user
      WHERE id = ?5 AND password_hash = ?6 AND status = 1 AND deleted_at IS NULL
      AND COALESCE((SELECT secret_encrypted FROM sys_user_totp WHERE user_id = ?5 AND enabled = 1), '') = ?7`
      )
      .bind(tokenHash, fingerprint, now, now + ttl, user.id, user.password_hash, totpSecret),
    db
      .prepare(
        `UPDATE sys_user SET last_login_at = ?1, updated_at = ?1
      WHERE id = ?2 AND password_hash = ?3 AND status = 1 AND deleted_at IS NULL`
      )
      .bind(timestamp, user.id, user.password_hash)
  ])
  return results[2].meta.changes === 1
}
export const deleteSession = (db, tokenHash) =>
  db.prepare('DELETE FROM sys_auth_session WHERE token_hash = ?1').bind(tokenHash).run()

export async function readAccess(db, userId) {
  // One transactional batch gives roles, grants and menu state a consistent snapshot.
  const [roles, menus, links] = await db.batch([
    db
      .prepare(
        `SELECT r.* FROM sys_role r JOIN sys_user_role ur ON ur.role_id = r.id
      WHERE ur.user_id = ?1 AND r.status = 1 AND r.deleted_at IS NULL ORDER BY r.sort_order, r.id`
      )
      .bind(userId),
    db.prepare('SELECT * FROM sys_menu ORDER BY sort_order, id'),
    db
      .prepare(
        `SELECT DISTINCT rm.menu_id FROM sys_role_menu rm
      JOIN sys_role r ON r.id = rm.role_id JOIN sys_user_role ur ON ur.role_id = r.id
      WHERE ur.user_id = ?1 AND r.status = 1 AND r.deleted_at IS NULL`
      )
      .bind(userId)
  ])
  return { roles: roles.results, menus: menus.results, links: links.results }
}

export const findEnabledTotp = (db, userId) =>
  db.prepare('SELECT * FROM sys_user_totp WHERE user_id = ?1 AND enabled = 1').bind(userId).first()

export async function updatePassword(db, user, binding, step, passwordHash, now) {
  // 账号密码变更触发器在同一事务撤销所有旧会话。
  const update = db
    .prepare(
      `UPDATE sys_user SET password_hash = ?1, updated_at = ?2
    WHERE id = ?3 AND password_hash = ?4 AND status = 1 AND deleted_at IS NULL
    AND (?7 IS NULL OR EXISTS (
      SELECT 1 FROM sys_auth_session WHERE token_hash = ?7 AND user_id = ?3 AND expires_at > ?2
    ))
    AND COALESCE((
      SELECT secret_encrypted FROM sys_user_totp WHERE user_id = ?3 AND enabled = 1
      AND (?5 = '' OR last_used_step < ?6)
    ), '') = ?5 RETURNING id`
    )
    .bind(
      passwordHash,
      now,
      user.id,
      user.password_hash,
      binding?.secret_encrypted ?? '',
      step,
      user.sessionHash ?? null
    )
  if (!binding) return (await update.all()).results.length === 1

  // 只有第一条成功写入本次随机加盐的哈希，第二条才消费动态码。
  const [password] = await db.batch([
    update,
    db
      .prepare(
        `UPDATE sys_user_totp SET last_used_step = ?1
      WHERE user_id = ?2 AND EXISTS (
        SELECT 1 FROM sys_user WHERE id = ?2 AND password_hash = ?3
      )`
      )
      .bind(step, user.id, passwordHash)
  ])
  return password.results.length === 1
}
