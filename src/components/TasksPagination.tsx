import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function TasksPagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-3 w-full -my-4 -mb-0">
      <p className="text-neutral-400 grow text-sm" aria-live="polite">
        {t("page")} <span className="text-neutral-50">{currentPage}</span> {t("of")}{" "}
        <span className="text-neutral-400">{totalPages}</span>
      </p>
      <Pagination className="w-auto ">
        <PaginationContent className="gap-3">
          <PaginationItem>
            <Button
              variant="outline"
              className="aria-disabled:pointer-events-none aria-disabled:opacity-50 border-neutral-800 bg-neutral-900 text-neutral-50 hover:bg-neutral-300 hover:text-neutral-900 max-h-8 max-w-8"
              aria-disabled={currentPage === 1 ? true : undefined}
              onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft/>
            </Button>
          </PaginationItem>

          <PaginationItem>
            <Button
              variant="outline"
              className="aria-disabled:pointer-events-none aria-disabled:opacity-50 border-neutral-800 bg-neutral-900 text-neutral-50 hover:bg-neutral-300 hover:text-neutral-900 max-h-8 max-w-8"
              aria-disabled={currentPage === totalPages ? true : undefined}
              onClick={() =>
                currentPage < totalPages && onPageChange(currentPage + 1)
              }
              disabled={currentPage === totalPages}
            >
              <ChevronRight/>
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
