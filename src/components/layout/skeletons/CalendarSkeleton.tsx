import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CalendarSkeletonProps {
  userType: "therapist" | "client" | "admin";
}

const CalendarSkeleton = ({ userType }: CalendarSkeletonProps) => {
  return (
    <DashboardLayout userType={userType}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-4 w-full max-w-48" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Skeleton className="h-10 w-full sm:w-40" />
            <Skeleton className="h-10 w-full sm:w-32" />
          </div>
        </div>

        {/* Calendar Grid */}
        <Card className="bg-[#111111] border-[#1f1f23]">
          <CardContent className="p-3 sm:p-6">
            {/* Day headers */}
            <div className="grid grid-cols-3 gap-1 sm:gap-2 mb-4">
              {['Mon', 'Tue', 'Wed'].map((day) => (
                <div key={day} className="text-center p-1 sm:p-2">
                  <Skeleton className="h-3 sm:h-4 w-6 sm:w-8 mx-auto" />
                </div>
              ))}
            </div>
            {/* Calendar days */}
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              {Array.from({ length: 21 }).map((_, i) => (
                <div key={i} className="h-[7rem] sm:h-24 border border-[#1f1f23] rounded p-1 sm:p-2 hover:bg-[#1a1a1a]">
                  <Skeleton className="h-3 sm:h-4 w-4 sm:w-6 mb-1 sm:mb-2" />
                  {Math.random() > 0.3 && (
                    <Skeleton className="h-1 sm:h-2 w-full mb-1" />
                  )}
                  {Math.random() > 0.8 && (
                    <Skeleton className="h-1 sm:h-2 w-3/4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CalendarSkeleton;