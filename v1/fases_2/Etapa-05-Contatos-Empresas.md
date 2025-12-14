# Etapa 5 — Contatos e Empresas

> **Dependências**: Etapa 4 (Modelo de Dados) ✅  
> **Stack**: Node.js + TypeScript, PostgreSQL, Prisma, React + TypeScript  
> **Referência**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`

## Objetivo da Etapa

Implementar CRUD completo de contatos e empresas, com associações, múltiplos meios de contato e metadados. Contatos e empresas são a base do CRM. Leads e oportunidades dependem deles.

---

## Checklist de Implementação

### 1. Modelo de Dados — Tabelas de Contatos e Empresas

#### Backend (Prisma Schema)
- [ ] Criar tabela `Contact` (se não usar EntityData genérica)
  - [ ] Campo `id` (UUID)
  - [ ] Campo `tenantId` (foreign key)
  - [ ] Campos básicos: `firstName`, `lastName`, `title` (cargo), `status`
  - [ ] Campo `companyId` (foreign key para `Company`, opcional)
  - [ ] Campos `created_at` e `updated_at`
  - [ ] Índice em `(tenantId, companyId)`

- [ ] Criar tabela `Company` (se não usar EntityData genérica)
  - [ ] Campo `id` (UUID)
  - [ ] Campo `tenantId` (foreign key)
  - [ ] Campos básicos: `name`, `website`, `industry`, `size`
  - [ ] Campos `created_at` e `updated_at`
  - [ ] Índice em `tenantId`

- [ ] Criar tabela `ContactEmail`
  - [ ] Campo `id` (UUID)
  - [ ] Campo `contactId` (foreign key)
  - [ ] Campo `email` (string)
  - [ ] Campo `type` (Work, Home, Other)
  - [ ] Campo `isPrimary` (boolean)
  - [ ] Campo `tenantId` (foreign key)
  - [ ] Índice em `(tenantId, contactId)`

- [ ] Criar tabela `ContactPhone`
  - [ ] Campo `id` (UUID)
  - [ ] Campo `contactId` (foreign key)
  - [ ] Campo `phone` (string)
  - [ ] Campo `type` (Work, Home, Mobile, Other)
  - [ ] Campo `isPrimary` (boolean)
  - [ ] Campo `tenantId` (foreign key)
  - [ ] Índice em `(tenantId, contactId)`

- [ ] Criar tabela `Address`
  - [ ] Campo `id` (UUID)
  - [ ] Campo `contactId` (foreign key, opcional)
  - [ ] Campo `companyId` (foreign key, opcional)
  - [ ] Campos: `street`, `city`, `state`, `zipCode`, `country`
  - [ ] Campo `type` (Billing, Shipping, Other)
  - [ ] Campo `tenantId` (foreign key)
  - [ ] Índice em `(tenantId, contactId)` e `(tenantId, companyId)`

- [ ] Criar tabela `ContactTag` (relação N:N)
  - [ ] Campo `contactId` (foreign key)
  - [ ] Campo `tagId` (foreign key para `Tag`)
  - [ ] Índice único composto: `(contactId, tagId)`

- [ ] Criar tabela `Tag`
  - [ ] Campo `id` (UUID)
  - [ ] Campo `name` (string)
  - [ ] Campo `color` (string, hex color)
  - [ ] Campo `tenantId` (foreign key)
  - [ ] Índice único composto: `(tenantId, name)`

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

- [ ] Criar rota `POST /api/contacts`
  - [ ] Requer autenticação e permissão "Contact.create"
  - [ ] Receber: `firstName`, `lastName`, `title`, `status`, `companyId`, `emails[]`, `phones[]`, `addresses[]`, `tagIds[]`
  - [ ] Validar dados obrigatórios
  - [ ] Validar emails (formato)
  - [ ] Validar telefones (formato básico)
  - [ ] Criar contato e relacionamentos
  - [ ] Retornar contato criado

- [ ] Criar rota `PUT /api/contacts/:id`
  - [ ] Requer autenticação e permissão "Contact.update"
  - [ ] Receber mesmos campos do POST
  - [ ] Validar que contato pertence ao tenant atual
  - [ ] Atualizar contato e relacionamentos
  - [ ] Retornar contato atualizado

- [ ] Criar rota `DELETE /api/contacts/:id`
  - [ ] Requer autenticação e permissão "Contact.delete"
  - [ ] Validar que contato pertence ao tenant atual
  - [ ] Soft delete ou hard delete
  - [ ] Se hard delete: deletar emails, telefones, endereços, tags associados
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
  - [ ] Listar empresas do tenant atual
  - [ ] Paginação (limit, offset)
  - [ ] Filtros: `industry`, `size`
  - [ ] Ordenação: `name`, `created_at`
  - [ ] Incluir endereços, contatos associados

- [ ] Criar rota `GET /api/companies/:id`
  - [ ] Requer autenticação e permissão "Company.read"
  - [ ] Retornar empresa específica
  - [ ] Incluir endereços, contatos associados
  - [ ] Validar que empresa pertence ao tenant atual

- [ ] Criar rota `POST /api/companies`
  - [ ] Requer autenticação e permissão "Company.create"
  - [ ] Receber: `name`, `website`, `industry`, `size`, `addresses[]`
  - [ ] Validar dados obrigatórios
  - [ ] Validar website (formato URL)
  - [ ] Criar empresa e relacionamentos
  - [ ] Retornar empresa criada

- [ ] Criar rota `PUT /api/companies/:id`
  - [ ] Requer autenticação e permissão "Company.update"
  - [ ] Receber mesmos campos do POST
  - [ ] Validar que empresa pertence ao tenant atual
  - [ ] Atualizar empresa e relacionamentos
  - [ ] Retornar empresa atualizada

- [ ] Criar rota `DELETE /api/companies/:id`
  - [ ] Requer autenticação e permissão "Company.delete"
  - [ ] Validar que empresa pertence ao tenant atual
  - [ ] Validar que não há contatos associados (ou permitir desassociar)
  - [ ] Soft delete ou hard delete
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
- [ ] Adicionar campos de metadados
  - [ ] `title` (cargo/título profissional)
  - [ ] `gender` (opcional)
  - [ ] `birthDate` (opcional)
  - [ ] `status` (ativo, inativo, etc.)
  - [ ] `notes` (campo de texto livre)

- [ ] Validação de metadados
  - [ ] Validar formato de data (se birthDate)
  - [ ] Validar valores de status (lista permitida)

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
  - [ ] Prisma gera UUID automaticamente
  - [ ] Validar que UUID é único globalmente

- [ ] Criar campo `externalId` (opcional)
  - [ ] Para integrações externas
  - [ ] Único por tenant

#### Validação
- [ ] Teste: UUID é gerado automaticamente
- [ ] Teste: externalId é único por tenant

---

### 10. Validação de Dados

#### Backend (Validadores)
- [ ] Validar emails
  - [ ] Formato de email válido
  - [ ] Email único por contato (ou permitir duplicatas?)

- [ ] Validar telefones
  - [ ] Formato básico (números, parênteses, hífens)
  - [ ] Normalizar formato (opcional)

- [ ] Validar websites
  - [ ] Formato de URL válido
  - [ ] Adicionar http:// se não tiver protocolo

- [ ] Validar campos obrigatórios
  - [ ] Contato: pelo menos firstName ou lastName
  - [ ] Empresa: name obrigatório

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

### 15. Documentação

#### Documentação Técnica
- [ ] Documentar endpoints de contatos e empresas
- [ ] Documentar estrutura de dados
- [ ] Documentar validações

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

---

## Referências

- **Roadmap Funcional**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`
- **Etapa 4 (Modelo de Dados)**: `Features/meu_projeto/v1/fases_2/Etapa-04-Modelo-de-Dados.md`
- **Decisão de Stack**: `Features/meu_projeto/v1/Decisao-Stack-V1.md`
