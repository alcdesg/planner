/**
 * @file store.js
 * Central reactive application state manager.
 * Supports Activities, Habits (weekly/monthly), and Meal Planning.
 */

import { generateId, DateUtils, RECURRENCE_TYPES, ACTIVITY_STATUS } from '../domain/models.js';
import { HabitUtils } from '../domain/habitsModel.js';
import { MealUtils } from '../domain/mealPlanModel.js';
import { StorageService } from '../storage/storage.js';

class AppStore {
  constructor() {
    this.listeners = [];

    // 1. Users
    this.users = StorageService.getUsers();
    let activeId = StorageService.getActiveUserId();
    if (!this.users.find(u => u.id === activeId)) {
      activeId = this.users[0]?.id || 'usr_default';
      StorageService.setActiveUserId(activeId);
    }
    this.activeUserId = activeId;

    // 2. Navigation state
    const today = new Date();
    this.currentMonday = DateUtils.getMondayOfWeek(today);
    this.todayDate = today;
    this.viewMode = 'week'; // 'week' | 'today' | 'habits' | 'meals'

    // Habit view mode ('week' | 'month')
    this.habitViewMode = 'week';
    this.habitMonthDate = new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0);

    // Initial mobile active day
    const currentDayOfWeek = today.getDay();
    this.activeMobileDayIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

    // 3. User settings & Theme
    const userSettings = StorageService.getUserSettings(this.activeUserId);
    this.theme = userSettings.theme || 'system';

    // 4. Data
    this.activities = StorageService.getActivities(this.activeUserId);
    this.habits = StorageService.getHabits(this.activeUserId);
    this.meals = StorageService.getMeals(this.activeUserId);

