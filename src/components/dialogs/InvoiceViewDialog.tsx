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

const getStatusColor = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "pending":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "overdue":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
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
      <DialogContent className="max-w-2xl bg-[#111111] border-[#1f1f23]">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice {invoiceNumber}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            View detailed invoice information and download PDF
          </DialogDescription>
        </DialogHeader>

        {!invoice ? (
          <div className="py-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-white mb-2">{t("invoice_not_found")}</p>
            <p className="text-gray-400 text-sm">{t("unable_to_load_invoice", { invoiceNumber })}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Compact Header with Key Info */}
            <Card className="bg-[#0a0a0a] border-[#1f1f23]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#1f1f23] rounded-lg flex items-center justify-center">
                      <FileText className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">{invoice.invoiceNumber}</h3>
                      <p className="text-gray-400 text-sm">{invoice.serviceDescription}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white mb-1">${invoice.amount.toFixed(2)}</div>
                    <Badge className={`${getStatusColor(invoice.status)} text-xs`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </Badge>
                  </div>
                </div>

                <div className="mb-6 h-px w-full bg-gradient-to-r from-transparent via-[#3f3f3f] to-transparent" />

                {/* Compact Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
  {/* Client */}
  <div className="flex items-start gap-3 bg-[#0a0a0a] border border-[#1f1f23] rounded-xl p-4 hover:border-gray-600 transition">
    <User className="h-4 w-4 text-gray-400 mt-1" />
                     <div>
                       <p className="text-gray-400 text-xs">{t("client")}</p>
                       <p className="text-white font-medium">{invoice.clientName}</p>
                     </div>
  </div>

  {/* Service Date */}
  <div className="flex items-start gap-3 bg-[#0a0a0a] border border-[#1f1f23] rounded-xl p-4 hover:border-gray-600 transition">
    <Calendar className="h-4 w-4 text-gray-400 mt-1" />
                     <div>
                       <p className="text-gray-400 text-xs">{t("service_date")}</p>
                       <p className="text-white font-medium">{invoice.serviceDate}</p>
                     </div>
  </div>

  {/* Duration */}
  <div className="flex items-start gap-3 bg-[#0a0a0a] border border-[#1f1f23] rounded-xl p-4 hover:border-gray-600 transition">
    <Clock className="h-4 w-4 text-gray-400 mt-1" />
                     <div>
                       <p className="text-gray-400 text-xs">{t("duration")}</p>
                       <p className="text-white font-medium">{invoice.duration}</p>
                     </div>
  </div>

  {/* Payment Method */}
  <div className="flex items-start gap-3 bg-[#0a0a0a] border border-[#1f1f23] rounded-xl p-4 hover:border-gray-600 transition">
    <div className="h-4 w-4 text-gray-400 mt-1">{getPaymentMethodIcon(invoice.method)}</div>
                     <div>
                       <p className="text-gray-400 text-xs">{t("payment_method")}</p>
                       <p className="text-white font-medium capitalize">
                         {invoice.method.replace("_", " ")}
                       </p>
                     </div>
  </div>
</div>

              </CardContent>
            </Card>

            {/* Dates and Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-[#0a0a0a] border-[#1f1f23]">
                <CardContent className="p-4">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t("timeline")}
                    </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t("issued")}:</span>
                      <span className="text-white">{invoice.issueDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t("due")}:</span>
                      <span className="text-white">{invoice.dueDate}</span>
                    </div>
                    {invoice.status === "paid" && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">{t("paid")}:</span>
                        <span className="text-green-500/80">{invoice.issueDate}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#0a0a0a] border-[#1f1f23]">
                <CardContent className="p-4">
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t("contact")}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-gray-400">Email</p>
                      <p className="text-white">{invoice.clientEmail}</p>
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
            className="bg-neutral-950 hover:bg-neutral-800 text-neutral-50 border border-neutral-900 hover:text-neutral-300"
          >
            {t("close")}
          </Button>
          {invoice && (
            <Button
              onClick={handleDownload}
              className="bg-neutral-50 hover:bg-neutral-300 text-neutral-950"
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
