import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DashboardSkeletonProps {
  userType: "therapist" | "client" | "admin";
}

const DashboardSkeleton = ({ userType }: DashboardSkeletonProps) => {
  return (
    <DashboardLayout userType={userType}>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col gap-2">
          <div>
            <Skeleton className="h-6 sm:h-8 w-48 sm:w-64 mb-2" />
            <Skeleton className="h-3 sm:h-4 w-full max-w-80" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-[#111111] border-[#1f1f23]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <Card className="bg-[#111111] border-[#1f1f23]">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-white">
                  <Skeleton className="h-6 w-40" />
                </CardTitle>
                <div className="mt-1">
                  <Skeleton className="h-4 w-full max-w-64" />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#1f1f23] hover:bg-transparent">
                    <TableHead>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead className="text-right">
                      <Skeleton className="h-4 w-10 ml-auto" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <TableRow key={i} className="border-[#1f1f23]">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-[#1a1a1a] rounded-lg flex items-center justify-center">
                            <Skeleton className="h-4 w-4" />
                          </div>
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="block sm:hidden space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-[#0a0a0a] border border-[#1f1f23] rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-[#1a1a1a] rounded-lg flex items-center justify-center">
                      <Skeleton className="h-4 w-4" />
                    </div>
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardSkeleton;