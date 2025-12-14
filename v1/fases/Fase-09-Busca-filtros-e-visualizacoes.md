# Fase 9 – Busca, filtros e visualizações

## Objetivo da Fase
Entregar navegação e recuperação de informação no V1 com **busca global**, **busca e filtros avançados**, **ordenação e paginação** e visualizações básicas (lista/tabela), garantindo operabilidade com volume moderado de dados por tenant.

## Procedimentos
- Definir o escopo da **busca global**:
  - Quais entidades entram (Contatos, Empresas, Leads, Oportunidades, Tarefas, Notas)
  - Quais campos são pesquisáveis por entidade
  - Regras de relevância (simples no V1)
- Definir o escopo dos **filtros avançados**:
  - Operadores suportados no V1 (igual, contém, maior/menor, intervalo, vazio/não vazio)
  - Campos filtráveis por entidade
  - Comportamento para campos customizados
- Definir **ordenação e paginação**:
  - Campos ordenáveis por entidade
  - Limites de paginação (tamanho de página)
  - Garantias de consistência (ordem estável)
- Definir **busca tolerante a diacríticos**:
  - Normalização de texto (regras)
  - Impactos de performance e indexação
- Definir visualizações mínimas do V1:
  - Lista (padrão)
  - Tabela (quando aplicável)
- Definir requisitos de performance percebida:
  - Tempo alvo para abrir listagens comuns
  - Tempo alvo para aplicar filtros comuns

## Decisões Técnicas

### Decisão 1 — Estratégia de busca no V1 (semântica vs textual)
- **O que está sendo decidido**: Como implementar busca global com custo/complexidade do V1.
- **Alternativas consideradas**:
  - (A) Busca textual via consultas no banco (campos indexados)
  - (B) Full-text dedicado (quando aplicável)
  - (C) Busca semântica/vetorial (quando aplicável)
- **Decisão tomada**: **(A)** no V1, com espaço para evoluir para (B)/(C) futuramente.
- **Justificativa objetiva**: Mantém o MVP vendável sem introduzir infraestrutura adicional antes da demanda real.

### Decisão 2 — Campos pesquisáveis e filtráveis (governança)
- **O que está sendo decidido**: Como limitar/definir quais campos entram em busca/filtro por entidade.
- **Alternativas consideradas**:
  - (A) “Tudo pesquisável” por padrão
  - (B) Lista explícita de campos por entidade
- **Decisão tomada**: **Lista explícita por entidade** no V1.
- **Justificativa objetiva**: Evita vazamento de dados (permissões por campo) e reduz custo de performance.

### Decisão 3 — Busca tolerante a diacríticos
- **O que está sendo decidido**: Onde aplicar normalização para tolerância a acentos.
- **Alternativas consideradas**:
  - (A) Normalizar na entrada (armazenar versão normalizada)
  - (B) Normalizar na consulta
  - (C) Combinação (normalização + índices)
- **Decisão tomada**: **Combinação**, priorizando consistência e performance.
- **Justificativa objetiva**: Tolerância a diacríticos é requisito explícito do V1; precisa funcionar sem degradar o sistema.

### Decisão 4 — Consistência de paginação e ordenação
- **O que está sendo decidido**: Como garantir páginas estáveis.
- **Alternativas consideradas**:
  - (A) Paginação por offset puro
  - (B) Paginação por cursor (quando aplicável)
- **Decisão tomada**: **Offset no V1** com ordenação estável; cursor pode ser evolução.
- **Justificativa objetiva**: Simplicidade e aderência ao MVP, desde que a ordenação esteja bem definida.

## Tecnologias Selecionadas
- **Banco relacional (ex.: PostgreSQL)**: execução de filtros e busca textual com índices.
- **Indexação**:
  - Índices por `tenant_id`
  - Índices em campos usados em lista/ordem/filtro
  - Suporte a normalização para diacríticos (estratégia definida na fase)
- **Camada de autorização**: aplicar permissões por objeto/campo também nas consultas de busca/filtro.

## Pré-requisitos para Avançar
- [ ] Escopo da busca global definido (entidades e campos)
- [ ] Operadores de filtro do V1 definidos e documentados
- [ ] Campos filtráveis/ordenáveis por entidade definidos
- [ ] Estratégia de tolerância a diacríticos definida (normalização + impacto)
- [ ] Metas mínimas de performance definidas (listagem e filtro)
- [ ] Regras de permissões por campo aplicáveis a busca/filtros revisadas


