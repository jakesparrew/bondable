import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Check } from "lucide-react";
import { toast } from "@/hooks/ui/use-toast";

interface Plan {
  id: "free" | "basic" | "pro";
  name: string;
  description: string;
  monthly: number; // EUR per month
  yearly: number;  // EUR per year
  features: string[];
  highlight?: boolean;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "Get started with core features",
    monthly: 0,
    yearly: 0,
    features: ["1 active client", "Basic messaging", "Community support"],
  },
  {
    id: "basic",
    name: "€25",
    description: "Essentials for small practices",
    monthly: 25,
    yearly: 250, // 2 months free
    features: ["Up to 25 clients", "Appointments & reminders", "Email support"],
  },
  {
    id: "pro",
    name: "€55 (Pro)",
    description: "Advanced tools for growing teams",
    monthly: 55,
    yearly: 550, // 2 months free
    features: [
      "Unlimited clients",
      "Advanced analytics",
      "Priority support",
      "Integrations (Calendar, etc.)",
    ],
    highlight: true,
  },
];

const PricingSection = () => {
  const [isYearly, setIsYearly] = useState(false);

  const onSelectPlan = (planId: Plan["id"]) => {
    toast({ title: "Billing is coming soon", description: `Plan “${planId}” selection will be available shortly.` });
  };

  return (
    <Card className="bg-[#111111]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Pricing</CardTitle>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className={!isYearly ? "font-medium text-foreground" : ""}>Monthly</span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} aria-label="Toggle billing period" />
            <span className={isYearly ? "font-medium text-foreground" : ""}>Yearly</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Separator />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const isPro = plan.highlight;
            return (
              <div
                key={plan.id}
                className={[
                  "rounded-lg border p-5 transition-shadow",
                  "bg-card text-card-foreground",
                  isPro
                    ? "border-primary/50 bg-gradient-to-b from-primary/10 to-background shadow-lg"
                    : "border-border",
                ].join(" ")}
              >
                {isPro && (
                  <div className="mb-3 inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                    Most Popular
                  </div>
                )}
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-3xl font-semibold">
                    {plan.monthly === 0
                      ? "€0"
                      : isYearly
                      ? `€${plan.yearly}`
                      : `€${plan.monthly}`}
                  </span>
                  <span className="text-muted-foreground">{isYearly ? "/yr" : "/mo"}</span>
                </div>

                <Separator className="my-4" />

                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="mt-5 w-full"
                  variant={isPro ? "default" : "outline"}
                  onClick={() => onSelectPlan(plan.id)}
                >
                  Choose plan
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingSection;
