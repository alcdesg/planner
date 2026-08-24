/**
 * @file recurrence.js
 * Expands recurring activities deterministically for the visible week/day range.
 * Supports custom days of the week (Outlook style) and optional end date limits.
 */

import { RECURRENCE_TYPES, DateUtils } from './models.js';

export const RecurrenceEngine = {
  /**
   * Determine if a recurring activity occurs on targetDate
   * @param {Object} activity - The activity object
   * @param {Date} targetDate - The date to check
   * @returns {boolean}
   */
  occursOnDate(activity, targetDate) {
    if (!activity.recurrence || activity.recurrence === RECURRENCE_TYPES.NONE) {
      return DateUtils.isSameDay(activity.date, targetDate);
    }

    const startDate = DateUtils.parseDateKey(activity.date);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);

    // If target date is before initial start date, it doesn't occur
    if (target < startDate) return false;

    // Check optional end date ("Repetir até")
    if (activity.recurrenceEndDate) {
      const endDate = DateUtils.parseDateKey(activity.recurrenceEndDate);
      endDate.setHours(23, 59, 59, 999);
      if (target > endDate) return false;
    }

    switch (activity.recurrence) {
      case RECURRENCE_TYPES.CUSTOM_DAYS: {
        const targetDayIndex = target.getDay(); // 0 is Sun, 1 is Mon...
        const days = Array.isArray(activity.recurrenceDays) ? activity.recurrenceDays : [];
        return days.includes(targetDayIndex);
      }

      case RECURRENCE_TYPES.DAILY:
        return true;

      case RECURRENCE_TYPES.WEEKDAYS: {
        const dayOfWeek = target.getDay(); // 0 is Sun, 6 is Sat
        return dayOfWeek >= 1 && dayOfWeek <= 5;
      }

      case RECURRENCE_TYPES.WEEKLY:
        return target.getDay() === startDate.getDay();

      case RECURRENCE_TYPES.MONTHLY:
        return target.getDate() === startDate.getDate();

      default:
        return false;
    }
  },

  /**
   * For a given week (array of 7 Date objects), return list of activity occurrences for each day
   * @param {Array<Object>} activities - Base activities for the user
   * @param {Array<Date>} weekDays - Array of 7 Date objects (Mon..Sun)
   * @returns {Map<string, Array<Object>>} Map of YYYY-MM-DD -> Array of resolved activity instances
   */
  resolveWeekActivities(activities, weekDays) {
    const dayMap = new Map();

    weekDays.forEach(day => {
      const key = DateUtils.formatDateKey(day);
      dayMap.set(key, []);
    });

    activities.forEach(activity => {
      weekDays.forEach(day => {
        const key = DateUtils.formatDateKey(day);
        if (this.occursOnDate(activity, day)) {
          // Check if completion is recorded for this specific occurrence or globally
          const completedDates = activity.completedDates || [];
          const isCompleted = activity.recurrence && activity.recurrence !== RECURRENCE_TYPES.NONE
            ? completedDates.includes(key)
            : activity.status === 'completed';

          const occurrenceInstance = {
            ...activity,
            occurrenceDate: key,
            isCompleted: !!isCompleted
          };

          dayMap.get(key).push(occurrenceInstance);
        }
      });
    });

    // Sort activities inside each day: untimed first, then timed chronologically
    dayMap.forEach((list) => {
      list.sort((a, b) => {
        if (!a.time && !b.time) return 0;
        if (!a.time) return -1;
        if (!b.time) return 1;
        return a.time.localeCompare(b.time);
      });
    });

    return dayMap;
  }
};
