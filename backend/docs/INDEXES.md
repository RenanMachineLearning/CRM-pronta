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
npx prisma migrate dev --name add_indexes
```

Isso criará a migração com o índice `Field(tenantId, entityId)`.

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

