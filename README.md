# Organizador Semanal

> **Menos gerenciamento. Mais clareza.**

Um aplicativo pessoal extremamente simples e visual para planejar a semana, registrar compromissos e tarefas com o mínimo de esforço. Desenvolvido com base no documento de especificação (`specs/Product Specification — Organizador Semanal — v1.1.md`).

---

## 🌟 Funcionalidades Principais (MVP v1.1)

- **Visão Semanal Visual**: Grade de 7 dias clara e intuitiva no desktop, com navegação adaptativa no celular e tablet.
- **Área "Sem Horário"**: Espaço dedicado no topo de cada dia para tarefas não agendadas, mantendo compromissos cronológicos separados.
- **Criação Contextual Ultra-rápida**: Clique no dia para adicionar atividades em segundos com data pré-preenchida.
- **Conclusão com 1 Toque**: Checkbox direto no card para marcar/desmarcar tarefas rapidamente.
- **Categorias com Identidade Visual Suave**: Cores pastel suaves para *Trabalho*, *Casa*, *Pessoal*, *Saúde*, *Compromisso* e *Outros* (sem clichês de IA ou roxo invasivo).
- **Recorrência Integrada**: Suporte a atividades diárias, em dias úteis (Seg-Sex), semanais ou mensais.
- **Visão "Hoje"**: Foco concentrado nas prioridades do dia atual.
- **Múltiplos Usuários Locais**: Isolamento completo de dados por perfil (ex: Alcides, Paula), com alternador rápido no topo.
- **Modos Claro, Escuro e Automático**: Sistema de tokens semânticos respeitando a preferência do sistema operacional.
- **Backup & Segurança**: Exportação e restauração de dados em JSON local.

---

## 🚀 Como Executar

Por ser construído em **JavaScript modular (ES Modules nativos)** e **CSS Vanilla estruturado**, o projeto não exige etapas pesadas de build ou instalação de dependências:

1. Clone o repositório:
   ```bash
   git clone https://github.com/alcdesg/planner.git
   ```
2. Abra o arquivo `index.html` em qualquer navegador moderno (ou execute com uma extensão como Live Server / `npx serve`).

---

## 🏗️ Arquitetura do Projeto

```text
Planner/
├── specs/
│   └── Product Specification — Organizador Semanal — v1.1.md
├── css/
│   ├── tokens.css       # Tokens de cores, espaçamentos e temas claro/escuro
│   └── style.css        # Estilos dos componentes, layout e responsividade
├── js/
│   ├── domain/
│   │   ├── models.js     # Modelos de dados, categorias e utilitários de data
│   │   └── recurrence.js # Motor de cálculo de atividades recorrentes
│   ├── storage/
│   │   └── storage.js    # Persistência em LocalStorage com isolamento por usuário
│   ├── state/
│   │   └── store.js      # Gerenciador reativo central de estado
│   ├── ui/
│   │   ├── header.js        # Cabeçalho, navegação de semanas e perfil
│   │   ├── weekView.js      # Grade semanal e área "Sem Horário"
│   │   ├── todayView.js     # Visão focada do dia de hoje
│   │   ├── activityModal.js # Criação e edição contextual rápida
│   │   └── userModal.js     # Gestão de perfis e backup
│   └── app.js           # Ponto de entrada e atalhos de teclado
├── index.html           # Estrutura semântica principal
└── README.md
```

---

## ⌨️ Atalhos de Teclado

- `N` : Nova atividade rápida
- `T` : Voltar para Hoje
- `←` : Semana anterior
- `→` : Próxima semana
- `Esc` : Fechar modal aberto
