import { readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export function versionParts(version) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version))
    throw new Error('版本号必须是稳定版本，例如 1.0.11')
  const parts = version.split('.').map(Number)
  if (!parts.every(Number.isSafeInteger)) throw new Error('版本号超出范围')
  return parts
}

const compare = (a, b) => {
  const right = versionParts(b)
  return versionParts(a).reduce((result, value, index) => result || value - right[index], 0)
}
const json = (value) => JSON.stringify(value, null, 2) + '\n'
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'))

async function releaseFiles(templateDir, generatorDir) {
  const paths = [
    join(templateDir, 'package.json'),
    join(templateDir, 'package-lock.json'),
    join(generatorDir, 'package.json'),
    join(generatorDir, 'package-lock.json')
  ]
  const values = await Promise.all(paths.map(readJson))
  if (
    values[0].name !== 'admin-template' ||
    values[2].name !== '@npora/create-admin' ||
    values[0].private !== true
  )
    throw new Error('请指定 admin-template 和 create-admin 的维护仓库目录')
  return { paths, values }
}

export async function verifyRelease(templateDir, generatorDir, tag) {
  if (!tag.startsWith('v')) throw new Error('发布 Tag 必须为 v<版本号>')
  const version = tag.slice(1)
  versionParts(version)
  const { paths, values } = await releaseFiles(templateDir, generatorDir)
  for (const [index, value] of values.entries()) {
    if (
      value.version !== version ||
      (paths[index].endsWith('package-lock.json') && value.packages?.['']?.version !== version)
    )
      throw new Error(`${paths[index]} 与发布版本 ${version} 不一致`)
  }
  return version
}

/** 一次更新两个仓库，不提交、打 Tag 或发布。 */
export async function prepareRelease(templateDir, generatorDir, increment = 'patch') {
  const { paths, values } = await releaseFiles(templateDir, generatorDir)
  const versions = values.map((value) => value.version)
  versions.forEach(versionParts)
  const current = versions.toSorted(compare).at(-1)
  let version = increment
  if (['major', 'minor', 'patch'].includes(increment)) {
    const parts = versionParts(current)
    const index = { major: 0, minor: 1, patch: 2 }[increment]
    parts[index] += 1
    for (let i = index + 1; i < parts.length; i++) parts[i] = 0
    version = parts.join('.')
  }
  versionParts(version)
  if (compare(version, current) <= 0) throw new Error('新版本必须大于两个仓库当前版本')
  for (const [index, value] of values.entries()) {
    value.version = version
    if (paths[index].endsWith('package-lock.json')) {
      if (!value.packages?.['']) throw new Error(`无效的 npm 锁文件：${paths[index]}`)
      value.packages[''].version = version
    }
  }
  for (const [index, file] of paths.entries()) await writeFile(file, json(values[index]))
  await verifyRelease(templateDir, generatorDir, `v${version}`)
  return version
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const templateDir = fileURLToPath(new URL('../../', import.meta.url))
  const [increment = 'patch', generator = '../create-nova-admin', ...extra] = process.argv.slice(2)
  if (extra.length) throw new Error('用法：npm run release:prepare -- patch [生成器目录]')
  const version = await prepareRelease(templateDir, resolve(templateDir, generator), increment)
  console.log(
    `两个仓库已统一为 ${version}。检查并提交推送后，先推送模板 v${version}，再推送生成器同名 Tag。`
  )
}
