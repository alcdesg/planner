/**
 * @file store.js
 * Central reactive application state manager.
 */

import { generateId, DateUtils, RECURRENCE_TYPES, ACTIVITY_STATUS } from '../domain/models.js';
import { StorageService } from '../storage/storage.js';

class AppStore {
  constructor() {
    this.listeners = [];

    // 1. Load users and active user
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
    this.viewMode = 'week'; // 'week' | 'today'

    // Initial mobile active day (defaults to today's day of week, or Monday)
    const currentDayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon
    this.activeMobileDayIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

    // 3. User settings & Theme
    const userSettings = StorageService.getUserSettings(this.activeUserId);
    this.theme = userSettings.theme || 'system';

    // 4. User activities
    this.activities = StorageService.getActivities(this.activeUserId);

    this.applyTheme(this.theme);
  }

  /**
   * Subscribe to state updates
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all subscribers
   */
  notify() {
    this.listeners.forEach(fn => fn(this.getState()));
  }

  /**
   * Get current state snapshot
   */
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
      theme: this.theme,
      activities: this.activities,
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

    // Load newly selected user's activities & settings
    this.activities = StorageService.getActivities(userId);
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
     Activity CRUD Actions
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
      completedDates: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.activities = [...this.activities, newActivity];
    StorageService.saveActivities(this.activeUserId, this.activities);
    this.notify();
    return newActivity;
  }

  updateActivity(id, data) {
    this.activities = this.activities.map(act => {
      if (act.id === id) {
        return {
          ...act,
          ...data,
          title: (data.title || act.title).trim(),
          updatedAt: new Date().toISOString()
        };
      }
      return act;
    });

    StorageService.saveActivities(this.activeUserId, this.activities);
    this.notify();
  }

  deleteActivity(id) {
    this.activities = this.activities.filter(act => act.id !== id);
    StorageService.saveActivities(this.activeUserId, this.activities);
    this.notify();
  }

  toggleActivityCompletion(id, occurrenceDate) {
    this.activities = this.activities.map(act => {
      if (act.id !== id) return act;

      // If it's a recurring activity, toggle completion for this specific occurrenceDate
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

      // Non-recurring: toggle simple status
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
}

export const store = new AppStore();
