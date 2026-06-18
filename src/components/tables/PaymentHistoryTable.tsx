import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Eye,
  MoreHorizontal,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  SquareLibrary,
  Clock,
  CreditCard,
  Ban,
  WalletCards,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import InvoiceViewDialog from "@/components/dialogs/InvoiceViewDialog";
import TasksPagination from "@/components/TasksPagination";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { useTranslation } from "react-i18next";

interface Payment {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  dueDate: string;
  paidDate?: string;
  method: "bank_transfer" | "credit_card" | "cash";
}

interface PaymentHistoryTableProps {
  userType: "therapist" | "client";
}

type SortField =
  | "invoiceNumber"
  | "clientName"
  | "amount"
  | "status"
  | "dueDate"
  | "method";
type SortDirection = "asc" | "desc";

const ITEMS_PER_PAGE = 10;

const mockPayments: Payment[] = [
  {
    id: "1",
    invoiceNumber: "INV-1001",
    clientName: "John Smith",
    amount: 120,
    status: "paid",
    dueDate: "2024-12-15",
    paidDate: "2024-12-14",
    method: "bank_transfer",
  },
  {
    id: "2",
    invoiceNumber: "INV-1002",
    clientName: "Sarah Johnson",
    amount: 150,
    status: "pending",
    dueDate: "2024-12-20",
    method: "bank_transfer",
  },
  {
    id: "3",
    invoiceNumber: "INV-1003",
    clientName: "Mike Davis",
    amount: 120,
    status: "overdue",
    dueDate: "2024-12-10",
    method: "bank_transfer",
  },
  {
    id: "4",
    invoiceNumber: "INV-1004",
    clientName: "Emily Wilson",
    amount: 180,
    status: "paid",
    dueDate: "2024-12-18",
    paidDate: "2024-12-17",
    method: "credit_card",
  },
  {
    id: "5",
    invoiceNumber: "INV-1005",
    clientName: "David Brown",
    amount: 135,
    status: "pending",
    dueDate: "2024-12-25",
    method: "cash",
  },
  // Add more mock data for pagination testing
  {
    id: "6",
    invoiceNumber: "INV-1006",
    clientName: "Lisa Martinez",
    amount: 145,
    status: "paid",
    dueDate: "2024-12-12",
    paidDate: "2024-12-11",
    method: "credit_card",
  },
  {
    id: "7",
    invoiceNumber: "INV-1007",
    clientName: "Tom Wilson",
    amount: 160,
    status: "overdue",
    dueDate: "2024-12-08",
    method: "bank_transfer",
  },
  {
    id: "8",
    invoiceNumber: "INV-1008",
    clientName: "Anna Garcia",
    amount: 125,
    status: "pending",
    dueDate: "2024-12-22",
    method: "cash",
  },
  {
    id: "9",
    invoiceNumber: "INV-1009",
    clientName: "Robert Taylor",
    amount: 175,
    status: "paid",
    dueDate: "2024-12-16",
    paidDate: "2024-12-15",
    method: "bank_transfer",
  },
  {
    id: "10",
    invoiceNumber: "INV-1010",
    clientName: "Jessica Lee",
    amount: 140,
    status: "pending",
    dueDate: "2024-12-28",
    method: "credit_card",
  },
  {
    id: "11",
    invoiceNumber: "INV-1011",
    clientName: "Michael Brown",
    amount: 155,
    status: "overdue",
    dueDate: "2024-12-05",
    method: "bank_transfer",
  },
  {
    id: "12",
    invoiceNumber: "INV-1012",
    clientName: "Sarah Davis",
    amount: 130,
    status: "paid",
    dueDate: "2024-12-13",
    paidDate: "2024-12-12",
    method: "cash",
  },
];

const getStatusColor = (status: Payment["status"]) => {
  switch (status) {
    case "paid":
      return "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20";
    case "pending":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20";
    case "overdue":
      return "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/20";
    default:
      return "bg-gray-600";
  }
};

