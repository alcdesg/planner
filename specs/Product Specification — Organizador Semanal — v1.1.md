# PRODUCT SPECIFICATION
## Organizador Semanal

**Status:** Product Definition / MVP  
**Versão:** 1.1  
**Fonte de verdade:** Este documento define a visão, os princípios de produto, UX, requisitos funcionais e diretrizes de engenharia.

---

# 1. Visão do Produto

Criar um aplicativo pessoal extremamente simples para organizar a semana através de uma **visão semanal visual**, permitindo que o usuário registre atividades, compromissos e tarefas com o mínimo possível de esforço.

O produto deve funcionar como um **quadro semanal pessoal**, e não como uma plataforma tradicional de produtividade.

A experiência principal deve ser:

> **Abrir → visualizar a semana → adicionar algo → executar → marcar como concluído.**

O produto deve reduzir a carga mental associada ao planejamento, e não criar um novo sistema que o usuário precise administrar.

---

# 2. Problema

Ferramentas tradicionais de produtividade oferecem muitos recursos, mas frequentemente exigem que o usuário gerencie:

- listas;
- projetos;
- prioridades;
- etiquetas;
- subtarefas;
- datas;
- status;
- contextos;
- notificações;
- categorias;
- filtros;
- dashboards.

Para uma pessoa que deseja apenas organizar sua semana, essa estrutura pode gerar mais trabalho do que benefício.

O produto deve resolver um problema mais simples:

> **"Quero enxergar minha semana de forma clara e saber o que preciso fazer em cada dia."**

---

# 3. Público-alvo inicial

Pessoa que deseja organizar sua rotina pessoal sem utilizar sistemas complexos de produtividade.

Características:

- valoriza simplicidade;
- quer visualizar a semana;
- possui atividades recorrentes e ocasionais;
- não quer gastar tempo configurando o sistema;
- prefere interação visual a formulários complexos;
- deseja marcar atividades conforme são realizadas.

O produto não deve ser inicialmente direcionado para gestão empresarial, equipes ou projetos colaborativos complexos.

---

# 4. Princípio Fundamental

## A semana é o objeto principal do produto.

O usuário não deve pensar:

> "Preciso criar uma tarefa e configurar sua data."

O usuário deve pensar:

> "Na quinta-feira preciso fazer isso."

E simplesmente colocar a atividade na quinta-feira.

A interface deve refletir esse modelo mental.

---

# 5. Personalidade do Produto

O produto deve transmitir:

- simplicidade;
- leveza;
- organização;
- proximidade;
- tranquilidade;
- clareza;
- sensação de controle sem pressão.

A interface deve parecer **amigável e pessoal**, e não corporativa ou excessivamente tecnológica.

Evitar uma estética que transmita:

- software empresarial;
- dashboard financeiro;
- ferramenta de desenvolvedor;
- "AI SaaS";
- excesso de futurismo;
- excesso de gradientes;
- excesso de elementos decorativos.

---

# 6. Diretrizes Visuais

## 6.1 Estética geral

A interface deve utilizar:

- bordas levemente arredondadas;
- espaçamento confortável;
- componentes visualmente leves;
- hierarquia tipográfica clara;
- sombras muito sutis quando necessárias;
- áreas de respiro;
- cards discretos;
- ícones simples;
- microinterações suaves.

Os elementos devem possuir personalidade sem parecerem infantis.

---

## 6.2 Bordas

Utilizar bordas arredondadas de forma consistente.

Preferência:

- cards: arredondamento médio;
- botões: arredondamento médio;
- inputs: arredondamento médio;
- elementos menores: arredondamento menor.

Evitar:

- cantos completamente quadrados;
- excesso de "pill buttons";
- arredondamento exagerado em todos os elementos.

O arredondamento deve transmitir suavidade, não aparência de aplicativo infantil.

---

## 6.3 Cores

A paleta deve ser **suave, equilibrada e amigável**.

Não utilizar roxo como cor dominante da interface.

### Regra explícita

> **Roxo não deve ser utilizado como cor primária de identidade do produto.**

Evitar o padrão visual:

- fundo branco;
- roxo vibrante;
- gradientes roxo/azul;
- botões roxos;
- glow roxo;
- estética genérica de aplicativo de IA.

As cores das categorias devem possuir **baixa saturação e boa legibilidade**.

Exemplo conceitual:

| Categoria | Direção de cor |
|---|---|
| Trabalho | azul suave |
| Casa | verde suave |
| Pessoal | amarelo/âmbar suave |
| Saúde | rosa ou coral suave |
| Compromisso | laranja suave |
| Outros | cinza/azul neutro |

Os valores exatos devem ser definidos pelo sistema de design durante a implementação.

Não é necessário utilizar exatamente essas cores.

---

# 7. Design System

Criar um pequeno sistema de design desde o início.

Centralizar tokens para:

- cores;
- tipografia;
- espaçamento;
- border radius;
- sombras;
- estados;
- tamanhos de componentes.

Evitar valores arbitrários espalhados pelo código.

Exemplo conceitual:

```text
colors
  background
  surface
  text
  muted
  border
  primary
  category.*

radius
  sm
  md
  lg

spacing
  xs
  sm
  md
  lg
  xl
```

O objetivo é permitir evolução visual sem precisar procurar e alterar dezenas de componentes individualmente.

---

# 8. Modo Claro e Escuro

O produto deve possuir:

- modo claro;
- modo escuro;
- opção de acompanhar a preferência do sistema.

O usuário deve poder alternar entre os modos.

A implementação deve utilizar tokens semânticos.

Não criar uma segunda interface independente para dark mode.

Exemplo conceitual:

```text
background
surface
surface-secondary
text-primary
text-secondary
border
accent
```

Os componentes devem consumir esses tokens.

Nunca codificar cores diretamente em componentes quando a cor representar uma função semântica.

---

# 9. Responsividade

O produto deve funcionar bem em:

- desktop;
- tablet;
- celular.

A experiência mobile não deve simplesmente reduzir a grade de sete colunas.

O agente deve adaptar a navegação para manter a clareza.

Possíveis soluções:

- scroll horizontal da semana;
- foco no dia atual;
- visão diária;
- navegação por dia.

A decisão final deve ser baseada na melhor experiência de uso.

---

# 10. Usuários e Planejamentos

O produto deve possuir suporte inicial a **múltiplos usuários locais/aplicacionais**, sem que isso implique necessariamente um sistema completo de autenticação.

O objetivo inicial é permitir que diferentes pessoas possam utilizar a mesma aplicação mantendo planejamentos independentes.

Exemplo:

```text
Usuário
├── Alcides
│   └── Planejamento próprio
│
└── Paula
    └── Planejamento próprio
```

Cada usuário deve possuir seus próprios:

- eventos;
- atividades;
- categorias;
- recorrências;
- preferências de visualização;
- configurações de tema.

---

# 11. Seletor de Usuário

Deve existir um seletor de usuário facilmente acessível na interface.

Exemplo:

```text
┌─────────────────────┐
│ 👤 Paula          ▾ │
└─────────────────────┘
```

Ao alternar o usuário:

- carregar imediatamente o planejamento correspondente;
- não misturar atividades entre usuários;
- preservar as preferências de cada usuário quando aplicável.

A troca de usuário deve ser simples e rápida.

---

# 12. Escopo de Autenticação

O MVP não deve criar um sistema complexo de:

- login;
- senha;
- recuperação de senha;
- e-mail de confirmação;
- permissões;
- OAuth;
- gerenciamento de identidade.

O conceito de usuário neste estágio existe principalmente para **separar planejamentos**.

A arquitetura deve, entretanto, permitir que autenticação real seja adicionada futuramente sem necessidade de reconstruir o domínio principal.

---

# 13. Modelo de Dados

O modelo deve manter separação clara entre:

```text
User
  ↓
Planning / Workspace
  ↓
Activity
  ↓
Recurrence
```

O planejamento de cada usuário deve ser isolado logicamente.

Não utilizar dados globais quando o dado pertence ao usuário.

