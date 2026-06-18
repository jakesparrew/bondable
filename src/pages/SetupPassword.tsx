import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import console from "@/lib/production-console";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordStrengthInput } from "@/components/ui/password-strength-input";
import { supabase } from "@/integrations/supabase/client";
import { Home, Lock } from "lucide-react";
import { useToast } from "@/hooks/ui/use-toast";
import { useTranslation } from "react-i18next";

const SetupPassword = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clientId = searchParams.get("clientId");

  const [password, setPassword] = useOptimizedState("");
  const [confirmPassword, setConfirmPassword] = useOptimizedState("");
  const [isLoading, setIsLoading] = useOptimizedState(false);
  const [clientData, setClientData] = useOptimizedState<any>(null);
  const [isVerifying, setIsVerifying] = useOptimizedState(true);
  const { toast } = useToast();

  useOptimizedEffect(() => {
    if (!clientId) {
      navigate("/");
      return;
    }

    fetchClientData();
  }, [clientId, navigate]);

  const fetchClientData = async () => {
    if (!clientId) return;

    try {
      setIsVerifying(true);
      console.log("Fetching client data for ID:", clientId);

      // Use the service role to fetch client data since this is a public setup flow
      const { data, error } = await supabase.functions.invoke(
        "get-client-data",
        {
          body: { clientId },
        }
      );

      if (error) {
        console.error("Error fetching client data:", error);
        toast({
          title: t("invalid_link"),
          description: t("invalid_expired_invitation_link"),
          variant: "destructive",
        });
        return;
      }

      if (!data || !data.client) {
        console.error("No client data returned");
        toast({
          title: t("invalid_link"),
          description: t("invalid_expired_invitation_link"),
          variant: "destructive",
        });
        return;
      }

      console.log("Client data fetched successfully:", data.client);
      setClientData(data.client);
    } catch (error) {
      console.error("Error fetching client data:", error);
      toast({
        title: t("verification_failed"),
        description: t("failed_verify_invitation"),
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const isPasswordValid = () => {
    const requirements = [/.{8,}/, /[0-9]/, /[a-z]/, /[A-Z]/];
    return requirements.every((regex) => regex.test(password));
  };

  // Helper function to wait for profile to be created
  const waitForProfile = async (
    userId: string,
    maxAttempts = 10
  ): Promise<boolean> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(
        `Checking for profile creation, attempt ${attempt}/${maxAttempts}`
      );

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (!error && profile) {
        console.log("Profile found successfully");
        return true;
      }

      if (attempt < maxAttempts) {
        // Wait before retrying (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(
          `Profile not found yet, waiting ${waitTime}ms before retry...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    console.error("Profile was not created within the expected time");
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientData || !clientId) return;

    if (!isPasswordValid()) {
      toast({
        title: t("error"),
        description: t("password_must_meet_requirements"),
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: t("error"),
        description: t("passwords_do_not_match"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("Starting account creation process for:", clientData.email);

      // Create auth user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: clientData.email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard/client`,
          data: {
            first_name: clientData.first_name,
            last_name: clientData.last_name,
            role: "client",
            email: clientData.email,
          },
        },
      });

      if (authError) {
        console.error("Auth error:", authError);
        toast({
          title: "Account Creation Failed",
          description: authError.message,
          variant: "destructive",
        });
        return;
      }

      if (authData.user) {
        console.log("User created successfully:", authData.user.id);

        // Wait for the profile to be created by the trigger
        const profileCreated = await waitForProfile(authData.user.id);

        if (!profileCreated) {
          console.error("Profile creation timeout");
          toast({
            title: "Setup Error",
            description: "Account setup is taking longer than expected. Please try again.",
            variant: "destructive",
          });
          return;
        }

        // Update the profile with complete information
        console.log("Updating profile with complete information...");
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({
            first_name: clientData.first_name,
            last_name: clientData.last_name,
            email: clientData.email,
            role: "client",
          })
          .eq("id", authData.user.id);

        if (profileUpdateError) {
          console.error("Error updating profile:", profileUpdateError);
          // Don't fail the entire process for this, just log it
        }

        console.log("Creating client-therapist relationship...");
        // Create client-therapist relationship
        const { error: relationshipError } = await supabase
          .from("client_therapist_relationships")
          .insert({
            client_id: authData.user.id,
            therapist_id: clientData.therapist_id,
            status: "active",
          });

        if (relationshipError) {
          console.error(
            "Error creating client-therapist relationship:",
            relationshipError
          );
          toast({
            title: "Connection Error",
            description: "Failed to establish connection with therapist. Please contact support.",
            variant: "destructive",
          });
          return;
        }

        console.log("Client-therapist relationship created successfully");

        // CRITICAL FIX: Use the new cleanup edge function to delete pending client
        console.log("Cleaning up pending client record with ID:", clientId);

        try {
          const { data: cleanupResult, error: cleanupError } =
            await supabase.functions.invoke("cleanup-pending-client", {
              body: {
                clientId: clientId,
                clientEmail: clientData.email,
              },
            });

          console.log("Cleanup result:", cleanupResult);

          if (cleanupError) {
            console.error("Error in cleanup function:", cleanupError);
            // Don't fail the entire process, just log the error
            console.log(
              "Client account created successfully despite cleanup error"
            );
          } else {
            console.log("Pending client cleanup completed:", cleanupResult);
          }
        } catch (cleanupError) {
          console.error("Failed to call cleanup function:", cleanupError);
          // Don't fail the entire process
        }

        // Send real-time notification about the new connection
        console.log(
          "Sending real-time notifications about client connection..."
        );

        try {
          // Notify therapist's client management system
          supabase
            .channel(`therapist-${clientData.therapist_id}-clients`)
            .send({
              type: "broadcast",
              event: "client_connected",
              payload: {
                event_type: "CLIENT_CONNECTED",
                client_id: authData.user.id,
                therapist_id: clientData.therapist_id,
                client_name: `${clientData.first_name} ${clientData.last_name}`,
                timestamp: new Date().toISOString(),
              },
            });

          // Also send to general updates channel
          supabase.channel("general-client-updates").send({
            type: "broadcast",
            event: "relationship_created",
            payload: {
              event_type: "RELATIONSHIP_CREATED",
              client_id: authData.user.id,
              therapist_id: clientData.therapist_id,
              timestamp: new Date().toISOString(),
            },
          });

          console.log("Real-time notifications sent successfully");
        } catch (notificationError) {
          console.error(
            "Failed to send real-time notifications:",
            notificationError
          );
          // Don't fail the process for this
        }

        console.log("Account setup completed successfully!");
        toast({
          title: "Success",
          description: "Account created successfully! Redirecting to your dashboard...",
        });
        setTimeout(() => {
          navigate("/dashboard/client");
        }, 2000);
      }
    } catch (error) {
      console.error("Setup error:", error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p>Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md mx-auto">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-card border border-border">
              <Lock className="h-12 w-12 text-red-400" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Invalid or Expired Link
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              This invitation link is no longer valid or may have already been
              used.
            </p>
          </div>

          {/* Button */}
          <div>
            <Button
              onClick={() => navigate("/")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-medium transition-colors"
            >
              <span className="inline-flex items-center space-x-2">
                <Home className="h-4 w-4" />
                <span>Go to Login</span>
              </span>
            </Button>
          </div>

          {/* Optional Footer Info */}
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              If you believe this is a mistake, please contact your
              administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-y-6">
        <div className="flex items-center justify-center space-x-3">
          <img src="/favicon.ico" alt="Icon" className="w-8 h-8" />
          <span className="font-semibold text-xl text-foreground">Bondable</span>
        </div>
        <Card className="w-full max-w-md bg-card border-border">
          <CardHeader className="text-center space-y-4">
            <div>
              <CardTitle className="text-foreground text-xl">
                Complete Your Setup
              </CardTitle>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent mt-3" />
              <p className="text-muted-foreground text-sm mt-3">
                Welcome, {clientData.first_name}! Create your password to access
                your account.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-card p-4 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground mb-2">Account Details:</p>
                <p className="text-foreground font-medium">
                  {clientData.first_name} {clientData.last_name}
                </p>
                <p className="text-muted-foreground text-sm">{clientData.email}</p>
              </div>

              <PasswordStrengthInput
                label="Create Password"
                placeholder="Enter your password"
                value={password}
                onChange={setPassword}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring"
                state="default"
              />

              <PasswordStrengthInput
                label={t("confirm_password")}
                placeholder={t("confirm_your_password")}
                value={confirmPassword}
                onChange={setConfirmPassword}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring"
                state="never"
              />

              <Button
                type="submit"
                disabled={
                  isLoading ||
                  !isPasswordValid() ||
                  password !== confirmPassword
                }
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 h-10 rounded-md font-medium text-sm"
              >
                {isLoading ? t("creating_account") : t("complete_setup")}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground leading-relaxed">
                By completing setup, you agree to Bondable's{" "}
                <a
                  href="#"
                  className="underline hover:text-foreground transition-colors"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  className="underline hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SetupPassword;
