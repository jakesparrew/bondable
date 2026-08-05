import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Copy, Printer } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { invoiceService, type AttestPayload } from "@/services/api/invoiceService";

/**
 * AttestDialog — the terugbetalingsattest, previewed and printed in one step.
 *
 * The most-hated paperwork in a Belgian practice: the sheet a client submits to
 * CM / Helan / Solidaris to get part of the session back. It exists nowhere as a
 * form — every provider retypes it. Here it is already filled in from the
 * session and the provider's billing settings; the only optional keystroke is
 * the rijksregisternummer, which we never store.
 *
 * Two ways out, because printers fail: "Afdrukken / opslaan als pdf" fires
 * window.print() against a print stylesheet scoped to this card, and "Kopieer
 * gegevens" puts the same content on the clipboard as plain text.
 *
 * Bondable never promises reimbursement — the ziekenfonds decides. That line is
 * printed on the attest itself.
 */

const PRINT_ROOT_ID = "bondable-attest-print";

/**
 * Print stylesheet, scoped to this card. Radix renders the dialog into a portal
 * on <body>, so we blank everything by visibility and lift only the attest back
 * into view, undoing the dialog's centering transform for the printed page.
 */
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 16mm; }
  html, body { background: #fff !important; }
  body * { visibility: hidden !important; }
  #${PRINT_ROOT_ID}, #${PRINT_ROOT_ID} * { visibility: visible !important; }
  [data-attest-dialog] {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    transform: none !important;
    width: 100% !important;
    max-width: none !important;
    max-height: none !important;
    overflow: visible !important;
    border: 0 !important;
    box-shadow: none !important;
    padding: 0 !important;
    gap: 0 !important;
  }
  #${PRINT_ROOT_ID} {
    border: 0 !important;
    box-shadow: none !important;
    padding: 0 !important;
    min-height: 0 !important;
  }
  [data-attest-noprint] { display: none !important; }
}
`;

export interface AttestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-built payload (invoiceService.buildAttestForSession / …ForInvoice). */
  attest: AttestPayload;
}

const AttestDialog: React.FC<AttestDialogProps> = ({
  open,
  onOpenChange,
  attest,
}) => {
  const { t, i18n } = useTranslation();
  const locale = (i18n.language || "nl").startsWith("nl") ? "nl-BE" : "en-GB";

  const [nationalNumber, setNationalNumber] = React.useState(
    attest.client.nationalNumber,
  );

  React.useEffect(() => {
    if (open) setNationalNumber(attest.client.nationalNumber);
  }, [open, attest.client.nationalNumber]);

  const payload: AttestPayload = React.useMemo(
    () => ({
      ...attest,
      client: { ...attest.client, nationalNumber: nationalNumber.trim() },
    }),
    [attest, nationalNumber],
  );

  const fmtDate = React.useCallback(
    (iso: string): string => {
      const d = new Date(`${iso}T00:00:00`);
      if (Number.isNaN(d.getTime())) return iso;
      return new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d);
    },
    [locale],
  );

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  const handleCopy = async () => {
    const text = invoiceService.formatAttestText(payload);
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("attest_copied", "Gegevens gekopieerd."));
    } catch {
      toast.error(
        t("attest_copy_failed", "Kopiëren lukte niet. Selecteer de tekst zelf."),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-attest-dialog=""
        className="max-w-2xl gap-4"
      >
        <style>{PRINT_CSS}</style>

        <DialogHeader data-attest-noprint="" className="text-left">
          <DialogTitle className="text-base font-semibold">
            {t("attest_title", "Terugbetalingsattest")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "attest_subtitle",
              "Alles staat al ingevuld. Vul eventueel het rijksregisternummer aan en druk af.",
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Rijksregisternummer — optional, never stored. */}
        <div data-attest-noprint="" className="space-y-1.5">
          <Label htmlFor="attest-rrn" className="text-body-sm">
            {t("attest_rrn_label", "Rijksregisternummer van de cliënt (optioneel)")}
          </Label>
          <Input
            id="attest-rrn"
            value={nationalNumber}
            onChange={(e) => setNationalNumber(e.target.value)}
            placeholder="00.00.00-000.00"
            inputMode="numeric"
            autoComplete="off"
            className="rounded-ctl tabular"
          />
          <p className="text-label text-muted-foreground">
            {t(
              "attest_rrn_hint",
              "Laat gerust leeg — je cliënt kan dit zelf aanvullen. Bondable bewaart dit nummer niet.",
            )}
          </p>
        </div>

        {/* ── The printed sheet ─────────────────────────────────────────── */}
        <div
          id={PRINT_ROOT_ID}
          className="rounded-card border border-border bg-card p-6 text-body-sm text-foreground print:p-0"
        >
          <p className="text-body font-semibold">
            {t("attest_doc_title", "Attest voor terugbetaling")}
          </p>
          <p className="mt-0.5 text-label text-muted-foreground">
            {t(
              "attest_doc_sub",
              "Voor te leggen aan het ziekenfonds",
            )}
          </p>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Provider block */}
            <div>
              <p className="text-label font-medium uppercase tracking-wide text-muted-foreground">
                {t("attest_provider", "Zorgverstrekker")}
              </p>
              <p className="mt-1 font-medium">{payload.provider.name}</p>
              <p className="whitespace-pre-line text-muted-foreground">
                {payload.provider.address}
              </p>
              <dl className="mt-2 space-y-0.5">
                <div className="flex flex-wrap gap-x-1.5">
                  <dt className="text-muted-foreground">
                    {t("attest_kbo", "Ondernemingsnummer")}
                  </dt>
                  <dd className="tabular">{payload.provider.enterpriseNumber}</dd>
                </div>
                <div className="flex flex-wrap gap-x-1.5">
                  <dt className="text-muted-foreground">
                    {t("attest_visum", "Erkennings-/visumnummer")}
                  </dt>
                  <dd className="tabular">{payload.provider.recognitionNumber}</dd>
                </div>
                <div className="flex flex-wrap gap-x-1.5">
                  <dt className="text-muted-foreground">
                    {t("attest_iban", "IBAN")}
                  </dt>
                  <dd className="tabular">{payload.provider.iban}</dd>
                </div>
              </dl>
            </div>

            {/* Client block */}
            <div>
              <p className="text-label font-medium uppercase tracking-wide text-muted-foreground">
                {t("attest_client", "Cliënt")}
              </p>
              <p className="mt-1 font-medium">{payload.client.name}</p>
              <div className="mt-2 flex flex-wrap gap-x-1.5">
                <span className="text-muted-foreground">
                  {t("attest_rrn", "Rijksregisternummer")}
                </span>
                <span className="tabular">
                  {payload.client.nationalNumber || "……………………………"}
                </span>
              </div>
              {payload.invoiceNumber ? (
                <div className="mt-0.5 flex flex-wrap gap-x-1.5">
                  <span className="text-muted-foreground">
                    {t("attest_invoice_number", "Factuurnummer")}
                  </span>
                  <span className="tabular">{payload.invoiceNumber}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Prestations */}
          <div className="mt-6">
            <p className="text-label font-medium uppercase tracking-wide text-muted-foreground">
              {t("attest_lines", "Prestaties")}
            </p>
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {payload.lines.map((line, i) => (
                <li
                  key={`${line.date}-${i}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2"
                >
                  <span className="min-w-0">
                    <span className="tabular text-muted-foreground">
                      {fmtDate(line.date)}
                    </span>
                    <span className="ml-2">{line.description}</span>
                  </span>
                  <span className="tabular font-medium">
                    {invoiceService.formatEur(line.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-baseline justify-between gap-4 pt-2">
              <span className="font-medium">
                {t("attest_total", "Totaal betaald")}
              </span>
              <span className="tabular font-semibold">
                {invoiceService.formatEur(payload.totalCents)}
              </span>
            </div>
          </div>

          {/* Legal + disclaimer */}
          <p className="mt-4 text-label text-muted-foreground">
            {payload.vatClause}
          </p>
          <p className="mt-1 text-label text-muted-foreground">{payload.note}</p>
          <p className="mt-1 text-label text-muted-foreground">
            {t(
              "attest_disclaimer",
              "Dit attest bevestigt de betaalde prestatie. Of en hoeveel er wordt terugbetaald, beslist het ziekenfonds.",
            )}
          </p>

          {/* Signature */}
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <p className="text-muted-foreground">
              {payload.place}, {fmtDate(payload.issuedOn)}
            </p>
            <div className="min-w-[10rem]">
              <div className="h-10 border-b border-border" />
              <p className="mt-1 text-label text-muted-foreground">
                {t("attest_signature", "Handtekening zorgverstrekker")}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          data-attest-noprint=""
          className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
        >
          <Button
            type="button"
            variant="ghost"
            onClick={handleCopy}
            className="rounded-ctl"
          >
            <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t("attest_copy", "Kopieer gegevens")}
          </Button>
          <Button type="button" onClick={handlePrint} className="rounded-ctl">
            <Printer className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t("attest_print", "Afdrukken / opslaan als pdf")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttestDialog;
