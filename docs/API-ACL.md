# API ACL - Documentação Técnica

## Visão Geral

O sistema ACL (Access Control List) fornece controle de acesso granular baseado em roles e permissões em um ambiente multi-tenant. Utiliza permissões por entidade e por campo, com auditoria automática de todas as alterações.

### Características Principais

- **Multi-tenant**: Isolamento completo de dados e permissões por tenant
- **Roles e Permissões**: Sistema flexível de roles com permissões granulares
- **Permissões por Campo**: Controle fino sobre campos específicos (ex: `Opportunity.value`)
- **Auditoria Automática**: Registro de todas as alterações (create, update, delete)
- **Middleware Declarativo**: Autorização via `authorizationMiddleware` nas rotas

### Fluxo Básico de Autorização

1. **Autenticação**: Cliente envia token JWT no header `Authorization: Bearer <token>`
2. **Contexto Tenant**: Header `X-Tenant-Id` identifica o tenant
3. **Verificação de Permissão**: Middleware verifica se usuário tem permissão para a ação
4. **Resposta**: 200/201 se autorizado, 403 se negado, 401 se não autenticado

---

## Sistema de Roles e Permissões

### Conceitos Fundamentais

- **Role**: Grupo de permissões que pode ser atribuído a usuários (ex: "Admin", "Vendedor")
- **Permission**: Permissão específica para uma ação em uma entidade (ex: `User.create`, `Opportunity.read.value`)
- **User-Role**: Relacionamento muitos-para-muitos entre usuários e roles
- **Role-Permission**: Relacionamento muitos-para-muitos entre roles e permissões

### Roles Padrão

O sistema cria automaticamente 3 roles padrão via seed:

#### Admin
- **Descrição**: Administrador com acesso total
- **Permissões**: Todas as permissões de todas as entidades (create, read, update, delete, list)
- **Uso**: Gestão completa do sistema

#### Vendedor
- **Descrição**: Pode criar/editar contatos, leads e oportunidades
- **Permissões**:
  - CRUD completo em: Contact, Company, Lead, Opportunity, Task, Note
  - Apenas read/list em: User, Role
  - Permissões por campo: `Opportunity.value` (read e update)
- **Uso**: Equipe de vendas operacional

#### Visualizador
- **Descrição**: Apenas leitura
- **Permissões**: read e list em todas as entidades
- **Permissões por campo**: `Opportunity.value` (apenas read)
- **Uso**: Usuários que precisam visualizar dados sem editar

### Como Criar Novas Roles

#### Via API

```bash
POST /api/roles
Authorization: Bearer <token>
X-Tenant-Id: <tenant-id>
Content-Type: application/json

{
  "name": "Gerente",
  "description": "Gerente de vendas",
  "permissionIds": ["uuid-perm-1", "uuid-perm-2"]
}
```

#### Boas Práticas

- Nomes descritivos e únicos por tenant
- Descrições claras do propósito da role
- Associar apenas permissões necessárias (princípio do menor privilégio)

### Como Associar Permissões

#### Durante Criação

Incluir `permissionIds` no body do `POST /api/roles`.

#### Atualizando Role Existente

```bash
PUT /api/roles/:id
{
  "permissionIds": ["uuid-perm-1", "uuid-perm-2"]
}
```

**Nota**: `permissionIds` substitui completamente as permissões atuais quando fornecido.

#### Entidades e Ações Disponíveis

- **Entidades**: User, Role, Contact, Company, Lead, Opportunity, Task, Note, AuditLog
- **Ações**: create, read, update, delete, list
- **Formato**: `{entity}.{action}` (ex: `User.create`, `Opportunity.read`)
- **Permissões por campo**: `{entity}.{action}.{field}` (ex: `Opportunity.read.value`)

---

## Endpoints de Usuários

### GET /api/users

Lista usuários do tenant atual com paginação e filtros.

#### Autenticação e Permissões

- Requer autenticação: Sim
- Permissão necessária: `User.list`

#### Headers

| Header | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `Authorization` | string | Sim | Token JWT: `Bearer <token>` |
| `X-Tenant-Id` | string | Sim | ID do tenant (UUID) |

