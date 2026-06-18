import { useState, useCallback, useMemo } from 'react';


export interface DataTableColumn<TData = any> {
  key: string;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  render?: (value: unknown, row: TData, index: number) => React.ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableFilter {
  key: string;
  value: unknown;
  operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte';
}

export interface DataTableSort {
  key: string;
  direction: 'asc' | 'desc';
}

export interface DataTableConfig<TData = any> {
  // Data
  data: TData[];
  columns: DataTableColumn<TData>[];
  
  // Pagination
  enablePagination?: boolean;
  pageSize?: number;
  
  // Filtering
  enableFiltering?: boolean;
  enableSearch?: boolean;
  
  // Sorting
  enableSorting?: boolean;
  defaultSort?: DataTableSort;
  
  // Selection
  enableSelection?: boolean;
  enableMultiSelection?: boolean;
  
  // Actions
  rowActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (row: TData, index: number) => void;
    disabled?: (row: TData) => boolean;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  }>;
  
  // Row styling
  getRowClassName?: (row: TData, index: number) => string;
  getRowProps?: (row: TData, index: number) => Record<string, any>;
}

export interface DataTableState<TData = any> {
  // Pagination
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  
  // Filtering and searching
  filters: DataTableFilter[];
  searchQuery: string;
  
  // Sorting
  sort: DataTableSort | null;
  
  // Selection
  selectedRows: TData[];
  selectedRowIndices: number[];
  
  // Processed data
  filteredData: TData[];
  displayData: TData[];
}

export interface DataTableActions<TData = any> {
  // Pagination
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  
  // Filtering and searching
  addFilter: (filter: DataTableFilter) => void;
  removeFilter: (key: string) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;
  
  // Sorting
  setSortBy: (key: string, direction?: 'asc' | 'desc') => void;
  toggleSort: (key: string) => void;
  clearSort: () => void;
  
  // Selection
  selectRow: (index: number) => void;
  deselectRow: (index: number) => void;
  toggleRowSelection: (index: number) => void;
  selectAllRows: () => void;
  deselectAllRows: () => void;
  toggleAllRowsSelection: () => void;
}

/**
 * Hook for managing table with filtering, pagination, and sorting
 * Provides comprehensive table state management for data tables
 */
