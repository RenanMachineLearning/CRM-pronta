# Modelo de dados conceitual — V1

> **Quando usar**: Durante implementação das Fases 5-8, para entender entidades, relacionamentos e estrutura de dados antes de criar o schema físico.  
> **Objetivo**: Fornecer visão consolidada do modelo de dados do CRM V1, incluindo entidades core, relacionamentos e regras de negócio.

## Como usar este documento

- **Fase 5**: Use para definir schema físico e estrutura de tabelas
- **Fases 6-8**: Use como referência ao implementar CRUD de entidades específicas
- **Code reviews**: Use para validar que implementação segue o modelo conceitual
- **Discussões técnicas**: Use para alinhar time sobre estrutura de dados

---

## Princípios do modelo V1

1. **Multi-tenant**: Todas as entidades (exceto `tenants` e `users`) devem ter `tenant_id`
2. **Isolamento lógico**: Dados isolados por tenant via `tenant_id` em todas as queries
3. **Auditoria**: Todas as entidades principais devem registrar `created_at`, `updated_at`, `created_by`, `updated_by`
4. **Soft delete**: Entidades principais usam soft delete (campo `deleted_at`) quando aplicável
5. **Identificadores únicos**: Todas as entidades têm `id` (UUID ou equivalente) como chave primária

---

## Entidades core do V1

### 1. Tenant (Organização/Cliente)

**Descrição**: Representa uma organização/cliente do SaaS. Cada tenant é isolado logicamente.

**Campos principais**:
- `id` (PK, UUID)
- `slug` (único, usado em subdomínio)
- `name` (nome da organização)
- `status` (ativo, suspenso, cancelado)
- `created_at`, `updated_at`

**Relacionamentos**:
- 1:N com `users` (um tenant tem muitos usuários)
- 1:N com todas as entidades de negócio (contatos, leads, oportunidades, etc.)

**Regras**:
- Slug deve ser único globalmente
- Status controla acesso ao sistema

---

### 2. User (Usuário)

**Descrição**: Representa um usuário do sistema, sempre vinculado a um tenant.

**Campos principais**:
- `id` (PK, UUID)
- `tenant_id` (FK → Tenant)
- `email` (único por tenant)
- `name` (nome completo)
- `password_hash` (hash da senha)
- `role` (Admin, Vendedor, Visualizador, etc.)
- `status` (ativo, inativo, bloqueado)
- `created_at`, `updated_at`

**Relacionamentos**:
- N:1 com `tenant` (muitos usuários pertencem a um tenant)
- 1:N com atividades (tarefas, notas criadas pelo usuário)

**Regras**:
- Email único por tenant (não global)
- Senha deve seguir política de complexidade
- Role define permissões via ACL

---

### 3. Contact (Contato/Pessoa)

**Descrição**: Representa uma pessoa física no CRM.

**Campos principais**:
- `id` (PK, UUID)
- `tenant_id` (FK → Tenant)
- `first_name`, `last_name`
- `job_title` (cargo/título profissional)
- `gender` (gênero, opcional)
- `background` (texto livre, opcional)
- `status` (ativo, inativo, etc.)
- `created_at`, `updated_at`, `created_by`, `updated_by`

**Relacionamentos**:
- N:N com `company` (uma pessoa pode estar associada a múltiplas empresas)
- 1:N com `contact_email` (múltiplos emails por contato)
- 1:N com `contact_phone` (múltiplos telefones por contato)
- 1:N com `contact_address` (múltiplos endereços por contato)
- N:M com `tag` (tags para categorização)
- 1:N com `lead` (um contato pode ter múltiplos leads)
- 1:N com `opportunity` (um contato pode ter múltiplas oportunidades)
- 1:N com `task` (tarefas vinculadas)
- 1:N com `note` (notas vinculadas)

**Regras**:
- Pelo menos `first_name` ou `last_name` obrigatório
- Emails e telefones têm tipo (Work, Home, Other)

---

### 4. Company (Empresa/Organização)

**Descrição**: Representa uma organização/empresa no CRM.

**Campos principais**:
- `id` (PK, UUID)
- `tenant_id` (FK → Tenant)
- `name` (nome da empresa)
- `industry` (setor, opcional)
- `website` (URL, opcional)
- `status` (ativo, inativo, etc.)
- `created_at`, `updated_at`, `created_by`, `updated_by`

**Relacionamentos**:
- N:N com `contact` (uma empresa pode ter múltiplos contatos)
- 1:N com `company_address` (múltiplos endereços por empresa)
- N:M com `tag` (tags para categorização)
- 1:N com `lead` (leads vinculados à empresa)
- 1:N com `opportunity` (oportunidades vinculadas à empresa)
- 1:N com `task` (tarefas vinculadas)
- 1:N com `note` (notas vinculadas)

