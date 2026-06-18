export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_notification_settings: {
        Row: {
          created_at: string
          email_addresses: Json
          id: string
          is_enabled: boolean
          notification_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_addresses?: Json
          id?: string
          is_enabled?: boolean
          notification_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_addresses?: Json
          id?: string
          is_enabled?: boolean
          notification_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          user_email: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          user_email: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          user_email?: string
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          created_at: string
          id: string
          setting_name: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_name: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_name?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      client_questionnaires: {
        Row: {
          assigned_at: string
          client_id: string
          completed_at: string | null
          created_at: string
          description_snapshot: string | null
          id: string
          questions_snapshot: Json
          started_at: string | null
          status: string
          template_id: string | null
          therapist_id: string
          title_snapshot: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          completed_at?: string | null
          created_at?: string
          description_snapshot?: string | null
          id?: string
          questions_snapshot: Json
          started_at?: string | null
          status?: string
          template_id?: string | null
          therapist_id: string
          title_snapshot: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          completed_at?: string | null
          created_at?: string
          description_snapshot?: string | null
          id?: string
          questions_snapshot?: Json
          started_at?: string | null
          status?: string
          template_id?: string | null
          therapist_id?: string
          title_snapshot?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_questionnaires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_questionnaires_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_questionnaires_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_therapist_relationships: {
        Row: {
          client_id: string
          connected_at: string
          created_at: string
          id: string
          status: string
          therapist_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          connected_at?: string
          created_at?: string
          id?: string
          status?: string
          therapist_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          connected_at?: string
          created_at?: string
          id?: string
          status?: string
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_therapist_relationships_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_therapist_relationships_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string
          id: string
          join_date: string | null
          last_name: string
          last_session: string | null
          next_session: string | null
          notes: string | null
          phone: string | null
          status: string | null
          therapist_id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name: string
          id?: string
          join_date?: string | null
          last_name: string
          last_session?: string | null
          next_session?: string | null
          notes?: string | null
          phone?: string | null
          status?: string | null
          therapist_id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string
          id?: string
          join_date?: string | null
          last_name?: string
          last_session?: string | null
          next_session?: string | null
          notes?: string | null
          phone?: string | null
          status?: string | null
          therapist_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          client_id: string
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          therapist_id: string
          unread_count_client: number | null
          unread_count_therapist: number | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          therapist_id: string
          unread_count_client?: number | null
          unread_count_therapist?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          therapist_id?: string
          unread_count_client?: number | null
          unread_count_therapist?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      external_messages: {
        Row: {
          channel: string
          content: string
          conversation_id: string
          created_at: string
          delivered_at: string | null
          direction: string
          error: Json | null
          from_number: string | null
          id: string
          provider_sid: string | null
          read_at: string | null
          sent_at: string | null
          status: string
          to_number: string | null
          updated_at: string
        }
        Insert: {
          channel: string
          content: string
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          direction: string
          error?: Json | null
          from_number?: string | null
          id?: string
          provider_sid?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
          to_number?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          content?: string
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          direction?: string
          error?: Json | null
          from_number?: string | null
          id?: string
          provider_sid?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string
          to_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_connections: {
        Row: {
          connected: boolean
          created_at: string
          last_synced_at: string | null
          last_synced_end: string | null
          last_synced_start: string | null
          refresh_token: string | null
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connected?: boolean
          created_at?: string
          last_synced_at?: string | null
          last_synced_end?: string | null
          last_synced_start?: string | null
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connected?: boolean
          created_at?: string
          last_synced_at?: string | null
          last_synced_end?: string | null
          last_synced_start?: string | null
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          attachments: Json | null
          client_id: string
          content: string
          created_at: string | null
          entry_date: string | null
          id: string
          is_shared_with_therapist: boolean | null
          mood: string | null
          shared_with_therapists: Json | null
          sharing_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          client_id: string
          content: string
          created_at?: string | null
          entry_date?: string | null
          id?: string
          is_shared_with_therapist?: boolean | null
          mood?: string | null
          shared_with_therapists?: Json | null
          sharing_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          client_id?: string
          content?: string
          created_at?: string | null
          entry_date?: string | null
          id?: string
          is_shared_with_therapist?: boolean | null
          mood?: string | null
          shared_with_therapists?: Json | null
          sharing_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      local_documents: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          mime_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          mime_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          mime_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "local_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string
          duration_seconds: number | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          message_id: string
          mime_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          message_id: string
          mime_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          message_id?: string
          mime_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          message_type: string
          read_at: string | null
          recipient_id: string
          sender_id: string
          sequence_number: number
          status: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          message_type?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
          sequence_number?: number
          status?: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          sequence_number?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_sessions: {
        Row: {
          actor_role: string
          channel: string
          created_at: string
          expire_at: string | null
          id: string
          last_message_at: string
          options: Json | null
          phone_digits: string
          selected_id: string | null
          state: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actor_role: string
          channel: string
          created_at?: string
          expire_at?: string | null
          id?: string
          last_message_at?: string
          options?: Json | null
          phone_digits: string
          selected_id?: string | null
          state?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actor_role?: string
          channel?: string
          created_at?: string
          expire_at?: string | null
          id?: string
          last_message_at?: string
          options?: Json | null
          phone_digits?: string
          selected_id?: string | null
          state?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          related_type?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          age: string | null
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string | null
          id: string
          invite_code: string | null
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          weekly_availability: Json | null
        }
        Insert: {
          address?: string | null
          age?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string | null
          id: string
          invite_code?: string | null
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          weekly_availability?: Json | null
        }
        Update: {
          address?: string | null
          age?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string | null
          id?: string
          invite_code?: string | null
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          weekly_availability?: Json | null
        }
        Relationships: []
      }
      questionnaire_questions: {
        Row: {
          config: Json | null
          created_at: string
          help_text: string | null
          id: string
          is_required: boolean
          options: Json | null
          position: number
          question_text: string
          question_type: string
          template_id: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          options?: Json | null
          position?: number
          question_text: string
          question_type: string
          template_id: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          help_text?: string | null
          id?: string
          is_required?: boolean
          options?: Json | null
          position?: number
          question_text?: string
          question_type?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_responses: {
        Row: {
          answer: Json
          client_questionnaire_id: string
          id: string
          question_id: string
          updated_at: string
        }
        Insert: {
          answer: Json
          client_questionnaire_id: string
          id?: string
          question_id: string
          updated_at?: string
        }
        Update: {
          answer?: Json
          client_questionnaire_id?: string
          id?: string
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_client_questionnaire_id_fkey"
            columns: ["client_questionnaire_id"]
            isOneToOne: false
            referencedRelation: "client_questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          therapist_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          therapist_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          therapist_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_templates_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          client_id: string
          created_at: string
          duration_minutes: number
          id: string
          location: string | null
          notes: string | null
          session_date: string
          session_format: string | null
          session_time: string
          session_type: string
          status: string
          therapist_id: string
          therapy_type: string | null
          updated_at: string
          waiting_for_response_from: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          location?: string | null
          notes?: string | null
          session_date: string
          session_format?: string | null
          session_time: string
          session_type: string
          status?: string
          therapist_id: string
          therapy_type?: string | null
          updated_at?: string
          waiting_for_response_from?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          location?: string | null
          notes?: string | null
          session_date?: string
          session_format?: string | null
          session_time?: string
          session_type?: string
          status?: string
          therapist_id?: string
          therapy_type?: string | null
          updated_at?: string
          waiting_for_response_from?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_date: string
          client_id: string
          created_at: string | null
          denied_reason: string | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          priority: string | null
          status: string
          therapist_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_date?: string
          client_id: string
          created_at?: string | null
          denied_reason?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          status?: string
          therapist_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_date?: string
          client_id?: string
          created_at?: string | null
          denied_reason?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          status?: string
          therapist_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          created_at: string
          device_info: Json | null
          id: string
          is_active: boolean
          last_seen_at: string | null
          platform: string
          push_provider: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          platform: string
          push_provider?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          platform?: string
          push_provider?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_questionnaire: {
        Args: { p_client_id: string; p_template_id: string }
        Returns: string
      }
      cleanup_old_data: { Args: never; Returns: undefined }
      cleanup_stale_connections: { Args: never; Returns: undefined }
      create_admin_user: { Args: { user_email: string }; Returns: string }
      create_notification: {
        Args: {
          p_message: string
          p_related_id?: string
          p_related_type?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      generate_invite_code: { Args: never; Returns: string }
      get_conversation_messages_optimized: {
        Args: { p_conversation_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          content: string
          created_at: string
          id: string
          message_type: string
          read_at: string
          sender_id: string
          status: string
        }[]
      }
      get_current_user_email: { Args: never; Returns: string }
      get_dashboard_stats_optimized: {
        Args: { p_user_id: string; p_user_type: string }
        Returns: Json
      }
      get_unread_message_counts: {
        Args: { p_user_id: string }
        Returns: {
          conversation_id: string
          unread_count: number
        }[]
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      grant_admin_access: { Args: { user_email: string }; Returns: string }
      is_admin_user: { Args: never; Returns: boolean }
      mark_conversation_messages_read: {
        Args: { conv_id: string; reader_id: string }
        Returns: undefined
      }
      mark_message_delivered: {
        Args: { msg_id: string; recipient_user_id: string }
        Returns: undefined
      }
      mark_messages_as_read: {
        Args: { conv_id: string; reader_id: string }
        Returns: undefined
      }
      mark_messages_as_read_enhanced: {
        Args: { conv_id: string; reader_id: string }
        Returns: undefined
      }
      mark_messages_as_read_new: {
        Args: { conv_id: string; reader_id: string }
        Returns: {
          updated_count: number
        }[]
      }
      remove_admin_user: { Args: { user_email: string }; Returns: string }
      revoke_admin_access: { Args: { user_email: string }; Returns: string }
      submit_questionnaire: {
        Args: { p_assignment_id: string }
        Returns: undefined
      }
      update_message_status: {
        Args: { msg_id: string; new_status: string }
        Returns: undefined
      }
      update_typing_status: {
        Args: { conversation_id: string; is_typing?: boolean; user_id: string }
        Returns: undefined
      }
      upsert_questionnaire_response: {
        Args: { p_answer: Json; p_assignment_id: string; p_question_id: string }
        Returns: undefined
      }
    }
    Enums: {
      user_role: "therapist" | "client" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      user_role: ["therapist", "client", "admin"],
    },
  },
} as const
