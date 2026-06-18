import { useOptimizedState } from '@/hooks/performance/useOptimizedComponents';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { User, Users } from "lucide-react";
import { useInviteCode } from "@/hooks/api/useInviteCode";
import { supabase } from "@/integrations/supabase/client";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { clientTherapistService } from "@/services/api";
import { useTranslation } from "react-i18next";

const Onboarding = () => {
  const { t } = useTranslation();
  const [step, setStep] = useOptimizedState(1);
  const [selectedRole, setSelectedRole] = useOptimizedState<
    "therapist" | "client" | null
  >(null);
  const [name, setName] = useOptimizedState("");
  const [inviteCode, setInviteCode] = useOptimizedState("");
  const [isCreatingProfile, setIsCreatingProfile] = useOptimizedState(false);
  const navigate = useNavigate();
  const { validateCode, isValidating, validationResult } = useInviteCode();
  const { user } = useAuthManager();

  const handleRoleSelect = (role: "therapist" | "client") => {
    setSelectedRole(role);
  };

  const handleNextStep = async () => {
    if (step === 1 && selectedRole) {
      setStep(2);
    } else if (step === 2 && selectedRole === "therapist" && name.trim()) {
      await createTherapistProfile();
    } else if (step === 2 && selectedRole === "client" && name.trim()) {
      setStep(3);
    } else if (step === 3 && inviteCode.trim()) {
      const result = await validateCode(inviteCode.trim());
      if (result.isValid) {
        await createClientProfile();
      }
    }
  };

  const createTherapistProfile = async () => {
    if (!user) return;

    setIsCreatingProfile(true);
    try {
      const nameParts = name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          email: user.email || "",
          role: "therapist",
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error creating therapist profile:", error);
        return;
      }

      navigate("/dashboard/therapist");
    } catch (error) {
      console.error("Error in createTherapistProfile:", error);
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const createClientProfile = async () => {
    if (!user) return;

    setIsCreatingProfile(true);
    try {
      const nameParts = name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Update the profiles table with client information
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: firstName,
          last_name: lastName,
          email: user.email || "",
          role: "client",
        })
        .eq("id", user.id);

      if (profileError) {
        console.error("Error creating client profile:", profileError);
        return;
      }

      // Connect to therapist using the invite code
      const connectionResult = await clientTherapistService.connectToTherapist(
        inviteCode.trim(),
        user.id
      );

      if (!connectionResult.success) {
        console.error("Error connecting to therapist:", connectionResult.error);
        return;
      }

      navigate("/dashboard/client");
    } catch (error) {
      console.error("Error in createClientProfile:", error);
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Left side - welcome text */}
      <div className="flex-1 hidden lg:flex flex-col justify-between p-10 bg-[#1a1a1a]">
        <div className="flex items-center space-x-2">
          <img src="/favicon.ico" alt="Icon" className="w-6 h-6" />
          <span className="text-white font-medium text-sm">Bondable</span>
        </div>

        <div className="mb-16">
          <blockquote className="text-white text-sm leading-relaxed max-w-md">
            "Discover a powerful platform designed to enhance your therapeutic
            workflow and deliver better care to your clients."
          </blockquote>
        </div>
      </div>

      {/* Right side - onboarding form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#0a0a0a]">
        <div className="w-full max-w-sm">
          <div className="space-y-6">
            {step === 1 ? (
              <>
                <div className="text-center space-y-2">
                  <h1 className="text-white text-xl font-medium">
                    {t("welcome_to_bondable")}
                  </h1>
                  <p className="text-gray-400 text-sm">
                    {t("choose_your_role")}
                  </p>
                </div>

                <div className="space-y-3">
                  <Card
                    className={`cursor-pointer transition-all border ${
                      selectedRole === "therapist"
                        ? "bg-[#2a2a2a] border-white"
                        : "bg-[#1a1a1a] border-[#2a2a2a] hover:border-gray-400"
                    }`}
                    onClick={() => handleRoleSelect("therapist")}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-[#333] rounded-lg flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-white font-medium text-sm">
                            {t("therapist")}
                          </h3>
                          <p className="text-gray-400 text-xs">
                            {t("manage_clients_appointments")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={`cursor-pointer transition-all border ${
                      selectedRole === "client"
                        ? "bg-[#2a2a2a] border-white"
                        : "bg-[#1a1a1a] border-[#2a2a2a] hover:border-gray-400"
                    }`}
                    onClick={() => handleRoleSelect("client")}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-[#333] rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-white font-medium text-sm">
                            {t("client")}
                          </h3>
                          <p className="text-gray-400 text-xs">
                            {t("connect_with_therapist")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleNextStep}
                    disabled={!selectedRole}
                    className="bg-white text-black hover:bg-gray-100 disabled:opacity-50 h-10 rounded-md font-medium text-sm"
                  >
                    {t("next")}
                  </Button>
                </div>
              </>
            ) : step === 2 ? (
              <>
                <div className="text-center space-y-2">
                  <h1 className="text-white text-xl font-medium">
                    {t("whats_your_name")}
                  </h1>
                  <p className="text-gray-400 text-sm">
                    {t("tell_us_how_addressed")}
                  </p>
                </div>

                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder={t("enter_your_full_name")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-500 h-10 rounded-md focus:border-gray-400 focus:ring-0"
                  />
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    {t("back")}
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    disabled={!name.trim() || isCreatingProfile}
                    className="bg-white text-black hover:bg-gray-100 disabled:opacity-50 h-10 rounded-md font-medium text-sm"
                  >
                    {selectedRole === "client" ? t("next") : t("get_started")}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <h1 className="text-white text-xl font-medium">
                    {t("enter_invite_code")}
                  </h1>
                  <p className="text-gray-400 text-sm">
                    {t("enter_invite_code_desc")}
                  </p>
                </div>

                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder={t("enter_invite_code_placeholder")}
                    value={inviteCode}
                    onChange={(e) =>
                      setInviteCode(e.target.value.toUpperCase())
                    }
                    className="bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder:text-gray-500 h-10 rounded-md focus:border-gray-400 focus:ring-0"
                  />
                  {validationResult && !validationResult.isValid && (
                    <p className="text-red-400 text-sm">
                      {validationResult.error}
                    </p>
                  )}
                  {validationResult && validationResult.isValid && (
                    <p className="text-green-400 text-sm">
                      {t("valid_code_for", { therapistName: validationResult.therapistName })}
                    </p>
                  )}
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    {t("back")}
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    disabled={
                      !inviteCode.trim() || isValidating || isCreatingProfile
                    }
                    className="bg-white text-black hover:bg-gray-100 disabled:opacity-50 h-10 rounded-md font-medium text-sm"
                  >
                     {isValidating || isCreatingProfile
                       ? t("loading")
                       : t("get_started")}
                  </Button>
                </div>
              </>
            )}

            <div className="flex justify-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  step === 1 ? "bg-white" : "bg-gray-600"
                }`}
              ></div>
              <div
                className={`w-2 h-2 rounded-full ${
                  step === 2 ? "bg-white" : "bg-gray-600"
                }`}
              ></div>
              {selectedRole === "client" && (
                <div
                  className={`w-2 h-2 rounded-full ${
                    step === 3 ? "bg-white" : "bg-gray-600"
                  }`}
                ></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
