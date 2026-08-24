/**
 * @file models.js
 * Domain entities, constants, and robust date utilities for Organizador Semanal.
 */

export const CATEGORIES = {
  trabalho: { id: 'trabalho', label: 'Trabalho', icon: '💼' },
  casa: { id: 'casa', label: 'Casa', icon: '🏠' },
  pessoal: { id: 'pessoal', label: 'Pessoal', icon: '⭐' },
  saude: { id: 'saude', label: 'Saúde', icon: '❤️' },
  compromisso: { id: 'compromisso', label: 'Compromisso', icon: '📅' },
  outros: { id: 'outros', label: 'Outros', icon: '📌' }
};

export const RECURRENCE_TYPES = {
  NONE: 'none',
  CUSTOM_DAYS: 'custom_days', // Specific days of the week (e.g. Ter, Qua, Qui)
  DAILY: 'daily',
  WEEKDAYS: 'weekdays', // Seg a Sex
  WEEKLY: 'weekly',
  MONTHLY: 'monthly'
};

export const RECURRENCE_LABELS = {
  none: 'Não repete',
  custom_days: 'Dias específicos da semana (Outlook)',
  weekdays: 'Segunda a Sexta (dias úteis)',
  daily: 'Todos os dias',
  weekly: 'Semanalmente (mesmo dia da semana)',
  monthly: 'Mensalmente (mesmo dia do mês)'
};

export const ACTIVITY_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed'
};

/**
 * Days of week definition with JS getDay() indices:
 * 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb, 0 = Dom
 */
export const WEEKDAY_OPTIONS = [
  { dayIndex: 1, shortLabel: 'SEG', fullLabel: 'Segunda-feira' },
  { dayIndex: 2, shortLabel: 'TER', fullLabel: 'Terça-feira' },
  { dayIndex: 3, shortLabel: 'QUA', fullLabel: 'Quarta-feira' },
  { dayIndex: 4, shortLabel: 'QUI', fullLabel: 'Quinta-feira' },
  { dayIndex: 5, shortLabel: 'SEX', fullLabel: 'Sexta-feira' },
  { dayIndex: 6, shortLabel: 'SÁB', fullLabel: 'Sábado' },
  { dayIndex: 0, shortLabel: 'DOM', fullLabel: 'Domingo' }
];

/**
 * Generate a unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/**
 * Robust date helper utilities (Standardizing with Monday as start of week, operating at noon to avoid timezone shifts)
 */
export const DateUtils = {
  /**
   * Format a Date object to YYYY-MM-DD string
   */
  formatDateKey(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Parse YYYY-MM-DD into a Date object (local timezone noon to avoid TZ offset shifts)
   */
  parseDateKey(dateStr) {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  },

  /**
   * Get start of week (Monday) for any given date
   */
  getMondayOfWeek(date) {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    const day = d.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d;
  },

  /**
   * Returns array of 7 Date objects for the given week (Monday to Sunday)
   */
  getWeekDays(startMonday) {
    const days = [];
    const monday = new Date(startMonday);
    monday.setHours(12, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      days.push(nextDay);
    }
    return days;
  },

  /**
   * Check if two dates represent the same calendar day
   */
  isSameDay(date1, date2) {
    if (!date1 || !date2) return false;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  },

  /**
   * Format week range (e.g. "24 — 30 AGO" or "28 FEV — 06 MAR 2026")
   */
  formatWeekRange(monday) {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const monthNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const startDay = String(monday.getDate()).padStart(2, '0');
    const endDay = String(sunday.getDate()).padStart(2, '0');

    const startMonth = monthNames[monday.getMonth()];
    const endMonth = monthNames[sunday.getMonth()];

    if (startMonth === endMonth) {
      return `${startDay} — ${endDay} ${startMonth} ${sunday.getFullYear()}`;
    } else {
      return `${startDay} ${startMonth} — ${endDay} ${endMonth} ${sunday.getFullYear()}`;
    }
  },

  /**
   * Day of week names for week board
   */
  dayNamesShort: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'],
  dayNamesFull: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']
};
