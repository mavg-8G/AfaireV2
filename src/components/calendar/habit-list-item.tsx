
"use client";

import type { Habit, HabitSlot, HabitSlotCompletionStatus } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Clock, CalendarDays } from 'lucide-react'; // Added CalendarDays
import { cn } from '@/lib/utils';
import { useTranslations } from '@/contexts/language-context';
import { format } from 'date-fns'; // To format the date
import { enUS, es, fr } from 'date-fns/locale';
import React, { useMemo } from 'react'; // Added useMemo

interface HabitListItemProps {
  habit: Habit;
  slot: HabitSlot;
  date: Date; // The specific date for which this slot's completion is being tracked
  completionStatus: HabitSlotCompletionStatus | undefined;
  onToggleCompletion: (completed: boolean) => void;
  showDate?: boolean; // Optional prop to control date visibility, defaults to true for dashboard
}

export default function HabitListItem({ habit, slot, date, completionStatus, onToggleCompletion, showDate = true }: HabitListItemProps) {
  const { t, locale } = useTranslations();
  const isCompleted = !!completionStatus?.completed;
  const uniqueId = `habit-${habit.id}-slot-${slot.id}-${date.getTime()}`; // Ensure unique ID with date

  const dateLocale = useMemo(() => {
    if (locale === 'es') return es;
    if (locale === 'fr') return fr;
    return enUS;
  }, [locale]);

  return (
    <div className={cn(
      "flex items-center justify-between p-2.5 rounded-md border bg-card shadow-xs hover:shadow-md transition-shadow duration-150 ease-in-out",
      isCompleted && "bg-muted/60 opacity-80"
    )}>
      <div className="flex items-center gap-3 grow min-w-0">
        <Checkbox
          id={uniqueId}
          checked={isCompleted}
          onCheckedChange={(checkedState) => {
            onToggleCompletion(Boolean(checkedState));
          }}
          aria-labelledby={`${uniqueId}-label`}
        />
        <div className="flex flex-col grow min-w-0">
          <Label
            htmlFor={uniqueId}
            id={`${uniqueId}-label`}
            className={cn(
              "text-sm font-medium leading-tight cursor-pointer",
              isCompleted && "line-through text-muted-foreground"
            )}
          >
            <span className="block truncate" title={`${habit.name} - ${slot.name}`}>
              {habit.icon && <habit.icon className="inline-block h-4 w-4 mr-1.5 text-primary/80" /> }
              {habit.name} - <span className="font-normal text-muted-foreground">{slot.name}</span>
            </span>
          </Label>
          <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
            {showDate && (
              <div className={cn(
                "flex items-center text-xs text-muted-foreground",
                isCompleted && "text-muted-foreground/70"
              )}>
                <CalendarDays className="mr-1 h-3 w-3" />
                {format(date, 'MMM d', { locale: dateLocale })}
              </div>
            )}
            {slot.default_time && (
              <div className={cn(
                "flex items-center text-xs text-muted-foreground",
                isCompleted && "text-muted-foreground/70"
              )}>
                <Clock className="mr-1 h-3 w-3" />
                {slot.default_time}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
