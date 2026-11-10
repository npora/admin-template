import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hashPassword, randomHex } from '../src/security/crypto.mjs'

export async function createBootstrap(directory) {
  const pepper = randomHex()
  const accounts = { admin: randomHex(20), viewer: randomHex(20) }
  const [adminHash, viewerHash] = await Promise.all(
    Object.values(accounts).map((password) => hashPassword(password, pepper))
  )
  const sql = `-- Execute once after the numbered schema migrations. No plaintext passwords or pepper here.
INSERT INTO sys_user(department_id, username, password_hash, display_name, is_super_admin)
VALUES (2, 'admin', '${adminHash}', '系统管理员', 1);
INSERT INTO sys_user(department_id, username, password_hash, display_name)
VALUES (3, 'viewer', '${viewerHash}', '只读用户');
INSERT INTO sys_user_role(user_id, role_id) SELECT id, 1 FROM sys_user WHERE username = 'admin';
INSERT INTO sys_user_role(user_id, role_id) SELECT id, 3 FROM sys_user WHERE username = 'viewer';
`
  // Deliberately refuse an existing directory: never silently rotate the pepper or overwrite credentials.
  await mkdir(directory, { mode: 0o700 })
  await writeFile(join(directory, 'bootstrap.sql'), sql, { mode: 0o600, flag: 'wx' })
  await writeFile(
    join(directory, 'credentials.json'),
    JSON.stringify({ AUTH_PEPPER: pepper, accounts }, null, 2) + '\n',
    { mode: 0o600, flag: 'wx' }
  )
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = fileURLToPath(new URL('../.local/', import.meta.url))
  await createBootstrap(directory)
  console.log(
    '已生成 .local/bootstrap.sql 和 .local/credentials.json。后者含密码和 Secret，请仅在本机查看，不要提交。'
  )
}
