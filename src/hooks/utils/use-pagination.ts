
import { useMemo } from "react"

interface UsePaginationProps {
  currentPage: number
  totalPages: number
  paginationItemsToDisplay: number
}

export function usePagination({
  currentPage,
  totalPages,
  paginationItemsToDisplay,
}: UsePaginationProps) {
  const pages = useMemo(() => {
    const delta = Math.floor(paginationItemsToDisplay / 2)
    const range = []
    const rangeWithDots = []

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...")
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages)
    } else {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots.filter((page) => page !== "...")
  }, [currentPage, totalPages, paginationItemsToDisplay])

  const showLeftEllipsis = currentPage - Math.floor(paginationItemsToDisplay / 2) > 2
  const showRightEllipsis = currentPage + Math.floor(paginationItemsToDisplay / 2) < totalPages - 1

  return {
    pages: pages.filter((page) => typeof page === "number") as number[],
    showLeftEllipsis,
    showRightEllipsis,
  }
}
