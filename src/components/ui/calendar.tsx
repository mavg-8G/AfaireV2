
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type DayContentProps } from "react-day-picker"
import { format, formatISO, isSameMonth } from 'date-fns';

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  dayEventCounts?: Map<string, number>;
};

interface CustomDayContentProps extends DayContentProps {
  dayEventCounts?: Map<string, number>;
}

function CustomDayContent(props: CustomDayContentProps) {
  const { date, displayMonth, activeModifiers, dayEventCounts } = props;
  const dayKey = formatISO(date, { representation: 'date' });
  const eventCount = dayEventCounts?.get(dayKey) ?? 0;
  const maxDots = 3;

  const dayNumberEl = <>{format(date, 'd')}</>;

  if (!isSameMonth(date, displayMonth)) {
    return <>{dayNumberEl}</>;
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-start pt-1">
      {dayNumberEl}
      {eventCount > 0 && (
        <div className="absolute bottom-1 flex items-center justify-center space-x-0.5 w-full">
          {Array.from({ length: Math.min(eventCount, maxDots) }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "day-event-dot",
                activeModifiers.selected && "day-event-dot-selected",
                activeModifiers.today && !activeModifiers.selected && "day-event-dot-today"
              )}
            ></span>
          ))}
          {eventCount > maxDots && (
            <span className={cn(
              "day-event-plus-dot",
              activeModifiers.selected && "day-event-plus-dot-selected",
              activeModifiers.today && !activeModifiers.selected && "day-event-plus-dot-today"
              )}
            >+</span>
          )}
        </div>
      )}
    </div>
  );
}


function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  dayEventCounts,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-11 sm:w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: cn(
          "h-11 sm:h-9 w-11 sm:w-9 text-center text-sm p-0 relative",
          "[&:has([aria-selected].day-range-end)]:rounded-r-md",
          "[&:has([aria-selected].day-outside)]:bg-accent/50",
          "[&:has([aria-selected])]:bg-primary", 
          "first:[&:has([aria-selected])]:rounded-l-md",
          "last:[&:has([aria-selected])]:rounded-r-md",
          "focus-within:relative focus-within:z-20"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-11 sm:h-9 w-11 sm:w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-100", 
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className: iconClassName, ...rest }) => (
          <ChevronLeft className={cn("h-4 w-4", iconClassName)} {...rest} />
        ),
        IconRight: ({ className: iconClassName, ...rest }) => (
          <ChevronRight className={cn("h-4 w-4", iconClassName)} {...rest} />
        ),
        DayContent: (dayProps) => <CustomDayContent {...dayProps} dayEventCounts={dayEventCounts} />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }

