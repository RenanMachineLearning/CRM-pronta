# Etapa 7 — Tarefas, Notas e Histórico de Atividades

> **Dependências**: Etapa 5 (Contatos) ✅, Etapa 6 (Leads/Oportunidades) ✅  
> **Stack**: Node.js + TypeScript, PostgreSQL, Prisma, React + TypeScript  
> **Referência**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`

## Objetivo da Etapa

Implementar sistema de atividades (tarefas, notas) vinculadas a registros e timeline/histórico. Atividades precisam ser vinculadas a registros existentes. Timeline agrega histórico.

---

## Decisões e Regras Arquiteturais (V1) — (OBRIGATÓRIO ler antes de implementar)

> Esta seção existe para **evitar retrabalho** e manter **coerência** com o que já foi implementado nas Etapas 01-06.

### 1) Integração com Auditoria (já implementada na Etapa 3)

✅ **Sistema de auditoria já está implementado**:
- Helper `logAudit` em `backend/src/utils/auditLog.ts`
- Service `AuditLogService` em `backend/src/services/auditLogService.ts`
- Tabela `AuditLog` no schema Prisma

**O que fazer**:
- Estender tipo `AuditEntity` para incluir `'Task'` e `'Note'`
- Registrar auditoria em todas as operações CRUD de Task e Note
- Usar `logAudit('Task', taskId, 'create', userId, tenantId)` após criar tarefa
- Usar `logAudit('Task', taskId, 'update', userId, tenantId, changes)` ao atualizar
- Usar `logAudit('Task', taskId, 'delete', userId, tenantId)` ao deletar
- Mesmo padrão para Note

**Exemplo**:
```typescript
import { logAudit } from '../utils/auditLog';

// Após criar tarefa
await logAudit('Task', task.id, 'create', requestingUserId, tenantId);

// Ao atualizar tarefa
await logAudit('Task', task.id, 'update', requestingUserId, tenantId, {
  status: { old: oldTask.status, new: task.status },
  dueDate: { old: oldTask.dueDate, new: task.dueDate }
});

// Ao deletar tarefa
await logAudit('Task', task.id, 'delete', requestingUserId, tenantId);
```

### 2) Permissões por Campo (já implementadas na Etapa 3)

✅ **Sistema de permissões por campo já está implementado**:
- Helper `filterFieldsByPermission` em `backend/src/utils/fieldPermissions.ts`
- Helper `validateFieldPermissionsForUpdate` em `backend/src/utils/fieldPermissions.ts`
- Permissões no formato `Task.read.title`, `Task.update.status`, `Note.read.content`, etc.

**O que fazer**:
- Filtrar campos por permissão em todas as respostas GET
- Validar permissões de campo em todas as operações UPDATE
- Usar `filterFieldsByPermission(task, userId, tenantId, 'Task', 'read')` antes de retornar
- Usar `validateFieldPermissionsForUpdate(req.body, userId, tenantId, 'Task')` antes de atualizar
- Mesmo padrão para Note

**Exemplo**:
```typescript
import { filterFieldsByPermission, validateFieldPermissionsForUpdate } from '../utils/fieldPermissions';

// Em GET /api/tasks/:id
const task = await TaskService.getTaskById(id, tenantId);
const filteredTask = await filterFieldsByPermission(
  task,
  req.userId!,
  tenantId,
  'Task',
  'read'
);
res.json(filteredTask);

// Em PUT /api/tasks/:id
const validation = await validateFieldPermissionsForUpdate(
  req.body,
  req.userId!,
  tenantId,
  'Task'
);
if (!validation.allowed) {
  return res.status(403).json({
    error: 'Acesso negado',
    message: `Você não tem permissão para atualizar: ${validation.forbiddenFields.join(', ')}`
  });
}
```

### 3) Convenção Multi-Tenant Obrigatória

⚠️ **Todas as tabelas DEVEM seguir a convenção**:
- Campo `tenantId String @db.Uuid` obrigatório
- Relacionamento `tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)`
- Índice composto obrigatório: `@@index([tenantId, id])`
- Índices adicionais conforme necessidade (ex: `@@index([tenantId, relatedEntityType, relatedEntityId])`)

### 4) Soft Delete vs Hard Delete

**Decisão V1**: Usar **soft delete** para `Task` e `Note`:
- Adicionar campo `deletedAt DateTime?` em ambas as tabelas
- Soft delete preserva histórico e permite recuperação
- Ao deletar, marcar `deletedAt` com timestamp atual
- Filtrar registros deletados nas queries (excluir onde `deletedAt IS NULL`)

### 5) Relacionamentos Polimórficos

**Decisão V1**: Tarefas e Notas usam relacionamento polimórfico:
- Campo `relatedEntityType` (string): Contact, Company, Lead, Opportunity, Task (apenas para Note)
- Campo `relatedEntityId` (UUID): ID do registro relacionado
- Validar que `relatedEntityType` e `relatedEntityId` existem e pertencem ao tenant
- Não usar foreign keys explícitas (polimórfico não suporta FKs diretas no Prisma)

### 6) Validações Específicas

**Enums obrigatórios**:
- `Task.type`: CALL, EMAIL, MEETING, OTHER
- `Task.status`: PENDING, IN_PROGRESS, COMPLETED, CANCELLED
- `Task.priority`: LOW, MEDIUM, HIGH
- `Note.type`: NOTE, COMMENT, ANNOTATION

**Validações de dados**:
- `dueDate`: não pode ser passada (se fornecida)
- `completedAt`: só pode ser preenchida quando status = COMPLETED
- `relatedEntityType` e `relatedEntityId`: devem existir e pertencer ao tenant
- `assignedToId`: deve existir e pertencer ao tenant (se fornecido)
- `content` (Note): limite de 10.000 caracteres, não pode ser vazio

---

## Checklist de Implementação

### 1. Modelo de Dados — Tabelas de Tarefas e Notas

#### Backend (Prisma Schema)
- [x] Criar tabela `Task`
  - [x] Campo `id` (UUID)
  - [x] Campo `tenantId` (foreign key) - **OBRIGATÓRIO**
  - [x] Campo `title` (título da tarefa - obrigatório)
  - [x] Campo `description` (descrição - texto, opcional)
  - [x] Campo `type` (enum: CALL, EMAIL, MEETING, OTHER)
  - [x] Campo `status` (enum: PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
  - [x] Campo `dueDate` (data de vencimento - DateTime?, opcional)
  - [x] Campo `completedAt` (timestamp - quando foi concluída - DateTime?, opcional)
  - [x] Campo `priority` (enum: LOW, MEDIUM, HIGH)
  - [x] Campo `assignedToId` (foreign key para User - opcional)
  - [x] Campo `createdById` (foreign key para User - obrigatório)
  - [x] Campo `relatedEntityType` (string: Contact, Company, Lead, Opportunity)
  - [x] Campo `relatedEntityId` (UUID - ID do registro relacionado)
  - [x] Campo `deletedAt` (DateTime?, para soft delete)
  - [x] Campos `created_at` e `updated_at`
  - [x] Relacionamento obrigatório: `tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)`
  - [x] Relacionamento: `createdBy User @relation(...)`
  - [x] Relacionamento: `assignedTo User? @relation(...)`
  - [x] Índice composto obrigatório: `@@index([tenantId, id])` - **OBRIGATÓRIO**
  - [x] Índice em `(tenantId, relatedEntityType, relatedEntityId)`
  - [x] Índice em `(tenantId, assignedToId, status)`

- [x] Criar tabela `Note`
  - [x] Campo `id` (UUID)
  - [x] Campo `tenantId` (foreign key) - **OBRIGATÓRIO**
  - [x] Campo `content` (conteúdo - texto ou markdown - obrigatório, máximo 10.000 caracteres)
  - [x] Campo `type` (enum: NOTE, COMMENT, ANNOTATION)
  - [x] Campo `relatedEntityType` (string: Contact, Company, Lead, Opportunity, Task)
  - [x] Campo `relatedEntityId` (UUID - ID do registro relacionado)
  - [x] Campo `createdById` (foreign key para User - obrigatório)
  - [x] Campo `deletedAt` (DateTime?, para soft delete)
  - [x] Campos `created_at` e `updated_at`
  - [x] Relacionamento obrigatório: `tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)`
  - [x] Relacionamento: `createdBy User @relation(...)`
  - [x] Índice composto obrigatório: `@@index([tenantId, id])` - **OBRIGATÓRIO**
  - [x] Índice em `(tenantId, relatedEntityType, relatedEntityId)`

- [x] Criar migração Prisma
  - [x] Executar `prisma migrate dev --name add_tasks_notes`
  - [x] Validar que todas as tabelas foram criadas

#### Validação
- [x] Testar criação de tarefa via Prisma
- [x] Testar criação de nota via Prisma
- [x] Testar vinculação a registros

---

### 2. Tipos e Status Configuráveis

#### Backend (Seed Script)
- [x] Criar tipos de tarefa padrão
  - [x] "Ligação" (CALL)
  - [x] "Email" (EMAIL)
  - [x] "Reunião" (MEETING)
  - [x] "Outro" (OTHER)

- [x] Criar status de tarefa padrão
  - [x] "Pendente" (PENDING)
  - [x] "Em Andamento" (IN_PROGRESS)
  - [x] "Concluída" (COMPLETED)
  - [x] "Cancelada" (CANCELLED)

**Nota:** Implementado via enums no Prisma schema (TaskType, TaskStatus, TaskPriority, NoteType)

#### Validação
- [x] Executar seed e verificar que tipos foram criados

---

### 2.5. Services (TaskService e NoteService)

#### Backend (Services)
- [x] Criar `TaskService` em `backend/src/services/taskService.ts`
  - [x] Método `listTasks(tenantId, filters?, pagination?, userId?)`
    - [x] Filtrar por tenant
    - [x] Aplicar filtros (status, type, assignedToId, relatedEntityType, relatedEntityId, dueDate)
    - [x] Paginação (limit, offset)
    - [x] Ordenação (dueDate, priority, created_at)
    - [x] Incluir relacionamentos (assignedTo, createdBy, registro relacionado)
    - [x] Filtrar campos por permissão se userId fornecido
  - [x] Método `getTaskById(taskId, tenantId, userId?)`
    - [x] Validar que tarefa pertence ao tenant
    - [x] Incluir relacionamentos
    - [x] Filtrar campos por permissão se userId fornecido
  - [x] Método `createTask(data, tenantId, requestingUserId?)`
    - [x] Validar dados obrigatórios (title)
    - [x] Validar enums (type, status, priority)
    - [x] Validar dueDate (não pode ser passada)
    - [x] Validar relacionamentos (relatedEntityType/Id, assignedToId)
    - [x] Capturar createdById do requestingUserId
    - [x] Criar tarefa
    - [x] Registrar auditoria
  - [x] Método `updateTask(taskId, data, tenantId, requestingUserId?)`
    - [x] Validar que tarefa pertence ao tenant
    - [x] Validar enums se fornecidos
    - [x] Se status mudar para COMPLETED: atualizar completedAt
    - [x] Capturar changes (old/new) para auditoria
    - [x] Atualizar tarefa
    - [x] Registrar auditoria com changes
  - [x] Método `deleteTask(taskId, tenantId, requestingUserId?)`
    - [x] Validar que tarefa pertence ao tenant
    - [x] Soft delete (marcar deletedAt)
    - [x] Registrar auditoria
  - [x] Seguir padrão de `ContactService` e `LeadService`

- [x] Criar `NoteService` em `backend/src/services/noteService.ts`
  - [x] Método `listNotes(tenantId, filters?, pagination?, userId?)`
    - [x] Filtrar por tenant
    - [x] Aplicar filtros (type, relatedEntityType, relatedEntityId)
    - [x] Paginação (limit, offset)
    - [x] Ordenação (created_at DESC - mais recente primeiro)
    - [x] Incluir relacionamentos (createdBy, registro relacionado)
    - [x] Filtrar campos por permissão se userId fornecido
  - [x] Método `getNoteById(noteId, tenantId, userId?)`
    - [x] Validar que nota pertence ao tenant
    - [x] Incluir relacionamentos
    - [x] Filtrar campos por permissão se userId fornecido
  - [x] Método `createNote(data, tenantId, requestingUserId)`
    - [x] Validar dados obrigatórios (content)
    - [x] Validar limite de tamanho do conteúdo (10.000 caracteres)
    - [x] Validar enum (type)
    - [x] Validar relacionamentos (relatedEntityType/Id)
    - [x] Capturar createdById do requestingUserId
    - [x] Criar nota
    - [x] Registrar auditoria
  - [x] Método `updateNote(noteId, data, tenantId, requestingUserId?)`
    - [x] Validar que nota pertence ao tenant
    - [x] Validar que usuário é o criador (ou tem permissão admin)
    - [x] Validar limite de tamanho se content for atualizado
    - [x] Validar enum se type for atualizado
    - [x] Capturar changes (old/new) para auditoria
    - [x] Atualizar nota
    - [x] Registrar auditoria com changes
  - [x] Método `deleteNote(noteId, tenantId, requestingUserId?)`
    - [x] Validar que nota pertence ao tenant
    - [x] Validar que usuário é o criador (ou tem permissão admin)
    - [x] Soft delete (marcar deletedAt)
    - [x] Registrar auditoria
  - [x] Seguir padrão de `ContactService` e `LeadService`

#### Validação
- [x] Testar que TaskService segue padrão de ContactService
- [x] Testar que NoteService segue padrão de ContactService
- [x] Testar que filtros funcionam corretamente
- [x] Testar que paginação funciona corretamente

---

### 2.6. Validações Específicas

#### Backend (Validadores)
- [x] Validar enums
  - [x] `Task.type`: valores permitidos (CALL, EMAIL, MEETING, OTHER)
  - [x] `Task.status`: valores permitidos (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
  - [x] `Task.priority`: valores permitidos (LOW, MEDIUM, HIGH)
  - [x] `Note.type`: valores permitidos (NOTE, COMMENT, ANNOTATION)

- [x] Validar datas
  - [x] `dueDate`: não pode ser passada (se fornecida)
  - [x] `completedAt`: só pode ser preenchida quando status = COMPLETED
  - [x] Formato de data válido (DateTime)

- [x] Validar relacionamentos
  - [x] `relatedEntityType` e `relatedEntityId` devem existir e pertencer ao tenant
  - [x] Validar que entidade relacionada existe na tabela correspondente
  - [x] `assignedToId` deve existir e pertencer ao tenant (se fornecido)
  - [x] `createdById` deve existir e pertencer ao tenant (obrigatório)

- [x] Validar conteúdo de notas
  - [x] Limite de tamanho (10.000 caracteres)
  - [x] Não pode ser vazio ou apenas espaços em branco
  - [x] Validar encoding (UTF-8)

- [x] Validar campos obrigatórios
  - [x] Task: `title` é obrigatório
  - [x] Note: `content` é obrigatório
  - [x] Task: `createdById` é obrigatório (capturado do token)
  - [x] Note: `createdById` é obrigatório (capturado do token)

#### Validação
- [x] Teste: enum inválido é rejeitado
- [x] Teste: data passada é rejeitada
- [x] Teste: relacionamento inexistente é rejeitado
- [x] Teste: conteúdo de nota muito longo é rejeitado
- [x] Teste: campos obrigatórios são validados

---

### 3. CRUD de Tarefas

#### Backend (Rotas)
- [x] Criar rota `GET /api/tasks`
  - [x] Requer autenticação e permissão "Task.list"
  - [x] Listar tarefas do tenant atual (excluir soft deleted: `deletedAt IS NULL`)
  - [x] Paginação (limit, offset)
  - [x] Filtros: `status`, `type`, `assignedToId`, `relatedEntityType`, `relatedEntityId`, `dueDate`
  - [x] Ordenação: `dueDate`, `priority`, `created_at`
  - [x] Incluir usuário atribuído, criador, registro relacionado
  - [x] **Filtrar campos por permissão** usando `filterFieldsByPermission` (permissões por campo)

- [x] Criar rota `GET /api/tasks/:id`
  - [x] Requer autenticação e permissão "Task.read"
  - [x] Retornar tarefa específica
  - [x] Validar que tarefa pertence ao tenant atual
  - [x] **Filtrar campos por permissão** usando `filterFieldsByPermission` (permissões por campo)

- [x] Criar rota `POST /api/tasks`
  - [x] Requer autenticação e permissão "Task.create"
  - [x] Receber: `title`, `description`, `type`, `status`, `dueDate`, `priority`, `assignedToId`, `relatedEntityType`, `relatedEntityId`
  - [x] Validar dados obrigatórios (title)
  - [x] Validar enums (type, status, priority)
  - [x] Validar dueDate (não pode ser passada se fornecida)
  - [x] Validar que registro relacionado existe e pertence ao tenant
  - [x] Validar que assignedToId existe e pertence ao tenant (se fornecido)
  - [x] Capturar `createdById` do token (req.userId)
  - [x] Criar tarefa via `TaskService.createTask`
  - [x] **Registrar auditoria** usando `logAudit('Task', taskId, 'create', userId, tenantId)`
  - [x] Retornar tarefa criada (com campos filtrados por permissão)

- [x] Criar rota `PUT /api/tasks/:id`
  - [x] Requer autenticação e permissão "Task.update"
  - [x] Receber mesmos campos do POST
  - [x] Validar que tarefa pertence ao tenant atual
  - [x] **Validar permissões por campo** usando `validateFieldPermissionsForUpdate`
  - [x] Validar enums se fornecidos
  - [x] Se status mudar para "COMPLETED": atualizar `completedAt`
  - [x] Capturar changes (old/new) para auditoria
  - [x] Atualizar tarefa via `TaskService.updateTask`
  - [x] **Registrar auditoria** usando `logAudit('Task', taskId, 'update', userId, tenantId, changes)`
  - [x] Retornar tarefa atualizada (com campos filtrados por permissão)

- [x] Criar rota `DELETE /api/tasks/:id`
  - [x] Requer autenticação e permissão "Task.delete"
  - [x] Validar que tarefa pertence ao tenant atual
  - [x] **Soft delete** (marcar `deletedAt` via `TaskService.deleteTask`)
  - [x] **Registrar auditoria** usando `logAudit('Task', taskId, 'delete', userId, tenantId)`
  - [x] Retornar sucesso

#### Validação
- [x] Teste E2E: criar tarefa funciona
- [x] Teste E2E: listar tarefas retorna apenas do tenant atual
- [x] Teste E2E: atualizar tarefa funciona
- [x] Teste E2E: concluir tarefa atualiza `completedAt`

---

### 4. CRUD de Notas

#### Backend (Rotas)
- [x] Criar rota `GET /api/notes`
  - [x] Requer autenticação e permissão "Note.list"
  - [x] Listar notas do tenant atual (excluir soft deleted: `deletedAt IS NULL`)
  - [x] Paginação (limit, offset)
  - [x] Filtros: `type`, `relatedEntityType`, `relatedEntityId`
  - [x] Ordenação: `created_at` (mais recente primeiro)
  - [x] Incluir criador, registro relacionado
  - [x] **Filtrar campos por permissão** usando `filterFieldsByPermission` (permissões por campo)

- [x] Criar rota `GET /api/notes/:id`
  - [x] Requer autenticação e permissão "Note.read"
  - [x] Retornar nota específica
  - [x] Validar que nota pertence ao tenant atual
  - [x] **Filtrar campos por permissão** usando `filterFieldsByPermission` (permissões por campo)

- [x] Criar rota `POST /api/notes`
  - [x] Requer autenticação e permissão "Note.create"
  - [x] Receber: `content`, `type`, `relatedEntityType`, `relatedEntityId`
  - [x] Validar dados obrigatórios (content)
  - [x] Validar limite de tamanho do conteúdo (ex: 10.000 caracteres)
  - [x] Validar enum (type)
  - [x] Validar que registro relacionado existe e pertence ao tenant
  - [x] Criar nota via `NoteService.createNote` (capturar `createdById` do token)
  - [x] **Registrar auditoria** usando `logAudit('Note', noteId, 'create', userId, tenantId)`
  - [x] Retornar nota criada (com campos filtrados por permissão)

- [x] Criar rota `PUT /api/notes/:id`
  - [x] Requer autenticação e permissão "Note.update"
  - [x] Receber: `content`, `type`
  - [x] Validar que nota pertence ao tenant atual
  - [x] Validar que usuário é o criador (ou tem permissão admin)
  - [x] **Validar permissões por campo** usando `validateFieldPermissionsForUpdate`
  - [x] Validar limite de tamanho se content for atualizado
  - [x] Validar enum se type for atualizado
  - [x] Capturar changes (old/new) para auditoria
  - [x] Atualizar nota via `NoteService.updateNote`
  - [x] **Registrar auditoria** usando `logAudit('Note', noteId, 'update', userId, tenantId, changes)`
  - [x] Retornar nota atualizada (com campos filtrados por permissão)

- [x] Criar rota `DELETE /api/notes/:id`
  - [x] Requer autenticação e permissão "Note.delete"
  - [x] Validar que nota pertence ao tenant atual
  - [x] Validar que usuário é o criador (ou tem permissão admin)
  - [x] **Soft delete** (marcar `deletedAt` via `NoteService.deleteNote`)
  - [x] **Registrar auditoria** usando `logAudit('Note', noteId, 'delete', userId, tenantId)`
  - [x] Retornar sucesso

#### Validação
- [x] Teste E2E: criar nota funciona
- [x] Teste E2E: listar notas retorna apenas do tenant atual
- [x] Teste E2E: atualizar nota funciona
- [x] Teste E2E: deletar nota funciona

---

### 5. Editor de Notas

#### Backend (Lógica)
- [x] Decidir formato de notas
  - [ ] **Opção A**: Texto simples
  - [x] **Opção B**: Markdown
  - [ ] **Opção C**: Rich text (HTML)
  - [x] **Recomendação V1**: Markdown (simples e flexível)

- [x] Armazenar conteúdo
  - [x] Se Markdown: armazenar como texto
  - [x] Renderizar Markdown no frontend

#### Frontend (React + TypeScript)
- [x] Criar componente `NoteEditor`
  - [x] Editor de texto (textarea ou editor Markdown)
  - [x] Preview de Markdown (se usar Markdown)
  - [x] Botões de formatação básica (negrito, itálico, lista)

#### Validação
- [x] Teste: editor de notas funciona
- [x] Teste: preview de Markdown funciona (se aplicável)

---

### 6. Timeline/Histórico de Atividades

#### Backend (Rotas)
- [x] Criar rota `GET /api/timeline/:entityType/:entityId`
  - [x] Requer autenticação
  - [x] **Filtrar por tenant** (isolamento multi-tenant)
  - [x] Validar que registro relacionado existe e pertence ao tenant
  - [x] Retornar histórico de atividades de um registro
  - [x] Incluir:
    - [x] Tarefas relacionadas (ordenadas por data, excluir soft deleted)
    - [x] Notas relacionadas (ordenadas por data, excluir soft deleted)
    - [x] Alterações de auditoria (da Etapa 3 - já filtram por tenant automaticamente)
  - [x] **Incluir informações de usuário** (quem criou tarefa/nota, quem fez alteração)
  - [x] Paginação (limit, offset)
  - [x] Ordenação: `created_at` (mais recente primeiro)

- [x] Criar helper `getTimeline(entityType, entityId, tenantId)`
  - [x] Buscar tarefas relacionadas (filtrar por tenant e excluir soft deleted)
  - [x] Buscar notas relacionadas (filtrar por tenant e excluir soft deleted)
  - [x] Buscar logs de auditoria (já filtram por tenant automaticamente)
  - [x] Agregar e ordenar por data (timestamp)
  - [x] Incluir informações de usuário em cada item
  - [x] Retornar timeline unificada

#### Validação
- [x] Teste: timeline retorna atividades corretas
- [x] Teste: timeline está ordenada corretamente
- [x] Teste: timeline inclui tarefas, notas e auditoria

---

### 7. Frontend — Listagem de Tarefas

#### Frontend (React + TypeScript)
- [x] Criar componente `TaskList`
  - [x] Tabela/listagem de tarefas
  - [x] Colunas: título, tipo, status, atribuído a, vencimento, prioridade
  - [x] Filtros: status, tipo, atribuído a, vencimento
  - [x] Indicador visual de tarefas vencidas
  - [x] Botão "Concluir" para tarefas pendentes

- [x] Criar página `TasksPage`
  - [x] Integrar `TaskList`
  - [x] Botão "Nova Tarefa"
  - [x] Visualização de tarefas por status (opcional)

#### Validação
- [x] Teste: listagem de tarefas funciona
- [x] Teste: filtros funcionam
- [x] Teste: concluir tarefa funciona

---

### 8. Frontend — Formulário de Tarefa

#### Frontend (React + TypeScript)
- [x] Criar componente `TaskForm`
  - [x] Campos: title, description, type, status, dueDate, priority
  - [x] Seleção de usuário atribuído (lookup)
  - [x] Seleção de registro relacionado (entityType + lookup)
  - [x] Validação de campos
  - [x] Submit para criar/atualizar

- [x] Criar página `TaskFormPage`
  - [x] Integrar `TaskForm`
  - [x] Modo criação ou edição

#### Validação
- [x] Teste: criar tarefa funciona
- [x] Teste: editar tarefa funciona

---

### 9. Frontend — Editor e Listagem de Notas

#### Frontend (React + TypeScript)
- [x] Criar componente `NoteEditor` (reutilizar do item 5)
- [x] Criar componente `NoteList`
  - [x] Listagem de notas
  - [x] Mostrar conteúdo (truncado se muito longo)
  - [x] Mostrar criador e data
  - [x] Link para editar/deletar

- [x] Criar componente `NoteForm`
  - [x] Integrar `NoteEditor`
  - [x] Seleção de registro relacionado
  - [x] Submit para criar/atualizar

#### Validação
- [x] Teste: criar nota funciona
- [x] Teste: editar nota funciona
- [x] Teste: listar notas funciona

---

### 10. Frontend — Timeline

#### Frontend (React + TypeScript)
- [x] Criar componente `Timeline`
  - [x] Lista vertical de atividades
  - [x] Agrupar por data (hoje, ontem, esta semana, etc.)
  - [x] Mostrar tipo de atividade (tarefa, nota, alteração)
  - [x] Mostrar usuário e timestamp
  - [x] Link para detalhes da atividade

- [x] Integrar timeline em páginas de detalhes
  - [x] Página de detalhes de contato
  - [x] Página de detalhes de empresa
  - [x] Página de detalhes de lead
  - [x] Página de detalhes de oportunidade

#### Validação
- [x] Teste: timeline aparece em páginas de detalhes
- [x] Teste: timeline mostra atividades corretas
- [x] Teste: timeline está ordenada corretamente

---

### 11. Notificações de Tarefas (Opcional V1)

#### Backend (Lógica)
- [x] Criar job/agendamento para tarefas vencidas
  - [x] Buscar tarefas com `dueDate` passado e status "Pendente"
  - [x] Enviar notificação (email ou in-app)
  - [x] **Opcional na V1**: pode ser implementado depois

#### Validação
- [x] Teste: notificações funcionam (se implementado)

---

### 12. Testes

#### Backend (Testes)
- [x] Testes unitários
  - [x] CRUD de tarefas
  - [x] CRUD de notas
  - [x] Timeline
  - [x] Validações de enums
  - [x] Validações de datas
  - [x] Validações de relacionamentos

- [x] Testes de integração
  - [x] Tarefa vinculada a registro
  - [x] Nota vinculada a registro
  - [x] Timeline agrega corretamente
  - [x] **Testes de auditoria** (verificar que logs são criados em create, update, delete)
  - [x] **Testes de permissões por campo** (verificar filtragem em GET, validação em UPDATE)
  - [x] **Testes de soft delete** (verificar que deletedAt é preenchido, registros não aparecem em listagens)

#### Validação
- [x] Todos os testes passando
- [x] Cobertura de testes > 70%

---

### 13. Documentação

#### Documentação Técnica
- [x] Documentar endpoints de tarefas e notas
- [x] Documentar sistema de timeline
- [x] Documentar tipos e status
- [x] **Documentar integração com auditoria** (como logs são criados)
- [x] **Documentar permissões por campo** (como funcionam para Task e Note)
- [x] **Documentar validações específicas** (enums, datas, relacionamentos, limites)

**Arquivo:** `docs/API-Tarefas-Notas.md`

---

## Critérios de Prontidão

Antes de avançar para a **Etapa 8 (Busca/Filtros)**, verifique:

- [x] Tarefas podem ser criadas e gerenciadas
- [x] Notas podem ser criadas e vinculadas a registros
- [x] Timeline exibindo histórico de atividades por registro
- [x] Status e tipos de tarefas configuráveis
- [x] Editor de notas funcionando
- [x] **Auditoria funcionando para todas as operações CRUD** (logs criados em create, update, delete)
- [x] **Permissões por campo funcionando** (filtragem em GET, validação em UPDATE)
- [x] **Soft delete funcionando** (deletedAt preenchido, registros não aparecem em listagens)
- [x] **Validações específicas implementadas** (enums, datas, relacionamentos, limites)
- [x] Frontend básico funcionando
- [x] Testes passando
- [x] Documentação atualizada

---

## Tecnologias Utilizadas

- **Backend**: Node.js + TypeScript
- **ORM**: Prisma
- **Banco de dados**: PostgreSQL
- **Frontend**: React + TypeScript
- **Editor de notas**: Markdown (recomendado)

---

## Próximos Passos

Após completar esta etapa, você pode avançar para:

**→ [Etapa 8: Busca e Filtros](./Etapa-08-Busca-Filtros.md)**

---

## Notas Importantes

✅ **Boas práticas**:
- Timeline deve ser performática (paginada)
- Notas devem ter limite de tamanho (ex: 10.000 caracteres)
- Tarefas vencidas devem ser destacadas visualmente
- Editor de notas deve ser simples na V1 (Markdown é suficiente)

---

## Referências

- **Roadmap Funcional**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`
- **Etapa 5 (Contatos)**: `Features/meu_projeto/v1/fases_2/Etapa-05-Contatos-Empresas.md`
- **Etapa 6 (Leads/Oportunidades)**: `Features/meu_projeto/v1/fases_2/Etapa-06-Leads-Oportunidades.md`
- **Decisão de Stack**: `Features/meu_projeto/v1/Decisao-Stack-V1.md`
