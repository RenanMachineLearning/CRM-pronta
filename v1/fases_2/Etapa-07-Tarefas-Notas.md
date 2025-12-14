# Etapa 7 — Tarefas, Notas e Histórico de Atividades

> **Dependências**: Etapa 5 (Contatos) ✅, Etapa 6 (Leads/Oportunidades) ✅  
> **Stack**: Node.js + TypeScript, PostgreSQL, Prisma, React + TypeScript  
> **Referência**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`

## Objetivo da Etapa

Implementar sistema de atividades (tarefas, notas) vinculadas a registros e timeline/histórico. Atividades precisam ser vinculadas a registros existentes. Timeline agrega histórico.

---

## Checklist de Implementação

### 1. Modelo de Dados — Tabelas de Tarefas e Notas

#### Backend (Prisma Schema)
- [ ] Criar tabela `Task`
  - [ ] Campo `id` (UUID)
  - [ ] Campo `tenantId` (foreign key)
  - [ ] Campo `title` (título da tarefa)
  - [ ] Campo `description` (descrição - texto)
  - [ ] Campo `type` (tipo: ligação, email, reunião, outro)
  - [ ] Campo `status` (pendente, em andamento, concluída, cancelada)
  - [ ] Campo `dueDate` (data de vencimento)
  - [ ] Campo `completedAt` (timestamp - quando foi concluída)
  - [ ] Campo `priority` (baixa, média, alta)
  - [ ] Campo `assignedToId` (foreign key para User)
  - [ ] Campo `relatedEntityType` (Contact, Company, Lead, Opportunity)
  - [ ] Campo `relatedEntityId` (UUID - ID do registro relacionado)
  - [ ] Campos `created_at` e `updated_at`
  - [ ] Índice em `(tenantId, relatedEntityType, relatedEntityId)`
  - [ ] Índice em `(tenantId, assignedToId, status)`

- [ ] Criar tabela `Note`
  - [ ] Campo `id` (UUID)
  - [ ] Campo `tenantId` (foreign key)
  - [ ] Campo `content` (conteúdo - texto ou markdown)
  - [ ] Campo `type` (tipo: nota, comentário, anotação)
  - [ ] Campo `relatedEntityType` (Contact, Company, Lead, Opportunity, Task)
  - [ ] Campo `relatedEntityId` (UUID)
  - [ ] Campo `createdById` (foreign key para User)
  - [ ] Campos `created_at` e `updated_at`
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

### 3. CRUD de Tarefas

#### Backend (Rotas)
- [ ] Criar rota `GET /api/tasks`
  - [ ] Requer autenticação e permissão "Task.list"
  - [ ] Listar tarefas do tenant atual
  - [ ] Paginação (limit, offset)
  - [ ] Filtros: `status`, `type`, `assignedToId`, `relatedEntityType`, `relatedEntityId`, `dueDate`
  - [ ] Ordenação: `dueDate`, `priority`, `created_at`
  - [ ] Incluir usuário atribuído, registro relacionado

- [ ] Criar rota `GET /api/tasks/:id`
  - [ ] Requer autenticação e permissão "Task.read"
  - [ ] Retornar tarefa específica
  - [ ] Validar que tarefa pertence ao tenant atual

- [ ] Criar rota `POST /api/tasks`
  - [ ] Requer autenticação e permissão "Task.create"
  - [ ] Receber: `title`, `description`, `type`, `status`, `dueDate`, `priority`, `assignedToId`, `relatedEntityType`, `relatedEntityId`
  - [ ] Validar dados obrigatórios (title)
  - [ ] Validar que registro relacionado existe
  - [ ] Criar tarefa
  - [ ] Retornar tarefa criada

- [ ] Criar rota `PUT /api/tasks/:id`
  - [ ] Requer autenticação e permissão "Task.update"
  - [ ] Receber mesmos campos do POST
  - [ ] Validar que tarefa pertence ao tenant atual
  - [ ] Se status mudar para "Concluída": atualizar `completedAt`
  - [ ] Atualizar tarefa
  - [ ] Retornar tarefa atualizada

- [ ] Criar rota `DELETE /api/tasks/:id`
  - [ ] Requer autenticação e permissão "Task.delete"
  - [ ] Validar que tarefa pertence ao tenant atual
  - [ ] Soft delete ou hard delete
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
  - [ ] Listar notas do tenant atual
  - [ ] Paginação (limit, offset)
  - [ ] Filtros: `type`, `relatedEntityType`, `relatedEntityId`
  - [ ] Ordenação: `created_at` (mais recente primeiro)
  - [ ] Incluir criador, registro relacionado

- [ ] Criar rota `GET /api/notes/:id`
  - [ ] Requer autenticação e permissão "Note.read"
  - [ ] Retornar nota específica
  - [ ] Validar que nota pertence ao tenant atual

- [ ] Criar rota `POST /api/notes`
  - [ ] Requer autenticação e permissão "Note.create"
  - [ ] Receber: `content`, `type`, `relatedEntityType`, `relatedEntityId`
  - [ ] Validar dados obrigatórios (content)
  - [ ] Validar que registro relacionado existe
  - [ ] Criar nota (capturar `createdById` do token)
  - [ ] Retornar nota criada

- [ ] Criar rota `PUT /api/notes/:id`
  - [ ] Requer autenticação e permissão "Note.update"
  - [ ] Receber: `content`, `type`
  - [ ] Validar que nota pertence ao tenant atual
  - [ ] Validar que usuário é o criador (ou tem permissão admin)
  - [ ] Atualizar nota
  - [ ] Retornar nota atualizada

- [ ] Criar rota `DELETE /api/notes/:id`
  - [ ] Requer autenticação e permissão "Note.delete"
  - [ ] Validar que nota pertence ao tenant atual
  - [ ] Validar que usuário é o criador (ou tem permissão admin)
  - [ ] Soft delete ou hard delete
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
  - [ ] Retornar histórico de atividades de um registro
  - [ ] Incluir:
    - [ ] Tarefas relacionadas (ordenadas por data)
    - [ ] Notas relacionadas (ordenadas por data)
    - [ ] Alterações de auditoria (da Etapa 3)
  - [ ] Paginação (limit, offset)
  - [ ] Ordenação: `created_at` (mais recente primeiro)

- [ ] Criar helper `getTimeline(entityType, entityId)`
  - [ ] Buscar tarefas relacionadas
  - [ ] Buscar notas relacionadas
  - [ ] Buscar logs de auditoria
  - [ ] Agregar e ordenar por data
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

- [ ] Testes de integração
  - [ ] Tarefa vinculada a registro
  - [ ] Nota vinculada a registro
  - [ ] Timeline agrega corretamente

#### Validação
- [ ] Todos os testes passando
- [ ] Cobertura de testes > 70%

---

### 13. Documentação

#### Documentação Técnica
- [ ] Documentar endpoints de tarefas e notas
- [ ] Documentar sistema de timeline
- [ ] Documentar tipos e status

---

## Critérios de Prontidão

Antes de avançar para a **Etapa 8 (Busca/Filtros)**, verifique:

- [ ] Tarefas podem ser criadas e gerenciadas
- [ ] Notas podem ser criadas e vinculadas a registros
- [ ] Timeline exibindo histórico de atividades por registro
- [ ] Status e tipos de tarefas configuráveis
- [ ] Editor de notas funcionando
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
