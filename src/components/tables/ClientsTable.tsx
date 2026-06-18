"use client";
import { Skeleton } from "@/components/ui/skeleton";
import { useRef, useId } from "react";
import { useOptimizedState, useOptimizedMemo } from '@/hooks/performance/useOptimizedComponents';
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  CircleXIcon,
  Columns3Icon,
  EllipsisIcon,
  FilterIcon,
  ListFilterIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import AddClientDialog from "@/components/dialogs/AddClientDialog";
import EditClientDialog from "@/components/dialogs/EditClientDialog";
import ScheduleSessionDialog from "@/components/dialogs/ScheduleSessionDialog";
import { Client } from "@/types/client";
import { Session } from "@/types/session";
import { clientService } from "@/services/api";
import { useTherapistClients, useDisconnectClient, useUpdateClientProfile } from "@/hooks/api/useOptimizedTherapists";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

// Custom filter function for multi-column searching
const multiColumnFilterFn: FilterFn<Client> = (row, columnId, filterValue) => {
  const searchableRowContent =
    `${row.original.name} ${row.original.email}`.toLowerCase();
  const searchTerm = (filterValue ?? "").toLowerCase();
  return searchableRowContent.includes(searchTerm);
};

const statusFilterFn: FilterFn<Client> = (
  row,
  columnId,
  filterValue: string[]
) => {
  if (!filterValue?.length) return true;
  const status = row.getValue(columnId) as string;
  return filterValue.includes(status);
};

