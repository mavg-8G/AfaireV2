
"use client";
import type { Activity, Category, Todo } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit3, Trash2, Clock, CalendarDays, Repeat, CalendarPlus, ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppStore } from '@/hooks/use-app-store';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/contexts/language-context';
import { format, formatISO } from 'date-fns';
import { enUS, es, fr } from 'date-fns/locale';
import { generateICSContent, downloadFile } from '@/lib/ics-utils';
import { useRouter } from 'next/navigation'; // Import useRouter for navigation
import { Label } from '@/components/ui/label'; // Import Label for associating with checkbox

interface ActivityListItemProps {
  activity: Activity; // This can be a master activity or a generated instance
  category: Category | undefined;
  onEdit: () => void;
  onDelete: () => void;
  showDate?: boolean;
  instanceDate?: Date;
}

export default function ActivityListItem({ activity, category, onEdit, onDelete, showDate, instanceDate }: ActivityListItemProps) {
  const { toggleOccurrenceCompletion, updateTodoInActivity, getRawActivities } = useAppStore();
  const { t, locale } = useTranslations();
  const router = useRouter();
  const dateLocale = locale === 'es' ? es : locale === 'fr' ? fr : enUS;

  const effectiveDate = instanceDate || new Date(activity.createdAt);
  const occurrenceDateKey = formatISO(effectiveDate, { representation: 'date' });

  const isCompletedForThisOccurrence = !!activity.completedOccurrences?.[occurrenceDateKey];

  const handleActivityCompletedChange = (completedValue: boolean) => {
    const targetActivityId = activity.masterActivityId || activity.id;
    const targetOccurrenceDateTimestamp = effectiveDate.getTime();
    toggleOccurrenceCompletion(targetActivityId, targetOccurrenceDateTimestamp, Boolean(completedValue));
  };

  const handleEditClick = () => {
    onEdit();
  };

  const handleAddToCalendar = () => {
    const icsContent = generateICSContent(activity, effectiveDate);
    const filename = `${(activity.title || 'activity').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
    downloadFile(filename, icsContent);
  };

  // Determine which todos to display and their interactivity
  let displayTodos: Todo[] = [];
  let masterActivityForTodos: Activity | undefined = undefined;

  if (activity.isRecurringInstance && activity.masterActivityId) {
    masterActivityForTodos = getRawActivities().find(a => a.id === activity.masterActivityId);
    displayTodos = masterActivityForTodos?.todos || [];
  } else {
    displayTodos = activity.todos || [];
  }
  
  const totalTodos = displayTodos.length;
  const completedTodosCount = displayTodos.filter(t => t.completed).length;


  const handleTodoCheckedChange = (todoId: number, newCheckedState: boolean) => {
    if (activity.isRecurringInstance) {
      // For recurring instances, todos are read-only in this view
      return;
    }
    // For non-recurring activities, update the todo in the master activity
    updateTodoInActivity(activity.id, todoId, { completed: newCheckedState });
  };


  return (
    <Card className={cn(
      "shadow-sm hover:shadow-md transition-shadow duration-150 ease-in-out",
      isCompletedForThisOccurrence && "bg-muted/50 opacity-75"
    )}>
      <CardHeader className="flex flex-row items-center justify-between py-2 px-3 space-y-0">
        <div className="flex items-center gap-2 grow min-w-0">
          <Checkbox
            id={`activity-completed-${activity.id}-${occurrenceDateKey}`}
            checked={isCompletedForThisOccurrence}
            onCheckedChange={handleActivityCompletedChange}
            aria-labelledby={`activity-title-${activity.id}-${occurrenceDateKey}`}
          />
          <div className="flex flex-col grow min-w-0">
            <CardTitle
              id={`activity-title-${activity.id}-${occurrenceDateKey}`}
              className={cn(
                "text-sm font-medium leading-tight truncate",
                isCompletedForThisOccurrence && "line-through text-muted-foreground"
              )}
              title={activity.title}
            >
              {activity.title}
            </CardTitle>
            {(showDate || activity.time || (activity.recurrence && activity.recurrence.type !== 'none' && !activity.isRecurringInstance)) && (
                <div className="flex flex-col mt-0.5">
                  {showDate && effectiveDate && (
                    <div className={cn(
                      "flex items-center text-xs text-muted-foreground",
                      isCompletedForThisOccurrence && "text-muted-foreground/70"
                    )}>
                      <CalendarDays className="mr-1 h-3 w-3" />
                      {format(effectiveDate, 'PPP', { locale: dateLocale })}
                    </div>
                  )}
                  {activity.time && (
                    <div className={cn(
                      "flex items-center text-xs text-muted-foreground",
                      isCompletedForThisOccurrence && "text-muted-foreground/70",
                      (showDate || (activity.recurrence && activity.recurrence.type !== 'none' && !activity.isRecurringInstance)) && "mt-0.5"
                    )}>
                      <Clock className="mr-1 h-3 w-3" />
                      {activity.time}
                    </div>
                  )}
                  {activity.recurrence && activity.recurrence.type !== 'none' && !activity.isRecurringInstance && (
                     <div className={cn(
                      "flex items-center text-xs text-muted-foreground",
                      isCompletedForThisOccurrence && "text-muted-foreground/70",
                       (showDate || activity.time) && "mt-0.5"
                    )}>
                      <Repeat className="mr-1 h-3 w-3" />
                      <span>{t(`recurrence${activity.recurrence.type.charAt(0).toUpperCase() + activity.recurrence.type.slice(1)}` as any)}</span>
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
        <div className="flex items-center shrink-0">
          <Button variant="ghost" size="icon" onClick={handleAddToCalendar} className="h-7 w-7">
            <CalendarPlus className="h-4 w-4" />
            <span className="sr-only">{t('addToCalendarSr')}</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={handleEditClick} className="h-7 w-7">
            <Edit3 className="h-4 w-4" />
            <span className="sr-only">{t('editActivitySr')}</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="h-7 w-7 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">{t('deleteActivitySr')}</span>
          </Button>
        </div>
      </CardHeader>

      {/* Combined Category and Todo Summary */}
      {(category || totalTodos > 0) && (
        <CardContent className="px-3 pt-1 pb-2 pl-9 space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            {category && (
              <Badge variant={isCompletedForThisOccurrence ? "outline" : "secondary"} className="text-xs py-0.5 px-1.5">
                {category.icon && <category.icon className="mr-1 h-3 w-3" />}
                {category.name}
              </Badge>
            )}
            {totalTodos > 0 && (
              <p className={cn("text-xs", isCompletedForThisOccurrence ? "text-muted-foreground" : "text-muted-foreground")}>
                {t('todosCompleted', { completed: completedTodosCount, total: totalTodos })}
              </p>
            )}
          </div>
        </CardContent>
      )}
      
      {/* Detailed Todos List */}
      {displayTodos.length > 0 && (
        <CardContent className="px-3 pt-0 pb-2 pl-9">
           <div className="border-t -ml-6 my-1.5"></div>
           <div className="flex items-center text-xs font-medium text-muted-foreground mb-1.5 -ml-1">
             <ListChecks className="mr-1.5 h-3.5 w-3.5" />
             {t('todosLabel')}
           </div>
          <ul className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
            {displayTodos.map((todo) => (
              <li key={todo.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`todo-${activity.id}-${todo.id}-${occurrenceDateKey}`}
                  checked={todo.completed}
                  onCheckedChange={(checked) => handleTodoCheckedChange(todo.id, Boolean(checked))}
                  disabled={activity.isRecurringInstance} // Disable for recurring instances as per plan
                  aria-labelledby={`todo-label-${activity.id}-${todo.id}`}
                />
                <Label
                  htmlFor={`todo-${activity.id}-${todo.id}-${occurrenceDateKey}`}
                  id={`todo-label-${activity.id}-${todo.id}`}
                  className={cn(
                    "text-xs leading-tight",
                    todo.completed && "line-through text-muted-foreground",
                    activity.isRecurringInstance && "cursor-default" // Indicate non-interactive for recurring
                  )}
                >
                  {todo.text}
                </Label>
              </li>
            ))}
          </ul>
        </CardContent>
      )}

      {/* Fallback messages if no category and no todos */}
      {!category && totalTodos === 0 && (
         <CardContent className="px-3 pt-1 pb-2 pl-9">
            <p className={cn("text-xs mt-1", isCompletedForThisOccurrence ? "text-muted-foreground/80" : "text-muted-foreground")}>
              {t('noDetailsAvailable')}
            </p>
        </CardContent>
      )}
    </Card>
  );
}
