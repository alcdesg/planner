/**
 * @file habitsModel.js
 * Domain model and utilities for the Habit Tracker (Weekly & Monthly views).
 */

import { generateId, DateUtils } from './models.js';

export const HABIT_DEFAULT_ICONS = ['💧', '📚', '🏃', '🧘', '🥗', '💊', '🛌', '✍️', '🚶', '🎯', '🌿', '💪'];

export const HabitUtils = {
  /**
   * Create a new habit object
   */
  createHabit(userId, name, icon = '🎯', targetDays = 7) {
    return {
      id: 'hbt_' + generateId(),
      userId,
      name: name.trim(),
      icon: icon || '🎯',
      targetDays: Math.min(7, Math.max(1, targetDays)),
      completedDates: [],
      createdAt: new Date().toISOString()
    };
  },

  /**
   * Check if habit is completed on a specific date (YYYY-MM-DD)
   */
  isCompletedOnDate(habit, dateKey) {
    if (!habit || !Array.isArray(habit.completedDates)) return false;
    return habit.completedDates.includes(dateKey);
  },

  /**
   * Toggle completion for a specific date
   */
  toggleDate(habit, dateKey) {
    const dates = new Set(habit.completedDates || []);
    if (dates.has(dateKey)) {
      dates.delete(dateKey);
    } else {
      dates.add(dateKey);
    }
    return {
      ...habit,
      completedDates: Array.from(dates)
    };
  },

  /**
   * Calculate progress for a given week
   * @param {Object} habit
   * @param {Array<Date>} weekDays - 7 Date objects
   * @returns {{ completedCount: number, totalDays: number, percentage: number }}
   */
  getWeeklyStats(habit, weekDays) {
    let completedCount = 0;
    weekDays.forEach(day => {
      const key = DateUtils.formatDateKey(day);
      if (this.isCompletedOnDate(habit, key)) {
        completedCount++;
      }
    });

    const totalDays = 7;
    const percentage = Math.round((completedCount / totalDays) * 100);

    return {
      completedCount,
      totalDays,
      percentage
    };
  },

  /**
   * Get all dates of a specific month with completion status
   * @param {Object} habit
   * @param {number} year
   * @param {number} monthIndex - 0 to 11
   * @returns {{ days: Array<{ dateKey: string, dayNumber: number, isCompleted: boolean, isToday: boolean }>, totalDays: number, completedCount: number, percentage: number }}
   */
  getMonthStats(habit, year, monthIndex) {
    const totalDaysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const days = [];
    let completedCount = 0;

    const todayKey = DateUtils.formatDateKey(new Date());

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateObj = new Date(year, monthIndex, day, 12, 0, 0);
      const dateKey = DateUtils.formatDateKey(dateObj);
      const isCompleted = this.isCompletedOnDate(habit, dateKey);

      if (isCompleted) {
        completedCount++;
      }

      days.push({
        dateKey,
        dayNumber: day,
        dayOfWeek: dateObj.getDay(),
        isCompleted,
        isToday: dateKey === todayKey
      });
    }

    const percentage = totalDaysInMonth > 0 ? Math.round((completedCount / totalDaysInMonth) * 100) : 0;

    return {
      days,
      totalDays: totalDaysInMonth,
      completedCount,
      percentage
    };
  }
};
