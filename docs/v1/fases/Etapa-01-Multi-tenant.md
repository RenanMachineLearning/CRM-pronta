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
- [x] Criar tabela `Tenant` no schema Prisma
  - [x] Campo `id` (UUID ou auto-increment)
  - [x] Campo `name` (nome do tenant)
  - [x] Campo `slug` (identificador único, ex: "empresa-abc")
  - [x] Campo `subdomain` (opcional, para identificação por subdomínio)
  - [x] Campos `created_at` e `updated_at` (timestamps)
  - [x] Campo `status` (ativo, suspenso, etc.)
  - [x] Índice único em `slug`
  - [x] Índice único em `subdomain` (se aplicável)

- [x] Criar migração Prisma inicial
  - [x] Executar `prisma migrate dev --name init_tenant`
  - [x] Validar que a tabela foi criada corretamente

#### Validação
- [x] Testar criação de tenant via Prisma Studio ou script
- [x] Verificar que slugs únicos são respeitados

---

### 2. Middleware de Contexto de Tenant

#### Backend (Node.js + TypeScript)
- [x] Criar middleware `tenantContext.ts`
  - [x] Extrair tenant de:
    - [x] Header HTTP (ex: `X-Tenant-Id` ou `X-Tenant-Slug`)
    - [ ] Subdomínio (se configurado) - **Não implementado (fora do escopo V1)**
    - [ ] Path parameter (ex: `/api/:tenantId/...`) - **Não implementado (fora do escopo V1)**
  - [x] Validar que tenant existe no banco
  - [x] Adicionar `tenantId` ao objeto `request` (Express/Fastify)
  - [x] Retornar erro 401/403 se tenant não encontrado ou inativo

- [x] Integrar middleware nas rotas
  - [x] Aplicar middleware globalmente ou em rotas específicas
  - [x] Testar que requisições sem tenant são rejeitadas
  - [x] Testar que requisições com tenant inválido são rejeitadas

#### Validação
- [x] Teste unitário: middleware extrai tenant corretamente
- [x] Teste de integração: requisição com tenant válido passa
- [x] Teste de integração: requisição com tenant inválido falha

---

### 3. Isolamento de Dados — Fundação Multi-Tenant

#### Objetivo
Definir as **regras estruturais obrigatórias** para garantir isolamento de dados entre tenants no nível de banco de dados e schema.  
Esta etapa estabelece **convenções e constraints**, mas **não implementa ainda mecanismos automáticos de enforcement em runtime**.

---

#### Backend (Prisma Schema)

- [x] Definir convenção obrigatória de multi-tenancy
  - [x] Todas as tabelas de dados (exceto `Tenant`) DEVEM conter o campo `tenantId`
  - [x] O campo `tenantId` é obrigatório (NOT NULL)
  - [x] Nenhuma tabela de domínio pode existir sem `tenantId`

- [x] Definir tipo e relacionamento do campo `tenantId`
  - [x] Tipo: `tenantId String @db.Uuid`
  - [x] Foreign key: `tenantId` referencia `Tenant.id`
  - [x] Relação explícita via `@relation(fields: [tenantId], references: [id])`

- [x] Definir padrão de índices para performance
  - [x] Criar índice composto `@@index([tenantId, id])` em todas as tabelas futuras
  - [x] Garantir que queries tenant-scoped sejam eficientes desde o início

- [x] Documentar a convenção diretamente no `schema.prisma`
  - [x] Comentário no topo do schema descrevendo o padrão multi-tenant
  - [x] Exemplo ilustrativo de um modelo futuro seguindo a convenção
  - [x] Aviso explícito: tabelas sem `tenantId` NÃO são permitidas

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

- [x] Revisar manualmente o schema para garantir que:
  - [x] Toda nova tabela criada contém `tenantId`
  - [x] O relacionamento com `Tenant` está corretamente definido
  - [x] O índice composto `(tenantId, id)` está presente

> A validação nesta etapa é **estrutural e de design**, não comp

---

### 4. Seed Data — Tenant de Demonstração

#### Backend (Scripts)
- [x] Criar script de seed (`prisma/seed.ts`)
  - [x] Criar tenant de demonstração (ex: "Demo Company")
  - [x] Slug: "demo"
  - [x] Status: ativo
  - [x] Configurações iniciais (se houver)

