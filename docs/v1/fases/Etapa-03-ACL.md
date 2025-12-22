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
- [x] Criar tabela `Role` no schema Prisma
  - [x] Campo `id` (UUID)
  - [x] Campo `name` (ex: "Admin", "Vendedor", "Visualizador")
  - [x] Campo `tenantId` (foreign key para `Tenant`)
  - [x] Campo `description` (opcional)
  - [x] Campos `created_at` e `updated_at`
  - [x] Índice único composto: `(tenantId, name)` para garantir nome único por tenant

- [x] Criar tabela `Permission` no schema Prisma
  - [x] Campo `id` (UUID)
  - [x] Campo `entity` (ex: "Contact", "Company", "Lead", "Opportunity")
  - [x] Campo `action` (ex: "create", "read", "update", "delete", "list")
  - [x] Campo `field` (opcional, para permissões por campo)
  - [x] Campo `tenantId` (foreign key)
  - [x] Campos `created_at` e `updated_at`

- [x] Criar tabela `RolePermission` (relação N:N)
  - [x] Campo `roleId` (foreign key para `Role`)
  - [x] Campo `permissionId` (foreign key para `Permission`)
  - [x] Índice único composto: `(roleId, permissionId)`

- [x] Criar tabela `UserRole` (relação N:N)
  - [x] Campo `userId` (foreign key para `User`)
  - [x] Campo `roleId` (foreign key para `Role`)
  - [x] Índice único composto: `(userId, roleId)`

- [x] Criar migração Prisma
  - [x] Executar `prisma migrate dev --name add_acl`
  - [x] Validar que todas as tabelas foram criadas

#### Validação
- [x] Testar criação de roles via Prisma
- [x] Testar associação de permissões a roles
- [x] Testar associação de roles a usuários

---

### 2. Roles Padrão e Permissões Iniciais

#### Backend (Seed Script)

- Admin recebe todas as permissões existentes via seed.
- O middleware de autorização não possui exceções por nome de role.

- [x] Criar roles padrão no seed
  - [x] **Admin**: acesso total (todas as permissões)
  - [x] **Vendedor**: pode criar/editar contatos, leads, oportunidades; pode visualizar relatórios
  - [x] **Visualizador**: apenas leitura (read, list) em todas as entidades

- [x] Criar permissões padrão
  - [x] Permissões por entidade: Contact, Company, Lead, Opportunity, Task, Note
  - [x] Permissões por ação: create, read, update, delete, list
  - [x] Permissões por campo (ex: "Opportunity.value" - read/write)

- [x] Associar permissões a roles
  - [x] Admin: todas as permissões
  - [x] Vendedor: permissões específicas
  - [x] Visualizador: apenas read e list

#### Validação
- [ ] Executar seed e verificar que roles foram criados (validação manual)
- [ ] Verificar que permissões foram associadas corretamente (validação manual)

---

### 3. CRUD de Usuários

#### Backend (Rotas)
- [x] Criar rota `GET /api/users`
  - [x] Requer autenticação e permissão "User.list"
  - [x] Listar usuários do tenant atual
  - [x] Paginação (limit, offset)
  - [x] Filtros opcionais (status, role)

- [x] Criar rota `GET /api/users/:id`
  - [x] Requer autenticação e permissão "User.read"
  - [x] Retornar usuário específico (apenas do tenant atual)
  - [x] Incluir roles do usuário

- [x] Criar rota `POST /api/users`
  - [x] Requer autenticação e permissão "User.create"
  - [x] Receber: `email`, `name`, `password`, `roleIds[]`
  - [x] Validar email único no tenant
  - [x] Hash da senha
  - [x] Criar usuário e associar roles
  - [x] Retornar usuário criado (sem senha)

- [x] Criar rota `PUT /api/users/:id`
  - [x] Requer autenticação e permissão "User.update"
  - [x] Receber: `name`, `email`, `roleIds[]`, `status`
  - [x] Validar que usuário pertence ao tenant atual
  - [x] Atualizar dados e roles
  - [x] Retornar usuário atualizado

- [x] Criar rota `DELETE /api/users/:id`
  - [x] Requer autenticação e permissão "User.delete"
  - [x] Validar que usuário pertence ao tenant atual
  - [x] Soft delete (marcar como inativo) ou hard delete
  - [x] Retornar sucesso

#### Validação
- [x] Teste E2E: criar usuário funciona
- [x] Teste E2E: listar usuários retorna apenas do tenant atual
- [x] Teste E2E: atualizar usuário funciona
- [x] Teste E2E: deletar usuário funciona

