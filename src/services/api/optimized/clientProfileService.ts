import { supabase } from '@/integrations/supabase/client';
import { CacheManager } from '@/services/cache/CacheManager';
import { withRetry } from '@/services/utils';
import { format, parseISO } from 'date-fns';
import console from '@/lib/production-console';

// Cache managers for client profile data
const clientProfileCache = new CacheManager({
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  maxSize: 100,
  enablePersistence: true
});

const clientRelatedDataCache = new CacheManager({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 200,
  enablePersistence: true
});

// Cache key generators
const CLIENT_PROFILE_KEY = (clientId: string) => `client_profile:${clientId}`;
const CLIENT_SESSIONS_KEY = (clientId: string) => `client_sessions:${clientId}`;
const CLIENT_TASKS_KEY = (clientId: string) => `client_tasks:${clientId}`;

// Types
export interface ClientProfileData {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive" | "Pending";
  joinDate: string;
  lastSession: string;
  nextSession: string;
  image?: string;
  notes: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface SessionData {
  id: string;
  date: string;
  type: string;
  duration: string;
  notes: string;
  status: string;
}

export interface TaskData {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  priority: string;
  createdAt: string;
}

export interface ClientProfileResponse {
  client: ClientProfileData | null;
  sessions: SessionData[];
  tasks: TaskData[];
  isLoading: boolean;
  error: string | null;
}

export interface OptimizedClientProfileService {
  getClientProfile(clientId: string, useCache?: boolean): Promise<ClientProfileData | null>;
  getClientSessions(clientId: string, useCache?: boolean): Promise<SessionData[]>;
  getClientTasks(clientId: string, useCache?: boolean): Promise<TaskData[]>;
  getFullClientProfile(clientId: string, useCache?: boolean): Promise<ClientProfileResponse>;
  updateClientProfile(clientId: string, updates: Partial<ClientProfileData>): Promise<boolean>;
  invalidateClientProfileCache(clientId: string): void;
  clearAllCaches(): void;
}

class OptimizedClientProfileServiceImpl implements OptimizedClientProfileService {
  async getClientProfile(clientId: string, useCache = true): Promise<ClientProfileData | null> {
    const cacheKey = CLIENT_PROFILE_KEY(clientId);
    
    if (useCache) {
      const cached = clientProfileCache.get<ClientProfileData>(cacheKey);
      if (cached) {
        console.log(`✅ Cache: Hit for "${cacheKey}"`);
        return cached;
      }
    }

    console.log(`🔍 Fetching client profile for: ${clientId}`);

    try {
      const result = await withRetry(async () => {
        // First, try to fetch directly from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", clientId)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          throw new Error("Failed to fetch client profile");
        }

        if (!profileData) {
          // If not found in profiles, try the clients table
          const { data: clientsData, error: clientsError } = await supabase
            .from("clients")
            .select("*")
            .eq("id", clientId)
            .maybeSingle();

          if (clientsError) {
            console.error("Error fetching from clients table:", clientsError);
            throw new Error("Client not found");
          }

          if (!clientsData) {
            throw new Error("Client not found");
          }

          // Get the corresponding profile using email
          const { data: profileByEmail, error: profileByEmailError } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", clientsData.email)
            .maybeSingle();

          if (profileByEmailError || !profileByEmail) {
            console.error("Error fetching profile by email:", profileByEmailError);
            throw new Error("Failed to fetch profile data");
          }

          // Use the profile data but supplement with clients table data
          return {
            id: profileByEmail.id,
            name: `${profileByEmail.first_name || ''} ${profileByEmail.last_name || ''}`.trim() ||
                  `${clientsData.first_name} ${clientsData.last_name}`,
            email: profileByEmail.email || clientsData.email,
            phone: profileByEmail.phone || clientsData.phone || "",
            status: "Active" as const,
            joinDate: clientsData.join_date || "",
            lastSession: clientsData.last_session || "Never",
            nextSession: clientsData.next_session || "",
            image: profileByEmail.avatar_url,
            notes: clientsData.notes || "",
            emergencyContact: {
              name: profileByEmail.emergency_contact_name || clientsData.emergency_contact_name || "",
              phone: profileByEmail.emergency_contact_phone || clientsData.emergency_contact_phone || "",
              relationship: profileByEmail.emergency_contact_relationship || clientsData.emergency_contact_relationship || "",
            },
          };
        } else {
          // We found the profile directly
          return {
            id: profileData.id,
            name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || "Unknown Client",
            email: profileData.email || "",
            phone: profileData.phone || "",
            status: "Active" as const,
            joinDate: profileData.created_at
              ? format(parseISO(profileData.created_at), "yyyy-MM-dd")
              : "",
            lastSession: "Never",
            nextSession: "",
            image: profileData.avatar_url,
            notes: "",
            emergencyContact: {
              name: profileData.emergency_contact_name || "",
              phone: profileData.emergency_contact_phone || "",
              relationship: profileData.emergency_contact_relationship || "",
            },
          };
        }
      }, { service: 'clientProfile', operation: 'fetch', timestamp: Date.now() });

      // Cache the result
      if (result) {
        clientProfileCache.set(cacheKey, result);
        console.log(`💾 Cache: Stored "${cacheKey}"`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Error fetching client profile:`, error);
      return null;
    }
  }

  async getClientSessions(clientId: string, useCache = true): Promise<SessionData[]> {
    const cacheKey = CLIENT_SESSIONS_KEY(clientId);
    
    if (useCache) {
      const cached = clientRelatedDataCache.get<SessionData[]>(cacheKey);
      if (cached) {
        console.log(`✅ Cache: Hit for "${cacheKey}"`);
        return cached;
      }
    }

    console.log(`🔍 Fetching sessions for client: ${clientId}`);

    try {
      const result = await withRetry(async () => {
        const { data: sessionsData, error: sessionsError } = await supabase
          .from("sessions")
          .select("*")
          .eq("client_id", clientId)
          .order("session_date", { ascending: false });

        if (sessionsError) {
          console.error("Error fetching sessions:", sessionsError);
          throw new Error("Failed to fetch sessions");
        }

        return sessionsData?.map((session) => ({
          id: session.id,
          date: session.session_date,
          type: session.session_type,
          duration: `${session.duration_minutes} min`,
          notes: session.notes || "",
          status: session.status,
        })) || [];
      }, { service: 'clientProfile', operation: 'sessions', timestamp: Date.now() });

      // Cache the result
      clientRelatedDataCache.set(cacheKey, result);
      console.log(`💾 Cache: Stored "${cacheKey}"`);

      return result;
    } catch (error) {
      console.error(`❌ Error fetching client sessions:`, error);
      return [];
    }
  }

  async getClientTasks(clientId: string, useCache = true): Promise<TaskData[]> {
    const cacheKey = CLIENT_TASKS_KEY(clientId);
    
    if (useCache) {
      const cached = clientRelatedDataCache.get<TaskData[]>(cacheKey);
      if (cached) {
        console.log(`✅ Cache: Hit for "${cacheKey}"`);
        return cached;
      }
    }

    console.log(`🔍 Fetching tasks for client: ${clientId}`);

    try {
      const result = await withRetry(async () => {
        const { data: tasksData, error: tasksError } = await supabase
          .from("tasks")
          .select("*")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false });

        if (tasksError) {
          console.error("Error fetching tasks:", tasksError);
          throw new Error("Failed to fetch tasks");
        }

        return tasksData?.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description || "",
          dueDate: task.due_date || "",
          status: task.status,
          priority: task.priority,
          createdAt: task.created_at,
        })) || [];
      }, { service: 'clientProfile', operation: 'tasks', timestamp: Date.now() });

      // Cache the result
      clientRelatedDataCache.set(cacheKey, result);
      console.log(`💾 Cache: Stored "${cacheKey}"`);

      return result;
    } catch (error) {
      console.error(`❌ Error fetching client tasks:`, error);
      return [];
    }
  }

  async getFullClientProfile(clientId: string, useCache = true): Promise<ClientProfileResponse> {
    console.log(`📋 Fetching full client profile for: ${clientId}`);

    try {
      // Fetch all data in parallel
      const [client, sessions, tasks] = await Promise.all([
        this.getClientProfile(clientId, useCache),
        this.getClientSessions(clientId, useCache),
        this.getClientTasks(clientId, useCache),
      ]);

      return {
        client,
        sessions,
        tasks,
        isLoading: false,
        error: null,
      };
    } catch (error) {
      console.error(`❌ Error in getFullClientProfile:`, error);
      return {
        client: null,
        sessions: [],
        tasks: [],
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch client profile",
      };
    }
  }

  async updateClientProfile(clientId: string, updates: Partial<ClientProfileData>): Promise<boolean> {
    console.log(`🔄 Updating client profile: ${clientId}`, updates);

    try {
      const result = await withRetry(async () => {
        let didUpdate = false;

        // 1) Update profiles table for identity/contact fields if provided
        const profileUpdateData: any = {};

        if (updates.name) {
          const nameParts = updates.name.trim().split(' ');
          profileUpdateData.first_name = nameParts[0] || '';
          profileUpdateData.last_name = nameParts.slice(1).join(' ') || '';
        }
        if (updates.email) profileUpdateData.email = updates.email;
        if (updates.phone) profileUpdateData.phone = updates.phone;
        if (updates.emergencyContact) {
          profileUpdateData.emergency_contact_name = updates.emergencyContact.name;
          profileUpdateData.emergency_contact_phone = updates.emergencyContact.phone;
          profileUpdateData.emergency_contact_relationship = updates.emergencyContact.relationship;
        }

        if (Object.keys(profileUpdateData).length > 0) {
          profileUpdateData.updated_at = new Date().toISOString();
          const { error: profileError } = await supabase
            .from("profiles")
            .update(profileUpdateData)
            .eq("id", clientId);

          if (profileError) {
            console.error("Error updating profile:", profileError);
            throw new Error("Failed to update client profile");
          }
          didUpdate = true;
        }

        // 2) Update clients table for therapist-controlled fields (status, notes)
        const clientUpdateData: any = {};
        if (typeof updates.notes !== 'undefined') clientUpdateData.notes = updates.notes;
        if (typeof updates.status !== 'undefined') clientUpdateData.status = updates.status;

        if (Object.keys(clientUpdateData).length > 0) {
          // First, try updating by assuming clientId refers to clients.id
          const { data: updatedById, error: clientsErrorById } = await supabase
            .from("clients")
            .update(clientUpdateData)
            .eq("id", clientId)
            .select("id")
            .maybeSingle();

          if (clientsErrorById) {
            console.warn("Clients update by id failed:", clientsErrorById.message);
          }

          if (!updatedById) {
            // Fallback: resolve by profile email when clientId is a profile id
            const { data: profileRow, error: profileFetchError } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", clientId)
              .maybeSingle();

            if (profileFetchError) {
              console.warn("Failed fetching profile for clients fallback:", profileFetchError.message);
            }

            if (profileRow?.email) {
              const { error: clientsErrorByEmail } = await supabase
                .from("clients")
                .update(clientUpdateData)
                .eq("email", profileRow.email);
              if (clientsErrorByEmail) {
                console.error("Error updating clients by email:", clientsErrorByEmail.message);
                throw new Error("Failed to update client status/notes");
              }
              didUpdate = true;
            }
          } else {
            didUpdate = true;
          }
        }

        return didUpdate || Object.keys(profileUpdateData).length === 0;
      }, { service: 'clientProfile', operation: 'update', timestamp: Date.now() });

      // Invalidate relevant caches
      this.invalidateClientProfileCache(clientId);

      console.log(`✅ Client profile updated successfully: ${clientId}`);
      return result;
    } catch (error) {
      console.error(`❌ Error updating client profile:`, error);
      return false;
    }
  }

  invalidateClientProfileCache(clientId: string): void {
    const profileKey = CLIENT_PROFILE_KEY(clientId);
    const sessionsKey = CLIENT_SESSIONS_KEY(clientId);
    const tasksKey = CLIENT_TASKS_KEY(clientId);

    clientProfileCache.delete(profileKey);
    clientRelatedDataCache.delete(sessionsKey);
    clientRelatedDataCache.delete(tasksKey);

    console.log(`🗑️ Cache invalidated for client: ${clientId}`);
  }

  clearAllCaches(): void {
    clientProfileCache.clear();
    clientRelatedDataCache.clear();
    console.log('🗑️ All client profile caches cleared');
  }
}

// Export singleton instance
export const optimizedClientProfileService = new OptimizedClientProfileServiceImpl();