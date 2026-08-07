import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrengthInput } from "@/components/ui/password-strength-input";
import { getApiToken, signIn, signUp } from "@/lib/authClient";

/**
 * CoachAuthPanel — the inline account form at the anonymous cap.
 *
 * This replaces a panel that LINKED to /login. Linking was the wrong shape for
 * this moment: navigation would discard the in-memory conversation — the very
 * thing Bond just promised to save — and every extra step between "I want to
 * keep this" and "kept" loses people. So the form lives inside the chat page,
 * and on success the PARENT adopts the conversation and the visitor continues
 * where they left off, same screen, same scroll position.
 *
 * Register is the default tab: by construction the visitor has just used up
 * an anonymous allowance, so "no account yet" is the overwhelmingly likely
 * state. The Google path must navigate away (OAuth), which is why the parent
 * stashes the thread in sessionStorage first — see `onBeforeRedirect`.
 */

interface CoachAuthPanelProps {
  /**
   * Called after a completed email signup/login, once the profile exists.
   * The parent adopts the anonymous thread and unlocks the composer.
   */
  onAuthenticated: () => Promise<void> | void;
  /** Called right before the Google redirect leaves the page. */
  onBeforeRedirect: () => void;
}

/** Dutch messages for the auth errors a visitor can actually cause. */
function describeAuthError(code: string | undefined, fallback: string): string {
  switch (code) {
    case "USER_ALREADY_EXISTS":
      return "Er bestaat al een account met dit e-mailadres. Log in of gebruik een ander adres.";
    case "INVALID_EMAIL_OR_PASSWORD":
      return "E-mailadres of wachtwoord klopt niet.";
    case "INVALID_EMAIL":
      return "Dat lijkt geen geldig e-mailadres.";
    case "PASSWORD_TOO_SHORT":
      return "Kies een wachtwoord van minstens 10 tekens.";
    default:
      return fallback;
  }
}

const CoachAuthPanel = ({ onAuthenticated, onBeforeRedirect }: CoachAuthPanelProps) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Make sure a Bondable profile exists for the fresh session. Idempotent on
   * the server; role is capped there too, so this can only ever yield
   * client/therapist — sending 'client' here is a default, not a decision.
   */
  const ensureProfile = async () => {
    const token = await getApiToken();
    if (!token) return;
    await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ role: "client" }),
    }).catch(() => {
      /* profile creation is retried on the next page load; not fatal here */
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const result =
        mode === "register"
          ? await signUp.email({
              email: email.trim(),
              password,
              name: name.trim() || email.trim().split("@")[0],
            })
          : await signIn.email({ email: email.trim(), password });

      if (result.error) {
        setError(
          describeAuthError(
            result.error.code,
            mode === "register"
              ? "Account aanmaken lukte niet. Probeer het zo opnieuw."
              : "Inloggen lukte niet. Probeer het zo opnieuw.",
          ),
        );
        return;
      }

      await ensureProfile();
      await onAuthenticated();
    } catch {
      setError("Er ging iets mis met de verbinding. Probeer het zo opnieuw.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // The thread must be stashed BEFORE the browser leaves for Google —
      // after the redirect this component no longer exists.
      onBeforeRedirect();
      await signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}/coach`,
      });
      // The page navigates away here; nothing below runs on success.
    } catch {
      setError("Inloggen met Google lukte niet. Probeer het zo opnieuw.");
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 space-y-4 rounded-card border border-border bg-card p-4">
      <div>
        <h2 className="font-display text-lg font-semibold">
          {t("coach_cap_title", "Hier stopt het gratis stuk")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(
            "coach_cap_body_inline",
            "Maak een account aan, dan bewaren we dit gesprek en praten we meteen verder — je raakt hier niets kwijt.",
          )}
        </p>
      </div>

      {/* Mode toggle. Two buttons rather than a Tabs dependency: this panel
          must stay light — it renders inside the chat, not as a page. */}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "register" ? "default" : "outline"}
          onClick={() => setMode("register")}
        >
          {t("coach_auth_register", "Account aanmaken")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "login" ? "default" : "outline"}
          onClick={() => setMode("login")}
        >
          {t("coach_auth_login", "Ik heb al een account")}
        </Button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "register" && (
          <div>
            <Label htmlFor="coach-auth-name">{t("coach_auth_name", "Voornaam")}</Label>
            <Input
              id="coach-auth-name"
              autoComplete="given-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("coach_auth_name_ph", "Hoe mag Bond je noemen?")}
            />
          </div>
        )}

        <div>
          <Label htmlFor="coach-auth-email">{t("coach_auth_email", "E-mailadres")}</Label>
          <Input
            id="coach-auth-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {mode === "register" ? (
          // Renders its own label + visibility eye + strength meter.
          <PasswordStrengthInput
            label={t("coach_auth_password", "Wachtwoord")}
            value={password}
            onChange={setPassword}
            placeholder={t("coach_auth_password_ph", "Minstens 10 tekens")}
          />
        ) : (
          <div>
            <Label htmlFor="coach-auth-password">
              {t("coach_auth_password", "Wachtwoord")}
            </Label>
            <Input
              id="coach-auth-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}

        {error && (
          <p className="rounded-ctl border border-destructive/40 bg-destructive/10 p-2 text-sm">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "register"
              ? t("coach_auth_submit_register", "Bewaar mijn gesprek")
              : t("coach_auth_submit_login", "Inloggen")}
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={google}>
            {t("coach_auth_google", "Doorgaan met Google")}
          </Button>
          <Button asChild variant="ghost">
            <Link to="/find">{t("coach_cap_find", "Liever meteen een mens?")}</Link>
          </Button>
        </div>
      </form>

      <p className="text-xs text-muted-foreground">
        {t(
          "coach_auth_privacy",
          "Je gesprek wordt opgeslagen in onze Europese database en is alleen voor jou zichtbaar. Wissen kan altijd, met één knop.",
        )}
      </p>
    </div>
  );
};

export default CoachAuthPanel;