export default function PaymentHistoryTable({
  userType,
}: PaymentHistoryTableProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    status: "all",
    method: "all",
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilters({
      status: "all",
      method: "all",
    });
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 text-foreground ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 text-foreground ml-1" />
    );
  };

  const filteredAndSortedPayments = mockPayments
    .filter((payment) => {
      const matchesSearch =
        payment.invoiceNumber
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        payment.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.amount.toString().includes(searchQuery);

      const matchesStatus =
        filters.status === "all" || payment.status === filters.status;
      const matchesMethod =
        filters.method === "all" || payment.method === filters.method;

      return matchesSearch && matchesStatus && matchesMethod;
    })
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle special cases for sorting
      if (sortField === "amount") {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else if (sortField === "dueDate") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Pagination calculations
  const totalPages = Math.ceil(
    filteredAndSortedPayments.length / ITEMS_PER_PAGE
  );
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPayments = filteredAndSortedPayments.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const hasActiveFilters =
    searchQuery !== "" ||
    Object.values(filters).some((filter) => filter !== "all");

  const handleDownloadInvoice = (invoiceNumber: string) => {
    console.log(`Downloading invoice ${invoiceNumber}`);
  };

  const handleViewInvoice = (invoiceNumber: string) => {
    console.log(`Opening invoice view for ${invoiceNumber}`);
    setSelectedInvoice(invoiceNumber);
  };

  const handleCloseInvoiceDialog = () => {
    console.log("Closing invoice dialog");
    setSelectedInvoice(null);
  };

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <TableHead className="text-muted-foreground">
      <Button
        variant="ghost"
        className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground flex items-center hover:bg-transparent"
        onClick={() => handleSort(field)}
      >
        {children}
        {getSortIcon(field)}
      </Button>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      {/* Compact Stats Bar */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center gap-8 w-full ${
                isMobile ? "flex-wrap gap-4 justify-center" : "justify-evenly"
              }`}
            >
              <div className="flex items-center gap-2">
                <WalletCards className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("total")}:</span>
                <span className="font-semibold text-foreground">
                  {filteredAndSortedPayments.length}
                </span>
              </div>
              <div className="w-px h-4 bg-border mx-2" />
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("paid")}:</span>
                <span className="font-semibold text-foreground">
                  {
                    filteredAndSortedPayments.filter((p) => p.status === "paid")
                      .length
                  }
                </span>
              </div>
              {!isMobile && (
                <>
                  <div className="w-px h-4 bg-border mx-2" />
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t("pending")}:</span>
                    <span className="font-semibold text-foreground">
                      {
                        filteredAndSortedPayments.filter(
                          (p) => p.status === "pending"
                        ).length
                      }
                    </span>
                  </div>
                </>
              )}
              {!isMobile && (
                <>
                  <div className="w-px h-4 bg-border mx-2" />
                  <div className="flex items-center gap-2">
                    <Ban className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t("overdue")}:</span>
                    <span className="font-semibold text-foreground">
                      {
                        filteredAndSortedPayments.filter(
                          (p) => p.status === "overdue"
                        ).length
                      }
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div
        className={`flex items-center gap-4 ${
          isMobile ? "flex-col" : "flex-wrap"
        }`}
      >
        <div className={`relative ${isMobile ? "w-full" : "flex-1 min-w-64"}`}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={
              userType === "client"
                ? t("search_your_payments")
                : t("search_by_invoice")
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className={`flex gap-4 ${isMobile ? "w-full" : ""}`}>
          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange("status", value)}
          >
            <SelectTrigger
              className={`${
                isMobile ? "flex-1" : "w-36"
              } bg-background border-border text-foreground`}
            >
              <SelectValue placeholder={t("status")} />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem
                value="all"
                className="text-muted-foreground hover:!text-accent-foreground data-[state=checked]:text-foreground data-[highlighted]:!text-accent-foreground"
              >
                {t("all_status")}
              </SelectItem>
              <SelectItem
                value="paid"
                className="text-muted-foreground hover:!text-accent-foreground data-[state=checked]:text-foreground data-[highlighted]:!text-accent-foreground"
              >
                {t("paid")}
              </SelectItem>
              <SelectItem
                value="pending"
                className="text-muted-foreground hover:!text-accent-foreground data-[state=checked]:text-foreground data-[highlighted]:!text-accent-foreground"
              >
                {t("pending")}
              </SelectItem>
              <SelectItem
                value="overdue"
                className="text-muted-foreground hover:!text-accent-foreground data-[state=checked]:text-foreground data-[highlighted]:!text-accent-foreground"
              >
                {t("overdue")}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.method}
            onValueChange={(value) => handleFilterChange("method", value)}
          >
            <SelectTrigger
              className={`${
                isMobile ? "flex-1" : "w-36"
              } bg-background border-border text-foreground`}
            >
              <SelectValue placeholder={t("method")} />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem
                value="all"
                className="text-muted-foreground hover:!text-accent-foreground data-[state=checked]:text-foreground data-[highlighted]:!text-accent-foreground"
              >
                {t("all_methods")}
              </SelectItem>
              <SelectItem
                value="bank_transfer"
                className="text-muted-foreground hover:!text-accent-foreground data-[state=checked]:text-foreground data-[highlighted]:!text-accent-foreground"
              >
                {t("bank_transfer")}
              </SelectItem>
              <SelectItem
                value="credit_card"
                className="text-muted-foreground hover:!text-accent-foreground data-[state=checked]:text-foreground data-[highlighted]:!text-accent-foreground"
              >
                {t("credit_card")}
              </SelectItem>
              <SelectItem
                value="cash"
                className="text-muted-foreground hover:!text-accent-foreground data-[state=checked]:text-foreground data-[highlighted]:!text-accent-foreground"
              >
                {t("cash")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className={`bg-primary hover:bg-primary/90 text-primary-foreground border border-primary ${
              isMobile ? "w-full" : ""
            }`}
          >
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Payments Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">
            {userType === "therapist" ? "Payment History" : "Your Payments"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredAndSortedPayments.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {hasActiveFilters
                  ? "No payments match your search"
                  : "No payments yet"}
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                {hasActiveFilters
                  ? "Try adjusting your search or filters to see more results"
                  : userType === "therapist"
                  ? "Payment records will appear here once you start receiving payments"
                  : "Your payment history will appear here"}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary"
                >
                  Clear Search & Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    {!isMobile && (
                      <SortableHeader field="invoiceNumber">
                        Invoice
                      </SortableHeader>
                    )}
                    {userType === "therapist" && !isMobile && (
                      <SortableHeader field="clientName">{t('client')}</SortableHeader>
                    )}
                    {!isMobile && (
                      <SortableHeader field="amount">{t('amount')}</SortableHeader>
                    )}
                    {isMobile && (
                      <TableHead className="text-muted-foreground">{t('invoice')}</TableHead>
                    )}
                    {isMobile && (
                      <TableHead className="text-muted-foreground">{t('amount')}</TableHead>
                    )}
                    {!isMobile && (
                      <SortableHeader field="status">{t('status')}</SortableHeader>
                    )}
                    {!isMobile && (
                      <SortableHeader field="dueDate">{t('due_date')}</SortableHeader>
                    )}
                    {!isMobile && (
                      <SortableHeader field="method">{t('method')}</SortableHeader>
                    )}
                    {!isMobile && (
                      <TableHead className="text-muted-foreground w-12">
                        Actions
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPayments.map((payment) => (
                    <TableRow
                      key={payment.id}
                      className={`border-border transition-colors ${
                        isMobile ? "" : "hover:bg-muted"
                      }`}
                    >
                      {!isMobile && (
                        <TableCell className="text-foreground font-medium">
                          {payment.invoiceNumber}
                        </TableCell>
                      )}
                      {userType === "therapist" && !isMobile && (
                        <TableCell className="text-muted-foreground">
                          {payment.clientName}
                        </TableCell>
                      )}
                      {isMobile && (
                        <>
                          <TableCell className="text-muted-foreground">
                            <div className="space-y-1">
                              <div className="font-medium text-foreground">
                                {payment.invoiceNumber}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {payment.clientName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <div className="space-y-2">
                              <div className="text-foreground font-medium">
                                ${payment.amount.toFixed(2)}
                              </div>
                              <div className="flex items-center justify-between">
                                <Badge
                                  className={`${getStatusColor(
                                    payment.status
                                  )} text-xs `}
                                >
                                  {payment.status.charAt(0).toUpperCase() +
                                    payment.status.slice(1)}
                                </Badge>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="bg-card border-border"
                                  >
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleViewInvoice(payment.invoiceNumber)
                                      }
                                      className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Invoice
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleDownloadInvoice(
                                          payment.invoiceNumber
                                        )
                                      }
                                      className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Download
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </TableCell>
                        </>
                      )}
                      {!isMobile && (
                        <>
                          <TableCell className="text-muted-foreground">
                            ${payment.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${getStatusColor(
                                payment.status
                              )} hover:bg-inherit hover:text-inherit pointer-events-none`}
                            >
                              {payment.status.charAt(0).toUpperCase() +
                                payment.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {payment.dueDate}
                            {payment.paidDate && (
                              <div className="text-xs text-green-500/70">
                                Paid: {payment.paidDate}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground capitalize">
                            {payment.method.replace("_", " ")}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="bg-card border-border"
                              >
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleViewInvoice(payment.invoiceNumber)
                                  }
                                  className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Invoice
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDownloadInvoice(payment.invoiceNumber)
                                  }
                                  className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center">
          <TasksPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Invoice View Dialog */}
      <InvoiceViewDialog
        isOpen={!!selectedInvoice}
        onClose={handleCloseInvoiceDialog}
        invoiceNumber={selectedInvoice || ""}
      />
    </div>
  );
}