---

### 4. CRUD de Roles

#### Backend (Rotas)
- [x] Criar rota `GET /api/roles`
  - [x] Requer autenticação e permissão "Role.list"
  - [x] Listar roles do tenant atual

- [x] Criar rota `GET /api/roles/:id`
  - [x] Requer autenticação e permissão "Role.read"
  - [x] Retornar role específica com permissões

- [x] Criar rota `POST /api/roles`
  - [x] Requer autenticação e permissão "Role.create"
  - [x] Receber: `name`, `description`, `permissionIds[]`
  - [x] Criar role e associar permissões

- [x] Criar rota `PUT /api/roles/:id`
  - [x] Requer autenticação e permissão "Role.update"
  - [x] Receber: `name`, `description`, `permissionIds[]`
  - [x] Atualizar role e permissões

- [x] Criar rota `DELETE /api/roles/:id`
  - [x] Requer autenticação e permissão "Role.delete"
  - [x] Validar que role não está em uso
  - [x] Deletar role

#### Validação
- [x] Teste E2E: criar role funciona
- [x] Teste E2E: associar permissões a role funciona
- [ ] Teste E2E: deletar role em uso falha

---

### 5. Middleware de Autorização

- O JWT contém apenas userId e tenantId.
- Roles e permissões são resolvidas em tempo de requisição.


#### Backend (Node.js + TypeScript)
- [x] Criar middleware `authorizationMiddleware.ts`
  - [x] Receber: `entity` (ex: "Contact"), `action` (ex: "create")
  - [x] Buscar roles do usuário atual (do token)
  - [x] Buscar permissões das roles
  - [x] Verificar se usuário tem permissão para `entity.action`
  - [x] Retornar erro 403 se não tiver permissão

- [x] Criar helper `checkPermission(entity, action, field?)`
  - [x] Função reutilizável para verificar permissões
  - [x] Usar em controllers e middlewares

- [x] Integrar middleware nas rotas
  - [x] Aplicar middleware em rotas que precisam de autorização
  - [x] Exemplo: `authorizationMiddleware('Contact', 'create')`

#### Validação
- [x] Teste: usuário sem permissão recebe 403
- [x] Teste: usuário com permissão passa
- [x] Teste: Admin sempre tem acesso

---

### 6. Permissões por Campo

#### Backend (Node.js + TypeScript)

⚠️ Implementar permissões por campo apenas após:
- ACL por entidade estabilizado
- CRUD de usuários e roles finalizados
- Testes de autorização básicos passando

- [x] Estender sistema de permissões
  - [x] Suportar permissões por campo (ex: "Opportunity.value")
  - [x] Verificar permissão de campo antes de retornar/atualizar dados
  - [x] Filtrar campos não permitidos nas respostas

- [x] Criar helper `filterFieldsByPermission(data, entity)`
  - [x] Remover campos que usuário não tem permissão de ler
  - [x] Aplicar em todas as respostas GET

- [x] Validar permissões de campo em updates
  - [x] Verificar se usuário pode atualizar cada campo
  - [x] Rejeitar update se tentar atualizar campo sem permissão

#### Validação
- [x] Teste: usuário sem permissão de campo não vê o campo
- [x] Teste: usuário sem permissão de campo não pode atualizar
- [x] Teste: Admin vê todos os campos

---

### 7. Perfil do Usuário

#### Backend (Rotas)
- [x] Criar rota `GET /api/auth/me`
  - [x] Requer autenticação
  - [x] Retornar dados do usuário atual (do token)
  - [x] Incluir roles e permissões

- [x] Criar rota `PUT /api/auth/me`
  - [x] Requer autenticação
  - [x] Receber: `name`, `email` (opcional)
  - [x] Atualizar perfil do usuário atual
  - [x] Validar email único (se alterado)
  - [x] Retornar perfil atualizado

- [x] Criar rota `PUT /api/auth/me/password`
  - [x] Requer autenticação
  - [x] Receber: `currentPassword`, `newPassword`
  - [x] Validar senha atual
  - [x] Atualizar senha
  - [x] (Reutilizar lógica da Etapa 2)

#### Validação
- [ ] Teste: obter perfil funciona
- [ ] Teste: atualizar perfil funciona
- [ ] Teste: alterar senha funciona (há testes para `/api/auth/change-password`, mas não para `/api/auth/me/password`)

---

### 8. Auditoria de Alterações

#### Backend (Prisma Schema)

