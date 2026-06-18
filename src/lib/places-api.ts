import { supabase } from "@/integrations/supabase/client";

// Simple in-memory + localStorage cache to avoid repeated Supabase calls for the API key
let googlePlacesApiKeyCache: string | null = null;
const GOOGLE_PLACES_API_LS_KEY = 'google_places_api_key';

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

export interface PlaceDetails {
  place_id: string;
  formatted_address: string;
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

// Get the Google Places API key from Supabase secrets
const getGooglePlacesApiKey = async (): Promise<string | null> => {
  // 1) In-memory cache
  if (googlePlacesApiKeyCache) return googlePlacesApiKeyCache;

  // 2) Try localStorage (guarded for SSR)
  try {
    if (typeof window !== 'undefined') {
      const fromStorage = window.localStorage.getItem(GOOGLE_PLACES_API_LS_KEY);
      if (fromStorage) {
        googlePlacesApiKeyCache = fromStorage;
        return googlePlacesApiKeyCache;
      }
    }
  } catch (_) {
    // Ignore storage errors (private mode, etc.)
  }

  // 3) Fetch from Supabase Edge Function as a fallback
  try {
    const { data, error } = await supabase.functions.invoke('get-secret', {
      body: { secret_name: 'GOOGLE_PLACES_API' }
    });

    if (error) {
      console.error('Error fetching Google Places API key:', error);
      return null;
    }

    const key = data?.secret || null;
    if (key) {
      googlePlacesApiKeyCache = key;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(GOOGLE_PLACES_API_LS_KEY, key);
        }
      } catch (_) {
        // Ignore storage errors
      }
    }

    return key;
  } catch (error) {
    console.error('Error fetching Google Places API key:', error);
    return null;
  }
};

const PLACES_API_BASE_URL = 'https://places.googleapis.com/v1';

// In-memory caches for Places responses
const AUTOCOMPLETE_TTL = 3 * 60 * 1000; // 3 minutes
const DETAILS_TTL = 5 * 60 * 1000; // 5 minutes

type CacheEntry<T> = { data: T; expires: number };
const autocompleteCache = new Map<string, CacheEntry<PlacePrediction[]>>();
const detailsCache = new Map<string, CacheEntry<PlaceDetails>>();

// Function to get place autocomplete suggestions
export const getPlaceAutocomplete = async (input: string): Promise<PlacePrediction[]> => {
  if (!input || input.length < 3) {
    return [];
  }

  const key = input.trim().toLowerCase();
  // Check cache first
  const cached = autocompleteCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    const apiKey = await getGooglePlacesApiKey();
    if (!apiKey) {
      console.warn('Google Places API key not found');
      return [];
    }

    const response = await fetch(`${PLACES_API_BASE_URL}/places:autocomplete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input: input,
        languageCode: 'en',
      }),
    });

    if (!response.ok) {
      console.warn(`Places API autocomplete failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    let suggestions: PlacePrediction[] = [];
    if (data.suggestions) {
      suggestions = data.suggestions
        .filter((suggestion: any) => suggestion.placePrediction)
        .map((suggestion: any) => ({
          place_id: suggestion.placePrediction.placeId,
          description: suggestion.placePrediction.text?.text || '',
          structured_formatting: suggestion.placePrediction.structuredFormat ? {
            main_text: suggestion.placePrediction.structuredFormat.mainText?.text || '',
            secondary_text: suggestion.placePrediction.structuredFormat.secondaryText?.text || '',
          } : undefined,
        }));
    }

    // Update cache
    autocompleteCache.set(key, {
      data: suggestions,
      expires: Date.now() + AUTOCOMPLETE_TTL,
    });

    return suggestions;
  } catch (error) {
    console.error('Error fetching place autocomplete:', error);
    return [];
  }
};

// Function to get place details
export const getPlaceDetailsById = async (placeId: string): Promise<PlaceDetails | null> => {
  if (!placeId) {
    return null;
  }

  // Cache check
  const cached = detailsCache.get(placeId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    const apiKey = await getGooglePlacesApiKey();
    if (!apiKey) {
      console.warn('Google Places API key not found');
      return null;
    }

    const response = await fetch(`${PLACES_API_BASE_URL}/places/${placeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,formattedAddress,addressComponents,location',
      },
    });

    if (!response.ok) {
      console.warn(`Places API details failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    const details: PlaceDetails = {
      place_id: data.id || placeId,
      formatted_address: data.formattedAddress || '',
      address_components: data.addressComponents ? data.addressComponents.map((component: any) => ({
        long_name: component.longText || '',
        short_name: component.shortText || '',
        types: component.types || [],
      })) : [],
      geometry: data.location ? {
        location: {
          lat: data.location.latitude || 0,
          lng: data.location.longitude || 0,
        },
      } : undefined,
    };

    // Update cache
    detailsCache.set(placeId, {
      data: details,
      expires: Date.now() + DETAILS_TTL,
    });

    return details;
  } catch (error) {
    console.error('Error fetching place details:', error);
    return null;
  }
};