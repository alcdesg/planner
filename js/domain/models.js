/**
 * @file models.js
 * Domain entities, constants, and bulletproof ISO date utilities for Organizador Semanal.
 * Operating in strict ISO YYYY-MM-DD format to guarantee zero timezone offset bugs.
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
 * Robust ISO date helper utilities (Strict YYYY-MM-DD strings with zero timezone offset shifts)
 */
export const DateUtils = {
  /**
   * Format any Date object or string into canonical YYYY-MM-DD string
   */
  formatDateKey(date) {
    if (!date) return '';
    if (typeof date === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
    }
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Parse YYYY-MM-DD safely into local noon Date object
   */
  parseDateKey(dateStr) {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) {
      const d = new Date(dateStr);
      d.setHours(12, 0, 0, 0);
      return d;
    }
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day, 12, 0, 0);
    }
    const d = new Date(dateStr);
    d.setHours(12, 0, 0, 0);
    return d;
  },

  /**
   * Get start of week (Monday) for any given date in local time
   */
  getMondayOfWeek(date) {
    const d = this.parseDateKey(date);
    const day = d.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    d.setHours(12, 0, 0, 0);
    return d;
  },

  /**
   * Returns array of 7 Date objects for the given week (Monday to Sunday)
   */
  getWeekDays(startMonday) {
    const days = [];
    const monday = this.parseDateKey(startMonday);
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      nextDay.setHours(12, 0, 0, 0);
      days.push(nextDay);
    }
    return days;
  },

  /**
   * Check if two dates represent the same calendar day using strict string keys
   */
  isSameDay(date1, date2) {
    if (!date1 || !date2) return false;
    return this.formatDateKey(date1) === this.formatDateKey(date2);
  },

  /**
   * Format week range (e.g. "24 — 30 AGO" or "28 FEV — 06 MAR 2026")
   */
  formatWeekRange(monday) {
    const mon = this.parseDateKey(monday);
    const sunday = new Date(mon);
    sunday.setDate(mon.getDate() + 6);

    const monthNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const startDay = String(mon.getDate()).padStart(2, '0');
    const endDay = String(sunday.getDate()).padStart(2, '0');

    const startMonth = monthNames[mon.getMonth()];
    const endMonth = monthNames[sunday.getMonth()];

    if (startMonth === endMonth) {
      return `${startDay} — ${endDay} ${startMonth} ${sunday.getFullYear()}`;
    } else {
      return `${startDay} ${startMonth} — ${endDay} ${endMonth} ${sunday.getFullYear()}`;
    }
  },

  dayNamesShort: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'],
  dayNamesFull: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']
};