export default function ClientsTable() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthManager();

  const columns: ColumnDef<Client>[] = [
    {
      id: "select",
      header: ({ table }) => {
        const isAllSelected = table.getIsAllPageRowsSelected();
        const isSomeSelected = table.getIsSomePageRowsSelected();

        return (
          <Checkbox
            checked={
              isAllSelected ? true : isSomeSelected ? "indeterminate" : false
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        );
      },
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
    },
    {
      header: t("name"),
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={row.original.image}
              alt={row.original.name}
              className="non-invertable"
            />
            <AvatarFallback className="bg-[#1a1a1a] text-gray-300">
              {row.original.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-white">{row.getValue("name")}</div>
            <div className="text-gray-400 text-sm sm:hidden">
              {row.original.email}
            </div>
          </div>
        </div>
      ),
      size: 250,
      filterFn: multiColumnFilterFn,
      enableHiding: false,
    },
    {
      header: t("email"),
      accessorKey: "email",
      cell: ({ row }) => (
        <div className="text-gray-300">{row.getValue("email")}</div>
      ),
      size: 220,
      meta: {
        className: "hidden sm:table-cell",
      },
    },
    {
      header: t("phone"),
      accessorKey: "phone",
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string;
        const displayValue = phone === "No phone provided" ? t("no_phone_provided") : phone;
        return <div className="text-gray-300">{displayValue}</div>;
      },
      size: 150,
      meta: {
        className: "hidden sm:table-cell",
      },
    },
    {
      header: t("status"),
      accessorKey: "status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            className={cn(
              "text-xs",
              status === "Active" &&
                "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20",
              status === "Inactive" &&
                "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/20",
              status === "Pending" &&
                "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20"
            )}
          >
            {t(status)}
          </Badge>
        );
      },
      size: 100,
      filterFn: statusFilterFn,
      meta: {
        className: "hidden sm:table-cell",
      },
    },
    {
      header: t("join_date"),
      accessorKey: "joinDate",
      cell: ({ row }) => (
        <div className="text-gray-300">{row.getValue("joinDate")}</div>
      ),
      size: 120,
      meta: {
        className: "hidden lg:table-cell",
      },
    },
    {
      header: t("last_session"),
      accessorKey: "lastSession",
      cell: ({ row }) => {
        const lastSession = row.getValue("lastSession") as string;
        const displayValue = lastSession === "N/A" ? t("n_a") : lastSession;
        return <div className="text-gray-300">{displayValue}</div>;
      },
      size: 120,
      meta: {
        className: "hidden xl:table-cell",
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">{t("actions")}</span>,
      cell: ({ row }) => (
        <RowActions
          row={row}
          onEditClick={(client) => {
            setSelectedClient(client);
            setEditDialogOpen(true);
          }}
          onViewSessions={(client) => handleViewSessions(client)}
          onScheduleSession={(client) => handleScheduleSession(client)}
          onSendMessage={(client) => handleSendMessage(client)}
          onDeleteClient={(client) => {
            setClientToDelete(client);
            setDeleteDialogOpen(true);
          }}
        />
      ),
      size: 60,
      enableHiding: false,
    },
  ];
  const id = useId();
  const isMobile = useIsMobile();
  const [columnFilters, setColumnFilters] = useOptimizedState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useOptimizedState<VisibilityState>({});
  const [editDialogOpen, setEditDialogOpen] = useOptimizedState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useOptimizedState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useOptimizedState(false);
  const [selectedClient, setSelectedClient] = useOptimizedState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useOptimizedState<Client | null>(null);
  const [pagination, setPagination] = useOptimizedState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const [sorting, setSorting] = useOptimizedState<SortingState>([
    {
      id: "name",
      desc: false,
    },
  ]);

  // Use optimized hooks for data fetching
  const {
    data: clients = [],
    isLoading,
    error,
    refetch
  } = useTherapistClients();
  
  const disconnectClientMutation = useDisconnectClient();
  const updateClientMutation = useUpdateClientProfile();

  const deleteClientsMutation = useMutation({
    mutationFn: async (clientIds: string[]) => {
      return Promise.all(
        clientIds.map(clientId => 
          disconnectClientMutation.mutateAsync(clientId)
        )
      );
    },
    onSuccess: () => {
      toast.success("Clients disconnected successfully");
      table.resetRowSelection();
    },
    onError: (error) => {
      console.error('Delete clients error:', error);
      toast.error("Failed to disconnect clients");
    }
  });

  const handleDeleteRows = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const clientIds = selectedRows.map((row) => row.original.id);
    deleteClientsMutation.mutate(clientIds);
  };

  const handleDeleteSingleClient = () => {
    if (clientToDelete) {
      deleteClientsMutation.mutate([clientToDelete.id]);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  const handleEditClient = (updatedClient: Client) => {
    console.log("Updating client:", updatedClient);
    updateClientMutation.mutate({
      clientId: updatedClient.id,
      updates: {
        first_name: updatedClient.firstName,
        last_name: updatedClient.lastName,
        email: updatedClient.email,
        phone: updatedClient.phone,
      }
    });
  };

  const handleViewSessions = (client: Client) => {
    // Navigate to sessions page with client filter
    navigate(
      `/dashboard/therapist/sessions?clientId=${
        client.id
      }&clientName=${encodeURIComponent(client.name)}`
    );
  };

  const handleScheduleSession = (client: Client) => {
    setSelectedClient(client);
    setScheduleDialogOpen(true);
  };

  const handleSendMessage = (client: Client) => {
    // Navigate to messages page with client preselected
    navigate(
      `/dashboard/therapist/messages?clientId=${
        client.id
      }&clientName=${encodeURIComponent(client.name)}`
    );
  };

  const handleSessionSchedule = async (sessionData: Omit<Session, "id">) => {
    try {
      console.log("Session scheduled:", sessionData);
      
      // Import the session service
      const { SessionService } = await import("@/services/api");
      
      // Create the session
      const createdSession = await SessionService.createSession(sessionData);
      
      if (createdSession) {
        toast.success("Session scheduled successfully!");
        console.log("✅ Session created successfully:", createdSession);
        
        // Invalidate sessions query to refresh the Sessions page
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
        queryClient.invalidateQueries({ queryKey: ['therapist-clients'] });
      } else {
        throw new Error("Failed to create session");
      }
    } catch (error) {
      console.error("❌ Error creating session:", error);
      toast.error("Failed to schedule session. Please try again.");
    } finally {
      setScheduleDialogOpen(false);
      setSelectedClient(null);
    }
  };

  const table = useReactTable({
    data: clients,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    state: {
      sorting,
      pagination,
      columnFilters,
      columnVisibility,
    },
  });

  // Get unique status values
  const uniqueStatusValues = useOptimizedMemo(() => {
    const statusColumn = table.getColumn("status");
    if (!statusColumn) return [];
    const values = Array.from(statusColumn.getFacetedUniqueValues().keys());
    return values.sort();
  }, [table.getColumn("status")?.getFacetedUniqueValues()]);

  // Get counts for each status
  const statusCounts = useOptimizedMemo(() => {
    const statusColumn = table.getColumn("status");
    if (!statusColumn) return new Map();
    return statusColumn.getFacetedUniqueValues();
  }, [table.getColumn("status")?.getFacetedUniqueValues()]);

  const selectedStatuses = useOptimizedMemo(() => {
    const filterValue = table.getColumn("status")?.getFilterValue() as string[];
    return filterValue ?? [];
  }, [table.getColumn("status")?.getFilterValue()]);

  const handleStatusChange = (checked: boolean, value: string) => {
    const filterValue = table.getColumn("status")?.getFilterValue() as string[];
    const newFilterValue = filterValue ? [...filterValue] : [];

    if (checked) {
      newFilterValue.push(value);
    } else {
      const index = newFilterValue.indexOf(value);
      if (index > -1) {
        newFilterValue.splice(index, 1);
      }
    }

    table
      .getColumn("status")
      ?.setFilterValue(newFilterValue.length ? newFilterValue : undefined);
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">Error loading clients: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filter by name or email */}
          <div className="relative">
            <Input
              id={`${id}-input`}
              ref={inputRef}
              className={cn(
                "peer w-full sm:min-w-60 ps-9 bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400",
                Boolean(table.getColumn("name")?.getFilterValue()) && "pe-9"
              )}
              value={
                (table.getColumn("name")?.getFilterValue() ?? "") as string
              }
              onChange={(e) =>
                table.getColumn("name")?.setFilterValue(e.target.value)
              }
              placeholder={t("search_clients")}
              type="text"
              aria-label="Filter by name or email"
            />
            <div className="text-gray-500 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
              <ListFilterIcon size={16} aria-hidden="true" />
            </div>
            {Boolean(table.getColumn("name")?.getFilterValue()) && (
              <button
                className="text-gray-500 hover:text-white focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Clear filter"
                onClick={() => {
                  table.getColumn("name")?.setFilterValue("");
                  if (inputRef.current) {
                    inputRef.current.focus();
                  }
                }}
              >
                <CircleXIcon size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          {/* Filter by status - Hide on mobile */}
          {!isMobile && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
                >
                  <FilterIcon
                    className="-ms-1 opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                  {t("status")}
                  {selectedStatuses.length > 0 && (
                    <span className="bg-[#0a0a0a] text-gray-400 -me-1 inline-flex h-5 max-h-full items-center rounded border border-[#333] px-1 font-[inherit] text-[0.625rem] font-medium">
                      {selectedStatuses.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto min-w-36 p-3 bg-[#111111] border-[#1f1f23]"
                align="start"
              >
                <div className="space-y-3">
                  <div className="text-gray-400 text-xs font-medium">
                    Filters
                  </div>
                  <div className="space-y-3">
                    {uniqueStatusValues.map((value, i) => (
                      <div key={value} className="flex items-center gap-2">
                        <Checkbox
                          id={`${id}-${i}`}
                          checked={selectedStatuses.includes(value)}
                          onCheckedChange={(checked: boolean) =>
                            handleStatusChange(checked, value)
                          }
                        />
                        <Label
                          htmlFor={`${id}-${i}`}
                          className="flex grow justify-between gap-2 font-normal text-gray-300"
                        >
                          {t(value)}{" "}
                          <span className="text-gray-400 ms-2 text-xs">
                            {statusCounts.get(value)}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
          {/* Toggle columns visibility - Hide on mobile */}
          {!isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
                >
                  <Columns3Icon
                    className="-ms-1 opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                  {t("view")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-[#111111] border-[#1f1f23]"
              >
                <DropdownMenuLabel className="text-gray-300">
                  {t("toggle_columns")}
                </DropdownMenuLabel>
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize text-gray-300 hover:bg-[#2a2a2a]"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                        onSelect={(event) => event.preventDefault()}
                      >
                        {column.columnDef.header ? 
                          (typeof column.columnDef.header === 'function' ? 
                            column.columnDef.header({} as any) : 
                            column.columnDef.header) : 
                          column.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Delete button */}
          {table.getSelectedRowModel().rows.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
                >
                  <TrashIcon
                    className="-ms-1 opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                  Delete
                  <span className="absolute bg-[#0a0a0a] text-gray-400 inline-flex aspect-square min-w-5 h-5 items-center justify-center rounded-full border border-[#333] px-1 text-[0.625rem] font-medium font-[inherit] mb-[2.2rem] ml-[5.5rem]">
                    {table.getSelectedRowModel().rows.length}
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#111111] border-[#1f1f23]">
                <div className="flex flex-col gap-2 max-sm:items-center sm:flex-row sm:gap-4">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                      This action cannot be undone. This will permanently
                      disconnect {table.getSelectedRowModel().rows.length}{" "}
                      selected{" "}
                      {table.getSelectedRowModel().rows.length === 1
                        ? "client"
                        : "clients"}{" "}
                      from your practice.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteRows}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Table - Mobile optimized */}
      <div className="bg-[#111111] border-[#1f1f23] overflow-hidden rounded-md border">
        <div className="overflow-x-auto">
          <Table className="table-fixed min-w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="hover:bg-transparent border-[#1f1f23]"
                >
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta as
                      | { className?: string }
                      | undefined;
                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: `${header.getSize()}px` }}
                        className={cn("h-11 text-gray-300", meta?.className)}
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <div
                            className={cn(
                              header.column.getCanSort() &&
                                "flex h-full cursor-pointer items-center justify-between gap-2 select-none"
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                            onKeyDown={(e) => {
                              if (
                                header.column.getCanSort() &&
                                (e.key === "Enter" || e.key === " ")
                              ) {
                                e.preventDefault();
                                header.column.getToggleSortingHandler()?.(e);
                              }
                            }}
                            tabIndex={
                              header.column.getCanSort() ? 0 : undefined
                            }
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {{
                              asc: (
                                <ChevronUpIcon
                                  className="shrink-0 opacity-60"
                                  size={16}
                                  aria-hidden="true"
                                />
                              ),
                              desc: (
                                <ChevronDownIcon
                                  className="shrink-0 opacity-60"
                                  size={16}
                                  aria-hidden="true"
                                />
                              ),
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, idx) => (
                  <TableRow
                    key={`skeleton-${idx}`}
                    className="border-[#1f1f23]"
                  >
                    {columns.map((col, i) => (
                      <TableCell key={i} className="py-4">
                        <Skeleton className="h-4 w-full max-w-[120px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="border-[#1f1f23] hover:bg-[#1a1a1a]"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as
                        | { className?: string }
                        | undefined;
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn("last:py-0", meta?.className)}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow className="border-[#1f1f23]">
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-gray-400"
                  >
                    No clients found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {selectedClient && (
            <EditClientDialog
              client={selectedClient}
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              onSave={(updatedClient) => {
                handleEditClient(updatedClient);
                setEditDialogOpen(false);
              }}
            />
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-4 sm:gap-8">
        {/* Results per page */}
        <div className="flex items-center gap-3">
          <Label htmlFor={id} className="max-sm:sr-only text-gray-300">
            {t("rows_per_page")}
          </Label>
          <Select
            value={table.getState().pagination.pageSize.toString()}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger
              id={id}
              className="w-fit whitespace-nowrap bg-[#0a0a0a] border-[#1f1f23] text-white"
            >
              <SelectValue placeholder={t("select_number_results")} />
            </SelectTrigger>
            <SelectContent className="bg-[#111111] border-[#1f1f23] [&_*[role=option]]:ps-2 [&_*[role=option]]:pe-8 [&_*[role=option]>span]:start-auto [&_*[role=option]>span]:end-2">
              {[5, 10, 25, 50].map((pageSize) => (
                <SelectItem
                  key={pageSize}
                  value={pageSize.toString()}
                  className="text-gray-300 hover:bg-[#2a2a2a]"
                >
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Page number information */}
        <div className="text-gray-400 flex grow justify-end text-sm whitespace-nowrap">
          <p
            className="text-gray-400 text-sm whitespace-nowrap"
            aria-live="polite"
          >
            <span className="text-white">
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}
              -
              {Math.min(
                Math.max(
                  table.getState().pagination.pageIndex *
                    table.getState().pagination.pageSize +
                    table.getState().pagination.pageSize,
                  0
                ),
                table.getRowCount()
              )}
            </span>{" "}
            {t("of")}{" "}
            <span className="text-white">{table.getRowCount().toString()}</span>
          </p>
        </div>

        {/* Pagination buttons */}
        <div>
          <Pagination>
            <PaginationContent>
              {/* First page button */}
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="disabled:pointer-events-none disabled:opacity-50 border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
                  onClick={() => table.firstPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Go to first page"
                >
                  <ChevronFirstIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
              {/* Previous page button */}
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="disabled:pointer-events-none disabled:opacity-50 border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Go to previous page"
                >
                  <ChevronLeftIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
              {/* Next page button */}
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="disabled:pointer-events-none disabled:opacity-50 border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Go to next page"
                >
                  <ChevronRightIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
              {/* Last page button */}
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="disabled:pointer-events-none disabled:opacity-50 border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
                  onClick={() => table.lastPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Go to last page"
                >
                  <ChevronLastIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      {/* Schedule Session Dialog */}
      {selectedClient && (
        <ScheduleSessionDialog
          isOpen={scheduleDialogOpen}
          onClose={() => {
            setScheduleDialogOpen(false);
            setSelectedClient(null);
          }}
          onSchedule={handleSessionSchedule}
          preselectedClient={selectedClient}
          userType="therapist"
        />
      )}

      {/* Single Client Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#111111] border-[#1f1f23]">
          <div className="flex flex-col gap-2 max-sm:items-center sm:flex-row sm:gap-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">
                Disconnect Client
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Are you sure you want to disconnect {clientToDelete?.name}? This
                will remove them from your client list but won't delete their
                account.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSingleClient}
              className="bg-red-600 hover:bg-red-700"
            >
              Disconnect Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RowActions({
  row,
  onEditClick,
  onViewSessions,
  onScheduleSession,
  onSendMessage,
  onDeleteClient,
}: {
  row: Row<Client>;
  onEditClick: (client: Client) => void;
  onViewSessions: (client: Client) => void;
  onScheduleSession: (client: Client) => void;
  onSendMessage: (client: Client) => void;
  onDeleteClient: (client: Client) => void;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex justify-end">
          <Button
            size="icon"
            variant="ghost"
            className="shadow-none text-gray-400 hover:text-white hover:bg-[#2a2a2a] h-8 w-8"
            aria-label="Client actions"
          >
            <EllipsisIcon size={16} aria-hidden="true" />
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-[#111111] border-[#1f1f23]"
      >
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="text-gray-300 hover:bg-[#2a2a2a] hover:text-white cursor-pointer"
            onSelect={() => onEditClick(row.original)}
          >
            <span>{t('edit_client')}</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="text-gray-300 hover:bg-[#2a2a2a] hover:text-white cursor-pointer"
            onSelect={() => onViewSessions(row.original)}
          >
            <span>{t('view_sessions')}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-[#333]" />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="text-gray-300 hover:bg-[#2a2a2a] hover:text-white cursor-pointer"
            onSelect={() => onScheduleSession(row.original)}
          >
            <span>{t('schedule_session')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-gray-300 hover:bg-[#2a2a2a] hover:text-white cursor-pointer"
            onSelect={() => onSendMessage(row.original)}
          >
            <span>{t('send_message')}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-[#333]" />
        <DropdownMenuItem
          className="text-red-400 focus:text-red-500 cursor-pointer"
          onSelect={() => onDeleteClient(row.original)}
        >
          <span>{t('disconnect_client')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
