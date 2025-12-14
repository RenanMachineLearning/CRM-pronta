# Etapa 3 — Gestão de Usuários e Controle de Acesso (ACL)

> **Dependências**: Etapa 1 (Multi-tenant) ✅, Etapa 2 (Autenticação) ✅  
> **Stack**: Node.js + TypeScript, PostgreSQL, Prisma  
> **Referência**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`

## Objetivo da Etapa

Implementar gestão de usuários, roles/funções e controle de acesso granular (objeto e campo), garantindo governança básica. ACL é fundamental para segurança e governança do sistema.

---

## Checklist de Implementação

### 1. Modelo de Dados — Roles e Permissões

#### Backend (Prisma Schema)
- [ ] Criar tabela `Role` no schema Prisma
  - [ ] Campo `id` (UUID)
  - [ ] Campo `name` (ex: "Admin", "Vendedor", "Visualizador")
  - [ ] Campo `tenantId` (foreign key para `Tenant`)
  - [ ] Campo `description` (opcional)
  - [ ] Campos `created_at` e `updated_at`
  - [ ] Índice único composto: `(tenantId, name)` para garantir nome único por tenant

- [ ] Criar tabela `Permission` no schema Prisma
  - [ ] Campo `id` (UUID)
  - [ ] Campo `entity` (ex: "Contact", "Company", "Lead", "Opportunity")
  - [ ] Campo `action` (ex: "create", "read", "update", "delete", "list")
  - [ ] Campo `field` (opcional, para permissões por campo)
  - [ ] Campo `tenantId` (foreign key)
  - [ ] Campos `created_at` e `updated_at`

- [ ] Criar tabela `RolePermission` (relação N:N)
  - [ ] Campo `roleId` (foreign key para `Role`)
  - [ ] Campo `permissionId` (foreign key para `Permission`)
  - [ ] Índice único composto: `(roleId, permissionId)`

- [ ] Criar tabela `UserRole` (relação N:N)
  - [ ] Campo `userId` (foreign key para `User`)
  - [ ] Campo `roleId` (foreign key para `Role`)
  - [ ] Índice único composto: `(userId, roleId)`

- [ ] Criar migração Prisma
  - [ ] Executar `prisma migrate dev --name add_acl`
  - [ ] Validar que todas as tabelas foram criadas

#### Validação
- [ ] Testar criação de roles via Prisma
- [ ] Testar associação de permissões a roles
- [ ] Testar associação de roles a usuários

---

### 2. Roles Padrão e Permissões Iniciais

#### Backend (Seed Script)
- [ ] Criar roles padrão no seed
  - [ ] **Admin**: acesso total (todas as permissões)
  - [ ] **Vendedor**: pode criar/editar contatos, leads, oportunidades; pode visualizar relatórios
  - [ ] **Visualizador**: apenas leitura (read, list) em todas as entidades

- [ ] Criar permissões padrão
  - [ ] Permissões por entidade: Contact, Company, Lead, Opportunity, Task, Note
  - [ ] Permissões por ação: create, read, update, delete, list
  - [ ] Permissões por campo (ex: "Opportunity.value" - read/write)

- [ ] Associar permissões a roles
  - [ ] Admin: todas as permissões
  - [ ] Vendedor: permissões específicas
  - [ ] Visualizador: apenas read e list

#### Validação
- [ ] Executar seed e verificar que roles foram criados
- [ ] Verificar que permissões foram associadas corretamente

---

### 3. CRUD de Usuários

#### Backend (Rotas)
- [ ] Criar rota `GET /api/users`
  - [ ] Requer autenticação e permissão "User.list"
  - [ ] Listar usuários do tenant atual
  - [ ] Paginação (limit, offset)
  - [ ] Filtros opcionais (status, role)

- [ ] Criar rota `GET /api/users/:id`
  - [ ] Requer autenticação e permissão "User.read"
  - [ ] Retornar usuário específico (apenas do tenant atual)
  - [ ] Incluir roles do usuário

- [ ] Criar rota `POST /api/users`
  - [ ] Requer autenticação e permissão "User.create"
  - [ ] Receber: `email`, `name`, `password`, `roleIds[]`
  - [ ] Validar email único no tenant
  - [ ] Hash da senha
  - [ ] Criar usuário e associar roles
  - [ ] Retornar usuário criado (sem senha)

- [ ] Criar rota `PUT /api/users/:id`
  - [ ] Requer autenticação e permissão "User.update"
  - [ ] Receber: `name`, `email`, `roleIds[]`, `status`
  - [ ] Validar que usuário pertence ao tenant atual
  - [ ] Atualizar dados e roles
  - [ ] Retornar usuário atualizado

- [ ] Criar rota `DELETE /api/users/:id`
  - [ ] Requer autenticação e permissão "User.delete"
  - [ ] Validar que usuário pertence ao tenant atual
  - [ ] Soft delete (marcar como inativo) ou hard delete
  - [ ] Retornar sucesso

#### Validação
- [ ] Teste E2E: criar usuário funciona
- [ ] Teste E2E: listar usuários retorna apenas do tenant atual
- [ ] Teste E2E: atualizar usuário funciona
- [ ] Teste E2E: deletar usuário funciona

---

### 4. CRUD de Roles

#### Backend (Rotas)
- [ ] Criar rota `GET /api/roles`
  - [ ] Requer autenticação e permissão "Role.list"
  - [ ] Listar roles do tenant atual

- [ ] Criar rota `GET /api/roles/:id`
  - [ ] Requer autenticação e permissão "Role.read"
  - [ ] Retornar role específica com permissões

- [ ] Criar rota `POST /api/roles`
  - [ ] Requer autenticação e permissão "Role.create"
  - [ ] Receber: `name`, `description`, `permissionIds[]`
  - [ ] Criar role e associar permissões

- [ ] Criar rota `PUT /api/roles/:id`
  - [ ] Requer autenticação e permissão "Role.update"
  - [ ] Receber: `name`, `description`, `permissionIds[]`
  - [ ] Atualizar role e permissões

- [ ] Criar rota `DELETE /api/roles/:id`
  - [ ] Requer autenticação e permissão "Role.delete"
  - [ ] Validar que role não está em uso
  - [ ] Deletar role

#### Validação
- [ ] Teste E2E: criar role funciona
- [ ] Teste E2E: associar permissões a role funciona
- [ ] Teste E2E: deletar role em uso falha

---

### 5. Middleware de Autorização

#### Backend (Node.js + TypeScript)
- [ ] Criar middleware `authorizationMiddleware.ts`
  - [ ] Receber: `entity` (ex: "Contact"), `action` (ex: "create")
  - [ ] Buscar roles do usuário atual (do token)
  - [ ] Buscar permissões das roles
  - [ ] Verificar se usuário tem permissão para `entity.action`
  - [ ] Retornar erro 403 se não tiver permissão

- [ ] Criar helper `checkPermission(entity, action, field?)`
  - [ ] Função reutilizável para verificar permissões
  - [ ] Usar em controllers e middlewares

- [ ] Integrar middleware nas rotas
  - [ ] Aplicar middleware em rotas que precisam de autorização
  - [ ] Exemplo: `authorizationMiddleware('Contact', 'create')`

#### Validação
- [ ] Teste: usuário sem permissão recebe 403
- [ ] Teste: usuário com permissão passa
- [ ] Teste: Admin sempre tem acesso

---

### 6. Permissões por Campo

#### Backend (Node.js + TypeScript)
- [ ] Estender sistema de permissões
  - [ ] Suportar permissões por campo (ex: "Opportunity.value")
  - [ ] Verificar permissão de campo antes de retornar/atualizar dados
  - [ ] Filtrar campos não permitidos nas respostas

- [ ] Criar helper `filterFieldsByPermission(data, entity)`
  - [ ] Remover campos que usuário não tem permissão de ler
  - [ ] Aplicar em todas as respostas GET

- [ ] Validar permissões de campo em updates
  - [ ] Verificar se usuário pode atualizar cada campo
  - [ ] Rejeitar update se tentar atualizar campo sem permissão

#### Validação
- [ ] Teste: usuário sem permissão de campo não vê o campo
- [ ] Teste: usuário sem permissão de campo não pode atualizar
- [ ] Teste: Admin vê todos os campos

---

### 7. Perfil do Usuário

#### Backend (Rotas)
- [ ] Criar rota `GET /api/auth/me`
  - [ ] Requer autenticação
  - [ ] Retornar dados do usuário atual (do token)
  - [ ] Incluir roles e permissões

- [ ] Criar rota `PUT /api/auth/me`
  - [ ] Requer autenticação
  - [ ] Receber: `name`, `email` (opcional)
  - [ ] Atualizar perfil do usuário atual
  - [ ] Validar email único (se alterado)
  - [ ] Retornar perfil atualizado

- [ ] Criar rota `PUT /api/auth/me/password`
  - [ ] Requer autenticação
  - [ ] Receber: `currentPassword`, `newPassword`
  - [ ] Validar senha atual
  - [ ] Atualizar senha
  - [ ] (Reutilizar lógica da Etapa 2)

#### Validação
- [ ] Teste: obter perfil funciona
- [ ] Teste: atualizar perfil funciona
- [ ] Teste: alterar senha funciona

---

### 8. Auditoria de Alterações

#### Backend (Prisma Schema)
- [ ] Criar tabela `AuditLog` no schema Prisma
  - [ ] Campo `id` (UUID)
  - [ ] Campo `entityType` (ex: "Contact", "Company")
  - [ ] Campo `entityId` (ID do registro alterado)
  - [ ] Campo `action` (create, update, delete)
  - [ ] Campo `userId` (quem fez a alteração)
  - [ ] Campo `tenantId` (foreign key)
  - [ ] Campo `changes` (JSON com campos alterados: `{ field: { old, new } }`)
  - [ ] Campo `timestamp` (quando ocorreu)
  - [ ] Índice em `(tenantId, entityType, entityId)` para busca rápida

- [ ] Criar migração Prisma
  - [ ] Executar `prisma migrate dev --name add_audit_log`

#### Backend (Middleware/Helper)
- [ ] Criar helper `logAudit(entityType, entityId, action, changes)`
  - [ ] Registrar alteração na tabela `AuditLog`
  - [ ] Capturar `userId` e `tenantId` do contexto

- [ ] Integrar auditoria em operações CRUD
  - [ ] Após criar registro: logar "create"
  - [ ] Após atualizar registro: logar "update" com changes
  - [ ] Após deletar registro: logar "delete"

#### Validação
- [ ] Teste: criação de registro gera log de auditoria
- [ ] Teste: atualização de registro gera log com changes
- [ ] Teste: deleção de registro gera log

---

### 9. Histórico de Alterações

#### Backend (Rotas)
- [ ] Criar rota `GET /api/audit-logs`
  - [ ] Requer autenticação e permissão "AuditLog.read"
  - [ ] Listar logs de auditoria do tenant atual
  - [ ] Filtros: `entityType`, `entityId`, `userId`, `action`, `dateFrom`, `dateTo`
  - [ ] Paginação

- [ ] Criar rota `GET /api/audit-logs/:entityType/:entityId`
  - [ ] Requer autenticação e permissão "AuditLog.read"
  - [ ] Retornar histórico de alterações de um registro específico
  - [ ] Ordenado por timestamp (mais recente primeiro)

#### Validação
- [ ] Teste: listar logs de auditoria funciona
- [ ] Teste: filtrar logs por entidade funciona
- [ ] Teste: histórico de registro específico funciona

---

### 10. Testes de ACL

#### Backend (Testes)
- [ ] Testes unitários
  - [ ] Verificação de permissões
  - [ ] Filtro de campos por permissão
  - [ ] Auditoria de alterações

- [ ] Testes de integração
  - [ ] Usuário com role Admin tem acesso total
  - [ ] Usuário com role Vendedor tem permissões corretas
  - [ ] Usuário com role Visualizador não pode criar/editar
  - [ ] Permissões por campo funcionam corretamente

- [ ] Testes de segurança
  - [ ] Usuário não pode acessar dados de outro tenant
  - [ ] Usuário sem permissão recebe 403
  - [ ] Auditoria registra todas as alterações

#### Validação
- [ ] Todos os testes passando
- [ ] Cobertura de testes > 80% para lógica de ACL

---

### 11. Documentação

#### Documentação Técnica
- [ ] Documentar sistema de roles e permissões
  - [ ] Roles padrão e suas permissões
  - [ ] Como criar novas roles
  - [ ] Como associar permissões

- [ ] Documentar endpoints de usuários e roles
  - [ ] `GET /api/users`
  - [ ] `POST /api/users`
  - [ ] `PUT /api/users/:id`
  - [ ] `DELETE /api/users/:id`
  - [ ] Endpoints de roles

- [ ] Documentar permissões por campo
  - [ ] Como funcionam
  - [ ] Como configurar
  - [ ] Exemplos

- [ ] Documentar auditoria
  - [ ] O que é registrado
  - [ ] Como consultar histórico

---

## Critérios de Prontidão

Antes de avançar para a **Etapa 4 (Modelo de Dados)**, verifique:

- [ ] Roles e permissões funcionais
- [ ] Permissões por objeto e campo operacionais
- [ ] Auditoria registrando alterações
- [ ] Perfil do usuário editável
- [ ] CRUD de usuários funcionando
- [ ] CRUD de roles funcionando
- [ ] Middleware de autorização funcionando
- [ ] Testes de ACL passando
- [ ] Documentação atualizada

---

## Tecnologias Utilizadas

- **Backend**: Node.js + TypeScript
- **ORM**: Prisma
- **Banco de dados**: PostgreSQL

---

## Próximos Passos

Após completar esta etapa, você pode avançar para:

**→ [Etapa 4: Objetos/Entidades e Campos Personalizáveis](./Etapa-04-Modelo-de-Dados.md)**

---

## Notas Importantes

⚠️ **Segurança**:
- Sempre verificar permissões antes de qualquer operação
- Filtrar campos por permissão em todas as respostas
- Auditoria é essencial para rastreabilidade

✅ **Boas práticas**:
- Roles padrão devem cobrir casos de uso comuns
- Permissões por campo dão flexibilidade sem complexidade excessiva
- Auditoria deve ser automática, não manual
- Testes de ACL devem ser abrangentes

---

## Referências

- **Roadmap Funcional**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`
- **Etapa 1 (Multi-tenant)**: `Features/meu_projeto/v1/fases_2/Etapa-01-Multi-tenant.md`
- **Etapa 2 (Autenticação)**: `Features/meu_projeto/v1/fases_2/Etapa-02-Autenticacao.md`
- **Decisão de Stack**: `Features/meu_projeto/v1/Decisao-Stack-V1.md`