---

# 14. Visão Principal — Semana

A tela principal do produto deve ser uma **visão semanal**.

Estrutura conceitual:

```text
                <   24 — 30 AGO   >

SEG | TER | QUA | QUI | SEX | SÁB | DOM
────|─────|─────|─────|─────|─────|─────
    |     |     |     |     |     |
09h |     |     |     |     |     |
    |     |     |     |     |     |
14h |     |     |     |     |     |
    |     |     |     |     |     |
18h |     |     |     |     |     |
```

A implementação visual exata deve ser definida pelo agente de desenvolvimento de acordo com a melhor solução técnica e de UX.

O requisito é o **comportamento**, não a reprodução literal do desenho.

---

# 15. Atividades sem horário

Atividades sem horário devem possuir uma área visual própria dentro de cada dia.

Exemplo:

```text
QUINTA

SEM HORÁRIO

🟩 Comprar mercado
🟨 Estudar

14:00
🩷 Dentista
```

Isso evita que atividades sem horário sejam artificialmente posicionadas em horários arbitrários.

---

# 16. Atividade

Uma atividade pode possuir:

- ID;
- usuário;
- título;
- data;
- horário inicial opcional;
- horário final opcional;
- categoria;
- status;
- recorrência opcional;
- timestamps de criação e atualização.

Campos opcionais devem permanecer realmente opcionais.

---

# 17. Criação de Atividade

A criação deve ser rápida.

Campos mínimos:

1. Título
2. Data
3. Horário opcional
4. Categoria

O sistema não deve exigir:

- descrição;
- prioridade;
- projeto;
- tags;
- estimativa;
- status adicional;
- subtarefas.

---

# 18. Criação Contextual

Sempre que possível, a criação deve aproveitar o contexto atual.

Se o usuário estiver visualizando quarta-feira e clicar em "Adicionar":

```text
Nova atividade

Título: ____________

Data:
Quarta-feira

Horário:
Sem horário

Categoria:
[Escolher]

[Adicionar]
```

A data já deve vir preenchida.

O usuário não deve precisar informar novamente aquilo que o sistema já sabe pelo contexto.

---

# 19. Categorias

Categorias iniciais:

- Trabalho;
- Casa;
- Pessoal;
- Saúde;
- Compromisso;
- Outros.

Cada categoria possui uma identidade visual própria.

As cores devem ser suaves.

As cores devem continuar distinguíveis no modo claro e escuro.

Acessibilidade deve ser considerada: **não depender exclusivamente da cor para comunicar informação**.

---

# 20. Status

Uma atividade possui inicialmente:

- `Pendente`;
- `Concluída`.

Ao concluir:

- permanecer visível;
- receber tratamento visual de conclusão;
- poder ser reaberta.

---

# 21. Horário

Horário é opcional.

Exemplos:

```text
Dentista
Quinta-feira · 14:00

Comprar ração
Sábado
```

A interface deve tratar ambos como atividades válidas.

---

# 22. Recorrência

Suportar:

- diariamente;
- semanalmente;
- dias específicos da semana;
- mensalmente.

Exemplo:

> Academia — segunda, quarta e sexta — 18h

deve resultar nas ocorrências correspondentes.

A recorrência deve ser uma propriedade da atividade e não um módulo separado.

---

# 23. Navegação

Permitir:

- semana anterior;
- semana atual;
- próxima semana;
- retorno rápido para Hoje.

A navegação deve ser clara tanto no desktop quanto no mobile.

---

# 24. Visão "Hoje"

Disponibilizar uma visão focada no dia atual.

Exibir:

- atividades com horário;
- atividades sem horário;
- status;
- categorias.

A visão semanal continua sendo a principal experiência.

---

# 25. Interações Rápidas

Sempre que possível, permitir:

- clicar em um dia para adicionar;
- clicar em uma atividade para editar;
- marcar conclusão diretamente no card;
- mover atividade entre dias;
- alterar horário;
- excluir atividade.

Evitar telas intermediárias desnecessárias.

---

# 26. MVP

