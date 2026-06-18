import { supabase } from '@/integrations/supabase/client';

import console from "@/lib/production-console";

import type { Task } from '@/types/global';

export interface TaskCreate {
  client_id: string;
  therapist_id: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  notes?: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: 'assigned' | 'in_progress' | 'completed' | 'denied';
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  notes?: string;
  denied_reason?: string;
  client_id?: string;
}

export interface TaskFilters {
  therapistId?: string;
  clientId?: string;
  status?: string;
  priority?: string;
  dueBefore?: string;
  dueAfter?: string;
  overdue?: boolean;
}

export interface TaskWithProfiles extends Task {
  client?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    full_name?: string;
  };
  therapist?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    full_name?: string;
  };
}

/**
 * Service class for task management operations
 * Centralizes all task-related database operations
 */
export class TaskService {
  /**
   * Create a new task
   */
  static async createTask(taskData: TaskCreate): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...taskData,
        assigned_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      throw new Error(`Failed to create task: ${error.message}`);
    }

    return {
      ...data,
      status: data.status as 'assigned' | 'in_progress' | 'completed' | 'denied',
      priority: data.priority as 'low' | 'medium' | 'high',
    };
  }

  /**
   * Get task by ID
   */
  static async getTask(taskId: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching task:', error);
      throw new Error(`Failed to fetch task: ${error.message}`);
    }

    return {
      ...data,
      status: data.status as 'assigned' | 'in_progress' | 'completed' | 'denied',
      priority: data.priority as 'low' | 'medium' | 'high',
    };
  }

  /**
   * Get tasks with filters
   */
  static async getTasks(filters: TaskFilters = {}): Promise<TaskWithProfiles[]> {
    let query = supabase.from('tasks').select(`
      *,
      client:profiles!tasks_client_id_fkey(id, first_name, last_name, email),
      therapist:profiles!tasks_therapist_id_fkey(id, first_name, last_name, email)
    `);

    // Apply filters
    if (filters.therapistId) {
      query = query.eq('therapist_id', filters.therapistId);
    }

    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }

    if (filters.dueBefore) {
      query = query.lte('due_date', filters.dueBefore);
    }

    if (filters.dueAfter) {
      query = query.gte('due_date', filters.dueAfter);
    }

    if (filters.overdue) {
      const today = new Date().toISOString().split('T')[0];
      query = query.lt('due_date', today).neq('status', 'completed');
    }

    // Order by priority and due date
    query = query.order('priority', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    return (data as TaskWithProfiles[]) ? (data as TaskWithProfiles[]).map(task => ({
      ...task,
      status: task.status as 'assigned' | 'in_progress' | 'completed' | 'denied',
      priority: task.priority as 'low' | 'medium' | 'high',
      client: task.client,
      therapist: task.therapist,
    })) : [];
  }

  /**
   * Get therapist tasks
   */
  static async getTherapistTasks(therapistId: string): Promise<Task[]> {
    return this.getTasks({ therapistId });
  }

  /**
   * Get client tasks
   */
  static async getClientTasks(clientId: string): Promise<Task[]> {
    return this.getTasks({ clientId });
  }

  /**
   * Get overdue tasks
   */
  static async getOverdueTasks(userId: string, userRole: 'client' | 'therapist'): Promise<Task[]> {
    const filters: TaskFilters = { overdue: true };
    
    if (userRole === 'therapist') {
      filters.therapistId = userId;
    } else {
      filters.clientId = userId;
    }

    return this.getTasks(filters);
  }

  /**
   * Get upcoming tasks (due in next 7 days)
   */
  static async getUpcomingTasks(userId: string, userRole: 'client' | 'therapist'): Promise<Task[]> {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const filters: TaskFilters = {
      dueAfter: today.toISOString().split('T')[0],
      dueBefore: nextWeek.toISOString().split('T')[0],
    };
    
    if (userRole === 'therapist') {
      filters.therapistId = userId;
    } else {
      filters.clientId = userId;
    }

    return this.getTasks(filters);
  }

  /**
   * Update task
   */
  static async updateTask(taskId: string, updates: TaskUpdate): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      throw new Error(`Failed to update task: ${error.message}`);
    }

    return {
      ...data,
      status: data.status as 'assigned' | 'in_progress' | 'completed' | 'denied',
      priority: data.priority as 'low' | 'medium' | 'high',
    };
  }

  /**
   * Complete task
   */
  static async completeTask(taskId: string, notes?: string): Promise<Task> {
    const updates: TaskUpdate = {
      status: 'completed',
    };

    if (notes) {
      updates.notes = notes;
    }

    return this.updateTask(taskId, updates);
  }

  /**
   * Mark task as in progress
   */
  static async markTaskInProgress(taskId: string): Promise<Task> {
    return this.updateTask(taskId, { status: 'in_progress' });
  }

  /**
   * Deny task
   */
  static async denyTask(taskId: string, reason: string): Promise<Task> {
    return this.updateTask(taskId, { 
      status: 'denied',
      denied_reason: reason,
    });
  }

  /**
   * Delete task
   */
  static async deleteTask(taskId: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Error deleting task:', error);
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }

  /**
   * Get task statistics
   */
  static async getTaskStats(userId: string, userRole: 'client' | 'therapist') {
    const filters: TaskFilters = {};
    
    if (userRole === 'therapist') {
      filters.therapistId = userId;
    } else {
      filters.clientId = userId;
    }

    const allTasks = await this.getTasks(filters);
    
    const today = new Date().toISOString().split('T')[0];
    
    const stats = {
      total: allTasks.length,
      assigned: allTasks.filter(t => t.status === 'assigned').length,
      inProgress: allTasks.filter(t => t.status === 'in_progress').length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      denied: allTasks.filter(t => t.status === 'denied').length,
      overdue: allTasks.filter(t => 
        t.due_date && 
        t.due_date < today && 
        t.status !== 'completed'
      ).length,
      highPriority: allTasks.filter(t => t.priority === 'high').length,
      mediumPriority: allTasks.filter(t => t.priority === 'medium').length,
      lowPriority: allTasks.filter(t => t.priority === 'low').length,
    };

    return stats;
  }

  /**
   * Get clients for therapist (for task assignment)
   */
  static async getClientsForTherapist(therapistId: string): Promise<Array<{
    id: string;
    name: string;
    initials: string;
  }>> {
    const { data, error } = await supabase
      .from('client_therapist_relationships')
      .select(`
        client_id,
        profiles!client_therapist_relationships_client_id_fkey (
          id,
          first_name,
          last_name
        )
      `)
      .eq('therapist_id', therapistId)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching therapist clients:', error);
      throw new Error(`Failed to fetch therapist clients: ${error.message}`);
    }

    const mapped = data ? data.map(rel => {
      const profile = rel.profiles as any;
      return {
        id: profile.id,
        name: `${profile.first_name} ${profile.last_name}`.trim(),
        initials: `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase(),
      };
    }) : [];
    return mapped.filter((item): item is { id: string; name: string; initials: string } => Boolean(item));
  }

  /**
   * Bulk update tasks
   */
  static async bulkUpdateTasks(taskIds: string[], updates: TaskUpdate): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .in('id', taskIds)
      .select();

    if (error) {
      console.error('Error bulk updating tasks:', error);
      throw new Error(`Failed to bulk update tasks: ${error.message}`);
    }

    return data ? data.map(task => ({
      ...task,
      status: task.status as 'assigned' | 'in_progress' | 'completed' | 'denied',
      priority: task.priority as 'low' | 'medium' | 'high',
    })) : [];
  }

  /**
   * Get task completion rate for a client
   */
  static async getClientTaskCompletionRate(clientId: string): Promise<{
    total: number;
    completed: number;
    completionRate: number;
  }> {
    const tasks = await this.getClientTasks(clientId);
    const completed = tasks.filter(t => t.status === 'completed').length;
    
    return {
      total: tasks.length,
      completed,
      completionRate: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
    };
  }
}