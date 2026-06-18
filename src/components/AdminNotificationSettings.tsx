
import { useState, useEffect } from "react";
import console from "@/lib/production-console";
import { 
  useOptimizedState, 
  useOptimizedEffect 
} from "@/hooks/performance/useOptimizedComponents";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Mail, Plus, X, Settings } from "lucide-react";
import { useToast } from "@/hooks/ui/use-toast";
import { adminNotificationService } from "@/services/api";
import type { AdminNotificationSettings as AdminNotificationSettingsType } from "@/services/api";

const AdminNotificationSettings = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useOptimizedState<AdminNotificationSettingsType[]>([]);
  const [loading, setLoading] = useOptimizedState(false); // Always false for instant loading
  const [newEmailInputs, setNewEmailInputs] = useOptimizedState<Record<string, string>>({});
  const { toast } = useToast();

  useOptimizedEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await adminNotificationService.getNotificationSettings();
      setSettings(data);
    } catch (error) {
      console.error("Error loading notification settings:", error);
      toast({
        title: t("error"),
        description: t("failed_to_load_notification_settings"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    const success = await adminNotificationService.updateNotificationSetting(id, {
      is_enabled: enabled
    });

    if (success) {
      setSettings(prev => prev.map(setting => 
        setting.id === id ? { ...setting, is_enabled: enabled } : setting
      ));
      toast({
        title: t("success"),
        description: t(enabled ? 'notification_enabled' : 'notification_disabled'),
      });
    } else {
      toast({
        title: t("error"),
        description: t("failed_to_update_notification"),
        variant: "destructive",
      });
    }
  };

  const handleAddEmail = async (id: string) => {
    const email = newEmailInputs[id]?.trim();
    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: t("invalid_email"),
        description: t("please_enter_valid_email"),
        variant: "destructive",
      });
      return;
    }

    const success = await adminNotificationService.addEmailAddress(id, email);

    if (success) {
      setSettings(prev => prev.map(setting => 
        setting.id === id 
          ? { ...setting, email_addresses: [...setting.email_addresses, email] }
          : setting
      ));
      setNewEmailInputs(prev => ({ ...prev, [id]: "" }));
      toast({
        title: t("success"),
        description: t("email_address_added"),
      });
    } else {
      toast({
        title: t("error"),
        description: t("failed_to_add_email"),
        variant: "destructive",
      });
    }
  };

  const handleRemoveEmail = async (id: string, email: string) => {
    const success = await adminNotificationService.removeEmailAddress(id, email);

    if (success) {
      setSettings(prev => prev.map(setting => 
        setting.id === id 
          ? { 
              ...setting, 
              email_addresses: setting.email_addresses.filter(e => e !== email) 
            }
          : setting
      ));
      toast({
        title: t("success"),
        description: t("email_address_removed"),
      });
    } else {
      toast({
        title: t("error"),
        description: t("failed_to_remove_email"),
        variant: "destructive",
      });
    }
  };

  const formatNotificationType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <Card className="bg-[#111111] border-[#1f1f23]">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-gray-400" />
            <CardTitle className="text-white text-lg">
              {t('email_notification_settings')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-gray-400">{t('loading_notification_settings')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#111111] border-[#1f1f23]">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-gray-400" />
          <CardTitle className="text-white text-lg">
            {t('email_notification_settings')}
          </CardTitle>
        </div>
        <CardDescription className="text-gray-400 text-sm">
          {t('configure_email_notifications')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {settings.map((setting) => (
          <div key={setting.id} className="space-y-4 p-4 border border-[#1f1f23] rounded-lg bg-[#0a0a0a]">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white font-medium">
                  {formatNotificationType(setting.notification_type)}
                </Label>
                <p className="text-sm text-gray-400 mt-1">
                  {t('get_notified_when', { type: setting.notification_type.replace(/_/g, ' ') })}
                </p>
              </div>
              <Switch
                checked={setting.is_enabled}
                onCheckedChange={(checked) => handleToggleEnabled(setting.id, checked)}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-white text-sm">{t('email_addresses')}</Label>
              
              {setting.email_addresses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {setting.email_addresses.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="bg-[#1f1f23] text-gray-300 hover:bg-[#2a2a2a] border-[#333]"
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      {email}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0 ml-2 hover:bg-red-600 text-gray-400 hover:text-white"
                        onClick={() => handleRemoveEmail(setting.id, email)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder={t('enter_email_address')}
                  value={newEmailInputs[setting.id] || ""}
                  onChange={(e) => setNewEmailInputs(prev => ({
                    ...prev,
                    [setting.id]: e.target.value
                  }))}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddEmail(setting.id);
                    }
                  }}
                  className="bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
                />
                <Button
                  size="sm"
                  onClick={() => handleAddEmail(setting.id)}
                  className="bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {settings.length === 0 && (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">{t('no_notification_settings')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminNotificationSettings;