## Essencial

- [ ] visão semanal;
- [ ] navegação entre semanas;
- [ ] botão Hoje;
- [ ] criação de atividade;
- [ ] edição;
- [ ] exclusão;
- [ ] conclusão;
- [ ] categorias;
- [ ] cores por categoria;
- [ ] atividades com horário;
- [ ] atividades sem horário;
- [ ] recorrência básica;
- [ ] persistência;
- [ ] visão diária;
- [ ] múltiplos usuários;
- [ ] seletor de usuário;
- [ ] modo claro;
- [ ] modo escuro;
- [ ] preferência de tema.

---

# 27. Fora do MVP

Não implementar inicialmente:

- projetos;
- Kanban;
- subtarefas;
- hábitos;
- metas;
- gamificação;
- pontos;
- streaks;
- dashboards;
- estatísticas de produtividade;
- colaboração entre usuários;
- permissões complexas;
- workflows;
- dependências;
- prioridades avançadas;
- inteligência artificial;
- automações complexas;
- integrações externas.

---

# 28. Guardrails de Produto

Estas regras são permanentes.

### Regra 1 — Não transformar em ferramenta de produtividade

Não evoluir automaticamente para um clone de Todoist, Notion, Trello, Asana, ClickUp ou Microsoft Planner.

### Regra 2 — Menos input é melhor

Se uma informação puder ser inferida pelo contexto, não solicitar ao usuário.

### Regra 3 — Uma ação deve ser direta

Preferir:

> visualizar → clicar → executar.

A evitar:

> visualizar → abrir formulário → configurar → salvar → voltar.

### Regra 4 — A semana deve continuar compreensível

A adição de funcionalidades não pode comprometer a leitura rápida da semana.

### Regra 5 — Não adicionar funcionalidades apenas porque são tecnicamente fáceis

Uma feature só entra quando houver justificativa de produto.

---

# 29. Diretrizes de Engenharia

## 29.1 Código limpo

O código deve ser:

- legível;
- modular;
- previsível;
- tipado quando a tecnologia permitir;
- reutilizável;
- coeso;
- com responsabilidades bem definidas.

Evitar:

- duplicação desnecessária;
- componentes gigantes;
- lógica de negócio dentro de componentes visuais;
- valores mágicos;
- código morto;
- abstrações prematuras;
- hacks temporários que permaneçam no código.

---

## 29.2 Arquitetura

Separar claramente:

```text
UI
↓
Application / State
↓
Domain / Business Logic
↓
Persistence
```

A interface não deve ser responsável diretamente por regras de negócio ou persistência.

---

## 29.3 Componentização

Criar componentes reutilizáveis quando houver repetição real ou responsabilidade claramente delimitada.

Não transformar cada pequena parte da interface em um componente artificial apenas para aumentar a quantidade de arquivos.

A arquitetura deve buscar **coesão**, não quantidade de abstrações.

---

## 29.4 Estado

Manter o estado de forma previsível.

Evitar múltiplas fontes de verdade para a mesma informação.

Exemplo:

A semana atualmente selecionada deve possuir uma única fonte de verdade.

O usuário atualmente selecionado também.

---

## 29.5 Persistência

Toda operação de criação, edição, exclusão ou conclusão deve possuir comportamento consistente de persistência.

O sistema não deve aparentar ter salvo uma alteração quando ela não foi realmente persistida.

Em caso de erro:

- informar o usuário;
- preservar os dados quando possível;
- não perder silenciosamente alterações.

---

# 30. Definition of Done

Uma funcionalidade não deve ser considerada concluída apenas porque "funciona no caminho feliz".

Antes de considerar uma implementação pronta, verificar:

### Funcionalidade

- [ ] fluxo principal funciona;
- [ ] edição funciona;
- [ ] exclusão funciona;
- [ ] estados vazios foram tratados;
- [ ] erros foram tratados;
- [ ] dados persistem corretamente;
- [ ] atualização da interface é consistente.

### UX

