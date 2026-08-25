/**
 * @file models.js
 * Domain constants, Category definitions, and Date manipulation utilities.
 * Enforces RFC-4122 UUID v4 generation for universal database alignment.
 */

export const CATEGORIES = {
  trabalho:    { id: 'trabalho',    label: 'Trabalho',     icon: '💼' },
  casa:        { id: 'casa',        label: 'Casa',         icon: '🏠' },
  pessoal:     { id: 'pessoal',     label: 'Pessoal',      icon: '👤' },
  saude:       { id: 'saude',       label: 'Saúde',        icon: '💪' },
  compromisso: { id: 'compromisso', label: 'Compromisso',  icon: '📅' },
  outros:      { id: 'outros',      label: 'Outros',       icon: '📌' }
};

export const RECURRENCE_TYPES = {
  NONE: 'none',
  DAILY: 'daily',
  WEEKDAYS: 'weekdays',
  CUSTOM_DAYS: 'custom_days'
};

export const RECURRENCE_LABELS = {
  none: 'Não se repete',
  daily: 'Todos os dias',
  weekdays: 'Dias úteis (Seg-Sex)',
  custom_days: 'Personalizado'
};

export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' }
];

export const ACTIVITY_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed'
};

/**
 * Generates an RFC-4122 compliant UUID v4 string.
 * Aligned with PostgreSQL gen_random_uuid().
 * @returns {string}
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback RFC-4122 v4 compliant generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Pure timezone-safe Date utilities using local calendar day operations
 */
export const DateUtils = {
  dayNamesShort: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
  dayNamesFull: ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'],

  formatDateKey(date) {
    if (typeof date === 'string') {
      return date.slice(0, 10);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  parseDateKey(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  },

  getMondayOfWeek(date) {
    const d = typeof date === 'string' ? this.parseDateKey(date) : new Date(date);
    d.setHours(12, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(12, 0, 0, 0);
    return monday;
  },

  getWeekDays(mondayDate) {
    const days = [];
    const monday = typeof mondayDate === 'string' ? this.parseDateKey(mondayDate) : new Date(mondayDate);
    monday.setHours(12, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      day.setHours(12, 0, 0, 0);
      days.push(day);
    }
    return days;
  },

  isSameDay(date1, date2) {
    return this.formatDateKey(date1) === this.formatDateKey(date2);
  },

  formatDisplayDate(date) {
    const d = typeof date === 'string' ? this.parseDateKey(date) : date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  },

  formatWeekRange(mondayDate) {
    const weekDays = this.getWeekDays(mondayDate);
    const firstDay = weekDays[0];
    const lastDay = weekDays[6];

    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    const d1 = firstDay.getDate();
    const m1 = monthNames[firstDay.getMonth()];
    const d2 = lastDay.getDate();
    const m2 = monthNames[lastDay.getMonth()];
    const y2 = lastDay.getFullYear();

    if (firstDay.getMonth() === lastDay.getMonth()) {
      return `${d1} a ${d2} de ${m1} de ${y2}`;
    }
    return `${d1} de ${m1} a ${d2} de ${m2} de ${y2}`;
  }
};
