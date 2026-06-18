
import { useOptimizedState } from '@/hooks/performance/useOptimizedComponents';
import console from "@/lib/production-console";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Phone } from "lucide-react";
import { useToast } from "@/hooks/ui/use-toast";
import { SimpleDatePicker } from "@/components/ui/simple-date-picker";
import { RequiredInput } from "@/components/ui/required-input";
import { PhoneInputComponent } from "@/components/ui/phone-input";
import { EmailInput } from "@/components/ui/email-input";
import AddressAutoComplete, {
  AddressType,
} from "@/components/ui/address-autocomplete/index";
import { clientService } from "@/services/api";
import { useAuthManager } from "@/hooks/api/useAuthManager";

const AddClient = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthManager();
  const [isSubmitting, setIsSubmitting] = useOptimizedState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useOptimizedState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
    emergencyRelationship: "",
    notes: "",
  });

  const [address, setAddress] = useOptimizedState<AddressType>({
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

  const [searchInput, setSearchInput] = useOptimizedState("");

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: t("error"),
        description: t("please_fill_required"),
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      console.error("No authenticated user found");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare client data for Supabase
      const clientData = {
        therapist_id: user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        status: "Active" as const,
        emergency_contact_name: formData.emergencyContact || undefined,
        emergency_contact_phone: formData.emergencyPhone || undefined,
        emergency_contact_relationship: formData.emergencyRelationship || undefined,
        notes: formData.notes || undefined,
      };

      console.log("Submitting client data:", clientData);

      // Save to database
      const newClient = await clientService.createClient(clientData);
      
      console.log("Client created successfully:", newClient);

      toast({
        title: t("success"),
        description: t("client_added_successfully", { firstName: formData.firstName, lastName: formData.lastName }),
      });

      // Navigate after a short delay to show the notification
      setTimeout(() => {
        navigate("/dashboard/therapist/clients");
      }, 2000);

    } catch (error) {
      console.error("Error creating client:", error);
      toast({
        title: t("error_adding_client"),
        description: t("error_adding_client_desc"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/dashboard/therapist/clients");
  };

  return (
    <DashboardLayout userType="therapist">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="text-[#71717a] hover:text-white hover:bg-[#1f1f23]"
            disabled={isSubmitting}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("back_to_clients")}
          </Button>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">
            {t("add_new_client")}
          </h2>
          <p className="text-gray-400 text-sm">
            {t("enter_client_info")}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-[#111111] border-[#1f1f23]">
            <CardHeader>
              <CardTitle className="text-white text-lg">
                {t("personal_information")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RequiredInput
                  label={t("first_name")}
                  placeholder={t("enter_first_name")}
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  className="bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
                />
                <RequiredInput
                  label={t("last_name")}
                  placeholder={t("enter_last_name")}
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  className="bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EmailInput
                  label={t("email")}
                  placeholder={t("enter_email_address")}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                  className="bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
                />
                <PhoneInputComponent label={t("phone")} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <SimpleDatePicker label={t("date_of_birth")} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-300">
                    {t("address")}
                  </Label>
                  <AddressAutoComplete
                    address={address}
                    setAddress={setAddress}
                    searchInput={searchInput}
                    setSearchInput={setSearchInput}
                    dialogTitle="Address"
                    placeholder="123 Main Street, City, State/Province, Postal Code, Country"
                    showInlineError={false}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-[#1f1f23]">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CardTitle className="text-white text-lg">
                  {t("emergency_contact")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RequiredInput
                  label={t("name")}
                  placeholder={t("emergency_contact_name")}
                  value={formData.emergencyContact}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      emergencyContact: e.target.value,
                    }))
                  }
                  className="bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500"
                />
                <div className="space-y-2">
                  <Label className="text-gray-300">{t("relationship")}</Label>
                  <Input
                    name="emergencyRelationship"
                    value={formData.emergencyRelationship}
                    onChange={handleInputChange}
                    placeholder={t("relationship_to_client")}
                    className="bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">{t("phone")}</Label>
                <Input
                  name="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={handleInputChange}
                  placeholder={t("emergency_contact_phone")}
                  className="bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#111111] border-[#1f1f23]">
            <CardHeader>
              <CardTitle className="text-white text-lg">
                {t("additional_notes")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-gray-300">
                  {t("notes")}
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500 min-h-[100px]"
                  placeholder={t("enter_additional_notes")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950 disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isSubmitting ? t("adding_client") : t("add_client")}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default AddClient;