**Regras**:
- Nome obrigatório
- Relacionamento com contatos é N:N (um contato pode estar em múltiplas empresas)

---

### 5. ContactEmail / ContactPhone / ContactAddress

**Descrição**: Múltiplos meios de contato e endereços por contato.

**ContactEmail**:
- `id` (PK, UUID)
- `tenant_id` (FK → Tenant)
- `contact_id` (FK → Contact)
- `email` (endereço de email)
- `type` (Work, Home, Other)
- `is_primary` (boolean)
- `created_at`, `updated_at`

**ContactPhone**:
- `id` (PK, UUID)
- `tenant_id` (FK → Tenant)
- `contact_id` (FK → Contact)
- `phone` (número de telefone)
- `type` (Work, Home, Other, Mobile)
- `is_primary` (boolean)
- `created_at`, `updated_at`

**ContactAddress**:
- `id` (PK, UUID)
- `tenant_id` (FK → Tenant)
- `contact_id` (FK → Contact)
- `street`, `city`, `state`, `zip_code`, `country`
- `type` (Work, Home, Other)
- `is_primary` (boolean)
- `created_at`, `updated_at`

**Regras**:
- Validação de formato (email válido, telefone formatado)
- Pelo menos um email/telefone/endereço pode ser marcado como primário

---

### 6. Lead (Lead)

**Descrição**: Representa um lead (prospecto) no funil de vendas.

**Campos principais**:
- `id` (PK, UUID)
- `tenant_id` (FK → Tenant)
- `first_name`, `last_name` (ou `name` se não houver contato associado)
- `email`, `phone` (dados do lead)
- `source` (origem do lead: website, referência, etc.)
- `status` (novo, qualificado, convertido, perdido)
- `converted_at` (data de conversão, se convertido)
- `created_at`, `updated_at`, `created_by`, `updated_by`

**Relacionamentos**:
- N:1 com `contact` (opcional, após conversão)
- N:1 com `company` (opcional, após conversão)
- 1:1 com `opportunity` (após conversão, se convertido em oportunidade)
- N:M com `tag` (tags para categorização)
- 1:N com `task` (tarefas vinculadas)
- 1:N com `note` (notas vinculadas)

**Regras**:
- Lead pode existir sem contato/empresa associados (antes da conversão)
- Após conversão, lead deve estar vinculado a contato e/ou empresa
- Status "convertido" indica que lead foi processado

---

### 7. Opportunity (Oportunidade/Negócio)

**Descrição**: Representa uma oportunidade de negócio no pipeline.

**Campos principais**:
- `id` (PK, UUID)
- `tenant_id` (FK → Tenant)
- `name` (nome da oportunidade)
- `value` (valor do negócio, numérico)
- `currency` (moeda, se suportado no V1)
- `stage` (estágio do pipeline, FK → PipelineStage)
- `status` (Open, Won, Lost)
- `expected_close_date` (data de fechamento esperada)
- `actual_close_date` (data de fechamento real, se ganho/perdido)
- `lead_id` (FK → Lead, opcional, origem do lead)
- `contact_id` (FK → Contact, opcional)
- `company_id` (FK → Company, opcional)
- `created_at`, `updated_at`, `created_by`, `updated_by`

**Relacionamentos**:
- N:1 com `pipeline_stage` (estágio atual no pipeline)
- N:1 com `lead` (origem, se convertido de lead)
- N:1 com `contact` (contato associado)
- N:1 com `company` (empresa associada)
- N:M com `tag` (tags para categorização)
- 1:N com `task` (tarefas vinculadas)
- 1:N com `note` (notas vinculadas)

**Regras**:
- Valor deve ser positivo
- Data de fechamento esperada deve ser futura (ou passada se ganho/perdido)
- Status "Won" ou "Lost" requer `actual_close_date`

---

### 8. Pipeline / PipelineStage

**Descrição**: Pipeline configurável por tenant com estágios.

**Pipeline** (configuração por tenant):
- `id` (PK, UUID)
- `tenant_id` (FK → Tenant)
- `name` (nome do pipeline)
- `is_default` (boolean)
- `created_at`, `updated_at`

**PipelineStage** (estágios do pipeline):
- `id` (PK, UUID)
- `tenant_id` (FK → Tenant)
- `pipeline_id` (FK → Pipeline)
- `name` (nome do estágio)
- `order` (ordem no pipeline)
- `probability` (probabilidade de ganho, 0-100, opcional)
- `created_at`, `updated_at`

