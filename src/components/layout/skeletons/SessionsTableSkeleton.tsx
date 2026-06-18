import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SessionsTableSkeletonProps {
  userType: "therapist" | "client" | "admin";
}

const SessionsTableSkeleton = ({ userType }: SessionsTableSkeletonProps) => {
  return (
    <DashboardLayout userType={userType}>
      <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-7 w-20 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex flex-row gap-2 w-full">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </div>
        {/* Sessions Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/20 border border-border">
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
              <Skeleton className="h-4 w-32" />
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
              <Skeleton className="h-4 w-28" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-6 mt-6">
            {/* Date Group 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-16" />
                <div className="h-px flex-1 bg-border"></div>
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="grid gap-3">
                {[1, 2].map((i) => (
                  <Card key={i} className="bg-[#111111] border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div>
                            <Skeleton className="h-5 w-32 mb-1" />
                            <Skeleton className="h-4 w-40" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Skeleton className="h-8 w-24" />
                        {Math.random() > 0.5 && (
                          <Skeleton className="h-8 w-20" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Date Group 2 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-20" />
                <div className="h-px flex-1 bg-border"></div>
                <Skeleton className="h-4 w-18" />
              </div>
              <div className="grid gap-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-[#111111] border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div>
                            <Skeleton className="h-5 w-28 mb-1" />
                            <Skeleton className="h-4 w-36" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-18 rounded-full" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                        {Math.random() > 0.7 && (
                          <Skeleton className="h-4 w-44 mt-2" />
                        )}
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Skeleton className="h-8 w-24" />
                        {Math.random() > 0.6 && (
                          <Skeleton className="h-8 w-20" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6 mt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-24" />
                <div className="h-px flex-1 bg-border"></div>
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="grid gap-3">
                {[1, 2].map((i) => (
                  <Card key={i} className="bg-[#111111] border-border opacity-75">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div>
                            <Skeleton className="h-5 w-30 mb-1" />
                            <Skeleton className="h-4 w-38" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-22 rounded-full" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-30" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-22" />
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Skeleton className="h-8 w-24" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SessionsTableSkeleton;