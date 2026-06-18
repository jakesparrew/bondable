/**
 * Type Guards and Validation Utilities
 * Runtime type checking functions for better type safety
 */

import { BaseEntity, TimestampedEntity, UserOwnedEntity } from './SharedInterfaces';
import { UserProfile, UserRole } from './User';
import { Session, SessionStatus } from './Session';
import { Message, MessageStatus, MessageType } from './Message';

// Base type guards
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function isValidISO8601(dateString: string): boolean {
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  return iso8601Regex.test(dateString) && !isNaN(Date.parse(dateString));
}

// Entity type guards
export function isBaseEntity(value: unknown): value is BaseEntity {
  return isObject(value) &&
         isString(value.id) &&
         isValidUUID(value.id) &&
         isString(value.created_at) &&
         isValidISO8601(value.created_at) &&
         isString(value.updated_at) &&
         isValidISO8601(value.updated_at);
}

export function isTimestampedEntity(value: unknown): value is TimestampedEntity {
  if (!isBaseEntity(value)) return false;
  
  const entity = value as TimestampedEntity;
  return (entity.created_by === undefined || isString(entity.created_by)) &&
         (entity.updated_by === undefined || isString(entity.updated_by));
}

export function isUserOwnedEntity(value: unknown): value is UserOwnedEntity {
  return isBaseEntity(value) &&
         isObject(value) &&
         isString(value.user_id) &&
         isValidUUID(value.user_id) &&
         isString(value.owner_type) &&
         ['client', 'therapist', 'admin'].includes(value.owner_type);
}

// User type guards
export function isUserRole(value: unknown): value is UserRole {
  return isString(value) && ['client', 'therapist', 'admin'].includes(value);
}

export function isUserProfile(value: unknown): value is UserProfile {
  if (!isBaseEntity(value) || !isObject(value)) return false;
  
  const profile = value as any;
  return isString(profile.email) &&
         isValidEmail(profile.email) &&
         isUserRole(profile.role) &&
         (profile.first_name === undefined || isString(profile.first_name)) &&
         (profile.last_name === undefined || isString(profile.last_name));
}

// Session type guards
export function isSessionStatus(value: unknown): value is SessionStatus {
  return isString(value) && 
         ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'No Show'].includes(value);
}

export function isSession(value: unknown): value is Session {
  if (!isBaseEntity(value) || !isObject(value)) return false;
  
  const session = value as any;
  return isString(session.client_id) &&
         isValidUUID(session.client_id) &&
         isString(session.therapist_id) &&
         isValidUUID(session.therapist_id) &&
         isString(session.session_date) &&
         isString(session.session_time) &&
         isNumber(session.duration_minutes) &&
         isSessionStatus(session.status) &&
         isString(session.session_type);
}

// Message type guards
export function isMessageType(value: unknown): value is MessageType {
  return isString(value) && ['app', 'sms', 'ai'].includes(value);
}

export function isMessageStatus(value: unknown): value is MessageStatus {
  return isString(value) && ['sending', 'sent', 'delivered', 'read'].includes(value);
}

export function isMessage(value: unknown): value is Message {
  if (!isBaseEntity(value) || !isObject(value)) return false;
  
  const message = value as any;
  return isString(message.conversation_id) &&
         isValidUUID(message.conversation_id) &&
         isString(message.sender_id) &&
         isValidUUID(message.sender_id) &&
         isString(message.recipient_id) &&
         isValidUUID(message.recipient_id) &&
         isString(message.content) &&
         isMessageType(message.message_type) &&
         isMessageStatus(message.status) &&
         isNumber(message.sequence_number);
}

// Array type guards
export function isArrayOf<T>(
  value: unknown,
  itemGuard: (item: unknown) => item is T
): value is T[] {
  return isArray(value) && value.every(itemGuard);
}

export function isUserProfileArray(value: unknown): value is UserProfile[] {
  return isArrayOf(value, isUserProfile);
}

export function isSessionArray(value: unknown): value is Session[] {
  return isArrayOf(value, isSession);
}

export function isMessageArray(value: unknown): value is Message[] {
  return isArrayOf(value, isMessage);
}

// Object property validation
export function hasRequiredKeys<T extends Record<string, unknown>>(
  obj: unknown,
  keys: (keyof T)[]
): obj is T {
  if (!isObject(obj)) return false;
  
  return keys.every(key => key in obj);
}

export function validateObjectShape<T>(
  obj: unknown,
  validators: Record<string, (value: unknown) => boolean>
): obj is T {
  if (!isObject(obj)) return false;
  
  return Object.entries(validators).every(([key, validator]) => {
    const value = (obj as any)[key];
    return validator(value);
  });
}

// Nested object validation
export function isNestedObjectValid<T>(
  obj: unknown,
  path: string,
  validator: (value: unknown) => value is T
): boolean {
  if (!isObject(obj)) return false;
  
  const keys = path.split('.');
  let current: any = obj;
  
  for (const key of keys) {
    if (!isObject(current) || !(key in current)) {
      return false;
    }
    current = current[key];
  }
  
  return validator(current);
}

// API response validation
export function isSuccessResponse<T>(
  response: unknown,
  dataValidator?: (data: unknown) => data is T
): response is { success: true; data: T; meta?: any } {
  if (!isObject(response)) return false;
  
  const resp = response as any;
  const isValidStructure = resp.success === true && 'data' in resp;
  
  if (!isValidStructure) return false;
  
  return dataValidator ? dataValidator(resp.data) : true;
}

export function isErrorResponse(
  response: unknown
): response is { success: false; error: { code: string; message: string } } {
  if (!isObject(response)) return false;
  
  const resp = response as any;
  return resp.success === false &&
         isObject(resp.error) &&
         isString(resp.error.code) &&
         isString(resp.error.message);
}

// Pagination validation
export function isPaginationParams(value: unknown): value is {
  page: number;
  limit: number;
  total?: number;
} {
  if (!isObject(value)) return false;
  
  const params = value as any;
  return isNumber(params.page) &&
         isNumber(params.limit) &&
         params.page > 0 &&
         params.limit > 0 &&
         (params.total === undefined || isNumber(params.total));
}

// File validation
export function isValidFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

export function isValidFileSize(file: File, maxSizeBytes: number): boolean {
  return file.size <= maxSizeBytes;
}

export function isValidImageFile(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  return isValidFileType(file, allowedTypes) && isValidFileSize(file, maxSize);
}

// Date validation helpers
export function isValidDateRange(startDate: string, endDate: string): boolean {
  if (!isValidISO8601(startDate) || !isValidISO8601(endDate)) {
    return false;
  }
  
  return new Date(startDate) <= new Date(endDate);
}

export function isValidTimeSlot(startTime: string, endTime: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return false;
  }
  
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return startMinutes < endMinutes;
}

// Custom validation composer
export function createValidator<T>(
  guards: Array<(value: unknown) => boolean>,
  errorMessage: string = 'Validation failed'
): (value: unknown) => value is T {
  return (value: unknown): value is T => {
    const isValid = guards.every(guard => guard(value));
    if (!isValid) {
      console.warn(`Validation failed: ${errorMessage}`, value);
    }
    return isValid;
  };
}

// Validation result helper
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateWithDetails(
  value: unknown,
  validators: Array<{ guard: (value: unknown) => boolean; message: string }>
): ValidationResult {
  const errors: string[] = [];
  
  validators.forEach(({ guard, message }) => {
    if (!guard(value)) {
      errors.push(message);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}