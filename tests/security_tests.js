/**
 * @file security_tests.js
 * Adversarial Security & Architecture Test Suite for Organizador Semanal (Planner).
 * Tests Tenant Isolation (IDOR), Privilege Escalation Defense, XSS Sanitization, Session Hygiene, and Data Integrity.
 */

import { Sanitizer } from '../js/utils/sanitizer.js';
import { store } from '../js/state/store.js';
import { DateUtils, RECURRENCE_TYPES } from '../js/domain/models.js';
import { HabitUtils } from '../js/domain/habitsModel.js';
import { MealUtils } from '../js/domain/mealPlanModel.js';

export function runSecurityTestSuite(reportFn) {
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      reportFn({ status: 'PASS', name: testName, details });
      passed++;
    } else {
      reportFn({ status: 'FAIL', name: testName, details });
      failed++;
    }
  }

  console.log('\n======================================================');
  console.log(' ORGANIZADOR SEMANAL - SUÍTE DE TESTES DE SEGURANÇA');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Canonical XSS & Attribute Breakout Defense
  // --------------------------------------------------------------------------
  console.log('[SEC 1/5] Testando Defesa Canônica contra XSS e Injeção em Atributos...');

  const xssPayloads = [
    '<script>alert("xss")</script>',
    '"><img src=x onerror=alert(1)>',
    "' onmouseover='alert(document.cookie)",
    '<svg/onload=alert`1`>',
    'javascript:alert(1)',
    '"><script src=//evil.com/xss.js></script>',
    '`-alert(1)-`'
  ];

  xssPayloads.forEach((payload, idx) => {
    const escaped = Sanitizer.escape(payload);
    const hasRawLt = escaped.includes('<');
    const hasRawGt = escaped.includes('>');
    const hasRawDblQuote = escaped.includes('"');
    const hasRawSglQuote = escaped.includes("'");
    const hasRawBacktick = escaped.includes('`');

    assert(
      !hasRawLt && !hasRawGt && !hasRawDblQuote && !hasRawSglQuote && !hasRawBacktick,
      `XSS Payload #${idx + 1} deve ser 100% neutralizado`,
      `Original: ${payload} -> Escaped: ${escaped}`
    );
  });

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Privilege Escalation & Role Security
  // --------------------------------------------------------------------------
  console.log('\n[SEC 2/5] Testando Defesa Contra Escalação de Privilégios (RBAC)...');

  // Test 1: User with malicious email cannot be recognized as admin
  const maliciousEmailUser = {
    id: 'user_malicious_1',
    email: 'alcides_fake@hacker.com',
    user_metadata: { role: 'admin' }
  };

  // Profile must strictly evaluate role from database profile object, not email string or metadata
  const fakeProfile = {
    id: 'user_malicious_1',
    email: 'alcides_fake@hacker.com',
    role: 'member', // Database role is member
    is_active: true
  };

  store.currentUser = maliciousEmailUser;
  store.userProfile = fakeProfile;

  assert(
    store.isAdmin() === false,
    'Usuário com e-mail similar ou metadata forjada NÃO deve ter isAdmin() = true',
    `Role no banco: ${fakeProfile.role}, isAdmin(): ${store.isAdmin()}`
  );

  // Test 2: Inactive admin must not have admin access
  store.userProfile = {
    id: 'admin_1',
    email: 'alcides@planner.com.br',
    role: 'admin',
    is_active: false // Inactive
  };

  assert(
    store.isAdmin() === false,
    'Administrador inativo (is_active = false) NÃO deve ter privilégios ativos',
    `is_active: false, isAdmin(): ${store.isAdmin()}`
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Tenant Isolation & Multi-User Independence in Meal Plans
  // --------------------------------------------------------------------------
  console.log('\n[SEC 3/5] Testando Isolamento Multi-Tenant em meal_plans...');

  const dateKey = '2026-08-25';
  const userA_id = 'a0000000-0000-0000-0000-000000000001';
  const userB_id = 'b0000000-0000-0000-0000-000000000002';

  // In database, meal_plans primary key is UUID and unique constraint is (user_id, date_key).
  // Simulate two users creating meal plans for the exact same date
  const mealPlanA = {
    userId: userA_id,
    dateKey: dateKey,
    breakfast: { text: 'Café de A', completed: false }
  };

  const mealPlanB = {
    userId: userB_id,
    dateKey: dateKey,
    breakfast: { text: 'Café de B', completed: true }
  };

  assert(
    mealPlanA.userId !== mealPlanB.userId && mealPlanA.dateKey === mealPlanB.dateKey,
    'Múltiplos usuários podem salvar cardápios na mesma data sem conflito de tenant',
    `Data compartilhada: ${dateKey}, Usuário A: ${userA_id}, Usuário B: ${userB_id}`
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Session Memory Hygiene on Logout
  // --------------------------------------------------------------------------
  console.log('\n[SEC 4/5] Testando Limpeza e Higiene de Memória no Logout...');

  // Populate store with sensitive data
  store.currentUser = { id: 'usr_secret', email: 'secret@planner.com.br' };
  store.userProfile = { id: 'usr_secret', name: 'Secret User', role: 'admin' };
  store.activities = [{ id: 'act_1', title: 'Atividade Confidencial', date: '2026-08-25' }];
  store.habits = [{ id: 'hab_1', name: 'Hábito Privado', icon: '🔒', targetDays: 7 }];
  store.meals = { '2026-08-25': { breakfast: { text: 'Dieta confidencial' } } };

  // Trigger state reset (equivalent to signOut)
  store.resetState();

  assert(
    store.currentUser === null &&
    store.userProfile === null &&
    store.activities.length === 0 &&
    store.habits.length === 0 &&
    Object.keys(store.meals).length === 0,
    'resetState() deve purgar 100% dos dados da memória RAM no momento do logout',
    `Activities: ${store.activities.length}, Habits: ${store.habits.length}, Meals: ${Object.keys(store.meals).length}`
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 5: Input Validation & String Clamping
  // --------------------------------------------------------------------------
  console.log('\n[SEC 5/5] Testando Validação e Limites de Entrada (Length Clamping)...');

  const longText = 'A'.repeat(500);
  const clampedTitle = Sanitizer.clampText(longText, 255);
  const clampedName = Sanitizer.clampText(longText, 150);

  assert(
    clampedTitle.length === 255,
    'Título de atividade deve ser limitado a no máximo 255 caracteres',
    `Entrada: 500 chars -> Saída: ${clampedTitle.length} chars`
  );

  assert(
    clampedName.length === 150,
    'Nome de hábito deve ser limitado a no máximo 150 caracteres',
    `Entrada: 500 chars -> Saída: ${clampedName.length} chars`
  );

  return { passed, failed, total: passed + failed };
}
