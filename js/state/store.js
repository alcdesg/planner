/**
 * @file store.js
 * Central reactive application state manager.
 * Supports direct PostgreSQL Supabase synchronization, RBAC roles (Admin/Member), Habits & Meals.
 * Enforces session memory hygiene and transparent error states.
 */

import { generateId, DateUtils, RECURRENCE_TYPES, ACTIVITY_STATUS } from '../domain/models.js';
import { HabitUtils } from '../domain/habitsModel.js';
import { MealUtils } from '../domain/mealPlanModel.js';
import { supabaseConfig } from '../config/supabaseClient.js';
import { SupabaseService } from '../storage/supabaseService.js';
import { Sanitizer } from '../utils/sanitizer.js';

class AppStore {
  constructor() {
    this.listeners = [];

    // 1. Session & Auth State
    this.session = null;
    this.currentUser = null;
    this.userProfile = null;
    this.syncStatus = 'synced'; // 'synced' | 'syncing' | 'error'
    this.syncErrorMessage = '';

    // 2. Navigation state
    const today = new Date();
    this.currentMonday = DateUtils.getMondayOfWeek(today);
    this.todayDate = today;
    this.viewMode = 'week';

    this.habitViewMode = 'week';
    this.habitMonthDate = new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0);

    const currentDayOfWeek = today.getDay();
    this.activeMobileDayIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

    // 3. Theme
    this.theme = 'system';

    // 4. Data lists (strictly isolated per user)
    this.activities = [];
    this.habits = [];
    this.meals = {};

