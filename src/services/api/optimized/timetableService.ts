import { supabase } from '@/integrations/supabase/client';
import { CacheManager } from '@/services/cache/CacheManager';
import { withRetry } from '@/services/utils';
import console from '@/lib/production-console';
import { format, startOfWeek, addDays } from 'date-fns';

// Cache managers for timetable data
const timetableCache = new CacheManager({
  defaultTTL: 30 * 60 * 1000, // 30 minutes for timetable data
  maxSize: 100,
  enablePersistence: true
});

const sessionCache = new CacheManager({
  defaultTTL: 10 * 60 * 1000, // 10 minutes for session data
  maxSize: 200,
  enablePersistence: true
});

// Cache key generators
const WEEKLY_AVAILABILITY_KEY = (userId: string, weekStart: string) => `weekly_availability:${userId}:${weekStart}`;
const USER_SESSIONS_KEY = (userId: string, weekStart: string) => `user_sessions:${userId}:${weekStart}`;
const THERAPIST_AVAILABILITY_KEY = (userId: string) => `therapist_availability:${userId}`;

// Types
export interface TimeSlot {
  time: string;
  available: boolean;
  booked?: boolean;
  sessionId?: string;
  clientName?: string;
}

export interface WeeklyAvailabilityData {
  [key: string]: TimeSlot[];
}

export interface SessionData {
  id: string;
  client_id: string;
  therapist_id: string;
  session_date: string;
  session_time: string;
  duration_minutes: number;
  status: string;
  client_name?: string;
  therapist_name?: string;
}

export interface WeeklyTimetableData {
  weeklyAvailability: WeeklyAvailabilityData;
  sessions: SessionData[];
  weekStart: Date;
  weekDays: Date[];
}

// Default time slots template
const defaultTimeSlots: TimeSlot[] = [
  { time: "09:00", available: false },
  { time: "09:30", available: false },
  { time: "10:00", available: true },
  { time: "10:30", available: true },
  { time: "11:00", available: true },
  { time: "11:30", available: true },
  { time: "12:00", available: false },
  { time: "12:30", available: true },
  { time: "13:00", available: true },
  { time: "13:30", available: true },
  { time: "14:00", available: true },
  { time: "14:30", available: false },
  { time: "15:00", available: false },
  { time: "15:30", available: true },
  { time: "16:00", available: true },
  { time: "16:30", available: true },
  { time: "17:00", available: true },
  { time: "17:30", available: true },
];

export interface OptimizedTimetableService {
  getWeeklyTimetable(userId: string, weekStart: Date, useCache?: boolean): Promise<WeeklyTimetableData>;
  getWeeklyAvailability(userId: string, weekStart: Date, useCache?: boolean): Promise<WeeklyAvailabilityData>;
  updateWeeklyAvailability(userId: string, availability: WeeklyAvailabilityData): Promise<boolean>;
  getUserSessions(userId: string, weekStart: Date, useCache?: boolean): Promise<SessionData[]>;
  getAvailableSlots(userId: string, date: Date, useCache?: boolean): Promise<TimeSlot[]>;
  updateTimeSlot(userId: string, dayKey: string, timeSlot: string, available: boolean): Promise<boolean>;
  invalidateTimetableCache(userId: string, weekStart?: Date): void;
  clearAllCaches(): void;
}

class OptimizedTimetableServiceImpl implements OptimizedTimetableService {
  private getWeekStartKey(weekStart: Date): string {
    return format(weekStart, 'yyyy-MM-dd');
  }

  private generateDefaultAvailability(): WeeklyAvailabilityData {
    return {
      monday: [...defaultTimeSlots],
      tuesday: [...defaultTimeSlots],
      wednesday: [...defaultTimeSlots],
      thursday: [...defaultTimeSlots],
      friday: [...defaultTimeSlots],
      saturday: defaultTimeSlots.map(slot => ({ ...slot, available: false })),
      sunday: defaultTimeSlots.map(slot => ({ ...slot, available: false })),
    };
  }