- [ ] desktop funciona;
- [ ] mobile funciona;
- [ ] modo claro funciona;
- [ ] modo escuro funciona;
- [ ] estados hover/focus/active são coerentes;
- [ ] elementos interativos são claramente identificáveis;
- [ ] não existem fluxos desnecessariamente longos.

### Código

- [ ] não há duplicação evidente;
- [ ] não existem hacks conhecidos;
- [ ] não existem warnings evitáveis;
- [ ] não existem imports ou componentes mortos;
- [ ] não existem valores mágicos desnecessários;
- [ ] tipos e contratos estão consistentes;
- [ ] responsabilidades estão bem separadas.

### Dados

- [ ] usuários não compartilham dados acidentalmente;
- [ ] atividades pertencem ao usuário correto;
- [ ] mudança de usuário atualiza corretamente a interface;
- [ ] recorrências não geram duplicações indevidas.

---

# 31. Regra de Qualidade Antes de Implementar

Antes de implementar qualquer alteração significativa, o agente deve:

1. compreender o requisito;
2. verificar a arquitetura existente;
3. identificar componentes e regras afetadas;
4. avaliar impactos;
5. escolher a solução mais simples que preserve a arquitetura;
6. implementar;
7. verificar os fluxos afetados;
8. corrigir regressões introduzidas pela própria alteração.

Não implementar rapidamente uma solução local quando uma alteração pequena e estruturada resolver o problema corretamente.

---

# 32. Regra Contra "Consertos Posteriores"

O agente deve evitar conscientemente o seguinte padrão:

```text
Implementação rápida
↓
Funciona visualmente
↓
Problema aparece
↓
Patch
↓
Outro problema
↓
Outro patch
↓
Código inconsistente
```

Preferir:

```text
Entender
↓
Planejar
↓
Implementar corretamente
↓
Validar
↓
Entregar
```

A velocidade de desenvolvimento não deve ser obtida sacrificando a qualidade estrutural do código.

---

# 33. Mudanças de Escopo

Quando uma nova solicitação for feita, o agente deve classificá-la mentalmente como:

- **Correção:** algo existente não funciona como deveria;
- **Refinamento:** melhora de uma funcionalidade existente;
- **Nova funcionalidade:** adiciona uma capacidade;
- **Mudança de produto:** altera uma decisão fundamental.

Mudanças de produto devem ser tratadas com maior cautela.

Antes de alterar uma decisão fundamental, verificar se ela conflita com os princípios definidos neste documento.

---

# 34. Critérios de Sucesso

O produto será considerado bem-sucedido quando um usuário novo conseguir:

### Em menos de 30 segundos

Entender:

- onde está;
- qual é a semana atual;
- quais dias estão ocupados;
- quais tipos de atividades existem.

### Em menos de 10 segundos

Criar uma atividade simples.

### Com um toque

Concluir uma atividade.

### Em poucos segundos

Responder:

> "O que eu preciso fazer hoje?"

e:

> "Como está minha semana?"

---

# 35. Filosofia do Produto

O produto não pretende ensinar o usuário a ser mais produtivo.

Ele pretende simplesmente **dar forma visual à semana que o usuário já possui**.

A interface deve desaparecer atrás da informação.

O usuário deve sentir que está olhando para sua própria semana — e não operando um software.

> **Menos gerenciamento. Mais clareza.**

---

# 36. Diretriz Final para o Antigravity

Antes de qualquer implementação:

1. Leia este documento integralmente.
2. Preserve as decisões de produto aqui estabelecidas.
3. Não introduza complexidade sem justificativa.
4. Não altere arquitetura ou comportamento fundamental silenciosamente.
5. Priorize código limpo e funcional.
6. Prefira soluções simples, robustas e sustentáveis.
7. Considere desktop, mobile, light mode e dark mode desde o início.
8. Considere isolamento por usuário desde o modelo de dados inicial.
9. Não trate funcionalidades futuras como necessárias agora.
10. Não utilize a estética genérica de aplicativos de IA como referência visual.

### Regra principal

> **Construir corretamente desde o início é mais importante do que construir rapidamente e corrigir posteriormente.**