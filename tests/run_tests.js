/**
 * @file run_tests.js
 * Automated test runner for Organizador Semanal.
 * Executes Domain Model tests, Timezone safety tests, and Adversarial Security tests.
 */

import { DateUtils, RECURRENCE_TYPES, generateId } from '../js/domain/models.js';
import { RecurrenceEngine } from '../js/domain/recurrence.js';
import { HabitUtils } from '../js/domain/habitsModel.js';
import { MealUtils } from '../js/domain/mealPlanModel.js';
import { runSecurityTestSuite } from './security_tests.js';

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

const dateStr = '2026-08-24';
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

habit = HabitUtils.toggleDate(habit, '2026-08-24');
habit = HabitUtils.toggleDate(habit, '2026-08-25');
assert(HabitUtils.isCompletedOnDate(habit, '2026-08-24'), 'Hábito deve estar marcado na segunda 24/08');
assert(HabitUtils.isCompletedOnDate(habit, '2026-08-25'), 'Hábito deve estar marcado na terça 25/08');
assert(!HabitUtils.isCompletedOnDate(habit, '2026-08-26'), 'Hábito NÃO deve estar marcado na quarta 26/08');

const weeklyStats = HabitUtils.getWeeklyStats(habit, weekDays);
assert(weeklyStats.completedCount === 2, `Progresso semanal deve contar 2 dias concluídos (obteve: ${weeklyStats.completedCount})`);
assert(weeklyStats.percentage === 29, `Porcentagem semanal 2/7 deve ser 29% (obteve: ${weeklyStats.percentage}%)`);

const monthStats = HabitUtils.getMonthStats(habit, 2026, 7);
assert(monthStats.totalDays === 31, 'Agosto de 2026 deve ter 31 dias');
assert(monthStats.completedCount === 2, 'Agosto deve ter 2 dias concluídos');
assert(monthStats.percentage === 6, 'Consistência mensal de 2/31 deve ser 6%');

// --------------------------------------------------------------------------
// TEST GROUP 5: Weekly Meal Planner & Checkboxes
// --------------------------------------------------------------------------
console.log('\n[5/6] Testando Plano Alimentar e Checkboxes...');

const emptyDay = MealUtils.getEmptyDayMeals();
assert(emptyDay.breakfast.completed === false, 'Café da manhã inicia não concluído');
assert(emptyDay.lunch.completed === false, 'Almoço inicia não concluído');
assert(emptyDay.snack.completed === false, 'Lanche inicia não concluído');
assert(emptyDay.dinner.completed === false, 'Jantar inicia não concluído');

// --------------------------------------------------------------------------
// TEST GROUP 6: Adversarial Security & Architecture Tests
// --------------------------------------------------------------------------
console.log('\n[6/6] Executando Suíte de Testes de Segurança Adversariais...');

const secResults = runSecurityTestSuite((res) => {
  if (res.status === 'PASS') {
    console.log(`  \x1b[32m✔ PASS [SECURITY]:\x1b[0m ${res.name}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖ FAIL [SECURITY]:\x1b[0m ${res.name} - ${res.details}`);
    failed++;
  }
});

console.log('\n======================================================');
console.log(` RESULTADO FINAL: ${passed} PASSOU / ${failed} FALHOU (Total: ${passed + failed})`);
console.log('======================================================\n');
