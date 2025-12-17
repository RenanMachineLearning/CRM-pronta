# Multi-Tenant — Guia de Referência

> **Objetivo**: Documentar as decisões essenciais do modelo multi-tenant para evitar vazamento de dados, padronizar desenvolvimento e facilitar onboarding.

⚠️ **IMPORTANTE**: Esta documentação faz parte da segurança do sistema. Qualquer vazamento entre tenants é **BUG CRÍTICO**.

---

## 1. Estratégia de Identificação de Tenant

### Método Adotado

O sistema identifica o tenant através de **Headers HTTP**:

- `X-Tenant-Id` (UUID do tenant)
- `X-Tenant-Slug` (slug único do tenant, ex: "demo", "empresa-abc")

**Prioridade**: Se ambos os headers estiverem presentes, `X-Tenant-Id` tem prioridade sobre `X-Tenant-Slug`.

### Regras de Validação

| Situação | Status Code | Descrição |
|----------|-------------|-----------|
| Headers ausentes | **400 Bad Request** | Nenhum header `X-Tenant-Id` ou `X-Tenant-Slug` fornecido |
| Tenant inexistente | **403 Forbidden** | ID ou slug não existe no banco de dados |
| Tenant inativo | **403 Forbidden** | Tenant existe mas está com status `SUSPENDED` ou `CANCELLED` |
| Tenant válido | **200 OK** | Request prossegue com `req.tenantId` e `req.tenant` disponíveis |

📌 **Regra crítica**: Nenhuma rota protegida executa sem tenant válido.

### Exemplos de Uso

#### Requisição HTTP com cURL

```bash
# Usando X-Tenant-Id
curl -X GET http://localhost:5000/api/test \
  -H "X-Tenant-Id: 4e8a3e3d-b29c-455c-8063-e8a13dd00ca3"

# Usando X-Tenant-Slug
curl -X GET http://localhost:5000/api/test \
  -H "X-Tenant-Slug: demo"
```

#### Requisição HTTP com JavaScript/Fetch

```typescript
// Usando X-Tenant-Id
const response = await fetch('http://localhost:5000/api/test', {
  headers: {
    'X-Tenant-Id': '4e8a3e3d-b29c-455c-8063-e8a13dd00ca3',
  },
});

// Usando X-Tenant-Slug
const response = await fetch('http://localhost:5000/api/test', {
  headers: {
    'X-Tenant-Slug': 'demo',
  },
});
```

#### Acesso ao Tenant no Código

Após passar pelo middleware, o tenant está disponível no objeto `request`:

```typescript
app.get('/api/example', (req, res) => {
  // req.tenantId contém o UUID do tenant
  const tenantId = req.tenantId;
  
  // req.tenant contém o objeto completo do tenant
  const tenant = req.tenant;
  
  res.json({
    tenantId: tenantId,
    tenantName: tenant?.name,
  });
});
```

### Implementação Técnica

O middleware `tenantContextMiddleware` está localizado em:
- **Arquivo**: `backend/src/middleware/tenantContext.ts`
- **Aplicação**: Globalmente em todas as rotas (exceto rotas públicas como `/health`)

---

## 2. Padrão Obrigatório de Queries

### ✅ Sempre Usar `tenantId`

**Todas as queries ao banco de dados DEVEM incluir `tenantId`** para garantir isolamento de dados.

#### Exemplos Corretos

```typescript
import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

// ✅ Buscar todos os registros do tenant
const entities = await prisma.entity.findMany({
  where: {
    tenantId: req.tenantId, // SEMPRE filtrar por tenantId
  },
});

// ✅ Buscar registro específico do tenant
const entity = await prisma.entity.findUnique({
  where: {
    id: entityId,
    tenantId: req.tenantId, // SEMPRE incluir tenantId
  },
});

// ✅ Criar registro com tenantId
const newEntity = await prisma.entity.create({
  data: {
    tenantId: req.tenantId, // SEMPRE incluir tenantId
    name: 'Example',
    // ... outros campos
  },
});

// ✅ Atualizar registro do tenant
const updated = await prisma.entity.updateMany({
  where: {
    id: entityId,
    tenantId: req.tenantId, // SEMPRE incluir tenantId no where
  },
  data: {
    name: 'Updated Name',
  },
});

// ✅ Deletar registro do tenant
const deleted = await prisma.entity.deleteMany({
  where: {
    id: entityId,
    tenantId: req.tenantId, // SEMPRE incluir tenantId no where
  },
});
```

