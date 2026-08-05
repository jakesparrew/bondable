import { useOptimizedState, useOptimizedEffect } from "@/hooks/performance/useOptimizedComponents";
import console from "@/lib/production-console";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, User, Calendar, Clock, CreditCard, Building, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

interface InvoiceViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceNumber: string;
}

// Mock invoice data - in a real app this would come from your database
const mockInvoiceData = {
  "INV-1001": {
    invoiceNumber: "INV-1001",
    clientName: "John Smith",
    clientEmail: "john.smith@email.com",
    issueDate: "2024-12-01",
    dueDate: "2024-12-15",
    serviceDescription: "Therapy Session",
    serviceDate: "2024-12-01",
    duration: "01:00",
    amount: 120,
    status: "paid",
    method: "bank_transfer"
  },
  "INV-1002": {
    invoiceNumber: "INV-1002",
    clientName: "Sarah Johnson",
    clientEmail: "sarah.johnson@email.com",
    issueDate: "2024-12-05",
    dueDate: "2024-12-20",
    serviceDescription: "Therapy Session",
    serviceDate: "2024-12-05",
    duration: "01:00",
    amount: 150,
    status: "pending",
    method: "bank_transfer"
  },
  "INV-1003": {
    invoiceNumber: "INV-1003",
    clientName: "Mike Davis",
    clientEmail: "mike.davis@email.com",
    issueDate: "2024-11-25",
    dueDate: "2024-12-10",
    serviceDescription: "Therapy Session",
    serviceDate: "2024-11-25",
    duration: "01:00",
    amount: 120,
    status: "overdue",
    method: "bank_transfer"
  },
  "INV-1004": {
    invoiceNumber: "INV-1004",
    clientName: "Emily Wilson",
    clientEmail: "emily.wilson@email.com",
    issueDate: "2024-12-03",
    dueDate: "2024-12-18",
    serviceDescription: "Therapy Session",
    serviceDate: "2024-12-03",
    duration: "01:00",
    amount: 180,
    status: "paid",
    method: "credit_card"
  },
  "INV-1005": {
    invoiceNumber: "INV-1005",
    clientName: "David Brown",
    clientEmail: "david.brown@email.com",
    issueDate: "2024-12-10",
    dueDate: "2024-12-25",
    serviceDescription: "Therapy Session",
    serviceDate: "2024-12-10",
    duration: "01:00",
    amount: 135,
    status: "pending",
    method: "cash"
  },
  "INV-1006": {
    invoiceNumber: "INV-1006",
    clientName: "Lisa Martinez",
    clientEmail: "lisa.martinez@email.com",
    issueDate: "2024-12-11",
    dueDate: "2024-12-26",
    serviceDescription: "Therapy Session",
    serviceDate: "2024-12-11",
    duration: "01:00",
    amount: 145,
    status: "paid",
    method: "credit_card"
  },
  "INV-1007": {
    invoiceNumber: "INV-1007",
    clientName: "Tom Wilson",
    clientEmail: "tom.wilson@email.com",
    issueDate: "2024-11-28",
    dueDate: "2024-12-13",
    serviceDescription: "Therapy Session",
    serviceDate: "2024-11-28",
    duration: "01:00",
    amount: 160,
    status: "overdue",
    method: "bank_transfer"
  },
  "INV-1008": {
    invoiceNumber: "INV-1008",
    clientName: "Anna Garcia",
    clientEmail: "anna.garcia@email.com",
    issueDate: "2024-12-08",
    dueDate: "2024-12-23",
    serviceDescription: "Therapy Session",
    serviceDate: "2024-12-08",
    duration: "01:00",
    amount: 125,
    status: "pending",
    method: "cash"
  },
  "INV-1009": {
    invoiceNumber: "INV-1009",
    clientName: "Robert Taylor",
    clientEmail: "robert.taylor@email.com",
    issueDate: "2024-12-01",
    dueDate: "2024-12-16",
    serviceDescription: "Therapy Session",
    serviceDate: "2024-12-01",
    duration: "01:00",
    amount: 175,
    status: "paid",
    method: "bank_transfer"
  },
  "INV-1010": {
    invoiceNumber: "INV-1010",
    clientName: "Jessica Lee",
    clientEmail: "jessica.lee@email.com",
    issueDate: "2024-12-13",
    dueDate: "2024-12-28",
    serviceDescription: "Therapy Session",
    serviceDate: "2024-12-13",
    duration: "01:00",
    amount: 140,
    status: "pending",
    method: "credit_card"
  },
  "INV-1011": {
    invoiceNumber: "INV-1011",
    clientName: "Michael Brown",
    clientEmail: "michael.brown@email.com",
    issueDate: "2024-11-20",
    dueDate: "2024-12-05",
    serviceDescription: "Therapy Session",
    serviceDate: "2024-11-20",
    duration: "01:00",
    amount: 155,
    status: "overdue",
    method: "bank_transfer"
  },
  "INV-1012": {
    invoiceNumber: "INV-1012",
    clientName: "Sarah Davis",
    clientEmail: "sarah.davis@email.com",
    issueDate: "2024-11-28",
    dueDate: "2024-12-13",
    serviceDescription: "Therapy Session",
    serviceDate: "2024-11-28",
    duration: "01:00",
    amount: 130,
    status: "paid",
    method: "cash"
  }
};

