# Etapa 5 — Contatos e Empresas

> **Dependências**: Etapa 4 (Modelo de Dados) ✅  
> **Stack**: Node.js + TypeScript, PostgreSQL, Prisma, React + TypeScript  
> **Referência**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`

## Objetivo da Etapa

Implementar CRUD completo de contatos e empresas, com associações, múltiplos meios de contato e metadados. Contatos e empresas são a base do CRM. Leads e oportunidades dependem deles.

---

## Decisões e Regras Arquiteturais (V1) — (OBRIGATÓRIO ler antes de implementar)

> Esta seção existe para **evitar retrabalho** e manter **coerência** com o que já foi implementado nas Etapas 01-04.

### 1) Integração com Auditoria (já implementada na Etapa 3)

✅ **Sistema de auditoria já está implementado**:
- Helper `logAudit` em `backend/src/utils/auditLog.ts`
- Service `AuditLogService` em `backend/src/services/auditLogService.ts`
- Tabela `AuditLog` no schema Prisma

**O que fazer**:
- Estender tipo `AuditEntity` para incluir `'Contact'` e `'Company'`
- Registrar auditoria em todas as operações CRUD de Contact e Company
- Usar `logAudit('Contact', contactId, 'create', userId, tenantId)` após criar contato
- Usar `logAudit('Contact', contactId, 'update', userId, tenantId, changes)` ao atualizar
- Usar `logAudit('Contact', contactId, 'delete', userId, tenantId)` ao deletar

**Exemplo**:
```typescript
import { logAudit } from '../utils/auditLog';

// Após criar contato
await logAudit('Contact', contact.id, 'create', requestingUserId, tenantId);

// Ao atualizar contato
await logAudit('Contact', contact.id, 'update', requestingUserId, tenantId, {
  firstName: { old: oldContact.firstName, new: contact.firstName },
  email: { old: oldContact.email, new: contact.email }
});
```

### 2) Permissões por Campo (já implementadas na Etapa 3)

✅ **Sistema de permissões por campo já está implementado**:
- Helper `filterFieldsByPermission` em `backend/src/utils/fieldPermissions.ts`
- Helper `validateFieldPermissionsForUpdate` em `backend/src/utils/fieldPermissions.ts`
- Permissões no formato `Contact.read.email`, `Contact.update.phone`, etc.

**O que fazer**:
- Filtrar campos por permissão em todas as respostas GET
- Validar permissões de campo em todas as operações UPDATE
- Usar `filterFieldsByPermission(contact, userId, tenantId, 'Contact', 'read')` antes de retornar
- Usar `validateFieldPermissionsForUpdate(req.body, userId, tenantId, 'Contact')` antes de atualizar

**Exemplo**:
```typescript
import { filterFieldsByPermission, validateFieldPermissionsForUpdate } from '../utils/fieldPermissions';

// Em GET /api/contacts/:id
const contact = await ContactService.getContactById(id, tenantId);
const filteredContact = await filterFieldsByPermission(
  contact,
  req.userId!,
  tenantId,
  'Contact',
  'read'
);
res.json(filteredContact);