#### Query Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `limit` | number | Não | Número de resultados (default: 20, max: 100) |
| `offset` | number | Não | Offset para paginação (default: 0) |
| `status` | string | Não | Filtrar por status: `ACTIVE`, `INACTIVE`, `BLOCKED` |
| `roleId` | string | Não | Filtrar usuários por role (UUID) |

#### Resposta 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "email": "user@example.com",
      "name": "Nome do Usuário",
      "status": "ACTIVE",
      "roles": [
        {
          "id": "uuid",
          "name": "Admin",
          "description": "Administrador com acesso total"
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

#### Outras Respostas

- **401 Unauthorized**: Não autenticado
- **403 Forbidden**: Sem permissão `User.list`

---

### GET /api/users/:id

Obtém usuário específico do tenant atual.

#### Autenticação e Permissões

- Requer autenticação: Sim
- Permissão necessária: `User.read`

#### Resposta 200 OK

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "email": "user@example.com",
  "name": "Nome do Usuário",
  "status": "ACTIVE",
  "roles": [...],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Outras Respostas

- **401 Unauthorized**: Não autenticado
- **403 Forbidden**: Sem permissão `User.read`
- **404 Not Found**: Usuário não encontrado ou não pertence ao tenant

---

### POST /api/users

Cria novo usuário no tenant atual.

#### Autenticação e Permissões

- Requer autenticação: Sim
- Permissão necessária: `User.create`

#### Body

```json
{
  "email": "user@example.com",
  "name": "Nome do Usuário",
  "password": "SenhaSegura123!",
  "roleIds": ["uuid-role-1", "uuid-role-2"]
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `email` | string | Sim | Email único no tenant |
| `name` | string | Sim | Nome do usuário |
| `password` | string | Sim | Senha (deve atender política de senha) |
| `roleIds` | string[] | Não | IDs das roles a associar |

#### Resposta 201 Created

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "email": "user@example.com",
  "name": "Nome do Usuário",
  "status": "ACTIVE",
  "roles": [...],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Outras Respostas

- **400 Bad Request**: Dados inválidos ou senha não atende política
- **401 Unauthorized**: Não autenticado
- **403 Forbidden**: Sem permissão `User.create`
- **409 Conflict**: Email já está em uso no tenant

---

### PUT /api/users/:id

Atualiza usuário existente no tenant atual.

#### Autenticação e Permissões

- Requer autenticação: Sim
- Permissão necessária: `User.update`

#### Body (todos opcionais)

```json
{
  "name": "Novo Nome",
  "email": "novo@example.com",
  "status": "ACTIVE",
  "roleIds": ["uuid-role-1"]
}
```

**Nota**: `roleIds` substitui completamente as roles atuais quando fornecido. Alteração de senha é feita via endpoint específico (`PUT /api/auth/me/password`).

#### Resposta 200 OK

Retorna usuário atualizado (mesmo formato de `GET /api/users/:id`).

#### Outras Respostas

- **400 Bad Request**: Dados inválidos
- **401 Unauthorized**: Não autenticado
- **403 Forbidden**: Sem permissão `User.update` ou sem permissão para atualizar campos específicos
- **404 Not Found**: Usuário não encontrado
- **409 Conflict**: Email já está em uso

---

### DELETE /api/users/:id

Deleta usuário (soft delete - marca como `INACTIVE`).

#### Autenticação e Permissões

- Requer autenticação: Sim
- Permissão necessária: `User.delete`

#### Resposta 200 OK

```json
{
  "message": "Usuário deletado com sucesso"
}
```

**Nota**: Se o usuário já estiver `INACTIVE`, retorna 200 OK (idempotência).

#### Outras Respostas

- **401 Unauthorized**: Não autenticado
- **403 Forbidden**: Sem permissão `User.delete`
- **404 Not Found**: Usuário não encontrado

---

## Endpoints de Roles

### GET /api/roles

Lista roles do tenant atual (apenas ativas por padrão).

#### Autenticação e Permissões

- Requer autenticação: Sim
- Permissão necessária: `Role.list`

#### Resposta 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Admin",
      "description": "Administrador com acesso total",
      "isActive": true,
      "permissionsCount": 42,
      "usersCount": 5,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### GET /api/roles/:id

Obtém role específica com todas as permissões.

#### Autenticação e Permissões

- Requer autenticação: Sim
- Permissão necessária: `Role.read`

#### Resposta 200 OK

```json
{
  "id": "uuid",
  "name": "Admin",
  "description": "Administrador com acesso total",
  "isActive": true,
  "permissions": [
    {
      "id": "uuid",
      "entity": "User",
      "action": "create",
      "field": null
    },
    {
      "id": "uuid",
      "entity": "Opportunity",
      "action": "read",
      "field": "value"
    }
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### POST /api/roles

Cria nova role no tenant atual.

#### Autenticação e Permissões

- Requer autenticação: Sim
- Permissão necessária: `Role.create`

#### Body

```json
{
  "name": "Gerente",
  "description": "Gerente de vendas",
  "permissionIds": ["uuid-perm-1", "uuid-perm-2"]
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | Sim | Nome único no tenant |
| `description` | string | Não | Descrição da role |
| `permissionIds` | string[] | Não | IDs das permissões a associar |

#### Resposta 201 Created

Retorna role criada (mesmo formato de `GET /api/roles/:id`).

#### Outras Respostas

- **400 Bad Request**: Dados inválidos
- **401 Unauthorized**: Não autenticado
- **403 Forbidden**: Sem permissão `Role.create`
- **409 Conflict**: Nome já está em uso no tenant

---

### PUT /api/roles/:id

Atualiza role existente no tenant atual.

#### Autenticação e Permissões

- Requer autenticação: Sim
- Permissão necessária: `Role.update`

#### Body (todos opcionais)

```json
{
  "name": "Gerente Atualizado",
  "description": "Nova descrição",
  "permissionIds": ["uuid-perm-1"]
}
```

**Nota**: `permissionIds` substitui completamente as permissões atuais quando fornecido.

#### Resposta 200 OK

Retorna role atualizada (mesmo formato de `GET /api/roles/:id`).

#### Outras Respostas

- **400 Bad Request**: Dados inválidos
- **401 Unauthorized**: Não autenticado
- **403 Forbidden**: Sem permissão `Role.update`
- **404 Not Found**: Role não encontrada
- **409 Conflict**: Nome já está em uso

---

### DELETE /api/roles/:id

Deleta role (soft delete - marca `isActive = false`).

#### Autenticação e Permissões

- Requer autenticação: Sim
- Permissão necessária: `Role.delete`

#### Resposta 200 OK

```json
{
  "message": "Role deletada com sucesso"
}
```

**Nota**: Se a role já estiver com `isActive = false`, retorna 200 OK (idempotência). Se a role estiver em uso por usuários, retorna 409 Conflict.

#### Outras Respostas

- **401 Unauthorized**: Não autenticado
- **403 Forbidden**: Sem permissão `Role.delete`
- **404 Not Found**: Role não encontrada
- **409 Conflict**: Role está em uso por usuários

---

## Permissões por Campo

### Como Funcionam

O sistema suporta permissões granulares por campo, permitindo controle fino sobre campos específicos de uma entidade.

#### Regras Fundamentais

1. **Permissão de Entidade cobre todos os campos**: Se um usuário tem `User.read`, ele vê todos os campos do usuário (exceto campos sensíveis como `passwordHash`).

2. **Permissão por campo não libera endpoint**: Uma permissão como `User.read.email` não é suficiente para acessar `GET /api/users/:id`. É necessário ter `User.read` (permissão de entidade).

3. **Campos sempre permitidos**: `id`, `tenantId`, `createdAt`, `updatedAt` são sempre visíveis, independente de permissões.

4. **Admin sempre tem acesso total**: Usuários com role "Admin" têm acesso a todos os campos de todas as entidades.

### Como Configurar

#### Criar Permissão por Campo

Permissões por campo são criadas via seed ou podem ser criadas manualmente no banco. Formato: `{entity}.{action}.{field}`.

**Exemplo**: `Opportunity.read.value` e `Opportunity.update.value`

#### Associar a Role

```bash
PUT /api/roles/:id
{
  "permissionIds": [
    "uuid-Opportunity.read",
    "uuid-Opportunity.read.value",
    "uuid-Opportunity.update",
    "uuid-Opportunity.update.value"
  ]
}
```

### Exemplos Práticos

#### Cenário 1: Usuário com permissão de entidade

- **Permissão**: `User.read`
- **Acesso**: `GET /api/users/:id` → 200 OK
- **Campos visíveis**: Todos os campos (exceto `passwordHash`)

#### Cenário 2: Usuário com apenas permissão por campo

- **Permissão**: Apenas `User.read.email` (sem `User.read`)
- **Acesso**: `GET /api/users/:id` → 403 Forbidden
- **Motivo**: Permissão por campo não libera endpoint

#### Cenário 3: Usuário com permissão de entidade para update

- **Permissão**: `User.update`
- **Acesso**: `PUT /api/users/:id` → 200 OK
- **Campos atualizáveis**: Todos os campos (exceto `passwordHash`)

#### Cenário 4: Usuário com apenas permissão por campo para update

- **Permissão**: Apenas `User.update.email` (sem `User.update`)
- **Acesso**: `PUT /api/users/:id` → 403 Forbidden
- **Motivo**: Permissão por campo não libera endpoint

---

## Auditoria de Alterações

### O que é Registrado

O sistema registra automaticamente todas as alterações em entidades auditadas.

#### Entidades Auditadas

- User
- Role

#### Ações Auditadas

- `create`: Criação de novo registro
- `update`: Atualização de registro existente
- `delete`: Soft delete (marca como inativo)

#### Campos Registrados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `entityType` | string | Tipo da entidade (ex: "User", "Role") |
| `entityId` | string | ID do registro alterado |
| `action` | string | Ação realizada (create, update, delete) |
| `userId` | string | ID do usuário que fez a alteração |
| `tenantId` | string | ID do tenant (isolamento multi-tenant) |
| `changes` | object\|null | Objeto com campos alterados (apenas em update) |
| `timestamp` | Date | Data e hora da alteração |

#### Objeto `changes` (apenas em update)

Contém apenas campos que foram realmente alterados, no formato:

```json
{
  "name": {
    "old": "Nome Antigo",
    "new": "Nome Novo"
  },
  "email": {
    "old": "antigo@example.com",
    "new": "novo@example.com"
  }
}
```

**Campos excluídos de `changes`**:
- Campos técnicos: `updatedAt`, `createdAt`
- Campos sensíveis: `passwordHash`
- Campos não alterados (deep equal)

#### Soft Delete vs Delete Físico

A ação `delete` representa um soft delete lógico (ex: `status = INACTIVE` para User, `isActive = false` para Role), não remoção física do registro. O histórico é preservado.

### Como Consultar Histórico

#### GET /api/audit-logs

Lista logs de auditoria com filtros e paginação.

##### Autenticação e Permissões

- Requer autenticação: Sim
- Permissão necessária: `AuditLog.read`

##### Query Parameters

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `limit` | number | Não | Número de resultados (default: 20, max: 100) |
| `offset` | number | Não | Offset para paginação (default: 0) |
| `entityType` | string | Não | Filtrar por tipo: `User`, `Role` |
| `entityId` | string | Não | Filtrar por ID do registro (UUID) |
| `userId` | string | Não | Filtrar por usuário que fez a alteração (UUID) |
| `action` | string | Não | Filtrar por ação: `create`, `update`, `delete` |
| `dateFrom` | string | Não | Data inicial (ISO 8601) |
| `dateTo` | string | Não | Data final (ISO 8601) |

##### Resposta 200 OK

```json
{
  "data": [
    {
      "id": "uuid",
      "entityType": "User",
      "entityId": "uuid",
      "action": "update",
      "userId": "uuid",
      "userName": "Admin User",
      "tenantId": "uuid",
      "changes": {
        "name": {
          "old": "Nome Antigo",
          "new": "Nome Novo"
        }
      },
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

**Nota**: `userName` pode ser `null` se o usuário foi deletado (LEFT JOIN).

---

#### GET /api/audit-logs/:entityType/:entityId

Retorna histórico completo de alterações de um registro específico.

##### Autenticação e Permissões

- Requer autenticação: Sim
- Permissão necessária: `AuditLog.read`

##### Path Parameters

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `entityType` | string | Tipo da entidade: `User` ou `Role` |
| `entityId` | string | ID do registro (UUID) |

##### Resposta 200 OK

```json
[
  {
    "id": "uuid",
    "entityType": "User",
    "entityId": "uuid",
    "action": "create",
    "userId": "uuid",
    "userName": "Admin User",
    "tenantId": "uuid",
    "changes": null,
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "uuid",
    "entityType": "User",
    "entityId": "uuid",
    "action": "update",
    "userId": "uuid",
    "userName": "Admin User",
    "tenantId": "uuid",
    "changes": {
      "name": {
        "old": "Nome Antigo",
        "new": "Nome Novo"
      }
    },
    "timestamp": "2024-01-01T01:00:00.000Z"
  }
]
```

**Nota**: Sempre retorna 200 OK, mesmo se array estiver vazio. Entidade pode existir sem histórico de alterações.

##### Outras Respostas

- **400 Bad Request**: `entityType` inválido
- **401 Unauthorized**: Não autenticado
- **403 Forbidden**: Sem permissão `AuditLog.read`

### Isolamento Multi-tenant

Logs de auditoria são isolados por tenant. Usuários só veem logs do próprio tenant. O filtro `tenantId` é aplicado automaticamente em todas as consultas.

---

## Middleware de Autorização

### Como Funciona

O `authorizationMiddleware` é um middleware factory que verifica permissões antes de executar handlers de rotas.

#### Ordem de Execução

1. `tenantContextMiddleware`: Identifica e valida tenant
2. `authMiddleware`: Valida token JWT e popula `req.userId`
3. `authorizationMiddleware`: Verifica permissão específica

#### Uso em Rotas

```typescript
router.get(
  '/',
  tenantContextMiddleware,
  authMiddleware,
  authorizationMiddleware('User', 'list'),
  listUsers
);
```

#### Parâmetros

- `entity`: Nome da entidade (ex: "User", "Role")
- `action`: Ação a verificar (ex: "create", "read", "update", "delete", "list")
- `field`: Campo opcional para permissões por campo (ex: "value")

#### Tratamento de Erros

- **401 Unauthorized**: `userId` ou `tenantId` não presentes (middlewares anteriores não rodaram)
- **403 Forbidden**: Usuário não tem permissão
- **500 Internal Server Error**: Erro ao verificar permissão

---

## Exemplos Práticos

### Fluxo Completo: Criar Role → Criar Usuário → Associar Role

```bash
# 1. Criar role
POST /api/roles
{
  "name": "Gerente",
  "description": "Gerente de vendas",
  "permissionIds": ["uuid-User.read", "uuid-User.list"]
}

# 2. Criar usuário com role
POST /api/users
{
  "email": "gerente@example.com",
  "name": "Gerente Silva",
  "password": "SenhaSegura123!",
  "roleIds": ["uuid-role-gerente"]
}

# 3. Verificar permissões (via GET /api/users/:id)
GET /api/users/:id
# Retorna usuário com roles associadas
```

### Consultar Histórico de Alterações

```bash
# Histórico completo de um usuário
GET /api/audit-logs/User/uuid-user-id

# Logs de atualizações no último mês
GET /api/audit-logs?action=update&dateFrom=2024-01-01T00:00:00Z&dateTo=2024-01-31T23:59:59Z

# Logs de um usuário específico
GET /api/audit-logs?userId=uuid-user-id
```

---

## Notas de Segurança

- **Isolamento Multi-tenant**: Todas as operações são isoladas por tenant. Nunca acesse dados de outro tenant.
- **Permissões Obrigatórias**: Todos os endpoints protegidos requerem autenticação e permissão específica.
- **Auditoria Automática**: Todas as alterações são registradas automaticamente para rastreabilidade.
- **Soft Delete**: Deletar não remove dados fisicamente, apenas marca como inativo.
- **Admin Bypass**: Role "Admin" tem acesso total por design (verificado no seed).

---

## Referências

- **Etapa 3 - ACL**: `docs/v1/fases/Etapa-03-ACL.md`
- **API de Autenticação**: `docs/API-Autenticacao.md`
- **Multi-tenant**: `docs/MULTI-TENANT.md`