**Relacionamentos**:
- 1:N entre Pipeline e PipelineStage
- N:1 entre Opportunity e PipelineStage

**Regras**:
- Cada tenant pode ter múltiplos pipelines
- Um pipeline padrão por tenant
- Estágios têm ordem definida

---

### 9. Task (Tarefa)

**Descrição**: Representa uma tarefa/atividade no CRM.

**Campos principais**:
- `id` (PK, UUID)
- `tenant_id` (FK → Tenant)
- `title` (título da tarefa)
- `description` (descrição, opcional)
- `type` (tipo configurável: ligação, email, reunião, etc.)
- `status` (pendente, em andamento, concluída, cancelada)
- `due_date` (data de vencimento, opcional)
- `completed_at` (data de conclusão, se concluída)
- `assigned_to` (FK → User, opcional)
- `created_by` (FK → User)
- `entity_type` (tipo de entidade vinculada: Contact, Lead, Opportunity, etc.)
- `entity_id` (ID da entidade vinculada)
- `created_at`, `updated_at`

**Relacionamentos**:
- N:1 com `user` (assigned_to, created_by)
- Polimórfico com entidades (Contact, Lead, Opportunity, Company)

**Regras**:
- Tarefa pode estar vinculada a uma entidade (polimórfico)
- Status configurável por tenant (com defaults)
- Tipo configurável por tenant (com defaults)

---

### 10. Note (Nota)

**Descrição**: Representa uma nota/anotação vinculada a um registro.

**Campos principais**:
- `id` (PK, UUID)
- `tenant_id` (FK → Tenant)
- `content` (conteúdo da nota, texto ou markdown)
- `entity_type` (tipo de entidade vinculada: Contact, Lead, Opportunity, etc.)
- `entity_id` (ID da entidade vinculada)
- `created_by` (FK → User)
- `created_at`, `updated_at`, `updated_by`

**Relacionamentos**:
- N:1 com `user` (created_by, updated_by)
- Polimórfico com entidades (Contact, Lead, Opportunity, Company)

**Regras**:
- Nota sempre vinculada a uma entidade
- Conteúdo em texto simples ou markdown (V1)

---

### 11. Tag (Tag)

**Descrição**: Catálogo de tags por tenant para categorização.

**Campos principais**:
- `id` (PK, UUID)
- `tenant_id` (FK → Tenant)
- `name` (nome da tag, único por tenant)
- `color` (cor da tag, opcional)
- `created_at`, `updated_at`

**Relacionamentos**:
- N:M com `contact` (tags em contatos)
- N:M com `company` (tags em empresas)
- N:M com `lead` (tags em leads)
- N:M com `opportunity` (tags em oportunidades)

**Regras**:
- Nome único por tenant
- Tags podem ser reutilizadas entre entidades
- Catálogo centralizado (não tags livres por registro)

---

### 12. AuditLog / Activity (Auditoria/Atividade)

**Descrição**: Registro de mudanças e atividades para timeline/histórico.

**AuditLog** (mudanças em registros):
- `id` (PK, UUID)
- `tenant_id` (FK → Tenant)
- `entity_type` (tipo de entidade alterada)
- `entity_id` (ID da entidade alterada)
- `action` (created, updated, deleted)
- `field` (campo alterado, se aplicável)
- `old_value`, `new_value` (valores antes/depois, se aplicável)
- `user_id` (FK → User, quem fez a mudança)
- `created_at`

**Activity** (eventos materializados para timeline):
- `id` (PK, UUID)
- `tenant_id` (FK → Tenant)
- `entity_type` (tipo de entidade)
- `entity_id` (ID da entidade)
- `activity_type` (task_created, note_created, field_changed, etc.)
- `description` (descrição legível da atividade)
- `user_id` (FK → User)
- `metadata` (JSON com dados adicionais)
- `created_at`

**Relacionamentos**:
- N:1 com `user` (user_id)
- Polimórfico com entidades (para timeline)

**Regras**:
- AuditLog registra todas as mudanças em entidades principais
- Activity é materializado a partir de AuditLog + eventos (tarefas, notas)
- Timeline consulta Activity ordenado por `created_at`

---

## Relacionamentos principais

### Diagrama textual de relacionamentos

