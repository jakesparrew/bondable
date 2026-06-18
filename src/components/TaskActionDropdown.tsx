
/**
 * TaskActionDropdown Component
 * 
 * A dropdown menu component that provides context-specific actions for tasks.
 * Actions vary based on user type (therapist/client) and task status.
 * 
 * @example
 * ```tsx
 * <TaskActionDropdown
 *   task={{ id: "123", status: "assigned" }}
 *   userType="client"
 *   onViewDetails={() => console.log("View details")}
 *   onStatusChange={(taskId, status) => updateTaskStatus(taskId, status)}
 * />
 * ```
 */

import { Button } from "@/components/ui/button";
import console from "@/lib/production-console";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { memo } from "react";
import { useOptimizedState, useOptimizedCallback } from '@/hooks/performance/useOptimizedComponents';
import type { TaskStatus } from "@/types/global";
import { useTranslation } from "react-i18next";

/**
 * Props for the TaskActionDropdown component
 */

interface TaskActionDropdownProps {
  /** Task object containing id and status */
  task: {
    id: string;
    status: TaskStatus;
  };
  /** Type of user interacting with the task (determines available actions) */
  userType: "therapist" | "client";
  /** Callback function when "View Details" is clicked */
  onViewDetails: () => void;
  /** Optional callback for editing task (therapist only) */
  onEditTask?: () => void;
  /** Optional callback for deleting task (therapist only) */
  onDeleteTask?: () => void;
  /** Optional callback for changing task status */
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
}

/**
 * Dropdown menu component for task-related actions
 * 
 * Provides different action sets based on user type:
 * - Therapists: View, Edit, Delete
 * - Clients: View, Status Updates (Mark In Progress, Complete, Decline)
 * 
 * @param props - Component props
 * @returns JSX element representing the dropdown menu
 */

function TaskActionDropdown({
  task,
  userType,
  onViewDetails,
  onEditTask,
  onDeleteTask,
  onStatusChange,
}: TaskActionDropdownProps) {
  const [isOpen, setIsOpen] = useOptimizedState(false);
  const { t } = useTranslation();

  /**
   * Handles menu action execution with proper dropdown state management
   * Ensures dropdown closes before executing the action to prevent UI conflicts
   * 
   * @param action - Function to execute after dropdown closes
   */
  const handleMenuAction = (action: () => void) => {
    // Close dropdown first
    setIsOpen(false);
    
    // Use requestAnimationFrame to ensure dropdown is closed before action
    requestAnimationFrame(() => {
      action();
    });
  };

  /**
   * Handles task status changes
   * 
   * @param status - New status to set for the task
   */

  const handleStatusChange = useOptimizedCallback((status: TaskStatus) => {
    if (onStatusChange) {
      handleMenuAction(() => onStatusChange(task.id, status));
    }
  }, [onStatusChange, handleMenuAction, task.id]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-neutral-700"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-[#111111] border-[#1f1f23] z-50"
        onCloseAutoFocus={(e) => {
          // Prevent auto focus to avoid focus trapping
          e.preventDefault();
        }}
        onClick={(e) => {
          // Prevent event bubbling
          e.stopPropagation();
        }}
      >
        <DropdownMenuItem
          className="text-gray-300 hover:bg-[#1a1a1a] cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleMenuAction(onViewDetails);
          }}
        >
          {t("view_details")}
        </DropdownMenuItem>
        
        {userType === "therapist" && onEditTask && (
          <DropdownMenuItem
            className="text-gray-300 hover:bg-[#1a1a1a] cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleMenuAction(onEditTask);
            }}
          >
            {t("edit_task")}
          </DropdownMenuItem>
        )}
        
        {userType === "client" && task.status === "assigned" && (
          <>
            <DropdownMenuSeparator className="bg-[#1f1f23]" />
            <DropdownMenuItem
              className="text-yellow-400 hover:bg-[#1a1a1a] cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange("in_progress");
              }}
            >
              {t("mark_in_progress")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-green-400 hover:bg-[#1a1a1a] cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange("completed");
              }}
            >
              {t("mark_complete")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-400 hover:bg-[#1a1a1a] cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange("denied");
              }}
            >
              {t("decline_task")}
            </DropdownMenuItem>
          </>
        )}
        
        {userType === "client" && task.status === "in_progress" && (
          <>
            <DropdownMenuSeparator className="bg-[#1f1f23]" />
            <DropdownMenuItem
              className="text-green-400 hover:bg-[#1a1a1a] cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange("completed");
              }}
            >
              {t("mark_complete")}
            </DropdownMenuItem>
          </>
        )}
        
        {userType === "therapist" && onDeleteTask && (
          <DropdownMenuItem
            className="text-red-400 hover:bg-[#1a1a1a] cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleMenuAction(onDeleteTask);
            }}
          >
            {t("delete")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default memo(TaskActionDropdown);
