-- Fix security issues - Add search_path protection to new functions

-- Fix Function Search Path Mutable warnings by setting search_path to secure defaults
ALTER FUNCTION get_conversation_messages_optimized(UUID, INTEGER, INTEGER) 
SET search_path = '';

ALTER FUNCTION get_dashboard_stats_optimized(UUID, TEXT) 
SET search_path = '';

ALTER FUNCTION get_unread_message_counts(UUID) 
SET search_path = '';