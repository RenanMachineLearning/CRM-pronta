# Testes - CRM Backend

Documentação dos testes do backend do CRM SaaS.

## Estrutura de Testes

### Testes Unitários (`tests/unit/`)

Testam funções isoladamente, usando mocks quando necessário.

- **`password.test.ts`**: Testes de hash, comparação e validação de senhas
- **`jwt.test.ts`**: Testes de geração e validação de tokens JWT
- **`authMiddleware.test.ts`**: Testes unitários do middleware de autenticação (com mocks)
- **`entityService.test.ts`**: Testes unitários para EntityService (criação, validações, regras de negócio, isolamento multi-tenant)
- **`fieldService.test.ts`**: Testes unitários para FieldService (criação, validações de tipo, regras de negócio, isolamento multi-tenant)
- **`fieldValueValidator.test.ts`**: Testes de validação e processamento de valores por tipo de campo

### Testes de Integração (`tests/integration/`)

Testam fluxos completos com banco de dados real.

#### Autenticação

- **`auth.e2e.test.ts`**: Fluxos completos de login, logout e refresh
- **`passwordReset.e2e.test.ts`**: Fluxo completo de recuperação de senha
- **`passwordChange.e2e.test.ts`**: Fluxo completo de alteração de senha
- **`passwordPolicy.e2e.test.ts`**: Validação de política de senhas
- **`authMiddleware.integration.test.ts`**: Middleware de autenticação em requisições reais
- **`authSecurity.e2e.test.ts`**: Testes E2E de segurança (tokens expirados, manipulação, etc.)

#### Segurança

- **`rateLimiter.e2e.test.ts`**: Rate limiting e proteção contra brute force

#### Multi-tenant

- **`tenantContext.test.ts`**: Contexto de tenant
- **`tenantModel.contract.test.ts`**: Contratos do modelo de tenant
- **`userModel.contract.test.ts`**: Contratos do modelo de usuário

#### Modelo de Dados (Metadados)

- **`entityCrud.e2e.test.ts`**: Testes E2E completos para CRUD de entidades via API (create, read, update, delete, isolamento, auditoria)
- **`fieldCrud.e2e.test.ts`**: Testes E2E completos para CRUD de campos via API (create, read, update, delete, validações de tipo, isolamento, auditoria)
- **`relationships.e2e.test.ts`**: Testes E2E para relacionamentos entre entidades
- **`entityLookup.e2e.test.ts`**: Testes E2E para lookup de entidades
- **`uniqueFieldValidation.e2e.test.ts`**: Testes E2E para validação de atributos únicos
- **`fieldOptions.e2e.test.ts`**: Testes E2E para opções de campos select
- **`customFields.e2e.test.ts`**: Testes E2E preparatórios para campos customizados usando EntityData (estrutura, validação JSON, isolamento)
- **`entityData.schema.test.ts`**: Testes de validação do schema EntityData
- **`indexes.validation.test.ts`**: Testes de validação de índices estratégicos

## Executando Testes

### Todos os Testes

```bash
npm test
```

### Testes com Cobertura

```bash
# Cobertura completa
npm run test:coverage

# Cobertura apenas de busca/filtros
npm run test:coverage:search
```

### Testes Específicos

```bash
# Apenas testes de autenticação
npm run test:auth

# Apenas testes de segurança
npm run test:security

# Arquivo específico
npm test -- password.test.ts

# Padrão de arquivo
npm test -- auth
```

## Cobertura de Testes

### Configuração

A cobertura está configurada em `jest.config.ts` com thresholds mínimos:

- **Global**: 70% (branches, functions, lines, statements)
- **Arquivos de autenticação**: 80% (quality gate)
  - `src/utils/password.ts`
  - `src/utils/jwt.ts`
  - `src/services/authService.ts`
  - `src/services/passwordResetService.ts`
- **Lógica de metadados**: 70% (quality gate)
  - `src/services/entityService.ts`
  - `src/services/fieldService.ts`
  - `src/utils/fieldValueValidator.ts`
  - `src/utils/uniqueFieldValidator.ts`
- **Arquivos de busca/filtros**: 75-80% (quality gate)
  - `src/services/searchService.ts` (75%)
  - `src/utils/searchHelpers.ts` (80%)
  - `src/utils/filterBuilder.ts` (80%)
  - `src/utils/filterValidator.ts` (80%)
  - `src/utils/orderByHelpers.ts` (75%)
  - `src/utils/paginationHelper.ts` (75%)
