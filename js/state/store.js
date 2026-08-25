/**
 * @file store.js
 * Central reactive application state manager.
 * Supports direct PostgreSQL Supabase synchronization, RBAC roles (Admin/Member), Habits & Meals.
 */

import { generateId, DateUtils, RECURRENCE_TYPES, ACTIVITY_STATUS } from '../domain/models.js';
import { HabitUtils } from '../domain/habitsModel.js';
import { MealUtils } from '../domain/mealPlanModel.js';
import { supabaseConfig } from '../config/supabaseClient.js';
import { SupabaseService } from '../storage/supabaseService.js';
import { StorageService } from '../storage/storage.js';

class AppStore {
  constructor() {
    this.listeners = [];

    // 1. Session & Auth State
    this.session = null;
    this.currentUser = null;
    this.userProfile = null; // { id, email, name, role: 'admin' | 'member' }
    this.syncStatus = 'synced'; // 'synced' | 'syncing' | 'error'

    // 2. Navigation state
    const today = new Date();
    this.currentMonday = DateUtils.getMondayOfWeek(today);
    this.todayDate = today;
    this.viewMode = 'week'; // 'week' | 'habits' | 'meals'

    this.habitViewMode = 'week';
    this.habitMonthDate = new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0);

    const currentDayOfWeek = today.getDay();
    this.activeMobileDayIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

    // 3. Theme
    this.theme = 'system';

    // 4. Data lists (loaded from Supabase / fallback)
    this.activities = [];
    this.habits = [];
    this.meals = {};

