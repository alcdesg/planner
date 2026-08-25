# Threat Model — Organizador Semanal (Planner)

## 1. Ativos Protegidos (Assets)

1. **Dados Pessoais e Atividades do Usuário (`activities`)**:
   - Títulos, categorias, horários, histórico de conclusões e notas de tarefas pessoais/profissionais.
   - *Impacto de violação*: Vazamento de privacidade, espionagem de rotina, destruição não autorizada de dados.
2. **Hábitos Pessoais (`habits`)**:
   - Metas de frequência, taxas de consistência diária/mensal e histórico comportamental.
3. **Plano Alimentar Semanal (`meal_plans`)**:
   - Cardápios de refeições diárias e status de cumprimento.
4. **Perfis de Usuário & Controle de Acesso (`user_profiles`)**:
   - Mapeamento de UUID, e-mail, nome e papel administrativo (`role: 'admin' | 'member'`).
   - *Impacto de violação*: Escalação de privilégios e controle total sobre outros usuários.
5. **Chaves e Tokens de Autenticação**:
   - Tokens JWT da sessão Supabase Auth (`access_token`, `refresh_token`).

---

## 2. Atores & Agentes de Ameaça (Actors)

| Ator | Nível de Acesso | Motivação / Vetor |
| :--- | :--- | :--- |
| **Visitante Não Autenticado (`anon`)** | Acesso público ao front-end / API pública | Tentativa de leitura de dados de usuários sem login ou bypass de login. |
| **Usuário Autenticado Comum (`member`)** | Sessão ativa própria (`auth.uid()`) | Tentativa de ler/modificar dados de outros usuários (IDOR) ou promover sua conta a `admin`. |
| **Administrador Master (`admin`)** | Sessão com role `admin` no banco | Gestão de governança, criação de novos usuários e auditoria. |
| **Atacante Externo / Man-in-the-Middle (MitM)** | Interceptação de tráfego de rede | Tentativa de sequestro de sessão ou injeção de scripts (XSS). |

---

## 3. Superfícies de Ataque (Attack Surfaces)

1. **API REST / PostgREST (Supabase)**:
   - Endpoints diretos (`/rest/v1/user_profiles`, `/rest/v1/activities`, etc.).
   - Vetor: Envio de payloads manipulados via DevTools / cURL ignorando o front-end.
2. **Camada de Autenticação (GoTrue)**:
   - Endpoints `/auth/v1/signup`, `/auth/v1/token`.
3. **DOM / Front-End**:
   - Renderização dinâmica de HTML via template literals e `innerHTML`.
   - Vetor: XSS armazenado em títulos de tarefas, nomes de hábitos ou ícones.
4. **Armazenamento no Cliente (`localStorage` / `sessionStorage`)**:
   - Chaves de configuração e tokens JWT persistidos.

---

## 4. Matriz de Ameaças & Classificação de Riscos (STRIDE)

| ID | Categoria (STRIDE) | Ameaça | Impacto | Probabilidade | Severidade |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TM-01** | **Elevation of Privilege** | Usuário comum envia requisição `PATCH /user_profiles` com `{"role": "admin"}` para sua própria linha. | **CRITICAL** | Alta | **CRITICAL** |
| **TM-02** | **Elevation of Privilege** | Front-end determina papel de admin por prefixo de e-mail ou metadata do cliente. | **CRITICAL** | Alta | **CRITICAL** |
| **TM-03** | **Denial of Service / Tampering** | Colisão de Chave Primária em `meal_plans` (`id = meal_YYYY-MM-DD`), bloqueando outros usuários de salvar refeições no mesmo dia. | **HIGH** | Alta | **HIGH** |
| **TM-04** | **Information Disclosure (IDOR)** | Usuário A requisita `activities` ou `habits` com filtro `user_id = <User B>`. | **HIGH** | Baixa (com RLS) | **HIGH** |
| **TM-05** | **Tampering (XSS)** | Injeção de tags HTML / JS em atributos `aria-label`, `title` ou campos de texto `habit.icon`. | **MEDIUM** | Média | **MEDIUM** |
| **TM-06** | **Information Disclosure** | Concessão excessiva `GRANT ALL ON ALL TABLES TO anon`. | **MEDIUM** | Média | **MEDIUM** |
| **TM-07** | **Data Divergence / Tampering** | Fallback silencioso de persistência para `localStorage` ao falhar comunicação em modo autenticado. | **MEDIUM** | Média | **MEDIUM** |

---

## 5. Controles Exigidos (Mitigation Strategy)

1. **Imutabilidade de `role` e `is_active` para Não-Admins no PostgreSQL**:
   - Criar trigger/regra que impeça `NEW.role <> OLD.role` quando `public.is_admin() = false`.
2. **Remoção de Toda Determinação de Role no Front-End**:
   - Role é lido estritamente do banco de dados após a emissão de token JWT válido.
3. **Isolamento de Chave Primária em `meal_plans`**:
   - Chave primária composta `(user_id, date_key)` ou UUID individual por usuário.
4. **Sanitização de XSS em Todas as Interpolações DOM**:
   - Escapar todos os atributos HTML e conteúdos interpolados via `escapeHtml()`.
5. **Princípio do Menor Privilégio nos Grants SQL**:
   - Revogar permissões `INSERT/UPDATE/DELETE` do papel `anon`.
