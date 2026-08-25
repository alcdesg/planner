/**
 * @file run_tests.js
 * Automated test suite for Organizador Semanal.
 * Verifies domain models, timezone safety, recurrence, Habit Tracker, and Meal Planner.
 */

import { DateUtils, RECURRENCE_TYPES, generateId } from '../js/domain/models.js';
import { RecurrenceEngine } from '../js/domain/recurrence.js';
import { HabitUtils } from '../js/domain/habitsModel.js';
import { MealUtils } from '../js/domain/mealPlanModel.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${message}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log(' ORGANIZADOR SEMANAL - SUÍTE DE TESTES AUTOMATIZADOS');
console.log('======================================================\n');

// --------------------------------------------------------------------------
// TEST GROUP 1: DateUtils & Timezone Safety
// --------------------------------------------------------------------------
console.log('[1/6] Testando Utilitários de Data e Imunidade a Fuso Horário...');

const dateStr = '2026-08-24'; // Segunda-feira
const formatted = DateUtils.formatDateKey(dateStr);
assert(formatted === '2026-08-24', `formatDateKey de "${dateStr}" deve ser "2026-08-24"`);

const parsed = DateUtils.parseDateKey(dateStr);
assert(parsed.getDate() === 24, `parseDateKey("2026-08-24").getDate() deve ser 24`);

const monday = DateUtils.getMondayOfWeek('2026-08-27');
const weekDays = DateUtils.getWeekDays(monday);
assert(weekDays.length === 7, `Semana deve conter 7 dias`);

// --------------------------------------------------------------------------
// TEST GROUP 2: Non-recurring activities
// --------------------------------------------------------------------------
console.log('\n[2/6] Testando Criação e Exibição de Atividades Simples...');

const singleActivity = {
  id: generateId(),
  userId: 'usr_test',
  title: 'Consulta Médica',
  date: '2026-08-26',
  time: '14:30',
  category: 'saude',
  recurrence: RECURRENCE_TYPES.NONE
};

assert(RecurrenceEngine.occursOnDate(singleActivity, '2026-08-26'), 'Atividade simples ocorre exatamente em 2026-08-26');
assert(!RecurrenceEngine.occursOnDate(singleActivity, '2026-08-24'), 'Atividade simples NÃO ocorre na segunda 2026-08-24');

// --------------------------------------------------------------------------
// TEST GROUP 3: Recurrence & Overrides
// --------------------------------------------------------------------------
console.log('\n[3/6] Testando Recorrências e Overrides de Ocorrência Única...');

const recurringActivity = {
  id: generateId(),
  userId: 'usr_test',
  title: 'Treino Funcional',
  date: '2026-08-24',
  time: '18:00',
  category: 'saude',
  recurrence: RECURRENCE_TYPES.CUSTOM_DAYS,
  recurrenceDays: [2, 3, 4],
  recurrenceEndDate: '2026-08-28',
  completedDates: ['2026-08-25'],
  overrides: {
    '2026-08-26': { title: 'Treino Especial', time: '19:00' }
  },
  deletedDates: ['2026-08-27']
};

assert(RecurrenceEngine.occursOnDate(recurringActivity, '2026-08-25'), 'Ocorre na Terça (25/08)');
assert(RecurrenceEngine.occursOnDate(recurringActivity, '2026-08-26'), 'Ocorre na Quarta (26/08)');
assert(!RecurrenceEngine.occursOnDate(recurringActivity, '2026-08-27'), 'NÃO ocorre na Quinta pois foi cancelada individualmente');

const recurringMap = RecurrenceEngine.resolveWeekActivities([recurringActivity], weekDays);
const wednesdayOccur = recurringMap.get('2026-08-26')[0];
assert(wednesdayOccur.title === 'Treino Especial', 'Título na quarta-feira possui override "Treino Especial"');

// --------------------------------------------------------------------------
// TEST GROUP 4: Habit Tracker (Weekly & Monthly)
// --------------------------------------------------------------------------
console.log('\n[4/6] Testando Habit Tracker (Semanal e Mensal)...');

