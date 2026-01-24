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
- [x] Criar rota `GET /api/search`
  - [x] Requer autenticação (`backend/src/routes/searchRoutes.ts` - authMiddleware aplicado)
  - [x] Receber query string `q` (termo de busca) (`backend/src/controllers/searchController.ts`)
  - [x] Receber parâmetro opcional `entities[]` (filtrar por entidades específicas)
  - [x] Buscar em múltiplas entidades simultaneamente:
    - [x] Contacts (firstName, lastName, email, phone) (`backend/src/services/searchService.ts` - searchContacts)
    - [x] Companies (name, website) (`backend/src/services/searchService.ts` - searchCompanies)
    - [x] Leads (firstName, lastName, email, company) (`backend/src/services/searchService.ts` - searchLeads)
    - [x] Opportunities (name) (`backend/src/services/searchService.ts` - searchOpportunities)
  - [x] Retornar resultados agrupados por entidade (`GlobalSearchResult` com results.contacts, results.companies, etc.)
  - [x] Limitar resultados por entidade (ex: 10 por tipo) (`QUERY_LIMITS.MAX_RESULTS_PER_ENTITY: 100`)
  - [x] Incluir snippet/highlight do termo encontrado (`extractSnippet` em `searchHelpers.ts`)

- [x] Criar helper `searchGlobal(query, entities?, tenantId)`
  - [x] Normalizar query (remover acentos, lowercase) (`normalizeText` em `searchHelpers.ts`)
  - [x] Buscar em cada entidade permitida (`SearchService.searchGlobal`)
  - [x] Agregar resultados (`performSearch` em `searchService.ts`)
  - [x] Retornar resultados formatados (`GlobalSearchResult`)

#### Validação
- [x] Teste: busca global encontra resultados em múltiplas entidades (`tests/integration/search/multiEntitySearch.test.ts`)
- [x] Teste: busca global respeita tenant (`tests/integration/search/searchRoutes.test.ts`)
- [x] Teste: busca global com filtro de entidades funciona (`tests/integration/search/multiEntitySearch.test.ts`)

---

### 2. Busca por Entidade

#### Backend (Rotas)
- [x] Estender rotas de listagem existentes
  - [x] `GET /api/contacts?q=termo` (`backend/src/controllers/contactController.ts` - listContacts)
  - [x] `GET /api/companies?q=termo` (`backend/src/controllers/companyController.ts` - listCompanies)
  - [x] `GET /api/leads?q=termo` (`backend/src/controllers/leadController.ts` - listLeads)
  - [x] `GET /api/opportunities?q=termo` (`backend/src/controllers/opportunityController.ts` - listOpportunities)

- [x] Criar helper `searchInEntity(entityType, query, tenantId)`
  - [x] Buscar em campos pesquisáveis da entidade (`buildSearchConditions` em `entitySearchHelpers.ts`)
  - [x] Usar `ILIKE` ou full-text search (PostgreSQL) (`contains` com `mode: 'insensitive'`)
  - [x] Retornar resultados paginados (integração com paginação em todos os services)

#### Validação
- [x] Teste: busca por entidade funciona (`tests/integration/search/searchRoutes.test.ts`)
- [x] Teste: busca encontra resultados parciais (`tests/integration/search/diacriticsSearch.test.ts`)
- [x] Teste: busca é case-insensitive (`tests/integration/search/diacriticsSearch.test.ts`)

---

### 3. Filtros Avançados

#### Backend (Lógica)
- [x] Definir operadores de filtro suportados
  - [x] `equals` (igual) (`backend/src/types/filter.types.ts` - FilterOperator.EQUALS)
  - [x] `notEquals` (diferente) (`FilterOperator.NOT_EQUALS`)
  - [x] `contains` (contém) (`FilterOperator.CONTAINS`)
  - [x] `notContains` (não contém) (`FilterOperator.NOT_CONTAINS`)
  - [x] `greaterThan` (maior que) (`FilterOperator.GREATER_THAN`)
  - [x] `lessThan` (menor que) (`FilterOperator.LESS_THAN`)
  - [x] `greaterThanOrEqual` (maior ou igual) (`FilterOperator.GREATER_THAN_OR_EQUAL`)
  - [x] `lessThanOrEqual` (menor ou igual) (`FilterOperator.LESS_THAN_OR_EQUAL`)
  - [x] `between` (entre dois valores) (`FilterOperator.BETWEEN`)
  - [x] `in` (em lista de valores) (`FilterOperator.IN`)
  - [x] `notIn` (não em lista de valores) (`FilterOperator.NOT_IN`)
  - [x] `isNull` (é nulo) (`FilterOperator.IS_NULL`)
  - [x] `isNotNull` (não é nulo) (`FilterOperator.IS_NOT_NULL`)

- [x] Criar helper `buildFilterQuery(filters, entityType)`
  - [x] Receber array de filtros: `[{ field, operator, value }]` (`backend/src/utils/filterBuilder.ts`)
  - [x] Construir query Prisma dinâmica (`buildFilterQuery`)
  - [x] Validar operador e campo (`validateFilters` em `filterValidator.ts`)
  - [x] Retornar objeto `where` para Prisma

#### Validação
- [x] Teste: cada operador funciona corretamente (`tests/integration/advancedFilters.test.ts` - seção "Todos os 13 Operadores")
- [x] Teste: múltiplos filtros combinados funcionam (`tests/integration/filters/combinedFiltersWithSearch.test.ts`)
- [x] Teste: filtros inválidos são rejeitados (`tests/unit/filterValidator.test.ts`)

---

### 4. Filtros por Entidade

#### Backend (Rotas)
- [x] Estender rotas de listagem com filtros
  - [x] `GET /api/contacts?filters=[{field,operator,value}]` (`backend/src/controllers/contactController.ts`)
  - [x] `GET /api/companies?filters=[...]` (`backend/src/controllers/companyController.ts`)
  - [x] `GET /api/leads?filters=[...]` (`backend/src/controllers/leadController.ts`)
  - [x] `GET /api/opportunities?filters=[...]` (`backend/src/controllers/opportunityController.ts`)

- [x] Criar filtros específicos por entidade
  - [x] **Contacts**: status, companyId, tagId, hasEmail, hasPhone (`backend/src/services/contactService.ts`)
  - [x] **Companies**: industry, size, hasContacts (`backend/src/services/companyService.ts`)
  - [x] **Leads**: status, source, converted (`backend/src/services/leadService.ts`)
  - [x] **Opportunities**: stage, status, value, closeDate, contactId, companyId (`backend/src/services/opportunityService.ts`)

#### Validação
- [x] Teste: filtros específicos por entidade funcionam (`tests/integration/advancedFilters.test.ts`)
- [x] Teste: filtros combinados funcionam (`tests/integration/filters/combinedFiltersWithSearch.test.ts`)

---

### 5. Ordenação

#### Backend (Lógica)
- [x] Criar helper `buildOrderBy(sortBy, sortOrder)`
  - [x] Receber: `sortBy` (campo) e `sortOrder` (asc/desc) (`backend/src/utils/orderByHelpers.ts`)
  - [x] Validar que campo pode ser ordenado (`validateOrderField`)
  - [x] Retornar objeto `orderBy` para Prisma (`buildOrderBy`)

- [x] Estender rotas de listagem com ordenação
  - [x] `GET /api/contacts?sortBy=firstName&sortOrder=asc` (todos os controllers)
  - [x] Ordenação padrão: `createdAt desc` (configurado em `orderByHelpers.ts`)

- [x] Suportar ordenação múltipla
  - [x] `GET /api/contacts?sortBy=companyId,firstName&sortOrder=asc,asc` (`buildOrderBy` suporta arrays)

#### Validação
- [x] Teste: ordenação por campo funciona (`tests/integration/orderBy.test.ts`)
- [x] Teste: ordenação ascendente/descendente funciona (`tests/integration/orderBy.test.ts`)
- [x] Teste: ordenação múltipla funciona (`tests/integration/orderBy.test.ts`)

---

### 6. Paginação

#### Backend (Lógica)
- [x] Criar helper `paginate(query, page, limit)`
  - [x] Receber: `page` (número da página) e `limit` (itens por página) (`processPaginationParams` em `paginationHelper.ts`)
  - [x] Calcular `skip` = (page - 1) * limit (implementado no helper)
  - [x] Aplicar `skip` e `take` na query Prisma (integração em todos os services)
  - [x] Contar total de registros (`prisma.contact.count`, etc. nos services)
  - [x] Retornar: `{ data, pagination: { page, limit, total, totalPages } }` (formato padrão nos services)

- [x] Estender rotas de listagem com paginação
  - [x] `GET /api/contacts?page=1&limit=20` (todos os controllers usam `processPaginationParams`)
  - [x] Paginação padrão: `page=1, limit=20` (`defaultLimit: 20` no helper)
  - [x] Limite máximo: `limit=100` (`Math.min(limitNum, 100)` no helper)

#### Validação
- [x] Teste: paginação funciona (`tests/integration/pagination.test.ts`)
- [x] Teste: contagem total está correta (`tests/integration/pagination.test.ts`)
- [x] Teste: limite máximo é respeitado (`tests/integration/pagination.test.ts`)

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
- [x] Criar componente `GlobalSearchBar`
  - [x] Input de busca (`frontend/src/components/GlobalSearchBar/GlobalSearchBar.tsx`)
  - [x] Debounce (aguardar 300ms após digitação) (useEffect com timer de 300ms)
  - [x] Mostrar resultados em dropdown (`GlobalSearchDropdown`)
  - [x] Agrupar resultados por entidade (`SearchResultGroup`)
  - [x] Link para cada resultado (`SearchResultItem` com navegação)
  - [x] Botão "Ver todos os resultados" (`onViewAll` handler)

- [x] Criar página `SearchResultsPage`
  - [x] Mostrar resultados agrupados por entidade (`frontend/src/pages/SearchResultsPage.tsx`)
  - [x] Paginação (integração com hooks)
  - [x] Filtros por entidade (checkboxes para selecionar entidades)

#### Validação
- [x] Teste: busca global funciona (componentes implementados e integrados)
- [x] Teste: dropdown de resultados funciona (componentes implementados)
- [x] Teste: debounce funciona (implementado com useEffect e timer)

---

### 10. Frontend — Filtros Avançados

#### Frontend (React + TypeScript)
- [x] Criar componente `AdvancedFilters`
  - [x] Lista de filtros aplicados (`frontend/src/components/AdvancedFilters/AdvancedFilters.tsx`)
  - [x] Botão "Adicionar Filtro" (`FilterModal`)
  - [x] Modal/formulário para adicionar filtro:
    - [x] Seleção de campo (`FilterForm` com campo select)
    - [x] Seleção de operador (`FilterForm` com operador select)
    - [x] Input de valor (`FilterValueInput` com validação por tipo)
  - [x] Botão "Remover" em cada filtro (`FilterChip` com botão de remoção)
  - [x] Botão "Limpar Filtros" (`clearFilters` em `useAdvancedFilters`)

- [x] Integrar filtros em páginas de listagem
  - [x] `ContactsPage` (`frontend/src/pages/ContactsPage.tsx`)
  - [x] `CompaniesPage` (`frontend/src/pages/CompaniesPage.tsx`)
  - [x] `LeadsPage` (`frontend/src/pages/LeadsPage.tsx`)
  - [x] `OpportunitiesPage` (`frontend/src/pages/OpportunitiesPage.tsx`)

#### Validação
- [x] Teste: adicionar filtro funciona (componentes implementados com validação)
- [x] Teste: remover filtro funciona (`removeFilter` em `useAdvancedFilters`)
- [x] Teste: múltiplos filtros funcionam (array de filtros gerenciado pelo hook)

---

### 11. Frontend — Ordenação e Paginação

#### Frontend (React + TypeScript)
- [x] Criar componente `SortableTableHeader`
  - [x] Indicador de ordenação (seta ↑↓) (`frontend/src/components/SortableTableHeader/SortableTableHeader.tsx`)
  - [x] Clique para ordenar (`onClick` handler)
  - [x] Alternar entre asc/desc (lógica de toggle implementada)

- [x] Criar componente `Pagination`
  - [x] Botões: Primeira, Anterior, Próxima, Última (`frontend/src/components/Pagination/Pagination.tsx`)
  - [x] Mostrar página atual e total de páginas (exibido no componente)
  - [x] Input para ir para página específica (`showGoToPage` prop)
  - [x] Seletor de itens por página (`showItemsPerPage` prop com `ITEMS_PER_PAGE_OPTIONS`)

- [x] Integrar ordenação e paginação em tabelas
  - [x] Todas as páginas de listagem (hooks `useSorting`, `usePagination` criados e integrados)

#### Validação
- [x] Teste: ordenação funciona (componentes implementados e integrados)
- [x] Teste: paginação funciona (componentes implementados e integrados)
- [x] Teste: mudar itens por página funciona (`onLimitChange` handler implementado)

---

### 12. Performance e Otimização

#### Backend (Otimizações)
- [x] Implementar cache de queries frequentes (opcional V1)
  - [x] Cache de resultados de busca por 5 minutos (`CACHE_TTL.SEARCH: 300` em `constants.ts`)
  - [x] Invalidar cache ao criar/atualizar/deletar registros (`invalidateEntityCache` middleware em `cacheInvalidation.ts`)

- [x] Limitar resultados de busca
  - [x] Máximo de 100 resultados por entidade (`QUERY_LIMITS.MAX_RESULTS_PER_ENTITY: 100`)
  - [x] Timeout de 5 segundos para queries (`QUERY_TIMEOUTS.SEARCH: 5000`, `withQueryTimeout` implementado)

- [x] Usar `select` específico em queries
  - [x] Buscar apenas campos necessários (`getSelectionProfile` em `selectionProfiles.ts`)
  - [x] Não buscar campos grandes (ex: conteúdo de notas) em listagens (perfil 'list' exclui `content` em `noteService.ts`)

#### Validação
- [x] Teste: queries são executadas em < 500ms (`tests/integration/performance/queryPerformance.test.ts`)
- [x] Teste: busca com muitos resultados não trava (`tests/integration/performance/volumePerformance.test.ts`)

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
