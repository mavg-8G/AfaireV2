
"use client";
import type { ReactNode } from "react";
import React, {
  createContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type {
  Activity,
  Todo,
  Category,
  AppMode,
  RecurrenceRule,
  UINotification,
  HistoryLogEntry,
  HistoryLogActionKey,
  Translations,
  Assignee,
  BackendCategoryCreatePayload,
  BackendCategory,
  BackendUser,
  BackendUserCreatePayload,
  BackendUserUpdatePayload,
  BackendActivityCreatePayload,
  BackendActivityUpdatePayload,
  BackendTodoCreate,
  BackendHistory,
  RecurrenceType,
  BackendCategoryMode,
  BackendRepeatMode,
  BackendTodo,
  Token,
  DecodedToken,
  BackendHistoryCreatePayload,
  BackendCategoryUpdatePayload,
  AppContextType as AppContextTypeImport,
  BackendActivityResponse,
  BackendActivityTodosResponse,
  BackendActivityOccurrencesListResponse,
  BackendActivityOccurrenceResponse,
  BackendActivityOccurrence,
  BackendActivityOccurrenceCreate,
  BackendActivityOccurrenceUpdate,
  Habit,
  HabitSlot,
  HabitCompletions,
  HabitCreateData,
  HabitSlotCreateData,
  HabitUpdateData,
  BackendHabit,
  BackendHabitCompletion,
  BackendHabitCompletionCreatePayload,
  BackendHabitCompletionUpdatePayload,
  HabitSlotCompletionStatus,
  BackendHabitSlot,
} from "@/lib/types";
import {
  DEFAULT_API_BASE_URL,
  APP_NAME,
  HARDCODED_APP_PIN,
} from "@/lib/constants";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";
import {
  isSameDay,
  formatISO,
  parseISO,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  startOfDay as dateFnsStartOfDay,
  endOfDay as dateFnsEndOfDay,
  isBefore,
  isAfter,
  getDay,
  getDate,
  isWithinInterval,
  setDate as setDayOfMonthFn,
  addYears,
  isEqual,
  formatDistanceToNowStrict,
  format as formatDateFns,
} from "date-fns";
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import * as Icons from "lucide-react";
import { useTranslations } from "@/contexts/language-context";
import { enUS, es, fr } from "date-fns/locale";
import { useTheme } from "next-themes";

const envApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_BASE_URL =
  envApiBaseUrl && envApiBaseUrl.trim() !== ""
    ? envApiBaseUrl
    : DEFAULT_API_BASE_URL;

export type AppContextType = AppContextTypeImport;

export const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_APP_MODE = "todoFlowAppMode_v2";
const LOCAL_STORAGE_KEY_UI_NOTIFICATIONS = "todoFlowUINotifications_v2";
const LOCAL_STORAGE_KEY_APP_PIN = "todoFlowAppPin_v2";
const LOCAL_STORAGE_KEY_TIMEZONE = "todoFlowTimezone_v1";


export const getIconComponent = (
  iconName: string | undefined | null
): Icons.LucideIcon => {
  if (!iconName || typeof iconName !== "string") return Icons.Package;
  const capitalizedIconName =
    iconName.charAt(0).toUpperCase() + iconName.slice(1);
  const pascalCaseIconName = capitalizedIconName.replace(/[^A-Za-z0-9]/g, "");
  const IconComponent = (Icons as any)[pascalCaseIconName];
  if (!IconComponent) {
    console.warn(
      `[AppProvider] Icon "${pascalCaseIconName}" (from "${iconName}") not found in lucide-react. Falling back to Package icon.`
    );
    return Icons.Package;
  }
  return IconComponent;
};

const getStartOfDayUtil = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

interface FutureInstance {
  instanceDate: Date;
  masterActivityId: number;
}

function generateFutureInstancesForNotifications(
  masterActivity: Activity,
  rangeStartDate: Date,
  rangeEndDate: Date
): FutureInstance[] {
  if (!masterActivity.recurrence || masterActivity.recurrence.type === "none") {
    const activityDate = new Date(masterActivity.createdAt);
    if (
      isWithinInterval(activityDate, {
        start: rangeStartDate,
        end: rangeEndDate,
      }) &&
      !masterActivity.completed
    ) {
      return [
        { instanceDate: activityDate, masterActivityId: masterActivity.id },
      ];
    }
    return [];
  }

  const instances: FutureInstance[] = [];
  const recurrence = masterActivity.recurrence;
  let currentDate = new Date(masterActivity.createdAt);

  if (isBefore(currentDate, rangeStartDate)) {
    if (recurrence.type === "daily") {
      currentDate = rangeStartDate;
    } else if (
      recurrence.type === "weekly" &&
      recurrence.daysOfWeek &&
      recurrence.daysOfWeek.length > 0
    ) {
      let tempDate = dateFnsStartOfDay(rangeStartDate);
      while (
        isBefore(tempDate, new Date(masterActivity.createdAt)) ||
        !recurrence.daysOfWeek.includes(getDay(tempDate)) ||
        isBefore(tempDate, rangeStartDate)
      ) {
        tempDate = addDays(tempDate, 1);
        if (isAfter(tempDate, rangeEndDate)) break;
      }
      currentDate = tempDate;
    } else if (recurrence.type === "monthly" && recurrence.dayOfMonth) {
      let tempMasterStartMonthDay = setDayOfMonthFn(
        new Date(masterActivity.createdAt),
        recurrence.dayOfMonth
      );
      if (
        isBefore(tempMasterStartMonthDay, new Date(masterActivity.createdAt))
      ) {
        tempMasterStartMonthDay = addMonths(tempMasterStartMonthDay, 1);
      }

      currentDate = setDayOfMonthFn(rangeStartDate, recurrence.dayOfMonth);
      if (isBefore(currentDate, rangeStartDate))
        currentDate = addMonths(currentDate, 1);
      if (isBefore(currentDate, tempMasterStartMonthDay)) {
        currentDate = tempMasterStartMonthDay;
      }
    }
  }

  const seriesEndDate = recurrence.endDate
    ? new Date(recurrence.endDate)
    : null;
  let iterations = 0;
  const maxIterations = 366 * 1; // Check for one year

  while (iterations < maxIterations && !isAfter(currentDate, rangeEndDate)) {
    iterations++;
    if (seriesEndDate && isAfter(currentDate, seriesEndDate)) break;
    if (isBefore(currentDate, new Date(masterActivity.createdAt))) {
      if (recurrence.type === "daily") currentDate = addDays(currentDate, 1);
      else if (recurrence.type === "weekly")
        currentDate = addDays(currentDate, 1);
      else if (recurrence.type === "monthly") {
        let nextMonth = addMonths(currentDate, 1);
        currentDate = setDayOfMonthFn(
          nextMonth,
          recurrence.dayOfMonth || getDate(currentDate)
        );
      } else break;
      continue;
    }

    let isValidOccurrence = false;
    switch (recurrence.type) {
      case "daily":
        isValidOccurrence = true;
        break;
      case "weekly":
        if (recurrence.daysOfWeek?.includes(getDay(currentDate))) {
          isValidOccurrence = true;
        }
        break;
      case "monthly":
        if (
          recurrence.dayOfMonth &&
          getDate(currentDate) === recurrence.dayOfMonth
        ) {
          isValidOccurrence = true;
        }
        break;
    }

    if (isValidOccurrence) {
      const occurrenceDateKey = formatISO(currentDate, {
        representation: "date",
      });
      const isInstanceCompleted =
        !!masterActivity.completedOccurrences?.[occurrenceDateKey];
      if (!isInstanceCompleted) {
        instances.push({
          instanceDate: new Date(currentDate.getTime()),
          masterActivityId: masterActivity.id,
        });
      }
    }

    if (recurrence.type === "daily") {
      currentDate = addDays(currentDate, 1);
    } else if (recurrence.type === "weekly") {
      currentDate = addDays(currentDate, 1);
    } else if (recurrence.type === "monthly") {
      if (recurrence.dayOfMonth) {
        let nextIterationDate;
        const currentMonthTargetDay = setDayOfMonthFn(
          currentDate,
          recurrence.dayOfMonth
        );
        if (
          isAfter(currentMonthTargetDay, currentDate) &&
          getDate(currentMonthTargetDay) === recurrence.dayOfMonth
        ) {
          nextIterationDate = currentMonthTargetDay;
        } else {
          let nextMonthDate = addMonths(currentDate, 1);
          nextIterationDate = setDayOfMonthFn(
            nextMonthDate,
            recurrence.dayOfMonth
          );
        }
        currentDate = nextIterationDate;
      } else {
        currentDate = addDays(currentDate, 1);
      }
    } else {
      break;
    }
  }
  return instances;
}

function parseHslString(
  hslString: string
): { h: number; s: number; l: number } | null {
  if (!hslString) return null;
  const match = hslString.match(
    /^(?:hsl\(\s*)?(-?\d*\.?\d+)(?:deg|rad|turn|)?\s*[, ]?\s*(-?\d*\.?\d+)%?\s*[, ]?\s*(-?\d*\.?\d+)%?(?:\s*[,/]\s*(-?\d*\.?\d+)\%?)?(?:\s*\))?$/i
  );
  if (!match) return null;
  const h = parseFloat(match[1]);
  const s = parseFloat(match[2]);
  const l = parseFloat(match[3]);
  if (isNaN(h) || isNaN(s) || isNaN(l)) return null;
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHexByte = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHexByte(f(0))}${toHexByte(f(8))}${toHexByte(f(4))}`;
}

const backendToFrontendCategory = (backendCat: BackendCategory): Category => ({
  id: backendCat.id,
  name: backendCat.name || '',
  iconName: backendCat.icon_name || '',
  icon: getIconComponent(backendCat.icon_name || "Package"),
  mode: backendCat.mode === "both" ? "all" : backendCat.mode,
});

const frontendToBackendCategoryMode = (
  frontendMode: AppMode | "all"
): BackendCategoryMode => {
  if (frontendMode === "all") return "both";
  return frontendMode;
};

const backendToFrontendAssignee = (backendUser: BackendUser): Assignee => ({
  id: backendUser.id,
  name: backendUser.name || '',
  username: backendUser.username || '',
  isAdmin: backendUser.is_admin || false,
});

const backendToFrontendActivity = (
  backendActivityInput: BackendActivityResponse,
  currentAppMode: AppMode
): Activity => {

  const activityIdForLog =
    typeof backendActivityInput?.id === "number" && backendActivityInput.id > 0
      ? backendActivityInput.id
      : "ID_MISSING_OR_INVALID_IN_BACKEND_RESPONSE";

  if (
    !backendActivityInput ||
    typeof backendActivityInput !== "object" ||
    Object.keys(backendActivityInput).length === 0 ||
    activityIdForLog === "ID_MISSING_OR_INVALID_IN_BACKEND_RESPONSE"
  ) {
    const fallbackId = Date.now() + Math.random();
    console.error(
      `[AppProvider] CRITICAL: backendToFrontendActivity received invalid, empty, or ID-less backendActivity object. Using fallback ID ${fallbackId}. Received:`,
      typeof backendActivityInput === "object"
        ? JSON.stringify(backendActivityInput)
        : String(backendActivityInput)
    );
    return {
      id: fallbackId,
      title: "Error: Invalid Activity Data from Backend",
      categoryId: 0,
      todos: [],
      createdAt: Date.now(),
      appMode: currentAppMode,
      completedOccurrences: {},
      time: "00:00",
      recurrence: { type: "none" },
      isSummary: true,
    };
  }

  const startDateFromBackend = backendActivityInput.start_date;
  let createdAtTimestamp: number;

  if (
    typeof startDateFromBackend === "string" &&
    startDateFromBackend.trim() !== ""
  ) {
    try {
      createdAtTimestamp = parseISO(startDateFromBackend).getTime();
      if (isNaN(createdAtTimestamp)) throw new Error("Parsed timestamp is NaN");
    } catch (e) {
      console.warn(
        `[AppProvider] Warning: Failed to parse start_date "${startDateFromBackend}" from backend for activity ID ${activityIdForLog}. Error:`,
        e instanceof Error ? e.message : String(e),
        ". Using fallback createdAt to Date.now()."
      );
      createdAtTimestamp = Date.now();
    }
  } else {
    console.warn(
      `[AppProvider] Warning: backendActivityInput.start_date is missing, null, or invalid in response for activity ID ${activityIdForLog}:`,
      startDateFromBackend === undefined
        ? "FIELD_MISSING"
        : startDateFromBackend,
      ". Using fallback createdAt to Date.now()."
    );
    createdAtTimestamp = Date.now();
  }

  let daysOfWeekArray: number[] = [];
  if (
    backendActivityInput.days_of_week &&
    typeof backendActivityInput.days_of_week === "string"
  ) {
    const dayNameToNumberMap: { [key: string]: number } = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    daysOfWeekArray = backendActivityInput.days_of_week
      .split(",")
      .map((dayStrOrNum) => {
        const dayStrLower = dayStrOrNum.trim().toLowerCase();
        if (dayNameToNumberMap.hasOwnProperty(dayStrLower)) {
          return dayNameToNumberMap[dayStrLower];
        }
        const num = parseInt(dayStrOrNum.trim(), 10);
        return !isNaN(num) && num >= 0 && num <= 6 ? num : -1;
      })
      .filter((num) => num !== -1);
  }

  const recurrenceRule: RecurrenceRule = {
    type: backendActivityInput.repeat_mode as RecurrenceType,
    endDate: backendActivityInput.end_date
      ? parseISO(backendActivityInput.end_date.toString()).getTime()
      : null,
    daysOfWeek: daysOfWeekArray.length > 0 ? daysOfWeekArray : undefined,
    dayOfMonth: backendActivityInput.day_of_month ?? undefined,
  };

  const todosFromBackend: Todo[] = [];
  const completedOccurrencesMap: Record<string, boolean> = {};


  let finalCompletedStatus: boolean | undefined = undefined;
  let finalCompletedAt: number | null | undefined = undefined;

  if (recurrenceRule.type === "none") {
    const mainOccurrenceDate = new Date(createdAtTimestamp);
    if (!isNaN(mainOccurrenceDate.getTime())) {
      finalCompletedStatus = false; 
      finalCompletedAt = null;
    } else {
      console.warn(
        `[AppProvider] Invalid createdAtTimestamp (${createdAtTimestamp}) for activity ID ${activityIdForLog} when determining initial completion.`
      );
    }
  }


  return {
    id: backendActivityInput.id,
    title: backendActivityInput?.title || "",
    categoryId: backendActivityInput.category_id,
    todos: todosFromBackend, 
    createdAt: createdAtTimestamp,
    time: backendActivityInput?.time || undefined,
    notes: backendActivityInput?.notes ?? undefined,
    recurrence:
      recurrenceRule.type === "none" ? { type: "none" } : recurrenceRule,
    completed: finalCompletedStatus,
    completedAt: finalCompletedAt,
    completedOccurrences: completedOccurrencesMap, 
    responsiblePersonIds: backendActivityInput.responsible_ids || [],
    appMode: (backendActivityInput.mode === "both"
      ? currentAppMode
      : backendActivityInput?.mode || currentAppMode) as AppMode,
    created_by_user_id: backendActivityInput.created_by_user_id,
    isSummary: true, 
  };
};


const frontendToBackendActivityPayload = (
  activity: Omit<
    Activity,
    | "id"
    | "completedOccurrences"
    | "isRecurringInstance"
    | "originalInstanceDate"
    | "masterActivityId"
    | "created_by_user_id"
    | "isSummary"
  > & { todos?: BackendTodoCreate[] },
  isUpdate: boolean = false
): Partial<BackendActivityCreatePayload | BackendActivityUpdatePayload> => {
  const payload: Partial<
    BackendActivityCreatePayload & BackendActivityUpdatePayload
  > = {
    title: activity.title,
    start_date: new Date(activity.createdAt).toISOString(),
    time: activity.time || undefined,
    category_id: activity.categoryId,
    notes: activity.notes,
    mode: activity.appMode === "all" ? "both" : activity.appMode,
  };

  if (activity.recurrence && activity.recurrence.type !== "none") {
    payload.repeat_mode = activity.recurrence.type as BackendRepeatMode;
    payload.end_date = activity.recurrence.endDate
      ? new Date(activity.recurrence.endDate).toISOString()
      : null;
    payload.day_of_month =
      activity.recurrence.type === "monthly"
        ? activity.recurrence.dayOfMonth ?? null
        : null;

    if (
      activity.recurrence.type === "weekly" &&
      activity.recurrence.daysOfWeek &&
      activity.recurrence.daysOfWeek.length > 0
    ) {
      const dayNumberToNameArray = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      payload.days_of_week = activity.recurrence.daysOfWeek
        .map((dayNumEntry: number | string) => {
          const numValue: number =
            typeof dayNumEntry === "string"
              ? parseInt(dayNumEntry, 10)
              : dayNumEntry;
          if (
            !isNaN(numValue) &&
            numValue >= 0 &&
            numValue < dayNumberToNameArray.length
          ) {
            return dayNumberToNameArray[numValue];
          }
          console.warn(
            `[AppProvider] frontendToBackendActivityPayload: Invalid day number value '${dayNumEntry}' (type: ${typeof dayNumEntry}). Skipping.`
          );
          return null;
        })
        .filter((name): name is string => name !== null);

      if (payload.days_of_week.length === 0) {
        payload.days_of_week = null;
      }
    } else {
      payload.days_of_week = null;
    }
  } else {
    payload.repeat_mode = "none";
    payload.end_date = null;
    payload.days_of_week = null;
    payload.day_of_month = null;
  }

  if (activity.responsiblePersonIds !== undefined) {
    payload.responsible_ids = activity.responsiblePersonIds;
  } else if (!isUpdate) {
    payload.responsible_ids = [];
  }

  if (!isUpdate && activity.todos && activity.todos.length > 0) {
    (payload as BackendActivityCreatePayload).todos = activity.todos.map(
      (t) => ({ text: t.text, complete: !!t.completed })
    );
  } else if (!isUpdate) {
    (payload as BackendActivityCreatePayload).todos = [];
  }

  return payload;
};

const backendToFrontendHistory = (
  backendHistory: BackendHistory,
  t: (key: keyof Translations, params?: any) => string // Ensure 't' is available
): HistoryLogEntry => {
  const details = backendHistory.details || {};
  // Sanitize details: ensure all values are primitives or simple string representations for logging
  const sanitizedDetails: Record<string, string | number | boolean | null> = {};
  for (const key in details) {
    if (Object.prototype.hasOwnProperty.call(details, key)) {
      const value = details[key];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
        sanitizedDetails[key] = value;
      } else if (value === undefined) {
        sanitizedDetails[key] = t('notSetValuePlaceholder');
      } else {
        sanitizedDetails[key] = String(value); // Fallback for other types
      }
    }
  }

  return {
    id: backendHistory.id,
    timestamp: parseISO(backendHistory.timestamp).getTime(),
    actionKey: backendHistory.action as HistoryLogActionKey,
    backendAction: backendHistory.action,
    backendUserId: backendHistory.user_id,
    scope: backendHistory.scope || "account",
    details: sanitizedDetails, // Use sanitized details
  };
};


const formatBackendError = (errorData: any, defaultMessage: string): string => {
  if (errorData && typeof errorData === "object") {
    if (
      errorData.error &&
      typeof errorData.message === "string" &&
      errorData.message.trim() !== ""
    ) {
      return `${errorData.error}: ${errorData.message}`;
    }
    if (
      typeof errorData.message === "string" &&
      errorData.message.trim() !== ""
    ) {
      return errorData.message;
    }
    const validationDetails =
      errorData.detail || (Array.isArray(errorData) ? errorData : null);
    if (Array.isArray(validationDetails)) {
      return validationDetails
        .map((validationError: any) => {
          const loc =
            validationError.loc && Array.isArray(validationError.loc)
              ? validationError.loc
                  .filter((item: any) => item !== "body")
                  .join(" > ")
              : "Field";
          const msg = validationError.msg || "Invalid input";
          return `${loc}: ${msg}`;
        })
        .join("; ");
    }
    if (
      typeof errorData.detail === "string" &&
      errorData.detail.trim() !== ""
    ) {
      return errorData.detail;
    }
  }
  return defaultMessage;
};

const createApiErrorToast = (
  err: unknown,
  toastFn: (options: any) => void,
  defaultTitleKey: keyof Translations,
  operationType:
    | "loading"
    | "adding"
    | "updating"
    | "deleting"
    | "authenticating"
    | "logging"
    | "refreshing",
  translationFn: (key: keyof Translations, params?: any) => string,
  endpoint?: string
) => {
  const error = err as Error & {
    cause?: unknown;
    name?: string;
    response?: Response;
  };
  let consoleMessage = `[AppProvider] Failed ${operationType} for endpoint: ${
    endpoint || "N/A"
  }.
Error Name: ${error.name || "UnknownError"}
Error Message: ${error.message || "No message"}.`;
  if (error.stack) consoleMessage += `\nStack: ${error.stack}`;

  if (error.cause && typeof error.cause === "object" && error.cause !== null) {
    try {
      consoleMessage += `\nCause: ${JSON.stringify(
        error.cause,
        Object.getOwnPropertyNames(error.cause)
      )}`;
    } catch (e) {
      consoleMessage += `\nCause (could not stringify): ${error.cause}`;
    }
  } else if (error.cause) {
    consoleMessage += `\nCause: ${String(error.cause)}`;
  }
  console.error(consoleMessage);

  let descriptionKey: keyof Translations = "toastDefaultErrorDescription";
  let descriptionParams: any = {};
  let customDescription: string | null = null;

  if (
    error.name === "TypeError" &&
    error.message.toLowerCase().includes("failed to fetch")
  ) {
    descriptionKey = "toastFailedToFetchErrorDescription";
    descriptionParams = { endpoint: endpoint || API_BASE_URL };
  } else if (
    error.message &&
    error.message.toLowerCase().includes("unexpected token '<'") &&
    error.message.toLowerCase().includes("html")
  ) {
    descriptionKey = "toastInvalidJsonErrorDescription";
    descriptionParams = { endpoint: endpoint || API_BASE_URL };
  } else if (error.message) {
    customDescription = error.message;
  }

  toastFn({
    variant: "destructive",
    title: translationFn(defaultTitleKey),
    description:
      customDescription || translationFn(descriptionKey, descriptionParams),
  });
};

const backendToFrontendHabit = (beHabit: BackendHabit): Habit => {
  let createdAtTimestamp: number;
  if (beHabit.created_at && typeof beHabit.created_at === 'string') {
    try {
      createdAtTimestamp = parseISO(beHabit.created_at).getTime();
      if (isNaN(createdAtTimestamp)) throw new Error("Parsed habit created_at timestamp is NaN");
    } catch (e) {
      console.warn(`[AppProvider] Failed to parse created_at "${beHabit.created_at}" for habit ID ${beHabit.id}. Defaulting to Epoch.`, e);
      createdAtTimestamp = 0; 
    }
  } else {
    console.warn(`[AppProvider] Missing created_at for habit ID ${beHabit.id}. Defaulting to Epoch for historical calculations.`);
    createdAtTimestamp = 0; 
  }

  return {
    id: beHabit.id,
    user_id: beHabit.user_id,
    name: beHabit.name || '',
    iconName: beHabit.icon_name || '',
    icon: getIconComponent(beHabit.icon_name),
    slots: (beHabit.slots || []).map((s: BackendHabitSlot) => ({
      id: s.id,
      name: s.name || '',
      default_time: s.default_time || undefined,
      order: s.order,
    })),
    createdAt: createdAtTimestamp,
  };
};


export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [personalActivities, setPersonalActivities] = useState<Activity[]>([]);
  const [workActivities, setWorkActivities] = useState<Activity[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [assignees, setAllAssignees] = useState<Assignee[]>([]);
  const [appModeState, setAppModeState] = useState<AppMode>("personal");
  const [selectedTimezone, setSelectedTimezoneState] = useState<string>('UTC');

  const [accessTokenState, setAccessTokenState] = useState<string | null>(null);
  const [decodedJwtState, setDecodedJwtState] = useState<DecodedToken | null>(null);
  const isRefreshingTokenRef = useRef(false);

  const accessTokenRef = useRef<string | null>(null);
  const decodedJwtRef = useRef<DecodedToken | null>(null);
  const logoutChannelRef = useRef<BroadcastChannel | null>(null);


  useEffect(() => {
    accessTokenRef.current = accessTokenState;
  }, [accessTokenState]);

  useEffect(() => {
    decodedJwtRef.current = decodedJwtState;
  }, [decodedJwtState]);


  const [isLoadingState, setIsLoadingState] = useState<boolean>(true);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(true);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [isAssigneesLoading, setIsAssigneesLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isHabitsLoading, setIsHabitsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t, locale } = useTranslations();

  const dateFnsLocale = useMemo(
    () => (locale === "es" ? es : locale === "fr" ? fr : enUS),
    [locale]
  );
  const [lastNotificationCheckDay, setLastNotificationCheckDay] = useState<
    number | null
  >(null);
  const [notifiedToday, setNotifiedToday] = useState<Set<string>>(new Set());

  const [uiNotifications, setUINotifications] = useState<UINotification[]>([]);
  const [historyLog, setHistoryLog] = useState<HistoryLogEntry[]>([]);
  const { theme, resolvedTheme } = useTheme();
  const [systemNotificationPermission, setSystemNotificationPermission] =
    useState<NotificationPermission | null>(null);

  const [isAppLocked, setIsAppLocked] = useState(false);
  const [appPinState, setAppPinState] = useState<string | null>(null);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitCompletions, setHabitCompletions] = useState<HabitCompletions>(
    {}
  );

  const isAuthenticated = !!accessTokenRef.current;

  const getCurrentUserId = useCallback((): number | null => {
    return decodedJwtRef.current?.userId
      ? decodedJwtRef.current.userId
      : decodedJwtRef.current?.sub
      ? parseInt(decodedJwtRef.current.sub, 10)
      : null;
  }, []);

  const addHistoryLogEntryRef = useRef<
    | ((
        actionKey: HistoryLogActionKey,
        details?: Record<string, string | number | boolean | undefined | null>,
        scope?: HistoryLogEntry["scope"]
      ) => Promise<void>)
    | null
  >(null);

  useEffect(() => {
    const storedTimezone = localStorage.getItem(LOCAL_STORAGE_KEY_TIMEZONE);
    if (storedTimezone && typeof storedTimezone === 'string') {
        try {
            if (Intl.supportedValuesOf('timeZone').includes(storedTimezone)) {
                setSelectedTimezoneState(storedTimezone);
            } else {
                throw new Error("Stored timezone not supported by Intl API");
            }
        } catch (e) {
            console.warn(`Error validating stored timezone "${storedTimezone}", attempting browser default. Error: ${e}`);
            try {
                const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                if (Intl.supportedValuesOf('timeZone').includes(browserTimezone)) {
                    setSelectedTimezoneState(browserTimezone);
                    localStorage.setItem(LOCAL_STORAGE_KEY_TIMEZONE, browserTimezone);
                } else {
                    throw new Error("Browser timezone not supported by Intl API");
                }
            } catch (e2) {
                console.warn(`Error detecting or validating browser timezone, defaulting to UTC. Error: ${e2}`);
                setSelectedTimezoneState('UTC');
                localStorage.setItem(LOCAL_STORAGE_KEY_TIMEZONE, 'UTC');
            }
        }
    } else { // No stored timezone, try to set browser default or UTC
        try {
            const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (Intl.supportedValuesOf('timeZone').includes(browserTimezone)) {
                setSelectedTimezoneState(browserTimezone);
                localStorage.setItem(LOCAL_STORAGE_KEY_TIMEZONE, browserTimezone);
            } else {
                 throw new Error("Browser timezone not supported by Intl API");
            }
        } catch (e) {
            console.warn(`Error detecting or validating browser timezone on initial load, defaulting to UTC. Error: ${e}`);
            setSelectedTimezoneState('UTC');
            localStorage.setItem(LOCAL_STORAGE_KEY_TIMEZONE, 'UTC');
        }
    }
  }, []);


  const setSelectedTimezone = useCallback((timezone: string) => {
    const oldTimezone = selectedTimezone;
    let newTzToSet = 'UTC'; // Default fallback

    if (timezone === 'system') {
        try {
            const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (Intl.supportedValuesOf('timeZone').includes(browserTimezone)) {
                newTzToSet = browserTimezone;
            } else {
                console.warn(`System default timezone "${browserTimezone}" is not recognized by Intl.supportedValuesOf. Falling back to UTC.`);
            }
        } catch (e) {
            console.warn(`Could not detect system default timezone. Falling back to UTC. Error: ${e}`);
        }
    } else if (Intl.supportedValuesOf('timeZone').includes(timezone)) {
        newTzToSet = timezone;
    } else {
        console.warn(`Attempted to set invalid timezone: "${timezone}". Falling back to UTC.`);
    }

    setSelectedTimezoneState(newTzToSet);
    localStorage.setItem(LOCAL_STORAGE_KEY_TIMEZONE, newTzToSet);

    if (oldTimezone !== newTzToSet && addHistoryLogEntryRef.current) {
        addHistoryLogEntryRef.current('historyLogTimezoneChange', { oldTimezone, newTimezone: newTzToSet }, 'account');
    }
  }, [selectedTimezone]);


  const logout = useCallback(
    (isTokenRefreshFailure: boolean = false) => {
      const usernameForLog = decodedJwtRef.current?.username || t('unknownUser');
      console.log(
        `[AppProvider logout] Initiating logout for user ${usernameForLog}. Is token refresh failure: ${isTokenRefreshFailure}`
      );
      if (!isTokenRefreshFailure && addHistoryLogEntryRef.current) {
        const details = { username: usernameForLog };
        addHistoryLogEntryRef.current("historyLogLogout", details, "account");
      }

      accessTokenRef.current = null;
      decodedJwtRef.current = null;
      setAccessTokenState(null);
      setDecodedJwtState(null);


      if (typeof window !== "undefined") {
        console.log(
          "[AppProvider logout] Access JWT removed from state (localStorage handled by token presence)."
        );
      }

      if (typeof window !== "undefined") {
        fetch(`${API_BASE_URL}/logout`, {
          method: "POST",
          credentials: "include",
        })
          .then((response) => {
            if (response.ok) {
              console.log(
                `[AppProvider logout] Backend logout call to ${API_BASE_URL}/logout successful, HttpOnly cookie should be cleared.`
              );
            } else {
              console.warn(
                `[AppProvider logout] Backend logout call to ${API_BASE_URL}/logout failed or was not successful. Status: ${response.status} ${response.statusText}. This might be due to backend policy or an issue with the session/refresh token. Error data (if JSON):`,
                response.headers.get("content-type")?.includes("application/json") ? response.json().catch(() => ({})) : "Not JSON"
              );
            }
          })
          .catch((err) =>
            console.error(
              `[AppProvider logout] Error calling backend logout endpoint ${API_BASE_URL}/logout:`,
              err
            )
          );
      }

      setIsAppLocked(false);
      setPersonalActivities([]);
      setWorkActivities([]);
      setAllCategories([]);
      setAllAssignees([]);
      setHistoryLog([]);
      setUINotifications([]);
      setHabits([]);
      setHabitCompletions({});
      console.log("[AppProvider logout] Client-side app state cleared.");

      if (logoutChannelRef.current) {
        logoutChannelRef.current.postMessage("logout_event_v2");
      }
    },
  [t] 
);

  const decodeAndSetAccessToken = useCallback(
    async (tokenString: string | null): Promise<DecodedToken | null> => {
      if (!tokenString) {
        accessTokenRef.current = null;
        decodedJwtRef.current = null;
        setAccessTokenState(null);
        setDecodedJwtState(null);
        return null;
      }
      console.log(`[AppProvider decodeAndSetAccessToken] Attempting to decode token: ${tokenString.substring(0,20)}...`);
      try {
        const parts = tokenString.split(".");
        if (parts.length !== 3)
          throw new Error("Invalid JWT: token does not have 3 parts");

        const payloadBase64Url = parts[1];
        const payloadBase64 = payloadBase64Url
          .replace(/-/g, "+")
          .replace(/_/g, "/");
        const payloadJson =
          typeof window !== "undefined"
            ? window.atob(payloadBase64)
            : Buffer.from(payloadBase64, "base64").toString("utf-8");
        const payload = JSON.parse(payloadJson);

        const newDecodedJwt: DecodedToken = {
          sub: String(payload.sub),
          exp: Number(payload.exp),
          userId:
            payload.user_id !== undefined
              ? parseInt(String(payload.user_id), 10)
              : payload.sub
              ? parseInt(String(payload.sub), 10)
              : undefined,
          username: payload.username,
          isAdmin: payload.is_admin,
        };

        if (isNaN(newDecodedJwt.exp) || !newDecodedJwt.sub) {
          throw new Error(
            "Invalid JWT payload: 'exp' or 'sub' missing or invalid."
          );
        }
        if (newDecodedJwt.userId === undefined || isNaN(newDecodedJwt.userId)) {
          newDecodedJwt.userId = newDecodedJwt.sub
            ? parseInt(newDecodedJwt.sub, 10)
            : undefined;
          if (
            newDecodedJwt.userId === undefined ||
            isNaN(newDecodedJwt.userId)
          ) {
            throw new Error(
              "Invalid JWT payload: 'userId' or 'sub' for userId is missing or invalid."
            );
          }
        }
        
        accessTokenRef.current = tokenString; 
        decodedJwtRef.current = newDecodedJwt; 
        setAccessTokenState(tokenString);
        setDecodedJwtState(newDecodedJwt);
        console.log("[AppProvider decodeAndSetAccessToken] Token payload decoded:", newDecodedJwt);


        return newDecodedJwt;
      } catch (err) {
        const error = err as Error;
        console.error(
          `[AppProvider decodeAndSetAccessToken] Failed to decode JWT payload (name: ${
            error.name
          }, message: ${
            error.message
          }). Token string (first 20 chars): ${tokenString?.substring(
            0,
            20
          )}...`
        );
        accessTokenRef.current = null;
        decodedJwtRef.current = null;
        setAccessTokenState(null);
        setDecodedJwtState(null);
        return null;
      }
    },
    []
  );

const refreshTokenLogicInternal = useCallback(async (): Promise<string | null> => {
  const currentTokenAtCallTime = accessTokenRef.current;

  if (!currentTokenAtCallTime && !isRefreshingTokenRef.current) {
    console.log("[AppProvider refreshTokenLogicInternal] No access token in ref and not refreshing. Attempting initial refresh.");
  } else if (!currentTokenAtCallTime && isRefreshingTokenRef.current) {
    console.log("[AppProvider refreshTokenLogicInternal] No access token in ref, but already refreshing. Waiting.");
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (!isRefreshingTokenRef.current) {
          clearInterval(interval);
          resolve(accessTokenRef.current);
        }
      }, 100);
    });
  } else if (isRefreshingTokenRef.current) {
    console.log("[AppProvider refreshTokenLogicInternal] Token exists in ref, but another refresh is in progress. Waiting.");
     return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (!isRefreshingTokenRef.current) {
          clearInterval(interval);
          resolve(accessTokenRef.current);
        }
      }, 100);
    });
  }


  isRefreshingTokenRef.current = true;

  try {
    let response: Response;
    try {
      console.log(`[AppProvider refreshTokenLogicInternal] Calling POST ${API_BASE_URL}/refresh-token`);
      response = await fetch(`${API_BASE_URL}/refresh-token`, {
        method: "POST",
        credentials: "include",
      });
    } catch (networkError) {
      console.error(
        "[AppProvider refreshTokenLogicInternal] Network error or CORS issue during token refresh:",
        (networkError as Error).message
      );
      createApiErrorToast(
        { message: "Failed to connect to authentication server or CORS error." },
        toast,
        "loginErrorTitle",
        "refreshing",
        t,
        `${API_BASE_URL}/refresh-token`
      );
      if(accessTokenRef.current) logout(true);
      isRefreshingTokenRef.current = false;
      return null;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        detail: "Failed to refresh token: " + response.statusText,
      }));
      console.error(
        `[AppProvider refreshTokenLogicInternal] Refresh token API call failed: HTTP ${response.status}`,
        errorData
      );
      if(accessTokenRef.current) logout(true);
      isRefreshingTokenRef.current = false;
      throw new Error(
        formatBackendError(
          errorData,
          `Refresh token failed: HTTP ${response.status}`
        )
      );
    }

    const newAuthData = await response.json();
    if (newAuthData.access_token) {
      const decodedNewToken = await decodeAndSetAccessToken(
        newAuthData.access_token
      );
      if (!decodedNewToken) {
        if(accessTokenRef.current) logout(true);
        isRefreshingTokenRef.current = false;
        return null;
      }
      console.log("[AppProvider refreshTokenLogicInternal] Token refresh successful. New token set.");
      isRefreshingTokenRef.current = false;
      return newAuthData.access_token;
    } else {
      console.error("[AppProvider refreshTokenLogicInternal] New access token not found in refresh response.");
      if(accessTokenRef.current) logout(true);
      isRefreshingTokenRef.current = false;
      throw new Error("New access token not found in refresh response.");
    }
  } catch (err) {
    if (!accessTokenRef.current && !isRefreshingTokenRef.current) {
        console.warn("[AppProvider refreshTokenLogicInternal catch] Logout already initiated or not applicable, accessTokenRef is null.");
    } else {
        console.error(
          "[AppProvider refreshTokenLogicInternal] Refresh token process failed:",
          (err as Error).message
        );
        createApiErrorToast(
          err,
          toast,
          "loginErrorTitle",
          "refreshing",
          t,
          `${API_BASE_URL}/refresh-token`
        );
        if(accessTokenRef.current) logout(true);
    }
    isRefreshingTokenRef.current = false;
    return null;
  }
}, [API_BASE_URL, decodeAndSetAccessToken, logout, toast, t]);

  const fetchWithAuth = useCallback(
    async (urlPath: string, options: RequestInit = {}): Promise<Response> => {
      let currentTokenInScope: string | null = accessTokenRef.current;
      let currentDecodedInScope: DecodedToken | null = decodedJwtRef.current;

      const fullUrl = urlPath.startsWith("/api/")
        ? `${API_BASE_URL}${urlPath}`
        : `${API_BASE_URL}${urlPath.startsWith("/") ? "" : "/"}${urlPath}`;

      const tokenIsExpired =
        currentTokenInScope &&
        currentDecodedInScope &&
        currentDecodedInScope.exp * 1000 < Date.now() + 10000;

      const needsRefreshDueToExpiry = currentTokenInScope && tokenIsExpired;
      const needsRefreshDueToMissing = !currentTokenInScope;

      if (
        (needsRefreshDueToExpiry || needsRefreshDueToMissing) &&
        !urlPath.endsWith("/token") &&
        !urlPath.endsWith("/refresh-token") &&
        !isRefreshingTokenRef.current
      ) {
        console.log(
          `[AppProvider fetchWithAuth] Token for ${fullUrl} is ${currentTokenInScope ? (tokenIsExpired ? "expired" : "valid but checking for refresh") : "missing"}. Refreshing...`
        );
        const newAccessTokenString = await refreshTokenLogicInternal();
        if (newAccessTokenString) {
          currentTokenInScope = newAccessTokenString;
          currentDecodedInScope = decodedJwtRef.current;
          console.log(
            `[AppProvider fetchWithAuth] Token refreshed successfully for ${fullUrl}. Proceeding with request.`
          );
        } else {
          console.error(
            `[AppProvider fetchWithAuth] Token refresh failed for ${fullUrl}. Logout should have been initiated by refresh logic.`
          );
          if (accessTokenRef.current) {
             console.warn("[AppProvider fetchWithAuth] Throwing error: Session update failed (refresh failed).");
             throw new Error(
              "Session update failed. Please try logging in again. (Refresh failed before request)"
            );
          } else {
            console.warn(`[AppProvider fetchWithAuth] Already logged out after failed refresh for ${fullUrl}. Throwing error: User is logged out.`);
            throw new Error("User is logged out. Cannot make authenticated request.");
          }
        }
      }


      if (
        !currentTokenInScope &&
        !urlPath.endsWith("/token") &&
        !urlPath.endsWith("/refresh-token")
      ) {
        console.error(
          `[AppProvider fetchWithAuth] CRITICAL: No JWT token available for authenticated request to ${fullUrl} even after refresh attempt.`
        );
        if (accessTokenRef.current) logout(true);
        throw new Error("No JWT token available for authenticated request. Please log in.");
      }

      const headers = new Headers(options.headers || {});
      if (currentTokenInScope) {
        headers.append("Authorization", `Bearer ${currentTokenInScope}`);
      }

      if (
        !(options.body instanceof FormData) &&
        !(options.body instanceof URLSearchParams)
      ) {
        if (
          !headers.has("Content-Type") &&
          options.method &&
          ["POST", "PUT", "PATCH"].includes(options.method.toUpperCase())
        ) {
          headers.append("Content-Type", "application/json");
        }
      }

      const fetchOptions = {
        ...options,
        headers,
        credentials: ("credentials" in options
          ? options.credentials
          : "include") as RequestCredentials,
      };

      let response = await fetch(fullUrl, fetchOptions);

      if (
        response.status === 401 &&
        !urlPath.endsWith("/token") &&
        !urlPath.endsWith("/refresh-token") &&
        !isRefreshingTokenRef.current
      ) {
        console.log(
          `[AppProvider fetchWithAuth] Received 401 for ${fullUrl}, attempting token refresh (retry).`
        );
        const newAccessTokenAfter401 = await refreshTokenLogicInternal();
        if (newAccessTokenAfter401) {
          const retryHeaders = new Headers(options.headers || {});
          retryHeaders.append(
            "Authorization",
            `Bearer ${newAccessTokenAfter401}`
          );
          if (
            !(options.body instanceof FormData) &&
            !(options.body instanceof URLSearchParams)
          ) {
            if (
              !retryHeaders.has("Content-Type") &&
              options.method &&
              ["POST", "PUT", "PATCH"].includes(options.method.toUpperCase())
            ) {
              retryHeaders.append("Content-Type", "application/json");
            }
          }
          console.log(
            `[AppProvider fetchWithAuth] Retrying ${fullUrl} with newly refreshed token (after 401).`
          );
          response = await fetch(fullUrl, {
            ...options,
            headers: retryHeaders,
            credentials: ("credentials" in options
              ? options.credentials
              : "include") as RequestCredentials,
          });
        } else {
          console.error(
            `[AppProvider fetchWithAuth] Token refresh failed after 401 for ${fullUrl}. Logout should have been initiated.`
          );
           if (accessTokenRef.current) {
             console.warn("[AppProvider fetchWithAuth] Throwing error: Session update failed (refresh failed post-401).");
             throw new Error(
              `Session update failed. Please try logging in again. (Details: Refresh failed after 401 for ${fullUrl})`
            );
          } else {
            console.warn(`[AppProvider fetchWithAuth] Already logged out after failed refresh (post-401) for ${fullUrl}. Throwing error: User is logged out.`);
            throw new Error("User is logged out. Cannot make authenticated request after 401.");
          }
        }
      }
      return response;
    },
    [refreshTokenLogicInternal, logout, API_BASE_URL]
  );

  const addHistoryLogEntryLogic = useCallback(
    async (
      actionKey: HistoryLogActionKey,
      details?: Record<string, string | number | boolean | undefined | null>,
      scope: HistoryLogEntry["scope"] = "account"
    ) => {
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        console.warn(
          "[AppProvider] Cannot add history log: User ID not available."
        );
        return;
      }

      const sanitizedDetailsForBackend: Record<string, any> = {};
      const sanitizedDetailsForFrontend: Record<string, string | number | boolean | null> = {};

      if (details) {
        for (const key in details) {
          if (Object.prototype.hasOwnProperty.call(details, key)) {
            const value = details[key];
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
              sanitizedDetailsForBackend[key] = value;
              sanitizedDetailsForFrontend[key] = value;
            } else if (value === undefined) {
              sanitizedDetailsForBackend[key] = null; 
              sanitizedDetailsForFrontend[key] = t('notSetValuePlaceholder'); 
            } else {
              sanitizedDetailsForBackend[key] = String(value); 
              sanitizedDetailsForFrontend[key] = String(value);
            }
          }
        }
      }
      
      const payload: BackendHistoryCreatePayload = {
        action: actionKey, 
        user_id: currentUserId,
        details: sanitizedDetailsForBackend, 
        scope: scope, 
      };

      try {
        const response = await fetchWithAuth(`/history`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(
            formatBackendError(
              errorData,
              `Failed to log history: HTTP ${response.status}`
            )
          );
        }
        const newBackendHistoryEntry: BackendHistory = await response.json();
        const frontendLogEntry = backendToFrontendHistory({
            ...newBackendHistoryEntry,
            details: sanitizedDetailsForFrontend 
        }, t);
        setHistoryLog((prevLog) => [frontendLogEntry, ...prevLog.slice(0, 99)]);
      } catch (err) {
        createApiErrorToast(
          err,
          toast,
          "historyLoadErrorTitle",
          "logging",
          t,
          `/history`
        );
        console.error(
          `[AppProvider] Failed logging history for action ${actionKey}:`,
          (err as Error).message
        );
      }
    },
    [fetchWithAuth, getCurrentUserId, t, toast]
  );


  useEffect(() => {
    addHistoryLogEntryRef.current = addHistoryLogEntryLogic;
  }, [addHistoryLogEntryLogic]);

  useEffect(() => {
    const loadClientSideDataAndFetchInitial = async () => {
      console.log(
        "[AppProvider useEffect init] Starting initial load sequence."
      );
      setIsLoadingState(true);

      const storedAppMode = localStorage.getItem(
        LOCAL_STORAGE_KEY_APP_MODE
      ) as AppMode | null;
      if (
        storedAppMode &&
        (storedAppMode === "personal" || storedAppMode === "work")
      )
        setAppModeState(storedAppMode);

      let effectiveAccessToken = accessTokenRef.current;
      if (!effectiveAccessToken) {
           console.log("[AppProvider useEffect init] No accessToken in ref, attempting refresh via refreshTokenLogicInternal.");
           effectiveAccessToken = await refreshTokenLogicInternal();
      }


      if (effectiveAccessToken) {
        console.log(
          "[AppProvider useEffect init] Token refresh/check successful during init."
        );
      } else {
        console.warn(
          "[AppProvider useEffect init] Token refresh FAILED or no initial token during init."
        );
      }

      if (!accessTokenRef.current) {
        console.log(
          "[AppProvider useEffect init] No effective access token after initial load/refresh. Logging out and skipping data fetches."
        );
        setIsLoadingState(false);
        setIsActivitiesLoading(false);
        setIsCategoriesLoading(false);
        setIsAssigneesLoading(false);
        setIsHistoryLoading(false);
        setIsHabitsLoading(false);
        return;
      }

      console.log(
        "[AppProvider useEffect init] Effective Access Token established. Proceeding with data fetching."
      );

      const storedUINotifications = localStorage.getItem(
        LOCAL_STORAGE_KEY_UI_NOTIFICATIONS
      );
      if (storedUINotifications)
        setUINotifications(JSON.parse(storedUINotifications));
      if (typeof window !== "undefined" && "Notification" in window)
        setSystemNotificationPermission(Notification.permission);
      const storedPin = localStorage.getItem(LOCAL_STORAGE_KEY_APP_PIN);
      if (storedPin) {
        setAppPinState(storedPin);
        setIsAppLocked(true);
      }

      setIsActivitiesLoading(true);
      setIsCategoriesLoading(true);
      setIsAssigneesLoading(true);
      setIsHistoryLoading(true);
      setIsHabitsLoading(true);
      try {
        const [
          actResponse,
          catResponse,
          userResponse,
          histResponse,
          allOccurrencesResponse,
          habitsResponse,
          habitCompletionsResponse,
        ] = await Promise.all([
          fetchWithAuth(`/activities`),
          fetchWithAuth(`/categories`),
          fetchWithAuth(`/users`),
          fetchWithAuth(`/history`),
          fetchWithAuth(`/activity-occurrences`),
          fetchWithAuth(`/habits`),
          fetchWithAuth(`/habit_completions`),
        ]);

        if (!actResponse.ok)
          throw new Error(
            `Activities fetch failed: HTTP ${actResponse.status} ${actResponse.statusText}`
          );
        const backendActivitiesList: BackendActivityResponse[] =
          await actResponse.json();

        if (!catResponse.ok)
          throw new Error(
            `Categories fetch failed: HTTP ${catResponse.status} ${catResponse.statusText}`
          );
        const backendCategories: BackendCategory[] = await catResponse.json();
        setAllCategories(
          backendCategories.map((cat) => backendToFrontendCategory(cat))
        );

        if (!userResponse.ok)
          throw new Error(
            `Users fetch failed: HTTP ${userResponse.status} ${userResponse.statusText}`
          );
        const backendUsers: BackendUser[] = await userResponse.json();
        setAllAssignees(
          backendUsers.map((user) => backendToFrontendAssignee(user))
        );

        if (!histResponse.ok)
          throw new Error(
            `History fetch failed: HTTP ${histResponse.status} ${histResponse.statusText}`
          );
        const backendHistoryItems: BackendHistory[] = await histResponse.json();
        setHistoryLog(
          backendHistoryItems.map((item) => backendToFrontendHistory(item, t))
        );

        let allGlobalOccurrencesMap: Record<number, Record<string, boolean>> = {};
        if (allOccurrencesResponse.ok) {
            const allBackendOccurrences: BackendActivityOccurrenceResponse[] = await allOccurrencesResponse.json();
            allBackendOccurrences.forEach(occ => {
                if (!allGlobalOccurrencesMap[occ.activity_id]) {
                    allGlobalOccurrencesMap[occ.activity_id] = {};
                }
                try {
                    const dateKey = formatISO(parseISO(occ.date), { representation: 'date' });
                    allGlobalOccurrencesMap[occ.activity_id][dateKey] = occ.complete;
                } catch (e) {
                    console.warn(`[AppProvider] Failed to parse date for global occurrence: ActivityID ${occ.activity_id}, Date ${occ.date}`, e);
                }
            });
        } else {
            console.warn(`[AppProvider] Failed to fetch all global occurrences: HTTP ${allOccurrencesResponse.status}`);
        }


        const newPersonal: Activity[] = [],
          newWork: Activity[] = [];
        backendActivitiesList.forEach((beListItem) => {
          if (!beListItem || typeof beListItem.id !== "number") {
            console.warn(
              "[AppProvider] Encountered a null/undefined or ID-less item in backendActivitiesList. Skipping.",
              beListItem
            );
            return;
          }
          try {
            let feAct = backendToFrontendActivity(beListItem, appModeState);
            feAct.completedOccurrences = allGlobalOccurrencesMap[feAct.id] || {};
            if (feAct.recurrence?.type === 'none') {
                const mainOccurrenceDateKey = formatISO(new Date(feAct.createdAt), { representation: 'date' });
                if (feAct.completedOccurrences.hasOwnProperty(mainOccurrenceDateKey)) {
                    feAct.completed = feAct.completedOccurrences[mainOccurrenceDateKey];
                    feAct.completedAt = feAct.completed ? feAct.createdAt : null;
                }
            }

            if (feAct.appMode === "personal") newPersonal.push(feAct);
            else newWork.push(feAct);
          } catch (conversionError) {
            console.error(
              `[AppProvider] Failed to convert backend activity list item (ID: ${
                beListItem.id || "unknown"
              }) to frontend format during initial load. Skipping this item.`,
              conversionError,
              beListItem
            );
          }
        });
        setPersonalActivities(newPersonal);
        setWorkActivities(newWork);

        if (!habitsResponse.ok)
          throw new Error(
            `Habits fetch failed: HTTP ${habitsResponse.status} ${habitsResponse.statusText}`
          );
        const backendHabits: BackendHabit[] = await habitsResponse.json();
        setHabits(backendHabits.map((h) => backendToFrontendHabit(h)));

        if (!habitCompletionsResponse.ok)
          throw new Error(
            `Habit completions fetch failed: HTTP ${habitCompletionsResponse.status} ${habitCompletionsResponse.statusText}`
          );
        const backendCompletions: BackendHabitCompletion[] =
          await habitCompletionsResponse.json();
        const newHabitCompletions: HabitCompletions = {};
        backendCompletions.forEach((comp) => {
          const dateKey = formatISO(parseISO(comp.completion_date), {
            representation: "date",
          });
          if (!newHabitCompletions[comp.habit_id])
            newHabitCompletions[comp.habit_id] = {};
          if (!newHabitCompletions[comp.habit_id][dateKey])
            newHabitCompletions[comp.habit_id][dateKey] = {};
          newHabitCompletions[comp.habit_id][dateKey][comp.slot_id] = {
            completed: comp.is_completed,
            completionId: comp.id,
          };
        });
        setHabitCompletions(newHabitCompletions);

        console.log("[AppProvider useEffect init] Data fetching completed.");
      } catch (err) {
        console.error(
          "[AppProvider useEffect init] Error during initial data fetch:",
          err
        );
        if (
          err instanceof Error &&
          (err.message.toLowerCase().includes("unauthorized") ||
            err.message.includes("401") ||
            err.message.toLowerCase().includes("session expired") ||
            err.message.toLowerCase().includes("session update failed") ||
            err.message.toLowerCase().includes("no jwt token available"))
        ) {
           if (accessTokenRef.current) logout(true);
        } else {
          createApiErrorToast(
            err,
            toast,
            "toastActivityLoadErrorTitle",
            "loading",
            t,
            `Initial data load`
          );
        }
      } finally {
        setIsActivitiesLoading(false);
        setIsCategoriesLoading(false);
        setIsAssigneesLoading(false);
        setIsHistoryLoading(false);
        setIsHabitsLoading(false);
      }
      setIsLoadingState(false);
      console.log(
        "[AppProvider useEffect init] Initial load process finished."
      );
    };

    loadClientSideDataAndFetchInitial();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (typeof window === "undefined" || isLoadingState) return;
    const timerId = setTimeout(() => {
      const computedStyle = getComputedStyle(document.documentElement);
      const backgroundHslString = computedStyle
        .getPropertyValue("--background")
        .trim();
      const hslValues = parseHslString(backgroundHslString);

      if (hslValues) {
        const hexColor = hslToHex(hslValues.h, hslValues.s, hslValues.l);
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
          metaThemeColor = document.createElement("meta");
          metaThemeColor.setAttribute("name", "theme-color");
          document.getElementsByTagName("head")[0].appendChild(metaThemeColor);
        }
        metaThemeColor.setAttribute("content", hexColor);
      } else {
        console.warn(
          "[AppProvider] Could not parse --background HSL string for theme-color:",
          backgroundHslString
        );
      }
    }, 0);
    return () => clearTimeout(timerId);
  }, [theme, resolvedTheme, appModeState, isLoadingState]);

  const getRawActivities = useCallback(() => {
    return appModeState === "work" ? workActivities : personalActivities;
  }, [appModeState, workActivities, personalActivities]);

  const currentActivitySetter = useMemo(() => {
    return appModeState === "work" ? setWorkActivities : setPersonalActivities;
  }, [appModeState]);

  const filteredCategories = useMemo(() => {
    if (isCategoriesLoading) return [];
    return allCategories.filter(
      (cat) => cat.mode === "all" || cat.mode === appModeState
    );
  }, [allCategories, appModeState, isCategoriesLoading]);

  const assigneesForContext = useMemo(() => {
    if (isAssigneesLoading) return [];
    return assignees;
  }, [assignees, isAssigneesLoading]);

  const stableAddUINotification = useCallback(
    (data: Omit<UINotification, "id" | "timestamp" | "read">) => {
      const newNotification: UINotification = {
        ...data,
        id: uuidv4(),
        timestamp: Date.now(),
        read: false,
      };
      setUINotifications((prev) => {
        const existingNotification = prev.find(
          (n) =>
            (n.activityId === newNotification.activityId && n.instanceDate === newNotification.instanceDate && n.title === newNotification.title) ||
            (n.habitId === newNotification.habitId && n.slotId === newNotification.slotId && n.instanceDate === newNotification.instanceDate && n.title === newNotification.title)
        );
        if (existingNotification) return prev;
        return [newNotification, ...prev.slice(0, 49)];
      });
    },
    []
  );

  const showSystemNotification = useCallback(
    (title: string, description: string) => {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission === "granted") {
        try {
          new Notification(title, {
            body: description,
            icon: "/icons/icon-192x192.png",
            lang: locale,
          });
        } catch (error) {
          console.error(
            "[AppProvider] Error creating system notification:",
            error
          );
        }
      }
    },
    [locale]
  );

  const requestSystemNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setSystemNotificationPermission("denied");
      toast({
        title: t("systemNotificationsBlocked"),
        description: t("enableSystemNotificationsDescription") as string,
      });
      return;
    }
    if (Notification.permission === "granted") {
      setSystemNotificationPermission("granted");
      return;
    }
    if (Notification.permission === "denied") {
      setSystemNotificationPermission("denied");
      toast({
        title: t("systemNotificationsBlocked"),
        description: t("enableSystemNotificationsDescription") as string,
        duration: 7000,
      });
      return;
    }
    try {
      const permissionResult = await Notification.requestPermission();
      setSystemNotificationPermission(permissionResult);
      if (permissionResult === "granted") {
        toast({
          title: t("systemNotificationsEnabled"),
          description: t("systemNotificationsNowActive") as string,
        });
        showSystemNotification(
          t("systemNotificationsEnabled") as string,
          t("systemNotificationsNowActive") as string
        );
      } else if (permissionResult === "denied") {
        toast({
          title: t("systemNotificationsBlocked"),
          description: t("systemNotificationsUserDenied") as string,
        });
      } else {
        toast({
          title: t("systemNotificationsNotYetEnabled") as string,
          description: t("systemNotificationsDismissed") as string,
        });
      }
    } catch (err) {
      setSystemNotificationPermission(Notification.permission);
    }
  }, [t, toast, showSystemNotification]);

  useEffect(() => {
    if (!isLoadingState) {
      localStorage.setItem(LOCAL_STORAGE_KEY_APP_MODE, appModeState);
      const root = document.documentElement;
      root.classList.remove("mode-personal", "mode-work");
      root.classList.add(
        appModeState === "work" ? "mode-work" : "mode-personal"
      );
    }
  }, [appModeState, isLoadingState]);

  useEffect(() => {
    if (!isLoadingState)
      localStorage.setItem(
        LOCAL_STORAGE_KEY_UI_NOTIFICATIONS,
        JSON.stringify(uiNotifications)
      );
  }, [uiNotifications, isLoadingState]);

  useEffect(() => {
    if (!isLoadingState || !isAuthenticated || isHabitsLoading || isActivitiesLoading) return;

    const intervalId = setInterval(() => {
      const now = new Date();
      const today = getStartOfDayUtil(now);
      const currentDayOfMonthFromNow = now.getDate();

      if (
        lastNotificationCheckDay !== null &&
        lastNotificationCheckDay !== currentDayOfMonthFromNow
      ) {
        setNotifiedToday(new Set());
      }
      setLastNotificationCheckDay(currentDayOfMonthFromNow);

      // Activity Reminders
      const activitiesToScan =
        appModeState === "work" ? workActivities : personalActivities;

      activitiesToScan.forEach((masterActivity) => {
        const activityTitle = masterActivity.title;
        const masterId = masterActivity.id;

        if (masterActivity.time) {
          const todayInstances = generateFutureInstancesForNotifications(
            masterActivity,
            today,
            dateFnsEndOfDay(today)
          );
          todayInstances.forEach((instance) => {
            const occurrenceDateKey = formatISO(instance.instanceDate, {
              representation: "date",
            });
            const notificationKey5Min = `activity:${masterId}:${occurrenceDateKey}:5min_soon`;
            const isInstanceCompleted =
              !!masterActivity.completedOccurrences?.[occurrenceDateKey];

            if (
              !isInstanceCompleted &&
              !notifiedToday.has(notificationKey5Min)
            ) {
              const [hours, minutes] = masterActivity
                .time!.split(":")
                .map(Number);
              const activityDateTime = new Date(instance.instanceDate);
              activityDateTime.setHours(hours, minutes, 0, 0);

              const fiveMinutesInMs = 5 * 60 * 1000;
              const timeDiffMs = activityDateTime.getTime() - now.getTime();

              if (timeDiffMs >= 0 && timeDiffMs <= fiveMinutesInMs) {
                const toastTitle = t("toastActivityStartingSoonTitle");
                const toastDesc = t("toastActivityStartingSoonDescription", {
                  activityTitle,
                  activityTime: masterActivity.time!,
                });
                showSystemNotification(toastTitle, toastDesc);
                stableAddUINotification({
                  title: toastTitle,
                  description: toastDesc,
                  activityId: masterId,
                  instanceDate: instance.instanceDate.getTime(),
                });
                toast({ title: toastTitle, description: toastDesc });
                setNotifiedToday((prev) =>
                  new Set(prev).add(notificationKey5Min)
                );
              }
            }
          });
        }

        if (
          masterActivity.recurrence &&
          masterActivity.recurrence.type !== "none"
        ) {
          const recurrenceType = masterActivity.recurrence.type;
          const futureCheckEndDate = addDays(today, 8);
          const upcomingInstances = generateFutureInstancesForNotifications(
            masterActivity,
            addDays(today, 1),
            futureCheckEndDate
          );

          upcomingInstances.forEach((instance) => {
            const instanceDateKey = formatISO(instance.instanceDate, {
              representation: "date",
            });
            const isOccurrenceCompleted =
              !!masterActivity.completedOccurrences?.[instanceDateKey];
            if (isOccurrenceCompleted) return;

            const notify = (
              typeKey: string,
              titleKey: keyof Translations,
              descKey: keyof Translations,
              params: { activityTitle: string }
            ) => {
              const notificationFullKey = `activity:${masterId}:${instanceDateKey}:${typeKey}`;
              if (!notifiedToday.has(notificationFullKey)) {
                const notifTitle = t(titleKey as any, params);
                const notifDesc = t(descKey as any, params);
                showSystemNotification(notifTitle, notifDesc);
                stableAddUINotification({
                  title: notifTitle,
                  description: notifDesc,
                  activityId: masterId,
                  instanceDate: instance.instanceDate.getTime(),
                });
                toast({ title: notifTitle, description: notifDesc });
                setNotifiedToday((prev) =>
                  new Set(prev).add(notificationFullKey)
                );
              }
            };

            const oneDayBeforeInstance = dateFnsStartOfDay(
              subDays(instance.instanceDate, 1)
            );
            const twoDaysBeforeInstance = dateFnsStartOfDay(
              subDays(instance.instanceDate, 2)
            );
            const oneWeekBeforeInstance = dateFnsStartOfDay(
              subWeeks(instance.instanceDate, 1)
            );

            if (recurrenceType === "weekly") {
              if (isSameDay(today, oneDayBeforeInstance)) {
                notify(
                  "1day_weekly",
                  "toastActivityTomorrowTitle",
                  "toastActivityTomorrowDescription",
                  { activityTitle }
                );
              }
            } else if (recurrenceType === "monthly") {
              if (isSameDay(today, oneWeekBeforeInstance)) {
                notify(
                  "1week_monthly",
                  "toastActivityInOneWeekTitle",
                  "toastActivityInOneWeekDescription",
                  { activityTitle }
                );
              }
              if (isSameDay(today, twoDaysBeforeInstance)) {
                notify(
                  "2days_monthly",
                  "toastActivityInTwoDaysTitle",
                  "toastActivityInTwoDaysDescription",
                  { activityTitle }
                );
              }
              if (isSameDay(today, oneDayBeforeInstance)) {
                notify(
                  "1day_monthly",
                  "toastActivityTomorrowTitle",
                  "toastActivityTomorrowDescription",
                  { activityTitle }
                );
              }
            }
          });
        }
      });

      // Habit Reminders
      habits.forEach((habit) => {
        const todayDateKey = formatISO(today, { representation: "date" });
        habit.slots.forEach((slot) => {
          if (slot.default_time) {
            const notificationKey10Min = `habit:${habit.id}:${slot.id}:${todayDateKey}:10min_soon`;
            const completionStatus = habitCompletions[habit.id]?.[todayDateKey]?.[slot.id];
            const isHabitSlotCompleted = !!completionStatus?.completed;

            if (!isHabitSlotCompleted && !notifiedToday.has(notificationKey10Min)) { 
              const [hours, minutes] = slot.default_time.split(":").map(Number);
              const habitSlotDateTime = new Date(today);
              habitSlotDateTime.setHours(hours, minutes, 0, 0);

              const tenMinutesInMs = 10 * 60 * 1000;
              const timeDiffMs = habitSlotDateTime.getTime() - now.getTime();

              if (timeDiffMs > 0 && timeDiffMs <= tenMinutesInMs) { 
                const toastTitle = t("toastHabitStartingSoonTitle");
                const toastDesc = t("toastHabitStartingSoonDescription", {
                  habitName: habit.name,
                  slotName: slot.name,
                  slotTime: slot.default_time,
                });
                showSystemNotification(toastTitle, toastDesc);
                stableAddUINotification({
                  title: toastTitle,
                  description: toastDesc,
                  habitId: habit.id,
                  slotId: slot.id,
                  instanceDate: today.getTime(),
                });
                toast({ title: toastTitle, description: toastDesc });
                setNotifiedToday((prev) => new Set(prev).add(notificationKey10Min));
              }
            }
          }
        });
      });


    }, 60000);

    return () => clearInterval(intervalId);
  }, [
    personalActivities,
    workActivities,
    habits, 
    habitCompletions, 
    appModeState,
    isLoadingState,
    isAuthenticated,
    toast,
    t,
    lastNotificationCheckDay,
    notifiedToday,
    stableAddUINotification,
    dateFnsLocale,
    showSystemNotification,
    locale,
    isHabitsLoading,
    isActivitiesLoading,
  ]);

  useEffect(() => {
    if (typeof window !== "undefined" && !logoutChannelRef.current) {
        logoutChannelRef.current = new BroadcastChannel("todoFlowLogoutChannel_v2");
    }
    const channel = logoutChannelRef.current;
    if (!channel) return;

    const handleLogoutMessage = (event: MessageEvent) => {
        if (event.data === "logout_event_v2" && accessTokenRef.current) {
            console.log("[AppProvider BroadcastChannel] Received logout_event_v2, initiating logout.");
            logout();
        }
    };

    channel.addEventListener("message", handleLogoutMessage);

    return () => {
        channel.removeEventListener("message", handleLogoutMessage);
    };
  }, [logout]);



  const setAppMode = useCallback(
    (mode: AppMode) => {
      const oldModeDisplay = appModeState.charAt(0).toUpperCase() + appModeState.slice(1);
      const newModeDisplay = mode.charAt(0).toUpperCase() + mode.slice(1);
      if (mode !== appModeState && addHistoryLogEntryRef.current) {
        const details = {
            oldMode: oldModeDisplay,
            newMode: newModeDisplay,
        };
        addHistoryLogEntryRef.current("historyLogSwitchMode", details, "account");
      }
      setAppModeState(mode);
    },
    [appModeState] 
  );

  const login = useCallback(
    async (
      username: string,
      password: string,
      rememberMe?: boolean
    ): Promise<boolean> => {
      setError(null);
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      try {
        const response = await fetch(`${API_BASE_URL}/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
          credentials: "include",
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(
            formatBackendError(
              errorData,
              `Login failed: HTTP ${response.status}`
            )
          );
        }
        const tokenData: Token = await response.json();
        const decodedFromNewToken = await decodeAndSetAccessToken(
          tokenData.access_token
        );

        if (!decodedFromNewToken)
          throw new Error("Failed to process token after login.");

        if (addHistoryLogEntryRef.current) {
            const usernameForLog = decodedFromNewToken.username || t('unknownUser');
            const details = { username: usernameForLog };
            addHistoryLogEntryRef.current("historyLogLogin", details, "account");
        }
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          const title = t("loginSuccessNotificationTitle");
          const description = t("loginSuccessNotificationDescription");
          stableAddUINotification({ title, description });
          showSystemNotification(title, description);
        }

        try {
          setIsActivitiesLoading(true);
          setIsCategoriesLoading(true);
          setIsAssigneesLoading(true);
          setIsHistoryLoading(true);
          setIsHabitsLoading(true);

          const [
            actResponse,
            catResponse,
            userResponse,
            histResponse,
            allOccurrencesResponse,
            habitsResponse,
            habitCompletionsResponse,
          ] = await Promise.all([
            fetchWithAuth(`/activities`),
            fetchWithAuth(`/categories`),
            fetchWithAuth(`/users`),
            fetchWithAuth(`/history`),
            fetchWithAuth(`/activity-occurrences`),
            fetchWithAuth(`/habits`),
            fetchWithAuth(`/habit_completions`),
          ]);

          if (!actResponse.ok)
            throw new Error(
              `Activities fetch failed: HTTP ${actResponse.status} ${actResponse.statusText}`
            );
          const backendActivitiesList: BackendActivityResponse[] =
            await actResponse.json();

          if (!catResponse.ok)
            throw new Error(
              `Categories fetch failed: HTTP ${catResponse.status} ${catResponse.statusText}`
            );
          const backendCategories: BackendCategory[] = await catResponse.json();
          setAllCategories(
            backendCategories.map((cat) => backendToFrontendCategory(cat))
          );

          if (!userResponse.ok)
            throw new Error(
              `Users fetch failed: HTTP ${userResponse.status} ${userResponse.statusText}`
            );
          const backendUsers: BackendUser[] = await userResponse.json();
          setAllAssignees(
            backendUsers.map((user) => backendToFrontendAssignee(user))
          );

          if (!histResponse.ok)
            throw new Error(
              `History fetch failed: HTTP ${histResponse.status} ${histResponse.statusText}`
            );
          const backendHistoryItems: BackendHistory[] = await histResponse.json();
          setHistoryLog(
            backendHistoryItems.map((item) => backendToFrontendHistory(item,t)) 
          );

          let allGlobalOccurrencesMap: Record<number, Record<string, boolean>> = {};
          if (allOccurrencesResponse.ok) {
              const allBackendOccurrences: BackendActivityOccurrenceResponse[] = await allOccurrencesResponse.json();
              allBackendOccurrences.forEach(occ => {
                  if (!allGlobalOccurrencesMap[occ.activity_id]) {
                      allGlobalOccurrencesMap[occ.activity_id] = {};
                  }
                  try {
                      const dateKey = formatISO(parseISO(occ.date), { representation: 'date' });
                      allGlobalOccurrencesMap[occ.activity_id][dateKey] = occ.complete;
                  } catch (e) {
                      console.warn(`[AppProvider] Failed to parse date for global occurrence during login: ActivityID ${occ.activity_id}, Date ${occ.date}`, e);
                  }
              });
          } else {
              console.warn(`[AppProvider] Failed to fetch all global occurrences during login: HTTP ${allOccurrencesResponse.status}`);
          }

          const newPersonal: Activity[] = [],
            newWork: Activity[] = [];
          backendActivitiesList.forEach((beListItem) => {
            if (!beListItem || typeof beListItem.id !== "number") {
              console.warn(
                "[AppProvider] Encountered a null/undefined or ID-less item in backendActivitiesList during login. Skipping.",
                beListItem
              );
              return;
            }
            try {
              let feAct = backendToFrontendActivity(beListItem, appModeState);
              feAct.completedOccurrences = allGlobalOccurrencesMap[feAct.id] || {};
              if (feAct.recurrence?.type === 'none') {
                  const mainOccurrenceDateKey = formatISO(new Date(feAct.createdAt), { representation: 'date' });
                  if (feAct.completedOccurrences.hasOwnProperty(mainOccurrenceDateKey)) {
                      feAct.completed = feAct.completedOccurrences[mainOccurrenceDateKey];
                      feAct.completedAt = feAct.completed ? feAct.createdAt : null;
                  }
              }

              if (feAct.appMode === "personal") newPersonal.push(feAct);
              else newWork.push(feAct);
            } catch (conversionError) {
              console.error(
                `[AppProvider] Failed to convert backend activity list item (ID: ${
                  beListItem.id || "unknown"
                }) to frontend format during login. Skipping this item.`,
                conversionError,
                beListItem
              );
            }
          });
          setPersonalActivities(newPersonal);
          setWorkActivities(newWork);

          if (!habitsResponse.ok)
            throw new Error(
              `Habits fetch failed: HTTP ${habitsResponse.status} ${habitsResponse.statusText}`
            );
          const backendHabits: BackendHabit[] = await habitsResponse.json();
          setHabits(backendHabits.map((h) => backendToFrontendHabit(h)));

          if (!habitCompletionsResponse.ok)
            throw new Error(
              `Habit completions fetch failed: HTTP ${habitCompletionsResponse.status} ${habitCompletionsResponse.statusText}`
            );
          const backendCompletions: BackendHabitCompletion[] =
            await habitCompletionsResponse.json();
          const newHabitCompletions: HabitCompletions = {};
          backendCompletions.forEach((comp) => {
            const dateKey = formatISO(parseISO(comp.completion_date), {
              representation: "date",
            });
            if (!newHabitCompletions[comp.habit_id])
              newHabitCompletions[comp.habit_id] = {};
            if (!newHabitCompletions[comp.habit_id][dateKey])
              newHabitCompletions[comp.habit_id][dateKey] = {};
            newHabitCompletions[comp.habit_id][dateKey][comp.slot_id] = {
              completed: comp.is_completed,
              completionId: comp.id,
            };
          });
          setHabitCompletions(newHabitCompletions);
        } catch (err) {
            if (!accessTokenRef.current) {
                console.warn("[AppProvider login catch] Logout seems to have been initiated by a deeper auth error. Skipping redundant logout call.");
            } else if (
                err instanceof Error &&
                (err.message.toLowerCase().includes("unauthorized") ||
                err.message.includes("401") ||
                err.message.toLowerCase().includes("session update failed") ||
                err.message.toLowerCase().includes("session expired") ||
                err.message.toLowerCase().includes("no jwt token available"))
            ) {
                logout(true);
            } else {
                createApiErrorToast(err, toast, "toastActivityLoadErrorTitle", "loading", t, "initial data fetch");
            }
        } finally {
          setIsActivitiesLoading(false);
          setIsCategoriesLoading(false);
          setIsAssigneesLoading(false);
          setIsHistoryLoading(false);
          setIsHabitsLoading(false);
        }
        return true;
      } catch (err) {
        createApiErrorToast(
          err,
          toast,
          "loginErrorTitle",
          "authenticating",
          t,
          `/token`
        );
        setError((err as Error).message);
        return false;
      }
    },
    [
      API_BASE_URL,
      decodeAndSetAccessToken,
      t,
      toast,
      stableAddUINotification,
      showSystemNotification,
      fetchWithAuth,
      appModeState,
      logout,
    ]
  );

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string): Promise<boolean> => {
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        toast({
          variant: "destructive",
          title: t("loginErrorTitle"),
          description: "User not identified for password change.",
        });
        return false;
      }
      setError(null);
      const payload = { old_password: oldPassword, new_password: newPassword };
      try {
        const response = await fetchWithAuth(
          `/users/${currentUserId}/change-password`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(
            formatBackendError(
              errorData,
              `Password change failed: HTTP ${response.status}`
            )
          );
        }
        if (addHistoryLogEntryRef.current) {
            const details = { userId: String(currentUserId) };
            addHistoryLogEntryRef.current("historyLogPasswordChangeAttempt", details, "account");
        }
        toast({
          title: t("passwordUpdateSuccessTitle"),
          description: t("passwordUpdateSuccessDescription"),
        });
        return true;
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.toLowerCase().includes("unauthorized") ||
            err.message.includes("401"))
        ) {
          logout();
        } else {
          createApiErrorToast(
            err,
            toast,
            "changePasswordModalTitle",
            "updating",
            t,
            `/users/${currentUserId}/change-password`
          );
        }
        setError((err as Error).message);
        return false;
      }
    },
    [fetchWithAuth, getCurrentUserId, t, toast, logout]
  );

  const generateChangeEntry = useCallback((
    fieldNameKey: keyof Translations,
    oldValue: any,
    newValue: any,
    notSetValueKey: keyof Translations = 'notSetValuePlaceholder',
    valueFormatter?: (val: any) => string
  ): string | null => {
    
    const formatValDisplay = (val: any): string => {
      if (val === undefined || val === null || String(val).trim() === '') {
        return t(notSetValueKey);
      }
      return valueFormatter ? valueFormatter(val) : String(val);
    };
  
    const oldStr = formatValDisplay(oldValue);
    const newStr = formatValDisplay(newValue);
  
    if (oldStr !== newStr) {
      if (oldStr === t(notSetValueKey)) { 
        return t('fieldSetToDetail', { field: t(fieldNameKey), value: newStr });
      }
      return t('fieldChangeDetail', { field: t(fieldNameKey), from: oldStr, to: newStr });
    }
    return null;
  }, [t]);

  const generateChangeList = useCallback((
    oldData: Record<string, any> | undefined | null,
    newData: Record<string, any>,
    fieldMappings: Record<string, { labelKey: keyof Translations, formatter?: (val: any) => string }>,
    notSetValueKey: keyof Translations = 'notSetValuePlaceholder'
  ): string => {
    const changes: string[] = [];
    if (!oldData) { 
        for (const key in fieldMappings) {
            if (Object.prototype.hasOwnProperty.call(fieldMappings, key) && newData[key] !== undefined && newData[key] !== null && String(newData[key]).trim() !== '') {
                const { labelKey, formatter } = fieldMappings[key];
                const formattedNewVal = formatter ? formatter(newData[key]) : String(newData[key]);
                changes.push(t('fieldSetToDetail', { field: t(labelKey), value: formattedNewVal }));
            }
        }
    } else {
        for (const key in fieldMappings) {
            if (Object.prototype.hasOwnProperty.call(fieldMappings, key)) {
                const oldVal = oldData[key];
                const newVal = newData[key];
                const { labelKey, formatter } = fieldMappings[key];
                
                if (Object.prototype.hasOwnProperty.call(newData, key) || (oldData && Object.prototype.hasOwnProperty.call(oldData, key))) {
                    const entry = generateChangeEntry(labelKey, oldVal, newVal, notSetValueKey, formatter);
                    if (entry) {
                    changes.push(entry);
                    }
                }
            }
        }
    }

    if (changes.length === 0) {
      return t('noDetailedChangesLogged');
    }
    return changes.join('; ');
  }, [t, generateChangeEntry]);


  const addCategory = useCallback(
    async (name: string, iconName: string, mode: AppMode | "all") => {
      setError(null);
      const payload: BackendCategoryCreatePayload = {
        name,
        icon_name: iconName,
        mode: frontendToBackendCategoryMode(mode),
      };
      try {
        const response = await fetchWithAuth(`/categories`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(
            formatBackendError(
              errorData,
              `Failed to add category: HTTP ${response.status}`
            )
          );
        }
        const newBackendCategory: BackendCategory = await response.json();
        setAllCategories((prev) => [
          ...prev,
          backendToFrontendCategory(newBackendCategory),
        ]);
        
        const categoryNameForLog = newBackendCategory.name || t('unknownText');
        toast({
          title: t("toastCategoryAddedTitle"),
          description: t("toastCategoryAddedDescription", {
            categoryName: categoryNameForLog,
          }),
        });

        if (addHistoryLogEntryRef.current) {
            const details = {
                categoryId: newBackendCategory.id,
                name: categoryNameForLog,
                iconName: newBackendCategory.icon_name || t('unknownText'),
                mode: newBackendCategory.mode || t('unknownText'),
            };
            addHistoryLogEntryRef.current("historyLogAddCategory", details, "category");
        }
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.toLowerCase().includes("unauthorized") ||
            err.message.includes("401"))
        ) {
          logout();
        } else {
          createApiErrorToast(
            err,
            toast,
            "toastCategoryAddedTitle",
            "adding",
            t,
            `/categories`
          );
        }
        setError((err as Error).message);
        throw err;
      }
    },
    [fetchWithAuth, toast, t, logout]
  );

  const updateCategory = useCallback(
    async (
      categoryId: number,
      updates: Partial<Omit<Category, "id" | "icon">>,
      originalCategory?: Category 
    ) => {
      setError(null);
      const payload: BackendCategoryUpdatePayload = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.iconName !== undefined) payload.icon_name = updates.iconName;
      if (updates.mode !== undefined)
        payload.mode = frontendToBackendCategoryMode(updates.mode);

      try {
        const response = await fetchWithAuth(`/categories/${categoryId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(
            formatBackendError(
              errorData,
              `Failed to update category: HTTP ${response.status}`
            )
          );
        }
        const updatedBackendCategory: BackendCategory = await response.json();
        const updatedFrontendCategory = backendToFrontendCategory(
          updatedBackendCategory
        );
        setAllCategories((prev) =>
          prev.map((cat) =>
            cat.id === categoryId ? updatedFrontendCategory : cat
          )
        );
        
        const categoryNameForLog = updatedFrontendCategory.name || t('unknownText');
        toast({
          title: t("toastCategoryUpdatedTitle"),
          description: t("toastCategoryUpdatedDescription", {
            categoryName: categoryNameForLog,
          }),
        });
        
        let changesSummary = t('detailsNotAvailable');
        if (originalCategory) {
            changesSummary = generateChangeList(
                { name: originalCategory.name, iconName: originalCategory.iconName, mode: originalCategory.mode },
                { name: updatedFrontendCategory.name, iconName: updatedFrontendCategory.iconName, mode: updatedFrontendCategory.mode },
                { 
                    name: { labelKey: 'categoryNameLabel' }, 
                    iconName: { labelKey: 'iconNameLabel' }, 
                    mode: { labelKey: 'modeLabel', formatter: (val) => t(val === 'all' ? 'modeAll' : val === 'personal' ? 'modePersonal' : 'modeWork' as any) } 
                }
            ) || t('noDetailedChangesLogged');
        }

        if (addHistoryLogEntryRef.current) {
            const details = {
                categoryId: categoryId, 
                name: categoryNameForLog, 
                changesSummary 
            };
            addHistoryLogEntryRef.current("historyLogUpdateCategory", details, "category");
        }

      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.toLowerCase().includes("unauthorized") ||
            err.message.includes("401"))
        ) {
          logout();
        } else {
          createApiErrorToast(
            err,
            toast,
            "toastCategoryUpdatedTitle",
            "updating",
            t,
            `/categories/${categoryId}`
          );
        }
        setError((err as Error).message);
        throw err;
      }
    },
    [fetchWithAuth, toast, t, logout, generateChangeList]
  );

  const deleteCategory = useCallback(
    async (categoryId: number) => {
      setError(null);
      const categoryToDelete = allCategories.find(
        (cat) => cat.id === categoryId
      );
      if (!categoryToDelete) return;

      const categoryNameForLog = categoryToDelete.name || t('unknownText');

      try {
        const response = await fetchWithAuth(`/categories/${categoryId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(
            formatBackendError(
              errorData,
              `Failed to delete category: HTTP ${response.status}`
            )
          );
        }
        setAllCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
        const updateActivitiesCategory = (acts: Activity[]) =>
          acts.map((act) =>
            act.categoryId === categoryId ? { ...act, categoryId: 0 } : act
          );
        setPersonalActivities((prev) => updateActivitiesCategory(prev));
        setWorkActivities((prev) => updateActivitiesCategory(prev));
        toast({
          title: t("toastCategoryDeletedTitle"),
          description: t("toastCategoryDeletedDescription", {
            categoryName: categoryNameForLog,
          }),
        });
        if (addHistoryLogEntryRef.current) {
            const details = {
                categoryId: categoryId,
                name: categoryNameForLog,
                iconName: categoryToDelete.iconName || t('unknownText'),
                mode: categoryToDelete.mode || t('unknownText'),
            };
            addHistoryLogEntryRef.current("historyLogDeleteCategory", details, "category");
        }
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.toLowerCase().includes("unauthorized") ||
            err.message.includes("401"))
        ) {
          logout();
        } else {
          createApiErrorToast(
            err,
            toast,
            "toastCategoryDeletedTitle",
            "deleting",
            t,
            `/categories/${categoryId}`
          );
        }
        setError((err as Error).message);
        throw err;
      }
    },
    [fetchWithAuth, allCategories, toast, t, logout]
  );

  const addAssignee = useCallback(
    async (
      name: string,
      username: string,
      password?: string,
      isAdmin?: boolean
    ) => {
      setError(null);
      if (!password) {
        toast({
          variant: "destructive",
          title: t("loginErrorTitle"),
          description: "Password is required to create a user.",
        });
        throw new Error("Password is required to create a user.");
      }
      const payload: BackendUserCreatePayload = {
        name,
        username,
        password,
        is_admin: isAdmin || false,
      };

      try {
        const response = await fetchWithAuth(`/users`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(
            formatBackendError(
              errorData,
              `Failed to add assignee: HTTP ${response.status}`
            )
          );
        }
        const newBackendUser: BackendUser = await response.json();
        setAllAssignees((prev) => [
          ...prev,
          backendToFrontendAssignee(newBackendUser),
        ]);

        const assigneeNameForLog = newBackendUser.name || t('unknownText');
        toast({
          title: t("toastAssigneeAddedTitle"),
          description: t("toastAssigneeAddedDescription", {
            assigneeName: assigneeNameForLog,
          }),
        });

        if (addHistoryLogEntryRef.current) {
            const details = {
                assigneeId: newBackendUser.id,
                name: assigneeNameForLog,
                username: newBackendUser.username || t('unknownText'),
                isAdmin: newBackendUser.is_admin,
            };
            addHistoryLogEntryRef.current("historyLogAddAssignee", details, "assignee");
        }
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.toLowerCase().includes("unauthorized") ||
            err.message.includes("401"))
        ) {
          logout();
        } else {
          createApiErrorToast(
            err,
            toast,
            "toastAssigneeAddedTitle",
            "adding",
            t,
            `/users`
          );
        }
        setError((err as Error).message);
        throw err;
      }
    },
    [fetchWithAuth, toast, t, logout]
  );

  const updateAssignee = useCallback(
    async (
      assigneeId: number,
      updates: Partial<Pick<Assignee, "name" | "username" | "isAdmin">>,
      newPassword?: string
    ) => {
      setError(null);
      const originalAssignee = assignees.find((a) => a.id === assigneeId);

      const payload: BackendUserUpdatePayload = {};
      if (updates.name) payload.name = updates.name;
      if (updates.username) payload.username = updates.username;
      if (newPassword) payload.password = newPassword;
      if (updates.isAdmin !== undefined) payload.is_admin = updates.isAdmin;

      try {
        const response = await fetchWithAuth(`/users/${assigneeId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(
            formatBackendError(
              errorData,
              `Failed to update assignee: HTTP ${response.status}`
            )
          );
        }
        const updatedBackendUser: BackendUser = await response.json();
        const frontendAssignee = backendToFrontendAssignee(updatedBackendUser);

        setAllAssignees((prev) =>
          prev.map((asg) => (asg.id === assigneeId ? frontendAssignee : asg))
        );
        
        const assigneeNameForLog = frontendAssignee.name || t('unknownText');
        toast({
          title: t("toastAssigneeUpdatedTitle"),
          description: t("toastAssigneeUpdatedDescription", {
            assigneeName: assigneeNameForLog,
          }),
        });
        
        let changesSummary = t('detailsNotAvailable');
        if (originalAssignee) {
             changesSummary = generateChangeList(
                originalAssignee,
                { name: frontendAssignee.name, username: frontendAssignee.username, isAdmin: frontendAssignee.isAdmin },
                { 
                  name: { labelKey: 'assigneeNameLabel' }, 
                  username: { labelKey: 'usernameLabel' }, 
                  isAdmin: { labelKey: 'adminStatusLabel', formatter: (val) => val ? t('adminBadge') : 'No' } 
                }
            ) || t('noDetailedChangesLogged');
        }
        
        if (newPassword) {
            const passwordChangeText = t('passwordChangedConfirmation');
            changesSummary = changesSummary === t('noDetailedChangesLogged') || changesSummary === t('detailsNotAvailable')
                ? passwordChangeText
                : `${changesSummary}; ${passwordChangeText}`;
        }

        if (addHistoryLogEntryRef.current) {
            const details = {
                assigneeId: assigneeId, 
                name: assigneeNameForLog, 
                changesSummary 
            };
            addHistoryLogEntryRef.current("historyLogUpdateAssignee", details, "assignee");
        }

      } catch (err) {
        if (
          !(
            err instanceof Error &&
            err.message.includes(
              t("usernameTakenErrorDescription", {
                username: updates.username || "",
              })
            )
          )
        ) {
          if (
            err instanceof Error &&
            (err.message.toLowerCase().includes("unauthorized") ||
              err.message.includes("401"))
          ) {
            logout();
          } else {
            createApiErrorToast(
              err,
              toast,
              "toastAssigneeUpdatedTitle",
              "updating",
              t,
              `/users/${assigneeId}`
            );
          }
        }
        setError((err as Error).message);
        throw err;
      }
    },
    [fetchWithAuth, assignees, toast, t, logout, generateChangeList]
  );

  const deleteAssignee = useCallback(
    async (assigneeId: number) => {
      setError(null);
      const assigneeToDelete = assignees.find((asg) => asg.id === assigneeId);
      if (!assigneeToDelete) return;

      const assigneeNameForLog = assigneeToDelete.name || t('unknownText');

      try {
        const response = await fetchWithAuth(`/users/${assigneeId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(
            formatBackendError(
              errorData,
              `Failed to delete assignee: HTTP ${response.status}`
            )
          );
        }
        setAllAssignees((prev) => prev.filter((asg) => asg.id !== assigneeId));
        const updateActivities = (acts: Activity[]) =>
          acts.map((act) => ({
            ...act,
            responsiblePersonIds: act.responsiblePersonIds?.filter(
              (id) => id !== assigneeId
            ),
          }));
        setPersonalActivities((prev) => updateActivities(prev));
        setWorkActivities((prev) => updateActivities(prev));

        toast({
          title: t("toastAssigneeDeletedTitle"),
          description: t("toastAssigneeDeletedDescription", {
            assigneeName: assigneeNameForLog,
          }),
        });

        if (addHistoryLogEntryRef.current) {
            const details = {
                assigneeId: assigneeId,
                name: assigneeNameForLog,
                username: assigneeToDelete.username || t('unknownText'),
            };
            addHistoryLogEntryRef.current("historyLogDeleteAssignee", details, "assignee");
        }
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.toLowerCase().includes("unauthorized") ||
            err.message.includes("401"))
        ) {
          logout();
        } else {
          createApiErrorToast(
            err,
            toast,
            "toastAssigneeDeletedTitle",
            "deleting",
            t,
            `/users/${assigneeId}`
          );
        }
        setError((err as Error).message);
        throw err;
      }
    },
    [fetchWithAuth, assignees, toast, t, logout]
  );

  const addActivity = useCallback(
    async (
      activityData: Omit<
        Activity,
        | "id"
        | "todos"
        | "createdAt"
        | "completed"
        | "completedAt"
        | "notes"
        | "recurrence"
        | "completedOccurrences"
        | "responsiblePersonIds"
        | "categoryId"
        | "appMode"
        | "masterActivityId"
        | "isRecurringInstance"
        | "originalInstanceDate"
        | "created_by_user_id"
        | "isSummary"
      > & {
        todos?: Omit<Todo, "id">[];
        time?: string;
        notes?: string;
        recurrence?: RecurrenceRule | null;
        responsiblePersonIds?: number[];
        categoryId: number;
        appMode: AppMode;
      },
      customCreatedAt?: number
    ) => {
      setError(null);
      const frontendActivityShell: Activity = {
        id: 0, 
        title: activityData.title,
        categoryId: activityData.categoryId,
        todos: (activityData.todos || []).map((t, i) => ({ 
          id: Date.now() + i, 
          text: t.text,
          completed: !!t.completed,
        })),
        createdAt: customCreatedAt !== undefined ? customCreatedAt : Date.now(),
        time: activityData.time,
        notes: activityData.notes,
        recurrence: activityData.recurrence,
        responsiblePersonIds: activityData.responsiblePersonIds,
        appMode: activityData.appMode,
        completedOccurrences: {},
        isSummary: false, 
      };

      const payload = frontendToBackendActivityPayload(
        frontendActivityShell
      ) as BackendActivityCreatePayload;
      payload.todos = (activityData.todos || []).map((t) => ({
        text: t.text,
        complete: !!t.completed,
      }));

      try {
        const response = await fetchWithAuth(`/activities`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(
            formatBackendError(
              errorData,
              `Failed to add activity: HTTP ${response.status}`
            )
          );
        }

        const newBackendActivityResponse: BackendActivityResponse = await response.json();

        const fullNewActivity = await fetchAndSetSpecificActivityDetails(newBackendActivityResponse.id);
        const titleForLog = (fullNewActivity?.title || newBackendActivityResponse.title) || t('unknownActivityTitle');
        const modeForLog = (fullNewActivity?.appMode || activityData.appMode);

        toast({
            title: t("toastActivityAddedTitle"),
            description: t("toastActivityAddedDescription", { activityTitle: titleForLog }),
        });

        if (addHistoryLogEntryRef.current) {
            const finalActivityDetailsForLog = fullNewActivity || backendToFrontendActivity(newBackendActivityResponse, appModeState);
            const category = allCategories.find((c) => c.id === finalActivityDetailsForLog.categoryId);
            const details = {
                activityId: finalActivityDetailsForLog.id,
                title: titleForLog,
                categoryName: category?.name || t('uncategorized'),
                date: formatDateFns(new Date(finalActivityDetailsForLog.createdAt), "PP", { locale: dateFnsLocale }),
                time: finalActivityDetailsForLog.time || t('timeNotSet'),
                mode: modeForLog,
            };
            addHistoryLogEntryRef.current("historyLogAddActivity", details, modeForLog);
        } else {
            console.warn(`[AppProvider] addActivity: Successfully created activity ID ${newBackendActivityResponse.id}, but history log function not available.`);
        }

      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.toLowerCase().includes("unauthorized") ||
            err.message.includes("401"))
        ) {
          logout();
        } else {
          createApiErrorToast(
            err,
            toast,
            "toastActivityAddedTitle",
            "adding",
            t,
            `/activities`
          );
        }
        setError((err as Error).message);
        throw err;
      }
    },
    [
      fetchWithAuth,
      appModeState,
      toast,
      t,
      logout,
      allCategories,
      dateFnsLocale,
    ]
  );


  const fetchAndSetSpecificActivityDetails = useCallback(
    async (activityId: number): Promise<Activity | null> => {
      try {
        const [baseActivityResponse, todosResponse, occurrencesResponse] = await Promise.all([
            fetchWithAuth(`/activities/${activityId}`),
            fetchWithAuth(`/activities/${activityId}/todos`),
            fetchWithAuth(`/activities/${activityId}/occurrences`)
        ]);

        if (!baseActivityResponse.ok) {
          const errorData = await baseActivityResponse.json().catch(() => ({
            detail: `HTTP ${baseActivityResponse.status}: ${baseActivityResponse.statusText}`,
          }));
          throw new Error(formatBackendError(errorData,`Failed to fetch base activity details for ID ${activityId}.`));
        }
        const backendBaseActivity: BackendActivityResponse = await baseActivityResponse.json();

        if (!todosResponse.ok) {
            const errorData = await todosResponse.json().catch(() => ({
                detail: `HTTP ${todosResponse.status}: ${todosResponse.statusText}`,
            }));
            throw new Error(formatBackendError(errorData, `Failed to fetch todos for activity ID ${activityId}.`));
        }
        const backendTodos: BackendActivityTodosResponse = await todosResponse.json();

        if (!occurrencesResponse.ok) {
            const errorData = await occurrencesResponse.json().catch(() => ({
                detail: `HTTP ${occurrencesResponse.status}: ${occurrencesResponse.statusText}`,
            }));
            throw new Error(formatBackendError(errorData, `Failed to fetch occurrences for activity ID ${activityId}.`));
        }
        const backendOccurrences: BackendActivityOccurrencesListResponse = await occurrencesResponse.json();

        let frontendActivity = backendToFrontendActivity(backendBaseActivity, appModeState);

        frontendActivity.todos = backendTodos.map(bt => ({
            id: bt.id,
            text: bt.text,
            completed: bt.complete
        }));

        const newCompletedOccurrences: Record<string, boolean> = {};
        backendOccurrences.forEach(occ => {
            try {
                const dateKey = formatISO(parseISO(occ.date), { representation: 'date' });
                newCompletedOccurrences[dateKey] = occ.complete;
            } catch (e) {
                console.warn(`[AppProvider] Failed to parse date for occurrence in fetchAndSetSpecificActivityDetails: ActivityID ${occ.activity_id}, Date ${occ.date}`, e);
            }
        });
        frontendActivity.completedOccurrences = newCompletedOccurrences;

        if (frontendActivity.recurrence?.type === 'none') {
            const mainOccurrenceDateKey = formatISO(new Date(frontendActivity.createdAt), { representation: 'date' });
            if (frontendActivity.completedOccurrences.hasOwnProperty(mainOccurrenceDateKey)) {
                frontendActivity.completed = frontendActivity.completedOccurrences[mainOccurrenceDateKey];
                frontendActivity.completedAt = frontendActivity.completed ? frontendActivity.createdAt : null;
            } else {
                frontendActivity.completed = false;
                frontendActivity.completedAt = null;
            }
        }

        frontendActivity.isSummary = false; 

        const setter =
          frontendActivity.appMode === "personal"
            ? setPersonalActivities
            : setWorkActivities;
        setter((prevActivities) => {
          const existingActivity = prevActivities.find(
            (act) => act.id === activityId
          );
          if (existingActivity) {
            return prevActivities.map((act) =>
              act.id === activityId
                ? { ...act, ...frontendActivity } 
                : act
            );
          }
          return [...prevActivities, frontendActivity];
        });
        return frontendActivity;
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.toLowerCase().includes("unauthorized") ||
            err.message.includes("401"))
        ) {
          logout(true); 
        } else {
          createApiErrorToast(
            err,
            toast,
            "toastActivityLoadErrorTitle",
            "loading",
            t,
            `/activities/${activityId} (details)`
          );
        }
        return null;
      }
    },
    [fetchWithAuth, appModeState, t, toast, logout]
  );


  const updateActivity = useCallback(
    async (
      activityId: number,
      updates: Partial<Omit<Activity, "id" | "todos" | "created_by_user_id" | "isSummary">>,
      originalActivityData?: Activity 
    ) => {
      setError(null);
      
      let currentActivityToUpdate = 
        (updates.appMode === 'personal' ? personalActivities : workActivities).find(a => a.id === activityId) ||
        (updates.appMode === 'work' ? workActivities : personalActivities).find(a => a.id === activityId);


      if (!currentActivityToUpdate || currentActivityToUpdate.isSummary) {
          console.log(`[AppProvider updateActivity] Activity ID ${activityId} is summary or not found, fetching full details before update.`);
          currentActivityToUpdate = await fetchAndSetSpecificActivityDetails(activityId);
          if (!currentActivityToUpdate) {
             console.error("[AppProvider updateActivity] Activity not found for update, even after attempting to fetch full details:", activityId);
              toast({ variant: "destructive", title: "Error", description: "Activity not found for update." });
              return;
          }
      }
      
      const effectiveAppMode = updates.appMode || currentActivityToUpdate.appMode;
      const payload = frontendToBackendActivityPayload(
        { ...currentActivityToUpdate, ...updates, appMode: effectiveAppMode },
        true
      ) as BackendActivityUpdatePayload;

      try {
        const response = await fetchWithAuth(`/activities/${activityId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(
            formatBackendError(
              errorData,
              `Failed to update activity: HTTP ${response.status}`
            )
          );
        }

        const updatedFullActivity = await fetchAndSetSpecificActivityDetails(activityId);
        if (!updatedFullActivity) {
            throw new Error(`Failed to fetch full details after update for activity ${activityId}`);
        }
        
        const originalForLog = originalActivityData || currentActivityToUpdate; 

        let changesSummary = t('detailsNotAvailable');
        if (originalForLog) {
            const oldCatName = allCategories.find(c => c.id === originalForLog.categoryId)?.name;
            const newCatName = allCategories.find(c => c.id === updatedFullActivity.categoryId)?.name;
            
            const oldDetails = {
                title: originalForLog.title,
                categoryName: oldCatName,
                date: originalForLog.createdAt,
                time: originalForLog.time,
                notes: originalForLog.notes,
                recurrence: JSON.stringify(originalForLog.recurrence),
            };
            const newDetails = {
                title: updatedFullActivity.title,
                categoryName: newCatName,
                date: updatedFullActivity.createdAt,
                time: updatedFullActivity.time,
                notes: updatedFullActivity.notes,
                recurrence: JSON.stringify(updatedFullActivity.recurrence),
            };

            changesSummary = generateChangeList(
                oldDetails,
                newDetails,
                {
                    title: { labelKey: 'titleLabel' },
                    categoryName: { labelKey: 'categoryLabel' },
                    date: { labelKey: 'dateLabel', formatter: (val) => val ? formatDateFns(new Date(val), "PP", { locale: dateFnsLocale }) : '' },
                    time: { labelKey: 'timeLabel' },
                    notes: { labelKey: 'notesLabel' },
                    recurrence: { labelKey: 'recurrenceLabelShort' },
                }
            ) || t('noDetailedChangesLogged');
        }

        const titleForLog = updatedFullActivity.title || t('unknownActivityTitle');
        const modeForLog = updatedFullActivity.appMode || 'personal';

        if (addHistoryLogEntryRef.current) {
            const details = {
                activityId: activityId,
                title: titleForLog,
                mode: modeForLog,
                changesSummary: changesSummary
            };
            addHistoryLogEntryRef.current("historyLogUpdateActivity", details, modeForLog);
        }
        
        toast({
            title: t("toastActivityUpdatedTitle"),
            description: t("toastActivityUpdatedDescription", { activityTitle: titleForLog }),
        });

      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.toLowerCase().includes("unauthorized") ||
            err.message.includes("401"))
        ) {
          logout();
        } else {
          createApiErrorToast(
            err,
            toast,
            "toastActivityUpdatedTitle",
            "updating",
            t,
            `/activities/${activityId}`
          );
        }
        setError((err as Error).message);
        throw err;
      }
    },
    [
      fetchWithAuth,
      personalActivities,
      workActivities,
      toast,
      t,
      logout,
      allCategories,
      dateFnsLocale,
      fetchAndSetSpecificActivityDetails,
      generateChangeList,
    ]
  );

  const deleteActivity = useCallback(
    async (activityId: number) => {
      setError(null);

      let activityToDelete = personalActivities.find(
        (a) => a.id === activityId
      );
      let setter = setPersonalActivities;

      if (!activityToDelete) {
        activityToDelete = workActivities.find((a) => a.id === activityId);
        setter = setWorkActivities;
      }

      if (!activityToDelete || activityToDelete.isSummary) { 
        const fetchedFullActivity = await fetchAndSetSpecificActivityDetails(activityId);
        if (!fetchedFullActivity) {
            console.error("[AppProvider] Activity not found for deletion, even after fetch:", activityId);
            toast({ variant: "destructive", title: "Error", description: "Activity not found for deletion."});
             if (addHistoryLogEntryRef.current && activityToDelete) { 
                const details = {
                    activityId: activityId,
                    title: activityToDelete.title || t('unknownActivityTitle'),
                    categoryName: t('uncategorized'),
                    date: formatDateFns(new Date(activityToDelete.createdAt), "PP", { locale: dateFnsLocale }),
                    time: activityToDelete.time || t('timeNotSet'),
                    mode: activityToDelete.appMode || t('unknownText'),
                };
                addHistoryLogEntryRef.current("historyLogDeleteActivity", details, activityToDelete.appMode || "account");
            }
            return;
        }
        activityToDelete = fetchedFullActivity; 
        setter = activityToDelete.appMode === 'personal' ? setPersonalActivities : setWorkActivities;
      }
      
      const titleForLog = activityToDelete.title || t('unknownActivityTitle');
      const categoryForLog = allCategories.find(c => c.id === activityToDelete!.categoryId);
      const dateForLog = formatDateFns(new Date(activityToDelete.createdAt), "PP", { locale: dateFnsLocale });
      const timeForLog = activityToDelete.time || t('timeNotSet');
      const modeForLog = activityToDelete.appMode || 'personal';

      try {
        const response = await fetchWithAuth(`/activities/${activityId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(
            formatBackendError(
              errorData,
              `Failed to delete activity: HTTP ${response.status}`
            )
          );
        }
        setter((prev) => prev.filter((act) => act.id !== activityId));
        toast({
          title: t("toastActivityDeletedTitle"),
          description: t("toastActivityDeletedDescription", {
            activityTitle: titleForLog,
          }),
        });

        if (addHistoryLogEntryRef.current) {
            const details = {
                activityId: activityId,
                title: titleForLog,
                categoryName: categoryForLog?.name || t('uncategorized'),
                date: dateForLog,
                time: timeForLog,
                mode: modeForLog,
            };
            addHistoryLogEntryRef.current("historyLogDeleteActivity", details, modeForLog);
        }
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.toLowerCase().includes("unauthorized") ||
            err.message.includes("401"))
        ) {
          logout();
        } else {
          createApiErrorToast(
            err,
            toast,
            "toastActivityDeletedTitle",
            "deleting",
            t,
            `/activities/${activityId}`
          );
        }
        setError((err as Error).message);
        throw err;
      }
    },
    [
      fetchWithAuth,
      personalActivities,
      workActivities,
      toast,
      t,
      logout,
      allCategories,
      dateFnsLocale,
      fetchAndSetSpecificActivityDetails,
    ]
  );

  const addTodoToActivity = useCallback(
    async (
      activityId: number,
      todoText: string,
      completed: boolean = false
    ): Promise<Todo | null> => {
      setError(null);
      const payload: BackendTodoCreate = {
        text: todoText,
        complete: completed,
      };
      try {
        const response = await fetchWithAuth(
          `/activities/${activityId}/todos`,
          { method: "POST", body: JSON.stringify(payload) }
        );
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(
            formatBackendError(
              errorData,
              `Failed to add todo: HTTP ${response.status}`
            )
          );
        }
        await fetchAndSetSpecificActivityDetails(activityId);
        return null; 
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.toLowerCase().includes("unauthorized") ||
            err.message.includes("401"))
        ) {
          logout();
        } else {
          createApiErrorToast(
            err,
            toast,
            "toastTodoAddedTitle",
            "adding",
            t,
            `/activities/${activityId}/todos`
          );
        }
        setError((err as Error).message);
        return null;
      }
    },
    [
      fetchWithAuth,
      toast,
      t,
      logout,
      fetchAndSetSpecificActivityDetails,
    ]
  );

  const updateTodoInActivity = useCallback(
    async (activityId: number, todoId: number, updates: Partial<Todo>) => {
      setError(null);
      const payload: Partial<BackendTodo> = {};
      if (updates.text !== undefined) payload.text = updates.text;
      if (updates.completed !== undefined) payload.complete = updates.completed;

      if (Object.keys(payload).length === 0) return;

      try {
        const response = await fetchWithAuth(`/todos/${todoId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(
            formatBackendError(
              errorData,
              `Failed to update todo: HTTP ${response.status}`
            )
          );
        }
        await fetchAndSetSpecificActivityDetails(activityId);
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.toLowerCase().includes("unauthorized") ||
            err.message.includes("401"))
        ) {
          logout();
        } else {
          createApiErrorToast(
            err,
            toast,
            "toastTodoUpdatedTitle",
            "updating",
            t,
            `/todos/${todoId}`
          );
        }
        setError((err as Error).message);
        throw err;
      }
    },
    [
      fetchWithAuth,
      t,
      toast,
      logout,
      fetchAndSetSpecificActivityDetails,
    ]
  );

  const deleteTodoFromActivity = useCallback(
    async (activityId: number, todoId: number) => {
      setError(null);
      try {
        const response = await fetchWithAuth(`/todos/${todoId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(
            formatBackendError(
              errorData,
              `Failed to delete todo: HTTP ${response.status}`
            )
          );
        }
        await fetchAndSetSpecificActivityDetails(activityId);
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.toLowerCase().includes("unauthorized") ||
            err.message.includes("401"))
        ) {
          logout();
        } else {
          createApiErrorToast(
            err,
            toast,
            "toastTodoDeletedTitle",
            "deleting",
            t,
            `/todos/${todoId}`
          );
        }
        setError((err as Error).message);
        throw err;
      }
    },
    [
      fetchWithAuth,
      toast,
      t,
      logout,
      fetchAndSetSpecificActivityDetails,
    ]
  );

  const toggleOccurrenceCompletion = useCallback(
    async (
      masterActivityId: number,
      occurrenceDateTimestamp: number,
      completedState: boolean
    ) => {
      let masterActivity =
        personalActivities.find((act) => act.id === masterActivityId) ||
        workActivities.find((act) => act.id === masterActivityId);
      
      let setter = personalActivities.find((act) => act.id === masterActivityId)
        ? setPersonalActivities
        : setWorkActivities;

      if (!masterActivity || masterActivity.isSummary) { 
        masterActivity = await fetchAndSetSpecificActivityDetails(masterActivityId);
      }

      if (!masterActivity) {
          console.error("[AppProvider] Master activity not found for toggling occurrence, even after fetch:", masterActivityId);
          if (addHistoryLogEntryRef.current) {
              const details = {
                  activityId: masterActivityId,
                  title: t('unknownActivityTitle'),
                  completed: completedState,
                  date: formatDateFns(new Date(occurrenceDateTimestamp), "PP", { locale: dateFnsLocale }),
                  time: t('timeNotSet'),
                  mode: t('unknownText'),
              };
              addHistoryLogEntryRef.current("historyLogToggleActivityCompletion", details, "account");
          }
          return;
      }
      setter = masterActivity.appMode === 'personal' ? setPersonalActivities : setWorkActivities;

      const titleForLog = masterActivity.title || t('unknownActivityTitle');
      const modeForLog = masterActivity.appMode;
      const timeForLog = masterActivity.time || t('timeNotSet');
      const dateForLog = formatDateFns(new Date(occurrenceDateTimestamp), "PP", { locale: dateFnsLocale });

      const occurrenceDateKey = formatISO(new Date(occurrenceDateTimestamp), {
        representation: "date",
      });
      const occurrenceDateTimeISO = new Date(
        occurrenceDateTimestamp
      ).toISOString();

      setter((prevActivities) =>
        prevActivities.map((act) =>
          act.id === masterActivityId
            ? {
                ...act,
                completedOccurrences: {
                  ...act.completedOccurrences,
                  [occurrenceDateKey]: completedState,
                },
                isSummary: false, 
                ...(act.recurrence?.type === 'none' && isSameDay(new Date(act.createdAt), new Date(occurrenceDateTimestamp)) && {
                    completed: completedState,
                    completedAt: completedState ? occurrenceDateTimestamp : null,
                })
              }
            : act
        )
      );

      try {
        const activityOccurrencesResponse = await fetchWithAuth(`/activities/${masterActivityId}/occurrences`);
        if (!activityOccurrencesResponse.ok) {
            throw new Error(`Failed to fetch occurrences for activity ${masterActivityId} before toggle. HTTP ${activityOccurrencesResponse.status}`);
        }
        const existingOccurrencesForActivity: BackendActivityOccurrenceResponse[] = await activityOccurrencesResponse.json();

        const targetDate = new Date(occurrenceDateTimestamp);
        const existingOccurrence = existingOccurrencesForActivity.find((occ) => {
            try { return isSameDay(parseISO(occ.date), targetDate); } catch { return false; }
        });


        let backendResponseOccurrence: BackendActivityOccurrenceResponse;

        if (existingOccurrence) {
          const updatePayload: BackendActivityOccurrenceUpdate = {
            complete: completedState,
          };
          const updateResponse = await fetchWithAuth(
            `/activity-occurrences/${existingOccurrence.id}`,
            {
              method: "PUT",
              body: JSON.stringify(updatePayload),
            }
          );
          if (!updateResponse.ok) {
            const errorData = await updateResponse
              .json()
              .catch(() => ({ detail: `HTTP ${updateResponse.status}` }));
            throw new Error(
              formatBackendError(
                errorData,
                `Failed to update occurrence ${existingOccurrence.id}`
              )
            );
          }
          backendResponseOccurrence = await updateResponse.json();
        } else {
          const createPayload: BackendActivityOccurrenceCreate = {
            activity_id: masterActivityId,
            date: occurrenceDateTimeISO,
            complete: completedState,
          };
          const createResponse = await fetchWithAuth(`/activity-occurrences`, {
            method: "POST",
            body: JSON.stringify(createPayload),
          });
          if (!createResponse.ok) {
            const errorData = await createResponse
              .json()
              .catch(() => ({ detail: `HTTP ${createResponse.status}` }));
            throw new Error(
              formatBackendError(errorData, `Failed to create new occurrence`)
            );
          }
          backendResponseOccurrence = await createResponse.json();
        }

        setter((prevActivities) =>
          prevActivities.map((act) =>
            act.id === masterActivityId
              ? {
                  ...act,
                  completedOccurrences: {
                    ...act.completedOccurrences,
                    [occurrenceDateKey]: backendResponseOccurrence.complete,
                  },
                  isSummary: false, 
                  ...(act.recurrence?.type === 'none' && isSameDay(new Date(act.createdAt), new Date(occurrenceDateTimestamp)) && {
                    completed: backendResponseOccurrence.complete,
                    completedAt: backendResponseOccurrence.complete ? occurrenceDateTimestamp : null,
                  })
                }
              : act
          )
        );

        if (addHistoryLogEntryRef.current) {
            const details = {
                activityId: masterActivityId,
                title: titleForLog,
                completed: completedState,
                date: dateForLog,
                time: timeForLog,
                mode: modeForLog,
            };
            addHistoryLogEntryRef.current("historyLogToggleActivityCompletion", details, modeForLog);
        }
      } catch (err) {
        console.error("Error toggling occurrence completion:", err);
        setter((prevActivities) =>
          prevActivities.map((act) =>
            act.id === masterActivityId
              ? {
                  ...act,
                  completedOccurrences: {
                    ...act.completedOccurrences,
                    [occurrenceDateKey]: !completedState, 
                  },
                   ...(act.recurrence?.type === 'none' && isSameDay(new Date(act.createdAt), new Date(occurrenceDateTimestamp)) && {
                    completed: !completedState,
                    completedAt: !completedState ? occurrenceDateTimestamp : null,
                  })
                }
              : act
          )
        );
        if (
          err instanceof Error &&
          (err.message.toLowerCase().includes("unauthorized") ||
            err.message.includes("401"))
        ) {
          logout(true);
        } else {
          createApiErrorToast(
            err,
            toast,
            "toastActivityUpdatedTitle",
            "updating",
            t,
            `/activity-occurrences or /activities/${masterActivityId}/occurrences`
          );
        }
      }
    },
    [
      fetchWithAuth,
      personalActivities,
      workActivities,
      dateFnsLocale,
      t,
      toast,
      logout,
      fetchAndSetSpecificActivityDetails,
    ]
  );


  const addHabit = useCallback(
    async (habitData: HabitCreateData) => {
      setError(null);
      const payload: HabitCreateData = {
        name: habitData.name,
        icon_name: habitData.icon_name,
        slots: habitData.slots.map(s => ({
            name: s.name,
            default_time: s.default_time || undefined,
        })),
      };
      try {
        const response = await fetchWithAuth(`/habits`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(
            formatBackendError(
              errorData,
              `Failed to add habit: HTTP ${response.status}`
            )
          );
        }
        const newBackendHabit: BackendHabit = await response.json();
        const newFrontendHabit = backendToFrontendHabit(newBackendHabit);
        setHabits((prev) => [...prev, newFrontendHabit]);

        const nameForLog = newFrontendHabit.name || t('unknownHabit');
        toast({
          title: t("toastHabitAddedTitle"),
          description: t("toastHabitAddedDescription", {
            habitName: nameForLog,
          }),
        });

        if (addHistoryLogEntryRef.current) {
            const details = { name: nameForLog };
            addHistoryLogEntryRef.current("historyLogAddHabit", details, "habit");
        }
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.toLowerCase().includes("unauthorized") ||
            err.message.includes("401"))
        ) {
          logout();
        } else {
          createApiErrorToast(
            err,
            toast,
            "toastHabitAddedTitle",
            "adding",
            t,
            `/habits`
          );
        }
        setError((err as Error).message);
        throw err;
      }
    },
    [fetchWithAuth, toast, t, logout]
  );

  const updateHabit = useCallback(
    async (habitId: number, habitData: HabitUpdateData) => {
      setError(null);
      const originalHabit = habits.find((h) => h.id === habitId);

      const slotsPayload: HabitSlotCreateData[] = (habitData.slots || []).map(s_form => {
        const slot_payload: HabitSlotCreateData = {
            name: s_form.name,
            default_time: s_form.default_time || undefined,
        };
        if (typeof s_form.id === 'number') {
            slot_payload.id = s_form.id;
        }
        return slot_payload;
      });

      const payloadForBackend: HabitUpdateData = {
        name: habitData.name,
        icon_name: habitData.icon_name,
        slots: slotsPayload,
      };

      try {
        const response = await fetchWithAuth(`/habits/${habitId}`, {
          method: "PUT",
          body: JSON.stringify(payloadForBackend),
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(
            formatBackendError(
              errorData,
              `Failed to update habit: HTTP ${response.status}`
            )
          );
        }
        const updatedBackendHabit: BackendHabit = await response.json();
        const updatedFrontendHabit =
          backendToFrontendHabit(updatedBackendHabit);
        setHabits((prev) =>
          prev.map((h) => (h.id === habitId ? updatedFrontendHabit : h))
        );
        
        const nameForLog = updatedFrontendHabit.name || t('unknownHabit');
        toast({
          title: t("toastHabitUpdatedTitle"),
          description: t("toastHabitUpdatedDescription", {
            habitName: nameForLog,
          }),
        });

        let changesSummary = t('detailsNotAvailable');
        if (originalHabit) {
            changesSummary = generateChangeList(
                { name: originalHabit.name, iconName: originalHabit.iconName },
                { name: updatedFrontendHabit.name, iconName: updatedFrontendHabit.iconName },
                { name: { labelKey: 'habitNameLabel' }, iconName: { labelKey: 'habitIconNameLabel' } }
            ) || t('noDetailedChangesLogged');
        }
        
        if (addHistoryLogEntryRef.current) {
            const details = {
                habitId: habitId,
                name: nameForLog, 
                changesSummary
            };
            addHistoryLogEntryRef.current("historyLogUpdateHabit", details, "habit");
        }
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.toLowerCase().includes("unauthorized") ||
            err.message.includes("401"))
        ) {
          logout();
        } else {
          createApiErrorToast(
            err,
            toast,
            "toastHabitUpdatedTitle",
            "updating",
            t,
            `/habits/${habitId}`
          );
        }
        setError((err as Error).message);
        throw err;
      }
    },
    [fetchWithAuth, habits, toast, t, logout, generateChangeList]
  );

  const deleteHabit = useCallback(
    async (habitId: number) => {
      setError(null);
      const habitToDelete = habits.find((h) => h.id === habitId);
      if (!habitToDelete) return;
      
      const nameForLog = habitToDelete.name || t('unknownHabit');

      try {
        const response = await fetchWithAuth(`/habits/${habitId}`, {
          method: "DELETE",
        });
        if (!response.ok && response.status !== 204) { 
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(
            formatBackendError(
              errorData,
              `Failed to delete habit: HTTP ${response.status}`
            )
          );
        }
        setHabits((prev) => prev.filter((h) => h.id !== habitId));
        setHabitCompletions((prev) => {
          const newCompletions = { ...prev };
          delete newCompletions[habitId];
          return newCompletions;
        });

        toast({
          title: t("toastHabitDeletedTitle"),
          description: t("toastHabitDeletedDescription", {
            habitName: nameForLog,
          }),
        });
        if (addHistoryLogEntryRef.current) {
          const details = { name: nameForLog };
          addHistoryLogEntryRef.current("historyLogDeleteHabit", details, "habit");
        }
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.toLowerCase().includes("unauthorized") ||
            err.message.includes("401"))
        ) {
          logout();
        } else {
          createApiErrorToast(
            err,
            toast,
            "toastHabitDeletedTitle",
            "deleting",
            t,
            `/habits/${habitId}`
          );
        }
        setError((err as Error).message);
        throw err;
      }
    },
    [fetchWithAuth, habits, toast, t, logout]
  );

  const toggleHabitSlotCompletion = useCallback(
    async (
      habitId: number,
      slotId: number,
      dateKey: string, 
      currentStatus: HabitSlotCompletionStatus | undefined
    ) => {
      setError(null);
      const newCompletedState = !currentStatus?.completed;
      const habit = habits.find((h) => h.id === habitId);
      const slot = habit?.slots.find((s) => s.id === slotId);
      
      const habitNameForLog = habit?.name || t('unknownHabit');
      const slotNameForLog = slot?.name || t('unknownSlot');
      const dateForLog = dateKey ? formatDateFns(parseISO(dateKey), "PP", { locale: dateFnsLocale }) : t('unknownDate');


      try {
        let backendResponse: BackendHabitCompletion;
        if (currentStatus?.completionId) {
          const payload: BackendHabitCompletionUpdatePayload = {
            is_completed: newCompletedState,
          };
          const response = await fetchWithAuth(
            `/habit_completions/${currentStatus.completionId}`,
            {
              method: "PUT",
              body: JSON.stringify(payload),
            }
          );
          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ detail: response.statusText }));
            throw new Error(
              formatBackendError(
                errorData,
                `Failed to update habit completion: HTTP ${response.status}`
              )
            );
          }
          backendResponse = await response.json();
        } else {
          const payload: BackendHabitCompletionCreatePayload = {
            habit_id: habitId,
            slot_id: slotId,
            completion_date: parseISO(dateKey).toISOString(), 
            is_completed: newCompletedState,
          };
          const response = await fetchWithAuth(`/habit_completions`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ detail: `HTTP ${response.status}` }));
            throw new Error(
              formatBackendError(errorData, `Failed to create new habit completion`)
            );
          }
          backendResponse = await response.json();
        }

        setHabitCompletions((prev) => {
          const updatedCompletions = JSON.parse(JSON.stringify(prev)); 
          if (!updatedCompletions[habitId]) updatedCompletions[habitId] = {};
          if (!updatedCompletions[habitId][dateKey])
            updatedCompletions[habitId][dateKey] = {};
          updatedCompletions[habitId][dateKey][slotId] = {
            completed: backendResponse.is_completed,
            completionId: backendResponse.id,
          };
          return updatedCompletions;
        });

        if (addHistoryLogEntryRef.current) {
            const details = {
                habitName: habitNameForLog,
                slotName: slotNameForLog,
                date: dateForLog,
                completed: newCompletedState,
            };
            addHistoryLogEntryRef.current("historyLogToggleHabitCompletion", details, "habit");
        }
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.toLowerCase().includes("unauthorized") ||
            err.message.includes("401"))
        ) {
          logout();
        } else {
          createApiErrorToast(
            err,
            toast,
            "toastHabitUpdatedTitle", 
            "updating",
            t,
            `/habit_completions` 
          );
        }
        setError((err as Error).message);
      }
    },
    [fetchWithAuth, habits, toast, t, logout, dateFnsLocale]
  );


  const getHabitById = useCallback(
    (habitId: number) => habits.find((h) => h.id === habitId),
    [habits]
  );

  const getCategoryById = useCallback(
    (categoryId: number) => allCategories.find((cat) => cat.id === categoryId),
    [allCategories]
  );
  const getAssigneeById = useCallback(
    (assigneeId: number) => assignees.find((asg) => asg.id === assigneeId),
    [assignees]
  );

  const markUINotificationAsRead = useCallback(
    (notificationId: string) =>
      setUINotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      ),
    []
  );
  const markAllUINotificationsAsRead = useCallback(
    () => setUINotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
    []
  );
  const clearAllUINotifications = useCallback(() => setUINotifications([]), []);
  const unlockApp = useCallback(
    (pinAttempt: string): boolean => {
      if (appPinState && pinAttempt === appPinState) {
        setIsAppLocked(false);
        return true;
      }
      return false;
    },
    [appPinState]
  );
  const setAppPin = useCallback((pin: string | null) => {
    setAppPinState(pin);
    if (typeof window !== "undefined") {
      if (pin) localStorage.setItem(LOCAL_STORAGE_KEY_APP_PIN, pin);
      else {
        localStorage.removeItem(LOCAL_STORAGE_KEY_APP_PIN);
        setIsAppLocked(false);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || isLoadingState) return;
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        accessTokenRef.current &&
        appPinState
      )
        setIsAppLocked(true);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [appPinState, isLoadingState]);

  const combinedIsLoading =
    isLoadingState ||
    isActivitiesLoading ||
    isCategoriesLoading ||
    isAssigneesLoading ||
    (accessTokenRef.current && (isHistoryLoading || isHabitsLoading));

  const contextValue = useMemo(
    () => ({
      activities: getRawActivities(),
      getRawActivities,
      categories: filteredCategories,
      assignees: assigneesForContext,
      appMode: appModeState,
      setAppMode,
      addActivity,
      updateActivity,
      deleteActivity,
      toggleOccurrenceCompletion,
      addTodoToActivity,
      updateTodoInActivity,
      deleteTodoFromActivity,
      getCategoryById,
      addCategory,
      updateCategory,
      deleteCategory,
      addAssignee,
      updateAssignee,
      deleteAssignee,
      getAssigneeById,
      isLoading: combinedIsLoading,
      error,
      isAuthenticated: !!accessTokenRef.current,
      login,
      logout,
      changePassword,
      getCurrentUserId,
      uiNotifications,
      addUINotification: stableAddUINotification,
      markUINotificationAsRead,
      markAllUINotificationsAsRead,
      clearAllUINotifications,
      historyLog,
      addHistoryLogEntry: addHistoryLogEntryRef.current || (async () => {}),
      systemNotificationPermission,
      requestSystemNotificationPermission,
      isAppLocked,
      appPinState,
      unlockApp,
      setAppPin,
      fetchAndSetSpecificActivityDetails,
      habits,
      habitCompletions,
      addHabit,
      updateHabit,
      deleteHabit,
      toggleHabitSlotCompletion,
      getHabitById,
      selectedTimezone,
      setSelectedTimezone,
    }),
    [
      getRawActivities,
      filteredCategories,
      assigneesForContext,
      appModeState,
      setAppMode,
      addActivity,
      updateActivity,
      deleteActivity,
      toggleOccurrenceCompletion,
      addTodoToActivity,
      updateTodoInActivity,
      deleteTodoFromActivity,
      getCategoryById,
      addCategory,
      updateCategory,
      deleteCategory,
      addAssignee,
      updateAssignee,
      deleteAssignee,
      getAssigneeById,
      combinedIsLoading,
      error,

      login,
      logout,
      changePassword,
      getCurrentUserId,
      uiNotifications,
      stableAddUINotification,
      markUINotificationAsRead,
      markAllUINotificationsAsRead,
      clearAllUINotifications,
      historyLog,
      systemNotificationPermission,
      requestSystemNotificationPermission,
      isAppLocked,
      appPinState,
      unlockApp,
      setAppPin,
      fetchAndSetSpecificActivityDetails,
      habits,
      habitCompletions,
      addHabit,
      updateHabit,
      deleteHabit,
      toggleHabitSlotCompletion,
      getHabitById,
      selectedTimezone,
      setSelectedTimezone,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};