### ❌ Anti-padrões (Proibidos)

**NUNCA faça queries sem `tenantId`**. Estas são falhas críticas de segurança:

```typescript
// ❌ PERIGO: Busca sem filtro de tenant
const entities = await prisma.entity.findMany();
// Isso retorna dados de TODOS os tenants!

// ❌ PERIGO: Busca apenas por ID
const entity = await prisma.entity.findUnique({
  where: { id: entityId },
});
// Isso pode retornar dados de outro tenant!

// ❌ PERIGO: Update sem verificar tenant
await prisma.entity.update({
  where: { id: entityId },
  data: { name: 'Hacked' },
});
// Isso pode atualizar dados de outro tenant!

// ❌ PERIGO: Delete sem verificar tenant
await prisma.entity.delete({
  where: { id: entityId },
});
// Isso pode deletar dados de outro tenant!
```

### Por Que São Perigosas?

Queries sem `tenantId` permitem:
- **Vazamento de dados**: Um tenant pode acessar dados de outro tenant
- **Modificação não autorizada**: Um tenant pode modificar/deletar dados de outro tenant
- **Violação de isolamento**: Quebra fundamental da arquitetura multi-tenant

📌 **Regra crítica**: Queries sem `tenantId` são consideradas **falha de segurança** e devem ser rejeitadas em code review.

### Exemplos Práticos por Operação

#### CREATE (Criar)

```typescript
// ✅ CORRETO
const newEntity = await prisma.entity.create({
  data: {
    tenantId: req.tenantId, // Obrigatório
    name: 'New Entity',
    // ... outros campos
  },
});
```

#### READ (Ler)

```typescript
// ✅ CORRETO - Listar todos do tenant
const entities = await prisma.entity.findMany({
  where: { tenantId: req.tenantId },
});

// ✅ CORRETO - Buscar um específico do tenant
const entity = await prisma.entity.findFirst({
  where: {
    id: entityId,
    tenantId: req.tenantId, // Sempre incluir tenantId
  },
});
```

#### UPDATE (Atualizar)

```typescript
// ✅ CORRETO - Usar updateMany com tenantId no where
const result = await prisma.entity.updateMany({
  where: {
    id: entityId,
    tenantId: req.tenantId, // Obrigatório no where
  },
  data: {
    name: 'Updated Name',
  },
});

// Verificar se algum registro foi atualizado
if (result.count === 0) {
  throw new Error('Entity not found or belongs to another tenant');
}
```

#### DELETE (Deletar)

```typescript
// ✅ CORRETO - Usar deleteMany com tenantId no where
const result = await prisma.entity.deleteMany({
  where: {
    id: entityId,
    tenantId: req.tenantId, // Obrigatório no where
  },
});

// Verificar se algum registro foi deletado
if (result.count === 0) {
  throw new Error('Entity not found or belongs to another tenant');
}
```

---

## 3. Setup de Desenvolvimento

### Criar Tenant de Desenvolvimento

#### Opção 1: Usando Seed (Recomendado)

```bash
cd backend
npm run seed
```

Isso criará um tenant de demonstração com:
- **Nome**: "Demo Company"
- **Slug**: "demo"
- **Status**: `ACTIVE`

#### Opção 2: Via Prisma Studio

```bash
cd backend
npx prisma studio
```

1. Abra o Prisma Studio no navegador
2. Selecione a tabela `Tenant`
3. Clique em "Add record"
4. Preencha os campos:
   - `name`: "Demo Company"
   - `slug`: "demo"
   - `status`: `ACTIVE`
   - `subdomain`: `null` (ou deixe vazio)
5. Clique em "Save"

### Verificar Status do Tenant

O tenant deve estar com `status = ACTIVE` para funcionar. Para verificar:

```bash
# Via Prisma Studio
npx prisma studio

# Ou via script SQL
psql -h localhost -p 5434 -U crm_user -d crm_db -c "SELECT id, name, slug, status FROM tenants;"
```

### Usar o Tenant de Desenvolvimento

Após criar o tenant, use o slug ou ID nas requisições:

```bash
# Usando slug (mais fácil)
curl -X GET http://localhost:5000/api/test \
  -H "X-Tenant-Slug: demo"

# Usando ID (UUID do tenant)
curl -X GET http://localhost:5000/api/test \
  -H "X-Tenant-Id: <uuid-do-tenant>"
```

### Troubleshooting

#### Tenant não encontrado (403)

**Problema**: Requisição retorna `403 Forbidden` com mensagem "Tenant inválido ou inativo".

**Soluções**:
1. Verificar se o tenant existe no banco:
   ```bash
   npx prisma studio
   ```
2. Verificar se o slug/ID está correto
3. Verificar se o tenant está com `status = ACTIVE`
4. Executar seed novamente: `npm run seed`

#### Headers ausentes (400)

**Problema**: Requisição retorna `400 Bad Request` com mensagem "Tenant não identificado".

**Solução**: Adicionar header `X-Tenant-Id` ou `X-Tenant-Slug` na requisição.

---

## 4. Checklist de Revisão (Multi-Tenant)

Use este checklist **antes de aprovar um Pull Request** que modifica código do backend:

### ✅ Checklist Obrigatório

- [ ] **Todas as queries filtram por `tenantId`**
  - Verificar que `findMany`, `findUnique`, `findFirst` incluem `where: { tenantId: req.tenantId }`
  - Verificar que `updateMany` e `deleteMany` incluem `tenantId` no `where`

- [ ] **Nenhuma query usa apenas `id` sem `tenantId`**
  - Buscar por `findUnique({ where: { id } })` sem `tenantId` → ❌ Rejeitar
  - Buscar por `findFirst({ where: { id } })` sem `tenantId` → ❌ Rejeitar

- [ ] **`tenantId` vem do contexto (`req.tenantId`), nunca do cliente**
  - `tenantId` vindo de parâmetro de URL → ❌ Rejeitar
  - `tenantId` vindo do body da requisição → ❌ Rejeitar
  - `tenantId` vindo de query string → ❌ Rejeitar
  - Apenas `req.tenantId` (do middleware) → ✅ Aceitar

- [ ] **Nenhuma rota protegida ignora o middleware de tenant**
  - Rota sem `tenantContextMiddleware` aplicado → ❌ Rejeitar
  - Rota que bypassa o middleware → ❌ Rejeitar

- [ ] **Testes de isolamento passam (quando aplicável)**
  - Se houver entidades de domínio, verificar testes de isolamento
  - Testes devem validar que Tenant A não acessa dados do Tenant B

### 🚩 Red Flags (Rejeitar PR Imediatamente)

Se encontrar qualquer um destes, **rejeite o PR** e solicite correção:

1. **Query sem `tenantId`**
   ```typescript
   // ❌ REJEITAR
   await prisma.entity.findMany();
   ```

2. **`tenantId` vindo do cliente**
   ```typescript
   // ❌ REJEITAR
   const tenantId = req.body.tenantId; // NUNCA confiar no cliente
   const tenantId = req.params.tenantId; // NUNCA confiar no cliente
   ```

3. **Rota protegida sem middleware**
   ```typescript
   // ❌ REJEITAR - Rota sem middleware
   app.get('/api/protected', (req, res) => {
     // Código sem tenantId
   });
   ```

4. **Update/Delete sem verificar tenant**
   ```typescript
   // ❌ REJEITAR
   await prisma.entity.update({
     where: { id: entityId }, // Sem tenantId
     data: { ... },
   });
   ```

### Como Revisar

1. **Buscar por padrões perigosos**:
   - `findMany()` sem `where`
   - `findUnique({ where: { id } })` sem `tenantId`
   - `update({ where: { id } })` sem `tenantId`
   - `delete({ where: { id } })` sem `tenantId`

2. **Verificar origem do `tenantId`**:
   - Deve vir sempre de `req.tenantId`
   - Nunca de `req.body`, `req.params`, `req.query`

3. **Verificar aplicação do middleware**:
   - Rotas protegidas devem ter `tenantContextMiddleware` aplicado
   - Verificar em `backend/src/index.ts` ou arquivos de rotas

---

## 5. Observações Importantes

### Segurança

- ⚠️ **Esta documentação faz parte da segurança do sistema**
- ⚠️ **Qualquer vazamento entre tenants é BUG CRÍTICO**
- ⚠️ **Quando em dúvida, sempre filtrar por `tenantId`**

