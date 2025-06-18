
import type { LucideIcon } from 'lucide-react';

// --- JWT ---
export interface Token {
  access_token: string;
  // refresh_token: string; // Not handled client-side if HttpOnly
  token_type: string;
  user_id: number;
  username: string;
  is_admin: boolean;
}

export interface DecodedToken {
  sub: string;
  exp: number;
  userId?: number;
  username?: string;
  isAdmin?: boolean;
}

// --- Backend Enums (mirroring FastAPI) ---
export type BackendCategoryMode = "personal" | "work" | "both";
export type BackendRepeatMode = "none" | "daily" | "weekly" | "monthly";

// --- Frontend Enums ---
export type AppMode = 'personal' | 'work';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

// --- TODO ---
export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export interface BackendTodoCreate {
  text: string;
  complete?: boolean;
}

export interface BackendTodo {
  id: number;
  text: string;
  complete: boolean;
  activity_id: number;
}

// --- RECURRENCE (Frontend) ---
export interface RecurrenceRule {
  type: RecurrenceType;
  endDate?: number | null; // Timestamp
  daysOfWeek?: number[];
  dayOfMonth?: number;
}

// --- ACTIVITY OCCURRENCE ---
// This is the response from GET /activity-occurrences and GET /activities/{id}/occurrences
export interface BackendActivityOccurrenceResponse {
  id: number;
  activity_id: number;
  date: string; // ISO datetime string from backend
  complete: boolean;
  activity_title?: string; // Provided by backend
}

export interface BackendActivityOccurrenceCreate {
  activity_id: number;
  date: string; // ISO datetime string to send to backend
  complete?: boolean;
}

export interface BackendActivityOccurrenceUpdate {
  date?: string; // ISO datetime string
  complete?: boolean;
}


// --- ACTIVITY ---
// This is the primary frontend representation of an activity
export interface Activity {
  id: number;
  title: string;
  categoryId: number;
  todos: Todo[]; // Populated by a separate call to /activities/{id}/todos
  createdAt: number; // Derived from backend start_date
  time?: string;
  completed?: boolean; // For non-recurring, based on its single occurrence
  completedAt?: number | null; // For non-recurring
  notes?: string;
  recurrence?: RecurrenceRule | null;
  completedOccurrences: Record<string, boolean>; // Populated by /activities/{id}/occurrences or global /activity-occurrences
  isRecurringInstance?: boolean; // Client-side flag for calendar instances
  originalInstanceDate?: number; // Client-side flag for calendar instances
  masterActivityId?: number; // Client-side flag for calendar instances
  responsiblePersonIds?: number[]; // From backend responsible_ids
  appMode: AppMode;
  created_by_user_id?: number; // From backend
  isSummary?: boolean; // Flag to indicate if this is a summary or full detail
}

// This is the response from GET /activities (list) and GET /activities/{id} (single)
export interface BackendActivityResponse {
  id: number;
  title: string;
  start_date: string; // ISO datetime string
  time: string;
  category_id: number;
  repeat_mode: BackendRepeatMode;
  end_date?: string | null; // ISO datetime string
  days_of_week?: string | null; // Comma-separated string of day names
  day_of_month?: number | null;
  notes?: string | null;
  mode: BackendCategoryMode;
  responsible_ids: number[];
  created_by_user_id: number;
  // This response type DOES NOT contain todos or full occurrence details directly.
}

// This type represents the response from GET /activities/{id}/todos
export type BackendActivityTodosResponse = BackendTodo[];

// This type represents the response from GET /activities/{id}/occurrences
export type BackendActivityOccurrencesListResponse = BackendActivityOccurrenceResponse[];


export interface BackendActivityCreatePayload {
  title: string;
  start_date: string; // ISO datetime string
  time: string;
  category_id: number;
  repeat_mode?: BackendRepeatMode;
  end_date?: string | null; // ISO datetime string
  days_of_week?: string[] | null; // List of day name strings
  day_of_month?: number | null;
  notes?: string | null;
  mode: BackendCategoryMode;
  responsible_ids?: number[];
  todos?: BackendTodoCreate[];
}

export interface BackendActivityUpdatePayload {
  title?: string;
  start_date?: string; // ISO datetime string
  time?: string;
  category_id?: number;
  repeat_mode?: BackendRepeatMode;
  end_date?: string | null; // ISO datetime string
  days_of_week?: string[] | null; // List of day name strings
  day_of_month?: number | null;
  notes?: string | null;
  mode?: BackendCategoryMode;
  responsible_ids?: number[];
  // Note: Todos are not updated via this payload as per backend spec
}

