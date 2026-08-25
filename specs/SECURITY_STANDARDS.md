# SECURITY & ENGINEERING STANDARDS

Este documento define os 23 princípios fundamentais e mandatórios de segurança, engenharia de software e integridade de dados que regem todas as decisões e desenvolvimentos no **Organizador Semanal (Planner)**.

---

## 1. Frontend Não Tem Autoridade

* O frontend é **exclusivamente uma camada de Apresentação e UX**.
* Verificações no cliente (`store.isAdmin()`, botões ocultos, menus desabilitados) existem unicamente para guiar o usuário legítimo.
* **Toda regra de autorização, isolamento, integridade e negócio deve ser forçada no backend/database**.
* Um usuário com acesso ao DevTools, cURL ou Postman deve ser impedido pelo banco de dados de realizar qualquer operação não autorizada.

---

## 2. Zero Trust & RBAC (Role-Based Access Control)

* Nenhum dado vindo do cliente é confiável por padrão (IDs, parâmetros, payloads JSON, metadata, localStorage).
* O papel do usuário (`role: 'admin' | 'member'`) é determinado exclusivamente pelo registro na tabela `user_profiles` no PostgreSQL.
* Proibida qualquer dedução de papel no cliente por prefixo de e-mail, domínio ou metadata enviada no cadastro.
* A promoção para `admin` exige autorização explícita no banco ou operação por outro administrador autenticado via função de backend protegida.

---

## 3. Identidade e Ownership

* A identidade do usuário autenticado é derivada estritamente de `auth.uid()` fornecido pelo token JWT validado pelo Supabase.
* Em operações de criação (`INSERT`), o campo `user_id` deve receber `default auth.uid()` e ser validado por política RLS `WITH CHECK (auth.uid() = user_id)`.
* É terminantemente proibido aceitar um `user_id` arbitrário enviado pelo cliente sem validação contra `auth.uid()`.

---

## 4. Modelo de Dados e Integridade

* **Chaves Primárias Universais**: Todas as tabelas (`activities`, `habits`, `meal_plans`, `user_profiles`) utilizam **`id uuid primary key default gen_random_uuid()`** (ou string UUID v4). Proibido o uso de concatenações de strings como PK (ex: `user_id + '_' + date`).
* **Unicidade de Negócio**: Relações únicas são garantidas por constraints explícitas (ex: `unique (user_id, date_key)` em `meal_plans`).
* **Integridade Referencial**: Todas as tabelas filhas vinculam-se a `auth.users(id) on delete cascade`.
* **CHECK Constraints**: Restrições em nível de banco para categorias válidas, tipos de recorrência, status, formatos de data (`YYYY-MM-DD`) e limites de tamanho de texto.
* **Timestamps**: Colunas `created_at` e `updated_at` com `default now()` em todas as tabelas.

---

## 5. RLS (Row Level Security) & Least Privilege

* **RLS Ativo Obrigatório**: Toda tabela no schema `public` deve ter `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
* **Políticas Granulares**: Cada tabela deve possuir políticas separadas e explícitas para `SELECT`, `INSERT`, `UPDATE` e `DELETE`. O uso de `FOR ALL` genérico é desencorajado.
* **Princípio do Menor Privilégio nos Grants**:
  * O papel `anon` possui **ZERO permissão de escrita** (`REVOKE ALL FROM anon; GRANT USAGE ON SCHEMA public TO anon;`).
  * O papel `authenticated` recebe apenas os privilégios DML necessários (`SELECT, INSERT, UPDATE, DELETE`).

---

## 6. SECURITY DEFINER & Database Functions

* Funções `SECURITY DEFINER` devem ser usadas com extrema parcimônia e conter obrigatoriamente:
  * `SET search_path = public, pg_temp;`
  * Qualificação explícita de schema em todas as consultas (`public.user_profiles`).
  * Revogação de execução pública: `REVOKE EXECUTE ON FUNCTION ... FROM public, anon;`
  * Concessão restrita: `GRANT EXECUTE ON FUNCTION ... TO authenticated;`

---

## 7. Mass Assignment

* O backend não deve permitir que o cliente atualize campos protegidos de sistema (`role`, `is_active`, `id`, `created_at`) através de payloads de atualização genéricos.
* A tabela `user_profiles` possui política RLS de `UPDATE` com `WITH CHECK` restritivo e trigger `BEFORE UPDATE` que impede modificações em `role` e `is_active` por usuários não-admin.

---

## 8. Input Validation

* Toda entrada é validada em duas camadas:
  1. **Backend/PostgreSQL**: `CHECK constraints`, limites de caracteres (`varchar/length`), expressões regulares de formato e tipos de dados estritos.
  2. **Frontend**: Validação de formulários, limites de atributos (`maxlength`) e clamping de strings via utilitário centralizado.

---

## 9. XSS & DOM Security

* **Sanitização Canônica**: Todo dado textual fornecido pelo usuário interpolado em templates HTML deve passar pelo módulo centralizado `Sanitizer.escape()`.
* **Proteção em Atributos**: O escape neutraliza quebras de atributos (`"`, `'`, `` ` ``), tags (`<`, `>`), ampersand (`&`) e barras (`/`).
* **Manipuladores de Eventos**: Proibida a interpolação de dados dinâmicos em atributos `onclick`, `onload`, etc. Todos os eventos devem ser vinculados via `addEventListener`.

