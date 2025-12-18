# Testes - CRM Backend

Documentação dos testes do backend do CRM SaaS.

## Estrutura de Testes

### Testes Unitários (`tests/unit/`)

Testam funções isoladamente, usando mocks quando necessário.

- **`password.test.ts`**: Testes de hash, comparação e validação de senhas
- **`jwt.test.ts`**: Testes de geração e validação de tokens JWT
- **`authMiddleware.test.ts`**: Testes unitários do middleware de autenticação (com mocks)

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

## Executando Testes

### Todos os Testes

```bash
npm test
```

### Testes com Cobertura

```bash
npm run test:coverage
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

### Testes Lentos

1. Verificar se há testes desnecessários duplicados
2. Usar `beforeAll` em vez de `beforeEach` quando possível
3. Limpar banco apenas quando necessário
4. Executar testes específicos durante desenvolvimento

