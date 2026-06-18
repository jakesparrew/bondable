import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SessionsSkeletonProps {
  userType: "therapist" | "client" | "admin";
}

const SessionsSkeleton = ({ userType }: SessionsSkeletonProps) => {
  return (
    <DashboardLayout userType={userType}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div>
            <Skeleton className="h-6 sm:h-8 w-20 mb-1" />
            <Skeleton className="h-3 sm:h-4 w-48 sm:w-64" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Skeleton className="h-9 w-full sm:w-24" />
            <Skeleton className="h-9 w-full sm:w-32" />
          </div>
        </div>

        {/* Client Filter (if present) */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-6 w-6" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#1a1a1a] border border-[#333]">
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-[#333] data-[state=active]:text-white">
              <Skeleton className="h-4 w-20" />
            </TabsTrigger>
            <TabsTrigger value="past" className="data-[state=active]:bg-[#333] data-[state=active]:text-white">
              <Skeleton className="h-4 w-16" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="bg-[#111111] border-[#1f1f23]">
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
                      {Math.random() > 0.6 && (
                        <Skeleton className="h-4 w-48 mt-2" />
                      )}
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
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-[#111111] border-[#1f1f23] opacity-75">
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SessionsSkeleton;