
import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import console from "@/lib/production-console";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PasswordStrengthInput } from "@/components/ui/password-strength-input";
import { getApiToken, signIn, signUp } from "@/lib/authClient";
import { useToast } from "@/hooks/ui/use-toast";
import { useAuthManager, isBypassAvailable, setDemoRole } from "@/hooks/api/useAuthManager";
import { RoleSelectionDialog } from "@/components/ui/role-selection-dialog";
import { useTranslation } from "react-i18next";

/**
 * Login — real authentication against Neon Auth.
 *
 * This page used to call `supabase.auth.*`: a mock that accepted any
 * password in dev, and in production a Supabase project whose domain no
 * longer resolves. Sign-in, registration and Google now run against the
 * real auth server; the profile (and with it the role) is created through
 * /api/profile, where the role is capped server-side at client/therapist.
 *
 * Supports `?redirect=/coach`-style return paths: only same-origin absolute
 * paths are honoured, so the parameter can never send someone off-site.
 */

/** Only paths like "/coach" — never protocol-relative or absolute URLs. */
const safeRedirect = (value: string | null): string | null =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : null;

const Login = () => {
  const [email, setEmail] = useOptimizedState("");
  const [password, setPassword] = useOptimizedState("");
  const [firstName, setFirstName] = useOptimizedState("");
  const [lastName, setLastName] = useOptimizedState("");
  const [selectedRole, setSelectedRole] = useOptimizedState<"therapist" | "client" | null>(null);
  // ?mode=register opens on the register tab — used by the post-lead nudge,
  // where "no account yet" is the known state. Read directly from location so
  // it works before the router hooks below have run.
  const [isRegister, setIsRegister] = useOptimizedState(
    typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("mode") === "register",
  );
  const [isLoading, setIsLoading] = useOptimizedState(false);
  const [showRoleDialog, setShowRoleDialog] = useOptimizedState(false);
  const [isRedirecting, setIsRedirecting] = useOptimizedState(false);
  const [hasProcessedAuth, setHasProcessedAuth] = useOptimizedState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirect"));
  const { user, session, loading, error, role, roleLoading, refreshProfile } = useAuthManager();
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

  /**
   * Authenticated → route by role. The provider resolves the profile (and so
   * the role) for us; no profile yet means a fresh account whose role is
   * still unknown — email registrations create theirs immediately below, so
   * in practice the dialog only appears for first-time Google sign-ins.
   */
  useOptimizedEffect(() => {
    if (loading || roleLoading || isRedirecting || hasProcessedAuth) {
      return;
    }

    if (error) {
      console.error("❌ Auth error detected:", error);
      showNotification("error", `${t("authentication_error")}: ${error}`);
      return;
    }

    if (user && session) {
      setHasProcessedAuth(true);
      if (role) {
        setIsRedirecting(true);
        directRedirect(role);
      } else {
        setShowRoleDialog(true);
      }
    }
  }, [user, session, loading, error, role, roleLoading, isRedirecting, hasProcessedAuth]);

  const directRedirect = (userRole: string) => {
    // A requested return path (e.g. /coach after the cap) outranks the role
    // dashboard — the visitor was in the middle of something.
    const targetPath = redirectTo ?? `/dashboard/${userRole}`;
    navigate(targetPath, { replace: true });
  };

  /**
   * First-time Google users: no profile exists yet, so ask which side of the
   * platform they are on and create it. Role capping happens server-side.
   */
  const handleRoleSelection = async (chosenRole: "therapist" | "client") => {
    try {
      const token = await getApiToken();
      if (!token) {
        showNotification("error", t("authentication_error"));
        return;
      }
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: chosenRole }),
      });
      if (!response.ok) {
        showNotification("error", t("could_not_determine_user_role"));
        return;
      }
      await refreshProfile();
      setShowRoleDialog(false);
      setIsRedirecting(true);
      directRedirect(chosenRole);
    } catch (err) {
      console.error("❌ Error in handleRoleSelection:", err);
      showNotification("error", t("could_not_determine_user_role"));
    }
  };

  const isPasswordValid = () => {
    // Length mirrors the server's minimum (10); the complexity checks are ours.
    const requirements = [/.{10,}/, /[0-9]/, /[a-z]/, /[A-Z]/];
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
      // Come back to THIS page (with any return path preserved): the
      // role/profile logic above runs on return and finishes the journey.
      const callbackURL = `${window.location.origin}/login${
        redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""
      }`;
      const { error } = await signIn.social({ provider: "google", callbackURL });

      if (error) {
        console.error("❌ Google sign-in error:", error);
        showNotification("error", t("failed_to_initiate_google_signin"));
        return;
      }
      // The browser navigates to Google here; nothing further runs on success.
    } catch (err) {
      console.error("❌ Google sign-in error:", err);
      showNotification("error", t("failed_to_initiate_google_signin"));
    } finally {
      setIsLoading(false);
    }
  };

  // Demo bypass: enter the app as a role WITHOUT a backend. Stores the chosen
  // role (localStorage) and does a full navigation so the auth provider picks it
  // up. Replaces the old Supabase quick-login that failed against the mock.
  const quickLogin = (role: "therapist" | "client" | "admin") => {
    setDemoRole(role);
    window.location.assign(`/dashboard/${role}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isRegister) {
        if (!email || !password || !firstName || !lastName || !selectedRole) {
          throw new Error(t("missing_required_registration_data"));
        }

        const { error } = await signUp.email({
          email: email.trim(),
          password,
          name: `${firstName.trim()} ${lastName.trim()}`,
        });

        if (error) {
          console.error("❌ Registration error:", error);
          if (error.code === "USER_ALREADY_EXISTS") {
            showNotification("error", t("user_already_registered"));
          } else if (error.code === "INVALID_EMAIL") {
            showNotification("error", t("please_enter_valid_email"));
          } else if (error.code === "PASSWORD_TOO_SHORT") {
            showNotification("error", t("password_requirements"));
          } else {
            showNotification("error", `${t("registration_failed")}: ${error.message ?? ""}`);
          }
          return;
        }

        // The account exists; now make it a PERSON with the chosen role. The
        // server caps the role at client/therapist, so a tampered request
        // cannot mint an admin. The redirect effect fires once the provider
        // sees the fresh session + profile.
        const token = await getApiToken();
        if (token) {
          await fetch("/api/profile", {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
            body: JSON.stringify({
              role: selectedRole,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
            }),
          }).catch(() => {
            /* provider retries via refreshProfile on next load */
          });
          await refreshProfile();
        }
        showNotification("success", t("login_successful"));
      } else {
        const { error } = await signIn.email({
          email: email.trim(),
          password,
        });

        if (error) {
          console.error("❌ Login error:", error);
          if (error.code === "INVALID_EMAIL_OR_PASSWORD") {
            showNotification("error", t("invalid_email_or_password"));
          } else {
            showNotification("error", `${t("login_failed")}: ${error.message ?? ""}`);
          }
          return;
        }

        showNotification("success", t("login_successful"));
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

      {/* Left side - deep-teal ink panel (≈40%) with a calm line motif */}
      <div className="relative hidden basis-2/5 flex-col justify-between overflow-hidden bg-sidebar p-10 lg:flex">
        {/* Calm line motif — quiet, decorative */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full text-sidebar-foreground/10"
          preserveAspectRatio="none"
          viewBox="0 0 400 600"
          fill="none"
        >
          <path
            d="M-20 470 C 90 400, 150 500, 260 430 S 430 380, 460 450"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M-20 510 C 90 440, 150 540, 260 470 S 430 420, 460 490"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M-20 550 C 90 480, 150 580, 260 510 S 430 460, 460 530"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>

        <div className="relative flex items-center gap-2.5">
          <img src="/favicon.ico" alt="Icon" className="h-8 w-8" />
          <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
            Bondable
          </span>
        </div>

        <div className="relative">
          <p className="max-w-md font-display text-display-md text-sidebar-foreground">
            {t(
              'login_panel_line',
              'Zorg die je verbindt met een hulpverlener die bij je past.',
            )}
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-sidebar-foreground/70">
            {t(
              'login_panel_sub',
              'Onder supervisie van een echte hulpverlener. Jouw gegevens blijven van jou.',
            )}
          </p>
        </div>
      </div>

      {/* Right side - login/register form on canvas */}
      <div className="flex flex-1 items-center justify-center bg-background p-4 min-h-screen sm:p-8 lg:basis-3/5">{/* Reduced mobile padding and ensured full height */}
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

            {isBypassAvailable() && !isRegister && (
              <div className="space-y-2 rounded-card border border-dashed border-border bg-secondary/50 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("login_demo_label", "Demo — bekijk de app zonder login")}
                </p>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    onClick={() => quickLogin("therapist")}
                    className="h-9 flex-1 rounded-ctl border border-border bg-card text-xs text-foreground hover:bg-muted"
                  >
                    {t("login_demo_therapist", "Hulpverlener")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => quickLogin("client")}
                    className="h-9 flex-1 rounded-ctl border border-border bg-card text-xs text-foreground hover:bg-muted"
                  >
                    {t("login_demo_client", "Cliënt")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => quickLogin("admin")}
                    className="h-9 flex-1 rounded-ctl border border-border bg-card text-xs text-foreground hover:bg-muted"
                  >
                    {t("login_demo_admin", "Admin")}
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
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground h-10 rounded-ctl focus:border-ring focus:ring-ring"
                    required
                    disabled={isLoading}
                  />
                  <Input
                    type="text"
                    placeholder={t('last_name')}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground h-10 rounded-ctl focus:border-ring focus:ring-ring"
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
                className="bg-background border-border text-foreground placeholder:text-muted-foreground h-10 rounded-ctl focus:border-ring focus:ring-ring"
                required
                disabled={isLoading}
              />

              <PasswordStrengthInput
                label=""
                placeholder={t('enter_password')}
                value={password}
                onChange={setPassword}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground h-10 rounded-ctl focus:border-ring focus:ring-ring"
                state={isRegister ? "default" : "never"}
              />

              {isRegister && (
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    onClick={() => setSelectedRole("therapist")}
                    disabled={isLoading}
                    className={`flex-1 h-10 rounded-ctl font-medium text-sm transition-colors ${
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
                    className={`flex-1 h-10 rounded-ctl font-medium text-sm transition-colors ${
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
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 h-10 rounded-ctl font-medium text-sm"
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
              className="w-full bg-card border-border text-foreground hover:bg-muted h-10 rounded-ctl font-medium text-sm"
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
              {/* Providers who land here need a way into the real funnel. */}
              <p className="mt-2 text-sm text-muted-foreground">
                {t('login_provider_hint', 'Hulpverlener?')}{' '}
                <button
                  type="button"
                  onClick={() => navigate('/signup/provider')}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {t('login_provider_signup', 'Maak je praktijkaccount aan')}
                </button>
              </p>
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