    this.initAuth();
    this.applyTheme(this.theme);
  }

  /**
   * Reset all in-memory data arrays to prevent memory leakage across sessions.
   */
  resetState() {
    this.session = null;
    this.currentUser = null;
    this.userProfile = null;
    this.activities = [];
    this.habits = [];
    this.meals = {};
    this.syncStatus = 'synced';
    this.syncErrorMessage = '';
    this.notify();
  }

  async initAuth() {
    if (supabaseConfig.isConfigured()) {
      try {
        this.session = await SupabaseService.getCurrentSession();
        this.currentUser = this.session?.user || null;
        if (this.currentUser) {
          this.userProfile = await SupabaseService.fetchUserProfile(this.currentUser.id);
        } else {
          this.resetState();
        }

        SupabaseService.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT' || !session) {
            this.resetState();
          } else {
            this.session = session;
            this.currentUser = session?.user || null;
            if (this.currentUser) {
              this.userProfile = await SupabaseService.fetchUserProfile(this.currentUser.id);
            }
            await this.syncNow();
          }
        });
      } catch (e) {
        console.warn('Auth init warning:', e);
      }
    }

    if (this.currentUser) {
      await this.syncNow();
    }
  }

  isAdmin() {
    return this.userProfile?.role === 'admin' && this.userProfile?.is_active === true;
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
      syncErrorMessage: this.syncErrorMessage,
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
     Direct Database Sychronization
     ------------------------------------------------------------------------ */
  async syncNow() {
    if (!this.currentUser) {
      this.resetState();
      return;
    }

    this.syncStatus = 'syncing';
    this.syncErrorMessage = '';
    this.notify();

    try {
      if (supabaseConfig.isConfigured()) {
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
        this.syncStatus = 'synced';
      }
    } catch (e) {
      console.error('Sync failed:', e);
      this.syncStatus = 'error';
      this.syncErrorMessage = e.message || 'Falha na sincronização';
    }

    this.notify();
  }

  /* ------------------------------------------------------------------------
     Theme Actions
     ------------------------------------------------------------------------ */
  setTheme(theme) {
    if (!['system', 'light', 'dark'].includes(theme)) theme = 'system';
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
     Activity Actions
     ------------------------------------------------------------------------ */
  async addActivity(data) {
    if (!this.currentUser) return null;

    const newActivity = {
      id: generateId(),
      userId: this.currentUser.id,
      title: Sanitizer.clampText(data.title, 255),
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

    try {
      await SupabaseService.insertActivity(newActivity);
    } catch (e) {
      console.error('Error saving activity:', e);
      this.syncStatus = 'error';
      this.syncErrorMessage = e.message;
      this.notify();
    }

    return newActivity;
  }

  async updateActivity(id, data, scope = 'all', occurrenceDate = null) {
    if (!this.currentUser) return;

    let updatedTarget = null;

    this.activities = this.activities.map(act => {
      if (act.id !== id) return act;

      if (scope === 'this' && occurrenceDate && act.recurrence && act.recurrence !== RECURRENCE_TYPES.NONE) {
        const overrides = act.overrides || {};
        overrides[occurrenceDate] = {
          title: Sanitizer.clampText(data.title || act.title, 255),
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
        title: Sanitizer.clampText(data.title || act.title, 255),
        updatedAt: new Date().toISOString()
      };
      return updatedTarget;
    });

    this.notify();

    if (updatedTarget) {
      try {
        await SupabaseService.updateActivity(id, updatedTarget);
      } catch (e) {
        console.error('Error updating activity in Supabase:', e);
        this.syncStatus = 'error';
        this.syncErrorMessage = e.message;
        this.notify();
      }
    }
  }

  async deleteActivity(id, scope = 'all', occurrenceDate = null) {
    if (!this.currentUser) return;

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

      if (updatedTarget) {
        try {
          await SupabaseService.updateActivity(id, updatedTarget);
        } catch (e) {
          console.error('Error updating activity:', e);
        }
      }
    } else {
      this.activities = this.activities.filter(act => act.id !== id);
      this.notify();

      try {
        await SupabaseService.deleteActivity(id);
      } catch (e) {
        console.error('Error deleting activity:', e);
      }
    }
  }

  async toggleActivityCompletion(id, occurrenceDate) {
    if (!this.currentUser) return;

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

    if (updatedTarget) {
      try {
        await SupabaseService.updateActivity(id, updatedTarget);
      } catch (e) {
        console.error('Error updating activity:', e);
      }
    }
  }

  /* ------------------------------------------------------------------------
     Habits Actions
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
    if (!this.currentUser) return null;

    const newHabit = HabitUtils.createHabit(
      this.currentUser.id,
      Sanitizer.clampText(data.name, 150),
      Sanitizer.clampText(data.icon || '🎯', 10),
      data.targetDays || 7
    );

    this.habits = [...this.habits, newHabit];
    this.notify();

    try {
      await SupabaseService.insertHabit(newHabit);
    } catch (e) {
      console.error('Error adding habit:', e);
    }
    return newHabit;
  }

  async updateHabit(id, data) {
    if (!this.currentUser) return;

    let updatedTarget = null;
    this.habits = this.habits.map(h => {
      if (h.id === id) {
        updatedTarget = {
          ...h,
          name: Sanitizer.clampText(data.name || h.name, 150),
          icon: Sanitizer.clampText(data.icon || h.icon, 10),
          targetDays: data.targetDays !== undefined ? data.targetDays : h.targetDays
        };
        return updatedTarget;
      }
      return h;
    });
    this.notify();

    if (updatedTarget) {
      try {
        await SupabaseService.updateHabit(id, updatedTarget);
      } catch (e) {
        console.error('Error updating habit in Supabase:', e);
      }
    }
  }

  async deleteHabit(id) {
    if (!this.currentUser) return;

    this.habits = this.habits.filter(h => h.id !== id);
    this.notify();

    try {
      await SupabaseService.deleteHabit(id);
    } catch (e) {
      console.error('Error deleting habit from Supabase:', e);
    }
  }

  async toggleHabitDate(id, dateKey) {
    if (!this.currentUser) return;

    let updatedTarget = null;
    this.habits = this.habits.map(h => {
      if (h.id === id) {
        updatedTarget = HabitUtils.toggleDate(h, dateKey);
        return updatedTarget;
      }
      return h;
    });
    this.notify();

    if (updatedTarget) {
      try {
        await SupabaseService.updateHabit(id, updatedTarget);
      } catch (e) {
        console.error('Error toggling habit date:', e);
      }
    }
  }

  /* ------------------------------------------------------------------------
     Meal Plan Actions
     ------------------------------------------------------------------------ */
  async updateMeal(dateKey, mealType, text) {
    if (!this.currentUser) return;

    const currentDay = this.meals[dateKey] || MealUtils.getEmptyDayMeals();
    const updatedDay = {
      ...currentDay,
      [mealType]: {
        text: Sanitizer.clampText(text, 255),
        completed: currentDay[mealType]?.completed || false
      }
    };

    this.meals = {
      ...this.meals,
      [dateKey]: updatedDay
    };
    this.notify();

    try {
      await SupabaseService.upsertMealDay(dateKey, updatedDay);
    } catch (e) {
      console.error('Error saving meal to Supabase:', e);
    }
  }

  async toggleMealComplete(dateKey, mealType) {
    if (!this.currentUser) return;

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

    try {
      await SupabaseService.upsertMealDay(dateKey, updatedDay);
    } catch (e) {
      console.error('Error toggling meal completion:', e);
    }
  }

  async replicateMealToWeek(mealType, text, weekDays) {
    if (!this.currentUser) return;

    const updatedMeals = { ...this.meals };
    const updatePromises = [];

    weekDays.forEach(day => {
      const key = DateUtils.formatDateKey(day);
      const dayMeals = updatedMeals[key] || MealUtils.getEmptyDayMeals();
      const newDayMeals = {
        ...dayMeals,
        [mealType]: {
          text: Sanitizer.clampText(text, 255),
          completed: false
        }
      };
      updatedMeals[key] = newDayMeals;
      updatePromises.push(SupabaseService.upsertMealDay(key, newDayMeals));
    });

    this.meals = updatedMeals;
    this.notify();

    try {
      await Promise.all(updatePromises);
    } catch (e) {
      console.error('Error replicating meals:', e);
    }
  }
}

export const store = new AppStore();
