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

### 3. Isolamento de Dados — Tenant ID em Todas as Tabelas

#### Backend (Prisma Schema)
- [ ] Adicionar `tenantId` em todas as tabelas futuras
  - [ ] Criar convenção: todas as tabelas de dados têm `tenantId`
  - [ ] Definir tipo: `tenantId String @db.Uuid` (ou `Int` se usar auto-increment)
  - [ ] Adicionar foreign key: `tenantId` referencia `Tenant.id`
  - [ ] Adicionar índice composto: `(tenantId, id)` para performance

- [ ] Criar helper/utilitário para queries
  - [ ] Função `whereTenant(tenantId: string)` para Prisma queries
  - [ ] Middleware que injeta `tenantId` automaticamente em queries
  - [ ] Validar que nenhuma query pode ser executada sem `tenantId`

#### Validação
- [ ] Teste: tentar criar registro sem `tenantId` → deve falhar
- [ ] Teste: query sem filtro de tenant → deve retornar vazio ou erro
- [ ] Teste: query com `tenantId` incorreto → deve retornar vazio

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
