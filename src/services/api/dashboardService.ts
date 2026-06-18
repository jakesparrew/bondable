
import { supabase } from "@/integrations/supabase/client";
import { cacheManager, dashboardStatsCache } from "@/services/cache";

export interface ActivityItem {
  id: string;
  type: string;
  action: string;
  timestamp: Date;
  time: string;
  clientName?: string;
  therapistName?: string;
  taskTitle?: string;
  journalTitle?: string;
  sessionType?: string;
}

export interface DashboardStats {
  totalClients: number;
  activeClients: number;
  todayAppointments: number;
  pendingTasks?: number;
  journalEntries?: number;
  nextAppointment?: {
    time: string;
    clientName: string;
  };
}

// Safe query wrapper for dashboard operations
const safeDashboardQuery = async <T>(
  queryName: string,
  queryFn: () => Promise<{ data: T; error: any }>
): Promise<T> => {
  try {
    console.log(`🔍 Dashboard query: ${queryName}`)
    const result = await queryFn()
    
    if (result.error) {
      console.error(`❌ Dashboard query ${queryName} failed:`, result.error)
      // Return empty/default data instead of throwing
      return (Array.isArray(result.data) ? [] : null) as T
    }
    
    console.log(`✅ Dashboard query ${queryName} successful`)
    return result.data || (Array.isArray(result.data) ? [] : null) as T
  } catch (error) {
    console.error(`❌ Dashboard query ${queryName} error:`, error)
    return (Array.isArray([]) ? [] : null) as T
  }
}

