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
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <ReceiptEuro />
            {t("billing_information")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
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
                className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
              />

              <OptionalInput
                label={t("tax_vat_id")}
                value={settings.taxId}
                onChange={(e) => handleInputChange("taxId", e.target.value)}
                placeholder="123456789"
                className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
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
                className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
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
                className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
              />
            </div>

            {/* Banking Information */}
            <Card className="bg-background border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-foreground text-lg">
                  {t("banking_information")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      {t("bank_name")}{" "}
                      <span className="text-destructive">&nbsp;*</span>
                    </Label>
                    <Select
                      value={settings.bankName}
                      onValueChange={(val) =>
                        handleInputChange("bankName", val)
                      }
                    >
                      <SelectTrigger className="w-full bg-background border-border text-foreground">
                        <SelectValue placeholder={t("choose_a_bank")} />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {belgianBanks.map((bank) => (
                          <SelectItem
                            key={bank}
                            value={bank}
                            className="text-muted-foreground hover:!text-neutral-950 data-[state=checked]:text-neutral-50 data-[highlighted]:!text-neutral-950"
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
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <RequiredInput
                    label={t("iban")}
                    value={settings.iban}
                    onChange={(e) => handleInputChange("iban", e.target.value)}
                    placeholder="US64 SVBK US6S 3300 0000 0000 0000 00"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
                  />
                  <OptionalInput
                    label={t("swift_bic_code")}
                    value={settings.swiftCode}
                    onChange={(e) =>
                      handleInputChange("swiftCode", e.target.value)
                    }
                    placeholder="CHASUS33"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="bg-background hover:bg-muted text-foreground border border-border hover:text-muted-foreground"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={saveSettings}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-auto"
            >
              {t("save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
