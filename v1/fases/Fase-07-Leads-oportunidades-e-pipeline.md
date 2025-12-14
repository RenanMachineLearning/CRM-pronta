# Fase 7 – Leads, oportunidades e pipeline

## Objetivo da Fase
Entregar o funil comercial do V1: gestão de leads, conversão, oportunidades (deals), pipeline configurável, valor e data de fechamento esperada.

## Procedimentos
- Definir o modelo mínimo de Lead e de Oportunidade:
  - Campos obrigatórios vs opcionais
  - Relacionamento com contato e empresa
- Definir pipeline:
  - Estrutura de pipeline/estágios/categorias
  - Regras de status
  - Possibilidade de configuração (escopo por tenant)
- Definir regras de valor do negócio e data de fechamento:
  - Moeda (se única no V1)
  - Validações mínimas
- Definir o fluxo de conversão de lead:
  - Quais registros são criados/ligados (contato/empresa/oportunidade)
  - Regras para evitar duplicidade
  - Rastreabilidade (auditoria) do evento de conversão
- Definir ações/atualizações em massa (escopo mínimo do V1, se aplicável ao fluxo).

## Decisões Técnicas

### Decisão 1 — Pipeline por tenant vs global
- **O que está sendo decidido**: Se o pipeline é fixo do produto ou configurável por cliente.
- **Alternativas consideradas**:
  - (A) Pipeline global fixo
  - (B) Pipeline configurável por tenant
- **Decisão tomada**: **Configurável por tenant**.
- **Justificativa objetiva**: O escopo do V1 inclui estágios/status configuráveis; processos variam entre empresas.

### Decisão 2 — Conversão de lead (transformar vs criar)
- **O que está sendo decidido**: Se lead vira oportunidade diretamente ou se cria registros novos.
- **Alternativas consideradas**:
  - (A) Transformar o registro (Lead vira Oportunidade)
  - (B) Criar Oportunidade e manter Lead como origem (com link)
- **Decisão tomada**: **Manter Lead como origem** e criar/ligar registros derivados.
- **Justificativa objetiva**: Mantém rastreabilidade e reduz perda de informação de origem.

### Decisão 3 — Status e regras de fechamento
- **O que está sendo decidido**: Como representar ganho/perda e encerramento.
- **Alternativas consideradas**:
  - (A) Status simples (Open/Won/Lost)
  - (B) Status + motivo/metadata (no V1)
- **Decisão tomada**: **Status simples** no V1.
- **Justificativa objetiva**: Mantém MVP enxuto e vendável, evitando taxonomia extensa no início.

## Tecnologias Selecionadas
- **Persistência relacional**: integridade de pipeline/estágios e vínculos com contato/empresa.
- **Configuração por tenant**: pipeline armazenado como configuração do tenant.
- **Indexação**: índices por `tenant_id` + campos de listagem (status, estágio, data esperada).

## Pré-requisitos para Avançar
- [ ] Campos mínimos de Lead e Oportunidade definidos
- [ ] Pipeline configurável por tenant definido (modelo de estágios/status)
- [ ] Regras de valor e data de fechamento definidas (validações mínimas)
- [ ] Fluxo de conversão de lead definido (com rastreabilidade)
- [ ] Regras mínimas de deduplicação no fluxo de conversão definidas


