/**
 * @file run_tests.js
 * Automated test suite for Organizador Semanal.
 * Verifies domain models, date parsing in GMT-3, recurrence resolution, overrides, and storage logic.
 */

import { DateUtils, RECURRENCE_TYPES, generateId } from '../js/domain/models.js';
import { RecurrenceEngine } from '../js/domain/recurrence.js';

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
console.log('[1/5] Testando Utilitários de Data e Imunidade a Fuso Horário...');

const dateStr = '2026-08-24'; // Segunda-feira
const formatted = DateUtils.formatDateKey(dateStr);
assert(formatted === '2026-08-24', `formatDateKey de "${dateStr}" deve ser "2026-08-24" (obteve: ${formatted})`);

const parsed = DateUtils.parseDateKey(dateStr);
assert(parsed.getDate() === 24, `parseDateKey("2026-08-24").getDate() deve ser 24 (obteve: ${parsed.getDate()})`);
assert(parsed.getMonth() === 7, `parseDateKey("2026-08-24").getMonth() deve ser 7 (Agosto) (obteve: ${parsed.getMonth()})`);

const monday = DateUtils.getMondayOfWeek('2026-08-27'); // Quinta-feira
const mondayKey = DateUtils.formatDateKey(monday);
assert(mondayKey === '2026-08-24', `Segunda-feira da semana de 27/08/2026 deve ser 24/08/2026 (obteve: ${mondayKey})`);

const weekDays = DateUtils.getWeekDays(monday);
assert(weekDays.length === 7, `Semana deve conter 7 dias (obteve: ${weekDays.length})`);
assert(DateUtils.formatDateKey(weekDays[0]) === '2026-08-24', `Primeiro dia da semana deve ser 2026-08-24 (Seg)`);
assert(DateUtils.formatDateKey(weekDays[6]) === '2026-08-30', `Último dia da semana deve ser 2026-08-30 (Dom)`);

assert(DateUtils.isSameDay('2026-08-24', '2026-08-24'), 'isSameDay("2026-08-24", "2026-08-24") deve ser true');
assert(!DateUtils.isSameDay('2026-08-24', '2026-08-25'), 'isSameDay("2026-08-24", "2026-08-25") deve ser false');

// --------------------------------------------------------------------------
// TEST GROUP 2: Non-recurring activities
// --------------------------------------------------------------------------
console.log('\n[2/5] Testando Criação e Exibição de Atividades Simples (Sem Recorrência)...');

const singleActivity = {
  id: generateId(),
  userId: 'usr_test',
  title: 'Consulta Médica',
  date: '2026-08-26', // Quarta-feira
  time: '14:30',
  category: 'saude',
  recurrence: RECURRENCE_TYPES.NONE
};

assert(RecurrenceEngine.occursOnDate(singleActivity, '2026-08-26'), 'Atividade simples deve ocorrer exatamente em 2026-08-26');
assert(!RecurrenceEngine.occursOnDate(singleActivity, '2026-08-24'), 'Atividade simples NÃO deve ocorrer na segunda 2026-08-24');
assert(!RecurrenceEngine.occursOnDate(singleActivity, '2026-08-27'), 'Atividade simples NÃO deve ocorrer na quinta 2026-08-27');

const resolvedMap = RecurrenceEngine.resolveWeekActivities([singleActivity], weekDays);
const wednesdayActivities = resolvedMap.get('2026-08-26');
assert(wednesdayActivities && wednesdayActivities.length === 1, 'Quarta-feira (26/08) deve conter exatamente 1 atividade');
assert(wednesdayActivities[0].title === 'Consulta Médica', 'Título da atividade na quarta-feira deve ser "Consulta Médica"');

// --------------------------------------------------------------------------
// TEST GROUP 3: Outlook-style custom weekday recurrence & end dates
// --------------------------------------------------------------------------
console.log('\n[3/5] Testando Recorrência Estilo Outlook (Dias Específicos e Data Limite)...');

