import type { PaginationProps, Sort, TableColumnCtx, TableInstance } from 'element-plus'

/** 页码、每页条数和总数由 DataTable 顶层参数控制，其余分页外观在这里配置。 */
export interface DataTablePagination extends Partial<
  Omit<
    PaginationProps,
    'currentPage' | 'defaultCurrentPage' | 'pageSize' | 'defaultPageSize' | 'total' | 'pageCount'
  >
> {
  align?: 'left' | 'center' | 'right'
}

export interface DataTableProps<T extends object> {
  data: T[]
  loading?: boolean
  border?: boolean
  rowKey?: string | ((row: T) => string)
  emptyText?: string
  pagination?: boolean | DataTablePagination
  page?: number
  pageSize?: number
  total?: number
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