// --- CATEGORY ---
export interface Category {
  id: number;
  name: string;
  icon: LucideIcon;
  iconName: string;
  mode: AppMode | 'all';
}

export interface BackendCategoryCreatePayload {
  name: string;
  icon_name: string;
  mode: BackendCategoryMode;
}

export interface BackendCategoryUpdatePayload {
    name?: string;
    icon_name?: string;
    mode?: BackendCategoryMode;
}

export interface BackendCategory {
  id: number;
  name: string;
  icon_name: string;
  mode: BackendCategoryMode;
}

// --- ASSIGNEE (User on Backend) ---
export interface Assignee {
  id: number;
  name: string;
  username?: string;
  isAdmin?: boolean;
}

export interface BackendUserCreatePayload {
  name: string;
  username: string;
  password?: string;
  is_admin?: boolean;
}

export interface BackendUserUpdatePayload {
  name?: string;
  username?: string;
  password?: string;
  is_admin?: boolean;
}

export interface BackendUser {
  id: number;
  name: string;
  username: string;
  is_admin: boolean;
}

// --- CHANGE PASSWORD ---
export interface ChangePasswordRequest {
    old_password: string;
    new_password: string;
}


// --- UI NOTIFICATION (Client-side) ---
export interface UINotification {
  id: string;
  title: string;
  description: string;
  timestamp: number;
  read: boolean;
  activityId?: number | string;
  instanceDate?: number;
}

// --- HISTORY ---
export type HistoryLogActionKey =
  | 'historyLogLogin'
  | 'historyLogLogout'
  | 'historyLogAddActivity'
  | 'historyLogUpdateActivity'
  | 'historyLogDeleteActivity'
  | 'historyLogToggleActivityCompletion'
  | 'historyLogAddCategory'
  | 'historyLogUpdateCategory'
  | 'historyLogDeleteCategory'
  | 'historyLogSwitchMode'
  | 'historyLogPasswordChangeAttempt'
  | 'historyLogAddAssignee'
  | 'historyLogUpdateAssignee'
  | 'historyLogDeleteAssignee'
  | 'historyLogAddHabit'
  | 'historyLogUpdateHabit'
  | 'historyLogDeleteHabit'
  | 'historyLogToggleHabitCompletion';

export interface HistoryLogEntry {
  id: number;
  timestamp: number;
  actionKey: HistoryLogActionKey;
  details?: Record<string, string | number | boolean | undefined | null>;
  scope: 'account' | 'personal' | 'work' | 'category' | 'assignee' | 'habit';
  backendAction?: string;
  backendUserId?: number;
}

export interface BackendHistoryCreatePayload {
    action: string;
    user_id: number;
}

export interface BackendHistory {
  id: number;
  timestamp: string; // ISO datetime string
  action: string;
  user_id: number;
  user?: BackendUser;
}

// --- HABITS ---
export interface HabitSlot {
  id: number; // Matches backend ID
  name: string;
  default_time?: string; // HH:MM format
  order?: number;
}

export interface Habit {
  id: number; // Matches backend ID
  user_id?: number;
  name: string;
  iconName: string;
  icon: LucideIcon;
  slots: HabitSlot[];
  createdAt: number; // Timestamp of habit creation
}

export interface HabitSlotCreateData {
  id?: number;
  name: string;
  default_time?: string;
  order?: number;
}
export interface HabitCreateData {
  name: string;
  icon_name: string;
  slots: Omit<HabitSlotCreateData, 'id' | 'order'>[]; // Order handled by backend
}

export interface HabitUpdateData {
  name?: string;
  icon_name?: string;
  slots?: HabitSlotCreateData[]; // Include ID for existing slots
}

export interface BackendHabitSlot {
  id: number;
  name: string;
  default_time?: string;
  order: number;
}
export interface BackendHabit {
  id: number;
  user_id: number;
  name: string;
  icon_name: string;
  created_at: string; // ISO datetime string from backend
  slots: BackendHabitSlot[];
}


export interface HabitSlotCompletionStatus {
  completed: boolean;
  completionId?: number; // Backend ID of the HabitCompletion record
}

export type HabitCompletions = Record<number, Record<string, Record<number, HabitSlotCompletionStatus>>>;


