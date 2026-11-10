import type { ManagedDepartment } from '@/api/types/department'
import type { SystemStatus } from '@/api/types/system'

/** 保留命中项的祖先，搜索结果仍能看清部门层级。 */
export function filterDepartmentTree(
  tree: ManagedDepartment[],
  keyword: string,
  status?: SystemStatus
): ManagedDepartment[] {
  const value = keyword.trim().toLocaleLowerCase()
  return tree.flatMap((node) => {
    const children = filterDepartmentTree(node.children ?? [], keyword, status)
    const matches =
      (!value || `${node.name} ${node.code ?? ''}`.toLocaleLowerCase().includes(value)) &&
      (status === undefined || node.status === status)
    return matches || children.length ? [{ ...node, children }] : []
  })
}
