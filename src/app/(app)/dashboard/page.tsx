
"use client";

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { BarChartDataItem, BarProps as ChartBarProps } from '@/components/ui/chart';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/hooks/use-app-store';
import type { Activity, Category, Habit, HabitSlot, HabitCompletions } from '@/lib/types';
import { useTranslations } from '@/contexts/language-context';
import {
  format,
  subDays,
  isSameDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachWeekOfInterval,
  isWithinInterval,
  parseISO,
  getDay as getDayOfWeekFn,
  differenceInCalendarDays,
  addDays as addDaysFns,
  startOfDay,
  endOfDay,
  formatISO,
  isBefore,
  isAfter,
  isEqual,
  addWeeks,
  addMonths,
  getDate as getDayOfMonthFn,
  setDate as setDayOfMonth
} from 'date-fns';
import { enUS, es, fr, type Locale as DateFnsLocale } from 'date-fns/locale';
import { ArrowLeft, LayoutDashboard, ListChecks, BarChart3, CheckCircle, Circle, TrendingUp, LineChart, ActivityIcon, Flame, Package, TrendingDown, Brain } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic';
import ActivityListItem from '@/components/calendar/activity-list-item';
import HabitListItem from '@/components/calendar/habit-list-item';


const BarChart = dynamic(() => import('@/components/ui/chart').then(mod => mod.BarChart), {
  loading: () => <Skeleton className="h-[350px] w-full" />,
  ssr: false,
});


type ChartViewMode = 'weekly' | 'monthly';
type ListViewTimeRange = 'last7days' | 'currentMonth';
type ProductivityViewTimeRange = 'last7days' | 'currentMonth';
type DashboardMainView = 'chart' | 'list' | 'productivity';


interface ProcessedHabitSlotOccurrence {
  habit: Habit;
  slot: HabitSlot;
  date: Date;
  isCompleted: boolean;
}

