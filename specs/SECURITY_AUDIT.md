# Security & Architecture Audit Report — Organizador Semanal (Planner)

## Executive Summary

Foi realizada uma auditoria técnica profunda de segurança, autorização, RLS, integridade de dados e arquitetura em 100% da base de código do **Organizador Semanal (Planner)**.

A auditoria identificou **2 Vulnerabilidades CRÍTICAS**, **2 Vulnerabilidades ALTAS**, **3 Vulnerabilidades MÉDIAS** e **2 Vulnerabilidades BAIXAS**.

Todas as vulnerabilidades foram mapeadas com cenários de ataque, impacto real e plano detalhado de remediação imediata.

---

## Vulnerability Summary Matrix

| ID | Severidade | Área | Descrição do Problema | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **CRITICAL** | Authorization / RLS | **Escalação de Privilégios via UPDATE em `user_profiles`**: Política RLS permite ao usuário comum alterar seu próprio `role` para `admin`. | Identificado / Remediação Pronta |
| **SEC-02** | **CRITICAL** | Authorization / Client | **Determinação de Papel Baseada em Lógica de Cliente / Prefixo de E-mail**: `supabaseService.js` deduz papel `admin` se o e-mail começar com `alcides`. | Identificado / Remediação Pronta |
| **SEC-03** | **HIGH** | Data Integrity / DoS | **Colisão de Chave Primária Cross-Tenant em `meal_plans`**: Uso de `id = 'meal_' + dateKey` impede múltiplos usuários de salvar no mesmo dia. | Identificado / Remediação Pronta |
| **SEC-04** | **HIGH** | Session Hygiene | **Risco de Vazamento de Estado em Memória no Logout**: Estado da Store não limpa dados em memória durante troca de sessão no mesmo navegador. | Identificado / Remediação Pronta |
| **SEC-05** | **MEDIUM** | Least Privilege / SQL | **Concessão Excessiva `GRANT ALL TO anon`**: Papel anônimo com privilégios desnecessários de DML no schema `public`. | Identificado / Remediação Pronta |
| **SEC-06** | **MEDIUM** | Persistence / Integrity | **Fallback Silencioso de Persistência**: App comuta silenciosamente para `localStorage` ao falhar comunicação em modo cloud. | Identificado / Remediação Pronta |
| **SEC-07** | **MEDIUM** | Front-End XSS | **Injeção de XSS em Atributos DOM e Ícones**: Falta de escape de atributos (`aria-label`, `title`) e campos de ícone. | Identificado / Remediação Pronta |
| **SEC-08** | **LOW** | Code Cleanliness | **Código Legado / Morto (`userModal.js`)**: Componente quebrado referenciando `state.users` pré-Supabase. | Identificado / Remediação Pronta |
| **SEC-09** | **LOW** | Database Constraints | **Ausência de CHECK Constraints Estritas**: Falta de validação no banco para categorias e tipos de recorrência válidos. | Identificado / Remediação Pronta |

---

## Detailed Findings & Attack Scenarios

### ID: SEC-01
* **Severity**: **CRITICAL**
* **Location**: `supabase_schema.sql` (Linha 42-45)
* **Problem**: A política `user_profiles_update` foi definida como `using (auth.uid() = id)`. Não existe restrição para impedir a modificação da coluna `role` ou `is_active`.
* **Attack Scenario**:
  Um atacante registrado como `member` abre o Console do Navegador (F12) e executa:
  ```javascript
  const client = supabaseConfig.getClient();
  await client.from('user_profiles').update({ role: 'admin' }).eq('id', client.auth.user().id);
  ```
  O banco de dados aceita a instrução porque `auth.uid() = id` é verdadeiro. O membro comum agora é um Administrador Master com acesso a todos os recursos.
* **Impact**: Perda total de isolamento e controle de governança.
* **Remediation**:
  Criar um trigger PostgreSQL `protect_user_profile_security_fields()` que impeça qualquer alteração nas colunas `role` e `is_active` a menos que o executor seja `public.is_admin() = true`.

---

### ID: SEC-02
* **Severity**: **CRITICAL**
* **Location**: `js/storage/supabaseService.js` (Linha 68-75)
* **Problem**: A função `fetchUserProfile` continha:
  ```javascript
  const isAdminUser = currentUser.email?.toLowerCase().startsWith('alcides');
  role: isAdminUser ? 'admin' : (currentUser.user_metadata?.role || 'member')
  ```
* **Attack Scenario**:
  Qualquer usuário com e-mail `alcides.qualquercoisa@gmail.com` ou manipulando `raw_user_meta_data` via payload no cadastro obteria papel de `admin`.
* **Impact**: Falsa atribuição de privilégios de governança sem autorização formal do banco.
* **Remediation**:
  Remover completamente toda lógica de dedução de papel no cliente. O perfil deve ser inserido com `role = 'member'` padrão pelo banco de dados. Apenas um admin pré-existente ou o provisionamento formal do backend pode promover um usuário a `admin`.

---

