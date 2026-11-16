import type { PaginationProps, Sort, TableColumnCtx, TableInstance } from 'element-plus'

/** 页码、每页条数和总数由 DataTable 顶层参数控制，其余分页外观在这里配置。 */
export interface DataTablePagination extends Partial<
  Pick<
    PaginationProps,
    'pageSizes' | 'pagerCount' | 'layout' | 'background' | 'size' | 'hideOnSinglePage' | 'disabled'
  >
> {
  align?: 'left' | 'center' | 'right'
}

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