export const dashboardService = {
  // Get therapist dashboard stats with fallback queries
async getTherapistStats(therapistId: string): Promise<DashboardStats> {
    return dashboardStatsCache.getOrSet<DashboardStats>(
      `therapist-stats-${therapistId}`,
      async () => {
        try {
          // Use simple queries to avoid join issues
          const [clientsResult, sessionsResult, tasksResult, journalsResult] = await Promise.allSettled([
            safeDashboardQuery(
              'therapist-clients',
              async () => await supabase
                .from('client_therapist_relationships')
                .select('client_id, status')
                .eq('therapist_id', therapistId)
            ),
            safeDashboardQuery(
              'therapist-sessions-today',
              async () => {
                const today = new Date().toISOString().split('T')[0]
                return await supabase
                  .from('sessions')
                  .select('id, session_date, session_time')
                  .eq('therapist_id', therapistId)
                  .eq('session_date', today)
              }
            ),
            safeDashboardQuery(
              'therapist-pending-tasks',
              async () => await supabase
                .from('tasks')
                .select('id')
                .eq('therapist_id', therapistId)
                .in('status', ['assigned', 'in_progress'])
            ),
            safeDashboardQuery(
              'therapist-journal-entries',
              async () => {
                const thisMonth = new Date().toISOString().slice(0, 7) + '-01'
                return await supabase
                  .from('journal_entries')
                  .select('id')
                  .eq('sharing_type', 'therapist')
                  .gte('created_at', thisMonth)
              }
            )
          ])
  
          const clients = clientsResult.status === 'fulfilled' ? (clientsResult.value || []) as any[] : []
          const todaySessions = sessionsResult.status === 'fulfilled' ? (sessionsResult.value || []) as any[] : []
          const pendingTasks = tasksResult.status === 'fulfilled' ? (tasksResult.value || []) as any[] : []
          const journalEntries = journalsResult.status === 'fulfilled' ? (journalsResult.value || []) as any[] : []
  
          const totalClients = clients.length
          const activeClients = clients.filter((c: any) => c.status === 'active').length
  
          // Get next appointment with simple query
          let nextAppointment = undefined
          try {
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            const tomorrowStr = tomorrow.toISOString().split('T')[0]
  
            const { data: nextSession } = await supabase
              .from('sessions')
              .select('session_time, client_id')
              .eq('therapist_id', therapistId)
              .gte('session_date', tomorrowStr)
              .order('session_date', { ascending: true })
              .order('session_time', { ascending: true })
              .limit(1)
              .maybeSingle()
  
            if (nextSession) {
              // Get client name separately to avoid join issues
              const { data: client } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', nextSession.client_id)
                .maybeSingle()
  
              nextAppointment = {
                time: nextSession.session_time,
                clientName: client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown Client' : 'Unknown Client'
              }
            }
          } catch (error) {
            console.warn('⚠️ Could not fetch next appointment:', error)
          }
  
          return {
            totalClients,
            activeClients,
            todayAppointments: todaySessions.length,
            pendingTasks: pendingTasks.length,
            journalEntries: journalEntries.length,
            nextAppointment
          }
        } catch (error) {
          console.error('❌ Failed to get therapist stats:', error)
          return {
            totalClients: 0,
            activeClients: 0,
            todayAppointments: 0,
            pendingTasks: 0,
            journalEntries: 0
          }
        }
      },
      60_000
    )
  },

// Get therapist activities with safe queries (cached)
  async getTherapistActivities(therapistId: string): Promise<ActivityItem[]> {
    return cacheManager.getOrSet<ActivityItem[]>(
      `therapist-activities-${therapistId}`,
      async () => {
        const activities: ActivityItem[] = []
        try {
          // Get recent sessions with client names
          const { data: recentSessions } = await supabase
            .from('sessions')
            .select(`
              id, 
              created_at, 
              client_id, 
              session_type,
              profiles:client_id(first_name, last_name)
            `)
            .eq('therapist_id', therapistId)
            .order('created_at', { ascending: false })
            .limit(10)
  
          if (recentSessions) {
            for (const session of recentSessions) {
              const profile = session.profiles as any
              let clientName = 'Unknown Client'
              
              if (profile) {
                clientName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
                            'Unknown Client'
              }
  
              activities.push({
                id: session.id,
                type: 'session',
                action: 'session_scheduled',
                sessionType: session.session_type,
                timestamp: new Date(session.created_at),
                time: new Date(session.created_at).toLocaleDateString(),
                clientName
              })
            }
          }
  
          // Get recent tasks assigned by therapist
          const { data: recentTasks } = await supabase
            .from('tasks')
            .select(`
              id, 
              created_at, 
              title,
              client_id,
              profiles:client_id(first_name, last_name)
            `)
            .eq('therapist_id', therapistId)
            .order('created_at', { ascending: false })
            .limit(10)
  
          if (recentTasks) {
            for (const task of recentTasks) {
              const profile = task.profiles as any
              let clientName = 'Unknown Client'
              
              if (profile) {
                clientName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
                            'Unknown Client'
              }
  
              activities.push({
                id: task.id,
                type: 'task',
                action: 'task_assigned',
                taskTitle: task.title,
                timestamp: new Date(task.created_at),
                time: new Date(task.created_at).toLocaleDateString(),
                clientName
              })
            }
          }
  
          // Get recent journal entries shared with therapist
          const { data: sharedJournals } = await supabase
            .from('journal_entries')
            .select(`
              id, 
              created_at, 
              title,
              client_id,
              profiles:client_id(first_name, last_name)
            `)
            .eq('sharing_type', 'therapist')
            .order('created_at', { ascending: false })
            .limit(10)
  
          if (sharedJournals) {
            // Filter journals shared with this therapist
            const { data: relationships } = await supabase
              .from('client_therapist_relationships')
              .select('client_id')
              .eq('therapist_id', therapistId)
              .eq('status', 'active')
  
            const connectedClientIds = relationships?.map(r => r.client_id) || []
  
            for (const journal of sharedJournals) {
              if (connectedClientIds.includes(journal.client_id)) {
                const profile = journal.profiles as any
                let clientName = 'Unknown Client'
                
                if (profile) {
                  clientName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
                              'Unknown Client'
                }
  
                activities.push({
                  id: journal.id,
                  type: 'journal',
                  action: 'journal_shared',
                  journalTitle: journal.title,
                  timestamp: new Date(journal.created_at),
                  time: new Date(journal.created_at).toLocaleDateString(),
                  clientName
                })
              }
            }
          }
  
          // Get recent messages sent by therapist
          const { data: recentMessages } = await supabase
            .from('messages')
            .select(`
              id, 
              created_at, 
              content,
              recipient_id,
              conversation_id
            `)
            .eq('sender_id', therapistId)
            .order('created_at', { ascending: false })
            .limit(5)
  
          if (recentMessages) {
            for (const message of recentMessages) {
              // Get recipient name
              const { data: recipient } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', message.recipient_id)
                .maybeSingle()
  
              let clientName = 'Unknown Client'
              if (recipient) {
                clientName = `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim() || 'Unknown Client'
              }
  
              activities.push({
                id: message.id,
                type: 'message',
                action: 'message_sent',
                timestamp: new Date(message.created_at),
                time: new Date(message.created_at).toLocaleDateString(),
                clientName
              })
            }
          }
  
          // Sort by timestamp
          return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        } catch (error) {
          console.error('❌ Failed to get therapist activities:', error)
          return []
        }
      },
      30_000
    )
  },

  // Get client dashboard stats
async getClientStats(clientId: string): Promise<DashboardStats> {
    return dashboardStatsCache.getOrSet<DashboardStats>(
      `client-stats-${clientId}`,
      async () => {
        try {
          const [sessionsResult, therapistsResult, tasksResult, journalsResult] = await Promise.allSettled([
            safeDashboardQuery(
              'client-sessions',
              async () => {
                const today = new Date().toISOString().split('T')[0]
                return await supabase
                  .from('sessions')
                  .select('id, session_date, session_time')
                  .eq('client_id', clientId)
                  .eq('session_date', today)
              }
            ),
            safeDashboardQuery(
              'client-therapists',
              async () => await supabase
                .from('client_therapist_relationships')
                .select('therapist_id')
                .eq('client_id', clientId)
            ),
            safeDashboardQuery(
              'client-pending-tasks',
              async () => await supabase
                .from('tasks')
                .select('id')
                .eq('client_id', clientId)
                .in('status', ['assigned', 'in_progress'])
            ),
            safeDashboardQuery(
              'client-journal-entries',
              async () => {
                const thisMonth = new Date().toISOString().slice(0, 7) + '-01'
                return await supabase
                  .from('journal_entries')
                  .select('id')
                  .eq('client_id', clientId)
                  .gte('created_at', thisMonth)
              }
            )
          ])
  
          const todaySessions = sessionsResult.status === 'fulfilled' ? (sessionsResult.value || []) as any[] : []
          const therapists = therapistsResult.status === 'fulfilled' ? (therapistsResult.value || []) as any[] : []
          const pendingTasks = tasksResult.status === 'fulfilled' ? (tasksResult.value || []) as any[] : []
          const journalEntries = journalsResult.status === 'fulfilled' ? (journalsResult.value || []) as any[] : []
  
          return {
            totalClients: 0, // Not applicable for clients
            activeClients: therapists.length,
            todayAppointments: todaySessions.length,
            pendingTasks: pendingTasks.length,
            journalEntries: journalEntries.length
          }
        } catch (error) {
          console.error('❌ Failed to get client stats:', error)
          return {
            totalClients: 0,
            activeClients: 0,
            todayAppointments: 0,
            pendingTasks: 0,
            journalEntries: 0
          }
        }
      },
      60_000
    )
  },

  // Get client activities
  async getClientActivities(clientId: string): Promise<ActivityItem[]> {
    const activities: ActivityItem[] = []

    try {
      // Get recent sessions with therapist names
      const { data: recentSessions } = await supabase
        .from('sessions')
        .select(`
          id, 
          created_at, 
          therapist_id, 
          session_type,
          profiles:therapist_id(first_name, last_name)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (recentSessions) {
        for (const session of recentSessions) {
          const profile = session.profiles as any
          let therapistName = 'Unknown Therapist'
          
          if (profile) {
            therapistName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
                          'Unknown Therapist'
          }

          activities.push({
            id: session.id,
            type: 'session',
            action: 'session_scheduled',
            sessionType: session.session_type,
            timestamp: new Date(session.created_at),
            time: new Date(session.created_at).toLocaleDateString(),
            therapistName
          })
        }
      }

      // Get recent tasks assigned to client
      const { data: recentTasks } = await supabase
        .from('tasks')
        .select(`
          id, 
          created_at, 
          title,
          therapist_id,
          profiles:therapist_id(first_name, last_name)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (recentTasks) {
        for (const task of recentTasks) {
          const profile = task.profiles as any
          let therapistName = 'Unknown Therapist'
          
          if (profile) {
            therapistName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
                          'Unknown Therapist'
          }

          activities.push({
            id: task.id,
            type: 'task',
            action: 'task_received',
            taskTitle: task.title,
            timestamp: new Date(task.created_at),
            time: new Date(task.created_at).toLocaleDateString(),
            therapistName
          })
        }
      }

      // Get recent journal entries created by client
      const { data: recentJournals } = await supabase
        .from('journal_entries')
        .select('id, created_at, title, sharing_type, shared_with_therapists')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (recentJournals) {
        for (const journal of recentJournals) {
          let therapistName = 'Private'
          let action = `Journal created: ${journal.title}`

          if (journal.sharing_type === 'therapist') {
            // Get therapist name if shared
            if (journal.shared_with_therapists) {
              try {
                const sharedTherapists = typeof journal.shared_with_therapists === 'string' 
                  ? JSON.parse(journal.shared_with_therapists) 
                  : journal.shared_with_therapists

                if (Array.isArray(sharedTherapists) && sharedTherapists.length > 0) {
                  const therapistId = typeof sharedTherapists[0] === 'object' 
                    ? sharedTherapists[0].id 
                    : sharedTherapists[0]

                  const { data: therapist } = await supabase
                    .from('profiles')
                    .select('first_name, last_name')
                    .eq('id', therapistId)
                    .maybeSingle()

                  if (therapist) {
                    therapistName = `${therapist.first_name || ''} ${therapist.last_name || ''}`.trim() || 'Therapist'
                  }
                }
              } catch (error) {
                console.warn('Error parsing shared therapists:', error)
                therapistName = 'therapist'
              }
            } else {
              therapistName = 'therapist'
            }
            action = 'journal_shared'
          } else {
            action = 'private_journal'
            therapistName = 'private_no_therapist'
          }

          activities.push({
            id: journal.id,
            type: 'journal',
            action,
            journalTitle: journal.title,
            timestamp: new Date(journal.created_at),
            time: new Date(journal.created_at).toLocaleDateString(),
            therapistName
          })
        }
      }

      // Get recent messages sent by client
      const { data: recentMessages } = await supabase
        .from('messages')
        .select(`
          id, 
          created_at, 
          content,
          recipient_id
        `)
        .eq('sender_id', clientId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentMessages) {
        for (const message of recentMessages) {
          // Get recipient name (should be therapist)
          const { data: recipient } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', message.recipient_id)
            .maybeSingle()

          let therapistName = 'Unknown Therapist'
          if (recipient) {
            therapistName = `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim() || 'Unknown Therapist'
          }

          activities.push({
            id: message.id,
            type: 'message',
            action: 'message_sent',
            timestamp: new Date(message.created_at),
            time: new Date(message.created_at).toLocaleDateString(),
            therapistName
          })
        }
      }

      return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    } catch (error) {
      console.error('❌ Failed to get client activities:', error)
      return []
    }
  }
}
