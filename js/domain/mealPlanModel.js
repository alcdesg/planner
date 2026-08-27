/**
 * @file mealPlanModel.js
 * Domain model and definitions for the Weekly Meal Planner.
 */

export const MEAL_TYPES = {
  breakfast:     { id: 'breakfast',     label: 'Café da Manhã',    icon: '☕', order: 1 },
  morning_snack: { id: 'morning_snack', label: 'Lanche da Manhã',  icon: '🥐', order: 2 },
  lunch:         { id: 'lunch',         label: 'Almoço',            icon: '🥗', order: 3 },
  snack:         { id: 'snack',         label: 'Lanche da Tarde',   icon: '🍎', order: 4 },
  dinner:        { id: 'dinner',        label: 'Jantar',            icon: '🍲', order: 5 },
  supper:        { id: 'supper',        label: 'Ceia',              icon: '🍵', order: 6 }
};

export const DEFAULT_VISIBLE_MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'];

export const MealUtils = {
  /**
   * Return empty structure for a day's meals
   */
  getEmptyDayMeals() {
    return {
      breakfast:     { text: '', completed: false },
      morning_snack: { text: '', completed: false },
      lunch:         { text: '', completed: false },
      snack:         { text: '', completed: false },
      dinner:        { text: '', completed: false },
      supper:        { text: '', completed: false }
    };
  },

  /**
   * Get meals for a specific dateKey from the user's meal map
   */
  getDayMeals(mealsMap, dateKey) {
    if (!mealsMap || typeof mealsMap !== 'object') {
      return this.getEmptyDayMeals();
    }
    const day = mealsMap[dateKey] || {};
    return {
      breakfast:     { text: day.breakfast?.text     || '', completed: !!day.breakfast?.completed },
      morning_snack: { text: day.morning_snack?.text || '', completed: !!day.morning_snack?.completed },
      lunch:         { text: day.lunch?.text         || '', completed: !!day.lunch?.completed },
      snack:         { text: day.snack?.text         || '', completed: !!day.snack?.completed },
      dinner:        { text: day.dinner?.text        || '', completed: !!day.dinner?.completed },
      supper:        { text: day.supper?.text        || '', completed: !!day.supper?.completed }
    };
  }
};

