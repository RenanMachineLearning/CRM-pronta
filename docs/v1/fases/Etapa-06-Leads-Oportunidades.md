# Etapa 6 — Leads, Oportunidades e Pipeline

> **Dependências**: Etapa 5 (Contatos e Empresas) ✅  
> **Stack**: Node.js + TypeScript, PostgreSQL, Prisma, React + TypeScript  
> **Referência**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`

## Objetivo da Etapa

Implementar gestão de leads, conversão em oportunidades e pipeline de vendas configurável. Pipeline de vendas é o coração do CRM e depende de contatos/empresas para associações.

---

## Checklist de Implementação

### 1. Modelo de Dados — Tabelas de Leads e Oportunidades

#### Backend (Prisma Schema)
- [x] Criar tabela `Lead`
  - [x] Campo `id` (UUID)
  - [x] Campo `tenantId` (foreign key)
  - [x] Campos: `firstName`, `lastName`, `email`, `phone`, `company`
  - [x] Campo `source` (origem do lead)
  - [x] Campo `status` (novo, qualificado, convertido, perdido)
  - [x] Campo `converted` (boolean - se foi convertido)
  - [x] Campo `convertedAt` (timestamp - quando foi convertido)
  - [x] Campo `convertedToContactId` (foreign key, opcional)
  - [x] Campo `convertedToOpportunityId` (foreign key, opcional)
  - [x] Campos `created_at` e `updated_at`
  - [x] Índice em `(tenantId, status)`

- [x] Criar tabela `Opportunity` (Oportunidade/Negócio)
  - [x] Campo `id` (UUID)
  - [x] Campo `tenantId` (foreign key)
  - [x] Campo `name` (nome do negócio)
  - [x] Campo `value` (valor do negócio - decimal)
  - [x] Campo `currency` (moeda - ex: "BRL", "USD")
  - [x] Campo `stage` (estágio do pipeline)
  - [x] Campo `status` (aberto, ganho, perdido, arquivado)
  - [x] Campo `closeDate` (data de fechamento esperada)
  - [x] Campo `probability` (probabilidade de fechamento - 0-100%)
  - [x] Campo `contactId` (foreign key para Contact)
  - [x] Campo `companyId` (foreign key para Company)
  - [x] Campo `leadId` (foreign key para Lead, se convertido de lead)
  - [x] Campos `created_at` e `updated_at`
  - [x] Índice em `(tenantId, stage, status)`

- [x] Criar tabela `Pipeline` (Pipeline configurável)
  - [x] Campo `id` (UUID)
  - [x] Campo `tenantId` (foreign key)
  - [x] Campo `name` (ex: "Pipeline de Vendas")
  - [x] Campo `isDefault` (boolean)
  - [x] Campos `created_at` e `updated_at`

- [x] Criar tabela `PipelineStage` (Estágios do pipeline)
  - [x] Campo `id` (UUID)
  - [x] Campo `pipelineId` (foreign key)
  - [x] Campo `name` (ex: "Qualificação", "Proposta", "Negociação")
  - [x] Campo `order` (ordem no pipeline)
  - [x] Campo `probability` (probabilidade padrão do estágio)
  - [x] Campo `color` (cor para visualização)
  - [x] Campos `created_at` e `updated_at`
  - [x] Índice em `(pipelineId, order)`

- [x] Criar migração Prisma
  - [x] Executar `prisma migrate dev --name add_leads_opportunities`
  - [x] Validar que todas as tabelas foram criadas

#### Validação
- [x] Testar criação de lead via Prisma
- [x] Testar criação de oportunidade via Prisma
- [x] Testar criação de pipeline e estágios

---

### 2. Seed Data — Pipeline Padrão

#### Backend (Seed Script)
- [x] Criar pipeline padrão no seed
  - [x] Nome: "Pipeline de Vendas"
  - [x] Marcar como `isDefault: true`

- [x] Criar estágios padrão
  - [x] "Qualificação" (order: 1, probability: 10%)
  - [x] "Proposta" (order: 2, probability: 30%)
  - [x] "Negociação" (order: 3, probability: 60%)
  - [x] "Fechamento" (order: 4, probability: 90%)

#### Validação
- [x] Executar seed e verificar que pipeline foi criado
- [x] Verificar que estágios foram criados na ordem correta

---

### 3. CRUD de Leads

#### Backend (Rotas)
- [x] Criar rota `GET /api/leads`
  - [x] Requer autenticação e permissão "Lead.list"
  - [x] Listar leads do tenant atual
  - [x] Paginação (limit, offset)
  - [x] Filtros: `status`, `source`, `converted`
  - [x] Ordenação: `created_at`, `firstName`, `lastName`
  - [x] Incluir informações de conversão

- [x] Criar rota `GET /api/leads/:id`
  - [x] Requer autenticação e permissão "Lead.read"
  - [x] Retornar lead específico
  - [x] Validar que lead pertence ao tenant atual

- [x] Criar rota `POST /api/leads`
  - [x] Requer autenticação e permissão "Lead.create"
  - [x] Receber: `firstName`, `lastName`, `email`, `phone`, `company`, `source`, `status`
  - [x] Validar dados obrigatórios
  - [x] Validar email (formato)
  - [x] Criar lead
  - [x] Retornar lead criado

- [x] Criar rota `PUT /api/leads/:id`
  - [x] Requer autenticação e permissão "Lead.update"
  - [x] Receber mesmos campos do POST
  - [x] Validar que lead pertence ao tenant atual
  - [x] Atualizar lead
  - [x] Retornar lead atualizado

- [x] Criar rota `DELETE /api/leads/:id`
  - [x] Requer autenticação e permissão "Lead.delete"
  - [x] Validar que lead pertence ao tenant atual
  - [x] Soft delete ou hard delete
  - [x] Retornar sucesso

#### Validação
- [x] Teste E2E: criar lead funciona
- [x] Teste E2E: listar leads retorna apenas do tenant atual
- [x] Teste E2E: atualizar lead funciona
- [x] Teste E2E: deletar lead funciona

---

### 4. CRUD de Oportunidades

#### Backend (Rotas)
- [x] Criar rota `GET /api/opportunities`
  - [x] Requer autenticação e permissão "Opportunity.list"
  - [x] Listar oportunidades do tenant atual
  - [x] Paginação (limit, offset)
  - [x] Filtros: `stage`, `status`, `contactId`, `companyId`
  - [x] Ordenação: `value`, `closeDate`, `created_at`
  - [x] Incluir contato, empresa, lead

- [x] Criar rota `GET /api/opportunities/:id`
  - [x] Requer autenticação e permissão "Opportunity.read"
  - [x] Retornar oportunidade específica
  - [x] Incluir contato, empresa, lead, histórico
  - [x] Validar que oportunidade pertence ao tenant atual

- [x] Criar rota `POST /api/opportunities`
  - [x] Requer autenticação e permissão "Opportunity.create"
  - [x] Receber: `name`, `value`, `currency`, `stage`, `status`, `closeDate`, `probability`, `contactId`, `companyId`, `leadId`
  - [x] Validar dados obrigatórios (name, value, stage)
  - [x] Validar valor positivo
  - [x] Validar data de fechamento (futura ou presente)
  - [x] Validar probabilidade (0-100)
  - [x] Criar oportunidade
  - [x] Retornar oportunidade criada

- [x] Criar rota `PUT /api/opportunities/:id`
  - [x] Requer autenticação e permissão "Opportunity.update"
  - [x] Receber mesmos campos do POST
  - [x] Validar que oportunidade pertence ao tenant atual
  - [x] Atualizar oportunidade
  - [x] Retornar oportunidade atualizada

- [x] Criar rota `DELETE /api/opportunities/:id`
  - [x] Requer autenticação e permissão "Opportunity.delete"
  - [x] Validar que oportunidade pertence ao tenant atual
  - [x] Soft delete ou hard delete
  - [x] Retornar sucesso

#### Validação
- [x] Teste E2E: criar oportunidade funciona
- [x] Teste E2E: listar oportunidades retorna apenas do tenant atual
- [x] Teste E2E: atualizar oportunidade funciona
- [x] Teste E2E: deletar oportunidade funciona

---

### 5. Pipeline Configurável

#### Backend (Rotas)
- [x] Criar rota `GET /api/pipelines`
  - [x] Requer autenticação
  - [x] Listar pipelines do tenant atual
  - [x] Incluir estágios

- [x] Criar rota `GET /api/pipelines/:id`
  - [x] Requer autenticação
  - [x] Retornar pipeline com estágios ordenados

- [x] Criar rota `POST /api/pipelines`
  - [x] Requer autenticação e permissão "Pipeline.create"
  - [x] Receber: `name`, `stages[]` (array de estágios)
  - [x] Criar pipeline e estágios
  - [x] Retornar pipeline criado

- [x] Criar rota `PUT /api/pipelines/:id`
  - [x] Requer autenticação e permissão "Pipeline.update"
  - [x] Receber: `name`, `stages[]`
  - [x] Atualizar pipeline e estágios
  - [x] Validar que estágios em uso não podem ser deletados

- [x] Criar rota `DELETE /api/pipelines/:id`
  - [x] Requer autenticação e permissão "Pipeline.delete"
  - [x] Validar que não é pipeline padrão
  - [x] Validar que não há oportunidades usando o pipeline
  - [x] Deletar pipeline e estágios

#### Validação
- [x] Teste E2E: criar pipeline funciona
- [x] Teste E2E: atualizar pipeline funciona
- [x] Teste E2E: deletar pipeline em uso falha

---

### 6. Conversão de Lead em Oportunidade

#### Backend (Rotas e Lógica)
- [x] Criar rota `POST /api/leads/:id/convert`
  - [x] Requer autenticação e permissão "Lead.convert"
  - [x] Receber: `createContact` (boolean), `createOpportunity` (boolean), `opportunityData` (opcional)
  - [x] Validar que lead não foi convertido anteriormente
  - [x] Se `createContact`: criar contato a partir do lead
  - [x] Se `createOpportunity`: criar oportunidade
  - [x] Atualizar lead: `converted: true`, `convertedAt`, `convertedToContactId`, `convertedToOpportunityId`
  - [x] Retornar dados criados (contato, oportunidade)

- [x] Criar helper `convertLeadToContact(lead)`
  - [x] Criar contato com dados do lead
  - [x] Criar emails e telefones do lead
  - [x] Retornar contato criado

- [x] Criar helper `convertLeadToOpportunity(lead, opportunityData)`
  - [x] Criar oportunidade com dados do lead
  - [x] Associar a contato/empresa (se criados)
  - [x] Retornar oportunidade criada

#### Validação
- [x] Teste: converter lead em contato funciona
- [x] Teste: converter lead em oportunidade funciona
- [x] Teste: converter lead em ambos funciona
- [x] Teste: lead convertido não pode ser convertido novamente

---

### 7. Status Configuráveis

#### Backend (Lógica)
- [x] Definir status padrão para leads
  - [x] "Novo", "Qualificado", "Convertido", "Perdido"

- [x] Definir status padrão para oportunidades
  - [x] "Aberto", "Ganho", "Perdido", "Arquivado"

- [x] Criar sistema de status customizáveis (opcional na V1)
  - [x] Tabela `Status` com `entityType`, `name`, `color`
  - [x] Ou usar valores fixos na V1

#### Validação
- [x] Teste: status padrão funcionam
- [x] Teste: transição de status funciona

---

### 8. Validações

#### Backend (Validadores)
- [x] Validar valor do negócio
  - [x] Valor deve ser positivo
  - [x] Valor deve ser numérico

- [x] Validar data de fechamento
  - [x] Data deve ser futura ou presente
  - [x] Formato de data válido

- [x] Validar probabilidade
  - [x] Valor entre 0 e 100
  - [x] Numérico

- [x] Validar estágio
  - [x] Estágio deve existir no pipeline
  - [x] Estágio deve pertencer ao tenant atual

#### Validação
- [x] Teste: valor negativo é rejeitado
- [x] Teste: data passada é rejeitada
- [x] Teste: probabilidade > 100 é rejeitada

---

### 9. Frontend — Listagem de Leads

#### Frontend (React + TypeScript)
- [x] Criar componente `LeadList`
  - [x] Tabela/listagem de leads
  - [x] Colunas: nome, email, empresa, status, origem
  - [x] Filtros: status, origem, convertido
  - [x] Botão "Converter" para leads não convertidos

- [x] Criar página `LeadsPage`
  - [x] Integrar `LeadList`
  - [x] Botão "Novo Lead"

#### Validação
- [x] Teste: listagem de leads funciona
- [x] Teste: filtros funcionam

---

### 10. Frontend — Formulário de Lead

#### Frontend (React + TypeScript)
- [x] Criar componente `LeadForm`
  - [x] Campos: firstName, lastName, email, phone, company, source, status
  - [x] Validação de campos
  - [x] Submit para criar/atualizar

- [x] Criar página `LeadFormPage`
  - [x] Integrar `LeadForm`
  - [x] Modo criação ou edição

#### Validação
- [x] Teste: criar lead funciona
- [x] Teste: editar lead funciona

---

### 11. Frontend — Pipeline Visual

#### Frontend (React + TypeScript)
- [x] Criar componente `PipelineView`
  - [x] Visualização Kanban (drag-and-drop opcional na V1)
  - [x] Colunas por estágio
  - [x] Cards de oportunidades em cada estágio
  - [x] Mostrar valor e data de fechamento

- [x] Criar página `OpportunitiesPage`
  - [x] Integrar `PipelineView`
  - [x] Botão "Nova Oportunidade"
  - [x] Alternar entre visualização Kanban e Lista

#### Validação
- [x] Teste: pipeline visual funciona
- [x] Teste: oportunidades aparecem nos estágios corretos

---

### 12. Frontend — Formulário de Oportunidade

#### Frontend (React + TypeScript)
- [x] Criar componente `OpportunityForm`
  - [x] Campos: name, value, currency, stage, status, closeDate, probability
  - [x] Seleção de contato (lookup)
  - [x] Seleção de empresa (lookup)
  - [x] Validação de campos
  - [x] Submit para criar/atualizar

- [x] Criar página `OpportunityFormPage`
  - [x] Integrar `OpportunityForm`
  - [x] Modo criação ou edição

#### Validação
- [x] Teste: criar oportunidade funciona
- [x] Teste: editar oportunidade funciona

---

### 13. Frontend — Conversão de Lead

#### Frontend (React + TypeScript)
- [x] Criar componente `ConvertLeadModal`
  - [x] Checkbox "Criar Contato"
  - [x] Checkbox "Criar Oportunidade"
  - [x] Campos de oportunidade (se criar)
  - [x] Botão "Converter"
  - [x] Feedback de sucesso/erro

- [x] Integrar modal na página de leads
  - [x] Abrir modal ao clicar "Converter"

#### Validação
- [x] Teste: conversão de lead funciona
- [x] Teste: modal de conversão funciona

---

### 14. Testes

#### Backend (Testes)
- [x] Testes unitários
  - [x] Validação de valor
  - [x] Validação de data
  - [x] Conversão de lead

- [x] Testes de integração
  - [x] CRUD completo de leads
  - [x] CRUD completo de oportunidades
  - [x] Pipeline configurável
  - [x] Conversão de lead

#### Validação
- [x] Todos os testes passando
- [x] Cobertura de testes > 70%

---

### 15. Documentação

#### Documentação Técnica
- [x] Documentar endpoints de leads e oportunidades
- [x] Documentar sistema de pipeline
- [x] Documentar conversão de lead

---

## Critérios de Prontidão

Antes de avançar para a **Etapa 7 (Tarefas/Notas)**, verifique:

- [x] CRUD de leads e oportunidades funcionando
- [x] Pipeline configurável operacional
- [x] Conversão de lead em oportunidade funcionando
- [x] Valor e data de fechamento registrados
- [x] Pipeline visualizável (mesmo que apenas em lista inicialmente)
- [x] Frontend básico funcionando
- [x] Testes passando
- [x] Documentação atualizada

---

## Tecnologias Utilizadas

- **Backend**: Node.js + TypeScript
- **ORM**: Prisma
- **Banco de dados**: PostgreSQL
- **Frontend**: React + TypeScript

---

## Próximos Passos

Após completar esta etapa, você pode avançar para:

**→ [Etapa 7: Tarefas, Notas e Histórico de Atividades](./Etapa-07-Tarefas-Notas.md)**

---

## Notas Importantes

✅ **Boas práticas**:
- Pipeline deve ser flexível mas simples na V1
- Conversão de lead deve preservar histórico
- Valores devem sempre ter moeda associada
- Probabilidade ajuda em previsões

---

## Referências

- **Roadmap Funcional**: `Features/meu_projeto/v1/fases_2/Roadmap-Funcionalidades-V1.md`
- **Etapa 5 (Contatos/Empresas)**: `Features/meu_projeto/v1/fases_2/Etapa-05-Contatos-Empresas.md`
- **Decisão de Stack**: `Features/meu_projeto/v1/Decisao-Stack-V1.md`