export interface BackendHabitCompletionCreatePayload {
    habit_id: number;
    slot_id: number;
    completion_date: string; // ISO datetime string
    is_completed: boolean;
}

export interface BackendHabitCompletionUpdatePayload {
    is_completed: boolean;
}

export interface BackendHabitCompletion {
    id: number;
    habit_id: number;
    slot_id: number;
    completion_date: string; // ISO datetime string
    is_completed: boolean;
}


// --- TRANSLATIONS ---
export type { Translations } from '@/lib/translations';

// --- AppContextType additions ---
export interface AppContextType {
  activities: Activity[];
  getRawActivities: () => Activity[];
  categories: Category[];
  assignees: Assignee[];
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  addActivity: (
    activityData: Omit<Activity, 'id' | 'todos' | 'createdAt' | 'completed' | 'completedAt' | 'notes' | 'recurrence' | 'completedOccurrences' | 'responsiblePersonIds' | 'categoryId'| 'appMode'| 'masterActivityId' | 'isRecurringInstance' | 'originalInstanceDate' | 'created_by_user_id' | 'isSummary'> & {
      todos?: Omit<Todo, 'id'>[]; time?: string; notes?: string; recurrence?: RecurrenceRule | null; responsiblePersonIds?: number[]; categoryId: number; appMode: AppMode;
    }, customCreatedAt?: number
  ) => Promise<void>;
  updateActivity: (activityId: number, updates: Partial<Omit<Activity, 'id' | 'todos' | 'created_by_user_id' | 'isSummary'>>, originalActivity?: Activity) => Promise<void>;
  deleteActivity: (activityId: number) => Promise<void>;
  toggleOccurrenceCompletion: (masterActivityId: number, occurrenceDateTimestamp: number, completedState: boolean) => Promise<void>;
  addTodoToActivity: (activityId: number, todoText: string, completed?: boolean) => Promise<Todo | null>;
  updateTodoInActivity: (activityId: number, todoId: number, updates: Partial<Todo>) => Promise<void>;
  deleteTodoFromActivity: (activityId: number, todoId: number) => Promise<void>;
  getCategoryById: (categoryId: number) => Category | undefined;
  addCategory: (name: string, iconName: string, mode: AppMode | 'all') => Promise<void>;
  updateCategory: (categoryId: number, updates: Partial<Omit<Category, 'id' | 'icon'>>, oldCategoryData?: Category) => Promise<void>;
  deleteCategory: (categoryId: number) => Promise<void>;
  addAssignee: (name: string, username: string, password?: string, isAdmin?: boolean) => Promise<void>;
  updateAssignee: (assigneeId: number, updates: Partial<Pick<Assignee, 'name' | 'username' | 'isAdmin'>>, newPassword?: string) => Promise<void>;
  deleteAssignee: (assigneeId: number) => Promise<void>;
  getAssigneeById: (assigneeId: number) => Assignee | undefined;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: (isTokenRefreshFailure?: boolean) => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  getCurrentUserId: () => number | null;
  uiNotifications: UINotification[];
  addUINotification: (data: Omit<UINotification, 'id' | 'timestamp' | 'read'>) => void;
  markUINotificationAsRead: (notificationId: string) => void;
  markAllUINotificationsAsRead: () => void;
  clearAllUINotifications: () => void;
  historyLog: HistoryLogEntry[];
  addHistoryLogEntry: (actionKey: HistoryLogActionKey, details?: Record<string, string | number | boolean | undefined | null>, scope?: HistoryLogEntry['scope']) => Promise<void>;
  systemNotificationPermission: NotificationPermission | null;
  requestSystemNotificationPermission: () => Promise<void>;
  isAppLocked: boolean;
  appPinState: string | null;
  unlockApp: (pinAttempt: string) => boolean;
  setAppPin: (pin: string | null) => void;
  fetchAndSetSpecificActivityDetails: (activityId: number) => Promise<Activity | null>;

  habits: Habit[];
  habitCompletions: HabitCompletions;
  addHabit: (habitData: HabitCreateData) => Promise<void>;
  updateHabit: (habitId: number, habitData: HabitUpdateData) => Promise<void>;
  deleteHabit: (habitId: number) => Promise<void>;
  toggleHabitSlotCompletion: (habitId: number, slotId: number, dateKey: string, currentStatus: HabitSlotCompletionStatus | undefined) => Promise<void>;
  getHabitById: (habitId: number) => Habit | undefined;
}

    