import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Check, FileCheck, Loader2, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AttestDialog from "@/components/invoicing/AttestDialog";
import {
  invoiceService,
  type AttestPayload,
  type Invoice,
} from "@/services/api/invoiceService";

/**
 * PostSignChain — the second half of the 90-second chain (sessie → notitie →
 * factuur → attest).
 *
 * A signed note is where a provider's admin work *starts* today: they close the
 * sheet, and later that evening they retype the same session into an invoice and
 * again into a mutualiteit attest. This step keeps the session in hand: one
 * primary action turns it into a draft invoice line, one secondary action prints
 * the terugbetalingsattest.
 *
 * Both are optional and dismissible — the note is already signed, nothing here
 * blocks. Nothing is billed twice: invoiceService guards on sessionId.
 *
 * No analytics: this surface sits inside the clinical sheet.
 */

export interface PostSignChainProps {
  sessionId: string;
  clientId: string;
  clientName?: string;
  /** ISO date (yyyy-mm-dd) of the session; defaults to today. */
  sessionDate?: string;
  durationMin?: number;
  /** Overrides the provider's standard rate for this session. */
  amountCents?: number;
  /** Tasks created from the Huiswerk lines on sign. */
  tasksCreated?: number;
  /** Close the sheet ("Klaar"). */
  onDone: () => void;
}

const PostSignChain: React.FC<PostSignChainProps> = ({
  sessionId,
  clientId,
  clientName,
  sessionDate,
  durationMin,
  amountCents,
  tasksCreated = 0,
  onDone,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [invoice, setInvoice] = React.useState<Invoice | null>(() =>
    invoiceService.findInvoiceForSession(sessionId),
  );
  const [billing, setBilling] = React.useState(false);
  const [attest, setAttest] = React.useState<AttestPayload | null>(null);
  const [attestOpen, setAttestOpen] = React.useState(false);

  const name = clientName?.trim() || t("chain_client", "je cliënt");

  const signedLine =
    tasksCreated === 0
      ? t(
          "chain_signed_desc",
          "De sessie is nog even bij de hand. Je kan de administratie nu meteen afronden.",
        )
      : tasksCreated === 1
        ? t(
            "chain_signed_task_one",
            "Eén huiswerktaak staat klaar voor {{name}}. De administratie kan er nu ook meteen bij.",
            { name },
          )
        : t(
            "chain_signed_tasks",
            "{{n}} huiswerktaken staan klaar voor {{name}}. De administratie kan er nu ook meteen bij.",
            { n: tasksCreated, name },
          );

  const handleBill = () => {
    setBilling(true);
    try {
      const { invoice: created, alreadyBilled } =
        invoiceService.createInvoiceForSession({
          sessionId,
          clientId,
          clientName: clientName?.trim() || t("chain_client_fallback", "Cliënt"),
          date: sessionDate,
          durationMin,
          amountCents,
        });
      setInvoice(created);
      if (!alreadyBilled) {
        toast.success(t("chain_invoice_created", "Klad aangemaakt."));
      }
    } catch {
      toast.error(
        t("chain_invoice_failed", "Kon geen klad aanmaken voor deze sessie."),
      );
    } finally {
      setBilling(false);
    }
  };

  const openAttest = () => {
    setAttest(
      invoiceService.buildAttestForSession({
        sessionId,
        clientId,
        clientName: clientName?.trim() || t("chain_client_fallback", "Cliënt"),
        date: sessionDate,
        durationMin,
        amountCents,
      }),
    );
    setAttestOpen(true);
  };

  const goToInvoicing = () => {
    onDone();
    navigate("/dashboard/therapist/invoicing");
  };

  const invoiceTotal = invoice
    ? invoiceService.computeTotals(invoice).grossCents
    : 0;

  return (
    <div className="space-y-5 px-5 py-6">
      {/* Confirmation */}
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"
          aria-hidden="true"
        >
          <Check className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-body font-semibold text-foreground">
            {t("chain_signed", "Notitie ondertekend.")}
          </p>
          <p className="mt-0.5 text-body-sm text-muted-foreground">{signedLine}</p>
        </div>
      </div>

      {/* Step 1 — factuur */}
      <div className="rounded-card border border-border bg-card p-4">
        <div className="flex items-start gap-2.5">
          <Receipt
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-body-sm font-medium text-foreground">
              {t("chain_bill_title", "Factureer deze sessie")}
            </p>

            {invoice ? (
              <>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge variant={invoice.status === "draft" ? "outline" : "success"}>
                    {invoice.status === "draft"
                      ? t("chain_invoice_draft", "Klad")
                      : t("chain_invoice_issued", "Verstuurd")}
                  </Badge>
                  <span className="text-body-sm text-muted-foreground">
                    {invoice.clientName} ·{" "}
                    <span className="tabular">
                      {invoiceService.formatEur(invoiceTotal)}
                    </span>
                  </span>
                </div>
                <p className="mt-1.5 text-body-sm text-muted-foreground">
                  {invoice.number
                    ? t("chain_invoice_number", "Factuur {{number}}.", {
                        number: invoice.number,
                      })
                    : t(
                        "chain_invoice_preview",
                        "Krijgt nummer {{number}} zodra je ze verstuurt.",
                        { number: invoiceService.previewNextNumber() },
                      )}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={goToInvoicing}
                  className="mt-2 rounded-ctl px-2"
                >
                  {t("chain_open_invoicing", "Open in facturatie")}
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Button>
              </>
            ) : (
              <>
                <p className="mt-0.5 text-body-sm text-muted-foreground">
                  {t(
                    "chain_bill_desc",
                    "Zet deze sessie als klad op een factuur. Je verstuurt ze later zelf.",
                  )}
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleBill}
                  disabled={billing}
                  className="mt-2.5 rounded-ctl"
                >
                  {billing ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Receipt className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  )}
                  {t("chain_bill_action", "Factureer deze sessie")}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Step 2 — attest */}
      <div className="rounded-card border border-border bg-card p-4">
        <div className="flex items-start gap-2.5">
          <FileCheck
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-body-sm font-medium text-foreground">
              {t("chain_attest_title", "Terugbetalingsattest")}
            </p>
            <p className="mt-0.5 text-body-sm text-muted-foreground">
              {t(
                "chain_attest_desc",
                "Het blad dat {{name}} bij het ziekenfonds indient. Al ingevuld — je hoeft enkel af te drukken.",
                { name },
              )}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={openAttest}
              className="mt-2.5 rounded-ctl"
            >
              {t("chain_attest_action", "Maak terugbetalingsattest")}
            </Button>
          </div>
        </div>
      </div>

      {/* Dismiss — never blocking */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={onDone}
          className="rounded-ctl"
        >
          {t("chain_done", "Klaar")}
        </Button>
      </div>

      {attest ? (
        <AttestDialog
          open={attestOpen}
          onOpenChange={setAttestOpen}
          attest={attest}
        />
      ) : null}
    </div>
  );
};

export default PostSignChain;
