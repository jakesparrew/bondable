import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  userType: "therapist" | "client" | "admin";
  title?: string;
}

const TableSkeleton = ({ userType, title = "Loading..." }: TableSkeletonProps) => {
  return (
    <DashboardLayout userType="therapist">
      <div className="space-y-6">
        {/* Header */}
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

        {/* Main Table Card */}
        <Card className="bg-[#111111] border-[#1f1f23]">
          <CardContent className="px-3 sm:px-6 pt-4">
            {/* Search and Filters */}
            <div className="mb-4 space-y-3 flex flex-col">
              <Skeleton className="h-10 flex-1" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 flex-1" />
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-[#1f1f23] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#0a0a0a]">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <Skeleton className="h-4 w-12 " />
                      </th>
                      <th className="px-4 py-3 text-left">
                        <Skeleton className="h-4 w-12 " />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <tr key={i} className="border-t border-[#1f1f23]">
                        <td className="px-4 py-3 text-left">
                          <Skeleton className="h-8 w-8 " />
                        </td>
                        <td className="px-4 py-3 text-left">
                          <Skeleton className="h-8 w-full o" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <Skeleton className="h-4 w-32" />
              <div className="flex items-center space-x-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TableSkeleton;