export function useDataTable<TData = any>(config: DataTableConfig<TData>) {
  const {
    data,
    columns,
    enablePagination = true,
    pageSize: initialPageSize = 10,
    enableFiltering = true,
    enableSearch = true,
    enableSorting = true,
    defaultSort,
    enableSelection = false,
    enableMultiSelection = false,
  } = config;

  // State management
  const [filters, setFilters] = useState<DataTableFilter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<DataTableSort | null>(defaultSort || null);
  const [selectedRowIndices, setSelectedRowIndices] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Filter data based on filters and search
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (enableSearch && searchQuery.trim()) {
      const searchableColumns = columns.filter(col => col.searchable !== false);
      result = result.filter(row => {
        return searchableColumns.some(col => {
          const value = row[col.key];
          if (value == null) return false;
          return String(value).toLowerCase().includes(searchQuery.toLowerCase());
        });
      });
    }

    // Apply filters
    if (enableFiltering && filters.length > 0) {
      result = result.filter(row => {
        return filters.every(filter => {
          const value = row[filter.key];
          const filterValue = filter.value;
          
          if (value == null) return false;

          switch (filter.operator || 'contains') {
            case 'equals':
              return value === filterValue;
            case 'contains':
              return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
            case 'startsWith':
              return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
            case 'endsWith':
              return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
            case 'gt':
              return Number(value) > Number(filterValue);
            case 'lt':
              return Number(value) < Number(filterValue);
            case 'gte':
              return Number(value) >= Number(filterValue);
            case 'lte':
              return Number(value) <= Number(filterValue);
            default:
              return true;
          }
        });
      });
    }

    return result;
  }, [data, searchQuery, filters, columns, enableSearch, enableFiltering]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!enableSorting || !sort) return filteredData;

    const { key, direction } = sort;
    return [...filteredData].sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return direction === 'desc' ? -comparison : comparison;
    });
  }, [filteredData, sort, enableSorting]);

  // Update pagination when filtered data changes
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  // Get display data for current page
  const displayData = useMemo(() => {
    if (!enablePagination) return sortedData;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, pageSize, enablePagination]);

  // Get selected rows based on indices
  const selectedRows = useMemo(() => {
    return selectedRowIndices.map(index => displayData[index]).filter(Boolean);
  }, [selectedRowIndices, displayData]);

  // Pagination actions
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const setPageSizeAndReset = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  // Filter actions
  const addFilter = useCallback((filter: DataTableFilter) => {
    setFilters(prev => {
      const existing = prev.findIndex(f => f.key === filter.key);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = filter;
        return updated;
      }
      return [...prev, filter];
    });
    setCurrentPage(1); // Reset to first page
  }, []);

  const removeFilter = useCallback((key: string) => {
    setFilters(prev => prev.filter(f => f.key !== key));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
    setCurrentPage(1);
  }, []);

  // Search actions
  const handleSetSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page
  }, []);

  // Sort actions
  const setSortBy = useCallback((key: string, direction: 'asc' | 'desc' = 'asc') => {
    setSort({ key, direction });
  }, []);

  const toggleSort = useCallback((key: string) => {
    setSort(prev => {
      if (!prev || prev.key !== key) {
        return { key, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null; // Clear sort
    });
  }, []);

  const clearSort = useCallback(() => {
    setSort(null);
  }, []);

  // Selection actions
  const selectRow = useCallback((index: number) => {
    if (!enableSelection) return;
    
    setSelectedRowIndices(prev => {
      if (!enableMultiSelection) {
        return [index];
      }
      if (prev.includes(index)) {
        return prev;
      }
      return [...prev, index];
    });
  }, [enableSelection, enableMultiSelection]);

  const deselectRow = useCallback((index: number) => {
    setSelectedRowIndices(prev => prev.filter(i => i !== index));
  }, []);

  const toggleRowSelection = useCallback((index: number) => {
    setSelectedRowIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      if (!enableMultiSelection) {
        return [index];
      }
      return [...prev, index];
    });
  }, [enableMultiSelection]);

  const selectAllRows = useCallback(() => {
    if (!enableSelection || !enableMultiSelection) return;
    setSelectedRowIndices(displayData.map((_, index) => index));
  }, [enableSelection, enableMultiSelection, displayData]);

  const deselectAllRows = useCallback(() => {
    setSelectedRowIndices([]);
  }, []);

  const toggleAllRowsSelection = useCallback(() => {
    if (selectedRowIndices.length === displayData.length) {
      deselectAllRows();
    } else {
      selectAllRows();
    }
  }, [selectedRowIndices.length, displayData.length, deselectAllRows, selectAllRows]);

  return {
    // State
    state: {
      currentPage,
      totalPages,
      pageSize,
      totalItems,
      filters,
      searchQuery,
      sort,
      selectedRows,
      selectedRowIndices,
      filteredData,
      displayData,
    } as DataTableState<TData>,

    // Actions
    actions: {
      // Pagination
      goToPage,
      nextPage,
      previousPage,
      setPageSize: setPageSizeAndReset,
      
      // Filtering and searching
      addFilter,
      removeFilter,
      clearFilters,
      setSearchQuery: handleSetSearchQuery,
      
      // Sorting
      setSortBy,
      toggleSort,
      clearSort,
      
      // Selection
      selectRow,
      deselectRow,
      toggleRowSelection,
      selectAllRows,
      deselectAllRows,
      toggleAllRowsSelection,
    } as DataTableActions<TData>,

    // Computed properties
    computed: {
      isEmpty: displayData.length === 0,
      hasFilters: filters.length > 0 || searchQuery.length > 0,
      hasSelection: selectedRowIndices.length > 0,
      isAllSelected: enableMultiSelection && selectedRowIndices.length === displayData.length && displayData.length > 0,
      isSorted: sort !== null,
    },
  };
}