
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ActivityFiltersProps {
  activityFilter: string;
  clientFilter: string;
  timeFilter: string;
  onActivityFilterChange: (value: string) => void;
  onClientFilterChange: (value: string) => void;
  onTimeFilterChange: (value: string) => void;
  onClearFilters: () => void;
  availableClients?: string[];
  showClientFilter?: boolean;
  clientFilterLabel?: string;
}

const ActivityFilters = ({
  activityFilter,
  clientFilter,
  timeFilter,
  onActivityFilterChange,
  onClientFilterChange,
  onTimeFilterChange,
  onClearFilters,
  availableClients = [],
  showClientFilter = true,
  clientFilterLabel = "Client"
}: ActivityFiltersProps) => {
  const { t } = useTranslation();
  const hasActiveFilters = activityFilter !== "all" || clientFilter !== "all" || timeFilter !== "all";

  return (
    <Card className="bg-[#111111] border-[#1f1f23] mb-4">
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[150px]">
            <label className="text-sm text-gray-400 mb-1 block">{t('activity_type')}</label>
            <Select value={activityFilter} onValueChange={onActivityFilterChange}>
              <SelectTrigger className="bg-[#1a1a1a] border-[#1f1f23] text-white">
                <SelectValue placeholder={t('all_activities')} />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[#1f1f23]">
                <SelectItem value="all" className="text-white hover:bg-[#2a2a2a]">{t('all_activities_cap')}</SelectItem>
                <SelectItem value="session" className="text-white hover:bg-[#2a2a2a]">{t('sessions')}</SelectItem>
                <SelectItem value="message" className="text-white hover:bg-[#2a2a2a]">{t('messages')}</SelectItem>
                <SelectItem value="task" className="text-white hover:bg-[#2a2a2a]">{t('tasks')}</SelectItem>
                <SelectItem value="journal" className="text-white hover:bg-[#2a2a2a]">{t('journal')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showClientFilter && (
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm text-gray-400 mb-1 block">{t(clientFilterLabel)}</label>
              <Select value={clientFilter} onValueChange={onClientFilterChange}>
                <SelectTrigger className="bg-[#1a1a1a] border-[#1f1f23] text-white">
                  <SelectValue placeholder={`${t('all')} ${t(clientFilterLabel)}s`} />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#1f1f23]">
                  <SelectItem value="all" className="text-white hover:bg-[#2a2a2a]">{t('all')} {t(clientFilterLabel)}s</SelectItem>
                  {availableClients.map((client) => (
                    <SelectItem key={client} value={client} className="text-white hover:bg-[#2a2a2a]">
                       {t(client)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex-1 min-w-[150px]">
            <label className="text-sm text-gray-400 mb-1 block">{t('time_period')}</label>
            <Select value={timeFilter} onValueChange={onTimeFilterChange}>
              <SelectTrigger className="bg-[#1a1a1a] border-[#1f1f23] text-white">
                <SelectValue placeholder={t('all_time')} />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[#1f1f23]">
                <SelectItem value="all" className="text-white hover:bg-[#2a2a2a]">{t('all_time_cap')}</SelectItem>
                <SelectItem value="today" className="text-white hover:bg-[#2a2a2a]">{t('today')}</SelectItem>
                <SelectItem value="week" className="text-white hover:bg-[#2a2a2a]">{t('this_week')}</SelectItem>
                <SelectItem value="month" className="text-white hover:bg-[#2a2a2a]">{t('this_month')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="h-[38px] px-3 mt-[24px] bg-[#1a1a1a] border-[#1f1f23] text-gray-400 hover:bg-[#2a2a2a] hover:text-white flex items-center"
          >
            <X className="h-4 w-4 mr-1" />
            {t('clear')}
          </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityFilters;