// Helper to generate activity instances for dashboard calculations
function generateDashboardActivityInstances(
  masterActivity: Activity,
  viewStartDate: Date,
  viewEndDate: Date,
  dateLocale: DateFnsLocale
): Activity[] {
  if (!masterActivity.recurrence || masterActivity.recurrence.type === 'none') {
    const activityDate = new Date(masterActivity.createdAt);
    if (isWithinInterval(activityDate, { start: viewStartDate, end: viewEndDate }) || isSameDay(activityDate, viewStartDate) || isSameDay(activityDate, viewEndDate)) {
       return [{
        ...masterActivity,
        isRecurringInstance: false,
        originalInstanceDate: masterActivity.createdAt,
        masterActivityId: masterActivity.id
      }];
    }
    return [];
  }

  const instances: Activity[] = [];
  const recurrence = masterActivity.recurrence;
  let currentDate = new Date(masterActivity.createdAt);
   const weekStartsOn = dateLocale.options?.weekStartsOn ?? 0;

   if (isBefore(currentDate, viewStartDate)) {
      if (recurrence.type === 'daily') {
          currentDate = viewStartDate;
      } else if (recurrence.type === 'weekly' && recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
          let tempDate = startOfWeek(viewStartDate, { weekStartsOn: weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
          while(isBefore(tempDate, new Date(masterActivity.createdAt)) || !recurrence.daysOfWeek.includes(getDayOfWeekFn(tempDate)) || isBefore(tempDate, viewStartDate) ) {
              tempDate = addDaysFns(tempDate, 1);
              if (isAfter(tempDate, viewEndDate) && isAfter(tempDate, new Date(masterActivity.createdAt))) break;
          }
          currentDate = tempDate;

      } else if (recurrence.type === 'monthly' && recurrence.dayOfMonth) {
          let tempMasterStartMonthDay = setDayOfMonth(new Date(masterActivity.createdAt), recurrence.dayOfMonth);
          if (isBefore(tempMasterStartMonthDay, new Date(masterActivity.createdAt))) {
              tempMasterStartMonthDay = addMonths(tempMasterStartMonthDay, 1);
          }
          currentDate = setDayOfMonth(viewStartDate, recurrence.dayOfMonth);
          if (isBefore(currentDate, viewStartDate)) currentDate = addMonths(currentDate,1); 
          if (isBefore(currentDate, tempMasterStartMonthDay)) {
             currentDate = tempMasterStartMonthDay;
          }
      }
  }

  const seriesEndDate = recurrence.endDate ? new Date(recurrence.endDate) : null;
  let iterations = 0;
  const maxIterations = 366 * 2; 

  while (iterations < maxIterations && !isAfter(currentDate, viewEndDate)) {
    iterations++;
    if (seriesEndDate && isAfter(currentDate, seriesEndDate)) break;
    if (isBefore(currentDate, new Date(masterActivity.createdAt))) {
        if (recurrence.type === 'daily') currentDate = addDaysFns(currentDate, 1);
        else if (recurrence.type === 'weekly') currentDate = addDaysFns(currentDate, 1); 
        else if (recurrence.type === 'monthly') {
           if (recurrence.dayOfMonth) {
                let nextIterationDate;
                const currentMonthTargetDay = setDayOfMonth(currentDate, recurrence.dayOfMonth);
                if(isAfter(currentMonthTargetDay, currentDate) && getDayOfMonthFn(currentMonthTargetDay) === recurrence.dayOfMonth){
                     nextIterationDate = currentMonthTargetDay;
                } else {
                     let nextMonthDate = addMonths(currentDate, 1);
                     nextIterationDate = setDayOfMonth(nextMonthDate, recurrence.dayOfMonth);
                }
                currentDate = nextIterationDate;
            } else {
                currentDate = addDaysFns(currentDate, 1); 
            }
        } else break;
        continue;
    }

    let isValidOccurrence = false;
    switch (recurrence.type) {
      case 'daily':
        isValidOccurrence = true;
        break;
      case 'weekly':
        if (recurrence.daysOfWeek?.includes(getDayOfWeekFn(currentDate))) {
          isValidOccurrence = true;
        }
        break;
      case 'monthly':
        if (recurrence.dayOfMonth && getDayOfMonthFn(currentDate) === recurrence.dayOfMonth) {
          isValidOccurrence = true;
        }
        break;
    }

    if (isValidOccurrence) {
      const occurrenceDateKey = formatISO(currentDate, { representation: 'date' });
      instances.push({
        ...masterActivity,
        id: `${masterActivity.id}_${currentDate.getTime()}`,
        isRecurringInstance: true,
        originalInstanceDate: currentDate.getTime(),
        masterActivityId: masterActivity.id,
        completed: !!masterActivity.completedOccurrences?.[occurrenceDateKey],
        todos: masterActivity.todos.map(todo => ({...todo, id: uuidv4(), completed: false})), 
      });
    }

    if (recurrence.type === 'daily') {
      currentDate = addDaysFns(currentDate, 1);
    } else if (recurrence.type === 'weekly') {
      currentDate = addDaysFns(currentDate, 1); 
    } else if (recurrence.type === 'monthly') {
        if (recurrence.dayOfMonth) {
            let nextIterationDate;
            const currentMonthTargetDay = setDayOfMonth(currentDate, recurrence.dayOfMonth);
            if(isAfter(currentMonthTargetDay, currentDate) && getDayOfMonthFn(currentMonthTargetDay) === recurrence.dayOfMonth){ 
                 nextIterationDate = currentMonthTargetDay;
            } else { 
                 let nextMonthDate = addMonths(currentDate, 1);
                 nextIterationDate = setDayOfMonth(nextMonthDate, recurrence.dayOfMonth);
            }
            currentDate = nextIterationDate;
        } else {
            currentDate = addDaysFns(currentDate, 1); 
        }
    } else {
      break;
    }
  }
  return instances;
}

// Helper to generate habit slot occurrences for a range
function generateHabitSlotOccurrencesForRange(
  allHabits: Habit[],
  allHabitCompletions: HabitCompletions,
  rangeStartDate: Date,
  rangeEndDate: Date
): ProcessedHabitSlotOccurrence[] {
  const occurrences: ProcessedHabitSlotOccurrence[] = [];
  const daysInInterval = eachDayOfInterval({ start: rangeStartDate, end: rangeEndDate });

  daysInInterval.forEach(day => {
    const dateKey = formatISO(day, { representation: 'date' });
    allHabits.forEach(habit => {
      // Only include slots for days on or after the habit was created
      if (day >= new Date(habit.createdAt)) {
        habit.slots.forEach(slot => {
          const completionStatus = allHabitCompletions[habit.id]?.[dateKey]?.[slot.id];
          occurrences.push({
            habit,
            slot,
            date: day,
            isCompleted: !!completionStatus?.completed,
          });
        });
      }
    });
  });
  return occurrences;
}

// Helper to check if a specific activity instance is complete
const isActivityInstanceCompleted = (
  instance: Activity,
  rawMasterActivitiesList: Activity[]
): boolean => {
  if (!instance.isRecurringInstance && instance.originalInstanceDate === instance.createdAt) {
    return !!instance.completed;
  }
  const masterActivity = rawMasterActivitiesList.find(ma => ma.id === instance.masterActivityId);
  if (!masterActivity) return false;
  if (instance.originalInstanceDate) {
    const occurrenceDateKey = formatISO(new Date(instance.originalInstanceDate), { representation: 'date' });
    return !!masterActivity.completedOccurrences?.[occurrenceDateKey];
  }
  return !!instance.completed;
};

type DashboardItemBase = {
  id: string;
  originalDate: Date;
  title: string;
  displayTime?: string;
};
type ActivityDashboardItem = DashboardItemBase & {
  type: 'activity';
  item: Activity; // The instance
  category?: Category;
  isCompleted: boolean;
};
type HabitDashboardItem = DashboardItemBase & {
  type: 'habit';
  item: ProcessedHabitSlotOccurrence;
  isCompleted: boolean;
};
type DashboardDisplayItem = ActivityDashboardItem | HabitDashboardItem;


export default function DashboardPage() {
  const { getRawActivities, getCategoryById, habits, habitCompletions, toggleHabitSlotCompletion, deleteActivity, toggleOccurrenceCompletion } = useAppStore();
  const { t, locale } = useTranslations();
  const router = useRouter();
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>('weekly');
  const [listViewTimeRange, setListViewTimeRange] = useState<ListViewTimeRange>('last7days');
  const [productivityViewTimeRange, setProductivityViewTimeRange] = useState<ProductivityViewTimeRange>('last7days');
  const [dashboardMainView, setDashboardMainView] = useState<DashboardMainView>('chart');
  const [hasMounted, setHasMounted] = useState(false);

  const dateLocale = locale === 'es' ? es : locale === 'fr' ? fr : enUS;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const activityChartData = useMemo((): BarChartDataItem[] => {
    if (!hasMounted) return [];
    const rawMasterActivities = getRawActivities();
    const today = new Date();

    if (chartViewMode === 'weekly') {
      return Array.from({ length: 7 }).map((_, i) => {
        const currentDateForChart = subDays(today, 6 - i);
        const dayStart = startOfDay(currentDateForChart);
        const dayEnd = endOfDay(currentDateForChart);
        
        let totalActivitiesThisDay = 0;
        let completedActivitiesThisDay = 0;
        rawMasterActivities.forEach(masterActivity => {
          const instances = generateDashboardActivityInstances(masterActivity, dayStart, dayEnd, dateLocale);
          instances.forEach(instance => {
            if (instance.originalInstanceDate && isSameDay(new Date(instance.originalInstanceDate), currentDateForChart)) {
              totalActivitiesThisDay++;
              if (isActivityInstanceCompleted(instance, rawMasterActivities)) {
                completedActivitiesThisDay++;
              }
            }
          });
        });
        
        return {
          name: format(currentDateForChart, 'E', { locale: dateLocale }),
          totalActivities: totalActivitiesThisDay,
          completedActivities: completedActivitiesThisDay,
        };
      });
    } else { // monthly
      const currentMonth = new Date();
      const firstDayOfMonth = startOfMonth(currentMonth);
      const lastDayOfMonth = endOfMonth(currentMonth);
      const weekStartsOn = dateLocale.options?.weekStartsOn ?? 0;
      const weeksInMonth = eachWeekOfInterval(
        { start: firstDayOfMonth, end: lastDayOfMonth },
        { locale: dateLocale, weekStartsOn: weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6 }
      );

      return weeksInMonth.map((weekStartDateInLoop, index) => {
        const actualWeekStart = startOfWeek(weekStartDateInLoop, { locale: dateLocale, weekStartsOn: weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
        const actualWeekEnd = endOfWeek(weekStartDateInLoop, { locale: dateLocale, weekStartsOn: weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
        
        let totalActivitiesThisWeek = 0;
        let completedActivitiesThisWeek = 0;
        rawMasterActivities.forEach(masterActivity => {
          const instances = generateDashboardActivityInstances(masterActivity, actualWeekStart, actualWeekEnd, dateLocale);
          instances.forEach(instance => {
            totalActivitiesThisWeek++;
            if (isActivityInstanceCompleted(instance, rawMasterActivities)) {
              completedActivitiesThisWeek++;
            }
          });
        });

        return {
          name: `${t('dashboardWeekLabel')}${index + 1}`,
          totalActivities: totalActivitiesThisWeek,
          completedActivities: completedActivitiesThisWeek,
        };
      });
    }
  }, [getRawActivities, chartViewMode, dateLocale, t, hasMounted]);

  const habitChartData = useMemo((): BarChartDataItem[] => {
    if (!hasMounted) return [];
    const today = new Date();

    if (chartViewMode === 'weekly') {
      return Array.from({ length: 7 }).map((_, i) => {
        const currentDateForChart = subDays(today, 6 - i);
        const dayStart = startOfDay(currentDateForChart);
        const dayEnd = endOfDay(currentDateForChart);
        
        const habitSlotsThisDay = generateHabitSlotOccurrencesForRange(habits, habitCompletions, dayStart, dayEnd);
        const totalHabitSlotsThisDay = habitSlotsThisDay.length;
        const completedHabitSlotsThisDay = habitSlotsThisDay.filter(hs => hs.isCompleted).length;
        
        return {
          name: format(currentDateForChart, 'E', { locale: dateLocale }),
          totalHabitSlots: totalHabitSlotsThisDay,
          completedHabitSlots: completedHabitSlotsThisDay,
        };
      });
    } else { // monthly
      const currentMonth = new Date();
      const firstDayOfMonth = startOfMonth(currentMonth);
      const lastDayOfMonth = endOfMonth(currentMonth);
      const weekStartsOn = dateLocale.options?.weekStartsOn ?? 0;
      const weeksInMonth = eachWeekOfInterval(
        { start: firstDayOfMonth, end: lastDayOfMonth },
        { locale: dateLocale, weekStartsOn: weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6 }
      );

      return weeksInMonth.map((weekStartDateInLoop, index) => {
        const actualWeekStart = startOfWeek(weekStartDateInLoop, { locale: dateLocale, weekStartsOn: weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
        const actualWeekEnd = endOfWeek(weekStartDateInLoop, { locale: dateLocale, weekStartsOn: weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
        
        const habitSlotsThisWeek = generateHabitSlotOccurrencesForRange(habits, habitCompletions, actualWeekStart, actualWeekEnd);
        const totalHabitSlotsThisWeek = habitSlotsThisWeek.length;
        const completedHabitSlotsThisWeek = habitSlotsThisWeek.filter(hs => hs.isCompleted).length;

        return {
          name: `${t('dashboardWeekLabel')}${index + 1}`,
          totalHabitSlots: totalHabitSlotsThisWeek,
          completedHabitSlots: completedHabitSlotsThisWeek,
        };
      });
    }
  }, [habits, habitCompletions, chartViewMode, dateLocale, t, hasMounted]);


  const activityChartBars: ChartBarProps[] = [
    { dataKey: 'totalActivities', fillVariable: '--chart-1', nameKey: 'dashboardChartTotalActivities', radius: [4,4,0,0]},
    { dataKey: 'completedActivities', fillVariable: '--chart-2', nameKey: 'dashboardChartCompletedActivities', radius: [4,4,0,0]},
  ];
  
  const habitChartBars: ChartBarProps[] = [
    { dataKey: 'totalHabitSlots', fillVariable: '--chart-3', nameKey: 'dashboardChartTotalHabits', radius: [4,4,0,0]},
    { dataKey: 'completedHabitSlots', fillVariable: '--chart-4', nameKey: 'dashboardChartCompletedHabits', radius: [4,4,0,0]},
  ];

  const listedItems = useMemo((): DashboardDisplayItem[] => {
    if (!hasMounted) return [];
    const rawMasterActivities = getRawActivities();
    const now = new Date();
    let rangeStartDate: Date;
    let rangeEndDate: Date = endOfDay(now); 

    if (listViewTimeRange === 'last7days') {
      rangeStartDate = startOfDay(subDays(now, 6));
    } else { // currentMonth
      rangeStartDate = startOfDay(startOfMonth(now));
      rangeEndDate = endOfDay(endOfMonth(now));
    }

    let allDisplayItems: DashboardDisplayItem[] = [];

    // Process Activities
    rawMasterActivities.forEach(masterActivity => {
      generateDashboardActivityInstances(masterActivity, rangeStartDate, rangeEndDate, dateLocale)
        .forEach(instance => {
          allDisplayItems.push({
            type: 'activity',
            id: `activity-${instance.id}`,
            originalDate: new Date(instance.originalInstanceDate || instance.createdAt),
            title: instance.title,
            displayTime: instance.time,
            item: instance,
            category: getCategoryById(instance.categoryId),
            isCompleted: isActivityInstanceCompleted(instance, rawMasterActivities),
          });
        });
    });

    // Process Habits
    generateHabitSlotOccurrencesForRange(habits, habitCompletions, rangeStartDate, rangeEndDate)
      .forEach(slotOccurrence => {
        allDisplayItems.push({
          type: 'habit',
          id: `habit-${slotOccurrence.habit.id}-slot-${slotOccurrence.slot.id}-${slotOccurrence.date.getTime()}`,
          originalDate: slotOccurrence.date,
          title: `${slotOccurrence.habit.name} - ${slotOccurrence.slot.name}`,
          displayTime: slotOccurrence.slot.default_time,
          item: slotOccurrence,
          isCompleted: slotOccurrence.isCompleted,
        });
      });

    return allDisplayItems.sort((a, b) => {
      const dateDiff = a.originalDate.getTime() - b.originalDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      
      const timeA = a.displayTime ? parseInt(a.displayTime.replace(':', ''), 10) : (a.type === 'activity' ? -1 : Infinity) ;
      const timeB = b.displayTime ? parseInt(b.displayTime.replace(':', ''), 10) : (b.type === 'activity' ? -1 : Infinity) ;
      if (timeA !== timeB) return timeA - timeB;

      return a.title.localeCompare(b.title);
    });
  }, [getRawActivities, habits, habitCompletions, listViewTimeRange, hasMounted, getCategoryById, dateLocale]);


  const productivityData = useMemo(() => {
    if (!hasMounted) return {
        activityCategoryChartData: [],
        habitPerformanceChartData: [],
        overallCompletionRate: 0,
        totalScheduledItems: 0,
        totalCompletedItems: 0,
        dayOfWeekCompletions: [] as BarChartDataItem[],
        peakProductivityDays: [] as string[],
        daysWithMostFailures: [] as string[]
    };
    
    const rawMasterActivities = getRawActivities();
    const now = new Date();
    let rangeStartDateFilter: Date;
    let rangeEndDateFilter: Date = endOfDay(now);

    if (productivityViewTimeRange === 'last7days') {
      rangeStartDateFilter = startOfDay(subDays(now, 6));
    } else { // currentMonth
      rangeStartDateFilter = startOfDay(startOfMonth(now));
      rangeEndDateFilter = endOfDay(endOfMonth(now));
    }

    let relevantActivityInstances: Activity[] = [];
    rawMasterActivities.forEach(masterActivity => {
      relevantActivityInstances.push(...generateDashboardActivityInstances(masterActivity, rangeStartDateFilter, rangeEndDateFilter, dateLocale));
    });
    const relevantHabitSlots = generateHabitSlotOccurrencesForRange(habits, habitCompletions, rangeStartDateFilter, rangeEndDateFilter);
    
    const completedActivityInstances = relevantActivityInstances.filter(instance => isActivityInstanceCompleted(instance, rawMasterActivities));
    const completedHabitSlots = relevantHabitSlots.filter(hs => hs.isCompleted);

    const totalScheduledItems = relevantActivityInstances.length + relevantHabitSlots.length;
    const totalCompletedItems = completedActivityInstances.length + completedHabitSlots.length;

    const overallCompletionRate = totalScheduledItems > 0
      ? (totalCompletedItems / totalScheduledItems) * 100
      : 0;

    const activityCategoryCounts: Record<string, number> = {};
    completedActivityInstances.forEach(instance => {
      const category = getCategoryById(instance.categoryId);
      const categoryName = category ? category.name : "Uncategorized";
      activityCategoryCounts[categoryName] = (activityCategoryCounts[categoryName] || 0) + 1;
    });
    const activityCategoryChartData: BarChartDataItem[] = Object.entries(activityCategoryCounts).map(([name, count]) => ({ name, count }));
    
    const habitPerformanceCounts: Record<string, number> = {};
    completedHabitSlots.forEach(hs => {
        habitPerformanceCounts[hs.habit.name] = (habitPerformanceCounts[hs.habit.name] || 0) + 1;
    });
    const habitPerformanceChartData: BarChartDataItem[] = Object.entries(habitPerformanceCounts).map(([name, count]) => ({name, count}));


    const dayOfWeekData: Record<string, { total: number, completed: number, incomplete: number }> = {};
    const dayIndexToName = (dayIndex: number) => [t('daySun'), t('dayMon'), t('dayTue'), t('dayWed'), t('dayThu'), t('dayFri'), t('daySat')][dayIndex];
    
    for (let i = 0; i < 7; i++) {
        const dayName = dayIndexToName(i);
        dayOfWeekData[dayName] = { total: 0, completed: 0, incomplete: 0 };
    }

    relevantActivityInstances.forEach(instance => {
        if (instance.originalInstanceDate) {
            const instanceDate = new Date(instance.originalInstanceDate);
            if (isWithinInterval(instanceDate, { start: rangeStartDateFilter, end: rangeEndDateFilter })) {
                const dayName = dayIndexToName(getDayOfWeekFn(instanceDate));
                 if (dayName && dayOfWeekData[dayName]) {
                    dayOfWeekData[dayName].total++;
                    if(isActivityInstanceCompleted(instance, rawMasterActivities)){
                        dayOfWeekData[dayName].completed++;
                    } else {
                        dayOfWeekData[dayName].incomplete++;
                    }
                }
            }
        }
    });
    relevantHabitSlots.forEach(hs => {
        const dayName = dayIndexToName(getDayOfWeekFn(hs.date));
        if (dayName && dayOfWeekData[dayName]) {
            dayOfWeekData[dayName].total++; 
            if (hs.isCompleted) {
                dayOfWeekData[dayName].completed++;
            } else {
                dayOfWeekData[dayName].incomplete++;
            }
        }
    });

    const dayOfWeekCompletionsChartData: BarChartDataItem[] = Object.entries(dayOfWeekData).map(([name, data]) => ({ name, count: data.completed }));
    
    let peakDays: string[] = [];
    let maxCompletions = 0;
    dayOfWeekCompletionsChartData.forEach(item => {
        const count = Number(item.count);
        if (count > maxCompletions) {
            maxCompletions = count;
            peakDays = [item.name as string];
        } else if (count === maxCompletions && maxCompletions > 0) {
            peakDays.push(item.name as string);
        }
    });

    let daysWithMostFailures: string[] = [];
    let maxIncomplete = 0;
    Object.entries(dayOfWeekData).forEach(([dayName, data]) => {
        if (data.incomplete > 0) {
            if (data.incomplete > maxIncomplete) {
                maxIncomplete = data.incomplete;
                daysWithMostFailures = [dayName];
            } else if (data.incomplete === maxIncomplete) {
                daysWithMostFailures.push(dayName);
            }
        }
    });

    return {
      activityCategoryChartData,
      habitPerformanceChartData,
      overallCompletionRate,
      totalScheduledItems,
      totalCompletedItems,
      dayOfWeekCompletions: dayOfWeekCompletionsChartData, 
      peakProductivityDays: peakDays,
      daysWithMostFailures,
    };
  }, [getRawActivities, habits, habitCompletions, productivityViewTimeRange, hasMounted, getCategoryById, t, dateLocale]);

  const streakData = useMemo(() => {
    if (!hasMounted) return { currentStreak: 0, longestStreak: 0 };
    
    const rawMasterActivities = getRawActivities();
    const allDaysWithScheduledItems = new Map<string, { activities: Activity[], habitSlots: ProcessedHabitSlotOccurrence[], allActivitiesCompleted: boolean, allHabitsCompleted: boolean }>();

    const todayForStreak = startOfDay(new Date());
    const oneYearAgo = startOfDay(subDays(todayForStreak, 365)); 

    eachDayOfInterval({ start: oneYearAgo, end: todayForStreak }).forEach(day => {
        const dateKey = formatISO(day, {representation: 'date'});
        
        const activityInstancesToday = rawMasterActivities.flatMap(master => 
            generateDashboardActivityInstances(master, day, endOfDay(day), dateLocale)
        );
        const habitSlotsToday = generateHabitSlotOccurrencesForRange(habits, habitCompletions, day, endOfDay(day));

        if (activityInstancesToday.length > 0 || habitSlotsToday.length > 0) {
            const allActsCompleted = activityInstancesToday.every(act => isActivityInstanceCompleted(act, rawMasterActivities));
            const allHabsCompleted = habitSlotsToday.every(hs => hs.isCompleted);
            allDaysWithScheduledItems.set(dateKey, {
                activities: activityInstancesToday,
                habitSlots: habitSlotsToday,
                allActivitiesCompleted: allActsCompleted,
                allHabitsCompleted: allHabsCompleted
            });
        }
    });

    if (allDaysWithScheduledItems.size === 0) return { currentStreak: 0, longestStreak: 0 };

    const sortedCompletionDayKeys = Array.from(allDaysWithScheduledItems.keys())
      .filter(dateKey => {
          const dayData = allDaysWithScheduledItems.get(dateKey)!;
          const hasScheduledItems = dayData.activities.length > 0 || dayData.habitSlots.length > 0;
          const allItemsCompleted = dayData.allActivitiesCompleted && dayData.allHabitsCompleted;
          return hasScheduledItems && allItemsCompleted;
      })
      .map(dateStr => parseISO(dateStr))
      .sort((a,b) => a.getTime() - b.getTime());
    
    if (sortedCompletionDayKeys.length === 0) return { currentStreak: 0, longestStreak: 0 };

    let currentStreakVal = 0;
    let longestStreakVal = 0;
    let tempStreak = 0;

    for (let i = 0; i < sortedCompletionDayKeys.length; i++) {
      if (i === 0 || differenceInCalendarDays(sortedCompletionDayKeys[i], sortedCompletionDayKeys[i-1]) === 1) {
        tempStreak++;
      } else if (differenceInCalendarDays(sortedCompletionDayKeys[i], sortedCompletionDayKeys[i-1]) > 1) { 
        longestStreakVal = Math.max(longestStreakVal, tempStreak);
        tempStreak = 1; 
      }
    }
    longestStreakVal = Math.max(longestStreakVal, tempStreak);
    
    const isDayStreakWorthyCompleted = (date: Date): boolean => {
        const key = formatISO(date, {representation: 'date'});
        const dayData = allDaysWithScheduledItems.get(key);
        if (!dayData) return false; 
        return (dayData.activities.length > 0 || dayData.habitSlots.length > 0) &&
               dayData.allActivitiesCompleted && dayData.allHabitsCompleted;
    };

    if (!isDayStreakWorthyCompleted(todayForStreak) && !isDayStreakWorthyCompleted(subDays(todayForStreak,1))) {
        currentStreakVal = 0; 
    } else {
        let currentTempStreak = 0;
        let checkDate = isDayStreakWorthyCompleted(todayForStreak) ? todayForStreak : subDays(todayForStreak,1);
        
        while(isDayStreakWorthyCompleted(checkDate)){
            currentTempStreak++;
            checkDate = subDays(checkDate,1);
        }
        currentStreakVal = currentTempStreak;
    }

    return { currentStreak: currentStreakVal, longestStreak: longestStreakVal };
  }, [getRawActivities, habits, habitCompletions, hasMounted, dateLocale]);


  const activityCategoryChartBars: ChartBarProps[] = [ { dataKey: 'count', fillVariable: '--chart-1', nameKey: 'dashboardActivityCountLabel', radius: [4,4,0,0] } ];
  const habitPerformanceChartBars: ChartBarProps[] = [ { dataKey: 'count', fillVariable: '--chart-5', nameKey: 'dashboardHabitCompletionsLabel', radius: [4,4,0,0] } ];
  const dayOfWeekChartBars: ChartBarProps[] = [ { dataKey: 'count', fillVariable: '--chart-2', nameKey: 'dashboardCompletionsChartLabel', radius: [4,4,0,0] } ];


  const handleEditActivity = (activityInstanceOrMaster: Activity) => {
    const rawActs = getRawActivities();
    const masterAct = activityInstanceOrMaster.masterActivityId
      ? rawActs.find(a => a.id === activityInstanceOrMaster.masterActivityId)
      : activityInstanceOrMaster;

    if (masterAct) {
      let url = `/activity-editor?id=${masterAct.id}`;
      if (activityInstanceOrMaster.isRecurringInstance && activityInstanceOrMaster.originalInstanceDate) {
        url += `&instanceDate=${activityInstanceOrMaster.originalInstanceDate}`;
      }
      router.push(url);
    }
  };
  
  const handleDeleteActivity = async (activityToDelete: Activity) => {
    if (activityToDelete) {
      const masterActivityId = activityToDelete.masterActivityId || activityToDelete.id;
      await deleteActivity(masterActivityId);
    }
  };


  if (!hasMounted) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center">
           <Skeleton className="h-10 w-36" />
           <Skeleton className="h-10 w-full md:w-auto md:max-w-xs mt-4 md:mt-0" />
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2 mt-1" />
          </CardHeader>
          <CardContent className="pt-6">
            <Skeleton className="h-[350px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <Link href="/" passHref>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToCalendar')}
          </Button>
        </Link>
        <Tabs value={dashboardMainView} onValueChange={(value) => setDashboardMainView(value as DashboardMainView)} className="w-full md:w-auto">
          <TabsList className="grid w-full grid-cols-3 md:w-auto mt-4 md:mt-0">
            <TabsTrigger value="chart">
              <BarChart3 className="mr-2 h-4 w-4" />
              {t('dashboardChartView')}
            </TabsTrigger>
            <TabsTrigger value="list">
              <ListChecks className="mr-2 h-4 w-4" />
              {t('dashboardListView')}
            </TabsTrigger>
            <TabsTrigger value="productivity">
              <TrendingUp className="mr-2 h-4 w-4" />
              {t('dashboardProductivityView')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <CardTitle>{t('dashboardTitle')}</CardTitle>
          </div>
          <CardDescription>
            {t('dashboardMainDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {dashboardMainView === 'chart' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-1">{t('dashboardActivityChartTitle')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {chartViewMode === 'weekly' ? t('dashboardViewWeekly') : t('dashboardViewMonthly')}
                </p>
                <Tabs value={chartViewMode} onValueChange={(value) => setChartViewMode(value as ChartViewMode)} className="mb-6">
                  <TabsList className="grid w-full grid-cols-2 md:w-1/2">
                    <TabsTrigger value="weekly">{t('dashboardViewWeekly')}</TabsTrigger>
                    <TabsTrigger value="monthly">{t('dashboardViewMonthly')}</TabsTrigger>
                  </TabsList>
                </Tabs>
                {activityChartData.length > 0 && activityChartData.some(d => Number(d.totalActivities) > 0 || Number(d.completedActivities) > 0) ? (
                   <BarChart data={activityChartData} bars={activityChartBars} xAxisDataKey="name" />
                ) : (
                  <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                    {t('dashboardNoData')}
                  </div>
                )}
              </div>

              <div>
                 <h3 className="text-lg font-semibold mb-1">{t('dashboardHabitChartTitle')}</h3>
                 <p className="text-sm text-muted-foreground mb-4">
                    {chartViewMode === 'weekly' ? t('dashboardViewWeekly') : t('dashboardViewMonthly')}
                </p>
                {/* Tabs for chartViewMode can be reused if it controls both charts, or make separate state if needed */}
                 {habitChartData.length > 0 && habitChartData.some(d => Number(d.totalHabitSlots) > 0 || Number(d.completedHabitSlots) > 0) ? (
                   <BarChart data={habitChartData} bars={habitChartBars} xAxisDataKey="name" />
                ) : (
                  <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                    {t('dashboardNoData')}
                  </div>
                )}
              </div>
            </div>
          )}

          {dashboardMainView === 'list' && (
            <div>
              <Tabs value={listViewTimeRange} onValueChange={(value) => setListViewTimeRange(value as ListViewTimeRange)} className="mb-4">
                <TabsList className="grid w-full grid-cols-2 md:w-1/2">
                  <TabsTrigger value="last7days">{t('dashboardListLast7Days')}</TabsTrigger>
                  <TabsTrigger value="currentMonth">{t('dashboardListCurrentMonth')}</TabsTrigger>
                </TabsList>
              </Tabs>
              {listedItems.length > 0 ? (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {listedItems.map(dashboardItem => {
                      if (dashboardItem.type === 'activity') {
                        const activityItem = dashboardItem as ActivityDashboardItem;
                        return (
                          <ActivityListItem
                            key={activityItem.id}
                            activity={activityItem.item}
                            category={activityItem.category}
                            onEdit={() => handleEditActivity(activityItem.item)}
                            onDelete={async () => await handleDeleteActivity(activityItem.item)}
                            showDate={true}
                            instanceDate={activityItem.originalDate}
                          />
                        );
                      } else { 
                        const habitItem = dashboardItem as HabitDashboardItem;
                        return (
                           <Card key={habitItem.id} className={cn("shadow-xs p-0", habitItem.isCompleted && "opacity-70")}>
                             <HabitListItem
                                habit={habitItem.item.habit}
                                slot={habitItem.item.slot}
                                date={habitItem.originalDate}
                                completionStatus={{completed: habitItem.isCompleted, completionId: undefined }}
                                onToggleCompletion={(completed) => {
                                  const dateKey = formatISO(habitItem.originalDate, { representation: 'date' });
                                  const existingCompletion = habitCompletions[habitItem.item.habit.id]?.[dateKey]?.[habitItem.item.slot.id];
                                  toggleHabitSlotCompletion(habitItem.item.habit.id, habitItem.item.slot.id, dateKey, existingCompletion);
                                }}
                                showDate={true}
                              />
                           </Card>
                        );
                      }
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                  {t('dashboardNoActivitiesForList')}
                </div>
              )}
            </div>
          )}

          {dashboardMainView === 'productivity' && (
            <div className="space-y-6">
              <Tabs value={productivityViewTimeRange} onValueChange={(value) => setProductivityViewTimeRange(value as ProductivityViewTimeRange)} className="mb-4">
                <TabsList className="grid w-full grid-cols-2 md:w-1/2">
                  <TabsTrigger value="last7days">{t('dashboardListLast7Days')}</TabsTrigger>
                  <TabsTrigger value="currentMonth">{t('dashboardListCurrentMonth')}</TabsTrigger>
                </TabsList>
              </Tabs>
              <CardDescription className="text-center text-sm">
                  {t('dashboardProductivityTimeRange')} {productivityViewTimeRange === 'last7days' ? t('dashboardListLast7Days') : t('dashboardListCurrentMonth')}
              </CardDescription>

              <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-orange-500" /> {t('dashboardStreaksTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{t('dashboardCurrentStreak')}:</span>
                        <span className="text-lg font-semibold text-primary">{t('dashboardStreakDays', {count: streakData.currentStreak})}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{t('dashboardLongestStreak')}:</span>
                        <span className="text-lg font-semibold text-primary">{t('dashboardStreakDays', {count: streakData.longestStreak})}</span>
                    </div>
                     <p className="text-xs text-muted-foreground pt-2">{t('dashboardStreakInsightCombined')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5" /> {t('dashboardCompletionStats')}</CardTitle>
                  <CardDescription>
                     {productivityViewTimeRange === 'last7days' ? t('dashboardListLast7Days') : t('dashboardListCurrentMonth')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{t('dashboardOverallCompletionRate')}</span>
                    <span className="text-lg font-semibold text-primary">{productivityData.overallCompletionRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('dashboardTotalScheduledItemsLabel')}</span>
                    <span className="text-sm font-medium">{productivityData.totalScheduledItems}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('dashboardTotalCompletedItemsLabel')}</span>
                    <span className="text-sm font-medium">{productivityData.totalCompletedItems}</span>
                  </div>
                   {productivityData.totalScheduledItems === 0 && (
                     <p className="text-sm text-muted-foreground text-center pt-4">{t('dashboardNoDataForAnalysis')}</p>
                   )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><LineChart className="h-5 w-5" /> {t('dashboardProductivityPatterns')}</CardTitle>
                  <CardDescription>{t('dashboardCompletionsByDay')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {productivityData.dayOfWeekCompletions.some(d => Number(d.count) > 0) ? (
                    <>
                      <BarChart data={productivityData.dayOfWeekCompletions} bars={dayOfWeekChartBars} xAxisDataKey="name" height={250} />
                      <p className="text-sm text-center mt-4 font-medium">
                        {productivityData.peakProductivityDays.length === 0 && t('dashboardNoPeakDay')}
                        {productivityData.peakProductivityDays.length === 1 && t('dashboardPeakDaySingle', { day: productivityData.peakProductivityDays[0] })}
                        {productivityData.peakProductivityDays.length > 1 && t('dashboardPeakDayMultiple', { days: productivityData.peakProductivityDays.join(', ') })}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">{t('dashboardNoDataForAnalysis')}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-destructive" /> {t('dashboardFailureAnalysisTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {productivityData.totalScheduledItems > 0 ? (
                    productivityData.daysWithMostFailures.length > 0 ? (
                      <p className="text-sm text-center">
                        {t('dashboardFailureAnalysisMostIncomplete', { days: productivityData.daysWithMostFailures.join(', ') })}
                      </p>
                    ) : (
                      <p className="text-sm text-center text-green-600 dark:text-green-500">
                        {t('dashboardFailureAnalysisAllComplete')}
                      </p>
                    )
                  ) : (
                     <p className="text-sm text-muted-foreground text-center">{t('dashboardFailureAnalysisNoData')}</p>
                  )}
                  {productivityData.daysWithMostFailures.length > 0 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      {t('dashboardFailureAnalysisInsight')}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ActivityIcon className="h-5 w-5" /> {t('dashboardActivityCategoryBreakdownTitle')}</CardTitle>
                  <CardDescription>{t('dashboardActivityCountLabel')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {productivityData.activityCategoryChartData.length > 0 ? (
                    <BarChart data={productivityData.activityCategoryChartData} bars={activityCategoryChartBars} xAxisDataKey="name" height={300} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">{t('dashboardNoDataForAnalysis')}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" /> {t('dashboardHabitPerformanceTitle')}</CardTitle>
                  <CardDescription>{t('dashboardHabitCompletionsLabel')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {productivityData.habitPerformanceChartData.length > 0 ? (
                    <BarChart data={productivityData.habitPerformanceChartData} bars={habitPerformanceChartBars} xAxisDataKey="name" height={300} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">{t('dashboardNoDataForAnalysis')}</p>
                  )}
                </CardContent>
              </Card>

            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


    

    