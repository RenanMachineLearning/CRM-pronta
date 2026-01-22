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
- [ ] Criar índices estratégicos
  - [ ] Índice em campos de busca frequente:
    - [ ] `Contact(firstName, lastName)`
    - [ ] `Contact(email)`
    - [ ] `Company(name)`
    - [ ] `Lead(email)`
    - [ ] `Opportunity(name)`
  - [ ] Índice em campos de filtro frequente:
    - [ ] `Contact(status, tenantId)`
    - [ ] `Opportunity(stage, status, tenantId)`

- [ ] Criar migração de índices
  - [ ] Executar `prisma migrate dev --name add_search_indexes`

#### Validação
- [ ] Teste: queries com índices são mais rápidas
- [ ] Teste: busca em campos indexados funciona

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
- [ ] Testes unitários
  - [ ] Busca global
  - [ ] Filtros avançados
  - [ ] Ordenação
  - [ ] Paginação
  - [ ] Normalização de texto

- [ ] Testes de integração
  - [ ] Busca em múltiplas entidades
  - [ ] Filtros combinados
  - [ ] Performance com volume de dados

#### Validação
- [ ] Todos os testes passando
- [ ] Cobertura de testes > 70%

---

### 14. Documentação

#### Documentação Técnica
- [ ] Documentar API de busca
  - [ ] Endpoint de busca global
  - [ ] Parâmetros de busca
  - [ ] Operadores de filtro
  - [ ] Formato de resposta

- [ ] Documentar performance
  - [ ] Limites de resultados
  - [ ] Timeouts
  - [ ] Índices recomendados

---

## Critérios de Prontidão

Antes de avançar para a **Etapa 9 (Import/Export)**, verifique:

- [ ] Busca global funcionando
- [ ] Filtros avançados operacionais
- [ ] Ordenação e paginação funcionando
- [ ] Busca tolerante a diacríticos funcionando
- [ ] Performance aceitável (< 500ms)
- [ ] Frontend básico funcionando
- [ ] Testes passando
- [ ] Documentação atualizada

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