- **Controllers e Middleware**: 70% (podem ter cobertura menor)

### Nota sobre Cobertura

Cobertura > 80% é um **indicador de qualidade (quality gate)**, não um objetivo isolado. Linhas não críticas (ex: throws defensivos, validações redundantes) podem ficar fora se não agregarem valor aos testes. O foco é cobrir lógica de negócio crítica e fluxos principais.

### Verificando Cobertura

Após executar `npm run test:coverage`, o relatório será gerado em:

- **Terminal**: Resumo da cobertura
- **HTML**: `coverage/lcov-report/index.html` (abrir no navegador)

## Mapa de Testes de Autenticação

### Hash de Senha

- **Unitário**: `tests/unit/password.test.ts`
  - Geração de hash
  - Salt único
  - Comparação de senhas
  - Validação de formato

### Geração e Validação de JWT

- **Unitário**: `tests/unit/jwt.test.ts`
  - Geração de token
  - Validação de token
  - Token expirado
  - Assinatura inválida
  - Token malformado

### Fluxo de Login

- **Integração**: `tests/integration/auth.e2e.test.ts`
  - Credenciais válidas
  - Credenciais inválidas
  - Usuário inativo/bloqueado
  - Tenant inválido
  - Validação de token retornado

### Fluxo de Logout

- **Integração**: `tests/integration/auth.e2e.test.ts`
  - Retorno de sucesso
  - Stateless (não precisa token)

### Recuperação de Senha

- **Integração**: `tests/integration/passwordReset.e2e.test.ts`
  - Geração de token
  - Envio de email (console.log em DEV)
  - Reset com token válido
  - Token expirado
  - Token usado
  - Isolamento multi-tenant

### Alteração de Senha

- **Integração**: `tests/integration/passwordChange.e2e.test.ts`
  - Senha atual correta
  - Senha atual incorreta
  - Nova senha igual à atual
  - Validação de complexidade
  - Isolamento multi-tenant

### Política de Senhas

- **Integração**: `tests/integration/passwordPolicy.e2e.test.ts`
  - Reset de senha
  - Alteração de senha
  - Mensagens de erro claras

### Segurança

- **Brute Force**: `tests/integration/rateLimiter.e2e.test.ts`
  - Bloqueio após 5 tentativas de login
  - Rate limiter global
  - Headers de rate limit

- **Tokens Expirados**: 
  - **Unitário**: `tests/unit/jwt.test.ts`
  - **E2E em rotas protegidas**: `tests/integration/authSecurity.e2e.test.ts`

- **Isolamento Multi-tenant**: `tests/integration/authMiddleware.integration.test.ts`
  - Token de tenant A não funciona em tenant B

- **Manipulação de Tokens**: `tests/integration/authSecurity.e2e.test.ts`
  - Token com assinatura inválida
  - Token malformado
  - Token sem campos obrigatórios

## Testes do Modelo de Dados

### EntityService

- **Unitário**: `tests/unit/entityService.test.ts`
  - Criação de entidades (validação de nome, label, tenantId)
  - Validação de nome único por tenant
  - Validação de nome começando com letra
  - Atualização de entidade (apenas label, não permite alterar name)
  - Deleção de entidade (validação de campos associados)
  - Listagem de entidades com contagem de campos
  - Obtenção de entidade por ID com campos e relacionamentos
  - Isolamento multi-tenant

### FieldService

- **Unitário**: `tests/unit/fieldService.test.ts`
  - Criação de campos (validação de tipo, nome único por entidade)
  - Validação de tipos de campo suportados
  - Validação de nome único por entidade
  - Atualização de campo (não permite alterar type)
  - Soft delete de campo (isDeleted)
  - Listagem de campos ordenados por `order`
  - Obtenção de campo por ID
  - Validação de opções para campos select
  - Isolamento multi-tenant

### CRUD de Entidades

- **E2E**: `tests/integration/entityCrud.e2e.test.ts`
  - Create: POST `/api/entities` (sucesso, validações, nome duplicado)
  - Read: GET `/api/entities` (listagem), GET `/api/entities/:id` (detalhes)
  - Update: PUT `/api/entities/:id` (sucesso, validações, entidades do sistema)
  - Delete: DELETE `/api/entities/:id` (sucesso, validação de campos associados)
  - Isolamento multi-tenant
  - Auditoria (logs de auditoria para create/update/delete)

