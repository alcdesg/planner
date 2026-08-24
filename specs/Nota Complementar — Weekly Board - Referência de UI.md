# 14A. Referência de Layout — Weekly Board

A referência visual do produto deve ser interpretada como um **Weekly Board**, e não como um calendário tradicional baseado em grade horária.

## Conceito

A semana é apresentada como uma sequência de colunas, sendo cada coluna um dia.

Dentro de cada dia, as atividades são apresentadas como **cards empilhados verticalmente**.

Conceitualmente:

```text
┌────────────┬────────────┬────────────┬────────────┐
│ SEG        │ TER        │ QUA        │ QUI        │
│            │            │            │            │
│ ┌────────┐ │ ┌────────┐ │ ┌────────┐ │ ┌────────┐ │
│ │ 🟦     │ │ │ 🟢     │ │ │ 🩷     │ │ │ 🟡     │ │
│ │ Tarefa │ │ │ Mercado│ │ │ Médico │ │ │ Academia│ │
│ └────────┘ │ └────────┘ │ └────────┘ │ └────────┘ │
│            │            │            │            │
│ ┌────────┐ │ ┌────────┐ │ ┌────────┐ │            │
│ │ 🟢     │ │ │ 🟠     │ │ │        │ │            │
│ │ Casa   │ │ │ Reunião│ │ │        │ │            │
│ └────────┘ │ └────────┘ │ └────────┘ │            │
│            │            │            │            │
│     +      │     +      │     +      │     +      │
└────────────┴────────────┴────────────┴────────────┘
```

O desenho acima é conceitual. Não reproduzir literalmente.

## Regra fundamental

**Não implementar a visão principal como uma grade horária rígida.**

O produto não é um clone do Outlook Calendar.

Horários devem funcionar como **metadados das atividades**, e não necessariamente como a posição física obrigatória do card na grade.

Exemplo:

```text
┌─────────────────────────┐
│ 🩷 Dentista             │
│    14:00                │
└─────────────────────────┘
```

A atividade continua sendo um card dentro da quinta-feira. O horário é uma informação complementar.

Uma atividade também pode não possuir horário:

```text
┌─────────────────────────┐
│ 🟢 Comprar ração        │
└─────────────────────────┘
```

Ambos os formatos são válidos.

## Cards

Cada atividade deve ser visualmente representada por um card.

O card deve permitir identificar rapidamente:

- título;
- categoria através da identidade visual;
- horário, quando existente;
- estado de conclusão.

Os cards devem possuir:

- bordas suavemente arredondadas;
- cores de baixa saturação;
- espaçamento interno confortável;
- hierarquia tipográfica clara;
- checkbox ou mecanismo equivalente de conclusão.

## Conclusão

A conclusão deve ser possível diretamente no card, sem abrir uma tela de edição.

Exemplo:

```text
☐ Comprar ração
```

Após concluir:

```text
✓ Comprar ração
```

A atividade deve permanecer visível na semana, porém com tratamento visual que indique claramente sua conclusão.

## Adição contextual

Cada coluna/dia deve oferecer uma forma evidente de adicionar uma atividade.

Exemplo:

```text
SEGUNDA

[atividade]
[atividade]

+ Adicionar
```

Ao adicionar uma atividade dentro de um dia específico, o sistema deve assumir automaticamente aquele dia.

O usuário não deve precisar selecionar novamente uma data que já está determinada pelo contexto.

## Distribuição das atividades

As atividades devem ser empilhadas de forma natural dentro da coluna.

Não criar posicionamento artificial baseado em horários quando isso prejudicar a leitura.

Se houver muitos compromissos, a interface deve preservar:

1. legibilidade;
2. distinção entre dias;
3. facilidade de interação;
4. capacidade de concluir atividades.

## Responsividade

No desktop, a visão semanal deve priorizar a visualização simultânea dos dias.

No mobile, **não tentar comprimir sete colunas em uma tela estreita**.

A experiência mobile pode utilizar:

- foco no dia atual;
- navegação entre dias;
- swipe horizontal;
- visão diária;
- outras soluções equivalentes.

A decisão deve privilegiar a usabilidade real.

## Referência visual

A imagem de referência fornecida durante a definição do produto deve ser utilizada como **referência de comportamento visual e composição**, não como especificação literal de layout.

Extrair dela os seguintes princípios:

- dias organizados em colunas;
- atividades representadas como cards;
- cores suaves para diferenciação;
- cards compactos;
- checkbox integrado;
- baixa densidade visual;
- leitura rápida;
- aparência amigável;
- ausência de estética corporativa pesada.

Não copiar elementos proprietários ou reproduzir a interface da referência literalmente.

## Intenção

O usuário deve olhar para a tela e perceber:

> **"Esta é a minha semana."**

e não:

> **"Estou preenchendo um sistema de gerenciamento de tarefas."**

A interface deve funcionar como uma representação visual simples da rotina.