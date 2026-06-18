import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface DataCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  isLoading?: boolean;
  actions?: React.ReactNode;
}

const DataCard = ({
  title,
  description,
  children,
  className,
  headerClassName,
  contentClassName,
  isLoading = false,
  actions,
}: DataCardProps) => {
  const { t } = useTranslation();
  const baseClassName = "bg-[#111111] border-[#1f1f23]";

  if (isLoading) {
    return (
      <Card className={cn(baseClassName, className)}>
        {(title || description) && (
          <CardHeader className={headerClassName}>
            {title && (
              <div className="h-6 w-32 bg-[#1a1a1a] rounded animate-pulse mb-2" />
            )}
            {description && (
              <div className="h-4 w-48 bg-[#1a1a1a] rounded animate-pulse" />
            )}
          </CardHeader>
        )}
        <CardContent className={contentClassName}>
          <div className="space-y-3">
            <div className="h-4 w-full bg-[#1a1a1a] rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-[#1a1a1a] rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-[#1a1a1a] rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(baseClassName, className)}>
      {(title || description || actions) && (
        <CardHeader className={headerClassName}>
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <CardTitle className="text-white text-lg">
                  {t(title)}
                </CardTitle>
              )}
              {description && (
                <CardDescription className="text-gray-400 text-sm">
                  {t(description)}
                </CardDescription>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className={contentClassName}>
        {children}
      </CardContent>
    </Card>
  );
};

export default DataCard;