### CRUD de Campos

- **E2E**: `tests/integration/fieldCrud.e2e.test.ts`
  - Create: POST `/api/fields` (sucesso, validações, tipo inválido, nome duplicado)
  - Read: GET `/api/fields?entityId=...` (listagem), GET `/api/fields/:id` (detalhes)
  - Update: PUT `/api/fields/:id` (sucesso, validações, não permite alterar type)
  - Delete: DELETE `/api/fields/:id` (soft delete)
  - Validação de tipos: todos os tipos suportados (text, number, date, boolean, lookup, select)
  - Isolamento multi-tenant
  - Auditoria (logs de auditoria para create/update/delete)

### Campos Customizados (EntityData)

- **E2E Preparatório**: `tests/integration/customFields.e2e.test.ts`
  - Estrutura: validar que `EntityData` pode armazenar dados JSON
  - Criação: criar registro em `EntityData` com campos customizados (preparatório)
  - Validação: validar estrutura de dados JSON (campos text, number, date, boolean, select)
  - Isolamento multi-tenant
  - **Nota**: Testes completos de CRUD serão implementados nas próximas etapas quando o serviço completo de `EntityData` for criado

## Boas Práticas

### Organização

- **Testes unitários**: Testam funções isoladamente (mocks quando necessário)
- **Testes de integração**: Testam fluxos completos com banco de dados real
- **Testes de segurança**: Testam vulnerabilidades e proteções

### Manutenibilidade

- Testes devem ser independentes (não depender de ordem)
- Usar `beforeAll`/`afterAll` para setup/teardown
- Limpar banco de dados entre testes
- Usar dados de teste consistentes

### Cobertura

- Focar em lógica de negócio (services, controllers, utils)
- Middleware pode ter cobertura menor (mais difícil de testar isoladamente)
- Testes E2E complementam cobertura de integração
- Não forçar cobertura de código defensivo se não agregar valor

## Testes de Busca e Filtros

### Estrutura

- **Unitários**: `tests/unit/`
  - `searchService.test.ts` - Busca global
  - `searchHelpers.test.ts` - Normalização de texto
  - `filterBuilder.test.ts` - Construção de filtros
  - `filterValidator.test.ts` - Validação de filtros
  - `orderByHelpers.test.ts` - Ordenação
  - `paginationHelper.test.ts` - Paginação
  - `services/filterService.test.ts` - Testes agrupados de filtros
  - `controllers/searchController.test.ts` - Controller de busca

- **Integração**: `tests/integration/`
  - `search/searchRoutes.test.ts` - Busca global E2E
  - `search/multiEntitySearch.test.ts` - Busca simultânea em múltiplas entidades
  - `search/diacriticsSearch.test.ts` - Normalização de texto
  - `filters/advancedFilters.test.ts` - Filtros avançados (todos os 13 operadores)
  - `filters/combinedFiltersWithSearch.test.ts` - Filtros combinados com busca textual
  - `filters/entitySpecificFilters.test.ts` - Filtros específicos por entidade
  - `pagination/pagination.test.ts` - Paginação com volume e combinações
  - `orderBy/orderBy.test.ts` - Ordenação
  - `performance/volumePerformance.test.ts` - Performance com volume massivo
  - `performance/queryPerformance.test.ts` - Performance de queries

### Helpers

- `helpers/testData.ts` - Funções para criar dados de teste reutilizáveis
- `helpers/mockData.ts` - Mocks reutilizáveis para serviços

## Troubleshooting

### Testes Falhando

1. Verificar se o banco de dados está rodando (Docker)
2. Verificar variáveis de ambiente (`.env`)
3. Executar `npm run prisma:generate` se houver mudanças no schema
4. Limpar banco de dados: `npm run prisma:migrate reset` (cuidado: apaga dados)

### Cobertura Baixa

1. Identificar linhas não cobertas no relatório HTML
2. Avaliar se são críticas (lógica de negócio) ou não (código defensivo)
3. Adicionar testes apenas para lacunas críticas
4. Não forçar cobertura de código que não agrega valor
5. Executar `npm run test:coverage:search` para focar em busca/filtros

### Testes Lentos

1. Verificar se há testes desnecessários duplicados
2. Usar `beforeAll` em vez de `beforeEach` quando possível
3. Limpar banco apenas quando necessário
4. Executar testes específicos durante desenvolvimento
5. Testes de volume podem ser lentos - executar separadamente se necessário

