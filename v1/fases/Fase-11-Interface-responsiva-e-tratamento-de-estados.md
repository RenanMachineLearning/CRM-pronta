# Fase 11 – Interface responsiva e tratamento de estados

## Objetivo da Fase
Garantir que o V1 seja operável para venda com interface responsiva, modo mobile básico e tratamento consistente de estados (loading/erro/sucesso/vazio) nas telas críticas do CRM.

## Procedimentos
- Definir os fluxos “happy path” do V1 que devem ter UI completa:
  - Login e recuperação de senha
  - Listagem e criação/edição de Contatos, Empresas, Leads e Oportunidades
  - Pipeline (ao menos em lista; visualizações adicionais podem ser pós-V1)
  - Tarefas e notas vinculadas
  - Busca e filtros
  - Importação e exportação
- Definir o padrão de navegação do V1:
  - Estrutura de menus
  - Rotas principais por entidade
  - Contexto de tenant (sempre visível para reduzir erro operacional)
- Definir breakpoints e regras de responsividade:
  - Desktop, tablet, mobile
  - Componentes que precisam de adaptação (tabelas e formulários)
- Definir padrões de estados:
  - Loading (indicadores)
  - Erro (mensagens e recuperação)
  - Vazio (empty states)
  - Sucesso (confirmações)
- Definir padrão de validação de formulários e feedback.
- Definir requisitos mínimos de acessibilidade e usabilidade (sem “perfeccionismo”, mas suficientes para venda).

## Decisões Técnicas

### Decisão 1 — Prioridade de UX no V1 (operabilidade vs refinamento)
- **O que está sendo decidido**: Até onde ir em refinamento de UI no MVP vendável.
- **Alternativas consideradas**:
  - (A) UI mínima funcional (priorizar fluxo)
  - (B) UI com refinamentos extensos (polimento elevado)
- **Decisão tomada**: **(A)**.
- **Justificativa objetiva**: O V1 precisa ser vendável cedo; polimento excessivo antecipa custo e atrasa validação de mercado.

### Decisão 2 — Padrão de tabelas/listas no mobile
- **O que está sendo decidido**: Como representar dados tabulares em telas pequenas.
- **Alternativas consideradas**:
  - (A) Scroll horizontal
  - (B) Cards/stacked rows no mobile
  - (C) Combinação
- **Decisão tomada**: **Combinação** com foco em leitura/ação rápida.
- **Justificativa objetiva**: CRM exige consulta rápida; mobile não pode bloquear ações básicas.

### Decisão 3 — Tratamento de erro (técnico vs orientado a ação)
- **O que está sendo decidido**: O conteúdo e a forma de mensagens de erro.
- **Alternativas consideradas**:
  - (A) Mensagens técnicas
  - (B) Mensagens orientadas a ação (o que fazer agora) + referência para suporte
- **Decisão tomada**: **(B)**.
- **Justificativa objetiva**: Produto vendável precisa reduzir suporte e permitir recuperação rápida.

## Tecnologias Selecionadas
- **Frontend web responsivo**: framework SPA/SSR (categoria) conforme decisão da Fase 1.
- **Sistema de componentes**: biblioteca de UI (categoria) para consistência (sem definir marca se não houver consenso).
- **Gestão de estado**: padrão simples para fluxos de CRUD e listas (categoria).
- **Observabilidade de frontend (quando aplicável)**: captura de erros e performance básica.

## Pré-requisitos para Avançar
- [ ] Lista de fluxos críticos do V1 definida e validada
- [ ] Estrutura de navegação definida (menus/rotas/visão de tenant)
- [ ] Breakpoints e regras de responsividade definidos
- [ ] Padrões de loading/erro/vazio/sucesso definidos
- [ ] Padrão de formulários e validação definido
- [ ] Critérios mínimos de usabilidade para venda definidos (o que “não pode falhar”)