### ID: SEC-03
* **Severity**: **HIGH**
* **Location**: `supabase_schema.sql` (Linha 140) & `js/storage/supabaseService.js` (Linha 390)
* **Problem**: A tabela `meal_plans` foi criada com `id text primary key`, e o cliente gera o ID como `meal_YYYY-MM-DD`.
* **Attack Scenario**:
  1. Usuário A salva seu plano alimentar de `2026-08-25` (`id = meal_2026-08-25`, `user_id = user_A`).
  2. Usuário B tenta salvar seu plano alimentar para a mesma data `2026-08-25`.
  3. O PostgreSQL tenta inserir `id = meal_2026-08-25` e detecta duplicidade de Chave Primária. Ao tentar fazer upsert, a regra de RLS de User B (`auth.uid() = user_id`) rejeita a atualização da linha de User A.
  4. User B sofre Denial of Service e fica permanentemente impossibilitado de salvar refeições no dia `2026-08-25`.
* **Impact**: Quebra de integridade de dados e indisponibilidade funcional para múltiplos usuários.
* **Remediation**:
  Mudar a chave primária ou criar constraint única em `(user_id, date_key)`. O `id` deve ser `uuid primary key default gen_random_uuid()` ou composto por `user_id || '_' || date_key`.

---

### ID: SEC-04
* **Severity**: **HIGH**
* **Location**: `js/state/store.js` & `js/storage/supabaseService.js`
* **Problem**: Ao realizar logout (`signOut`), os arrays `this.activities`, `this.habits` e `this.meals` permaneciam carregados na memória da Store até uma nova re-sincronização.
* **Attack Scenario**:
  Em computadores compartilhados ou de quiosque, o Usuário A clica em Sair. Se o Usuário B abrir o modal de atividades antes da finalização da nova sessão, pode visualizar temporariamente os dados de A armazenados na memória RAM do navegador.
* **Impact**: Violação de privacidade em ambientes multiusuário.
* **Remediation**:
  Limpar integralmente todos os estados de dados (`activities = []`, `habits = []`, `meals = {}`, `userProfile = null`) no momento do `signOut`.

---

### ID: SEC-05
* **Severity**: **MEDIUM**
* **Location**: `supabase_schema.sql` (Linha 160-165)
* **Problem**: `grant all on all tables in schema public to anon;`.
* **Impact**: Embora o RLS bloqueie ações não autorizadas, conceder privilégios `ALL` (incluindo `DELETE`, `UPDATE`, `INSERT`) para a role pública `anon` viola o princípio de menor privilégio.
* **Remediation**:
  Revogar todos os privilégios de escrita de `anon`. Conceder apenas `GRANT SELECT` estrito e `GRANT USAGE ON SCHEMA public`. Conceder `INSERT, SELECT, UPDATE, DELETE` exclusivamente para o papel `authenticated`.

---

### ID: SEC-06
* **Severity**: **MEDIUM**
* **Location**: `js/state/store.js` (Linha 120-140)
* **Problem**: Se o cliente estiver configurado com Supabase mas a requisição falhar, a Store executa fallback silencioso para `localStorage`.
* **Impact**: O usuário pode continuar alterando dados localmente acreditando estar sincronizado na nuvem, gerando divergência irreparável de dados (split-brain).
* **Remediation**:
  Tratar explicitamente as falhas de rede em modo cloud com avisos visuais claros de erro de sincronização sem sobrescrever ou desviar dados silenciosamente.

---

### ID: SEC-07
* **Severity**: **MEDIUM**
* **Location**: `js/ui/weekView.js`, `js/ui/habitTrackerView.js`, `js/ui/todayView.js`
* **Problem**: Interpolação de variáveis em atributos HTML sem escape:
  `aria-label="${activity.title}"` e `<span class="habit-icon">${habit.icon}</span>`.
* **Impact**: Se um título de atividade contiver aspas duplas ou código malicioso, pode injetar atributos no elemento DOM ou executar scripts (XSS).
* **Remediation**:
  Aplicar `this.escapeHtml()` em 100% dos atributos e interpolações de strings vindas de dados de usuário.

---

## Remediation Plan

1. **Database Hardening (`supabase_schema.sql`)**:
   - Criar trigger de proteção contra escalação de privilégios (`protect_user_profile_security_fields`).
   - Corrigir a tabela `meal_plans` com `id text primary key default gen_random_uuid()` e `unique (user_id, date_key)`.
   - Implementar CHECK constraints para validação de entrada de dados (`categories`, `recurrence`, `status`).
   - Aplicar Grants de Menor Privilégio (`REVOKE ALL FROM anon`, conceder apenas o necessário para `authenticated`).
2. **Client-Side Hardening (`store.js`, `supabaseService.js`)**:
   - Remover qualquer dedução de papel no cliente.
   - Limpar dados em memória no logout.
   - Tratar erros de rede sem fallback mascarador de sincronização.
3. **DOM Sanitization & UI Hardening**:
   - Escapar todos os atributos HTML e campos dinâmicos em `weekView.js`, `habitTrackerView.js`, `todayView.js`, `mealPlanView.js`, `activityModal.js`.
   - Remover arquivo morto legado `userModal.js`.
4. **Security Test Suite (`tests/security_tests.js`)**:
   - Criar suíte de testes de regressão de segurança cobrindo isolamento de usuários, proteção contra escalação de privilégios e validação de dados.
