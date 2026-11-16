import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyRelease } from './prepare.mjs'

const [tag, generator = '../create-nova-admin', ...extra] = process.argv.slice(2)
if (!tag || extra.length)
  throw new Error('用法：node scripts/release/verify.mjs v<版本号> [生成器目录]')
const templateDir = fileURLToPath(new URL('../../', import.meta.url))
console.log(
  `发布版本检查通过：${await verifyRelease(templateDir, resolve(templateDir, generator), tag)}`
)