// Em PUT /api/contacts/:id
const validation = await validateFieldPermissionsForUpdate(
  req.body,
  req.userId!,
  tenantId,
  'Contact'
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
- Índices adicionais conforme necessidade (ex: `@@index([tenantId, companyId])`)

### 4) Soft Delete vs Hard Delete

**Decisão V1**: Usar **soft delete** para `Contact` e `Company`:
- Adicionar campo `deletedAt DateTime?` ou `isDeleted Boolean @default(false)`
- Soft delete preserva histórico e permite recuperação
- Hard delete apenas para tabelas relacionadas quando necessário (ex: `ContactEmail`, `ContactPhone`)

### 5) Relacionamento Contact-Company

**Decisão V1**: Começar com relação **1:N** (um contato pertence a uma empresa):
- Campo `companyId` opcional em `Contact`
- Se necessário evoluir para N:N no futuro, criar tabela `ContactCompany`

### 6) Campos Customizados

**Integração com sistema de metadados (Etapa 4)**:
- Campos customizados podem ser adicionados via `Field` (já implementado)
- Valores customizados armazenados em `EntityData` quando necessário
- Validar campos customizados usando `fieldValueValidator` existente

---

## Checklist de Implementação

### 1. Modelo de Dados — Tabelas de Contatos e Empresas

#### Backend (Prisma Schema)
- [ ] Criar tabela `Contact` (tabela própria, não EntityData - conforme decisão Etapa 4)
  - [ ] Campo `id` (UUID)
  - [ ] Campo `tenantId` (foreign key) - **OBRIGATÓRIO**
  - [ ] Campos básicos: `firstName`, `lastName`, `title` (cargo), `status`
  - [ ] Campos opcionais: `gender` (string), `birthDate` (DateTime?), `notes` (text)
  - [ ] Campo `companyId` (foreign key para `Company`, opcional)
  - [ ] Campo `deletedAt` (DateTime?, para soft delete)
  - [ ] Campos `created_at` e `updated_at`
  - [ ] Relacionamento `tenant Tenant @relation(...)` - **OBRIGATÓRIO**
  - [ ] Índice composto obrigatório: `@@index([tenantId, id])` - **OBRIGATÓRIO**
  - [ ] Índice adicional: `@@index([tenantId, companyId])`

- [ ] Criar tabela `Company` (tabela própria, não EntityData - conforme decisão Etapa 4)
  - [ ] Campo `id` (UUID)
  - [ ] Campo `tenantId` (foreign key) - **OBRIGATÓRIO**
  - [ ] Campos básicos: `name`, `website`, `industry`, `size`, `status`
  - [ ] Campo `deletedAt` (DateTime?, para soft delete)
  - [ ] Campos `created_at` e `updated_at`
  - [ ] Relacionamento `tenant Tenant @relation(...)` - **OBRIGATÓRIO**
  - [ ] Índice composto obrigatório: `@@index([tenantId, id])` - **OBRIGATÓRIO**

- [ ] Criar tabela `ContactEmail`
  - [ ] Campo `id` (UUID)
  - [ ] Campo `contactId` (foreign key)
  - [ ] Campo `email` (string)
  - [ ] Campo `type` (enum: Work, Home, Other)
  - [ ] Campo `isPrimary` (boolean)
  - [ ] Campo `tenantId` (foreign key) - **OBRIGATÓRIO**
  - [ ] Relacionamento `tenant Tenant @relation(...)` - **OBRIGATÓRIO**
  - [ ] Índice composto obrigatório: `@@index([tenantId, id])` - **OBRIGATÓRIO**
  - [ ] Índice adicional: `@@index([tenantId, contactId])`

- [ ] Criar tabela `ContactPhone`
  - [ ] Campo `id` (UUID)
  - [ ] Campo `contactId` (foreign key)
  - [ ] Campo `phone` (string)
  - [ ] Campo `type` (enum: Work, Home, Mobile, Other)
  - [ ] Campo `isPrimary` (boolean)
  - [ ] Campo `tenantId` (foreign key) - **OBRIGATÓRIO**
  - [ ] Relacionamento `tenant Tenant @relation(...)` - **OBRIGATÓRIO**
  - [ ] Índice composto obrigatório: `@@index([tenantId, id])` - **OBRIGATÓRIO**
  - [ ] Índice adicional: `@@index([tenantId, contactId])`

- [ ] Criar tabela `Address`
  - [ ] Campo `id` (UUID)
  - [ ] Campo `contactId` (foreign key, opcional)
  - [ ] Campo `companyId` (foreign key, opcional)
  - [ ] Campos: `street`, `city`, `state`, `zipCode`, `country`
  - [ ] Campo `type` (enum: Billing, Shipping, Other)
  - [ ] Campo `tenantId` (foreign key) - **OBRIGATÓRIO**
  - [ ] Relacionamento `tenant Tenant @relation(...)` - **OBRIGATÓRIO**
  - [ ] Índice composto obrigatório: `@@index([tenantId, id])` - **OBRIGATÓRIO**
  - [ ] Índices adicionais: `@@index([tenantId, contactId])` e `@@index([tenantId, companyId])`

- [ ] Criar tabela `ContactTag` (relação N:N)
  - [ ] Campo `contactId` (foreign key)
  - [ ] Campo `tagId` (foreign key para `Tag`)
  - [ ] Índice único composto: `(contactId, tagId)`

- [ ] Criar tabela `Tag`
  - [ ] Campo `id` (UUID)
  - [ ] Campo `name` (string)
  - [ ] Campo `color` (string, hex color)
  - [ ] Campo `tenantId` (foreign key) - **OBRIGATÓRIO**
  - [ ] Relacionamento `tenant Tenant @relation(...)` - **OBRIGATÓRIO**
  - [ ] Campos `created_at` e `updated_at`
  - [ ] Índice composto obrigatório: `@@index([tenantId, id])` - **OBRIGATÓRIO**
  - [ ] Índice único composto: `@@unique([tenantId, name])`

- [ ] Criar migração Prisma
  - [ ] Executar `prisma migrate dev --name add_contacts_companies`
  - [ ] Validar que todas as tabelas foram criadas

#### Validação
- [ ] Testar criação de contato via Prisma
- [ ] Testar criação de empresa via Prisma
- [ ] Testar associação entre contato e empresa

---

### 2. CRUD de Contatos

#### Backend (Rotas)
- [ ] Criar rota `GET /api/contacts`
  - [ ] Requer autenticação e permissão "Contact.list"
  - [ ] Listar contatos do tenant atual
  - [ ] Paginação (limit, offset)
  - [ ] Filtros: `companyId`, `status`, `tagId`
  - [ ] Ordenação: `firstName`, `lastName`, `created_at`
  - [ ] Incluir emails, telefones, endereços, tags, empresa

- [ ] Criar rota `GET /api/contacts/:id`
  - [ ] Requer autenticação e permissão "Contact.read"
  - [ ] Retornar contato específico
  - [ ] Incluir emails, telefones, endereços, tags, empresa
  - [ ] Validar que contato pertence ao tenant atual
  - [ ] **Filtrar campos por permissão** usando `filterFieldsByPermission` (permissões por campo)

- [ ] Criar rota `POST /api/contacts`
  - [ ] Requer autenticação e permissão "Contact.create"
  - [ ] Receber: `firstName`, `lastName`, `title`, `status`, `companyId`, `emails[]`, `phones[]`, `addresses[]`, `tagIds[]`
  - [ ] Validar dados obrigatórios
  - [ ] Validar emails (formato)
  - [ ] Validar telefones (formato básico)
  - [ ] Criar contato e relacionamentos
  - [ ] **Registrar auditoria** usando `logAudit('Contact', contactId, 'create', userId, tenantId)`
  - [ ] Retornar contato criado (com campos filtrados por permissão)

- [ ] Criar rota `PUT /api/contacts/:id`
  - [ ] Requer autenticação e permissão "Contact.update"
  - [ ] Receber mesmos campos do POST
  - [ ] Validar que contato pertence ao tenant atual
  - [ ] **Validar permissões por campo** usando `validateFieldPermissionsForUpdate`
  - [ ] Atualizar contato e relacionamentos
  - [ ] **Registrar auditoria** usando `logAudit` com changes (old/new values)
  - [ ] Retornar contato atualizado (com campos filtrados por permissão)

- [ ] Criar rota `DELETE /api/contacts/:id`
  - [ ] Requer autenticação e permissão "Contact.delete"
  - [ ] Validar que contato pertence ao tenant atual
  - [ ] **Soft delete** (marcar `deletedAt` ou `isDeleted = true`)
  - [ ] Se necessário: deletar emails, telefones, endereços, tags associados (hard delete em cascata)
  - [ ] **Registrar auditoria** usando `logAudit('Contact', contactId, 'delete', userId, tenantId)`
  - [ ] Retornar sucesso

#### Validação
- [ ] Teste E2E: criar contato funciona
- [ ] Teste E2E: listar contatos retorna apenas do tenant atual
- [ ] Teste E2E: atualizar contato funciona
- [ ] Teste E2E: deletar contato funciona

---

### 3. CRUD de Empresas

#### Backend (Rotas)
- [ ] Criar rota `GET /api/companies`
  - [ ] Requer autenticação e permissão "Company.list"
  - [ ] Listar empresas do tenant atual (excluir soft deleted: `deletedAt IS NULL`)
  - [ ] Paginação (limit, offset)
  - [ ] Filtros: `industry`, `size`
  - [ ] Ordenação: `name`, `created_at`
  - [ ] Incluir endereços, contatos associados
  - [ ] **Filtrar campos por permissão** usando `filterFieldsByPermission` (permissões por campo)

- [ ] Criar rota `GET /api/companies/:id`
  - [ ] Requer autenticação e permissão "Company.read"
  - [ ] Retornar empresa específica
  - [ ] Incluir endereços, contatos associados
  - [ ] Validar que empresa pertence ao tenant atual
  - [ ] **Filtrar campos por permissão** usando `filterFieldsByPermission` (permissões por campo)

- [ ] Criar rota `POST /api/companies`
  - [ ] Requer autenticação e permissão "Company.create"
  - [ ] Receber: `name`, `website`, `industry`, `size`, `addresses[]`
  - [ ] Validar dados obrigatórios
  - [ ] Validar website (formato URL)
  - [ ] Criar empresa e relacionamentos
  - [ ] **Registrar auditoria** usando `logAudit('Company', companyId, 'create', userId, tenantId)`
  - [ ] Retornar empresa criada (com campos filtrados por permissão)

- [ ] Criar rota `PUT /api/companies/:id`
  - [ ] Requer autenticação e permissão "Company.update"
  - [ ] Receber mesmos campos do POST
  - [ ] Validar que empresa pertence ao tenant atual
  - [ ] **Validar permissões por campo** usando `validateFieldPermissionsForUpdate`
  - [ ] Atualizar empresa e relacionamentos
  - [ ] **Registrar auditoria** usando `logAudit` com changes (old/new values)
  - [ ] Retornar empresa atualizada (com campos filtrados por permissão)

- [ ] Criar rota `DELETE /api/companies/:id`
  - [ ] Requer autenticação e permissão "Company.delete"
  - [ ] Validar que empresa pertence ao tenant atual
  - [ ] Validar que não há contatos associados (ou permitir desassociar)
  - [ ] **Soft delete** (marcar `deletedAt` ou `isDeleted = true`)
  - [ ] **Registrar auditoria** usando `logAudit('Company', companyId, 'delete', userId, tenantId)`
  - [ ] Retornar sucesso

#### Validação
- [ ] Teste E2E: criar empresa funciona
- [ ] Teste E2E: listar empresas retorna apenas do tenant atual
- [ ] Teste E2E: atualizar empresa funciona
- [ ] Teste E2E: deletar empresa sem contatos funciona

---

### 4. Associação entre Pessoas e Organizações

#### Backend (Lógica)
- [ ] Implementar associação N:N (se necessário)
  - [ ] Criar tabela `ContactCompany` (se um contato pode estar em múltiplas empresas)
  - [ ] Ou manter relação 1:N (um contato pertence a uma empresa)

- [ ] Atualizar rotas de contato
  - [ ] Permitir associar contato a empresa em criação/atualização
  - [ ] Permitir desassociar contato de empresa

- [ ] Criar rota `GET /api/companies/:id/contacts`
  - [ ] Requer autenticação e permissão "Contact.list"
  - [ ] Listar contatos de uma empresa específica

#### Validação
- [ ] Teste: associar contato a empresa funciona
- [ ] Teste: listar contatos de empresa funciona
- [ ] Teste: desassociar contato de empresa funciona

---

### 5. Múltiplos Meios de Contato

#### Backend (Rotas e Lógica)
- [ ] Criar rotas para emails
  - [ ] `POST /api/contacts/:id/emails` - adicionar email
  - [ ] `PUT /api/contacts/:id/emails/:emailId` - atualizar email
  - [ ] `DELETE /api/contacts/:id/emails/:emailId` - remover email
  - [ ] Validar formato de email
  - [ ] Garantir que pelo menos um email é primary

- [ ] Criar rotas para telefones
  - [ ] `POST /api/contacts/:id/phones` - adicionar telefone
  - [ ] `PUT /api/contacts/:id/phones/:phoneId` - atualizar telefone
  - [ ] `DELETE /api/contacts/:id/phones/:phoneId` - remover telefone
  - [ ] Validar formato de telefone (básico)
  - [ ] Garantir que pelo menos um telefone é primary (opcional)

#### Validação
- [ ] Teste: adicionar múltiplos emails funciona
- [ ] Teste: marcar email como primary funciona
- [ ] Teste: adicionar múltiplos telefones funciona
- [ ] Teste: validar formato de email/telefone funciona

---

### 6. Endereços

#### Backend (Rotas e Lógica)
- [ ] Criar rotas para endereços
  - [ ] `POST /api/contacts/:id/addresses` - adicionar endereço
  - [ ] `POST /api/companies/:id/addresses` - adicionar endereço
  - [ ] `PUT /api/addresses/:id` - atualizar endereço
  - [ ] `DELETE /api/addresses/:id` - remover endereço

- [ ] Validação de endereços
  - [ ] Validar campos obrigatórios (street, city, state, zipCode)
  - [ ] Validar formato de CEP (se aplicável)
  - [ ] Validar país (lista de países)

#### Validação
- [ ] Teste: adicionar endereço a contato funciona
- [ ] Teste: adicionar endereço a empresa funciona
- [ ] Teste: validar formato de endereço funciona

---

### 7. Metadados do Contato

#### Backend (Campos e Validação)
- [ ] Adicionar campos de metadados no schema (já mencionados na seção 1)
  - [ ] `title` (cargo/título profissional) - já no schema
  - [ ] `gender` (opcional, string) - adicionar ao schema
  - [ ] `birthDate` (opcional, DateTime?) - adicionar ao schema
  - [ ] `status` (ativo, inativo, etc.) - já no schema
  - [ ] `notes` (campo de texto livre) - adicionar ao schema

- [ ] Validação de metadados
  - [ ] Validar formato de data (se birthDate)
  - [ ] Validar valores de status (lista permitida - usar enum ou select)

#### Validação
- [ ] Teste: salvar metadados funciona
- [ ] Teste: validar valores de status funciona

---

### 8. Tags para Categorização

#### Backend (Rotas)
- [ ] Criar rota `GET /api/tags`
  - [ ] Requer autenticação
  - [ ] Listar tags do tenant atual

- [ ] Criar rota `POST /api/tags`
  - [ ] Requer autenticação e permissão "Tag.create"
  - [ ] Receber: `name`, `color`
  - [ ] Validar nome único no tenant
  - [ ] Criar tag

- [ ] Criar rota `PUT /api/tags/:id`
  - [ ] Requer autenticação e permissão "Tag.update"
  - [ ] Receber: `name`, `color`
  - [ ] Atualizar tag

- [ ] Criar rota `DELETE /api/tags/:id`
  - [ ] Requer autenticação e permissão "Tag.delete"
  - [ ] Deletar tag (remover associações)

- [ ] Criar rotas para associar tags a contatos
  - [ ] `POST /api/contacts/:id/tags` - adicionar tag
  - [ ] `DELETE /api/contacts/:id/tags/:tagId` - remover tag

#### Validação
- [ ] Teste: criar tag funciona
- [ ] Teste: associar tag a contato funciona
- [ ] Teste: filtrar contatos por tag funciona

---

### 9. Identificador Único

#### Backend (Lógica)
- [ ] Garantir que cada contato/empresa tem UUID único
  - [ ] Prisma gera UUID automaticamente via `@default(uuid())`
  - [ ] UUID é único globalmente (garantido pelo Prisma)

- [ ] Campo `externalId` (opcional - deixar para implementação futura se necessário)
  - [ ] Para integrações externas
  - [ ] Único por tenant
  - [ ] **Nota**: Não implementar na V1 a menos que seja requisito explícito

#### Validação
- [ ] Teste: UUID é gerado automaticamente
- [ ] Teste: externalId é único por tenant (se implementado)

---

### 10. Validação de Dados

#### Backend (Validadores)
- [ ] Validar emails
  - [ ] Formato de email válido (regex ou biblioteca)
  - [ ] **Decisão V1**: Email único por contato (não permitir duplicatas no mesmo contato)
  - [ ] Email pode estar em múltiplos contatos diferentes (não único globalmente)

- [ ] Validar telefones
  - [ ] Formato básico (números, parênteses, hífens, espaços)
  - [ ] Normalizar formato (opcional - remover caracteres especiais)

- [ ] Validar websites
  - [ ] Formato de URL válido
  - [ ] Adicionar `http://` se não tiver protocolo (normalização)

- [ ] Validar campos obrigatórios
  - [ ] Contato: pelo menos `firstName` ou `lastName` (um dos dois obrigatório)
  - [ ] Empresa: `name` obrigatório

#### Validação
- [ ] Teste: email inválido é rejeitado
- [ ] Teste: telefone inválido é rejeitado
- [ ] Teste: campos obrigatórios são validados

---

### 11. Frontend — Listagem de Contatos

#### Frontend (React + TypeScript)
- [ ] Criar componente `ContactList`
  - [ ] Tabela/listagem de contatos
  - [ ] Colunas: nome, email, telefone, empresa, tags
  - [ ] Paginação
  - [ ] Ordenação por coluna
  - [ ] Filtros básicos

- [ ] Criar página `ContactsPage`
  - [ ] Integrar `ContactList`
  - [ ] Botão "Novo Contato"
  - [ ] Link para detalhes do contato

#### Validação
- [ ] Teste: listagem de contatos funciona
- [ ] Teste: paginação funciona
- [ ] Teste: ordenação funciona

---

### 12. Frontend — Formulário de Contato

#### Frontend (React + TypeScript)
- [ ] Criar componente `ContactForm`
  - [ ] Campos: firstName, lastName, title, status
  - [ ] Seleção de empresa (lookup)
  - [ ] Lista de emails (adicionar/remover)
  - [ ] Lista de telefones (adicionar/remover)
  - [ ] Seleção de tags (multiselect)
  - [ ] Validação de campos
  - [ ] Submit para criar/atualizar

- [ ] Criar página `ContactFormPage`
  - [ ] Integrar `ContactForm`
  - [ ] Modo criação ou edição
  - [ ] Redirecionar após salvar

#### Validação
- [ ] Teste: criar contato funciona
- [ ] Teste: editar contato funciona
- [ ] Teste: validação de campos funciona

---

### 13. Frontend — Listagem e Formulário de Empresas

#### Frontend (React + TypeScript)
- [ ] Criar componente `CompanyList` (similar a ContactList)
- [ ] Criar componente `CompanyForm` (similar a ContactForm)
- [ ] Criar páginas `CompaniesPage` e `CompanyFormPage`

#### Validação
- [ ] Teste: listagem de empresas funciona
- [ ] Teste: criar/editar empresa funciona

---

### 14. Testes

#### Backend (Testes)
- [ ] Testes unitários
  - [ ] Validação de emails
  - [ ] Validação de telefones
  - [ ] Associação contato-empresa

- [ ] Testes de integração
  - [ ] CRUD completo de contatos
  - [ ] CRUD completo de empresas
  - [ ] Múltiplos emails/telefones
  - [ ] Tags

#### Frontend (Testes)
- [ ] Testes de componentes
  - [ ] ContactList renderiza corretamente
  - [ ] ContactForm valida campos

#### Validação
- [ ] Todos os testes passando
- [ ] Cobertura de testes > 70%

---

### 15. Integração com Auditoria

#### Backend (Integração)
- [ ] Estender tipo `AuditEntity` em `backend/src/utils/auditLog.ts`
  - [ ] Adicionar `'Contact'` e `'Company'` ao tipo `AuditEntity`
  - [ ] Atualizar enum `AuditEntityEnum` em `auditLogService.ts` se necessário

- [ ] Registrar auditoria em todas as operações CRUD
  - [ ] Contact: create, update, delete
  - [ ] Company: create, update, delete
  - [ ] ContactEmail, ContactPhone, Address: create, update, delete (opcional)

- [ ] Usar helper `logAudit` existente
  - [ ] Importar de `../utils/auditLog`
  - [ ] Chamar após operações bem-sucedidas
  - [ ] Capturar changes (old/new) em updates

#### Validação
- [ ] Teste: criação de contato gera log de auditoria
- [ ] Teste: atualização de contato gera log com changes
- [ ] Teste: deleção de contato gera log de auditoria

---

### 16. Integração com Permissões por Campo

#### Backend (Integração)
- [ ] Filtrar campos por permissão em respostas GET
  - [ ] Usar `filterFieldsByPermission` em `GET /api/contacts` e `GET /api/contacts/:id`
  - [ ] Usar `filterFieldsByPermission` em `GET /api/companies` e `GET /api/companies/:id`
  - [ ] Importar de `../utils/fieldPermissions`

- [ ] Validar permissões de campo em updates
  - [ ] Usar `validateFieldPermissionsForUpdate` em `PUT /api/contacts/:id`
  - [ ] Usar `validateFieldPermissionsForUpdate` em `PUT /api/companies/:id`
  - [ ] Retornar erro 403 se tentar atualizar campo sem permissão

#### Validação
- [ ] Teste: usuário sem permissão de campo não vê o campo
- [ ] Teste: usuário sem permissão de campo não pode atualizar
- [ ] Teste: Admin vê todos os campos

---

### 17. Suporte a Campos Customizados

#### Backend (Integração com Metadados)
- [ ] Validar que entidades Contact e Company existem no sistema de metadados
  - [ ] Verificar via `EntityService` que Entity.name = "Contact" e "Company" existem
  - [ ] Usar campos definidos em `Field` para validação

- [ ] Armazenar valores de campos customizados
  - [ ] Campos customizados podem ser armazenados em `EntityData` quando necessário
  - [ ] Ou adicionar colunas dinâmicas se fizer sentido (V2+)

- [ ] Validar campos customizados
  - [ ] Usar `fieldValueValidator` existente para validar valores
  - [ ] Validar tipo, required, unique conforme definido em `Field`

- [ ] Incluir campos customizados nas respostas
  - [ ] Buscar valores de campos customizados de `EntityData`
  - [ ] Mesclar com dados da tabela principal

#### Validação
- [ ] Teste: campo customizado é validado corretamente
- [ ] Teste: campo customizado aparece nas respostas GET
- [ ] Teste: campo customizado pode ser atualizado

---

### 18. Documentação

#### Documentação Técnica
- [ ] Documentar endpoints de contatos e empresas
- [ ] Documentar estrutura de dados
- [ ] Documentar validações
- [ ] Documentar integração com auditoria
- [ ] Documentar permissões por campo
- [ ] Documentar suporte a campos customizados

---

## Critérios de Prontidão

Antes de avançar para a **Etapa 6 (Leads/Oportunidades)**, verifique:

- [ ] CRUD completo de contatos e empresas
- [ ] Associações entre pessoas e organizações funcionando
- [ ] Múltiplos emails/telefones por contato
- [ ] Endereços funcionando
- [ ] Tags operacionais
- [ ] Validações básicas funcionando
- [ ] Frontend básico funcionando
- [ ] Testes passando
- [ ] Documentação atualizada

---

## Tecnologias Utilizadas

- **Backend**: Node.js + TypeScript
- **ORM**: Prisma
- **Banco de dados**: PostgreSQL
- **Frontend**: React + TypeScript

---

## Próximos Passos

Após completar esta etapa, você pode avançar para:

**→ [Etapa 6: Leads, Oportunidades e Pipeline](./Etapa-06-Leads-Oportunidades.md)**

---

## Notas Importantes

✅ **Boas práticas**:
- Sempre validar dados antes de salvar
- Normalizar formatos (emails, telefones)
- Garantir que relacionamentos são consistentes
- Tags devem ser reutilizáveis
- **Sempre registrar auditoria** após operações CRUD
- **Sempre filtrar campos por permissão** em respostas GET
- **Sempre validar permissões por campo** em updates
- **Seguir convenção multi-tenant obrigatória** (tenantId, índices)

⚠️ **Atenção**:
- Falhas na auditoria não devem impedir operações principais (try-catch)
- Permissões por campo são obrigatórias para segurança
- Soft delete preserva histórico e permite recuperação

---

## Referências

- **Roadmap Funcional**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`
- **Etapa 4 (Modelo de Dados)**: `Features/meu_projeto/v1/fases_2/Etapa-04-Modelo-de-Dados.md`
- **Decisão de Stack**: `Features/meu_projeto/v1/Decisao-Stack-V1.md`
