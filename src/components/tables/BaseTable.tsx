
import { useOptimizedState } from '@/hooks/performance/useOptimizedComponents';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MoreHorizontal, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  UserX
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePagination } from "@/hooks/utils/use-pagination";
import { useTranslation } from "react-i18next";

interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
}

interface TableAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (item: any) => void;
  className?: string;
}

interface BaseTableProps<T> {
  data: T[];
  columns: TableColumn[];
  actions?: TableAction[];
  loading?: boolean;
  searchPlaceholder?: string;
  filterOptions?: { value: string; label: string }[];
  onSearch?: (query: string) => void;
  onFilter?: (filter: string) => void;
  emptyMessage?: string;
  renderCell: (item: T, column: TableColumn) => React.ReactNode;
  getItemKey: (item: T) => string;
}

function BaseTable<T>({
  data,
  columns,
  actions,
  loading,
  searchPlaceholder,
  filterOptions,
  onSearch,
  onFilter,
  emptyMessage,
  renderCell,
  getItemKey,
}: BaseTableProps<T>) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useOptimizedState("");
  const [statusFilter, setStatusFilter] = useOptimizedState("all");
  const [currentPage, setCurrentPage] = useOptimizedState(1);
  const itemsPerPage = 10;

  // Filter and search logic
  const filteredData = data.filter((item: any) => {
    const matchesSearch = searchQuery === "" || 
      Object.values(item).some(value => 
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    const matchesFilter = statusFilter === "all" || 
      (item.status && item.status.toLowerCase() === statusFilter.toLowerCase());
    
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const { pages } = usePagination({
    currentPage,
    totalPages,
    paginationItemsToDisplay: 5,
  });

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    onSearch?.(value);
  };

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
    onFilter?.(value);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Search and filter skeleton */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="h-10 bg-muted rounded-md animate-pulse" />
          </div>
          <div className="w-full sm:w-48">
            <div className="h-10 bg-muted rounded-md animate-pulse" />
          </div>
        </div>

        {/* Table skeleton */}
        <div className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key} className={`text-muted-foreground ${column.className}`}>
                    {column.label}
                  </TableHead>
                ))}
                {actions && <TableHead className="text-muted-foreground w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell>
                      <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={searchPlaceholder || t("search")}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
            />
        </div>
        
        {filterOptions && (
          <Select value={statusFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-full sm:w-48 bg-background border-border text-foreground">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t("filter_by_status")} />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all" className="text-foreground hover:bg-muted">
                {t("all_statuses")}
              </SelectItem>
              {filterOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-foreground hover:bg-muted"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <div className="w-full">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={`text-muted-foreground ${column.className || ''}`}>
                  {column.label}
                </TableHead>
              ))}
              {actions && <TableHead className="text-muted-foreground w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="text-center text-muted-foreground py-8">
                  {emptyMessage || t("no_data_available")}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow key={getItemKey(item)}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {renderCell(item, column)}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-card border-border"
                        >
                          {actions.map((action, index) => (
                            <DropdownMenuItem
                              key={index}
                              onClick={() => action.onClick(item)}
                              className={action.className || "text-foreground hover:bg-muted"}
                            >
                              {action.icon}
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("showing", {
              start: Math.min(startIndex + 1, filteredData.length), 
              end: Math.min(startIndex + itemsPerPage, filteredData.length), 
              total: filteredData.length 
            })}
          </p>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="bg-card border-border text-foreground hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("previous")}
            </Button>
            
            {pages.map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className={
                  currentPage === page
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-card border-border text-foreground hover:bg-muted"
                }
              >
                {page}
              </Button>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="bg-card border-border text-foreground hover:bg-muted"
            >
              {t("next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BaseTable;