  async getWeeklyTimetable(userId: string, weekStart: Date, useCache = true): Promise<WeeklyTimetableData> {
    console.log(`📋 Fetching weekly timetable for: ${userId}, week: ${this.getWeekStartKey(weekStart)}`);

    try {
      // Fetch availability and sessions in parallel
      const [weeklyAvailability, sessions] = await Promise.all([
        this.getWeeklyAvailability(userId, weekStart, useCache),
        this.getUserSessions(userId, weekStart, useCache),
      ]);

      const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

      // Merge sessions into availability data
      const mergedAvailability = this.mergeSessionsWithAvailability(weeklyAvailability, sessions);

      return {
        weeklyAvailability: mergedAvailability,
        sessions,
        weekStart,
        weekDays,
      };
    } catch (error) {
      console.error(`❌ Error fetching weekly timetable:`, error);
      
      // Return default data on error
      return {
        weeklyAvailability: this.generateDefaultAvailability(),
        sessions: [],
        weekStart,
        weekDays: Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
      };
    }
  }

  async getWeeklyAvailability(userId: string, weekStart: Date, useCache = true): Promise<WeeklyAvailabilityData> {
    const weekStartKey = this.getWeekStartKey(weekStart);
    const cacheKey = WEEKLY_AVAILABILITY_KEY(userId, weekStartKey);
    
    if (useCache) {
      const cached = timetableCache.get<WeeklyAvailabilityData>(cacheKey);
      if (cached) {
        console.log(`✅ Cache: Hit for "${cacheKey}"`);
        return cached;
      }
    }

    console.log(`🔍 Fetching weekly availability for: ${userId}, week: ${weekStartKey}`);

    try {
      const result = await withRetry(async () => {
        // Try to load from localStorage first (for user preferences)
        const localStorageKey = `weeklyAvailability_${userId}`;
        try {
          const stored = localStorage.getItem(localStorageKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            console.log('📱 Loaded availability from localStorage');
            return parsed;
          }
        } catch (error) {
          console.warn('Failed to load from localStorage:', error);
        }

        // Check if user has saved availability in database
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("weekly_availability")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile availability:", profileError);
        }

        if (profileData?.weekly_availability) {
          console.log('💾 Loaded availability from database');
          return profileData.weekly_availability as unknown as WeeklyAvailabilityData;
        }

        // Return default availability
        console.log('🔧 Using default availability');
        return this.generateDefaultAvailability();
      }, { service: 'timetable', operation: 'fetchAvailability', timestamp: Date.now() });

      // Cache the result
      timetableCache.set(cacheKey, result);
      console.log(`💾 Cache: Stored "${cacheKey}"`);

      return result;
    } catch (error) {
      console.error(`❌ Error fetching weekly availability:`, error);
      return this.generateDefaultAvailability();
    }
  }

  async updateWeeklyAvailability(userId: string, availability: WeeklyAvailabilityData): Promise<boolean> {
    console.log(`🔄 Updating weekly availability: ${userId}`, availability);

    try {
      const result = await withRetry(async () => {
        // Save to localStorage
        const localStorageKey = `weeklyAvailability_${userId}`;
        try {
          localStorage.setItem(localStorageKey, JSON.stringify(availability));
          console.log("💾 Saved availability to localStorage");
        } catch (error) {
          console.error("Error saving to localStorage:", error);
        }

        // Save to database
        const { error } = await supabase
          .from("profiles")
          .update({ 
            weekly_availability: availability as any,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (error) {
          console.error("Error updating profile availability:", error);
          throw new Error("Failed to update weekly availability");
        }

        return true;
      }, { service: 'timetable', operation: 'updateAvailability', timestamp: Date.now() });

      // Invalidate related caches
      this.invalidateTimetableCache(userId);

      console.log(`✅ Weekly availability updated successfully: ${userId}`);
      return result;
    } catch (error) {
      console.error(`❌ Error updating weekly availability:`, error);
      return false;
    }
  }

  async getUserSessions(userId: string, weekStart: Date, useCache = true): Promise<SessionData[]> {
    const weekStartKey = this.getWeekStartKey(weekStart);
    const cacheKey = USER_SESSIONS_KEY(userId, weekStartKey);
    
    if (useCache) {
      const cached = sessionCache.get<SessionData[]>(cacheKey);
      if (cached) {
        console.log(`✅ Cache: Hit for "${cacheKey}"`);
        return cached;
      }
    }

    console.log(`🔍 Fetching user sessions for: ${userId}, week: ${weekStartKey}`);

    try {
      const result = await withRetry(async () => {
        const weekEnd = addDays(weekStart, 6);
        
        const { data: sessionsData, error: sessionsError } = await supabase
          .from("sessions")
          .select(`
            *,
            client:profiles!sessions_client_id_fkey(first_name, last_name),
            therapist:profiles!sessions_therapist_id_fkey(first_name, last_name)
          `)
          .or(`client_id.eq.${userId},therapist_id.eq.${userId}`)
          .gte("session_date", format(weekStart, 'yyyy-MM-dd'))
          .lte("session_date", format(weekEnd, 'yyyy-MM-dd'))
          .order("session_date")
          .order("session_time");

        if (sessionsError) {
          console.error("Error fetching sessions:", sessionsError);
          throw new Error("Failed to fetch sessions");
        }

        return (sessionsData || []).map(session => ({
          id: session.id,
          client_id: session.client_id,
          therapist_id: session.therapist_id,
          session_date: session.session_date,
          session_time: session.session_time,
          duration_minutes: session.duration_minutes,
          status: session.status,
          client_name: session.client 
            ? `${session.client.first_name} ${session.client.last_name}`.trim()
            : undefined,
          therapist_name: session.therapist 
            ? `${session.therapist.first_name} ${session.therapist.last_name}`.trim()
            : undefined,
        }));
      }, { service: 'timetable', operation: 'fetchSessions', timestamp: Date.now() });

      // Cache the result
      sessionCache.set(cacheKey, result);
      console.log(`💾 Cache: Stored "${cacheKey}"`);

      return result;
    } catch (error) {
      console.error(`❌ Error fetching user sessions:`, error);
      return [];
    }
  }

  async getAvailableSlots(userId: string, date: Date, useCache = true): Promise<TimeSlot[]> {
    const dayKey = format(date, 'EEEE').toLowerCase();
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    
    const timetableData = await this.getWeeklyTimetable(userId, weekStart, useCache);
    return timetableData.weeklyAvailability[dayKey] || [];
  }

  async updateTimeSlot(userId: string, dayKey: string, timeSlot: string, available: boolean): Promise<boolean> {
    console.log(`🔄 Updating time slot: ${userId}, ${dayKey}, ${timeSlot}, ${available}`);

    try {
      // Get current availability
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const currentAvailability = await this.getWeeklyAvailability(userId, weekStart, false);

      // Update the specific time slot
      const updatedAvailability = {
        ...currentAvailability,
        [dayKey]: (currentAvailability[dayKey] || []).map(slot =>
          slot.time === timeSlot
            ? { ...slot, available }
            : slot
        )
      };

      return await this.updateWeeklyAvailability(userId, updatedAvailability);
    } catch (error) {
      console.error(`❌ Error updating time slot:`, error);
      return false;
    }
  }

  private mergeSessionsWithAvailability(
    availability: WeeklyAvailabilityData, 
    sessions: SessionData[]
  ): WeeklyAvailabilityData {
    const merged = { ...availability };

    sessions.forEach(session => {
      const sessionDate = new Date(session.session_date);
      const dayKey = format(sessionDate, 'EEEE').toLowerCase();
      
      if (merged[dayKey]) {
        merged[dayKey] = merged[dayKey].map(slot => {
          if (slot.time === session.session_time) {
            return {
              ...slot,
              booked: true,
              sessionId: session.id,
              clientName: session.client_name,
            };
          }
          return slot;
        });
      }
    });

    return merged;
  }

  invalidateTimetableCache(userId: string, weekStart?: Date): void {
    if (weekStart) {
      const weekStartKey = this.getWeekStartKey(weekStart);
      const availabilityKey = WEEKLY_AVAILABILITY_KEY(userId, weekStartKey);
      const sessionsKey = USER_SESSIONS_KEY(userId, weekStartKey);
      
      timetableCache.delete(availabilityKey);
      sessionCache.delete(sessionsKey);
      
      console.log(`🗑️ Cache invalidated for user: ${userId}, week: ${weekStartKey}`);
    } else {
      // Invalidate all caches for this user
      timetableCache.invalidatePattern(new RegExp(`${userId}`));
      sessionCache.invalidatePattern(new RegExp(`${userId}`));
      
      console.log(`🗑️ All caches invalidated for user: ${userId}`);
    }
  }

  clearAllCaches(): void {
    timetableCache.clear();
    sessionCache.clear();
    console.log('🗑️ All timetable caches cleared');
  }
}

// Export singleton instance
export const optimizedTimetableService = new OptimizedTimetableServiceImpl();