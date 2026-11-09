"use client"

import type { Table } from "@tanstack/react-table"
import TablePagination from "../admin/table-pagination"

export function DataTablePagination<TData>({ table }: { table: Table<TData> }) {
  const { pageIndex, pageSize } = table.getState().pagination
  return <TablePagination page={pageIndex + 1} pageSize={pageSize}
    total={table.getFilteredRowModel().rows.length} selected={table.getFilteredSelectedRowModel().rows.length}
    filtered={table.getState().columnFilters.length > 0} ariaLabel="Table pagination"
    onPageChange={page => table.setPageIndex(page - 1)}
    onPageSizeChange={size => { table.setPageSize(size); table.setPageIndex(0) }} />
}