### Isolamento Real

- O isolamento real será validado quando existirem entidades de domínio (Etapa 2+)
- Atualmente, apenas a fundação multi-tenant está implementada
- Testes de isolamento completo serão adicionados conforme entidades são criadas

### Evolução Futura

- Na Etapa 2 (Autenticação), o tenant será identificado automaticamente pelo email do usuário
- O middleware atual (via headers) será integrado com autenticação
- A estratégia de identificação pode evoluir, mas o isolamento sempre será mantido

---

## 6. Exemplos Práticos

### Exemplo Completo: CRUD com Isolamento

```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ✅ CREATE - Criar com tenantId
export async function createEntity(req: Request, res: Response) {
  const entity = await prisma.entity.create({
    data: {
      tenantId: req.tenantId!, // Do middleware
      name: req.body.name,
      // ... outros campos
    },
  });
  
  res.json(entity);
}

// ✅ READ - Listar do tenant
export async function listEntities(req: Request, res: Response) {
  const entities = await prisma.entity.findMany({
    where: {
      tenantId: req.tenantId!, // Sempre filtrar
    },
  });
  
  res.json(entities);
}

// ✅ READ - Buscar um específico do tenant
export async function getEntity(req: Request, res: Response) {
  const entity = await prisma.entity.findFirst({
    where: {
      id: req.params.id,
      tenantId: req.tenantId!, // Sempre incluir tenantId
    },
  });
  
  if (!entity) {
    return res.status(404).json({ error: 'Entity not found' });
  }
  
  res.json(entity);
}

// ✅ UPDATE - Atualizar do tenant
export async function updateEntity(req: Request, res: Response) {
  const result = await prisma.entity.updateMany({
    where: {
      id: req.params.id,
      tenantId: req.tenantId!, // Obrigatório no where
    },
    data: {
      name: req.body.name,
      // ... outros campos
    },
  });
  
  if (result.count === 0) {
    return res.status(404).json({ error: 'Entity not found or belongs to another tenant' });
  }
  
  res.json({ success: true });
}

// ✅ DELETE - Deletar do tenant
export async function deleteEntity(req: Request, res: Response) {
  const result = await prisma.entity.deleteMany({
    where: {
      id: req.params.id,
      tenantId: req.tenantId!, // Obrigatório no where
    },
  });
  
  if (result.count === 0) {
    return res.status(404).json({ error: 'Entity not found or belongs to another tenant' });
  }
  
  res.json({ success: true });
}
```

---

## 7. Troubleshooting

### Problema: 400 Bad Request - "Tenant não identificado"

**Causa**: Headers `X-Tenant-Id` ou `X-Tenant-Slug` não foram fornecidos.

**Solução**: Adicionar header na requisição:
```bash
curl -H "X-Tenant-Slug: demo" http://localhost:5000/api/test
```

### Problema: 403 Forbidden - "Tenant inválido ou inativo"

**Causas possíveis**:
1. Tenant não existe no banco
2. Tenant está com status `SUSPENDED` ou `CANCELLED`
3. ID ou slug incorreto

**Solução**:
1. Verificar se tenant existe: `npx prisma studio`
2. Verificar status do tenant (deve ser `ACTIVE`)
3. Executar seed: `npm run seed`

### Problema: Dados de outro tenant aparecem

**Causa**: Query sem `tenantId` no `where`.

**Solução**: Adicionar `tenantId: req.tenantId` em todas as queries.

### Problema: Update/Delete não funciona

**Causa**: Usando `update` ou `delete` sem `tenantId` no `where`, ou `tenantId` incorreto.

**Solução**: Usar `updateMany` ou `deleteMany` com `tenantId` no `where`:
```typescript
await prisma.entity.updateMany({
  where: {
    id: entityId,
    tenantId: req.tenantId, // Obrigatório
  },
  data: { ... },
});
```

---

## Referências

- **Middleware**: `backend/src/middleware/tenantContext.ts`
- **Service**: `backend/src/services/tenantService.ts`
- **Schema**: `backend/prisma/schema.prisma`
- **Testes**: `backend/tests/integration/tenantContext.foundation.test.ts`
- **Documentação da Etapa**: `docs/v1/fases/Etapa-01-Multi-tenant.md`

---

**Última atualização**: Etapa 1 - Multi-tenant (V1)

