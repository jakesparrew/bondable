import { useOptimizedState, useOptimizedCallback } from '@/hooks/performance/useOptimizedComponents';
import console from "@/lib/production-console";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequiredInput } from "@/components/ui/required-input";
import { PriceInput } from "./ui/price-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Forward } from "lucide-react";
import { SimpleDatePicker } from "@/components/ui/simple-date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { TimePicker } from "./ui/time-picker";
import { useToast } from "@/hooks/ui/use-toast";
import { useTranslation } from 'react-i18next';

interface InvoiceData {
  clientId: string;
  invoiceNumber: string;
  issueDate: Date | undefined;
  dueDate: Date | undefined;
  serviceDescription: string;
  serviceDate: Date | undefined;
  duration: string;
  price: number;
  subtotal: number;
  tax: number;
  total: number;
}

// Mock client data
const mockClients = [
  { id: "1", name: "John Smith", email: "john.smith@email.com" },
  { id: "2", name: "Sarah Johnson", email: "sarah.johnson@email.com" },
  { id: "3", name: "Mike Davis", email: "mike.davis@email.com" },
  { id: "4", name: "Emily Wilson", email: "emily.wilson@email.com" },
  { id: "5", name: "David Brown", email: "david.brown@email.com" },
];

export default function InvoiceGenerator() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useOptimizedState(false);
  const { toast } = useToast();

  const [invoiceData, setInvoiceData] = useOptimizedState<InvoiceData>({
    clientId: "",
    invoiceNumber: `INV-${Date.now()}`,
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    serviceDescription: "Therapy Session",
    serviceDate: new Date(),
    duration: "01:00",
    price: 120,
    subtotal: 120,
    tax: 0,
    total: 120,
  });

  const handleInputChange = useOptimizedCallback((
    field: keyof InvoiceData,
    value: string | number | Date | undefined
  ) => {
    setInvoiceData((prev) => {
      const updated = { ...prev, [field]: value };

      if (field === "price") {
        updated.subtotal = Number(updated.price);
        updated.total = updated.subtotal + updated.tax;
      }

      return updated;
    });
  }, []);

  const handleDateChange = useOptimizedCallback((field: keyof InvoiceData, dateString: string) => {
    const date = new Date(dateString);
    handleInputChange(field, date);
  }, [handleInputChange]);

  const generateInvoice = useOptimizedCallback(() => {
    if (!invoiceData.clientId) {
      toast({
        title: t("missing_information"),
        description: t("please_select_client"),
        variant: "destructive",
      });
      return;
    }
    
    // Simulate success
    toast({
      title: t("success"),
      description: t("invoice_created_successfully", { invoiceNumber: invoiceData.invoiceNumber }),
    });
    setIsOpen(false);
  }, [invoiceData.clientId, invoiceData.invoiceNumber, toast, setIsOpen]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950">
            <Plus className="w-4 h-4 mr-2" />
            {t("generate_invoice")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl overflow-y-auto bg-[#111111] border-[#1f1f23]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {t("generate_new_invoice")}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-[#3f3f3f] to-transparent -mb-1" />

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-300">
                {t("select_client")} <span className="text-red-400">*</span>
              </Label>
              <Select
                value={invoiceData.clientId}
                onValueChange={(val) => handleInputChange("clientId", val)}
              >
                <SelectTrigger className="w-full bg-[#0a0a0a] border-[#1f1f23] text-white">
                  <SelectValue placeholder={t("choose_a_client")} />
                </SelectTrigger>
                <SelectContent className="bg-[#111111] border-[#1f1f23]">
                  {mockClients.map((client) => (
                    <SelectItem
                      key={client.id}
                      value={client.id}
                      className="text-neutral-400 hover:!text-neutral-950 data-[state=checked]:text-neutral-50 data-[highlighted]:!text-neutral-950"
                    >
                      {client.name} - {client.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full">
              <RequiredInput
                label={t("invoice_number")}
                value={invoiceData.invoiceNumber}
                onChange={() => {}}
                readOnly
                className="w-full bg-[#1a1a1a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SimpleDatePicker
                label={t("issue_date")}
                defaultValue={
                  invoiceData.issueDate?.toISOString().split("T")[0]
                }
                onChange={(dateString) =>
                  handleDateChange("issueDate", dateString)
                }
              />
              <SimpleDatePicker
                label={t("due_date")}
                defaultValue={invoiceData.dueDate?.toISOString().split("T")[0]}
                onChange={(dateString) =>
                  handleDateChange("dueDate", dateString)
                }
              />
            </div>

            <Card className="bg-[#0a0a0a] border-[#1f1f23]">
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-lg">
                  {t("service_details")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="w-full">
                  <RequiredInput
                    label={t("description")}
                    value={invoiceData.serviceDescription}
                    onChange={(e) =>
                      handleInputChange("serviceDescription", e.target.value)
                    }
                    placeholder={t("therapy_session")}
                    className="bg-[#1a1a1a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TimePicker
                    label={t("time")}
                    value={invoiceData.duration}
                    onChange={(newTime: string) =>
                      handleInputChange("duration", newTime)
                    }
                    required
                    className="bg-[#1a1a1a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
                  />
                  <PriceInput
                    price={invoiceData.price}
                    onChange={(newPrice: number) =>
                      handleInputChange("price", newPrice)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0a0a0a] border-[#1f1f23]">
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-lg">
                  {t("invoice_totals")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>{t("subtotal")}:</span>
                    <span>€{invoiceData.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>{t("tax")}:</span>
                    <span>€{invoiceData.tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-[#1f1f23] pt-2">
                    <div className="flex justify-between text-white font-semibold text-lg">
                      <span>{t("total")}:</span>
                      <span>€{invoiceData.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="bg-neutral-950 hover:bg-neutral-800 text-neutral-50 border border-neutral-900 hover:text-neutral-300"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={generateInvoice}
              className="bg-neutral-50 hover:bg-neutral-300 text-neutral-950 h-auto"
            >
              <Forward className="w-4 h-4 mr-2" />
              {t("generate_invoice")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
