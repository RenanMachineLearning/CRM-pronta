# Fase 5 – Modelo de dados e entidades personalizáveis

## Objetivo da Fase
Definir a base de modelo de dados do CRM no V1, incluindo entidades core, relacionamentos, campos personalizáveis, validações de unicidade, lookup entre entidades e estratégia de evolução (migrações) compatível com multi-tenant.

## Procedimentos
- Definir a lista de **entidades core do V1** (mínimo necessário para o escopo V1).
- Definir os **relacionamentos** necessários entre entidades core.
- Definir o modelo de **campos personalizáveis**:
  - Quais entidades aceitam customização no V1
  - Tipos de campos suportados no V1
  - Validações mínimas (ex.: unicidade)
- Definir o mecanismo de **lookup de entidades** (seleção de registros relacionados).
- Definir **opções de atributos** (listas de valores) quando aplicável.
- Definir estratégia de **migrações/evolução do schema/workspace**:
  - Quem pode alterar (admin de tenant?)
  - Como versionar mudanças
  - Como reverter/mitigar erro de schema
- Definir requisitos de **performance mínima**:
  - Quais índices são obrigatórios já no V1
  - Quais consultas são críticas (listas, busca, filtros)

## Decisões Técnicas

### Decisão 1 — Quais entidades são “core” no V1
- **O que está sendo decidido**: Escopo de entidades mínimas para o CRM vendável.
- **Alternativas consideradas**:
  - (A) Apenas Contatos + Empresas + Oportunidades
  - (B) Contatos + Empresas + Leads + Oportunidades + Atividades (tarefas/notas)
- **Decisão tomada**: **(B)** para suportar operação real (captura → conversão → acompanhamento).
- **Justificativa objetiva**: O V1 inclui explicitamente leads, pipeline e atividades; o modelo deve nascer coerente.

### Decisão 2 — Representação de campos personalizáveis
- **O que está sendo decidido**: Como armazenar e consultar campos customizados por tenant.
- **Alternativas consideradas**:
  - (A) Colunas físicas por campo (muito rígido)
  - (B) EAV (entidade-atributo-valor)
  - (C) JSON/estrutura semiestruturada com índices seletivos
- **Decisão tomada**: **Estratégia semiestruturada** (EAV ou JSON) com governança e limites no V1.
- **Justificativa objetiva**: O V1 precisa customização sem exigir migração física por cliente; governança é mais importante do que flexibilidade total.

### Decisão 3 — Tipos de campo suportados no V1
- **O que está sendo decidido**: O conjunto mínimo de tipos para entregar valor sem explosão de complexidade.
- **Alternativas consideradas**:
  - (A) Texto, número, data, boolean
  - (B) (A) + select + lookup
  - (C) (B) + tipos avançados (compostos)
- **Decisão tomada**: **(B)**.
- **Justificativa objetiva**: Lookup é necessário para relacionamentos operacionais; tipos avançados podem esperar.

### Decisão 4 — Validação de unicidade
- **O que está sendo decidido**: Quais campos precisam de unicidade e em qual escopo.
- **Alternativas consideradas**:
  - (A) Unicidade global
  - (B) Unicidade por tenant
  - (C) Unicidade condicional por entidade
- **Decisão tomada**: **Unicidade por tenant** como padrão.
- **Justificativa objetiva**: Evita colisões entre clientes e mantém coerência do modelo multi-tenant.

### Decisão 5 — Migrações/evolução de schema no contexto multi-tenant
- **O que está sendo decidido**: Como evoluir schema e metadados sem quebrar tenants.
- **Alternativas consideradas**:
  - (A) Mudanças globais iguais para todos
  - (B) Mudanças por tenant com versionamento
- **Decisão tomada**: **Mudanças por tenant** para campos customizados e **globais** para entidades core.
- **Justificativa objetiva**: Entidades core evoluem como produto; customizações pertencem ao tenant.

## Tecnologias Selecionadas
- **Banco relacional (ex.: PostgreSQL)**: integridade de relacionamentos e unicidade por tenant.
- **Mecanismo de migrações**: versionamento do schema do produto (global).
- **Armazenamento de metadados por tenant**: estrutura dedicada para definições de campos/entidades do tenant.
- **Indexação**: índices por `tenant_id` + chaves de busca/filtro mais frequentes.

## Pré-requisitos para Avançar
- [ ] Entidades core do V1 definidas (lista fechada para V1)
- [ ] Relacionamentos core definidos e documentados
- [ ] Tipos de campo suportados no V1 definidos
- [ ] Estratégia de armazenamento de campos customizados definida (com limites)
- [ ] Regras de unicidade por tenant definidas
- [ ] Estratégia de migrações global vs por tenant definida
- [ ] Lista de índices mínimos por entidade definida (para listas/busca)


