import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface SettingsSkeletonProps {
  userType: "therapist" | "client" | "admin";
}

const SettingsSkeleton = ({ userType }: SettingsSkeletonProps) => {
  return (
    <DashboardLayout userType={userType}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-20 mb-1" />
            <Skeleton className="h-4 w-full max-w-80" />
          </div>
        </div>

        {/* Profile Management */}
        <Card className="bg-muted border-border">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-5 w-5" />
              <CardTitle className="text-foreground text-lg">
                <Skeleton className="h-6 w-36" />
              </CardTitle>
            </div>
            <CardDescription>
              <Skeleton className="h-4 w-full max-w-64" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-border rounded-lg bg-background">
              <div>
                <Skeleton className="h-5 w-48 mb-1" />
                <Skeleton className="h-4 w-full max-w-64" />
              </div>
              <Skeleton className="h-10 w-full sm:w-32" />
            </div>
          </CardContent>
        </Card>

        {/* Theme Selection */}
        <Card className="bg-muted border-border">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-5 w-5" />
              <CardTitle className="text-foreground text-lg">
                <Skeleton className="h-6 w-16" />
              </CardTitle>
            </div>
            <CardDescription>
              <Skeleton className="h-4 w-full max-w-56" />
            </CardDescription>
          </CardHeader>
          <CardContent>
          <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="bg-muted border-border">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-5 w-5" />
              <CardTitle className="text-foreground text-lg">
                <Skeleton className="h-6 w-48" />
              </CardTitle>
            </div>
            <CardDescription>
              <Skeleton className="h-4 w-72" />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-11 rounded-full" />
                  </div>
                  {i < 4 && <Separator className="bg-border mt-4" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Language Selector */}
        <div className="flex flex-col sm:flex-row sm:justify-end">
          <Skeleton className="h-10 w-full sm:w-48" />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsSkeleton;