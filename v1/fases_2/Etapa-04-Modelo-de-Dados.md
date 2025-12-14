# Etapa 4 — Objetos/Entidades e Campos Personalizáveis

> **Dependências**: Etapa 1 (Multi-tenant) ✅, Etapa 3 (ACL) ✅  
> **Stack**: Node.js + TypeScript, PostgreSQL, Prisma  
> **Referência**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`

## Objetivo da Etapa

Implementar sistema de objetos/entidades e campos personalizáveis que suporta evolução do schema e relacionamentos entre entidades. Todas as entidades do CRM (Contatos, Empresas, Leads, etc.) dependem deste sistema de metadados.

---

## Checklist de Implementação

### 1. Modelo de Dados — Metadados de Entidades

#### Backend (Prisma Schema)
- [ ] Criar tabela `Entity` (definição de entidades)
  - [ ] Campo `id` (UUID)
  - [ ] Campo `name` (ex: "Contact", "Company", "Lead")
  - [ ] Campo `label` (ex: "Contato", "Empresa", "Lead")
  - [ ] Campo `tenantId` (foreign key)
  - [ ] Campo `isSystem` (boolean - entidades do sistema vs customizadas)
  - [ ] Campos `created_at` e `updated_at`
  - [ ] Índice único composto: `(tenantId, name)`

- [ ] Criar tabela `Field` (definição de campos)
  - [ ] Campo `id` (UUID)
  - [ ] Campo `entityId` (foreign key para `Entity`)
  - [ ] Campo `name` (ex: "firstName", "email")
  - [ ] Campo `label` (ex: "Nome", "Email")
  - [ ] Campo `type` (ex: "text", "number", "date", "boolean", "lookup", "select")
  - [ ] Campo `required` (boolean)
  - [ ] Campo `unique` (boolean)
  - [ ] Campo `defaultValue` (JSON - valor padrão)
  - [ ] Campo `options` (JSON - para campos select/lookup)
  - [ ] Campo `tenantId` (foreign key)
  - [ ] Campo `order` (número - ordem de exibição)
  - [ ] Campos `created_at` e `updated_at`
  - [ ] Índice único composto: `(entityId, name)`

- [ ] Criar tabela `Relationship` (relacionamentos entre entidades)
  - [ ] Campo `id` (UUID)
  - [ ] Campo `sourceEntityId` (foreign key para `Entity`)
  - [ ] Campo `targetEntityId` (foreign key para `Entity`)
  - [ ] Campo `type` (ex: "oneToMany", "manyToMany")
  - [ ] Campo `name` (ex: "contacts", "companies")
  - [ ] Campo `tenantId` (foreign key)
  - [ ] Campos `created_at` e `updated_at`

- [ ] Criar migração Prisma
  - [ ] Executar `prisma migrate dev --name add_entity_metadata`
  - [ ] Validar que todas as tabelas foram criadas

#### Validação
- [ ] Testar criação de entidade via Prisma
- [ ] Testar criação de campos para entidade
- [ ] Testar criação de relacionamento entre entidades

---

### 2. Entidades Core do Sistema

#### Backend (Seed Script)
- [ ] Criar entidades core no seed
  - [ ] **Contact** (Contato)
  - [ ] **Company** (Empresa)
  - [ ] **Lead** (Lead)
  - [ ] **Opportunity** (Oportunidade)
  - [ ] **Task** (Tarefa)
  - [ ] **Note** (Nota)

- [ ] Criar campos padrão para cada entidade
  - [ ] **Contact**: firstName, lastName, email, phone, etc.
  - [ ] **Company**: name, website, industry, etc.
  - [ ] **Lead**: source, status, converted, etc.
  - [ ] **Opportunity**: name, value, stage, closeDate, etc.
  - [ ] **Task**: title, description, dueDate, status, etc.
  - [ ] **Note**: content, type, etc.

- [ ] Marcar entidades como `isSystem: true`
  - [ ] Entidades core não podem ser deletadas
  - [ ] Campos core têm validações específicas

#### Validação
- [ ] Executar seed e verificar que entidades foram criadas
- [ ] Verificar que campos padrão foram criados
- [ ] Verificar que entidades estão marcadas como sistema

---

### 3. CRUD de Entidades (Metadados)

#### Backend (Rotas)
- [ ] Criar rota `GET /api/entities`
  - [ ] Requer autenticação e permissão "Entity.list"
  - [ ] Listar entidades do tenant atual
  - [ ] Incluir contagem de campos

- [ ] Criar rota `GET /api/entities/:id`
  - [ ] Requer autenticação e permissão "Entity.read"
  - [ ] Retornar entidade com todos os campos
  - [ ] Incluir relacionamentos

- [ ] Criar rota `POST /api/entities`
  - [ ] Requer autenticação e permissão "Entity.create"
  - [ ] Receber: `name`, `label`
  - [ ] Validar nome único no tenant
  - [ ] Criar entidade customizada
  - [ ] Retornar entidade criada

- [ ] Criar rota `PUT /api/entities/:id`
  - [ ] Requer autenticação e permissão "Entity.update"
  - [ ] Receber: `label` (nome não pode ser alterado)
  - [ ] Validar que entidade não é do sistema (se tentar alterar)
  - [ ] Atualizar entidade

- [ ] Criar rota `DELETE /api/entities/:id`
  - [ ] Requer autenticação e permissão "Entity.delete"
  - [ ] Validar que entidade não é do sistema
  - [ ] Validar que não há registros usando a entidade
  - [ ] Deletar entidade e campos associados

#### Validação
- [ ] Teste E2E: criar entidade customizada funciona
- [ ] Teste E2E: listar entidades retorna sistema + customizadas
- [ ] Teste E2E: deletar entidade do sistema falha
- [ ] Teste E2E: deletar entidade com registros falha

---

### 4. CRUD de Campos

#### Backend (Rotas)
- [ ] Criar rota `GET /api/entities/:entityId/fields`
  - [ ] Requer autenticação e permissão "Field.list"
  - [ ] Listar campos de uma entidade
  - [ ] Ordenado por `order`

- [ ] Criar rota `GET /api/fields/:id`
  - [ ] Requer autenticação e permissão "Field.read"
  - [ ] Retornar campo específico

- [ ] Criar rota `POST /api/entities/:entityId/fields`
  - [ ] Requer autenticação e permissão "Field.create"
  - [ ] Receber: `name`, `label`, `type`, `required`, `unique`, `defaultValue`, `options`
  - [ ] Validar nome único na entidade
  - [ ] Validar tipo de campo suportado
  - [ ] Criar campo
  - [ ] Retornar campo criado

- [ ] Criar rota `PUT /api/fields/:id`
  - [ ] Requer autenticação e permissão "Field.update"
  - [ ] Receber: `label`, `required`, `unique`, `defaultValue`, `options`, `order`
  - [ ] Validar que tipo não pode ser alterado (se já houver dados)
  - [ ] Atualizar campo

- [ ] Criar rota `DELETE /api/fields/:id`
  - [ ] Requer autenticação e permissão "Field.delete"
  - [ ] Validar que campo não é do sistema
  - [ ] Soft delete (marcar como deletado) ou hard delete
  - [ ] Se hard delete: migrar dados existentes (opcional na V1)

#### Validação
- [ ] Teste E2E: criar campo customizado funciona
- [ ] Teste E2E: atualizar campo funciona
- [ ] Teste E2E: deletar campo do sistema falha
- [ ] Teste E2E: alterar tipo de campo com dados falha

---

### 5. Tipos de Campo Suportados

#### Backend (Validação e Processamento)
- [ ] Implementar validação por tipo
  - [ ] **text**: string, tamanho máximo
  - [ ] **number**: número, min/max
  - [ ] **date**: data, formato
  - [ ] **boolean**: true/false
  - [ ] **select**: valor de lista de opções
  - [ ] **lookup**: referência a outra entidade

- [ ] Criar validadores por tipo
  - [ ] Função `validateFieldValue(field, value)`
  - [ ] Retornar erro se valor inválido

- [ ] Processar valores por tipo
  - [ ] Converter string para número (se tipo number)
  - [ ] Converter string para data (se tipo date)
  - [ ] Validar opções (se tipo select)

#### Validação
- [ ] Teste: validação de cada tipo funciona
- [ ] Teste: valores inválidos são rejeitados
- [ ] Teste: valores válidos são aceitos

---

### 6. Relacionamentos entre Entidades

#### Backend (Rotas)
- [ ] Criar rota `GET /api/entities/:id/relationships`
  - [ ] Requer autenticação e permissão "Relationship.list"
  - [ ] Listar relacionamentos de uma entidade

- [ ] Criar rota `POST /api/relationships`
  - [ ] Requer autenticação e permissão "Relationship.create"
  - [ ] Receber: `sourceEntityId`, `targetEntityId`, `type`, `name`
  - [ ] Validar que entidades existem
  - [ ] Validar tipo de relacionamento (oneToMany, manyToMany)
  - [ ] Criar relacionamento
  - [ ] Criar tabela de junção se manyToMany (via migração)

- [ ] Criar rota `DELETE /api/relationships/:id`
  - [ ] Requer autenticação e permissão "Relationship.delete"
  - [ ] Deletar relacionamento
  - [ ] Remover tabela de junção se manyToMany

#### Validação
- [ ] Teste E2E: criar relacionamento oneToMany funciona
- [ ] Teste E2E: criar relacionamento manyToMany funciona
- [ ] Teste E2E: deletar relacionamento funciona

---

### 7. Lookup de Entidades

#### Backend (Rotas e Lógica)
- [ ] Criar rota `GET /api/entities/:entityId/lookup`
  - [ ] Requer autenticação
  - [ ] Buscar registros de uma entidade para lookup
  - [ ] Receber query string para busca
  - [ ] Retornar lista de registros (id, label)
  - [ ] Limitar resultados (ex: 20)

- [ ] Criar helper `getEntityLabel(entityId, recordId)`
  - [ ] Buscar registro e retornar label (nome, título, etc.)
  - [ ] Usar em campos lookup

#### Validação
- [ ] Teste: lookup retorna registros corretos
- [ ] Teste: busca em lookup funciona
- [ ] Teste: limite de resultados funciona

---

### 8. Validação de Atributos Únicos

#### Backend (Validação)
- [ ] Implementar validação de unicidade
  - [ ] Verificar se campo marcado como `unique` já existe
  - [ ] Validar por tenant (unicidade dentro do tenant)
  - [ ] Aplicar em criação e atualização

- [ ] Criar helper `validateUniqueField(entityId, fieldId, value, recordId?)`
  - [ ] Buscar se valor já existe
  - [ ] Ignorar registro atual (se atualização)
  - [ ] Retornar erro se duplicado

#### Validação
- [ ] Teste: criar registro com campo único duplicado falha
- [ ] Teste: atualizar registro mantendo valor único funciona
- [ ] Teste: unicidade é por tenant

---

### 9. Opções de Atributos (Select)

#### Backend (Rotas e Lógica)
- [ ] Criar rota `GET /api/fields/:id/options`
  - [ ] Requer autenticação
  - [ ] Retornar opções de campo select

- [ ] Criar rota `PUT /api/fields/:id/options`
  - [ ] Requer autenticação e permissão "Field.update"
  - [ ] Receber array de opções: `[{ value, label, color? }]`
  - [ ] Atualizar opções do campo
  - [ ] Validar que valores de registros existentes ainda são válidos

#### Validação
- [ ] Teste: obter opções funciona
- [ ] Teste: atualizar opções funciona
- [ ] Teste: validar valores existentes funciona

---

### 10. Evolução do Schema (Migrações)

#### Backend (Sistema de Migrações)
- [ ] Integrar Prisma com sistema de metadados
  - [ ] Campos customizados podem ser adicionados sem migração manual
  - [ ] Usar EAV (Entity-Attribute-Value) ou JSON para campos customizados

- [ ] Decisão de armazenamento
  - [ ] **Opção A**: Tabela genérica `EntityData` com JSON
  - [ ] **Opção B**: Colunas dinâmicas (mais complexo, melhor performance)
  - [ ] **Recomendação V1**: Opção A (JSON) para simplicidade

- [ ] Criar tabela `EntityData` (se usar EAV/JSON)
  - [ ] Campo `id` (UUID)
  - [ ] Campo `entityId` (foreign key para `Entity`)
  - [ ] Campo `tenantId` (foreign key)
  - [ ] Campo `data` (JSON - todos os campos do registro)
  - [ ] Campos `created_at` e `updated_at`
  - [ ] Índice em `(tenantId, entityId)`

#### Validação
- [ ] Teste: criar registro de entidade funciona
- [ ] Teste: adicionar campo customizado funciona
- [ ] Teste: registros existentes mantêm dados

---

### 11. Índices para Otimização

#### Backend (Prisma Schema)
- [ ] Criar índices estratégicos
  - [ ] Índice em `EntityData(tenantId, entityId)` para listagem
  - [ ] Índice em campos únicos
  - [ ] Índice em campos de busca frequente (ex: email, name)

- [ ] Criar migração de índices
  - [ ] Executar `prisma migrate dev --name add_indexes`

#### Validação
- [ ] Teste: queries com índices são mais rápidas
- [ ] Teste: busca por campos indexados funciona

---

### 12. Testes do Modelo de Dados

#### Backend (Testes)
- [ ] Testes unitários
  - [ ] Criação de entidades e campos
  - [ ] Validação de tipos de campo
  - [ ] Validação de unicidade
  - [ ] Lookup de entidades

- [ ] Testes de integração
  - [ ] CRUD completo de entidades customizadas
  - [ ] Relacionamentos entre entidades
  - [ ] Campos customizados funcionam

#### Validação
- [ ] Todos os testes passando
- [ ] Cobertura de testes > 70% para lógica de metadados

---

### 13. Documentação

#### Documentação Técnica
- [ ] Documentar sistema de entidades e campos
  - [ ] Como criar entidade customizada
  - [ ] Como adicionar campos
  - [ ] Tipos de campo suportados

- [ ] Documentar relacionamentos
  - [ ] Como criar relacionamento
  - [ ] Tipos de relacionamento

- [ ] Documentar API de metadados
  - [ ] Endpoints de entidades
  - [ ] Endpoints de campos
  - [ ] Endpoints de relacionamentos

---

## Critérios de Prontidão

Antes de avançar para a **Etapa 5 (Contatos/Empresas)**, verifique:

- [ ] Entidades core definidas (Contact, Company, Lead, Opportunity, Task, Note)
- [ ] Campos personalizáveis operacionais
- [ ] Relacionamentos entre entidades funcionando
- [ ] Lookup de entidades funcionando
- [ ] Validação de atributos únicos funcionando
- [ ] Sistema de migrações suportando evolução do schema
- [ ] Testes do modelo de dados passando
- [ ] Documentação atualizada

---

## Tecnologias Utilizadas

- **Backend**: Node.js + TypeScript
- **ORM**: Prisma
- **Banco de dados**: PostgreSQL
- **Armazenamento customizado**: JSON (EAV) ou colunas dinâmicas

---

## Próximos Passos

Após completar esta etapa, você pode avançar para:

**→ [Etapa 5: Contatos e Empresas](./Etapa-05-Contatos-Empresas.md)**

---

## Notas Importantes

⚠️ **Decisão de Arquitetura**:
- V1: Usar JSON (EAV) para simplicidade
- V2+: Considerar colunas dinâmicas para melhor performance

✅ **Boas práticas**:
- Entidades do sistema não podem ser deletadas
- Campos do sistema têm validações específicas
- Sempre validar tipo de campo antes de salvar
- Índices são essenciais para performance

---

## Referências

- **Roadmap Funcional**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`
- **Etapa 1 (Multi-tenant)**: `Features/meu_projeto/v1/fases_2/Etapa-01-Multi-tenant.md`
- **Etapa 3 (ACL)**: `Features/meu_projeto/v1/fases_2/Etapa-03-ACL.md`
- **Decisão de Stack**: `Features/meu_projeto/v1/Decisao-Stack-V1.md`
