
import React from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from "react-i18next";

interface CalendarViewSelectorProps {
  currentView: 'month' | 'week' | 'day';
  onViewChange: (view: 'month' | 'week' | 'day') => void;
  isMobile: boolean;
}

const CalendarViewSelector = ({ currentView, onViewChange, isMobile }: CalendarViewSelectorProps) => {
  const { t } = useTranslation();
  const views = [
    { key: 'month' as const, label: t('month'), shortcut: 'M' },
    { key: 'week' as const, label: t('week'), shortcut: 'W' },
    { key: 'day' as const, label: t('day'), shortcut: 'D' }
  ];

  if (isMobile) {
    return (
      <div className="flex gap-2 mt-4">
        {views.map((view) => (
          <Button
            key={view.key}
            variant="outline"
            size="sm"
            onClick={() => onViewChange(view.key)}
            className={`w-full border-border rounded-lg px-3 py-1.5 font-medium transition-colors ${
              currentView === view.key
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-card hover:bg-muted text-muted-foreground hover:text-muted-foreground'
            }`}
          >
            {view.label}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {views.map((view) => (
        <Button
          key={view.key}
          variant="outline"
          size="sm"
          onClick={() => onViewChange(view.key)}
          className={`border-border rounded-lg px-3 py-1.5 font-medium transition-colors ${
            currentView === view.key
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-card hover:bg-muted text-muted-foreground hover:text-muted-foreground'
          }`}
        >
          {view.label}
        </Button>
      ))}
    </div>
  );
};

export default CalendarViewSelector;
