# Índices Estratégicos - Documentação

## Índices Implementados

### Field - Índice Obrigatório

**Índice**: `@@index([tenantId, entityId])`

**Propósito**: Otimizar listagem de campos por entidade (operação central da UI)

**Query otimizada**: 
```sql
SELECT * FROM fields 
WHERE tenant_id = ? AND entity_id = ? 
AND is_deleted = false 
ORDER BY "order" ASC
```

**Motivo**: 
- Listar campos por entidade é a query mais frequente do sistema de metadados
- O índice `(tenantId, id)` não otimiza essa query específica
- Custo baixo, benefício alto

**Status**: ✅ Implementado no schema

## Índices de Busca e Filtro - Etapa 8

### Contact - Índices de Busca

**Índice composto**: `@@index([tenantId, firstName, lastName])`

**Propósito**: Otimizar busca por nome completo de contato

**Query otimizada**:
```sql
SELECT * FROM contacts 
WHERE tenant_id = ? 
AND first_name ILIKE '%termo%' 
AND last_name ILIKE '%termo%'
```

**Status**: ✅ Implementado no schema

**Índices individuais**:
- `@@index([tenantId, firstName])` - Busca por primeiro nome
- `@@index([tenantId, lastName])` - Busca por sobrenome
- `@@index([tenantId, status])` - Filtro por status
- `@@index([tenantId, companyId])` - Busca por empresa

### ContactEmail - Índice de Busca

**Índice**: `@@index([tenantId, email])`

**Propósito**: Otimizar busca por email de contato

**Query otimizada**:
```sql
SELECT * FROM contact_emails 
WHERE tenant_id = ? 
AND email ILIKE '%termo%'
```

**Status**: ✅ Implementado no schema

### Company - Índices de Busca e Filtro

**Índice de busca**: `@@index([tenantId, name])`

**Propósito**: Otimizar busca por nome da empresa

**Query otimizada**:
```sql
SELECT * FROM companies 
WHERE tenant_id = ? 
AND name ILIKE '%termo%'
```

**Status**: ✅ Implementado no schema

**Índice de filtro**: `@@index([tenantId, industry])`

**Propósito**: Otimizar filtro por indústria

**Query otimizada**:
```sql
SELECT * FROM companies 
WHERE tenant_id = ? 
AND industry = ?
```

**Status**: ✅ Implementado no schema (Etapa 8)

### Lead - Índices de Busca e Filtro

**Índice composto**: `@@index([tenantId, firstName, lastName])`

**Propósito**: Otimizar busca por nome completo de lead

**Query otimizada**:
```sql
SELECT * FROM leads 
WHERE tenant_id = ? 
AND first_name ILIKE '%termo%' 
AND last_name ILIKE '%termo%'
```

**Status**: ✅ Implementado no schema (Etapa 8)

**Outros índices**:
- `@@index([tenantId, email])` - Busca por email
- `@@index([tenantId, status])` - Filtro por status
- `@@index([tenantId, source])` - Filtro por origem (Etapa 8)

### Opportunity - Índices de Busca e Filtro

**Índice de busca**: `@@index([tenantId, name])`

**Propósito**: Otimizar busca por nome da oportunidade

**Status**: ✅ Implementado no schema

**Índices de filtro**:
- `@@index([tenantId, stageId, status])` - Filtro por estágio e status
- `@@index([tenantId, contactId])` - Busca por contato
- `@@index([tenantId, companyId])` - Busca por empresa
- `@@index([tenantId, closeDate])` - Filtro por data de fechamento (Etapa 8)

### Task - Índices de Filtro

**Índices existentes**:
- `@@index([tenantId, relatedEntityType, relatedEntityId])` - Busca por entidade relacionada
- `@@index([tenantId, assignedToId, status])` - Busca por usuário e status

**Novo índice**: `@@index([tenantId, dueDate])`

**Propósito**: Otimizar filtro por data de vencimento

**Query otimizada**:
```sql
SELECT * FROM tasks 
WHERE tenant_id = ? 
AND due_date <= ?
```

**Status**: ✅ Implementado no schema (Etapa 8)

## Índices V2 Condicionais (Documentados, não implementados)

### AuditLog - Índice por Usuário

**Índice**: `@@index([tenantId, userId, timestamp])`

**Propósito**: Otimizar busca de logs de auditoria por usuário ordenados por data

**Query otimizada**:
```sql
SELECT * FROM audit_logs 
WHERE tenant_id = ? AND user_id = ? 
ORDER BY timestamp DESC
```

**Quando implementar**: Quando UI de auditoria por usuário for implementada

**Status**: 📝 Documentado no schema (comentário TODO V2)

## Como Executar a Migração

Quando o banco de dados estiver disponível, execute:

```bash
cd backend
npx prisma migrate dev
```

Isso aplicará a migração `20250122100000_add_search_indexes` que inclui:
- Índice composto Contact(tenantId, firstName, lastName)
- Índice composto Lead(tenantId, firstName, lastName)
- Índice Company(tenantId, industry)
- Índice Lead(tenantId, source)
- Índice Task(tenantId, dueDate)
- Índice Opportunity(tenantId, closeDate)

## Validação

Após executar a migração, valide os índices:

```bash
# Validar via script
npx ts-node scripts/validate-indexes.ts

# Ou validar via testes
npm test -- indexes.validation.test.ts
```

## Verificação de Uso de Índices

Para verificar se os índices estão sendo usados, execute EXPLAIN no PostgreSQL:

```sql
EXPLAIN (FORMAT JSON)
SELECT * FROM fields 
WHERE tenant_id = 'tenant-uuid'::uuid 
AND entity_id = 'entity-uuid'::uuid 
AND is_deleted = false
ORDER BY "order" ASC;
```

O resultado deve mostrar que o índice `fields_tenant_id_entity_id_idx` está sendo usado.

