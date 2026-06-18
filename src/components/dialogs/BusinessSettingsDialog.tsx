import { useOptimizedState } from '@/hooks/performance/useOptimizedComponents';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequiredInput } from "@/components/ui/required-input";
import { OptionalInput } from "@/components/ui/optional-input";
import { ReceiptEuro, Settings } from "lucide-react";
import { useToast } from "@/hooks/ui/use-toast";
import AddressAutoComplete, {
  AddressType,
} from "@/components/ui/address-autocomplete/index";
import { Label } from "@/components/ui/label";
import { PhoneInputComponent } from "@/components/ui/phone-input";
import { EmailInput } from "@/components/ui/email-input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

interface BusinessSettings {
  businessName: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
  bankName: string;
  accountName: string;
  iban: string;
  swiftCode: string;
}

const belgianBanks = [
  "KBC Bank",
  "Belfius",
  "BNP Paribas Fortis",
  "ING Belgium",
  "Argenta",
  "Crelan",
  "AXA Bank",
  "Hello bank!",
  "vdk bank",
  "Triodos Bank",
];

export default function BusinessSettingsDialog() {
  const [isOpen, setIsOpen] = useOptimizedState(false);
  const { t } = useTranslation();
  const [settings, setSettings] = useOptimizedState<BusinessSettings>({
    businessName: "Bondable Therapy Services",
    taxId: "",
    address: "",
    phone: "",
    email: "",
    bankName: "",
    accountName: "",
    iban: "",
    swiftCode: "",
  });
  const [searchInput, setSearchInput] = useOptimizedState("");
  const { toast } = useToast();
  const [address, setAddressState] = useOptimizedState<AddressType>({
    address1: "",
    address2: "",
    formattedAddress: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
    lat: 0,
    lng: 0,
  });

  const setAddress = (newAddress: AddressType) => {
    setAddressState(newAddress);
    handleInputChange("address", newAddress.formattedAddress || "");
  };

  const handleInputChange = (field: keyof BusinessSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const saveSettings = () => {
    const phoneInput = document.querySelector(
      'input[type="tel"]'
    ) as HTMLInputElement | null;

    const finalPhone = phoneInput?.value || settings.phone;
    setSettings((prev) => ({ ...prev, phone: finalPhone }));

    // Simulate a success response
    toast({
      title: t("success"),
      description: t("business_settings_updated"),
    });
    setIsOpen(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950"
          >
            <ReceiptEuro />
            {t("billing_information")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl overflow-y-auto bg-[#111111] border-[#1f1f23]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {t("billing_information")}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-[#3f3f3f] to-transparent -mb-1" />

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RequiredInput
                label={t("business_name")}
                value={settings.businessName}
                onChange={(e) =>
                  handleInputChange("businessName", e.target.value)
                }
                placeholder={t("your_therapy_practice_name")}
                className="bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
              />

              <OptionalInput
                label={t("tax_vat_id")}
                value={settings.taxId}
                onChange={(e) => handleInputChange("taxId", e.target.value)}
                placeholder="123456789"
                className="bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-300">
                {t("address")} <span className="text-red-400">*</span>
              </Label>
              <AddressAutoComplete
                address={address}
                setAddress={setAddress}
                searchInput={searchInput}
                setSearchInput={setSearchInput}
                dialogTitle="Address"
                placeholder="123 Main St, City, State, ZIP"
                showInlineError={false}
                className="bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PhoneInputComponent
                label={t("phone")}
                defaultValue={settings.phone}
              />
              <EmailInput
                label={t("email_address")}
                value={settings.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder={t("contact_yourpractice_com")}
                required
                className="bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
              />
            </div>

            {/* Banking Information */}
            <Card className="bg-[#0a0a0a] border-[#1f1f23]">
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-lg">
                  {t("banking_information")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-300">
                      {t("bank_name")}{" "}
                      <span className="text-destructive">&nbsp;*</span>
                    </Label>
                    <Select
                      value={settings.bankName}
                      onValueChange={(val) =>
                        handleInputChange("bankName", val)
                      }
                    >
                      <SelectTrigger className="w-full bg-[#1a1a1a] border-[#1f1f23] text-white">
                        <SelectValue placeholder={t("choose_a_bank")} />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111111] border-[#1f1f23]">
                        {belgianBanks.map((bank) => (
                          <SelectItem
                            key={bank}
                            value={bank}
                            className="text-neutral-400 hover:!text-neutral-950 data-[state=checked]:text-neutral-50 data-[highlighted]:!text-neutral-950"
                          >
                            {bank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <RequiredInput
                    label={t("account_name")}
                    value={settings.accountName}
                    onChange={(e) =>
                      handleInputChange("accountName", e.target.value)
                    }
                    placeholder={t("bondable_therapy_services_llc")}
                    className="bg-[#1a1a1a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <RequiredInput
                    label={t("iban")}
                    value={settings.iban}
                    onChange={(e) => handleInputChange("iban", e.target.value)}
                    placeholder="US64 SVBK US6S 3300 0000 0000 0000 00"
                    className="bg-[#1a1a1a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
                  />
                  <OptionalInput
                    label={t("swift_bic_code")}
                    value={settings.swiftCode}
                    onChange={(e) =>
                      handleInputChange("swiftCode", e.target.value)
                    }
                    placeholder="CHASUS33"
                    className="bg-[#1a1a1a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
                  />
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
              onClick={saveSettings}
              className="bg-neutral-50 hover:bg-neutral-300 text-neutral-950 h-auto"
            >
              {t("save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
