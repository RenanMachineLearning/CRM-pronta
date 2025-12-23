# Instruções para Aplicar Migrações

## Pré-requisitos

1. **Banco de dados PostgreSQL rodando**
   - Host: `localhost`
   - Porta: `5434`
   - Database: `crm_db` (conforme `.env`)

2. **Variáveis de ambiente configuradas**
   - Arquivo `.env` com `DATABASE_URL` correto

## Migrações a Aplicar

### 1. Migração: add_entity_data

Cria a tabela `EntityData` para armazenar dados de entidades customizadas.

```bash
cd backend
npx prisma migrate dev --name add_entity_data
```

**O que será criado:**
- Tabela `entity_data` com campos: id, entityId, tenantId, data (JSON), created_at, updated_at
- Índices: `(tenantId, entityId)` e `(tenantId, id)`
- Foreign keys: para Entity e Tenant

### 2. Migração: add_indexes

Adiciona índice estratégico para otimizar listagem de campos por entidade.

```bash
cd backend
npx prisma migrate dev --name add_indexes
```

**O que será criado:**
- Índice `fields_tenantId_entityId_idx` na tabela `fields`
- Otimiza query: `SELECT * FROM fields WHERE tenantId = ? AND entityId = ? ORDER BY order`

## Ordem de Execução

Execute as migrações na seguinte ordem:

```bash
# 1. Criar tabela EntityData
cd backend
npx prisma migrate dev --name add_entity_data

# 2. Adicionar índice em Field
npx prisma migrate dev --name add_indexes
```

## Validação

Após aplicar as migrações, valide:

```bash
# Validar via script
npx ts-node scripts/validate-indexes.ts

# Ou verificar diretamente no banco
psql -h localhost -p 5434 -U seu_usuario -d crm_db -c "\d entity_data"
psql -h localhost -p 5434 -U seu_usuario -d crm_db -c "\d fields"
```

## Troubleshooting

**Erro: "Can't reach database server"**
- Verifique se o PostgreSQL está rodando: `pg_isready -h localhost -p 5434`
- Verifique a `DATABASE_URL` no arquivo `.env`
- Verifique se o banco `crm_db` existe

**Erro: "Migration already applied"**
- Se a migração já foi aplicada, o Prisma detectará automaticamente
- Use `npx prisma migrate status` para verificar estado das migrações

