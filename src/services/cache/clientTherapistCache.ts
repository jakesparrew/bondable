import { CacheManager } from './CacheManager';
import { ConnectedTherapist } from '@/services/api/clientTherapistService';
import { Client } from '@/types/client';

// Specialized cache managers for client-therapist data
export const connectedTherapistsCache = new CacheManager({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 50,
  enablePersistence: true
});

export const therapistClientsCache = new CacheManager({
  defaultTTL: 3 * 60 * 1000, // 3 minutes
  maxSize: 100,
  enablePersistence: true
});

export const clientProfileCache = new CacheManager({
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  maxSize: 200,
  enablePersistence: true
});

// Cache key generators
export const generateConnectedTherapistsCacheKey = (clientId: string) => 
  `connected_therapists:${clientId}`;

export const generateTherapistClientsCacheKey = (therapistId: string) => 
  `therapist_clients:${therapistId}`;

export const generateClientProfileCacheKey = (clientId: string) => 
  `client_profile:${clientId}`;

// Cache invalidation patterns
export const invalidateClientTherapistCaches = (clientId?: string, therapistId?: string) => {
  if (clientId) {
    connectedTherapistsCache.invalidatePattern(new RegExp(`connected_therapists:${clientId}`));
    clientProfileCache.invalidatePattern(new RegExp(`client_profile:${clientId}`));
  }
  
  if (therapistId) {
    therapistClientsCache.invalidatePattern(new RegExp(`therapist_clients:${therapistId}`));
  }
  
  // Also invalidate general patterns if no specific IDs provided
  if (!clientId && !therapistId) {
    connectedTherapistsCache.invalidatePattern(/^connected_therapists:/);
    therapistClientsCache.invalidatePattern(/^therapist_clients:/);
    clientProfileCache.invalidatePattern(/^client_profile:/);
  }
};

export const clearAllClientTherapistCaches = () => {
  connectedTherapistsCache.clear();
  therapistClientsCache.clear();
  clientProfileCache.clear();
};