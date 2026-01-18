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
- [ ] Criar tabela `Task`
  - [ ] Campo `id` (UUID)
  - [ ] Campo `tenantId` (foreign key) - **OBRIGATÓRIO**
  - [ ] Campo `title` (título da tarefa - obrigatório)
  - [ ] Campo `description` (descrição - texto, opcional)
  - [ ] Campo `type` (enum: CALL, EMAIL, MEETING, OTHER)
  - [ ] Campo `status` (enum: PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
  - [ ] Campo `dueDate` (data de vencimento - DateTime?, opcional)
  - [ ] Campo `completedAt` (timestamp - quando foi concluída - DateTime?, opcional)
  - [ ] Campo `priority` (enum: LOW, MEDIUM, HIGH)
  - [ ] Campo `assignedToId` (foreign key para User - opcional)
  - [ ] Campo `createdById` (foreign key para User - obrigatório)
  - [ ] Campo `relatedEntityType` (string: Contact, Company, Lead, Opportunity)
  - [ ] Campo `relatedEntityId` (UUID - ID do registro relacionado)
  - [ ] Campo `deletedAt` (DateTime?, para soft delete)
  - [ ] Campos `created_at` e `updated_at`
  - [ ] Relacionamento obrigatório: `tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)`
  - [ ] Relacionamento: `createdBy User @relation(...)`
  - [ ] Relacionamento: `assignedTo User? @relation(...)`
  - [ ] Índice composto obrigatório: `@@index([tenantId, id])` - **OBRIGATÓRIO**
  - [ ] Índice em `(tenantId, relatedEntityType, relatedEntityId)`
  - [ ] Índice em `(tenantId, assignedToId, status)`

- [ ] Criar tabela `Note`
  - [ ] Campo `id` (UUID)
  - [ ] Campo `tenantId` (foreign key) - **OBRIGATÓRIO**
  - [ ] Campo `content` (conteúdo - texto ou markdown - obrigatório, máximo 10.000 caracteres)
  - [ ] Campo `type` (enum: NOTE, COMMENT, ANNOTATION)
  - [ ] Campo `relatedEntityType` (string: Contact, Company, Lead, Opportunity, Task)
  - [ ] Campo `relatedEntityId` (UUID - ID do registro relacionado)
  - [ ] Campo `createdById` (foreign key para User - obrigatório)
  - [ ] Campo `deletedAt` (DateTime?, para soft delete)
  - [ ] Campos `created_at` e `updated_at`
  - [ ] Relacionamento obrigatório: `tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)`
  - [ ] Relacionamento: `createdBy User @relation(...)`
  - [ ] Índice composto obrigatório: `@@index([tenantId, id])` - **OBRIGATÓRIO**
  - [ ] Índice em `(tenantId, relatedEntityType, relatedEntityId)`

- [ ] Criar migração Prisma
  - [ ] Executar `prisma migrate dev --name add_tasks_notes`
  - [ ] Validar que todas as tabelas foram criadas

#### Validação
- [ ] Testar criação de tarefa via Prisma
- [ ] Testar criação de nota via Prisma
- [ ] Testar vinculação a registros

---

### 2. Tipos e Status Configuráveis

#### Backend (Seed Script)
- [ ] Criar tipos de tarefa padrão
  - [ ] "Ligação"
  - [ ] "Email"
  - [ ] "Reunião"
  - [ ] "Outro"

- [ ] Criar status de tarefa padrão
  - [ ] "Pendente"
  - [ ] "Em Andamento"
  - [ ] "Concluída"
  - [ ] "Cancelada"

#### Validação
- [ ] Executar seed e verificar que tipos foram criados

---

### 2.5. Services (TaskService e NoteService)

#### Backend (Services)
- [ ] Criar `TaskService` em `backend/src/services/taskService.ts`
  - [ ] Método `listTasks(tenantId, filters?, pagination?, userId?)`
    - [ ] Filtrar por tenant
    - [ ] Aplicar filtros (status, type, assignedToId, relatedEntityType, relatedEntityId, dueDate)
    - [ ] Paginação (limit, offset)
    - [ ] Ordenação (dueDate, priority, created_at)
    - [ ] Incluir relacionamentos (assignedTo, createdBy, registro relacionado)
    - [ ] Filtrar campos por permissão se userId fornecido
  - [ ] Método `getTaskById(taskId, tenantId, userId?)`
    - [ ] Validar que tarefa pertence ao tenant
    - [ ] Incluir relacionamentos
    - [ ] Filtrar campos por permissão se userId fornecido
  - [ ] Método `createTask(data, tenantId, requestingUserId?)`
    - [ ] Validar dados obrigatórios (title)
    - [ ] Validar enums (type, status, priority)
    - [ ] Validar dueDate (não pode ser passada)
    - [ ] Validar relacionamentos (relatedEntityType/Id, assignedToId)
    - [ ] Capturar createdById do requestingUserId
    - [ ] Criar tarefa
    - [ ] Registrar auditoria
  - [ ] Método `updateTask(taskId, data, tenantId, requestingUserId?)`
    - [ ] Validar que tarefa pertence ao tenant
    - [ ] Validar enums se fornecidos
    - [ ] Se status mudar para COMPLETED: atualizar completedAt
    - [ ] Capturar changes (old/new) para auditoria
    - [ ] Atualizar tarefa
    - [ ] Registrar auditoria com changes
  - [ ] Método `deleteTask(taskId, tenantId, requestingUserId?)`
    - [ ] Validar que tarefa pertence ao tenant
    - [ ] Soft delete (marcar deletedAt)
    - [ ] Registrar auditoria
  - [ ] Seguir padrão de `ContactService` e `LeadService`

- [ ] Criar `NoteService` em `backend/src/services/noteService.ts`
  - [ ] Método `listNotes(tenantId, filters?, pagination?, userId?)`
    - [ ] Filtrar por tenant
    - [ ] Aplicar filtros (type, relatedEntityType, relatedEntityId)
    - [ ] Paginação (limit, offset)
    - [ ] Ordenação (created_at DESC - mais recente primeiro)
    - [ ] Incluir relacionamentos (createdBy, registro relacionado)
    - [ ] Filtrar campos por permissão se userId fornecido
  - [ ] Método `getNoteById(noteId, tenantId, userId?)`
    - [ ] Validar que nota pertence ao tenant
    - [ ] Incluir relacionamentos
    - [ ] Filtrar campos por permissão se userId fornecido
  - [ ] Método `createNote(data, tenantId, requestingUserId)`
    - [ ] Validar dados obrigatórios (content)
    - [ ] Validar limite de tamanho do conteúdo (10.000 caracteres)
    - [ ] Validar enum (type)
    - [ ] Validar relacionamentos (relatedEntityType/Id)
    - [ ] Capturar createdById do requestingUserId
    - [ ] Criar nota
    - [ ] Registrar auditoria
  - [ ] Método `updateNote(noteId, data, tenantId, requestingUserId?)`
    - [ ] Validar que nota pertence ao tenant
    - [ ] Validar que usuário é o criador (ou tem permissão admin)
    - [ ] Validar limite de tamanho se content for atualizado
    - [ ] Validar enum se type for atualizado
    - [ ] Capturar changes (old/new) para auditoria
    - [ ] Atualizar nota
    - [ ] Registrar auditoria com changes
  - [ ] Método `deleteNote(noteId, tenantId, requestingUserId?)`
    - [ ] Validar que nota pertence ao tenant
    - [ ] Validar que usuário é o criador (ou tem permissão admin)
    - [ ] Soft delete (marcar deletedAt)
    - [ ] Registrar auditoria
  - [ ] Seguir padrão de `ContactService` e `LeadService`

#### Validação
- [ ] Testar que TaskService segue padrão de ContactService
- [ ] Testar que NoteService segue padrão de ContactService
- [ ] Testar que filtros funcionam corretamente
- [ ] Testar que paginação funciona corretamente

---

### 2.6. Validações Específicas

#### Backend (Validadores)
- [ ] Validar enums
  - [ ] `Task.type`: valores permitidos (CALL, EMAIL, MEETING, OTHER)
  - [ ] `Task.status`: valores permitidos (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
  - [ ] `Task.priority`: valores permitidos (LOW, MEDIUM, HIGH)
  - [ ] `Note.type`: valores permitidos (NOTE, COMMENT, ANNOTATION)

- [ ] Validar datas
  - [ ] `dueDate`: não pode ser passada (se fornecida)
  - [ ] `completedAt`: só pode ser preenchida quando status = COMPLETED
  - [ ] Formato de data válido (DateTime)

- [ ] Validar relacionamentos
  - [ ] `relatedEntityType` e `relatedEntityId` devem existir e pertencer ao tenant
  - [ ] Validar que entidade relacionada existe na tabela correspondente
  - [ ] `assignedToId` deve existir e pertencer ao tenant (se fornecido)
  - [ ] `createdById` deve existir e pertencer ao tenant (obrigatório)

- [ ] Validar conteúdo de notas
  - [ ] Limite de tamanho (10.000 caracteres)
  - [ ] Não pode ser vazio ou apenas espaços em branco
  - [ ] Validar encoding (UTF-8)

- [ ] Validar campos obrigatórios
  - [ ] Task: `title` é obrigatório
  - [ ] Note: `content` é obrigatório
  - [ ] Task: `createdById` é obrigatório (capturado do token)
  - [ ] Note: `createdById` é obrigatório (capturado do token)

#### Validação
- [ ] Teste: enum inválido é rejeitado
- [ ] Teste: data passada é rejeitada
- [ ] Teste: relacionamento inexistente é rejeitado
- [ ] Teste: conteúdo de nota muito longo é rejeitado
- [ ] Teste: campos obrigatórios são validados

---

### 3. CRUD de Tarefas

#### Backend (Rotas)
- [ ] Criar rota `GET /api/tasks`
  - [ ] Requer autenticação e permissão "Task.list"
  - [ ] Listar tarefas do tenant atual (excluir soft deleted: `deletedAt IS NULL`)
  - [ ] Paginação (limit, offset)
  - [ ] Filtros: `status`, `type`, `assignedToId`, `relatedEntityType`, `relatedEntityId`, `dueDate`
  - [ ] Ordenação: `dueDate`, `priority`, `created_at`
  - [ ] Incluir usuário atribuído, criador, registro relacionado
  - [ ] **Filtrar campos por permissão** usando `filterFieldsByPermission` (permissões por campo)

- [ ] Criar rota `GET /api/tasks/:id`
  - [ ] Requer autenticação e permissão "Task.read"
  - [ ] Retornar tarefa específica
  - [ ] Validar que tarefa pertence ao tenant atual
  - [ ] **Filtrar campos por permissão** usando `filterFieldsByPermission` (permissões por campo)

- [ ] Criar rota `POST /api/tasks`
  - [ ] Requer autenticação e permissão "Task.create"
  - [ ] Receber: `title`, `description`, `type`, `status`, `dueDate`, `priority`, `assignedToId`, `relatedEntityType`, `relatedEntityId`
  - [ ] Validar dados obrigatórios (title)
  - [ ] Validar enums (type, status, priority)
  - [ ] Validar dueDate (não pode ser passada se fornecida)
  - [ ] Validar que registro relacionado existe e pertence ao tenant
  - [ ] Validar que assignedToId existe e pertence ao tenant (se fornecido)
  - [ ] Capturar `createdById` do token (req.userId)
  - [ ] Criar tarefa via `TaskService.createTask`
  - [ ] **Registrar auditoria** usando `logAudit('Task', taskId, 'create', userId, tenantId)`
  - [ ] Retornar tarefa criada (com campos filtrados por permissão)

- [ ] Criar rota `PUT /api/tasks/:id`
  - [ ] Requer autenticação e permissão "Task.update"
  - [ ] Receber mesmos campos do POST
  - [ ] Validar que tarefa pertence ao tenant atual
  - [ ] **Validar permissões por campo** usando `validateFieldPermissionsForUpdate`
  - [ ] Validar enums se fornecidos
  - [ ] Se status mudar para "COMPLETED": atualizar `completedAt`
  - [ ] Capturar changes (old/new) para auditoria
  - [ ] Atualizar tarefa via `TaskService.updateTask`
  - [ ] **Registrar auditoria** usando `logAudit('Task', taskId, 'update', userId, tenantId, changes)`
  - [ ] Retornar tarefa atualizada (com campos filtrados por permissão)

- [ ] Criar rota `DELETE /api/tasks/:id`
  - [ ] Requer autenticação e permissão "Task.delete"
  - [ ] Validar que tarefa pertence ao tenant atual
  - [ ] **Soft delete** (marcar `deletedAt` via `TaskService.deleteTask`)
  - [ ] **Registrar auditoria** usando `logAudit('Task', taskId, 'delete', userId, tenantId)`
  - [ ] Retornar sucesso

#### Validação
- [ ] Teste E2E: criar tarefa funciona
- [ ] Teste E2E: listar tarefas retorna apenas do tenant atual
- [ ] Teste E2E: atualizar tarefa funciona
- [ ] Teste E2E: concluir tarefa atualiza `completedAt`

---

### 4. CRUD de Notas

#### Backend (Rotas)
- [ ] Criar rota `GET /api/notes`
  - [ ] Requer autenticação e permissão "Note.list"
  - [ ] Listar notas do tenant atual (excluir soft deleted: `deletedAt IS NULL`)
  - [ ] Paginação (limit, offset)
  - [ ] Filtros: `type`, `relatedEntityType`, `relatedEntityId`
  - [ ] Ordenação: `created_at` (mais recente primeiro)
  - [ ] Incluir criador, registro relacionado
  - [ ] **Filtrar campos por permissão** usando `filterFieldsByPermission` (permissões por campo)

- [ ] Criar rota `GET /api/notes/:id`
  - [ ] Requer autenticação e permissão "Note.read"
  - [ ] Retornar nota específica
  - [ ] Validar que nota pertence ao tenant atual
  - [ ] **Filtrar campos por permissão** usando `filterFieldsByPermission` (permissões por campo)

- [ ] Criar rota `POST /api/notes`
  - [ ] Requer autenticação e permissão "Note.create"
  - [ ] Receber: `content`, `type`, `relatedEntityType`, `relatedEntityId`
  - [ ] Validar dados obrigatórios (content)
  - [ ] Validar limite de tamanho do conteúdo (ex: 10.000 caracteres)
  - [ ] Validar enum (type)
  - [ ] Validar que registro relacionado existe e pertence ao tenant
  - [ ] Criar nota via `NoteService.createNote` (capturar `createdById` do token)
  - [ ] **Registrar auditoria** usando `logAudit('Note', noteId, 'create', userId, tenantId)`
  - [ ] Retornar nota criada (com campos filtrados por permissão)

- [ ] Criar rota `PUT /api/notes/:id`
  - [ ] Requer autenticação e permissão "Note.update"
  - [ ] Receber: `content`, `type`
  - [ ] Validar que nota pertence ao tenant atual
  - [ ] Validar que usuário é o criador (ou tem permissão admin)
  - [ ] **Validar permissões por campo** usando `validateFieldPermissionsForUpdate`
  - [ ] Validar limite de tamanho se content for atualizado
  - [ ] Validar enum se type for atualizado
  - [ ] Capturar changes (old/new) para auditoria
  - [ ] Atualizar nota via `NoteService.updateNote`
  - [ ] **Registrar auditoria** usando `logAudit('Note', noteId, 'update', userId, tenantId, changes)`
  - [ ] Retornar nota atualizada (com campos filtrados por permissão)

- [ ] Criar rota `DELETE /api/notes/:id`
  - [ ] Requer autenticação e permissão "Note.delete"
  - [ ] Validar que nota pertence ao tenant atual
  - [ ] Validar que usuário é o criador (ou tem permissão admin)
  - [ ] **Soft delete** (marcar `deletedAt` via `NoteService.deleteNote`)
  - [ ] **Registrar auditoria** usando `logAudit('Note', noteId, 'delete', userId, tenantId)`
  - [ ] Retornar sucesso

#### Validação
- [ ] Teste E2E: criar nota funciona
- [ ] Teste E2E: listar notas retorna apenas do tenant atual
- [ ] Teste E2E: atualizar nota funciona
- [ ] Teste E2E: deletar nota funciona

---

### 5. Editor de Notas

#### Backend (Lógica)
- [ ] Decidir formato de notas
  - [ ] **Opção A**: Texto simples
  - [ ] **Opção B**: Markdown
  - [ ] **Opção C**: Rich text (HTML)
  - [ ] **Recomendação V1**: Markdown (simples e flexível)

- [ ] Armazenar conteúdo
  - [ ] Se Markdown: armazenar como texto
  - [ ] Renderizar Markdown no frontend

#### Frontend (React + TypeScript)
- [ ] Criar componente `NoteEditor`
  - [ ] Editor de texto (textarea ou editor Markdown)
  - [ ] Preview de Markdown (se usar Markdown)
  - [ ] Botões de formatação básica (negrito, itálico, lista)

#### Validação
- [ ] Teste: editor de notas funciona
- [ ] Teste: preview de Markdown funciona (se aplicável)

---

### 6. Timeline/Histórico de Atividades

#### Backend (Rotas)
- [ ] Criar rota `GET /api/timeline/:entityType/:entityId`
  - [ ] Requer autenticação
  - [ ] **Filtrar por tenant** (isolamento multi-tenant)
  - [ ] Validar que registro relacionado existe e pertence ao tenant
  - [ ] Retornar histórico de atividades de um registro
  - [ ] Incluir:
    - [ ] Tarefas relacionadas (ordenadas por data, excluir soft deleted)
    - [ ] Notas relacionadas (ordenadas por data, excluir soft deleted)
    - [ ] Alterações de auditoria (da Etapa 3 - já filtram por tenant automaticamente)
  - [ ] **Incluir informações de usuário** (quem criou tarefa/nota, quem fez alteração)
  - [ ] Paginação (limit, offset)
  - [ ] Ordenação: `created_at` (mais recente primeiro)

- [ ] Criar helper `getTimeline(entityType, entityId, tenantId)`
  - [ ] Buscar tarefas relacionadas (filtrar por tenant e excluir soft deleted)
  - [ ] Buscar notas relacionadas (filtrar por tenant e excluir soft deleted)
  - [ ] Buscar logs de auditoria (já filtram por tenant automaticamente)
  - [ ] Agregar e ordenar por data (timestamp)
  - [ ] Incluir informações de usuário em cada item
  - [ ] Retornar timeline unificada

#### Validação
- [ ] Teste: timeline retorna atividades corretas
- [ ] Teste: timeline está ordenada corretamente
- [ ] Teste: timeline inclui tarefas, notas e auditoria

---

### 7. Frontend — Listagem de Tarefas

#### Frontend (React + TypeScript)
- [ ] Criar componente `TaskList`
  - [ ] Tabela/listagem de tarefas
  - [ ] Colunas: título, tipo, status, atribuído a, vencimento, prioridade
  - [ ] Filtros: status, tipo, atribuído a, vencimento
  - [ ] Indicador visual de tarefas vencidas
  - [ ] Botão "Concluir" para tarefas pendentes

- [ ] Criar página `TasksPage`
  - [ ] Integrar `TaskList`
  - [ ] Botão "Nova Tarefa"
  - [ ] Visualização de tarefas por status (opcional)

#### Validação
- [ ] Teste: listagem de tarefas funciona
- [ ] Teste: filtros funcionam
- [ ] Teste: concluir tarefa funciona

---

### 8. Frontend — Formulário de Tarefa

#### Frontend (React + TypeScript)
- [ ] Criar componente `TaskForm`
  - [ ] Campos: title, description, type, status, dueDate, priority
  - [ ] Seleção de usuário atribuído (lookup)
  - [ ] Seleção de registro relacionado (entityType + lookup)
  - [ ] Validação de campos
  - [ ] Submit para criar/atualizar

- [ ] Criar página `TaskFormPage`
  - [ ] Integrar `TaskForm`
  - [ ] Modo criação ou edição

#### Validação
- [ ] Teste: criar tarefa funciona
- [ ] Teste: editar tarefa funciona

---

### 9. Frontend — Editor e Listagem de Notas

#### Frontend (React + TypeScript)
- [ ] Criar componente `NoteEditor` (reutilizar do item 5)
- [ ] Criar componente `NoteList`
  - [ ] Listagem de notas
  - [ ] Mostrar conteúdo (truncado se muito longo)
  - [ ] Mostrar criador e data
  - [ ] Link para editar/deletar

- [ ] Criar componente `NoteForm`
  - [ ] Integrar `NoteEditor`
  - [ ] Seleção de registro relacionado
  - [ ] Submit para criar/atualizar

#### Validação
- [ ] Teste: criar nota funciona
- [ ] Teste: editar nota funciona
- [ ] Teste: listar notas funciona

---

### 10. Frontend — Timeline

#### Frontend (React + TypeScript)
- [ ] Criar componente `Timeline`
  - [ ] Lista vertical de atividades
  - [ ] Agrupar por data (hoje, ontem, esta semana, etc.)
  - [ ] Mostrar tipo de atividade (tarefa, nota, alteração)
  - [ ] Mostrar usuário e timestamp
  - [ ] Link para detalhes da atividade

- [ ] Integrar timeline em páginas de detalhes
  - [ ] Página de detalhes de contato
  - [ ] Página de detalhes de empresa
  - [ ] Página de detalhes de lead
  - [ ] Página de detalhes de oportunidade

#### Validação
- [ ] Teste: timeline aparece em páginas de detalhes
- [ ] Teste: timeline mostra atividades corretas
- [ ] Teste: timeline está ordenada corretamente

---

### 11. Notificações de Tarefas (Opcional V1)

#### Backend (Lógica)
- [ ] Criar job/agendamento para tarefas vencidas
  - [ ] Buscar tarefas com `dueDate` passado e status "Pendente"
  - [ ] Enviar notificação (email ou in-app)
  - [ ] **Opcional na V1**: pode ser implementado depois

#### Validação
- [ ] Teste: notificações funcionam (se implementado)

---

### 12. Testes

#### Backend (Testes)
- [ ] Testes unitários
  - [ ] CRUD de tarefas
  - [ ] CRUD de notas
  - [ ] Timeline
  - [ ] Validações de enums
  - [ ] Validações de datas
  - [ ] Validações de relacionamentos

- [ ] Testes de integração
  - [ ] Tarefa vinculada a registro
  - [ ] Nota vinculada a registro
  - [ ] Timeline agrega corretamente
  - [ ] **Testes de auditoria** (verificar que logs são criados em create, update, delete)
  - [ ] **Testes de permissões por campo** (verificar filtragem em GET, validação em UPDATE)
  - [ ] **Testes de soft delete** (verificar que deletedAt é preenchido, registros não aparecem em listagens)

#### Validação
- [ ] Todos os testes passando
- [ ] Cobertura de testes > 70%

---

### 13. Documentação

#### Documentação Técnica
- [ ] Documentar endpoints de tarefas e notas
- [ ] Documentar sistema de timeline
- [ ] Documentar tipos e status
- [ ] **Documentar integração com auditoria** (como logs são criados)
- [ ] **Documentar permissões por campo** (como funcionam para Task e Note)
- [ ] **Documentar validações específicas** (enums, datas, relacionamentos, limites)

---

## Critérios de Prontidão

Antes de avançar para a **Etapa 8 (Busca/Filtros)**, verifique:

- [ ] Tarefas podem ser criadas e gerenciadas
- [ ] Notas podem ser criadas e vinculadas a registros
- [ ] Timeline exibindo histórico de atividades por registro
- [ ] Status e tipos de tarefas configuráveis
- [ ] Editor de notas funcionando
- [ ] **Auditoria funcionando para todas as operações CRUD** (logs criados em create, update, delete)
- [ ] **Permissões por campo funcionando** (filtragem em GET, validação em UPDATE)
- [ ] **Soft delete funcionando** (deletedAt preenchido, registros não aparecem em listagens)
- [ ] **Validações específicas implementadas** (enums, datas, relacionamentos, limites)
- [ ] Frontend básico funcionando
- [ ] Testes passando
- [ ] Documentação atualizada

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