type StatusVariant = "success" | "warning" | "info" | "destructive" | "secondary";

/** Invoice status -> semantic Badge variant (was an illegible dark palette). */
const invoiceStatusVariant = (status: string): StatusVariant => {
  switch (status) {
    case "paid":
      return "success";
    case "pending":
      return "warning";
    case "overdue":
      return "destructive";
    default:
      return "secondary";
  }
};

const getPaymentMethodIcon = (method: string) => {
  switch (method) {
    case "credit_card":
      return <CreditCard className="h-4 w-4" />;
    case "bank_transfer":
      return <Building className="h-4 w-4" />;
    case "cash":
      return <FileText className="h-4 w-4" />;
    default:
      return <CreditCard className="h-4 w-4" />;
  }
};

export default function InvoiceViewDialog({ isOpen, onClose, invoiceNumber }: InvoiceViewDialogProps) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useOptimizedState(false);

  console.log("InvoiceViewDialog rendered:", { isOpen, invoiceNumber });

  const invoice = mockInvoiceData[invoiceNumber as keyof typeof mockInvoiceData];

  console.log("Invoice data found:", invoice);

  // Sync internal state with external prop
  useOptimizedEffect(() => {
    setInternalOpen(isOpen);
  }, [isOpen]);

  const handleClose = () => {
    console.log("Dialog closing");
    setInternalOpen(false);
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    console.log("Dialog open change:", open);
    setInternalOpen(open);
    if (!open) {
      onClose();
    }
  };

  const handleDownload = () => {
    console.log(`Downloading invoice ${invoiceNumber}`);
    // In a real app, this would generate and download the PDF
  };

  return (
    <Dialog open={internalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice {invoiceNumber}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            View detailed invoice information and download PDF
          </DialogDescription>
        </DialogHeader>

        {!invoice ? (
          <div className="py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground mb-2">{t("invoice_not_found")}</p>
            <p className="text-muted-foreground text-sm">{t("unable_to_load_invoice", { invoiceNumber })}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Compact Header with Key Info */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-card rounded-lg flex items-center justify-center">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-foreground font-semibold text-lg">{invoice.invoiceNumber}</h3>
                      <p className="text-muted-foreground text-sm">{invoice.serviceDescription}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-foreground mb-1">${invoice.amount.toFixed(2)}</div>
                    <Badge variant={invoiceStatusVariant(invoice.status)}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                <div className="mb-6 h-px w-full bg-border" />

                {/* Compact Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
  {/* Client */}
  <div className="flex items-start gap-3 bg-background border border-border rounded-xl p-4 hover:border-border transition">
    <User className="h-4 w-4 text-muted-foreground mt-1" />
                     <div>
                       <p className="text-muted-foreground text-xs">{t("client")}</p>
                       <p className="text-foreground font-medium">{invoice.clientName}</p>
                     </div>
  </div>

  {/* Service Date */}
  <div className="flex items-start gap-3 bg-background border border-border rounded-xl p-4 hover:border-border transition">
    <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                     <div>
                       <p className="text-muted-foreground text-xs">{t("service_date")}</p>
                       <p className="text-foreground font-medium">{invoice.serviceDate}</p>
                     </div>
  </div>

  {/* Duration */}
  <div className="flex items-start gap-3 bg-background border border-border rounded-xl p-4 hover:border-border transition">
    <Clock className="h-4 w-4 text-muted-foreground mt-1" />
                     <div>
                       <p className="text-muted-foreground text-xs">{t("duration")}</p>
                       <p className="text-foreground font-medium">{invoice.duration}</p>
                     </div>
  </div>

  {/* Payment Method */}
  <div className="flex items-start gap-3 bg-background border border-border rounded-xl p-4 hover:border-border transition">
    <div className="h-4 w-4 text-muted-foreground mt-1">{getPaymentMethodIcon(invoice.method)}</div>
                     <div>
                       <p className="text-muted-foreground text-xs">{t("payment_method")}</p>
                       <p className="text-foreground font-medium capitalize">
                         {invoice.method.replace("_", " ")}
                       </p>
                     </div>
  </div>
</div>

              </CardContent>
            </Card>

            {/* Dates and Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                    <h4 className="text-foreground font-medium mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t("timeline")}
                    </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("issued")}:</span>
                      <span className="text-foreground">{invoice.issueDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("due")}:</span>
                      <span className="text-foreground">{invoice.dueDate}</span>
                    </div>
                    {invoice.status === "paid" && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("paid")}:</span>
                        <span className="text-success">{invoice.issueDate}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <h4 className="text-foreground font-medium mb-3 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t("contact")}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="text-foreground">{invoice.clientEmail}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="bg-card hover:bg-muted text-foreground border border-border hover:text-muted-foreground"
          >
            {t("close")}
          </Button>
          {invoice && (
            <Button
              onClick={handleDownload}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="w-4 h-4 mr-2" />
              {t("download_pdf")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