- Falhas na auditoria não devem impedir a operação principal.
- Auditoria não altera o comportamento funcional do sistema.

- [x] Criar tabela `AuditLog` no schema Prisma
  - [x] Campo `id` (UUID)
  - [x] Campo `entityType` (ex: "Contact", "Company")
  - [x] Campo `entityId` (ID do registro alterado)
  - [x] Campo `action` (create, update, delete)
  - [x] Campo `userId` (quem fez a alteração)
  - [x] Campo `tenantId` (foreign key)
  - [x] Campo `changes` (JSON com campos alterados: `{ field: { old, new } }`)
  - [x] Campo `timestamp` (quando ocorreu)
  - [x] Índice em `(tenantId, entityType, entityId)` para busca rápida

- [x] Criar migração Prisma
  - [x] Executar `prisma migrate dev --name add_audit_log`

#### Backend (Middleware/Helper)
- [x] Criar helper `logAudit(entityType, entityId, action, changes)`
  - [x] Registrar alteração na tabela `AuditLog`
  - [x] Capturar `userId` e `tenantId` do contexto

- [x] Integrar auditoria em operações CRUD
  - [x] Após criar registro: logar "create"
  - [x] Após atualizar registro: logar "update" com changes
  - [x] Após deletar registro: logar "delete"

#### Validação
- [x] Teste: criação de registro gera log de auditoria
- [x] Teste: atualização de registro gera log com changes
- [x] Teste: deleção de registro gera log

---

### 9. Histórico de Alterações

#### Backend (Rotas)
- [x] Criar rota `GET /api/audit-logs`
  - [x] Requer autenticação e permissão "AuditLog.read"
  - [x] Listar logs de auditoria do tenant atual
  - [x] Filtros: `entityType`, `entityId`, `userId`, `action`, `dateFrom`, `dateTo`
  - [x] Paginação

- [x] Criar rota `GET /api/audit-logs/:entityType/:entityId`
  - [x] Requer autenticação e permissão "AuditLog.read"
  - [x] Retornar histórico de alterações de um registro específico
  - [x] Ordenado por timestamp (mais recente primeiro)

#### Validação
- [x] Teste: listar logs de auditoria funciona
- [x] Teste: filtrar logs por entidade funciona
- [x] Teste: histórico de registro específico funciona

---

### 10. Testes de ACL

#### Backend (Testes)

Testes mínimos obrigatórios:
- Visualizador recebe 403 em create/update/delete
- Vendedor cria e atualiza, mas não deleta
- Admin possui acesso total via permissões
- Usuário não acessa recursos de outro tenant
- Campo restrito não é retornado

- [x] Testes unitários
  - [x] Verificação de permissões
  - [x] Filtro de campos por permissão
  - [x] Auditoria de alterações

- [x] Testes de integração
  - [x] Usuário com role Admin tem acesso total
  - [x] Usuário com role Vendedor tem permissões corretas
  - [x] Usuário com role Visualizador não pode criar/editar
  - [x] Permissões por campo funcionam corretamente

- [x] Testes de segurança
  - [x] Usuário não pode acessar dados de outro tenant
  - [x] Usuário sem permissão recebe 403
  - [x] Auditoria registra todas as alterações

#### Validação
- [x] Todos os testes passando
- [x] Cobertura de testes > 80% para lógica de ACL

---

### 11. Documentação

#### Documentação Técnica
- [x] Documentar sistema de roles e permissões
  - [x] Roles padrão e suas permissões
  - [x] Como criar novas roles
  - [x] Como associar permissões

- [x] Documentar endpoints de usuários e roles
  - [x] `GET /api/users`
  - [x] `POST /api/users`
  - [x] `PUT /api/users/:id`
  - [x] `DELETE /api/users/:id`
  - [x] Endpoints de roles

- [x] Documentar permissões por campo
  - [x] Como funcionam
  - [x] Como configurar
  - [x] Exemplos

- [x] Documentar auditoria
  - [x] O que é registrado
  - [x] Como consultar histórico

---

## Critérios de Prontidão

Antes de avançar para a **Etapa 4 (Modelo de Dados)**, verifique:

- [x] Roles e permissões funcionais
- [x] Permissões por objeto e campo operacionais
- [x] Auditoria registrando alterações
- [x] Perfil do usuário editável
- [x] CRUD de usuários funcionando
- [x] CRUD de roles funcionando
- [x] Middleware de autorização funcionando
- [x] Testes de ACL passando
- [x] Documentação atualizada

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
