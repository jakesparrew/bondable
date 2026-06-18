
import React from 'react';
import console from "@/lib/production-console";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from "react-i18next";

interface GoogleCalendarConnectProps {
  onConnect: () => void;
}

const GoogleCalendarConnect = ({ onConnect }: GoogleCalendarConnectProps) => {
  const { t } = useTranslation();
  const handleConnectWithCalendarScope = async () => {
    try {
      console.log("Starting Google sign-in with calendar scope...");
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          scopes: 'openid profile email https://www.googleapis.com/auth/calendar',
          queryParams: { access_type: 'offline', prompt: 'consent' }
        }
      });

      if (error) {
        console.error("Google sign-in error:", error);
        toast.error(`Failed to connect to Google: ${error.message}`);
        return;
      }

      console.log("Google sign-in with calendar scope initiated successfully");
      toast.success("Redirecting to Google for calendar permissions...");
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error("Failed to initiate Google connection");
    }
  };

  return (
    <Card className="bg-card border-border max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-6 h-6 text-white" />
        </div>
        <CardTitle className="text-foreground">{t('google_calendar_permission_required')}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {t('sync_events_permission')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-sm text-blue-200">
            <strong>Note:</strong> {t('note_already_signed_in')}
          </p>
        </div>

        <Button
          onClick={handleConnectWithCalendarScope}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {t('grant_calendar_access')}
        </Button>
        
        <Button
          variant="outline"
          className="w-full border-border bg-card hover:bg-muted text-muted-foreground"
          onClick={() => window.open('https://console.cloud.google.com/', '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          {t('google_cloud_console')}
        </Button>

        <div className="text-xs text-muted-foreground text-center">
          <p>{t('calendar_scope_allows')}</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>{t('read_calendar_events')}</li>
            <li>{t('create_new_events')}</li>
            <li>{t('update_existing_events')}</li>
            <li>{t('delete_events_created')}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleCalendarConnect;
