# API - Tarefas, Notas e Timeline

## Endpoints

### Tarefas (`/api/tasks`)

#### GET `/api/tasks`
Lista tarefas com paginação e filtros.

**Query params:**
- `limit` (opcional, default: 20, max: 100)
- `offset` (opcional, default: 0)
- `status`: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- `type`: `CALL`, `EMAIL`, `MEETING`, `OTHER`
- `assignedToId`: UUID do usuário
- `relatedEntityType`: `Contact`, `Company`, `Lead`, `Opportunity`
- `relatedEntityId`: UUID da entidade
- `dueDateFrom`, `dueDateTo`: datas ISO
- `overdue`: boolean (tarefas vencidas)
- `completed`: boolean
- `orderBy`: `dueDate`, `priority`, `createdAt`, `title`
- `order`: `asc`, `desc`

**Permissão:** `Task.list`

#### GET `/api/tasks/:id`
Obtém tarefa específica.

**Permissão:** `Task.read`

#### POST `/api/tasks`
Cria nova tarefa.

**Body:**
```json
{
  "title": "string (obrigatório)",
  "description": "string (opcional)",
  "type": "CALL | EMAIL | MEETING | OTHER",
  "status": "PENDING | IN_PROGRESS | COMPLETED | CANCELLED",
  "dueDate": "ISO date (não pode ser passada)",
  "priority": "LOW | MEDIUM | HIGH",
  "assignedToId": "UUID (opcional)",
  "relatedEntityType": "Contact | Company | Lead | Opportunity (obrigatório)",
  "relatedEntityId": "UUID (obrigatório)"
}
```

**Permissão:** `Task.create`

#### PUT `/api/tasks/:id`
Atualiza tarefa (partial update).

**Body:** Todos os campos opcionais. Se `status` mudar para `COMPLETED`, `completedAt` é definido automaticamente.

**Permissão:** `Task.update`

#### DELETE `/api/tasks/:id`
Soft delete (marca `deletedAt`).

**Permissão:** `Task.delete`

---

### Notas (`/api/notes`)

#### GET `/api/notes`
Lista notas com paginação e filtros.

**Query params:**
- `limit`, `offset`: paginação
- `type`: `NOTE`, `COMMENT`, `ANNOTATION`
- `relatedEntityType`: `Contact`, `Company`, `Lead`, `Opportunity`, `Task`
- `relatedEntityId`: UUID
- `orderBy`: `createdAt` (default)
- `order`: `asc`, `desc`

**Permissão:** `Note.list`

#### GET `/api/notes/:id`
Obtém nota específica.

**Permissão:** `Note.read`

#### POST `/api/notes`
Cria nova nota.

**Body:**
```json
{
  "content": "string (obrigatório, max 10.000 caracteres)",
  "type": "NOTE | COMMENT | ANNOTATION",
  "relatedEntityType": "Contact | Company | Lead | Opportunity | Task (obrigatório)",
  "relatedEntityId": "UUID (obrigatório)"
}
```

**Permissão:** `Note.create`

#### PUT `/api/notes/:id`
Atualiza nota. Apenas criador ou Admin pode editar.

**Body:**
```json
{
  "content": "string (max 10.000 caracteres)",
  "type": "NOTE | COMMENT | ANNOTATION"
}
```

**Nota:** `relatedEntityType` e `relatedEntityId` não podem ser alterados.

**Permissão:** `Note.update`

#### DELETE `/api/notes/:id`
Soft delete.

**Permissão:** `Note.delete`

---

### Timeline (`/api/timeline/:entityType/:entityId`)

#### GET `/api/timeline/:entityType/:entityId`
Obtém timeline agregada de atividades relacionadas à entidade.

**Parâmetros:**
- `entityType`: `Contact`, `Company`, `Lead`, `Opportunity`, `Task`
- `entityId`: UUID

**Query params:**
- `limit` (opcional, default: 50, max: 100)
- `offset` (opcional, default: 0)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "task | note | audit",
      "timestamp": "ISO date",
      "userId": "uuid",
      "userName": "string | null",
      "data": { /* dados específicos por tipo */ }
    }
  ],
  "pagination": { "total": 100, "limit": 50, "offset": 0 },
  "entity": { "type": "Contact", "id": "uuid", "name": "string" }
}
```

**Permissão:** `Task.read` ou `Note.read` (dependendo do tipo de item)

---

## Tipos e Status

### Task

**Type (`TaskType`):**
- `CALL` - Ligação
- `EMAIL` - Email
- `MEETING` - Reunião
- `OTHER` - Outro

**Status (`TaskStatus`):**
- `PENDING` - Pendente
- `IN_PROGRESS` - Em Andamento
- `COMPLETED` - Concluída
- `CANCELLED` - Cancelada

**Priority (`TaskPriority`):**
- `LOW` - Baixa
- `MEDIUM` - Média
- `HIGH` - Alta

### Note

**Type (`NoteType`):**
- `NOTE` - Nota geral
- `COMMENT` - Comentário
- `ANNOTATION` - Anotação

---

## Integração com Auditoria

Todas as operações CRUD de `Task` e `Note` registram logs de auditoria automaticamente.

### Helper `logAudit`

```typescript
import { logAudit } from '../utils/auditLog';