    this.applyTheme(this.theme);
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this.getState()));
  }

  getState() {
    const activeUser = this.users.find(u => u.id === this.activeUserId) || this.users[0];
    const weekDays = DateUtils.getWeekDays(this.currentMonday);

    return {
      users: this.users,
      activeUser,
      activeUserId: this.activeUserId,
      currentMonday: this.currentMonday,
      todayDate: this.todayDate,
      weekDays,
      viewMode: this.viewMode,
      habitViewMode: this.habitViewMode,
      habitMonthDate: this.habitMonthDate,
      theme: this.theme,
      activities: this.activities,
      habits: this.habits,
      meals: this.meals,
      activeMobileDayIndex: this.activeMobileDayIndex
    };
  }

  /* ------------------------------------------------------------------------
     User Management Actions
     ------------------------------------------------------------------------ */
  switchUser(userId) {
    if (userId === this.activeUserId) return;
    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    this.activeUserId = userId;
    StorageService.setActiveUserId(userId);

    this.activities = StorageService.getActivities(userId);
    this.habits = StorageService.getHabits(userId);
    this.meals = StorageService.getMeals(userId);

    const settings = StorageService.getUserSettings(userId);
    this.theme = settings.theme || 'system';
    this.applyTheme(this.theme);

    this.notify();
  }

  addUser(name) {
    if (!name || !name.trim()) return;
    const trimmedName = name.trim();
    const newUser = {
      id: 'usr_' + generateId(),
      name: trimmedName,
      avatarInitial: trimmedName.charAt(0).toUpperCase()
    };

    this.users.push(newUser);
    StorageService.saveUsers(this.users);
    this.switchUser(newUser.id);
  }

  clearAllActivities(userId = null) {
    const targetUserId = userId || this.activeUserId;
    this.activities = [];
    StorageService.saveActivities(targetUserId, []);
    this.notify();
  }

  /* ------------------------------------------------------------------------
     Theme Actions
     ------------------------------------------------------------------------ */
  setTheme(theme) {
    this.theme = theme;
    StorageService.saveUserSettings(this.activeUserId, { theme });
    this.applyTheme(theme);
    this.notify();
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  /* ------------------------------------------------------------------------
     Navigation Actions
     ------------------------------------------------------------------------ */
  nextWeek() {
    const next = new Date(this.currentMonday);
    next.setDate(next.getDate() + 7);
    this.currentMonday = next;
    this.notify();
  }

  prevWeek() {
    const prev = new Date(this.currentMonday);
    prev.setDate(prev.getDate() - 7);
    this.currentMonday = prev;
    this.notify();
  }

  goToToday() {
    const today = new Date();
    this.currentMonday = DateUtils.getMondayOfWeek(today);
    const currentDayOfWeek = today.getDay();
    this.activeMobileDayIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    this.habitMonthDate = new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0);
    this.notify();
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.notify();
  }

  setMobileDayIndex(index) {
    this.activeMobileDayIndex = index;
    this.notify();
  }

  /* ------------------------------------------------------------------------
     Activity Actions
     ------------------------------------------------------------------------ */
  addActivity(data) {
    const newActivity = {
      id: generateId(),
      userId: this.activeUserId,
      title: data.title.trim(),
      date: data.date,
      time: data.time || '',
      category: data.category || 'outros',
      status: ACTIVITY_STATUS.PENDING,
      recurrence: data.recurrence || RECURRENCE_TYPES.NONE,
      recurrenceDays: data.recurrenceDays || [],
      recurrenceEndDate: data.recurrenceEndDate || '',
      completedDates: [],
      overrides: {},
      deletedDates: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.activities = [...this.activities, newActivity];
    StorageService.saveActivities(this.activeUserId, this.activities);
    this.notify();
    return newActivity;
  }

  updateActivity(id, data, scope = 'all', occurrenceDate = null) {
    this.activities = this.activities.map(act => {
      if (act.id !== id) return act;

      if (scope === 'this' && occurrenceDate && act.recurrence && act.recurrence !== RECURRENCE_TYPES.NONE) {
        const overrides = act.overrides || {};
        overrides[occurrenceDate] = {
          title: (data.title || act.title).trim(),
          time: data.time !== undefined ? data.time : act.time,
          category: data.category || act.category
        };

        return {
          ...act,
          overrides: { ...overrides },
          updatedAt: new Date().toISOString()
        };
      }

      return {
        ...act,
        ...data,
        title: (data.title || act.title).trim(),
        updatedAt: new Date().toISOString()
      };
    });

    StorageService.saveActivities(this.activeUserId, this.activities);
    this.notify();
  }

  deleteActivity(id, scope = 'all', occurrenceDate = null) {
    if (scope === 'this' && occurrenceDate) {
      this.activities = this.activities.map(act => {
        if (act.id !== id) return act;

        if (act.recurrence && act.recurrence !== RECURRENCE_TYPES.NONE) {
          const deletedDates = new Set(act.deletedDates || []);
          deletedDates.add(occurrenceDate);
          return {
            ...act,
            deletedDates: Array.from(deletedDates),
            updatedAt: new Date().toISOString()
          };
        }
        return act;
      }).filter(act => {
        return act.recurrence && act.recurrence !== RECURRENCE_TYPES.NONE ? true : act.id !== id;
      });
    } else {
      this.activities = this.activities.filter(act => act.id !== id);
    }

    StorageService.saveActivities(this.activeUserId, this.activities);
    this.notify();
  }

  toggleActivityCompletion(id, occurrenceDate) {
    this.activities = this.activities.map(act => {
      if (act.id !== id) return act;

      if (act.recurrence && act.recurrence !== RECURRENCE_TYPES.NONE) {
        const completedDates = new Set(act.completedDates || []);
        if (completedDates.has(occurrenceDate)) {
          completedDates.delete(occurrenceDate);
        } else {
          completedDates.add(occurrenceDate);
        }
        return {
          ...act,
          completedDates: Array.from(completedDates),
          updatedAt: new Date().toISOString()
        };
      }

      const nextStatus = act.status === ACTIVITY_STATUS.COMPLETED
        ? ACTIVITY_STATUS.PENDING
        : ACTIVITY_STATUS.COMPLETED;

      return {
        ...act,
        status: nextStatus,
        updatedAt: new Date().toISOString()
      };
    });

    StorageService.saveActivities(this.activeUserId, this.activities);
    this.notify();
  }

  /* ------------------------------------------------------------------------
     Habit Actions (Weekly & Monthly)
     ------------------------------------------------------------------------ */
  setHabitViewMode(mode) {
    this.habitViewMode = mode;
    this.notify();
  }

  nextHabitMonth() {
    const d = new Date(this.habitMonthDate);
    d.setMonth(d.getMonth() + 1);
    this.habitMonthDate = d;
    this.notify();
  }

  prevHabitMonth() {
    const d = new Date(this.habitMonthDate);
    d.setMonth(d.getMonth() - 1);
    this.habitMonthDate = d;
    this.notify();
  }

  addHabit(data) {
    const newHabit = HabitUtils.createHabit(
      this.activeUserId,
      data.name,
      data.icon,
      data.targetDays || 7
    );
    this.habits = [...this.habits, newHabit];
    StorageService.saveHabits(this.activeUserId, this.habits);
    this.notify();
    return newHabit;
  }

  updateHabit(id, data) {
    this.habits = this.habits.map(h => {
      if (h.id === id) {
        return {
          ...h,
          name: (data.name || h.name).trim(),
          icon: data.icon || h.icon,
          targetDays: data.targetDays !== undefined ? data.targetDays : h.targetDays
        };
      }
      return h;
    });
    StorageService.saveHabits(this.activeUserId, this.habits);
    this.notify();
  }

  deleteHabit(id) {
    this.habits = this.habits.filter(h => h.id !== id);
    StorageService.saveHabits(this.activeUserId, this.habits);
    this.notify();
  }

  toggleHabitDate(id, dateKey) {
    this.habits = this.habits.map(h => {
      if (h.id === id) {
        return HabitUtils.toggleDate(h, dateKey);
      }
      return h;
    });
    StorageService.saveHabits(this.activeUserId, this.habits);
    this.notify();
  }

  /* ------------------------------------------------------------------------
     Meal Plan Actions (Weekly & Checkboxes)
     ------------------------------------------------------------------------ */
  updateMeal(dateKey, mealType, text) {
    const currentDay = this.meals[dateKey] || MealUtils.getEmptyDayMeals();
    const updatedDay = {
      ...currentDay,
      [mealType]: {
        text: text.trim(),
        completed: currentDay[mealType]?.completed || false
      }
    };

    this.meals = {
      ...this.meals,
      [dateKey]: updatedDay
    };
    StorageService.saveMeals(this.activeUserId, this.meals);
    this.notify();
  }

  toggleMealComplete(dateKey, mealType) {
    const currentDay = this.meals[dateKey] || MealUtils.getEmptyDayMeals();
    const currentMeal = currentDay[mealType] || { text: '', completed: false };

    const updatedDay = {
      ...currentDay,
      [mealType]: {
        ...currentMeal,
        completed: !currentMeal.completed
      }
    };

    this.meals = {
      ...this.meals,
      [dateKey]: updatedDay
    };
    StorageService.saveMeals(this.activeUserId, this.meals);
    this.notify();
  }

  replicateMealToWeek(mealType, text, weekDays) {
    const updatedMeals = { ...this.meals };
    weekDays.forEach(day => {
      const key = DateUtils.formatDateKey(day);
      const dayMeals = updatedMeals[key] || MealUtils.getEmptyDayMeals();
      updatedMeals[key] = {
        ...dayMeals,
        [mealType]: {
          text: text.trim(),
          completed: false
        }
      };
    });

    this.meals = updatedMeals;
    StorageService.saveMeals(this.activeUserId, this.meals);
    this.notify();
  }
}

export const store = new AppStore();
