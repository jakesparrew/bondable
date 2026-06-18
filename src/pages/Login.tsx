
import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import console from "@/lib/production-console";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { PasswordStrengthInput } from "@/components/ui/password-strength-input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/ui/use-toast";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { RoleSelectionDialog } from "@/components/ui/role-selection-dialog";
import { useTranslation } from "react-i18next";

const Login = () => {
  const [email, setEmail] = useOptimizedState("");
  const [password, setPassword] = useOptimizedState("");
  const [firstName, setFirstName] = useOptimizedState("");
  const [lastName, setLastName] = useOptimizedState("");
  const [selectedRole, setSelectedRole] = useOptimizedState<"therapist" | "client" | null>(null);
  const [isRegister, setIsRegister] = useOptimizedState(false);
  const [isLoading, setIsLoading] = useOptimizedState(false);
  const [showRoleDialog, setShowRoleDialog] = useOptimizedState(false);
  const [isRedirecting, setIsRedirecting] = useOptimizedState(false);
  const [hasProcessedAuth, setHasProcessedAuth] = useOptimizedState(false);
  const navigate = useNavigate();
  const { user, session, loading, error } = useAuthManager();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Reset redirecting state when user becomes null (logout)
  useOptimizedEffect(() => {
    if (!user && !loading) {
      console.log('🔄 User logged out, resetting redirect state');
      setIsRedirecting(false);
      setHasProcessedAuth(false);
      setShowRoleDialog(false);
    }
  }, [user, loading]);

  // Handle authenticated users with role-based redirect
  useOptimizedEffect(() => {
    if (loading || isRedirecting || hasProcessedAuth) {
      return;
    }

    if (error) {
      console.error("❌ Auth error detected:", error);
      showNotification("error", `${t("authentication_error")}: ${error}`);
      return;
    }

    if (user && session) {
      console.log('✅ User authenticated, processing redirect...');
      setHasProcessedAuth(true);
      handleAuthenticatedUser();
    }
  }, [user, session, loading, error, isRedirecting, hasProcessedAuth]);

  const handleAuthenticatedUser = async () => {
    if (!user || !session || isRedirecting) return;

    setIsRedirecting(true);
    
    try {
      console.log('🔍 Processing authenticated user:', user.id, 'email:', user.email);
      const providers = session.user.app_metadata?.providers || [];
      const isGoogleUser = providers.includes('google');
      
      console.log('🔍 User providers:', providers);
      console.log('🔍 Is Google user:', isGoogleUser);
      
      if (isGoogleUser) {
        await handleGoogleUser();
      } else {
        await handleRegularUser();
      }
    } catch (error) {
      console.error("❌ Error handling authenticated user:", error);
      showNotification("error", t("could_not_determine_user_role"));
      setIsRedirecting(false);
    }
  };

  const handleGoogleUser = async () => {
    if (!user) return;

    try {
      console.log("🔍 Checking Google user profile...");
      
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.warn("⚠️ Profile fetch error:", profileError);
      }

      if (profile?.role) {
        console.log('✅ Found existing Google user profile:', profile.role);
        directRedirect(profile.role);
        return;
      }

      // New Google user - show role selection
      console.log("🆕 New Google user - showing role selection");
      setShowRoleDialog(true);
      setIsRedirecting(false);
      
    } catch (error) {
      console.warn("⚠️ Error handling Google user, showing role selection:", error);
      setShowRoleDialog(true);
      setIsRedirecting(false);
    }
  };

  const handleRegularUser = async () => {
    if (!user) return;

    try {
      console.log("🔍 Fetching regular user profile...");
      
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("❌ Profile fetch error:", profileError);
        showNotification("error", t("could_not_determine_user_role"));
        setIsRedirecting(false);
        return;
      }

      if (profile?.role) {
        console.log('✅ Found regular user profile:', profile.role);
        directRedirect(profile.role);
      } else {
        console.error("❌ No role found for user");
        showNotification("error", t("could_not_determine_user_role"));
        setIsRedirecting(false);
      }
    } catch (error) {
      console.error("❌ Error handling regular user:", error);
      showNotification("error", t("authentication_error"));
      setIsRedirecting(false);
    }
  };

  const directRedirect = (role: string) => {
    console.log("🚀 Direct redirect to:", role);
    const targetPath = `/dashboard/${role}`;
    console.log("🚀 Navigating to:", targetPath);
    navigate(targetPath, { replace: true });
  };

  const handleRoleSelection = async (role: "therapist" | "client") => {
    if (!user) return;

    try {
      console.log("🆕 Creating new Google user profile with role:", role);

      const fullName =
        `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User";

      const { error } = await supabase.from("profiles").insert({
        id: user.id,
        first_name: fullName.split(' ')[0] || '',
        last_name: fullName.split(' ').slice(1).join(' ') || '',
        email: user.email,
        role: role,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      });

      if (error) {
        console.error("❌ Error creating Google user profile:", error);
        showNotification("error", "Failed to create profile");
        return;
      }

      console.log("✅ Google user profile created successfully");
      setShowRoleDialog(false);
      directRedirect(role);

    } catch (error) {
      console.error("❌ Error in handleRoleSelection:", error);
      showNotification("error", "Failed to create profile");
    }
  };

  const isPasswordValid = () => {
    const requirements = [/.{8,}/, /[0-9]/, /[a-z]/, /[A-Z]/];
    return requirements.every((regex) => regex.test(password));
  };

  const showNotification = (
    type: "success" | "error" | "warning",
    message: string
  ) => {
    if (type === "success") {
      toast({
        title: t("success"),
        description: message,
      });
    } else if (type === "error") {
      toast({
        title: t("error"),
        description: message,
        variant: "destructive",
      });
    } else if (type === "warning") {
      toast({
        title: t("warning"),
        description: message,
      });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      console.log("🚀 Starting Google sign-in...");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        console.error("❌ Google sign-in error:", error);
        showNotification("error", `Google sign-in failed: ${error.message}`);
        return;
      }

      console.log("✅ Google sign-in initiated");
      showNotification("success", t("redirecting_to_google"));
    } catch (error) {
      console.error("❌ Google sign-in error:", error);
      showNotification("error", t("failed_to_initiate_google_signin"));
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (role: "therapist" | "client") => {
    const creds = {
      therapist: { email: "dev-therapist@bondable.local", password: "DevPass123!", first: "Dev", last: "Therapist" },
      client:    { email: "dev-client@bondable.local",    password: "DevPass123!", first: "Dev", last: "Client" },
    }[role];

    setIsLoading(true);
    try {
      let { error } = await supabase.auth.signInWithPassword({ email: creds.email, password: creds.password });

      if (error?.message.includes("Invalid login credentials")) {
        const { error: signUpErr } = await supabase.auth.signUp({
          email: creds.email,
          password: creds.password,
          options: { data: { first_name: creds.first, last_name: creds.last, role, full_name: `${creds.first} ${creds.last}` } },
        });
        if (signUpErr && !signUpErr.message.includes("already")) {
          showNotification("error", `Quick login signup failed: ${signUpErr.message}`);
          return;
        }
        ({ error } = await supabase.auth.signInWithPassword({ email: creds.email, password: creds.password }));
      }

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          showNotification("warning", "Disable 'Confirm email' in Supabase Dashboard → Authentication → Providers → Email, then click again.");
        } else {
          showNotification("error", `Quick login failed: ${error.message}`);
        }
        return;
      }
      showNotification("success", `Signed in as ${role}`);
    } catch (err) {
      showNotification("error", `Quick login error: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isRegister) {
        console.log("🚀 Starting registration...");

        if (!email || !password || !firstName || !lastName || !selectedRole) {
          throw new Error(t("missing_required_registration_data"));
        }

        const fullName = `${firstName.trim()} ${lastName.trim()}`;

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              role: selectedRole,
            },
          },
        });

        if (error) {
          console.error("❌ Registration error:", error);
          if (error.message.includes("User already registered")) {
            showNotification(
              "error",
              t("user_already_registered")
            );
          } else if (error.message.includes("Invalid email")) {
            showNotification("error", t("please_enter_valid_email"));
          } else if (error.message.includes("Password")) {
            showNotification(
              "error",
              t("password_requirements")
            );
          } else {
            showNotification("error", `${t("registration_failed")}: ${error.message}`);
          }
          return;
        }

        if (data.user) {
          console.log("✅ Registration successful:", data.user.id);
          showNotification(
            "success",
            t("registration_successful_check_email")
          );

          // Clear form
          setEmail("");
          setPassword("");
          setFirstName("");
          setLastName("");
          setSelectedRole(null);
        }
      } else {
        console.log("🚀 Starting login...");

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          console.error("❌ Login error:", error);
          if (error.message.includes("Invalid login credentials")) {
            showNotification(
              "error",
              t("invalid_email_or_password")
            );
          } else if (error.message.includes("Email not confirmed")) {
            showNotification(
              "warning",
              t("email_not_confirmed")
            );
          } else {
            showNotification("error", `${t("login_failed")}: ${error.message}`);
          }
          return;
        }

        if (data.user) {
          console.log("✅ Login successful:", data.user.id);
          showNotification("success", t("login_successful"));
        }
      }
    } catch (error) {
      console.error("❌ Authentication error:", error);
      showNotification(
        "error",
        `${t("unexpected_error_occurred")}: ${
          error instanceof Error ? error.message : t("please_try_again")
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p>{t("loading")}</p>
        </div>
      </div>
    );
  }

  // Show redirecting state
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p>{t("redirecting")}</p>
        </div>
      </div>
    );
  }

  // Don't render login form for authenticated users - they will be redirected by the useEffect
  if (user && !showRoleDialog && !isRedirecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p>{t("processing_login")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <RoleSelectionDialog
        open={showRoleDialog}
        onRoleSelect={handleRoleSelection}
      />

      {/* Left side - welcome text */}
      <div className="flex-1 hidden lg:flex flex-col justify-between p-10 bg-sidebar">
        <div className="flex items-center space-x-2">
          <img src="/favicon.ico" alt="Icon" className="w-8 h-8" />
        </div>

        <div>
          <blockquote className="text-foreground text-sm leading-relaxed max-w-lg">
            {t('login_blockquote')}
          </blockquote>
        </div>
      </div>

      {/* Right side - login/register form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-background min-h-screen">{/* Reduced mobile padding and ensured full height */}
        <div className="w-full max-w-sm">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-foreground text-xl font-medium">
                {isRegister ? t('create_an_account') : t('welcome_back')}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isRegister
                  ? t('enter_details')
                  : t('enter_credentials')}
              </p>
            </div>

            {import.meta.env.DEV && !isRegister && (
              <div className="space-y-2 rounded-md border border-yellow-700/40 bg-yellow-900/10 p-3">
                <p className="text-xs text-yellow-400 font-medium">Dev quick login</p>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    onClick={() => quickLogin("therapist")}
                    disabled={isLoading}
                    className="flex-1 h-9 rounded-md text-xs bg-card border border-border text-foreground hover:bg-muted"
                  >
                    Care Provider
                  </Button>
                  <Button
                    type="button"
                    onClick={() => quickLogin("client")}
                    disabled={isLoading}
                    className="flex-1 h-9 rounded-md text-xs bg-card border border-border text-foreground hover:bg-muted"
                  >
                    Client
                  </Button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div className="flex space-x-2">
                  <Input
                    type="text"
                    placeholder={t('first_name')}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground h-10 rounded-md focus:border-ring focus:ring-ring"
                    required
                    disabled={isLoading}
                  />
                  <Input
                    type="text"
                    placeholder={t('last_name')}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground h-10 rounded-md focus:border-ring focus:ring-ring"
                    required
                    disabled={isLoading}
                  />
                </div>
              )}

              <Input
                type="email"
                placeholder={t("name_example_com")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground h-10 rounded-md focus:border-ring focus:ring-ring"
                required
                disabled={isLoading}
              />

              <PasswordStrengthInput
                label=""
                placeholder={t('enter_password')}
                value={password}
                onChange={setPassword}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground h-10 rounded-md focus:border-ring focus:ring-ring"
                state={isRegister ? "default" : "never"}
              />

              {isRegister && (
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    onClick={() => setSelectedRole("therapist")}
                    disabled={isLoading}
                    className={`flex-1 h-10 rounded-md font-medium text-sm transition-colors ${
                      selectedRole === "therapist"
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-card border border-border text-foreground hover:bg-muted hover:text-muted-foreground"
                    }`}
                    variant={
                      selectedRole === "therapist" ? "default" : "outline"
                    }
                  >
                    {t('therapist')}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setSelectedRole("client")}
                    disabled={isLoading}
                    className={`flex-1 h-10 rounded-md font-medium text-sm transition-colors ${
                      selectedRole === "client"
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 "
                        : "bg-card border border-border text-foreground hover:bg-muted hover:text-muted-foreground"
                    }`}
                    variant={selectedRole === "client" ? "default" : "outline"}
                  >
                    {t('client')}
                  </Button>
                </div>
              )}

              <Button
                type="submit"
                disabled={
                  isLoading ||
                  (isRegister &&
                    (!selectedRole ||
                      !isPasswordValid() ||
                      !firstName.trim() ||
                      !lastName.trim()))
                }
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 h-10 rounded-md font-medium text-sm"
              >
                {isLoading ? t('loading') : isRegister ? t('register') : t('sign_in')}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="bg-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground font-medium">
                  {t('continue_with')}
                </span>
              </div>
            </div>

            <div className="space-y-2">
            <Button
              variant="outline"
              disabled={isLoading}
              onClick={handleGoogleSignIn}
              className="w-full bg-card border-border text-foreground hover:bg-muted h-10 rounded-md font-medium text-sm"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                disabled={isLoading}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {isRegister
                  ? t('already_account')
                  : t('dont_have_account')}
              </button>
            </div>

            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              {t('clicking_continue')}{" "}
              <a
                href="#"
                className="underline hover:text-foreground transition-colors"
              >
                {t('terms_service')}
              </a>{" "}
              {t('and')}{" "}
              <a
                href="#"
                className="underline hover:text-foreground transition-colors"
              >
                {t('privacy_policy')}
              </a>
              .
            </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