```
Tenant (1) ──< (N) User
Tenant (1) ──< (N) Contact
Tenant (1) ──< (N) Company
Tenant (1) ──< (N) Lead
Tenant (1) ──< (N) Opportunity
Tenant (1) ──< (N) Pipeline
Tenant (1) ──< (N) Task
Tenant (1) ──< (N) Note
Tenant (1) ──< (N) Tag

Contact (N) ──< (N) Company (via tabela de associação)
Contact (1) ──< (N) ContactEmail
Contact (1) ──< (N) ContactPhone
Contact (1) ──< (N) ContactAddress
Contact (1) ──< (N) Lead
Contact (1) ──< (N) Opportunity

Company (1) ──< (N) Lead
Company (1) ──< (N) Opportunity

Lead (1) ──< (1) Opportunity (após conversão)

Pipeline (1) ──< (N) PipelineStage
PipelineStage (1) ──< (N) Opportunity

Task ──> (polimórfico) Contact, Lead, Opportunity, Company
Note ──> (polimórfico) Contact, Lead, Opportunity, Company

Tag (N) ──< (N) Contact (via tabela de associação)
Tag (N) ──< (N) Company (via tabela de associação)
Tag (N) ──< (N) Lead (via tabela de associação)
Tag (N) ──< (N) Opportunity (via tabela de associação)

Activity ──> (polimórfico) Contact, Lead, Opportunity, Company
AuditLog ──> (polimórfico) Contact, Lead, Opportunity, Company
```

---

## Campos customizados (EAV ou JSON)

**Estratégia**: Campos customizados armazenados em estrutura semiestruturada (EAV ou JSON) com governança.

**Tabela CustomField** (definição de campos customizados):
- `id` (PK, UUID)
- `tenant_id` (FK → Tenant)
- `entity_type` (Contact, Company, Lead, Opportunity)
- `name` (nome do campo)
- `type` (text, number, date, boolean, select, lookup)
- `is_required` (boolean)
- `default_value` (opcional)
- `options` (JSON, para campos select)
- `created_at`, `updated_at`

**Tabela CustomFieldValue** (valores de campos customizados):
- `id` (PK, UUID)
- `tenant_id` (FK → Tenant)
- `custom_field_id` (FK → CustomField)
- `entity_type` (tipo de entidade)
- `entity_id` (ID da entidade)
- `value` (valor, texto ou JSON)
- `created_at`, `updated_at`

**Regras**:
- Campos customizados definidos por tenant
- Validação de tipo e obrigatoriedade
- Índices seletivos em campos customizados frequentemente consultados

---

## Índices críticos

### Por tenant (obrigatórios)
- Todas as tabelas: `(tenant_id)` ou `(tenant_id, id)`
- Tabelas com relacionamentos: `(tenant_id, entity_id)` onde aplicável

### Por entidade (performance)
- `Contact`: `(tenant_id, name)`, `(tenant_id, email)` (via ContactEmail)
- `Company`: `(tenant_id, name)`
- `Lead`: `(tenant_id, status)`, `(tenant_id, source)`
- `Opportunity`: `(tenant_id, stage_id)`, `(tenant_id, status)`, `(tenant_id, expected_close_date)`
- `Task`: `(tenant_id, entity_type, entity_id)`, `(tenant_id, assigned_to)`, `(tenant_id, due_date)`
- `Note`: `(tenant_id, entity_type, entity_id)`
- `Activity`: `(tenant_id, entity_type, entity_id, created_at)`

---

## Regras de negócio importantes

### Multi-tenant
- **Todas as queries** devem filtrar por `tenant_id`
- **Isolamento**: Dados de um tenant nunca acessíveis por outro tenant
- **Validação**: Middleware/banco deve garantir isolamento

### Unicidade
- Email de usuário: único por tenant
- Slug de tenant: único globalmente
- Nome de tag: único por tenant
- Campos com validação de unicidade: escopo por tenant

### Conversão de Lead
- Lead pode ser convertido em Contato + Empresa + Oportunidade
- Lead mantém status "convertido" após conversão
- Oportunidade criada mantém referência ao Lead original

### Timeline/Histórico
- Timeline agrega: tarefas, notas, mudanças auditadas
- Ordenação por `created_at` descendente
- Paginação obrigatória para performance

---

## Referências

- **Decisões arquiteturais**: `Decisoes-Arquiteturais-Consolidadas.md`
- **Fase 5**: `fases/Fase-05-Modelo-de-dados-e-entidades-personalizaveis.md`
- **Fase 6**: `fases/Fase-06-Contatos-empresas-e-relacionamentos.md`
- **Fase 7**: `fases/Fase-07-Leads-oportunidades-e-pipeline.md`
- **Fase 8**: `fases/Fase-08-Tarefas-notas-e-historico-de-atividades.md`

