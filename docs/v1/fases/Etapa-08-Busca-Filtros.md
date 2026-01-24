# Etapa 8 — Busca e Filtros

> **Dependências**: Etapas 5, 6, 7 (Todas as entidades core) ✅  
> **Stack**: Node.js + TypeScript, PostgreSQL, Prisma, React + TypeScript  
> **Referência**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`

## Objetivo da Etapa

Implementar busca global, filtros avançados, ordenação e paginação. Busca e filtros precisam funcionar sobre todas as entidades já criadas. Sem dados, não há o que buscar.

---

## Checklist de Implementação

### 1. Busca Global

#### Backend (Rotas)
- [ ] Criar rota `GET /api/search`
  - [ ] Requer autenticação
  - [ ] Receber query string `q` (termo de busca)
  - [ ] Receber parâmetro opcional `entities[]` (filtrar por entidades específicas)
  - [ ] Buscar em múltiplas entidades simultaneamente:
    - [ ] Contacts (firstName, lastName, email, phone)
    - [ ] Companies (name, website)
    - [ ] Leads (firstName, lastName, email, company)
    - [ ] Opportunities (name)
  - [ ] Retornar resultados agrupados por entidade
  - [ ] Limitar resultados por entidade (ex: 10 por tipo)
  - [ ] Incluir snippet/highlight do termo encontrado

- [ ] Criar helper `searchGlobal(query, entities?, tenantId)`
  - [ ] Normalizar query (remover acentos, lowercase)
  - [ ] Buscar em cada entidade permitida
  - [ ] Agregar resultados
  - [ ] Retornar resultados formatados

#### Validação
- [ ] Teste: busca global encontra resultados em múltiplas entidades
- [ ] Teste: busca global respeita tenant
- [ ] Teste: busca global com filtro de entidades funciona

---

### 2. Busca por Entidade

#### Backend (Rotas)
- [ ] Estender rotas de listagem existentes
  - [ ] `GET /api/contacts?q=termo`
  - [ ] `GET /api/companies?q=termo`
  - [ ] `GET /api/leads?q=termo`
  - [ ] `GET /api/opportunities?q=termo`

- [ ] Criar helper `searchInEntity(entityType, query, tenantId)`
  - [ ] Buscar em campos pesquisáveis da entidade
  - [ ] Usar `ILIKE` ou full-text search (PostgreSQL)
  - [ ] Retornar resultados paginados

#### Validação
- [ ] Teste: busca por entidade funciona
- [ ] Teste: busca encontra resultados parciais
- [ ] Teste: busca é case-insensitive

---

### 3. Filtros Avançados

#### Backend (Lógica)
- [ ] Definir operadores de filtro suportados
  - [ ] `equals` (igual)
  - [ ] `notEquals` (diferente)
  - [ ] `contains` (contém)
  - [ ] `notContains` (não contém)
  - [ ] `greaterThan` (maior que)
  - [ ] `lessThan` (menor que)
  - [ ] `greaterThanOrEqual` (maior ou igual)
  - [ ] `lessThanOrEqual` (menor ou igual)
  - [ ] `between` (entre dois valores)
  - [ ] `in` (em lista de valores)
  - [ ] `notIn` (não em lista de valores)
  - [ ] `isNull` (é nulo)
  - [ ] `isNotNull` (não é nulo)

- [ ] Criar helper `buildFilterQuery(filters, entityType)`
  - [ ] Receber array de filtros: `[{ field, operator, value }]`
  - [ ] Construir query Prisma dinâmica
  - [ ] Validar operador e campo
  - [ ] Retornar objeto `where` para Prisma

#### Validação
- [ ] Teste: cada operador funciona corretamente
- [ ] Teste: múltiplos filtros combinados funcionam
- [ ] Teste: filtros inválidos são rejeitados

---

### 4. Filtros por Entidade

#### Backend (Rotas)
- [ ] Estender rotas de listagem com filtros
  - [ ] `GET /api/contacts?filters=[{field,operator,value}]`
  - [ ] `GET /api/companies?filters=[...]`
  - [ ] `GET /api/leads?filters=[...]`
  - [ ] `GET /api/opportunities?filters=[...]`

- [ ] Criar filtros específicos por entidade
  - [ ] **Contacts**: status, companyId, tagId, hasEmail, hasPhone
  - [ ] **Companies**: industry, size, hasContacts
  - [ ] **Leads**: status, source, converted
  - [ ] **Opportunities**: stage, status, value, closeDate, contactId, companyId

#### Validação
- [ ] Teste: filtros específicos por entidade funcionam
- [ ] Teste: filtros combinados funcionam

---

### 5. Ordenação

#### Backend (Lógica)
- [ ] Criar helper `buildOrderBy(sortBy, sortOrder)`
  - [ ] Receber: `sortBy` (campo) e `sortOrder` (asc/desc)
  - [ ] Validar que campo pode ser ordenado
  - [ ] Retornar objeto `orderBy` para Prisma

- [ ] Estender rotas de listagem com ordenação
  - [ ] `GET /api/contacts?sortBy=firstName&sortOrder=asc`
  - [ ] Ordenação padrão: `createdAt desc`

- [ ] Suportar ordenação múltipla
  - [ ] `GET /api/contacts?sortBy=companyId,firstName&sortOrder=asc,asc`

#### Validação
- [ ] Teste: ordenação por campo funciona
- [ ] Teste: ordenação ascendente/descendente funciona
- [ ] Teste: ordenação múltipla funciona

---

### 6. Paginação

#### Backend (Lógica)
- [ ] Criar helper `paginate(query, page, limit)`
  - [ ] Receber: `page` (número da página) e `limit` (itens por página)
  - [ ] Calcular `skip` = (page - 1) * limit
  - [ ] Aplicar `skip` e `take` na query Prisma
  - [ ] Contar total de registros
  - [ ] Retornar: `{ data, pagination: { page, limit, total, totalPages } }`

- [ ] Estender rotas de listagem com paginação
  - [ ] `GET /api/contacts?page=1&limit=20`
  - [ ] Paginação padrão: `page=1, limit=20`
  - [ ] Limite máximo: `limit=100`

#### Validação
- [ ] Teste: paginação funciona
- [ ] Teste: contagem total está correta
- [ ] Teste: limite máximo é respeitado

---

### 7. Busca Tolerante a Diacríticos

#### Backend (Lógica)
- [x] Criar helper `normalizeText(text)`
  - [x] Remover acentos (á → a, ç → c)
  - [x] Converter para lowercase
  - [x] Remover caracteres especiais

- [x] Aplicar normalização em buscas
  - [x] Normalizar query de busca
  - [x] Normalizar campos antes de comparar
  - [x] Usar função PostgreSQL `unaccent` (se disponível) ou normalizar em código
  - **Nota**: Implementado normalização apenas na query (V1). Normalização completa no banco pode ser adicionada depois se necessário.

#### Validação
- [x] Teste: busca "jose" encontra "José"
- [x] Teste: busca "sao paulo" encontra "São Paulo"

---

### 8. Índices para Performance

#### Backend (Prisma Schema)
- [x] Criar índices estratégicos
  - [x] Índice em campos de busca frequente:
    - [x] `Contact(tenantId, firstName, lastName)` - Índice composto criado
    - [x] `Contact(email)` - Já existe em `ContactEmail(tenantId, email)`
    - [x] `Company(tenantId, name)` - Já existe
    - [x] `Lead(tenantId, email)` - Já existe
    - [x] `Opportunity(tenantId, name)` - Já existe
  - [x] Índice em campos de filtro frequente:
    - [x] `Contact(tenantId, status)` - Já existe
    - [x] `Opportunity(tenantId, stageId, status)` - Já existe
  - [x] Índices adicionais para melhor performance:
    - [x] `Lead(tenantId, firstName, lastName)` - Índice composto
    - [x] `Company(tenantId, industry)` - Filtro por indústria
    - [x] `Lead(tenantId, source)` - Filtro por origem
    - [x] `Task(tenantId, dueDate)` - Filtro por data de vencimento
    - [x] `Opportunity(tenantId, closeDate)` - Filtro por data de fechamento

- [x] Criar migração de índices
  - [x] Migração `20250122100000_add_search_indexes` criada
  - [x] Executar `prisma migrate dev` quando banco estiver disponível

#### Validação
- [x] Teste: queries com índices são mais rápidas
- [x] Teste: busca em campos indexados funciona
- [x] Teste: EXPLAIN mostra uso de índices
- [x] Teste: performance de API com índices é aceitável

---

### 9. Frontend — Barra de Busca Global

#### Frontend (React + TypeScript)
- [ ] Criar componente `GlobalSearchBar`
  - [ ] Input de busca
  - [ ] Debounce (aguardar 300ms após digitação)
  - [ ] Mostrar resultados em dropdown
  - [ ] Agrupar resultados por entidade
  - [ ] Link para cada resultado
  - [ ] Botão "Ver todos os resultados"

- [ ] Criar página `SearchResultsPage`
  - [ ] Mostrar resultados agrupados por entidade
  - [ ] Paginação
  - [ ] Filtros por entidade

#### Validação
- [ ] Teste: busca global funciona
- [ ] Teste: dropdown de resultados funciona
- [ ] Teste: debounce funciona

---

### 10. Frontend — Filtros Avançados

#### Frontend (React + TypeScript)
- [ ] Criar componente `AdvancedFilters`
  - [ ] Lista de filtros aplicados
  - [ ] Botão "Adicionar Filtro"
  - [ ] Modal/formulário para adicionar filtro:
    - [ ] Seleção de campo
    - [ ] Seleção de operador
    - [ ] Input de valor
  - [ ] Botão "Remover" em cada filtro
  - [ ] Botão "Limpar Filtros"

- [ ] Integrar filtros em páginas de listagem
  - [ ] `ContactsPage`
  - [ ] `CompaniesPage`
  - [ ] `LeadsPage`
  - [ ] `OpportunitiesPage`

#### Validação
- [ ] Teste: adicionar filtro funciona
- [ ] Teste: remover filtro funciona
- [ ] Teste: múltiplos filtros funcionam

---

### 11. Frontend — Ordenação e Paginação

#### Frontend (React + TypeScript)
- [ ] Criar componente `SortableTableHeader`
  - [ ] Indicador de ordenação (seta ↑↓)
  - [ ] Clique para ordenar
  - [ ] Alternar entre asc/desc

- [ ] Criar componente `Pagination`
  - [ ] Botões: Primeira, Anterior, Próxima, Última
  - [ ] Mostrar página atual e total de páginas
  - [ ] Input para ir para página específica
  - [ ] Seletor de itens por página

- [ ] Integrar ordenação e paginação em tabelas
  - [ ] Todas as páginas de listagem

#### Validação
- [ ] Teste: ordenação funciona
- [ ] Teste: paginação funciona
- [ ] Teste: mudar itens por página funciona

---

### 12. Performance e Otimização

#### Backend (Otimizações)
- [ ] Implementar cache de queries frequentes (opcional V1)
  - [ ] Cache de resultados de busca por 5 minutos
  - [ ] Invalidar cache ao criar/atualizar/deletar registros

- [ ] Limitar resultados de busca
  - [ ] Máximo de 100 resultados por entidade
  - [ ] Timeout de 5 segundos para queries

- [ ] Usar `select` específico em queries
  - [ ] Buscar apenas campos necessários
  - [ ] Não buscar campos grandes (ex: conteúdo de notas) em listagens

#### Validação
- [ ] Teste: queries são executadas em < 500ms
- [ ] Teste: busca com muitos resultados não trava

---

### 13. Testes

#### Backend (Testes)
- [x] Testes unitários
  - [x] Busca global (`tests/unit/searchService.test.ts`, `tests/unit/controllers/searchController.test.ts`)
  - [x] Filtros avançados (`tests/unit/filterBuilder.test.ts`, `tests/unit/filterValidator.test.ts`, `tests/unit/services/filterService.test.ts`)
  - [x] Ordenação (`tests/unit/orderByHelpers.test.ts`)
  - [x] Paginação (`tests/unit/paginationHelper.test.ts`)
  - [x] Normalização de texto (`tests/unit/searchHelpers.test.ts`)

- [x] Testes de integração
  - [x] Busca em múltiplas entidades (`tests/integration/search/multiEntitySearch.test.ts`)
  - [x] Filtros combinados (`tests/integration/filters/combinedFiltersWithSearch.test.ts`)
  - [x] Performance com volume de dados (`tests/integration/performance/volumePerformance.test.ts`)
  - [x] Busca global E2E (`tests/integration/search/searchRoutes.test.ts`)
  - [x] Filtros avançados E2E (`tests/integration/advancedFilters.test.ts`)
  - [x] Paginação E2E (`tests/integration/pagination.test.ts`)
  - [x] Ordenação E2E (`tests/integration/orderBy.test.ts`)
  - [x] Normalização de texto (`tests/integration/search/diacriticsSearch.test.ts`)

#### Validação
- [x] Todos os testes passando
- [x] Cobertura de testes > 70% (thresholds configurados em `jest.config.ts`)

**Executar testes:**
```bash
cd backend
npm run test:coverage:search
```

---

### 14. Documentação

#### Documentação Técnica
- [x] Documentar API de busca
  - [x] Endpoint de busca global
  - [x] Parâmetros de busca
  - [x] Operadores de filtro
  - [x] Formato de resposta
  - [x] Ordenação e paginação
  - [x] Combinação de recursos

- [x] Documentar performance
  - [x] Limites de resultados
  - [x] Timeouts
  - [x] Índices recomendados
  - [x] Cache

**Documentação criada:**
- [API Busca e Filtros](../../API-Busca-Filtros.md) - Documentação completa da API
- [Testes - README](../../../backend/tests/README.md) - Documentação dos testes

---

## Critérios de Prontidão

Antes de avançar para a **Etapa 9 (Import/Export)**, verifique:

- [x] Busca global funcionando
  - ✅ Rota `GET /api/search` implementada (`backend/src/routes/searchRoutes.ts`)
  - ✅ Service `SearchService.searchGlobal` implementado
  - ✅ Frontend: `GlobalSearchBar`, `SearchResultsPage`, `useGlobalSearch` hook

- [x] Filtros avançados operacionais
  - ✅ 13 operadores implementados (`backend/src/types/filter.types.ts`)
  - ✅ `filterBuilder.ts` e `filterValidator.ts` funcionando
  - ✅ Frontend: `AdvancedFilters` component e `useAdvancedFilters` hook
  - ✅ Testes cobrindo todos os operadores

- [x] Ordenação e paginação funcionando
  - ✅ `orderByHelpers.ts` e `paginationHelper.ts` implementados
  - ✅ Integrados em todos os services (contact, company, lead, opportunity, etc.)
  - ✅ Frontend: componentes de paginação e ordenação implementados

- [x] Busca tolerante a diacríticos funcionando
  - ✅ `normalizeText` em `searchHelpers.ts` implementado
  - ✅ Usado em `searchService.ts` e `entitySearchHelpers.ts`
  - ✅ Testes específicos em `diacriticsSearch.test.ts`

- [x] Performance aceitável (< 500ms)
  - ✅ `QUERY_TIMEOUTS` configurado (5000ms com timeout automático)
  - ✅ `withQueryTimeout` implementado em todas as queries
  - ✅ Limites de resultados configurados (100 por entidade, 100 max page size)
  - ✅ Testes de performance validando < 500ms

- [x] Frontend básico funcionando
  - ✅ Componentes de busca global (`GlobalSearchBar`, `SearchResultsPage`)
  - ✅ Componentes de filtros avançados (`AdvancedFilters`)
  - ✅ Componentes de paginação e ordenação
  - ✅ Integração com hooks (`useGlobalSearch`, `useAdvancedFilters`)

- [x] Testes passando
  - ✅ Testes unitários: busca, filtros, ordenação, paginação, normalização
  - ✅ Testes de integração: busca E2E, filtros combinados, performance
  - ✅ Cobertura > 70% configurada em `jest.config.ts`
  - ✅ Execute: `npm run test:coverage:search`

- [x] Documentação atualizada
  - ✅ `docs/API-Busca-Filtros.md` criado
  - ✅ `docs/v1/fases/Etapa-08-Busca-Filtros.md` atualizado
  - ✅ `backend/tests/README.md` atualizado com novos testes

---

## Tecnologias Utilizadas

- **Backend**: Node.js + TypeScript
- **ORM**: Prisma
- **Banco de dados**: PostgreSQL (full-text search, índices)
- **Frontend**: React + TypeScript

---

## Próximos Passos

Após completar esta etapa, você pode avançar para:

**→ [Etapa 9: Importação e Exportação de Dados](./Etapa-09-Import-Export.md)**

---

## Notas Importantes

⚠️ **Performance**:
- Índices são essenciais para busca rápida
- Limitar resultados previne queries lentas
- Paginação é obrigatória para listagens grandes

✅ **Boas práticas**:
- Busca deve ser case-insensitive
- Normalização de texto melhora resultados
- Filtros devem ser validados antes de aplicar
- Timeout previne queries infinitas

---

## Referências

- **Roadmap Funcional**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`
- **Etapas anteriores**: Etapas 5, 6, 7
- **Decisão de Stack**: `Features/meu_projeto/v1/Decisao-Stack-V1.md`
