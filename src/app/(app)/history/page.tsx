
"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/hooks/use-app-store';
import { useTranslations } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, History as HistoryIconLucide, User, Briefcase, Tag, Shield, Loader2, Brain, Users, Globe } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { enUS, es, fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { HistoryLogEntry } from '@/lib/types';

interface GroupedHistory {
  [dateKey: string]: HistoryLogEntry[];
}

export default function HistoryPage() {
  const { historyLog, isLoading, selectedTimezone } = useAppStore();
  const { t, locale } = useTranslations();
  const dateLocale = useMemo(() => (locale === 'es' ? es : locale === 'fr' ? fr : enUS), [locale]);

  const getScopeInfo = (scope: string) => {
    switch (scope) {
      case 'account':
        return { label: t('historyScopeAccount'), icon: Shield, color: 'bg-blue-500 dark:bg-blue-700' };
      case 'personal':
        return { label: t('historyScopePersonal'), icon: User, color: 'bg-green-500 dark:bg-green-700' };
      case 'work':
        return { label: t('historyScopeWork'), icon: Briefcase, color: 'bg-purple-500 dark:bg-purple-700' };
      case 'category':
        return { label: t('historyScopeCategory'), icon: Tag, color: 'bg-orange-500 dark:bg-orange-700' };
      case 'assignee':
        return { label: t('historyScopeAssignee'), icon: Users, color: 'bg-teal-500 dark:bg-teal-700' };
      case 'habit':
        return { label: t('historyScopeHabit'), icon: Brain, color: 'bg-pink-500 dark:bg-pink-700' };
      default:
        return { label: scope, icon: HistoryIconLucide, color: 'bg-gray-500 dark:bg-gray-700' };
    }
  };

  const groupedHistory = useMemo(() => {
    if (!historyLog) return {};
    return historyLog.reduce((acc, entry) => {
      try {
        const entryDateUTC = new Date(entry.timestamp);
        // Convert UTC date to the selected timezone
        const zonedEntryDate = toZonedTime(entryDateUTC, selectedTimezone);
        // Format this zoned date to get the day key as it is in that timezone
        const dayKey = formatInTimeZone(zonedEntryDate, selectedTimezone, 'yyyy-MM-dd');

        if (!acc[dayKey]) {
          acc[dayKey] = [];
        }
        acc[dayKey].push(entry);
      } catch (e) {
        console.warn(`[HistoryPage] Error processing timestamp for grouping (entry ID ${entry.id}, tz: ${selectedTimezone}):`, e);
        // Fallback to UTC grouping if timezone conversion fails for grouping key
        const dayKeyUTC = format(new Date(entry.timestamp), 'yyyy-MM-dd');
         if (!acc[dayKeyUTC]) {
          acc[dayKeyUTC] = [];
        }
        acc[dayKeyUTC].push(entry);
      }
      return acc;
    }, {} as GroupedHistory);
  }, [historyLog, selectedTimezone]);

  const sortedDateKeys = useMemo(() => {
    return Object.keys(groupedHistory).sort((a, b) => parseISO(b).getTime() - parseISO(a).getTime());
  }, [groupedHistory]);

  const formatTimestampForDisplay = (timestamp: number): string => {
    try {
      return formatInTimeZone(new Date(timestamp), selectedTimezone, 'p', { locale: dateLocale });
    } catch (e) {
      console.warn(`[HistoryPage] Error formatting timestamp ${timestamp} in timezone ${selectedTimezone}. Falling back to local time. Error:`, e);
      return format(new Date(timestamp), 'p', { locale: dateLocale });
    }
  };
  
  const formatDateHeader = (dateKey: string): string => {
    try {
       // The dateKey is 'yyyy-MM-dd' *in the selected timezone*.
       // parseISO will parse it as a local date. format will then display it using dateLocale.
       const dateObject = parseISO(dateKey); 
       return format(dateObject, 'PPPP', { locale: dateLocale });
    } catch (e) {
        console.warn(`[HistoryPage] Error formatting date header for key ${dateKey}. Error:`, e);
        return dateKey; 
    }
  };


  return (
    <div className="flex flex-col flex-grow min-h-screen">
      <main className="flex-grow container mx-auto py-8 px-4">
        <div className="mb-6 flex justify-start">
          <Link href="/" passHref>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backToCalendar')}
            </Button>
          </Link>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <HistoryIconLucide className="h-6 w-6 text-primary" />
              <CardTitle>{t('historyPageTitle')}</CardTitle>
            </div>
            <CardDescription>{t('historyPageDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-[calc(100vh-20rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : sortedDateKeys.length > 0 ? (
              <ScrollArea className="h-[calc(100vh-20rem)] pr-2">
                {sortedDateKeys.map((dateKey) => (
                  <div key={dateKey} className="mb-6">
                    <h2 className="text-lg font-semibold text-primary mb-3 sticky top-0 bg-background/90 backdrop-blur-sm py-2 z-10 border-b">
                      {formatDateHeader(dateKey)}
                    </h2>
                    <ul className="space-y-4">
                      {groupedHistory[dateKey].map((entry) => {
                        const scopeInfo = getScopeInfo(entry.scope);
                        let actionText = entry.backendAction || entry.actionKey;
                        try {
                           const translatableDetails: Record<string, string | number | boolean> = {};
                           if (entry.details) {
                             for (const key in entry.details) {
                               if (Object.prototype.hasOwnProperty.call(entry.details, key)) {
                                 const value = entry.details[key];
                                 if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                                   translatableDetails[key] = value;
                                 } else if (value === null || value === undefined) {
                                   translatableDetails[key] = t('notSetValuePlaceholder');
                                 } else {
                                   translatableDetails[key] = String(value);
                                 }
                               }
                             }
                           }
                          actionText = t(entry.actionKey as any, translatableDetails);
                        } catch (e) {
                          console.warn(`Missing translation or invalid params for history action key: ${entry.actionKey}. Details:`, entry.details, "Error:", e);
                        }

                        const formattedTime = formatTimestampForDisplay(entry.timestamp);

                        return (
                          <li key={entry.id} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg shadow-sm border">
                            <div className={cn("mt-1 p-1.5 rounded-full text-white flex-shrink-0", scopeInfo.color)}>
                              <scopeInfo.icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground break-words">
                                {actionText}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formattedTime}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </ScrollArea>
            ) : (
              <p className="text-center text-muted-foreground py-10">{t('noHistoryYet')}</p>
            )}
          </CardContent>
          {!isLoading && historyLog.length > 0 && (
            <CardFooter className="text-sm text-muted-foreground">
              {t('categoriesCount', { count: historyLog.length })}
            </CardFooter>
          )}
        </Card>
      </main>
    </div>
  );
}

