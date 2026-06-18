import DashboardLayout from "@/components/layout/DashboardLayout";

import { Skeleton } from "@/components/ui/skeleton";

interface MessagesSkeletonProps {
  userType: "therapist" | "client" | "admin";
}

const MessagesSkeleton = ({ userType }: MessagesSkeletonProps) => {
  return (
    <DashboardLayout userType={userType} contentClassName="!p-0">
      <div className="h-screen w-full overflow-x-hidden flex flex-col md:flex-row">
        {/* Conversations List */}
        <div className="w-full md:w-80 h-full bg-[#111111] border-b md:border-b-0 md:border-r border-[#1f1f23] flex flex-col">
          <div className="p-3 md:p-4 border-b border-[#1f1f23]">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 md:h-6 w-16 md:w-20" />
              <Skeleton className="h-6 md:h-8 w-6 md:w-8" />
            </div>
            <Skeleton className="h-9 md:h-10 w-full" />
          </div>
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="flex items-center space-x-2 md:space-x-3 p-2 md:p-3 rounded-lg border border-[#1f1f23] bg-[#1a1a1a] cursor-pointer"
              >
                <Skeleton className="h-8 md:h-10 w-8 md:w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 md:h-4 w-20 md:w-24" />
                    <Skeleton className="h-3 w-10 md:w-12" />
                  </div>
                  <Skeleton className="h-3 w-24 md:w-32" />
                </div>
                <Skeleton className="h-3 md:h-4 w-3 md:w-4 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="hidden md:flex flex-1 bg-[#111111] flex-col">
          {/* Chat Header */}
          <div className="p-3 md:p-4 border-b border-[#1f1f23]">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-8 md:h-10 w-8 md:w-10 rounded-full" />
              <div>
                <Skeleton className="h-4 md:h-5 w-24 md:w-32" />
                <Skeleton className="h-3 w-16 md:w-20 mt-1" />
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className={`flex ${
                  i % 2 === 0 ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex items-start space-x-2 max-w-xs md:max-w-md ${
                    i % 2 === 0 ? "flex-row-reverse space-x-reverse" : ""
                  }`}
                >
                  <Skeleton className="h-6 md:h-8 w-6 md:w-8 rounded-full flex-shrink-0" />
                  <div className="space-y-1">
                    <Skeleton
                      className={`h-10 md:h-12 rounded-lg ${
                        i % 2 === 0
                          ? "w-40 md:w-48 bg-[#1a1a1a]"
                          : "w-32 md:w-40 bg-[#2b2b2b]"
                      }`}
                    />
                    <Skeleton
                      className={`h-2 md:h-3 w-10 md:w-12 ${
                        i % 2 === 0 ? "ml-auto" : ""
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="p-3 md:p-4 border-t border-[#1f1f23]">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 md:h-8 w-6 md:w-8" />
              <Skeleton className="h-9 md:h-10 flex-1" />
              <Skeleton className="h-6 md:h-8 w-6 md:w-8" />
              <Skeleton className="h-9 md:h-10 w-12 md:w-16" />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MessagesSkeleton;
