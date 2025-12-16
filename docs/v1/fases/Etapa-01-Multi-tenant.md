# Etapa 1 — Multi-tenant (Isolamento por Tenant)

> **Dependências**: Nenhuma (base do sistema)  
> **Stack**: Node.js + TypeScript, PostgreSQL, Prisma  
> **Referência**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`

## Objetivo da Etapa

Implementar a arquitetura multi-tenant que garante isolamento de dados, contexto de tenant e suporta operação SaaS desde o início. **Tudo no sistema depende desta etapa.**

---

## Checklist de Implementação

### 1. Modelo de Dados — Tabela de Tenants

#### Backend (Prisma Schema)
- [ ] Criar tabela `Tenant` no schema Prisma
  - [ ] Campo `id` (UUID ou auto-increment)
  - [ ] Campo `name` (nome do tenant)
  - [ ] Campo `slug` (identificador único, ex: "empresa-abc")
  - [ ] Campo `subdomain` (opcional, para identificação por subdomínio)
  - [ ] Campos `created_at` e `updated_at` (timestamps)
  - [ ] Campo `status` (ativo, suspenso, etc.)
  - [ ] Índice único em `slug`
  - [ ] Índice único em `subdomain` (se aplicável)

- [ ] Criar migração Prisma inicial
  - [ ] Executar `prisma migrate dev --name init_tenant`
  - [ ] Validar que a tabela foi criada corretamente

#### Validação
- [ ] Testar criação de tenant via Prisma Studio ou script
- [ ] Verificar que slugs únicos são respeitados

---

### 2. Middleware de Contexto de Tenant

#### Backend (Node.js + TypeScript)
- [ ] Criar middleware `tenantContext.ts`
  - [ ] Extrair tenant de:
    - [ ] Header HTTP (ex: `X-Tenant-Id` ou `X-Tenant-Slug`)
    - [ ] Subdomínio (se configurado)
    - [ ] Path parameter (ex: `/api/:tenantId/...`)
  - [ ] Validar que tenant existe no banco
  - [ ] Adicionar `tenantId` ao objeto `request` (Express/Fastify)
  - [ ] Retornar erro 401/403 se tenant não encontrado ou inativo

- [ ] Integrar middleware nas rotas
  - [ ] Aplicar middleware globalmente ou em rotas específicas
  - [ ] Testar que requisições sem tenant são rejeitadas
  - [ ] Testar que requisições com tenant inválido são rejeitadas

#### Validação
- [ ] Teste unitário: middleware extrai tenant corretamente
- [ ] Teste de integração: requisição com tenant válido passa
- [ ] Teste de integração: requisição com tenant inválido falha

---

### 3. Isolamento de Dados — Fundação Multi-Tenant

#### Objetivo
Definir as **regras estruturais obrigatórias** para garantir isolamento de dados entre tenants no nível de banco de dados e schema.  
Esta etapa estabelece **convenções e constraints**, mas **não implementa ainda mecanismos automáticos de enforcement em runtime**.

---

#### Backend (Prisma Schema)

- [ ] Definir convenção obrigatória de multi-tenancy
  - [ ] Todas as tabelas de dados (exceto `Tenant`) DEVEM conter o campo `tenantId`
  - [ ] O campo `tenantId` é obrigatório (NOT NULL)
  - [ ] Nenhuma tabela de domínio pode existir sem `tenantId`

- [ ] Definir tipo e relacionamento do campo `tenantId`
  - [ ] Tipo: `tenantId String @db.Uuid`
  - [ ] Foreign key: `tenantId` referencia `Tenant.id`
  - [ ] Relação explícita via `@relation(fields: [tenantId], references: [id])`

- [ ] Definir padrão de índices para performance
  - [ ] Criar índice composto `@@index([tenantId, id])` em todas as tabelas futuras
  - [ ] Garantir que queries tenant-scoped sejam eficientes desde o início

- [ ] Documentar a convenção diretamente no `schema.prisma`
  - [ ] Comentário no topo do schema descrevendo o padrão multi-tenant
  - [ ] Exemplo ilustrativo de um modelo futuro seguindo a convenção
  - [ ] Aviso explícito: tabelas sem `tenantId` NÃO são permitidas

---

#### Escopo Deliberadamente Fora Desta Etapa

> Os itens abaixo são **importantes**, mas **não fazem parte desta fase** e serão tratados quando houver tabelas de domínio reais e autenticação implementada.

- ⏭️ Helpers automáticos para queries (`whereTenant`, wrappers Prisma)
- ⏭️ Injeção automática de `tenantId` em queries
- ⏭️ Bloqueio de execução de queries sem `tenantId` em runtime
- ⏭️ Testes de isolamento cruzado entre tenants

Esses mecanismos serão introduzidos **após a criação das primeiras entidades de domínio** (ex: User, Contact, Lead).

---

#### Validação (Nível Estrutural)

- [ ] Revisar manualmente o schema para garantir que:
  - [ ] Toda nova tabela criada contém `tenantId`
  - [ ] O relacionamento com `Tenant` está corretamente definido
  - [ ] O índice composto `(tenantId, id)` está presente

> A validação nesta etapa é **estrutural e de design**, não comp

---

### 4. Seed Data — Tenant de Demonstração

#### Backend (Scripts)
- [ ] Criar script de seed (`prisma/seed.ts`)
  - [ ] Criar tenant de demonstração (ex: "Demo Company")
  - [ ] Slug: "demo"
  - [ ] Status: ativo
  - [ ] Configurações iniciais (se houver)

- [ ] Configurar Prisma para executar seed
  - [ ] Adicionar `"prisma": { "seed": "ts-node prisma/seed.ts" }` no `package.json`
  - [ ] Testar execução: `prisma db seed`

#### Validação
- [ ] Verificar que tenant de demo foi criado
- [ ] Verificar que pode acessar dados do tenant demo

---

### 5. Testes de Isolamento

#### Backend (Testes)
- [ ] Criar testes de isolamento
  - [ ] Teste: criar dados no Tenant A
  - [ ] Teste: consultar dados do Tenant B → deve retornar vazio
  - [ ] Teste: tentar atualizar dados do Tenant A usando contexto do Tenant B → deve falhar
  - [ ] Teste: tentar deletar dados do Tenant A usando contexto do Tenant B → deve falhar

- [ ] Criar testes de integração
  - [ ] Teste E2E: fluxo completo com múltiplos tenants
  - [ ] Validar que dados não vazam entre tenants

#### Validação
- [ ] Todos os testes de isolamento passando
- [ ] Cobertura de testes > 80% para lógica de tenant

---

### 6. Documentação

#### Documentação Técnica
- [ ] Documentar estratégia de identificação de tenant
  - [ ] Qual método será usado (header, subdomínio, path)
  - [ ] Como configurar em cada ambiente

- [ ] Documentar padrão de queries
  - [ ] Exemplo de query com `tenantId`
  - [ ] Exemplo de criação de registro com `tenantId`
  - [ ] Aviso: nunca fazer query sem `tenantId`

- [ ] Atualizar README com instruções de setup
  - [ ] Como criar tenant de desenvolvimento
  - [ ] Como testar isolamento manualmente

---

## Critérios de Prontidão

Antes de avançar para a **Etapa 2 (Autenticação)**, verifique:

- [ ] Sistema cria e gerencia múltiplos tenants
- [ ] Isolamento de dados garantido (testes de isolamento passando)
- [ ] Contexto de tenant disponível em todas as requisições
- [ ] Nenhuma query pode ser executada sem `tenantId`
- [ ] Testes de isolamento com 100% de sucesso
- [ ] Documentação atualizada

---

## Tecnologias Utilizadas

- **Backend**: Node.js + TypeScript
- **ORM/Migrações**: Prisma
- **Banco de dados**: PostgreSQL
- **Framework**: Express ou Fastify (conforme escolha)

---

## Próximos Passos

Após completar esta etapa, você pode avançar para:

**→ [Etapa 2: Autenticação e Gestão de Sessão](./Etapa-02-Autenticacao.md)**

---

## Notas Importantes

⚠️ **Atenção**: Esta é a etapa mais crítica do sistema. Qualquer falha no isolamento multi-tenant pode resultar em vazamento de dados entre clientes, o que é inaceitável em um SaaS.

✅ **Boas práticas**:
- Sempre validar `tenantId` antes de qualquer operação
- Nunca fazer queries sem filtro de tenant
- Testar isolamento após cada nova funcionalidade
- Revisar código regularmente para garantir que `tenantId` está presente

---

## Referências

- **Roadmap Funcional**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`
- **Decisão de Stack**: `Features/meu_projeto/v1/Decisao-Stack-V1.md`
- **Fase 1 (Infraestrutura)**: `Features/meu_projeto/v1/fases/Fase-01-Preparacao-de-ambiente-e-infraestrutura-base.md`
