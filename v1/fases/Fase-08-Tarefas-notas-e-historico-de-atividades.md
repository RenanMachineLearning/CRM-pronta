# Fase 8 – Tarefas, notas e histórico de atividades

## Objetivo da Fase
Viabilizar execução diária e rastreabilidade no V1 com tarefas e notas vinculadas a registros (contatos, leads, oportunidades), além de uma timeline/histórico por registro.

## Procedimentos
- Definir o modelo de Tarefa:
  - Tipos configuráveis (escopo mínimo)
  - Status configuráveis
  - Vínculo com registros (contato/lead/oportunidade)
- Definir o modelo de Nota:
  - Conteúdo e formato
  - Vínculo com registros
- Definir o “histórico/timeline”:
  - Quais eventos entram (tarefas, notas e mudanças auditadas)
  - Ordenação e paginação
  - Escopo por tenant
- Definir como tarefas/notas interagem com permissões:
  - Quem pode ver/editar tarefas e notas
  - Campos sensíveis em notas (se aplicável)
- Definir regras de integridade:
  - Exclusão (soft vs hard)
  - Retenção mínima (se houver)

## Decisões Técnicas

### Decisão 1 — Formato de notas (texto simples vs rico)
- **O que está sendo decidido**: Qual formato de conteúdo será suportado no V1.
- **Alternativas consideradas**:
  - (A) Texto simples
  - (B) Markdown
  - (C) Rich text
- **Decisão tomada**: **Markdown ou texto simples** no V1.
- **Justificativa objetiva**: Mantém baixo custo e cobre a maior parte do uso; rich text aumenta complexidade e superfície de bugs.

### Decisão 2 — Timeline como agregação de eventos
- **O que está sendo decidido**: Se a timeline é “materializada” ou calculada por consulta.
- **Alternativas consideradas**:
  - (A) Gerar timeline sob demanda (consulta agregada)
  - (B) Materializar eventos em uma tabela/stream de eventos
- **Decisão tomada**: **Modelo de eventos materializados** (mínimo) para consistência e performance.
- **Justificativa objetiva**: A V1 já exige auditoria; eventos materializados simplificam timeline e suporte.

### Decisão 3 — Configuração de tipos/status de tarefas
- **O que está sendo decidido**: Se tipos/status são fixos ou configuráveis por tenant.
- **Alternativas consideradas**:
  - (A) Fixos no produto
  - (B) Configuráveis por tenant
- **Decisão tomada**: **Configuráveis por tenant com defaults**.
- **Justificativa objetiva**: O V1 explicita configurabilidade; limitar a defaults atrasa valor percebido.

## Tecnologias Selecionadas
- **Persistência relacional**: vínculos consistentes tarefa/nota ↔ entidade.
- **Modelo de eventos/auditoria**: base para timeline por registro.
- **Indexação**: índices por `tenant_id` + `entity_type/entity_id` + ordenação por data.

## Pré-requisitos para Avançar
- [ ] Tipos e status de tarefas definidos (defaults + modelo de configuração por tenant)
- [ ] Formato de notas definido (texto/markdown)
- [ ] Regras de vínculo de tarefa/nota com entidades definidas
- [ ] Modelo de timeline definido (quais eventos e como consultar)
- [ ] Regras de permissão para tarefas/notas alinhadas ao ACL


