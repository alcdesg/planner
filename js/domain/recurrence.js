/**
 * @file recurrence.js
 * Expands recurring activities deterministically for the visible week/day range.
 * Fully timezone-safe using ISO 8601 YYYY-MM-DD string comparisons.
 */

import { RECURRENCE_TYPES, DateUtils } from './models.js';

export const RecurrenceEngine = {
  /**
   * Determine if an activity occurs on targetDate (Date object or YYYY-MM-DD string)
   * @param {Object} activity - The activity object
   * @param {Date|string} targetDate - The date to check
   * @returns {boolean}
   */
  occursOnDate(activity, targetDate) {
    if (!activity || !activity.date) return false;

    const targetKey = DateUtils.formatDateKey(targetDate);
    const activityDateKey = DateUtils.formatDateKey(activity.date);

    // Non-recurring activity: strict exact date match
    if (!activity.recurrence || activity.recurrence === RECURRENCE_TYPES.NONE) {
      return activityDateKey === targetKey;
    }

    // If target date is before the activity start date, it does not occur
    if (targetKey < activityDateKey) {
      return false;
    }

    // If there is an end date ("Repetir até") and target is after end date, it does not occur
    if (activity.recurrenceEndDate) {
      const endKey = DateUtils.formatDateKey(activity.recurrenceEndDate);
      if (targetKey > endKey) {
        return false;
      }
    }

    const targetObj = DateUtils.parseDateKey(targetKey);
    const targetDayIndex = targetObj.getDay(); // 0 is Sun, 1 is Mon...

    switch (activity.recurrence) {
      case RECURRENCE_TYPES.CUSTOM_DAYS: {
        const days = Array.isArray(activity.recurrenceDays) ? activity.recurrenceDays : [];
        return days.includes(targetDayIndex);
      }

      case RECURRENCE_TYPES.DAILY:
        return true;

      case RECURRENCE_TYPES.WEEKDAYS: {
        return targetDayIndex >= 1 && targetDayIndex <= 5;
      }

      case RECURRENCE_TYPES.WEEKLY: {
        const startObj = DateUtils.parseDateKey(activityDateKey);
        return targetDayIndex === startObj.getDay();
      }

      case RECURRENCE_TYPES.MONTHLY: {
        const startDayOfMonth = parseInt(activityDateKey.split('-')[2], 10);
        const targetDayOfMonth = parseInt(targetKey.split('-')[2], 10);
        return targetDayOfMonth === startDayOfMonth;
      }

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

    if (!Array.isArray(activities)) {
      return dayMap;
    }

    activities.forEach(activity => {
      weekDays.forEach(day => {
        const key = DateUtils.formatDateKey(day);
        if (this.occursOnDate(activity, day)) {
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