    this.initAuth();
    this.applyTheme(this.theme);
  }

  async initAuth() {
    if (supabaseConfig.isConfigured()) {
      try {
        this.session = await SupabaseService.getCurrentSession();
        this.currentUser = this.session?.user || null;
        if (this.currentUser) {
          this.userProfile = await SupabaseService.fetchUserProfile(this.currentUser.id);
        }

        SupabaseService.onAuthStateChange(async (event, session) => {
          this.session = session;
          this.currentUser = session?.user || null;
          if (this.currentUser) {
            this.userProfile = await SupabaseService.fetchUserProfile(this.currentUser.id);
          } else {
            this.userProfile = null;
          }
          await this.syncNow();
        });
      } catch (e) {
        console.warn('Auth init warning:', e);
      }
    }

    await this.syncNow();
  }

  isAdmin() {
    return this.userProfile?.role === 'admin';
  }

  isAuthenticated() {
    return !!this.currentUser;
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
    const weekDays = DateUtils.getWeekDays(this.currentMonday);

    return {
      session: this.session,
      currentUser: this.currentUser,
      userProfile: this.userProfile,
      isAdmin: this.isAdmin(),
      isAuthenticated: this.isAuthenticated(),
      syncStatus: this.syncStatus,
      isSupabaseConnected: supabaseConfig.isConfigured(),
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
     Sync & Direct Database Operations
     ------------------------------------------------------------------------ */
  async syncNow() {
    this.syncStatus = 'syncing';
    this.notify();

    try {
      if (supabaseConfig.isConfigured() && this.currentUser) {
        // Direct fetch from Supabase
        const [activities, habits, meals, profile] = await Promise.all([
          SupabaseService.fetchActivities(),
          SupabaseService.fetchHabits(),
          SupabaseService.fetchMeals(),
          SupabaseService.fetchUserProfile(this.currentUser.id)
        ]);
        this.activities = activities;
        this.habits = habits;
        this.meals = meals;
        if (profile) this.userProfile = profile;
      } else {
        // Fallback local storage
        const activeUserId = StorageService.getActiveUserId();
        this.activities = StorageService.getActivities(activeUserId);
        this.habits = StorageService.getHabits(activeUserId);
        this.meals = StorageService.getMeals(activeUserId);
      }
      this.syncStatus = 'synced';
    } catch (e) {
      console.error('Sync failed:', e);
      this.syncStatus = 'error';
    }

    this.notify();
  }

  /* ------------------------------------------------------------------------
     Theme Actions
     ------------------------------------------------------------------------ */
  setTheme(theme) {
    this.theme = theme;
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
     Activity Actions (Direct to Database)
     ------------------------------------------------------------------------ */
  async addActivity(data) {
    const newActivity = {
      id: generateId(),
      userId: this.currentUser?.id || 'usr_default',
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
    this.notify();

    if (supabaseConfig.isConfigured() && this.currentUser) {
      try {
        await SupabaseService.insertActivity(newActivity);
      } catch (e) {
        console.error('Error saving activity:', e);
      }
    } else {
      StorageService.saveActivities(StorageService.getActiveUserId(), this.activities);
    }

    return newActivity;
  }

  async updateActivity(id, data, scope = 'all', occurrenceDate = null) {
    let updatedTarget = null;

    this.activities = this.activities.map(act => {
      if (act.id !== id) return act;

      if (scope === 'this' && occurrenceDate && act.recurrence && act.recurrence !== RECURRENCE_TYPES.NONE) {
        const overrides = act.overrides || {};
        overrides[occurrenceDate] = {
          title: (data.title || act.title).trim(),
          time: data.time !== undefined ? data.time : act.time,
          category: data.category || act.category
        };

        updatedTarget = {
          ...act,
          overrides: { ...overrides },
          updatedAt: new Date().toISOString()
        };
        return updatedTarget;
      }

      updatedTarget = {
        ...act,
        ...data,
        title: (data.title || act.title).trim(),
        updatedAt: new Date().toISOString()
      };
      return updatedTarget;
    });

    this.notify();

    if (supabaseConfig.isConfigured() && this.currentUser && updatedTarget) {
      try {
        await SupabaseService.updateActivity(id, updatedTarget);
      } catch (e) {
        console.error('Error updating activity in Supabase:', e);
      }
    } else {
      StorageService.saveActivities(StorageService.getActiveUserId(), this.activities);
    }
  }

  async deleteActivity(id, scope = 'all', occurrenceDate = null) {
    let updatedTarget = null;

    if (scope === 'this' && occurrenceDate) {
      this.activities = this.activities.map(act => {
        if (act.id !== id) return act;

        if (act.recurrence && act.recurrence !== RECURRENCE_TYPES.NONE) {
          const deletedDates = new Set(act.deletedDates || []);
          deletedDates.add(occurrenceDate);
          updatedTarget = {
            ...act,
            deletedDates: Array.from(deletedDates),
            updatedAt: new Date().toISOString()
          };
          return updatedTarget;
        }
        return act;
      }).filter(act => {
        return act.recurrence && act.recurrence !== RECURRENCE_TYPES.NONE ? true : act.id !== id;
      });

      this.notify();

      if (supabaseConfig.isConfigured() && this.currentUser && updatedTarget) {
        await SupabaseService.updateActivity(id, updatedTarget);
      }
    } else {
      this.activities = this.activities.filter(act => act.id !== id);
      this.notify();

      if (supabaseConfig.isConfigured() && this.currentUser) {
        await SupabaseService.deleteActivity(id);
      }
    }

    if (!supabaseConfig.isConfigured() || !this.currentUser) {
      StorageService.saveActivities(StorageService.getActiveUserId(), this.activities);
    }
  }

  async toggleActivityCompletion(id, occurrenceDate) {
    let updatedTarget = null;

    this.activities = this.activities.map(act => {
      if (act.id !== id) return act;

      if (act.recurrence && act.recurrence !== RECURRENCE_TYPES.NONE) {
        const completedDates = new Set(act.completedDates || []);
        if (completedDates.has(occurrenceDate)) {
          completedDates.delete(occurrenceDate);
        } else {
          completedDates.add(occurrenceDate);
        }
        updatedTarget = {
          ...act,
          completedDates: Array.from(completedDates),
          updatedAt: new Date().toISOString()
        };
        return updatedTarget;
      }

      const nextStatus = act.status === ACTIVITY_STATUS.COMPLETED
        ? ACTIVITY_STATUS.PENDING
        : ACTIVITY_STATUS.COMPLETED;

      updatedTarget = {
        ...act,
        status: nextStatus,
        updatedAt: new Date().toISOString()
      };
      return updatedTarget;
    });

    this.notify();

    if (supabaseConfig.isConfigured() && this.currentUser && updatedTarget) {
      await SupabaseService.updateActivity(id, updatedTarget);
    } else {
      StorageService.saveActivities(StorageService.getActiveUserId(), this.activities);
    }
  }

  /* ------------------------------------------------------------------------
     Habits Actions (Direct to Database)
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

  async addHabit(data) {
    const newHabit = HabitUtils.createHabit(
      this.currentUser?.id || 'usr_default',
      data.name,
      data.icon,
      data.targetDays || 7
    );

    this.habits = [...this.habits, newHabit];
    this.notify();

    if (supabaseConfig.isConfigured() && this.currentUser) {
      await SupabaseService.insertHabit(newHabit);
    } else {
      StorageService.saveHabits(StorageService.getActiveUserId(), this.habits);
    }
    return newHabit;
  }

  async updateHabit(id, data) {
    let updatedTarget = null;
    this.habits = this.habits.map(h => {
      if (h.id === id) {
        updatedTarget = {
          ...h,
          name: (data.name || h.name).trim(),
          icon: data.icon || h.icon,
          targetDays: data.targetDays !== undefined ? data.targetDays : h.targetDays
        };
        return updatedTarget;
      }
      return h;
    });
    this.notify();

    if (supabaseConfig.isConfigured() && this.currentUser && updatedTarget) {
      await SupabaseService.updateHabit(id, updatedTarget);
    } else {
      StorageService.saveHabits(StorageService.getActiveUserId(), this.habits);
    }
  }

  async deleteHabit(id) {
    this.habits = this.habits.filter(h => h.id !== id);
    this.notify();

    if (supabaseConfig.isConfigured() && this.currentUser) {
      await SupabaseService.deleteHabit(id);
    } else {
      StorageService.saveHabits(StorageService.getActiveUserId(), this.habits);
    }
  }

  async toggleHabitDate(id, dateKey) {
    let updatedTarget = null;
    this.habits = this.habits.map(h => {
      if (h.id === id) {
        updatedTarget = HabitUtils.toggleDate(h, dateKey);
        return updatedTarget;
      }
      return h;
    });
    this.notify();

    if (supabaseConfig.isConfigured() && this.currentUser && updatedTarget) {
      await SupabaseService.updateHabit(id, updatedTarget);
    } else {
      StorageService.saveHabits(StorageService.getActiveUserId(), this.habits);
    }
  }

  /* ------------------------------------------------------------------------
     Meal Plan Actions (Direct to Database)
     ------------------------------------------------------------------------ */
  async updateMeal(dateKey, mealType, text) {
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
    this.notify();

    if (supabaseConfig.isConfigured() && this.currentUser) {
      await SupabaseService.upsertMealDay(dateKey, updatedDay);
    } else {
      StorageService.saveMeals(StorageService.getActiveUserId(), this.meals);
    }
  }

  async toggleMealComplete(dateKey, mealType) {
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
    this.notify();

    if (supabaseConfig.isConfigured() && this.currentUser) {
      await SupabaseService.upsertMealDay(dateKey, updatedDay);
    } else {
      StorageService.saveMeals(StorageService.getActiveUserId(), this.meals);
    }
  }

  async replicateMealToWeek(mealType, text, weekDays) {
    const updatedMeals = { ...this.meals };
    const updatePromises = [];

    weekDays.forEach(day => {
      const key = DateUtils.formatDateKey(day);
      const dayMeals = updatedMeals[key] || MealUtils.getEmptyDayMeals();
      const newDayMeals = {
        ...dayMeals,
        [mealType]: {
          text: text.trim(),
          completed: false
        }
      };
      updatedMeals[key] = newDayMeals;

      if (supabaseConfig.isConfigured() && this.currentUser) {
        updatePromises.push(SupabaseService.upsertMealDay(key, newDayMeals));
      }
    });

    this.meals = updatedMeals;
    this.notify();

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    } else {
      StorageService.saveMeals(StorageService.getActiveUserId(), this.meals);
    }
  }
}

export const store = new AppStore();
