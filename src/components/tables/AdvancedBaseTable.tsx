import React, { useId } from "react";
import { useOptimizedState, useOptimizedMemo } from '@/hooks/performance/useOptimizedComponents';
import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  flexRender,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  MoreHorizontal,
  Search,
  Filter,
  Columns3Icon,
  ListFilterIcon,
  CircleXIcon,
  FilterIcon,
  TrashIcon,
  CircleAlertIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import ConfirmationDialog from "@/components/dialogs/ConfirmationDialog";
import type { TableProps } from "@/types/components";
import { useTranslation } from "react-i18next";

interface AdvancedTableProps<T> extends Omit<TableProps<T>, 'columns'> {
  columns: ColumnDef<T>[];
  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  enableSorting?: boolean;
  searchColumn?: string;
  searchPlaceholder?: string;
  filterableColumns?: string[];
  onRowsDelete?: (rows: T[]) => void;
  deleteConfirmation?: {
    title: string;
    description: string;
    action: string;
  };
  emptyMessage?: string;
  initialSorting?: SortingState;
  initialPageSize?: number;
  customFilterFn?: FilterFn<T>;
  rowActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (row: T) => void;
    className?: string;
  }>;
}

function AdvancedBaseTable<T>({
  data,
  columns,
  loading = false,
  enableRowSelection = false,
  enableColumnVisibility = false,
  enableFiltering = true,
  enablePagination = true,
  enableSorting = true,
  searchColumn = "name",
  searchPlaceholder,
  filterableColumns = [],
  onRowsDelete,
  deleteConfirmation,
  emptyMessage,
  initialSorting = [],
  initialPageSize = 10,
  customFilterFn,
  rowActions,
  className,
}: AdvancedTableProps<T>) {
  const { t } = useTranslation();
  const id = useId();
  const isMobile = useIsMobile();
  
  const [columnFilters, setColumnFilters] = useOptimizedState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useOptimizedState<VisibilityState>({});
  const [sorting, setSorting] = useOptimizedState<SortingState>(initialSorting);
  const [pagination, setPagination] = useOptimizedState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  // Enhanced columns with row selection if enabled
  const enhancedColumns = useOptimizedMemo(() => {
    const cols: ColumnDef<T>[] = [...columns];
    
    if (enableRowSelection) {
      cols.unshift({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        size: 28,
        enableSorting: false,
        enableHiding: false,
      });
    }

    // Add row actions column if provided
    if (rowActions && rowActions.length > 0) {
      cols.push({
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              {rowActions.map((action, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={() => action.onClick(row.original)}
                  className={action.className || "text-foreground hover:bg-muted"}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        size: 60,
        enableHiding: false,
      });
    }

    return cols;
  }, [columns, enableRowSelection, rowActions]);

  const table = useReactTable({
    data,
    columns: enhancedColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    onSortingChange: enableSorting ? setSorting : undefined,
    enableSortingRemoval: enableSorting,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    onPaginationChange: enablePagination ? setPagination : undefined,
    onColumnFiltersChange: enableFiltering ? setColumnFilters : undefined,
    onColumnVisibilityChange: enableColumnVisibility ? setColumnVisibility : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    getFacetedUniqueValues: enableFiltering ? getFacetedUniqueValues() : undefined,
    globalFilterFn: customFilterFn,
    state: {
      ...(enableSorting && { sorting }),
      ...(enablePagination && { pagination }),
      ...(enableFiltering && { columnFilters }),
      ...(enableColumnVisibility && { columnVisibility }),
    },
  });

  // Get filterable column data
  const getFilterableColumnData = (columnKey: string) => {
    const column = table.getColumn(columnKey);
    if (!column) return { values: [], counts: new Map() };
    
    const values = Array.from(column.getFacetedUniqueValues().keys()).sort();
    const counts = column.getFacetedUniqueValues();
    const selectedValues = (column.getFilterValue() as string[]) ?? [];
    
    return { values, counts, selectedValues };
  };

  const handleFilterChange = (columnKey: string, checked: boolean, value: string) => {
    const column = table.getColumn(columnKey);
    if (!column) return;
    
    const filterValue = column.getFilterValue() as string[];
    const newFilterValue = filterValue ? [...filterValue] : [];

    if (checked) {
      newFilterValue.push(value);
    } else {
      const index = newFilterValue.indexOf(value);
      if (index > -1) {
        newFilterValue.splice(index, 1);
      }
    }

    column.setFilterValue(newFilterValue.length ? newFilterValue : undefined);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Filter skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-10 w-60 bg-muted rounded-md animate-pulse" />
            {!isMobile && (
              <>
                <div className="h-10 w-20 bg-muted rounded-md animate-pulse" />
                <div className="h-10 w-16 bg-muted rounded-md animate-pulse" />
              </>
            )}
          </div>
        </div>

        {/* Table skeleton */}
        <div className="bg-card border-border overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                {enhancedColumns.map((col, i) => (
                  <TableHead key={i} className="text-muted-foreground">
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, idx) => (
                <TableRow key={`skeleton-${idx}`} className="border-border">
                  {enhancedColumns.map((col, i) => (
                    <TableCell key={i} className="py-4">
                      <Skeleton className="h-4 w-full max-w-[120px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filters */}
      {enableFiltering && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search filter */}
            <div className="relative">
              <Input
                id={`${id}-search`}
                className={cn(
                  "w-full sm:min-w-60 ps-9 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring",
                  Boolean(table.getColumn(searchColumn)?.getFilterValue()) && "pe-9"
                )}
                value={(table.getColumn(searchColumn)?.getFilterValue() ?? "") as string}
                onChange={(e) => table.getColumn(searchColumn)?.setFilterValue(e.target.value)}
                placeholder={searchPlaceholder || t("search")}
                type="text"
              />
              <ListFilterIcon
                className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 ps-3 top-1/2 transform -translate-y-1/2"
                size={16}
              />
              {Boolean(table.getColumn(searchColumn)?.getFilterValue()) && (
                <button
                  className="text-muted-foreground hover:text-foreground absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md"
                  onClick={() => table.getColumn(searchColumn)?.setFilterValue("")}
                >
                  <CircleXIcon size={16} />
                </button>
              )}
            </div>

            {/* Filterable columns */}
            {!isMobile && filterableColumns.map((columnKey) => {
              const { values, counts, selectedValues } = getFilterableColumnData(columnKey);
              
              return (
                <Popover key={columnKey}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <FilterIcon className="-ms-1 opacity-60" size={16} />
                      {columnKey}
                      {selectedValues.length > 0 && (
                        <span className="bg-background text-muted-foreground -me-1 inline-flex h-5 items-center rounded border border-border px-1 text-[0.625rem] font-medium">
                          {selectedValues.length}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto min-w-36 p-3 bg-card border-border" align="start">
                    <div className="space-y-3">
                      <div className="text-muted-foreground text-xs font-medium">{t("filters")}</div>
                      <div className="space-y-3">
                        {values.map((value, i) => (
                          <div key={value} className="flex items-center gap-2">
                            <Checkbox
                              id={`${id}-${columnKey}-${i}`}
                              checked={selectedValues.includes(value)}
                              onCheckedChange={(checked: boolean) =>
                                handleFilterChange(columnKey, checked, value)
                              }
                            />
                            <Label
                              htmlFor={`${id}-${columnKey}-${i}`}
                              className="flex grow justify-between gap-2 font-normal text-muted-foreground"
                            >
                              {value}
                              <span className="text-muted-foreground ms-2 text-xs">
                                {counts.get(value)}
                              </span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}

            {/* Column visibility */}
            {!isMobile && enableColumnVisibility && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <Columns3Icon className="-ms-1 opacity-60" size={16} />
                    {t("view")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border">
                  <DropdownMenuLabel className="text-muted-foreground">{t("toggle_columns")}</DropdownMenuLabel>
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize text-muted-foreground hover:bg-muted"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        onSelect={(event) => event.preventDefault()}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Bulk actions */}
          {enableRowSelection && table.getSelectedRowModel().rows.length > 0 && onRowsDelete && (
            <ConfirmationDialog
              trigger={
                <Button
                  variant="outline"
                  className="border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground relative"
                >
                  <TrashIcon className="-ms-1 opacity-60" size={16} />
                  {t("delete")}
                  <span className="absolute bg-background text-muted-foreground inline-flex aspect-square min-w-5 h-5 items-center justify-center rounded-full border border-border px-1 text-[0.625rem] font-medium mb-8 ml-12">
                    {table.getSelectedRowModel().rows.length}
                  </span>
                </Button>
              }
              title={deleteConfirmation?.title || t("are_you_sure")}
              description={deleteConfirmation?.description || t("this_will_delete_selected", { count: table.getSelectedRowModel().rows.length })}
              confirmText={deleteConfirmation?.action || t("delete")}
              variant="destructive"
              onConfirm={() => {
                const selectedRows = table.getSelectedRowModel().rows.map(row => row.original);
                onRowsDelete(selectedRows);
                table.resetRowSelection();
              }}
            />
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-card border-border overflow-hidden rounded-md border">
        <div className="overflow-x-auto">
          <Table className="table-fixed min-w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-border">
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta as { className?: string } | undefined;
                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: `${header.getSize()}px` }}
                        className={cn("h-11 text-muted-foreground", meta?.className)}
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <div
                            className="flex h-full cursor-pointer items-center justify-between gap-2 select-none"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: <ChevronUpIcon className="shrink-0 opacity-60" size={16} />,
                              desc: <ChevronDownIcon className="shrink-0 opacity-60" size={16} />,
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="border-border hover:bg-muted"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as { className?: string } | undefined;
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn("last:py-0", meta?.className)}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow className="border-border">
                  <TableCell
                    colSpan={enhancedColumns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyMessage || t("no_data_available")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {enablePagination && (
        <div className="flex items-center justify-between gap-4 sm:gap-8">
          <div className="flex items-center gap-3">
            <Label className="max-sm:sr-only text-muted-foreground">{t("rows_per_page")}</Label>
            <Select
              value={table.getState().pagination.pageSize.toString()}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="w-fit whitespace-nowrap bg-background border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {[5, 10, 25, 50].map((pageSize) => (
                  <SelectItem
                    key={pageSize}
                    value={pageSize.toString()}
                    className="text-muted-foreground hover:bg-muted"
                  >
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-muted-foreground flex grow justify-end text-sm whitespace-nowrap">
            <p className="text-muted-foreground text-sm whitespace-nowrap">
              <span className="text-foreground">
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  table.getRowCount()
                )}
              </span>{" "}
              of{" "}
              <span className="text-foreground">{table.getRowCount()}</span>
            </p>
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                  onClick={() => table.firstPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronFirstIcon size={16} />
                </Button>
              </PaginationItem>
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeftIcon size={16} />
                </Button>
              </PaginationItem>
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRightIcon size={16} />
                </Button>
              </PaginationItem>
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                  onClick={() => table.lastPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronLastIcon size={16} />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

export default AdvancedBaseTable;