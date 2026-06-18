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

interface TasksSkeletonProps {
  userType: "therapist" | "client" | "admin";
}

const TasksSkeleton = ({ userType }: TasksSkeletonProps) => {
  return (
    <DashboardLayout userType={userType}>
      <div className="space-y-4 md:space-y-6 w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          {userType === "therapist" && (
            <Skeleton className="h-10 w-full sm:w-40" />
          )}
        </div>

        {/* Stats Bar */}
        <Card className="bg-[#111111] border-[#1f1f23]">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 md:gap-8 w-full justify-evenly text-xs md:text-sm">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-6" />
                </div>
                <div className="w-px h-4 bg-[#1f1f23]" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-24 hidden sm:block" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="w-px h-4 bg-[#1f1f23] hidden sm:block" />
                <div className="items-center gap-2 hidden sm:flex">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-8" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 order-2">
            <div className="flex gap-3 md:gap-4">
              <Skeleton className="h-10 w-full sm:w-36" />
              <Skeleton className="h-10 w-full sm:w-36" />
            </div>
          </div>
        </div>

        {/* Tasks Table - Desktop */}
        <Card className="bg-[#111111] border-[#1f1f23] hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#1f1f23] hover:bg-transparent">
                    <TableHead>
                      <Skeleton className="h-4 w-10" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-24" />
                    </TableHead>
                    {userType === "therapist" && (
                      <TableHead>
                        <Skeleton className="h-4 w-16" />
                      </TableHead>
                    )}
                    {userType === "client" && (
                      <TableHead>
                        <Skeleton className="h-4 w-20" />
                      </TableHead>
                    )}
                    <TableHead>
                      <Skeleton className="h-4 w-14" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-4 w-8" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <TableRow key={i} className="border-[#1f1f23]">
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-64" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Skeleton className="h-7 w-7 rounded-full" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Task Cards */}
        <div className="md:hidden space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="bg-[#111111] border-[#1f1f23]">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>

                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-5/6" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-4 w-10" />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#1f1f23]">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <Skeleton className="h-4 w-24" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TasksSkeleton;