---

## 10. Authentication & Session Hygiene

* A autenticação é gerenciada exclusivamente pelo Supabase Auth (GoTrue).
* **Purga de Memória no Logout**: Ao acionar `signOut`, o estado reativo da aplicação (`store.resetState()`) deve zerar imediatamente todos os dados da memória RAM (`activities = []`, `habits = []`, `meals = {}`, `userProfile = null`), prevenindo vazamento de dados em navegadores compartilhados.

---

## 11. Persistence & Consistency

* **Zero Fallback Silencioso**: Em modo autenticado/cloud, qualquer falha de rede ou sincronização deve ser reportada transparentemente como erro no cabeçalho/UI.
* O sistema nunca deve comutar silenciosamente para `localStorage` em modo cloud para evitar divergência de dados e estado fantasma (*split-brain*).

---

## 12. API Security & Data Minimization

* As consultas ao banco retornam apenas as colunas necessárias para a visualização ativa.
* Endpoints administrativos e listagens de governança são acessíveis unicamente para usuários validados por `public.is_admin()`.
* Membros comuns nunca recebem listas ou identificadores de outros usuários.

---

## 13. Rate Limiting & Bot Protection

* A camada de autenticação do Supabase possui rate limiting nativo ativado para endpoints de login e signup.
* No cliente, botões de ação assíncrona são desabilitados imediatamente após o clique para evitar múltiplos envios concorrentes (*double-submit*).

---

## 14. Secrets & Credential Management

* **Permitido no Frontend**: Apenas `SUPABASE_URL` e `SUPABASE_ANON_KEY` (chave pública com RLS).
* **PROIBIDO no Frontend**: `service_role_key`, senhas de banco de dados, chaves privadas ou JWT secrets.
* Nenhuma credencial administrativa ou de teste pode existir em código versionado.

---

## 15. Encryption & Transport Security

* Todo o tráfego entre cliente e Supabase ocorre estritamente via HTTPS / TLS 1.3.
* Senhas de usuários são criptografadas no banco utilizando algoritmos robustos de hash com salt (`bcrypt`/`Argon2` gerenciados pelo GoTrue).

---

## 16. Cookies & Browser Security

* Sessões persistidas em `localStorage` contêm apenas tokens JWT de usuário final gerados pelo Supabase.
* Nenhuma informação sensível de autorização (como "isAdmin=true") é armazenada em cookies ou storage do navegador como fonte de verdade.

---

## 17. Security Headers

* Na hospedagem e distribuição (GitHub Pages / CDN), devem ser aplicadas diretrizes de cabeçalhos de segurança:
  * `X-Content-Type-Options: nosniff`
  * `X-Frame-Options: DENY`
  * `Referrer-Policy: strict-origin-when-cross-origin`
  * `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 18. File Upload Security

* Caso uploads de arquivos venham a ser implementados no futuro:
  * Utilizar exclusivamente buckets privados do Supabase Storage com políticas RLS por usuário.
  * Validar MIME types permitidos no servidor e limitar o tamanho máximo de arquivo.

---

## 19. Dependency & Supply Chain Security

* A aplicação utiliza arquitetura **Zero-Build Vanilla ESM** com importações diretas de CDNs confiáveis e auditados (`jsdelivr.net` com pinned versions).
* Sem dependência de pipelines complexos de build locais ou pacotes npm desnecessários.

---

## 20. Security Testing

* Toda funcionalidade deve possuir testes adversariais automatizados em `tests/security_tests.js`:
  1. Teste de isolamento multi-tenant (IDOR).
  2. Teste de bloqueio de escalação de privilégios (RBAC).
  3. Teste de imunidade contra payloads XSS e quebra de atributos.
  4. Teste de purga de memória no logout.
  5. Teste de limites de entrada (*length clamping*).

---

## 21. Security Advisor & Continuous Audit

* O schema do PostgreSQL deve ser periodicamente auditado contra o **Supabase Security Advisor** e **Performance Advisor**:
  * Zero tabelas públicas sem RLS.
  * Zero permissões DML para o papel `anon`.
  * Índices presentes em todas as Foreign Keys e filtros de consulta.

---

## 22. Definition of Done (DoD - Security)

Uma tarefa só é considerada concluída quando:
* [x] RLS validado e testado para SELECT, INSERT, UPDATE, DELETE.
* [x] Isolamento entre usuários verificado no PostgreSQL.
* [x] Bloqueio de escalação de privilégios validado no banco.
* [x] Menor privilégio de grants aplicado.
* [x] Sanitização de entradas e XSS aplicada.
* [x] Higiene de memória de sessão testada.
* [x] Testes automatizados executados e 100% aprovados.
* [x] Documentação de segurança atualizada.

---

## 23. Regras para Novas Funcionalidades

Antes de desenvolver qualquer nova funcionalidade:
1. **Modelar no Banco Primeiro**: Definir tabela, colunas, constraints e políticas RLS no PostgreSQL antes de criar código frontend.
2. **Perguntar**: *"Se um invasor chamar essa tabela diretamente pelo PostgREST, o banco impede qualquer ação indevida?"*
3. **Automatizar o Teste**: Adicionar casos de teste de segurança na suíte `tests/security_tests.js`.