- [x] Configurar Prisma para executar seed
  - [x] Adicionar `"prisma": { "seed": "ts-node prisma/seed.ts" }` no `package.json`
  - [x] Testar execução: `prisma db seed`

#### Validação
- [x] Verificar que tenant de demo foi criado
- [x] Verificar que pode acessar dados do tenant demo

---

### 5. Testes de Isolamento

Perfeito. Vou **refazer a Etapa 05 do zero**, **alinhada exatamente ao estado atual do projeto**, sem adiantar enforcement que ainda não existe — e mantendo o rigor arquitetural que você já está aplicando.

A ideia aqui é:
👉 **fundação + segurança conceitual**, não “isolamento mágico” antes da hora.

---

# ✅ Etapa 05 — Testes de Fundação Multi-Tenant (Pré-Isolamento)

## Objetivo

Validar que a **fundação multi-tenant** do sistema está correta antes da criação das entidades de domínio, garantindo que:

* A identificação de tenant funciona corretamente
* Tenants inativos ou inválidos são bloqueados
* As regras estruturais documentadas estão sendo respeitadas
* O projeto está preparado para isolamento real nas próximas etapas

> ⚠️ Esta etapa **não valida isolamento completo de dados**, pois ainda não existem tabelas de domínio nem enforcement automático de tenantId.

---

## Escopo da Etapa

### O que esta etapa FAZ

* Testa **comportamento do sistema em relação a tenants**
* Testa **contratos e garantias existentes**
* Previne regressões na base multi-tenant

### O que esta etapa NÃO FAZ

* Não testa CRUD isolado entre tenants
* Não cria tabelas artificiais apenas para teste
* Não implementa middleware/extension de Prisma
* Não valida vazamento de dados entre entidades de domínio (ainda inexistentes)

---

## Backend — Testes

### 1️⃣ Testes de Integração do Contexto de Tenant

📁 `backend/tests/integration/tenantContext.foundation.test.ts`

Criar testes que validem:

* [x] **Rota pública**

  * `/health` retorna 200 sem header de tenant

* [x] **Requisição sem tenant**

  * Rotas protegidas retornam `400 Tenant não identificado`

* [x] **Tenant inexistente**

  * Header com ID ou slug inválido → `403 Acesso negado`

* [x] **Tenant inativo**

  * Tenant com status `SUSPENDED` ou `CANCELLED` → `403`

* [x] **Tenant válido**

  * Header `X-Tenant-Id` válido → `200`
  * Header `X-Tenant-Slug` válido → `200`

> Esses testes garantem que **nenhuma requisição entra no sistema sem tenant válido**.

---

### 2️⃣ Testes de Contrato do Modelo Tenant

📁 `backend/tests/integration/tenantModel.contract.test.ts`

Testar garantias estruturais do Tenant:

* [x] Slug é único
* [x] Subdomain (quando presente) é único
* [x] Status default é `ACTIVE`
* [x] Tenant inativo não passa pela validação do `TenantService`
* [x] `TenantService.validateById` e `validateBySlug` funcionam corretamente

Esses testes protegem a **base lógica do isolamento**.

---

### 3️⃣ Testes de Regressão da Convenção Multi-Tenant

📁 `backend/tests/architecture/multiTenantConvention.test.ts` (opcional, mas elegante)

Testes simples (não CRUD) que garantem:

* [x] Convenção multi-tenant está documentada no schema
* [x] Não existem tabelas além de `Tenant` no schema (por enquanto)
* [x] Avisos de "tenantId obrigatório" estão presentes no schema

> Esse tipo de teste evita que alguém “pule” o padrão no futuro.

---

### 4️⃣ Placeholders para Isolamento Real (Intencionalmente Skipped)

📁 `backend/tests/integration/tenantIsolation.todo.test.ts`

Criar testes **marcados como skipped** com descrição clara:

* [x] Criar dados no Tenant A
* [x] Tenant B não pode ler dados do Tenant A
* [x] Tenant B não pode atualizar dados do Tenant A
* [x] Tenant B não pode deletar dados do Tenant A

