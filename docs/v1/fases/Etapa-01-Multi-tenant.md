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

* [ ] **Rota pública**

  * `/health` retorna 200 sem header de tenant

* [ ] **Requisição sem tenant**

  * Rotas protegidas retornam `400 Tenant não identificado`

* [ ] **Tenant inexistente**

  * Header com ID ou slug inválido → `403 Acesso negado`

* [ ] **Tenant inativo**

  * Tenant com status `SUSPENDED` ou `CANCELLED` → `403`

* [ ] **Tenant válido**

  * Header `X-Tenant-Id` válido → `200`
  * Header `X-Tenant-Slug` válido → `200`

> Esses testes garantem que **nenhuma requisição entra no sistema sem tenant válido**.

---

### 2️⃣ Testes de Contrato do Modelo Tenant

📁 `backend/tests/integration/tenantModel.contract.test.ts`

Testar garantias estruturais do Tenant:

* [ ] Slug é único
* [ ] Subdomain (quando presente) é único
* [ ] Status default é `ACTIVE`
* [ ] Tenant inativo não passa pela validação do `TenantService`
* [ ] `TenantService.validateById` e `validateBySlug` funcionam corretamente

Esses testes protegem a **base lógica do isolamento**.

---

### 3️⃣ Testes de Regressão da Convenção Multi-Tenant

📁 `backend/tests/architecture/multiTenantConvention.test.ts` (opcional, mas elegante)

Testes simples (não CRUD) que garantem:

* [ ] Convenção multi-tenant está documentada no schema
* [ ] Não existem tabelas além de `Tenant` no schema (por enquanto)
* [ ] Avisos de “tenantId obrigatório” estão presentes no schema

> Esse tipo de teste evita que alguém “pule” o padrão no futuro.

---

### 4️⃣ Placeholders para Isolamento Real (Intencionalmente Skipped)

📁 `backend/tests/integration/tenantIsolation.todo.test.ts`

Criar testes **marcados como skipped** com descrição clara:

* [ ] Criar dados no Tenant A
* [ ] Tenant B não pode ler dados do Tenant A
* [ ] Tenant B não pode atualizar dados do Tenant A
* [ ] Tenant B não pode deletar dados do Tenant A

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

* [ ] Todos os testes da fundação multi-tenant passam
* [ ] Nenhuma rota protegida é acessível sem tenant válido
* [ ] Tenant inativo é bloqueado corretamente
* [ ] Convenção multi-tenant está documentada e protegida
* [ ] Testes de isolamento real estão explicitamente planejados (skipped)

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

## Objetivo
Documentar as decisões essenciais do modelo multi-tenant para evitar vazamento de dados, padronizar desenvolvimento e facilitar onboarding.

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
