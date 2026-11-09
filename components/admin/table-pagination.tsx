"use client"

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import AdminSelect from "./admin-select"
import styles from "./admin.module.css"

type TablePaginationProps = {
  page: number
  pageSize: number
  total: number
  noun?: string
  ariaLabel: string
  filtered?: boolean
  selected?: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export default function TablePagination({ page, pageSize, total, noun = "rows", ariaLabel, filtered = false, selected = 0, onPageChange, onPageSizeChange }: TablePaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.max(1, Math.min(page, pages))
  const first = total ? (current - 1) * pageSize + 1 : 0
  const last = Math.min(current * pageSize, total)
  const sizes = [...new Set([10, 25, 50, 100, pageSize])].sort((a, b) => a - b)
  const controls = [
    { label: "First page", page: 1, icon: ChevronsLeft, disabled: current === 1 },
    { label: "Previous page", page: current - 1, icon: ChevronLeft, disabled: current === 1 },
    { label: "Next page", page: current + 1, icon: ChevronRight, disabled: current === pages },
    { label: "Last page", page: pages, icon: ChevronsRight, disabled: current === pages },
  ]
  return <nav className={`${styles.pagination} ${styles.tablePagination}`} aria-label={ariaLabel}>
    <span role="status">{total ? `${first.toLocaleString()}–${last.toLocaleString()}` : "0"} of {total.toLocaleString()} {noun}{filtered ? " · filtered" : ""}{selected > 0 ? ` · ${selected.toLocaleString()} selected` : ""}</span>
    <div>
      <div className={styles.tablePageSize}>
        <AdminSelect label="Rows per page" value={String(pageSize)} onChange={value => onPageSizeChange(Number(value))}
          options={sizes.map(size => ({ label: String(size), value: String(size) }))} />
      </div>
      <span>Page {current.toLocaleString()} of {pages.toLocaleString()}</span>
      {controls.map(({ label, page: target, icon: Icon, disabled }) => <Button key={label} type="button" variant="outline" size="icon"
        aria-label={label} disabled={disabled} onClick={() => onPageChange(target)}><Icon size={16} aria-hidden="true" /></Button>)}
    </div>
  </nav>
}