// Criar
await logAudit('Task', taskId, 'create', userId, tenantId);

// Atualizar (com changes)
await logAudit('Task', taskId, 'update', userId, tenantId, {
  status: { old: 'PENDING', new: 'COMPLETED' },
  dueDate: { old: oldDate, new: newDate }
});

// Deletar
await logAudit('Task', taskId, 'delete', userId, tenantId);
```

### Formato de Changes

O campo `changes` no audit log segue o formato:
```json
{
  "fieldName": {
    "old": "valor anterior",
    "new": "valor novo"
  }
}
```

**Nota:** Operações `create` e `delete` não incluem `changes` (ou é `null`).

---

## Permissões por Campo

### Task

Permissões específicas por campo seguem o padrão:
- `Task.read.title` - Ler campo `title`
- `Task.update.description` - Atualizar campo `description`
- `Task.read.priority` - Ler campo `priority`

**Campos com permissões por campo:**
- `title`
- `description`
- `type`
- `status`
- `priority`
- `dueDate`
- `assignedToId`

**Comportamento:**
- Se usuário não tem `Task.read.title`, campo `title` não aparece na resposta.
- Se usuário não tem `Task.update.description`, não pode atualizar `description` (retorna 403).

### Note

**Campos com permissões por campo:**
- `content`
- `type`

**Comportamento:** Mesmo padrão de Task.

**Nota:** Permissões por campo são verificadas no middleware `authorizationMiddleware` e no service.

---

## Validações

### Task

**Título:**
- Obrigatório
- String não vazia após trim
- Máximo 255 caracteres

**Descrição:**
- Opcional
- String ou `null`
- Máximo 5.000 caracteres

**Tipo (`type`):**
- Opcional (default: `OTHER`)
- Deve ser um dos valores do enum `TaskType`

**Status (`status`):**
- Opcional (default: `PENDING`)
- Deve ser um dos valores do enum `TaskStatus`

**Prioridade (`priority`):**
- Opcional (default: `MEDIUM`)
- Deve ser um dos valores do enum `TaskPriority`

**Data de Vencimento (`dueDate`):**
- Opcional
- Formato ISO 8601
- Não pode ser passada (deve ser futura ou atual)
- Se `null`, remove a data

**Entidade Relacionada:**
- `relatedEntityType` e `relatedEntityId` obrigatórios
- `relatedEntityType` deve ser: `Contact`, `Company`, `Lead`, `Opportunity`
- Entidade deve existir, pertencer ao tenant e não estar soft deleted

**Usuário Atribuído (`assignedToId`):**
- Opcional
- UUID válido
- Usuário deve existir, pertencer ao tenant e estar ativo

**Lógica de Status:**
- Se `status` mudar para `COMPLETED`, `completedAt` é definido automaticamente
- Se `status` sair de `COMPLETED`, `completedAt` é limpo

### Note

**Conteúdo (`content`):**
- Obrigatório
- String não vazia após trim
- Máximo 10.000 caracteres
- Suporta Markdown

**Tipo (`type`):**
- Opcional (default: `NOTE`)
- Deve ser um dos valores do enum `NoteType`

**Entidade Relacionada:**
- `relatedEntityType` e `relatedEntityId` obrigatórios
- `relatedEntityType` deve ser: `Contact`, `Company`, `Lead`, `Opportunity`, `Task`
- Entidade deve existir, pertencer ao tenant e não estar soft deleted
- Não pode ser alterado após criação

**Ownership:**
- Apenas criador da nota ou usuário com role `Admin` pode editar
- Validação feita no service (não é permissão ACL)

### UUIDs

Todos os IDs devem ser UUIDs válidos (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

### Multi-tenant

Todas as operações respeitam isolamento por `tenantId`. Usuários só podem acessar dados do próprio tenant.

---

## Timeline

### Agregação

A timeline agrega três fontes de dados:
1. **Tarefas** relacionadas à entidade
2. **Notas** relacionadas à entidade
3. **Logs de auditoria** da entidade

### Ordenação

Itens ordenados por `timestamp` (mais recente primeiro). Em caso de empate:
1. Ordem por tipo: `task` → `note` → `audit`
2. Ordem por ID (alfabética)

### Paginação

- Default: `limit=50`, `offset=0`
- Máximo: `limit=100`

### Filtros

- Apenas itens não soft deleted (`deletedAt IS NULL`)
- Apenas itens do tenant atual
- Validação de existência da entidade antes de buscar

---

## Códigos de Resposta

- `200` - Sucesso (GET, PUT)
- `201` - Criado (POST)
- `400` - Dados inválidos
- `401` - Não autenticado
- `403` - Sem permissão
- `404` - Não encontrado
- `500` - Erro interno
