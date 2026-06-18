
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useParams } from "react-router-dom";
import { CreditCard, TrendingUp, Clock, LifeBuoy, Bell, BookOpenText } from "lucide-react";
import InvoiceGenerator from "@/components/InvoiceGenerator";
import PaymentHistoryTable from "@/components/tables/PaymentHistoryTable";
import BusinessSettingsDialog from "@/components/dialogs/BusinessSettingsDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Payments = () => {
  const { t } = useTranslation();
  const { userType } = useParams();

  const bankTransferItems = [
    {
      id: "1",
      icon: CreditCard,
      title: t("bank_details"),
      sub: t("account_info_wire_transfers"),
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <span className="text-muted-foreground">{t("bank_name")}:</span>&nbsp;<span className="text-foreground">Chase Bank</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <span className="text-muted-foreground">{t("account_name")}:</span>&nbsp;<span className="text-foreground">Bondable Therapy Services</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <span className="text-muted-foreground">{t("iban")}:</span>&nbsp;<span className="text-foreground font-mono text-sm break-all">US64 SVBK US6S 3300 0000 0000 0000 00</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <span className="text-muted-foreground">{t("swift_code")}:</span>&nbsp;<span className="text-foreground">CHASUS33</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "2",
      icon: BookOpenText,
      title: t("payment_instructions"),
      sub: t("important_payment_guidelines"),
      content: (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>{t("include_invoice_number")}</p>
          <p>{t("payments_due_14_days")}</p>
          <p>{t("late_fees_may_apply")}</p>
          <p>{t("contact_payment_questions")}</p>
        </div>
      ),
    },
    {
      id: "3",
      icon: LifeBuoy,
      title: t("support_contact"),
      sub: t("need_help_payment"),
      content: (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>{t("issues_questions_invoice")}</p>
          <p>{t("email_billing")} <span className="text-foreground">billing@bondable.co</span></p>
          <p>{t("call_billing_dept")} <span className="text-foreground">+1 (555) 123-4567</span></p>
          <p>{t("support_hours")}</p>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout userType={userType as "therapist" | "client"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{t("payments")}</h2>
            <p className="text-muted-foreground">
              {userType === "therapist" ? t("manage_payments_billing") : t("view_payment_history")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {userType === "therapist" && (
              <>
                <BusinessSettingsDialog />
                <InvoiceGenerator />
              </>
            )}
          </div>
        </div>

        {/* Bank Transfer Information with Accordion - Only for therapists */}
        {userType === "therapist" && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground text-lg">{t("bank_transfer_information")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full" defaultValue="1">
                {bankTransferItems.map((item) => (
                  <AccordionItem 
                    value={item.id} 
                    key={item.id} 
                    className="py-2 border-border"
                  >
                    <AccordionTrigger className="flex flex-1 items-center justify-between rounded-md py-2 text-left text-[15px] leading-6 font-semibold transition-all outline-none hover:no-underline [&[data-state=open]>svg]:rotate-180">
                      <span className="flex items-center gap-3">
                        <span
                          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background"
                          aria-hidden="true"
                        >
                          <item.icon size={16} className="opacity-60 text-muted-foreground" />
                        </span>
                        <span className="flex flex-col space-y-1">
                          <span className="text-foreground">{item.title}</span>
                          {item.sub && (
                            <span className="text-sm font-normal text-muted-foreground">{item.sub}</span>
                          )}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="ms-3 ps-10 pb-2">
                      {item.content}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Payments Table with Stats and Pagination */}
        <PaymentHistoryTable userType={userType as "therapist" | "client"} />
      </div>
    </DashboardLayout>
  );
};

export default Payments;
