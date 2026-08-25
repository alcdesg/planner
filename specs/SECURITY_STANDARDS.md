# Security & Engineering Standards — Organizador Semanal (Planner)

Este documento estabelece as regras permanentes e inegociáveis de engenharia e segurança para qualquer desenvolvimento na base de código do **Organizador Semanal**.

---

## 1. Regra Fundamental: Frontend Não Tem Autoridade

* O frontend é **exclusivamente uma camada de Apresentação e UX**.
* Qualquer verificação de papel (`store.isAdmin()`), visibilidade de botão ou validação de formulário existe para conveniência do usuário.
* **Toda regra de segurança, isolamento, autorização e integridade deve ser validada e forçada no PostgreSQL (RLS, Constraints, Grants, Triggers, Views/Funções)**.
* Se um usuário malicioso inspecionar o tráfego, abrir o Console (F12) ou usar `cURL` contra a API do Supabase, o banco de dados deve rejeitar qualquer ação não autorizada.

---

## 2. Zero Trust & Controle Estrito de Roles (RBAC)

1. **Separação de Privilégios no Banco**:
   - `user_profiles` é dividida em campos editáveis pelo usuário (`name`, `theme`) e campos controlados pelo sistema/administrador (`role`, `is_active`).
   - A política de `UPDATE` para usuários normais em `user_profiles` **NUNCA** permite alterar `role` ou `is_active`.
   - Adicionalmente, um trigger `BEFORE UPDATE` rejeita e dispara exceção se `NEW.role <> OLD.role` ou `NEW.is_active <> OLD.is_active` quando o executor não for administrador autenticado verificado por contexto seguro.
2. **Zero Lógica de Roles no Cliente**:
   - O frontend **NUNCA** deduz privilégios com base em e-mail, prefixo, metadata vinda de formulário ou `localStorage`.
   - A role padrão de qualquer novo cadastro é `member`. Apenas outro administrador autenticado via função protegida de backend pode promover usuários.

---

## 3. Modelo de Dados, Chaves Primárias e Concorrência

1. **Chaves Primárias Universais (UUID v4)**:
   - **NUNCA** utilizar strings concatenadas ou chaves compostas como PK (`user_id + '_' + date`).
   - Todas as tabelas (`activities`, `habits`, `meal_plans`, `user_profiles`) utilizam **`id uuid primary key default gen_random_uuid()`**.
   - Unicidade de negócio é garantida através de constraints explícitas: `unique (user_id, date_key)` em `meal_plans`.
2. **Integridade Referencial & Cascading**:
   - Todo registro filho referencia `auth.users(id) on delete cascade` via coluna `user_id uuid not null`.
   - `NOT NULL` e `CHECK constraints` estritas para categorias, formatos de data (`YYYY-MM-DD`), horários (`HH:MM`) e limites de caracteres.
3. **Concorrência e Timestamps**:
   - Todas as tabelas possuem `created_at timestamptz default now()` e `updated_at timestamptz default now()`.
   - Triggers automáticos atualizam `updated_at` na modificação de linhas.

---

## 4. Row Level Security (RLS) & Princípio do Menor Privilégio

1. **Políticas Granulares Obrigatórias**:
   - Cada tabela com RLS ativo **DEVE** ter políticas separadas por operação:
     - `SELECT`: `using (auth.uid() = user_id)` (ou `is_admin()` onde aplicável)
     - `INSERT`: `with check (auth.uid() = user_id)`
     - `UPDATE`: `using (auth.uid() = user_id) with check (auth.uid() = user_id)`
     - `DELETE`: `using (auth.uid() = user_id)`
   - Proibido o uso de `FOR ALL` genérico em tabelas com diferentes regras por ação.
2. **Grants Estritos**:
   - O papel `anon` possui **ZERO permissão de escrita** (`REVOKE INSERT, UPDATE, DELETE FROM anon`).
   - `anon` recebe apenas `USAGE` no schema `public` e `SELECT` apenas se houver necessidade pública explicitamente justificada.
   - O papel `authenticated` recebe privilégios mínimos necessários (`SELECT, INSERT, UPDATE, DELETE`).
3. **Funções PostgreSQL & `SECURITY DEFINER`**:
   - Funções `SECURITY DEFINER` devem conter obrigatoriamente:
     - `SET search_path = public, pg_temp;`
     - Qualificação explícita de schemas em todas as consultas (`public.user_profiles`).
     - `REVOKE EXECUTE ON FUNCTION FROM public, anon;`
     - `GRANT EXECUTE ON FUNCTION TO authenticated;`

---

## 5. Estratégia de Defesa contra XSS

1. **Prioridade para Construção Segura de DOM**:
   - Utilizar manipulação estrutural de DOM (`createElement`, `textContent`, `setAttribute`) sempre que possível.
2. **Sanitização Canônica para Templates**:
   - Quando template literals forem necessários para performance de renderização de listas, todos os dados fornecidos pelo usuário **DEVEM** passar por uma função de escape canônica e imutável que neutraliza tanto conteúdo textual (`<script>`, tags HTML) quanto injeção em atributos (`"`, `'`, `&`, backticks).
   - Proibida a inserção direta de dados de usuário em atributos de manipuladores de eventos (`onclick="..."`). Eventos devem ser anexados via `addEventListener`.

---

## 6. Persistência & Higiene de Sessão

1. **Zero Fallback Silencioso**:
   - Quando a aplicação estiver configurada em modo Supabase Cloud, qualquer falha de rede deve ser comunicada transparentemente ao usuário como erro de sincronização.
   - O sistema **NUNCA** deve comutar silenciosamente para `localStorage` mascarando falhas de persistência.
2. **Higiene de Memória no Logout**:
   - O processo de `signOut` deve purgar imediatamente todos os arrays, mapas e objetos de dados da memória da aplicação (`store.resetState()`), evitando persistência de dados em navegadores compartilhados.

---

## 7. Testes de Segurança Adversariais

Toda funcionalidade deve ser acompanhada de testes automatizados que simulem vetores de ataque reais:
1. **Tentativa de IDOR**: Usuário A tentando ler, criar, editar ou excluir dados de Usuário B.
2. **Tentativa de Escalação de Privilégio**: Usuário comum tentando enviar `role = 'admin'` via payload direto.
3. **Tentativa de Injeção de XSS**: Payloads com tags `<script>`, `onload=`, `javascript:` e aspas.
4. **Tentativa de Bypass de Autenticação**: Requisições sem token válido tentando acessar recursos privados.
