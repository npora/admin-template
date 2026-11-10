import type { Sort, TableColumnCtx, TableInstance } from 'element-plus'

export interface DataTableSort<T extends object> {
  column: TableColumnCtx<T>
  prop: string | null
  order: Sort['order'] | null
}

export interface DataTableInstance {
  clearSelection(): void
  doLayout(): void
  /** 其他高级操作使用原生 Element Plus 表格实例。 */
  getTable(): TableInstance | undefined
}
