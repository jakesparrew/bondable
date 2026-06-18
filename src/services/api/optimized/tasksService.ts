import { supabase } from "@/integrations/supabase/client";
import { CacheManager } from "@/services/cache/CacheManager";
import type { TaskWithProfiles, TaskCreate, TaskUpdate, TaskFilters } from "../TaskService";

export class OptimizedTasksService {
  private static cacheManager = new CacheManager({ defaultTTL: 5 * 60 * 1000 }); 
  private static statsCache = new CacheManager({ defaultTTL: 2 * 60 * 1000 }); 
  private static clientsCache = new CacheManager({ defaultTTL: 10 * 60 * 1000 });

  static async getTasks(
    filters: TaskFilters = {},
    useCache: boolean = true
  ): Promise<TaskWithProfiles[]> {
    const cacheKey = JSON.stringify(filters);
    
    if (useCache) {
      const cached = this.cacheManager.get(cacheKey) as TaskWithProfiles[];
      if (cached) {
        console.log("📋 Returning cached tasks data");
        return cached;
      }
    }

    console.log("📋 Fetching fresh tasks data with filters:", filters);

    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          client:client_id (
            id,
            first_name,
            last_name,
            email
          ),
          therapist:therapist_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

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

      const { data, error } = await query;

      if (error) {
        console.error("❌ Error fetching tasks:", error);
        throw error;
      }

      const tasks = data as unknown as TaskWithProfiles[];
      
      if (useCache) {
        this.cacheManager.set(cacheKey, tasks);
      }

      console.log(`✅ Fetched ${tasks.length} tasks`);
      return tasks;
    } catch (error) {
      console.error("❌ Error in getTasks:", error);
      throw error;
    }
  }

  static async getTaskStats(
    userId: string,
    userRole: 'client' | 'therapist',
    useCache: boolean = true
  ): Promise<{
    total: number;
    assigned: number;
    inProgress: number;
    completed: number;
    denied: number;
    overdue: number;
  }> {
    const cacheKey = `${userId}-${userRole}`;
    
    if (useCache) {
      const cached = this.statsCache.get(cacheKey) as any;
      if (cached) {
        console.log("📊 Returning cached task stats");
        return cached;
      }
    }

    console.log("📊 Fetching fresh task stats");

    try {
      let query = supabase.from('tasks').select('status, due_date');
      
      if (userRole === 'therapist') {
        query = query.eq('therapist_id', userId);
      } else {
        query = query.eq('client_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("❌ Error fetching task stats:", error);
        throw error;
      }

      const tasks = data || [];
      const now = new Date();

      const stats = {
        total: tasks.length,
        assigned: tasks.filter(t => t.status === 'assigned').length,
        inProgress: tasks.filter(t => t.status === 'in-progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        denied: tasks.filter(t => t.status === 'denied').length,
        overdue: tasks.filter(t => 
          t.status !== 'completed' && 
          t.status !== 'denied' && 
          t.due_date && 
          new Date(t.due_date) < now
        ).length,
      };

      if (useCache) {
        this.statsCache.set(cacheKey, stats);
      }

      console.log("✅ Task stats calculated:", stats);
      return stats;
    } catch (error) {
      console.error("❌ Error in getTaskStats:", error);
      throw error;
    }
  }

  static async getClientsForTherapist(
    therapistId: string,
    useCache: boolean = true
  ): Promise<Array<{ id: string; name: string; initials: string }>> {
    const cacheKey = therapistId;
    
    if (useCache) {
      const cached = this.clientsCache.get(cacheKey) as any[];
      if (cached) {
        console.log("👥 Returning cached clients data");
        return cached;
      }
    }

    console.log("👥 Fetching fresh clients data");

    try {
      const { data, error } = await supabase
        .from('client_therapist_relationships')
        .select(`
          client:profiles!client_therapist_relationships_client_id_fkey (
            id,
            first_name,
            last_name
          )
        `)
        .eq('therapist_id', therapistId)
        .eq('status', 'active');

      if (error) {
        console.error("❌ Error fetching clients:", error);
        throw error;
      }

      const clients = (data || [])
        .filter(item => item.client)
        .map(item => {
          const client = item.client as any;
          const firstName = client.first_name || '';
          const lastName = client.last_name || '';
          const name = `${firstName} ${lastName}`.trim() || 'Unknown Client';
          const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'UC';
          
          return {
            id: client.id,
            name,
            initials
          };
        });

      if (useCache) {
        this.clientsCache.set(cacheKey, clients);
      }

      console.log(`✅ Fetched ${clients.length} clients for therapist`);
      return clients;
    } catch (error) {
      console.error("❌ Error in getClientsForTherapist:", error);
      throw error;
    }
  }

  static async createTask(taskData: TaskCreate): Promise<any> {
    console.log("➕ Creating new task:", taskData);

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) {
        console.error("❌ Error creating task:", error);
        throw error;
      }

      // Invalidate caches
      this.invalidateAllCaches();

      console.log("✅ Task created successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Error in createTask:", error);
      throw error;
    }
  }

  static async updateTask(taskId: string, updates: TaskUpdate): Promise<any> {
    console.log("📝 Updating task:", taskId, updates);

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        console.error("❌ Error updating task:", error);
        throw error;
      }

      // Invalidate caches
      this.invalidateAllCaches();

      console.log("✅ Task updated successfully:", data);
      return data;
    } catch (error) {
      console.error("❌ Error in updateTask:", error);
      throw error;
    }
  }

  static async deleteTask(taskId: string): Promise<void> {
    console.log("🗑️ Deleting task:", taskId);

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        console.error("❌ Error deleting task:", error);
        throw error;
      }

      // Invalidate caches
      this.invalidateAllCaches();

      console.log("✅ Task deleted successfully");
    } catch (error) {
      console.error("❌ Error in deleteTask:", error);
      throw error;
    }
  }

  static invalidateAllCaches(): void {
    console.log("🗑️ Invalidating all task caches");
    this.cacheManager.clear();
    this.statsCache.clear();
    this.clientsCache.clear();
  }

  static preloadData(filters: TaskFilters = {}): void {
    console.log("🚀 Preloading tasks data");
    this.getTasks(filters, false).catch(console.error);
  }
}