```ts
describe.skip('Tenant Isolation — Domain Entities', () => {
  it('Tenant A data is not accessible by Tenant B', () => {
    // Será implementado quando entidades de domínio existirem
  });
});
```

📌 Isso cria **compromisso arquitetural explícito**, sem falsear segurança.

---

## Validação da Etapa

Após implementação:

* [x] Todos os testes da fundação multi-tenant passam
* [x] Nenhuma rota protegida é acessível sem tenant válido
* [x] Tenant inativo é bloqueado corretamente
* [x] Convenção multi-tenant está documentada e protegida
* [x] Testes de isolamento real estão explicitamente planejados (skipped)

---

## Métrica de Qualidade (ajustada)

* ❌ Não exigir cobertura > 80% (ainda não existe domínio)
* ✅ Garantir cobertura total da **lógica de tenant existente**
* ✅ Nenhum teste “falso” que passe por coincidência

---

## Observações Arquiteturais

* Isolamento real **depende de domínio + enforcement**
* Esta etapa evita o erro clássico de “achar que é multi-tenant”
* A segurança aqui é **estrutural e conceitual**
* O isolamento real começa **na próxima etapa**, não aqui

---

## 🔚 Resumo Executivo

| Item                  | Status          |
| --------------------- | --------------- |
| Fundação multi-tenant | ✅ Validada      |
| Tenant Context        | ✅ Testado       |
| Segurança básica      | ✅ Garantida     |
| Isolamento real       | ⏭ Próxima etapa |
| Dívida técnica        | ❌ Evitada       |

---

Se quiser, o **próximo passo ideal** é:

👉 **Etapa 06 — Usuários + Autenticação (Tenant-aware)**
onde finalmente o isolamento real começa a existir de verdade.

---

### 6. Documentação

#### Objetivo
Documentar as decisões essenciais do modelo multi-tenant para evitar vazamento de dados, padronizar desenvolvimento e facilitar onboarding.

#### Backend (Documentação)
- [x] Criar documento principal `docs/MULTI-TENANT.md`
  - [x] Seção 6.1: Estratégia de Identificação de Tenant
  - [x] Seção 6.2: Padrão Obrigatório de Queries
  - [x] Seção 6.3: Setup de Desenvolvimento
  - [x] Seção 6.4: Checklist de Revisão (Multi-Tenant)
  - [x] Exemplos práticos e troubleshooting

#### Validação
- [x] Documentação está clara e completa
- [x] Exemplos de código estão corretos
- [x] Checklist de revisão está prático
- [x] Documentação está acessível em `docs/`

---

## 6.1 Estratégia de Identificação de Tenant

### Método adotado
- **Headers HTTP**
  - `X-Tenant-Id` (UUID)
  - `X-Tenant-Slug` (string)

### Regras
- Headers ausentes → **400**
- Tenant inválido ou inexistente → **403**
- Tenant inativo (SUSPENDED / CANCELLED) → **403**
- Tenant válido → request prossegue com `req.tenantId` disponível

📌 Nenhuma rota protegida executa sem tenant válido.

---

## 6.2 Padrão Obrigatório de Queries

### Sempre usar `tenantId`
```ts
prisma.entity.findMany({
  where: { tenantId: req.tenantId },
});

prisma.entity.create({
  data: { tenantId: req.tenantId, ... },
});

Anti-padrões (proibidos)
prisma.entity.findMany();        // ❌
prisma.entity.findUnique({ id }); // ❌

📌 Queries sem tenantId são consideradas falha de segurança.

6.3 Setup de Desenvolvimento
Criar tenant de desenvolvimento
npm run seed

Ou via Prisma Studio:
npx prisma studio

Tenant deve estar com status = ACTIVE.

6.4 Checklist de Revisão (Multi-Tenant)

Antes de aprovar um PR:

Todas as queries filtram por tenantId

Nenhuma query usa apenas id

tenantId vem do contexto (req.tenantId)

Nenhuma rota protegida ignora o middleware de tenant

Observações

Esta documentação faz parte da segurança do sistema

Isolamento real será validado quando existirem entidades de domínio

Qualquer vazamento entre tenants é BUG CRÍTICO

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