let habit = HabitUtils.createHabit('usr_test', 'Beber 2L de água', '💧', 7);
assert(habit.name === 'Beber 2L de água', 'Nome do hábito deve ser "Beber 2L de água"');
assert(habit.icon === '💧', 'Ícone do hábito deve ser "💧"');

// Toggle completion for Monday and Tuesday
habit = HabitUtils.toggleDate(habit, '2026-08-24');
habit = HabitUtils.toggleDate(habit, '2026-08-25');
assert(HabitUtils.isCompletedOnDate(habit, '2026-08-24'), 'Hábito deve estar marcado na segunda 24/08');
assert(HabitUtils.isCompletedOnDate(habit, '2026-08-25'), 'Hábito deve estar marcado na terça 25/08');
assert(!HabitUtils.isCompletedOnDate(habit, '2026-08-26'), 'Hábito NÃO deve estar marcado na quarta 26/08');

const weeklyStats = HabitUtils.getWeeklyStats(habit, weekDays);
assert(weeklyStats.completedCount === 2, `Progresso semanal deve contar 2 dias concluídos (obteve: ${weeklyStats.completedCount})`);
assert(weeklyStats.percentage === 29, `Porcentagem semanal 2/7 deve ser 29% (obteve: ${weeklyStats.percentage}%)`);

// Monthly Stats for August 2026 (31 days)
const monthStats = HabitUtils.getMonthStats(habit, 2026, 7); // Month 7 is August
assert(monthStats.totalDays === 31, 'Agosto de 2026 deve ter 31 dias');
assert(monthStats.completedCount === 2, 'Agosto deve ter 2 dias concluídos');
assert(monthStats.percentage === 6, 'Consistência mensal de 2/31 deve ser 6%');

// --------------------------------------------------------------------------
// TEST GROUP 5: Weekly Meal Planner & Checkboxes
// --------------------------------------------------------------------------
console.log('\n[5/6] Testando Plano Alimentar Semanal com Checkboxes...');

const emptyMeals = MealUtils.getDayMeals({}, '2026-08-24');
assert(emptyMeals.breakfast.text === '', 'Café da manhã vazio deve ter texto vazio');
assert(emptyMeals.breakfast.completed === false, 'Café da manhã vazio não deve estar concluído');

const mealsMap = {
  '2026-08-24': {
    breakfast: { text: 'Ovos mexidos + Café', completed: true },
    lunch: { text: 'Frango grelhado + Arroz', completed: false }
  }
};

const mondayMeals = MealUtils.getDayMeals(mealsMap, '2026-08-24');
assert(mondayMeals.breakfast.text === 'Ovos mexidos + Café', 'Texto do café da manhã deve coincidir');
assert(mondayMeals.breakfast.completed === true, 'Café da manhã deve estar marcado como concluído');
assert(mondayMeals.lunch.completed === false, 'Almoço não deve estar concluído');

// --------------------------------------------------------------------------
// TEST GROUP 6: Storage Backup Structure
// --------------------------------------------------------------------------
console.log('\n[6/6] Testando Estrutura de Backup JSON v1.2...');

const backupObj = {
  version: '1.2',
  exportedAt: new Date().toISOString(),
  users: [{ id: 'usr_test', name: 'Teste', avatarInitial: 'T' }],
  userData: {
    usr_test: {
      activities: [singleActivity],
      habits: [habit],
      meals: mealsMap,
      settings: { theme: 'dark' }
    }
  }
};

const json = JSON.stringify(backupObj);
const parsedBackup = JSON.parse(json);
assert(parsedBackup.version === '1.2', 'Backup version deve ser 1.2');
assert(parsedBackup.userData.usr_test.habits.length === 1, 'Backup deve conter 1 hábito');
assert(parsedBackup.userData.usr_test.meals['2026-08-24'].breakfast.text === 'Ovos mexidos + Café', 'Backup deve conter as refeições');

console.log('\n======================================================');
if (failed === 0) {
  console.log(`\x1b[32m✔ TODOS OS ${passed} TESTES PASSARAM COM SUCESSO!\x1b[0m`);
} else {
  console.error(`\x1b[31m✖ ${failed} TESTES FALHARAM! (${passed} passaram)\x1b[0m`);
}
console.log('======================================================\n');

process.exit(failed === 0 ? 0 : 1);