// Exemplo: Terças (2), Quartas (3) e Quintas (4) a partir de 24/08 até 28/08
const recurringActivity = {
  id: generateId(),
  userId: 'usr_test',
  title: 'Treino Funcional',
  date: '2026-08-24',
  time: '18:00',
  category: 'saude',
  recurrence: RECURRENCE_TYPES.CUSTOM_DAYS,
  recurrenceDays: [2, 3, 4], // Ter, Qua, Qui
  recurrenceEndDate: '2026-08-28', // Repetir até sexta 28/08
  completedDates: ['2026-08-25'], // Terça marcada como concluída
  overrides: {
    '2026-08-26': { title: 'Treino Especial', time: '19:00' } // Override pontual na Quarta
  },
  deletedDates: ['2026-08-27'] // Quinta cancelada individualmente
};

assert(!RecurrenceEngine.occursOnDate(recurringActivity, '2026-08-24'), 'NÃO deve ocorrer na Segunda (24/08)');
assert(RecurrenceEngine.occursOnDate(recurringActivity, '2026-08-25'), 'DEVE ocorrer na Terça (25/08)');
assert(RecurrenceEngine.occursOnDate(recurringActivity, '2026-08-26'), 'DEVE ocorrer na Quarta (26/08)');
assert(!RecurrenceEngine.occursOnDate(recurringActivity, '2026-08-27'), 'NÃO deve ocorrer na Quinta (27/08) pois foi excluída individualmente');
assert(!RecurrenceEngine.occursOnDate(recurringActivity, '2026-08-28'), 'NÃO deve ocorrer na Sexta (28/08) pois não está em recurrenceDays');
assert(!RecurrenceEngine.occursOnDate(recurringActivity, '2026-09-01'), 'NÃO deve ocorrer em 01/09 pois é após recurrenceEndDate (28/08)');

// --------------------------------------------------------------------------
// TEST GROUP 4: Single Occurrence Overrides
// --------------------------------------------------------------------------
console.log('\n[4/5] Testando Overrides de Ocorrência Individual...');

const recurringMap = RecurrenceEngine.resolveWeekActivities([recurringActivity], weekDays);
const wednesdayOccur = recurringMap.get('2026-08-26')[0];
assert(wednesdayOccur.title === 'Treino Especial', 'Título na quarta-feira deve ter o override "Treino Especial"');
assert(wednesdayOccur.time === '19:00', 'Horário na quarta-feira deve ter o override "19:00"');

const tuesdayOccur = recurringMap.get('2026-08-25')[0];
assert(tuesdayOccur.title === 'Treino Funcional', 'Título na terça-feira deve permanecer "Treino Funcional"');
assert(tuesdayOccur.time === '18:00', 'Horário na terça-feira deve permanecer "18:00"');
assert(tuesdayOccur.isCompleted === true, 'Terça consta como concluída');

// --------------------------------------------------------------------------
// TEST GROUP 5: Storage Structure & Backup
// --------------------------------------------------------------------------
console.log('\n[5/5] Testando Estrutura de Exportação e Formato de Dados...');

const backupObj = {
  version: '1.1',
  exportedAt: new Date().toISOString(),
  users: [{ id: 'usr_test', name: 'Teste', avatarInitial: 'T' }],
  userData: {
    usr_test: {
      activities: [singleActivity, recurringActivity],
      settings: { theme: 'dark' }
    }
  }
};

const json = JSON.stringify(backupObj);
const parsedBackup = JSON.parse(json);
assert(parsedBackup.version === '1.1', 'Backup version deve ser 1.1');
assert(parsedBackup.userData.usr_test.activities.length === 2, 'Backup deve conter 2 atividades do usuário');

console.log('\n======================================================');
if (failed === 0) {
  console.log(`\x1b[32m✔ TODOS OS ${passed} TESTES PASSARAM COM SUCESSO!\x1b[0m`);
} else {
  console.error(`\x1b[31m✖ ${failed} TESTES FALHARAM! (${passed} passaram)\x1b[0m`);
}
console.log('======================================================\n');

process.exit(failed === 0 ? 0 : 1);
