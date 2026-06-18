import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  isLoading?: boolean;
  onClick?: () => void;
  variant?: "default" | "hover";
}

const StatCard = ({
  title,
  value,
  subtext,
  icon: Icon,
  className,
  isLoading = false,
  onClick,
  variant = "default",
}: StatCardProps) => {
  const { t } = useTranslation();
  const baseClassName = "bg-card border-border";
  const hoverClassName = variant === "hover" ? "hover:bg-muted transition-colors" : "";
  const clickableClassName = onClick ? "cursor-pointer" : "";

  if (isLoading) {
    return (
      <Card className={cn(baseClassName, className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            {Icon && <div className="h-4 w-4 bg-muted rounded animate-pulse" />}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-8 w-16 bg-muted rounded animate-pulse mb-2" />
          {subtext && <div className="h-3 w-24 bg-muted rounded animate-pulse" />}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(baseClassName, hoverClassName, clickableClassName, className)}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t(title)}
          </CardTitle>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={cn(
          "font-semibold text-foreground",
          typeof value === "string" && value.includes("None") ? "text-lg" : "text-2xl"
        )}>
          {value}
        </div>
        {subtext && (
          <div className="text-xs text-muted-foreground mt-1">
            {subtext}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;