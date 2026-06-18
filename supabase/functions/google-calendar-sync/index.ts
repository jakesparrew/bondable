import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  colorId?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  color: string;
  googleEventId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Helper to persist connection state and refresh token
    const saveConnectionState = async (
      userId: string,
      refreshToken?: string,
      lastStart?: string,
      lastEnd?: string,
    ) => {
      try {
        const payload: any = {
          user_id: userId,
          connected: true,
        };
        if (refreshToken) payload.refresh_token = refreshToken;
        if (lastStart) payload.last_synced_start = lastStart;
        if (lastEnd) payload.last_synced_end = lastEnd;
        const { error } = await supabaseClient
          .from('google_calendar_connections')
          .upsert(payload, { onConflict: 'user_id' });
        if (error) console.log('saveConnectionState error:', error.message);
      } catch (e) {
        console.log('saveConnectionState exception:', (e as Error).message);
      }
    };

    let requestBody;
    try {
      const bodyText = await req.text();
      console.log("Request body text length:", bodyText.length);
      console.log("Request body text:", bodyText);

      if (!bodyText || bodyText.trim().length === 0) {
        console.error("Empty request body received");
        return new Response(
          JSON.stringify({
            success: false,
            message: "Empty request body",
            error: "No data provided",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      requestBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid request body format",
          error: "JSON parse error",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const {
      action,
      event,
      calendarId = "primary",
      accessToken: incomingAccessToken,
      refreshToken: incomingRefreshToken,
      startDate,
      endDate,
      userTimezone = "UTC",
    } = requestBody;

    console.log(`Processing ${action} action for calendar ${calendarId}`);

    // Get authenticated user from JWT
    const { data: userResp } = await supabaseClient.auth.getUser();
    const userId = userResp?.user?.id;

    // Resolve tokens: prefer incoming, else fall back to stored refresh token
    let accessToken = incomingAccessToken as string | undefined;
    let refreshToken = incomingRefreshToken as string | undefined;

    if (!accessToken) {
      // Try to load stored refresh token
      if (userId) {
        const { data: conn, error: connErr } = await supabaseClient
          .from('google_calendar_connections')
          .select('refresh_token, connected')
          .eq('user_id', userId)
          .maybeSingle();
        if (connErr) console.log('Load stored token error:', connErr.message);
        if (conn?.connected && conn?.refresh_token) {
          console.log('Using stored refresh token to obtain access token');
          const newAccess = await refreshAccessToken(conn.refresh_token);
          if (newAccess) {
            accessToken = newAccess;
            refreshToken = conn.refresh_token;
          }
        }
      }
    }

    // If refresh token came from client, persist it for future sessions
    if (userId && incomingRefreshToken) {
      await saveConnectionState(userId, incomingRefreshToken, startDate, endDate);
    }

    // If we still don't have access token, require OAuth
    if (!accessToken) {
      console.log("No access token available after fallback");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Please connect your Google account with calendar permissions",
          error: "No Google access token",
          requiresOAuth: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    switch (action) {
      case "sync":
        // Require startDate and endDate for sync operations
        if (!startDate || !endDate) {
          return new Response(
            JSON.stringify({
              success: false,
              message: "Start date and end date are required for sync",
              error: "Missing date parameters",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        return await syncGoogleCalendar(
          accessToken,
          refreshToken,
          startDate,
          endDate
        );

      case "create":
        return await createGoogleEvent(event, accessToken, refreshToken, userTimezone);

      case "update":
        return await updateGoogleEvent(event, accessToken, refreshToken, userTimezone);

      case "delete":
        return await deleteGoogleEvent(
          event.googleEventId,
          accessToken,
          refreshToken
        );

      default:
        throw new Error("Invalid action");
    }
  } catch (error) {
    console.error("Error in google-calendar-sync:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
        message: "Google Calendar sync failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to split date range into smaller chunks
function splitDateRange(
  startDate: string,
  endDate: string,
  chunkDays: number = 14
): Array<{ start: string; end: string }> {
  const chunks = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  let currentStart = new Date(start);

  while (currentStart < end) {
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentStart.getDate() + chunkDays - 1);

    // Don't go past the original end date
    if (currentEnd > end) {
      currentEnd.setTime(end.getTime());
    }

    chunks.push({
      start: currentStart.toISOString().split("T")[0],
      end: currentEnd.toISOString().split("T")[0],
    });

    // Move to next chunk
    currentStart.setDate(currentStart.getDate() + chunkDays);
  }

  console.log(
    `Split date range ${startDate} to ${endDate} into ${chunks.length} chunks:`,
    chunks
  );
  return chunks;
}

async function syncGoogleCalendar(
  accessToken: string,
  refreshToken?: string,
  startDate?: string,
  endDate?: string
) {
  try {
    console.log("Syncing Google Calendar with access token");

    // startDate and endDate are now required parameters
    if (!startDate || !endDate) {
      throw new Error(
        "Start date and end date are required for Google Calendar sync"
      );
    }

    const timeMin = new Date(startDate).toISOString();
    const timeMax = new Date(endDate).toISOString();
    console.log(`Using exact date range: ${startDate} to ${endDate}`);

    // Calculate the number of days in the range
    const start = new Date(timeMin);
    const end = new Date(timeMax);
    const daysDiff = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    console.log(`Date range spans ${daysDiff} days`);

    let allEvents = [];

    // If the range is large (more than 30 days), split it into smaller chunks
    if (daysDiff > 30) {
      const dateChunks = splitDateRange(
        timeMin.split("T")[0],
        timeMax.split("T")[0],
        14 // 2-week chunks to ensure we stay well under 250 events per request
      );

      console.log(
        `Large date range detected. Splitting into ${dateChunks.length} chunks of ~14 days each`
      );

      for (let i = 0; i < dateChunks.length; i++) {
        const chunk = dateChunks[i];
        console.log(
          `Processing chunk ${i + 1}/${dateChunks.length}: ${chunk.start} to ${
            chunk.end
          }`
        );

        const chunkTimeMin = new Date(chunk.start).toISOString();
        const chunkTimeMax = new Date(chunk.end + "T23:59:59").toISOString();

        const chunkEvents = await fetchEventsForDateRange(
          accessToken,
          chunkTimeMin,
          chunkTimeMax,
          refreshToken
        );

        if (chunkEvents.error) {
          return chunkEvents.errorResponse;
        }

        allEvents.push(...chunkEvents.events);
        console.log(
          `Chunk ${i + 1} returned ${
            chunkEvents.events.length
          } events. Total so far: ${allEvents.length}`
        );

        // Small delay between requests to be respectful to the API
        if (i < dateChunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    } else {
      // For smaller ranges, use a single request
      console.log(`Small date range, using single request`);
      const result = await fetchEventsForDateRange(
        accessToken,
        timeMin,
        timeMax,
        refreshToken
      );

      if (result.error) {
        return result.errorResponse;
      }

      allEvents = result.events;
    }

    console.log(
      `Successfully retrieved ${allEvents.length} total events from Google Calendar`
    );

    const events = allEvents.map((item: GoogleCalendarEvent) =>
      convertGoogleEventToCalendarEvent(item)
    );

    return new Response(
      JSON.stringify({
        success: true,
        events,
        message: `Successfully synced ${events.length} events from Google Calendar for the specified date range`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in syncGoogleCalendar:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to sync from Google Calendar",
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

async function fetchEventsForDateRange(
  accessToken: string,
  timeMin: string,
  timeMax: string,
  refreshToken?: string
) {
  try {
    // Fetch all events with pagination to overcome 250 limit within this date range
    const chunkEvents = [];
    let pageToken = null;
    let requestCount = 0;
    const maxRequests = 10; // Safety limit to prevent infinite loops

    do {
      requestCount++;
      console.log(
        `Making request ${requestCount} for date range ${
          timeMin.split("T")[0]
        } to ${timeMax.split("T")[0]}${
          pageToken ? ` with pageToken: ${pageToken}` : ""
        }`
      );

      const url = new URL(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events"
      );
      url.searchParams.append("timeMin", timeMin);
      url.searchParams.append("timeMax", timeMax);
      url.searchParams.append("singleEvents", "true");
      url.searchParams.append("orderBy", "startTime");
      url.searchParams.append("maxResults", "250"); // Google's hard limit with singleEvents=true

      if (pageToken) {
        url.searchParams.append("pageToken", pageToken);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Google Calendar API response status:", response.status);

      if (response.status === 401) {
        // Token expired, try to refresh if we have a refresh token
        if (refreshToken) {
          console.log("Access token expired, attempting to refresh");
          const newAccessToken = await refreshAccessToken(refreshToken);
          if (newAccessToken) {
            return await fetchEventsForDateRange(
              newAccessToken,
              timeMin,
              timeMax
            );
          }
        }

        return {
          error: true,
          errorResponse: new Response(
            JSON.stringify({
              success: false,
              message:
                "Your Google authentication has expired. Please sign in again with Google.",
              error: "Token expired",
              needsCalendarScope: true,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          ),
        };
      }

      if (response.status === 403) {
        console.log("Calendar API access forbidden - likely missing scope");
        return {
          error: true,
          errorResponse: new Response(
            JSON.stringify({
              success: false,
              message:
                "To sync with Google Calendar, you need to reconnect your Google account with calendar permissions.",
              error: "Calendar scope required",
              needsCalendarScope: true,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          ),
        };
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Calendar API error:", response.status, errorText);
        throw new Error(
          `Google Calendar API error: ${response.status} ${errorText}`
        );
      }

      const data = await response.json();
      console.log(
        `Request ${requestCount}: Retrieved ${
          data.items?.length || 0
        } events for this chunk`
      );

      if (data.items) {
        chunkEvents.push(...data.items);
      }

      pageToken = data.nextPageToken;

      // Safety check to prevent infinite loops
      if (requestCount >= maxRequests) {
        console.log(
          `Reached maximum request limit (${maxRequests}) for this chunk, stopping pagination`
        );
        break;
      }
    } while (pageToken);

    return {
      error: false,
      events: chunkEvents,
    };
  } catch (error) {
    console.error("Error in fetchEventsForDateRange:", error);
    throw error;
  }
}

async function refreshAccessToken(
  refreshToken: string
): Promise<string | null> {
  try {
    console.log("Attempting to refresh Google access token");

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
      }),
    });

    if (!response.ok) {
      console.error("Failed to refresh token:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("Successfully refreshed access token");
    return data.access_token;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return null;
  }
}

async function createGoogleEvent(
  event: CalendarEvent,
  accessToken: string,
  refreshToken?: string,
  userTimezone: string = "UTC"
) {
  try {
    const googleEvent = convertCalendarEventToGoogleEvent(event, userTimezone);

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(googleEvent),
      }
    );

    if (response.status === 401 && refreshToken) {
      const newAccessToken = await refreshAccessToken(refreshToken);
      if (newAccessToken) {
        return await createGoogleEvent(event, newAccessToken, refreshToken, userTimezone);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Error creating Google Calendar event:",
        response.status,
        errorText
      );
      throw new Error(`Failed to create event: ${response.status}`);
    }

    const data = await response.json();
    console.log("Successfully created Google Calendar event:", data.id);

    return new Response(
      JSON.stringify({
        success: true,
        googleEventId: data.id,
        message: "Event created successfully in Google Calendar",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in createGoogleEvent:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to create event in Google Calendar",
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

async function updateGoogleEvent(
  event: CalendarEvent & { googleEventId: string },
  accessToken: string,
  refreshToken?: string,
  userTimezone: string = "UTC"
) {
  try {
    const googleEvent = convertCalendarEventToGoogleEvent(event, userTimezone);
    console.log(
      "Updating Google Calendar event with data:",
      JSON.stringify(googleEvent, null, 2)
    );

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.googleEventId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(googleEvent),
      }
    );

    if (response.status === 401 && refreshToken) {
      const newAccessToken = await refreshAccessToken(refreshToken);
      if (newAccessToken) {
        return await updateGoogleEvent(event, newAccessToken, refreshToken, userTimezone);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Error updating Google Calendar event:",
        response.status,
        errorText
      );
      throw new Error(`Failed to update event: ${response.status}`);
    }

    console.log("Successfully updated Google Calendar event");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Event updated successfully in Google Calendar",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in updateGoogleEvent:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to update event in Google Calendar",
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

async function deleteGoogleEvent(
  googleEventId: string,
  accessToken: string,
  refreshToken?: string
) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 401 && refreshToken) {
      const newAccessToken = await refreshAccessToken(refreshToken);
      if (newAccessToken) {
        return await deleteGoogleEvent(googleEventId, newAccessToken);
      }
    }

    if (!response.ok && response.status !== 410) {
      // 410 means already deleted
      const errorText = await response.text();
      console.error(
        "Error deleting Google Calendar event:",
        response.status,
        errorText
      );
      throw new Error(`Failed to delete event: ${response.status}`);
    }

    console.log("Successfully deleted Google Calendar event");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Event deleted successfully from Google Calendar",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in deleteGoogleEvent:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Failed to delete event from Google Calendar",
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

function convertGoogleEventToCalendarEvent(
  googleEvent: GoogleCalendarEvent
): CalendarEvent {
  // Handle date conversion properly to preserve the original local time
  let startDate = "";
  let endDate = "";
  let startTime: string | undefined = undefined;
  let endTime: string | undefined = undefined;

  if (googleEvent.start.date) {
    // All-day event - use date as-is
    startDate = googleEvent.start.date;
    endDate = googleEvent.end.date || googleEvent.start.date;
  } else if (googleEvent.start.dateTime) {
    // Timed event - we need to parse the datetime string manually to avoid browser timezone conversion
    const startDateTimeStr = googleEvent.start.dateTime;
    const endDateTimeStr =
      googleEvent.end.dateTime || googleEvent.start.dateTime;

    // Extract date and time from ISO string without timezone conversion
    // Format: 2025-06-20T18:00:00+02:00 or 2025-06-20T16:00:00Z
    const startMatch = startDateTimeStr.match(
      /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/
    );
    const endMatch = endDateTimeStr.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);

    if (startMatch && endMatch) {
      startDate = startMatch[1];
      endDate = endMatch[1];
      startTime = startMatch[2];
      endTime = endMatch[2];
    } else {
      // Fallback to Date parsing if regex fails
      const startDateTime = new Date(startDateTimeStr);
      const endDateTime = new Date(endDateTimeStr);

      const year = startDateTime.getFullYear();
      const month = String(startDateTime.getMonth() + 1).padStart(2, "0");
      const day = String(startDateTime.getDate()).padStart(2, "0");
      startDate = `${year}-${month}-${day}`;

      const endYear = endDateTime.getFullYear();
      const endMonth = String(endDateTime.getMonth() + 1).padStart(2, "0");
      const endDay = String(endDateTime.getDate()).padStart(2, "0");
      endDate = `${endYear}-${endMonth}-${endDay}`;

      const startHours = String(startDateTime.getHours()).padStart(2, "0");
      const startMinutes = String(startDateTime.getMinutes()).padStart(2, "0");
      startTime = `${startHours}:${startMinutes}`;

      const endHours = String(endDateTime.getHours()).padStart(2, "0");
      const endMinutes = String(endDateTime.getMinutes()).padStart(2, "0");
      endTime = `${endHours}:${endMinutes}`;
    }
  }

  console.log(
    `Converting Google event "${googleEvent.summary}": ${startDate} ${
      startTime || "all-day"
    } (original: ${googleEvent.start.dateTime})`
  );

  return {
    id: googleEvent.id || Math.random().toString(36).substr(2, 9),
    title: googleEvent.summary || "Untitled Event",
    description: googleEvent.description,
    startDate,
    endDate,
    startTime,
    endTime,
    location: googleEvent.location,
    color: getColorFromGoogleColorId(googleEvent.colorId),
    googleEventId: googleEvent.id,
  };
}

function convertCalendarEventToGoogleEvent(
  event: CalendarEvent,
  userTimezone: string = "UTC"
): GoogleCalendarEvent {

  if (event.startTime && event.endTime) {
    const startDateTime = `${event.startDate}T${event.startTime}:00`;
    const endDateTime = `${event.endDate}T${event.endTime}:00`;

    return {
      summary: event.title,
      description: event.description,
      location: event.location,
      colorId: getGoogleColorIdFromAppColor(event.color),
      start: {
        dateTime: startDateTime,
        timeZone: userTimezone,
      },
      end: {
        dateTime: endDateTime,
        timeZone: userTimezone,
      },
    };
  } else {
    return {
      summary: event.title,
      description: event.description,
      location: event.location,
      colorId: getGoogleColorIdFromAppColor(event.color),
      start: {
        date: event.startDate,
      },
      end: {
        date: event.endDate,
      },
    };
  }
}

function getColorFromGoogleColorId(colorId?: string): string {
  const colorMap: { [key: string]: string } = {
    "1": "bg-blue-600",
    "2": "bg-green-600",
    "3": "bg-purple-600",
    "4": "bg-red-600",
    "5": "bg-yellow-600",
    "6": "bg-orange-600",
    "7": "bg-teal-600",
    "8": "bg-gray-600",
    "9": "bg-indigo-600",
    "10": "bg-emerald-600",
    "11": "bg-rose-600",
  };
  return colorMap[colorId || "1"] || "bg-blue-600";
}

function getGoogleColorIdFromAppColor(appColor: string): string {
  const colorMap: { [key: string]: string } = {
    "bg-blue-600": "1",
    "bg-green-600": "2",
    "bg-purple-600": "3",
    "bg-red-600": "4",
    "bg-yellow-600": "5",
    "bg-orange-600": "6",
    "bg-teal-600": "7",
    "bg-gray-600": "8",
    "bg-indigo-600": "9",
    "bg-emerald-600": "10",
    "bg-rose-600": "11",
  };
  return colorMap[appColor] || "1";
}
