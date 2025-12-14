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
- [ ] Criar tabela `Lead`
  - [ ] Campo `id` (UUID)
  - [ ] Campo `tenantId` (foreign key)
  - [ ] Campos: `firstName`, `lastName`, `email`, `phone`, `company`
  - [ ] Campo `source` (origem do lead)
  - [ ] Campo `status` (novo, qualificado, convertido, perdido)
  - [ ] Campo `converted` (boolean - se foi convertido)
  - [ ] Campo `convertedAt` (timestamp - quando foi convertido)
  - [ ] Campo `convertedToContactId` (foreign key, opcional)
  - [ ] Campo `convertedToOpportunityId` (foreign key, opcional)
  - [ ] Campos `created_at` e `updated_at`
  - [ ] Índice em `(tenantId, status)`

- [ ] Criar tabela `Opportunity` (Oportunidade/Negócio)
  - [ ] Campo `id` (UUID)
  - [ ] Campo `tenantId` (foreign key)
  - [ ] Campo `name` (nome do negócio)
  - [ ] Campo `value` (valor do negócio - decimal)
  - [ ] Campo `currency` (moeda - ex: "BRL", "USD")
  - [ ] Campo `stage` (estágio do pipeline)
  - [ ] Campo `status` (aberto, ganho, perdido, arquivado)
  - [ ] Campo `closeDate` (data de fechamento esperada)
  - [ ] Campo `probability` (probabilidade de fechamento - 0-100%)
  - [ ] Campo `contactId` (foreign key para Contact)
  - [ ] Campo `companyId` (foreign key para Company)
  - [ ] Campo `leadId` (foreign key para Lead, se convertido de lead)
  - [ ] Campos `created_at` e `updated_at`
  - [ ] Índice em `(tenantId, stage, status)`

- [ ] Criar tabela `Pipeline` (Pipeline configurável)
  - [ ] Campo `id` (UUID)
  - [ ] Campo `tenantId` (foreign key)
  - [ ] Campo `name` (ex: "Pipeline de Vendas")
  - [ ] Campo `isDefault` (boolean)
  - [ ] Campos `created_at` e `updated_at`

- [ ] Criar tabela `PipelineStage` (Estágios do pipeline)
  - [ ] Campo `id` (UUID)
  - [ ] Campo `pipelineId` (foreign key)
  - [ ] Campo `name` (ex: "Qualificação", "Proposta", "Negociação")
  - [ ] Campo `order` (ordem no pipeline)
  - [ ] Campo `probability` (probabilidade padrão do estágio)
  - [ ] Campo `color` (cor para visualização)
  - [ ] Campos `created_at` e `updated_at`
  - [ ] Índice em `(pipelineId, order)`

- [ ] Criar migração Prisma
  - [ ] Executar `prisma migrate dev --name add_leads_opportunities`
  - [ ] Validar que todas as tabelas foram criadas

#### Validação
- [ ] Testar criação de lead via Prisma
- [ ] Testar criação de oportunidade via Prisma
- [ ] Testar criação de pipeline e estágios

---

### 2. Seed Data — Pipeline Padrão

#### Backend (Seed Script)
- [ ] Criar pipeline padrão no seed
  - [ ] Nome: "Pipeline de Vendas"
  - [ ] Marcar como `isDefault: true`

- [ ] Criar estágios padrão
  - [ ] "Qualificação" (order: 1, probability: 10%)
  - [ ] "Proposta" (order: 2, probability: 30%)
  - [ ] "Negociação" (order: 3, probability: 60%)
  - [ ] "Fechamento" (order: 4, probability: 90%)

#### Validação
- [ ] Executar seed e verificar que pipeline foi criado
- [ ] Verificar que estágios foram criados na ordem correta

---

### 3. CRUD de Leads

#### Backend (Rotas)
- [ ] Criar rota `GET /api/leads`
  - [ ] Requer autenticação e permissão "Lead.list"
  - [ ] Listar leads do tenant atual
  - [ ] Paginação (limit, offset)
  - [ ] Filtros: `status`, `source`, `converted`
  - [ ] Ordenação: `created_at`, `firstName`, `lastName`
  - [ ] Incluir informações de conversão

- [ ] Criar rota `GET /api/leads/:id`
  - [ ] Requer autenticação e permissão "Lead.read"
  - [ ] Retornar lead específico
  - [ ] Validar que lead pertence ao tenant atual

- [ ] Criar rota `POST /api/leads`
  - [ ] Requer autenticação e permissão "Lead.create"
  - [ ] Receber: `firstName`, `lastName`, `email`, `phone`, `company`, `source`, `status`
  - [ ] Validar dados obrigatórios
  - [ ] Validar email (formato)
  - [ ] Criar lead
  - [ ] Retornar lead criado

- [ ] Criar rota `PUT /api/leads/:id`
  - [ ] Requer autenticação e permissão "Lead.update"
  - [ ] Receber mesmos campos do POST
  - [ ] Validar que lead pertence ao tenant atual
  - [ ] Atualizar lead
  - [ ] Retornar lead atualizado

- [ ] Criar rota `DELETE /api/leads/:id`
  - [ ] Requer autenticação e permissão "Lead.delete"
  - [ ] Validar que lead pertence ao tenant atual
  - [ ] Soft delete ou hard delete
  - [ ] Retornar sucesso

#### Validação
- [ ] Teste E2E: criar lead funciona
- [ ] Teste E2E: listar leads retorna apenas do tenant atual
- [ ] Teste E2E: atualizar lead funciona
- [ ] Teste E2E: deletar lead funciona

---

### 4. CRUD de Oportunidades

#### Backend (Rotas)
- [ ] Criar rota `GET /api/opportunities`
  - [ ] Requer autenticação e permissão "Opportunity.list"
  - [ ] Listar oportunidades do tenant atual
  - [ ] Paginação (limit, offset)
  - [ ] Filtros: `stage`, `status`, `contactId`, `companyId`
  - [ ] Ordenação: `value`, `closeDate`, `created_at`
  - [ ] Incluir contato, empresa, lead

- [ ] Criar rota `GET /api/opportunities/:id`
  - [ ] Requer autenticação e permissão "Opportunity.read"
  - [ ] Retornar oportunidade específica
  - [ ] Incluir contato, empresa, lead, histórico
  - [ ] Validar que oportunidade pertence ao tenant atual

- [ ] Criar rota `POST /api/opportunities`
  - [ ] Requer autenticação e permissão "Opportunity.create"
  - [ ] Receber: `name`, `value`, `currency`, `stage`, `status`, `closeDate`, `probability`, `contactId`, `companyId`, `leadId`
  - [ ] Validar dados obrigatórios (name, value, stage)
  - [ ] Validar valor positivo
  - [ ] Validar data de fechamento (futura ou presente)
  - [ ] Validar probabilidade (0-100)
  - [ ] Criar oportunidade
  - [ ] Retornar oportunidade criada

- [ ] Criar rota `PUT /api/opportunities/:id`
  - [ ] Requer autenticação e permissão "Opportunity.update"
  - [ ] Receber mesmos campos do POST
  - [ ] Validar que oportunidade pertence ao tenant atual
  - [ ] Atualizar oportunidade
  - [ ] Retornar oportunidade atualizada

- [ ] Criar rota `DELETE /api/opportunities/:id`
  - [ ] Requer autenticação e permissão "Opportunity.delete"
  - [ ] Validar que oportunidade pertence ao tenant atual
  - [ ] Soft delete ou hard delete
  - [ ] Retornar sucesso

#### Validação
- [ ] Teste E2E: criar oportunidade funciona
- [ ] Teste E2E: listar oportunidades retorna apenas do tenant atual
- [ ] Teste E2E: atualizar oportunidade funciona
- [ ] Teste E2E: deletar oportunidade funciona

---

### 5. Pipeline Configurável

#### Backend (Rotas)
- [ ] Criar rota `GET /api/pipelines`
  - [ ] Requer autenticação
  - [ ] Listar pipelines do tenant atual
  - [ ] Incluir estágios

- [ ] Criar rota `GET /api/pipelines/:id`
  - [ ] Requer autenticação
  - [ ] Retornar pipeline com estágios ordenados

- [ ] Criar rota `POST /api/pipelines`
  - [ ] Requer autenticação e permissão "Pipeline.create"
  - [ ] Receber: `name`, `stages[]` (array de estágios)
  - [ ] Criar pipeline e estágios
  - [ ] Retornar pipeline criado

- [ ] Criar rota `PUT /api/pipelines/:id`
  - [ ] Requer autenticação e permissão "Pipeline.update"
  - [ ] Receber: `name`, `stages[]`
  - [ ] Atualizar pipeline e estágios
  - [ ] Validar que estágios em uso não podem ser deletados

- [ ] Criar rota `DELETE /api/pipelines/:id`
  - [ ] Requer autenticação e permissão "Pipeline.delete"
  - [ ] Validar que não é pipeline padrão
  - [ ] Validar que não há oportunidades usando o pipeline
  - [ ] Deletar pipeline e estágios

#### Validação
- [ ] Teste E2E: criar pipeline funciona
- [ ] Teste E2E: atualizar pipeline funciona
- [ ] Teste E2E: deletar pipeline em uso falha

---

### 6. Conversão de Lead em Oportunidade

#### Backend (Rotas e Lógica)
- [ ] Criar rota `POST /api/leads/:id/convert`
  - [ ] Requer autenticação e permissão "Lead.convert"
  - [ ] Receber: `createContact` (boolean), `createOpportunity` (boolean), `opportunityData` (opcional)
  - [ ] Validar que lead não foi convertido anteriormente
  - [ ] Se `createContact`: criar contato a partir do lead
  - [ ] Se `createOpportunity`: criar oportunidade
  - [ ] Atualizar lead: `converted: true`, `convertedAt`, `convertedToContactId`, `convertedToOpportunityId`
  - [ ] Retornar dados criados (contato, oportunidade)

- [ ] Criar helper `convertLeadToContact(lead)`
  - [ ] Criar contato com dados do lead
  - [ ] Criar emails e telefones do lead
  - [ ] Retornar contato criado

- [ ] Criar helper `convertLeadToOpportunity(lead, opportunityData)`
  - [ ] Criar oportunidade com dados do lead
  - [ ] Associar a contato/empresa (se criados)
  - [ ] Retornar oportunidade criada

#### Validação
- [ ] Teste: converter lead em contato funciona
- [ ] Teste: converter lead em oportunidade funciona
- [ ] Teste: converter lead em ambos funciona
- [ ] Teste: lead convertido não pode ser convertido novamente

---

### 7. Status Configuráveis

#### Backend (Lógica)
- [ ] Definir status padrão para leads
  - [ ] "Novo", "Qualificado", "Convertido", "Perdido"

- [ ] Definir status padrão para oportunidades
  - [ ] "Aberto", "Ganho", "Perdido", "Arquivado"

- [ ] Criar sistema de status customizáveis (opcional na V1)
  - [ ] Tabela `Status` com `entityType`, `name`, `color`
  - [ ] Ou usar valores fixos na V1

#### Validação
- [ ] Teste: status padrão funcionam
- [ ] Teste: transição de status funciona

---

### 8. Validações

#### Backend (Validadores)
- [ ] Validar valor do negócio
  - [ ] Valor deve ser positivo
  - [ ] Valor deve ser numérico

- [ ] Validar data de fechamento
  - [ ] Data deve ser futura ou presente
  - [ ] Formato de data válido

- [ ] Validar probabilidade
  - [ ] Valor entre 0 e 100
  - [ ] Numérico

- [ ] Validar estágio
  - [ ] Estágio deve existir no pipeline
  - [ ] Estágio deve pertencer ao tenant atual

#### Validação
- [ ] Teste: valor negativo é rejeitado
- [ ] Teste: data passada é rejeitada
- [ ] Teste: probabilidade > 100 é rejeitada

---

### 9. Frontend — Listagem de Leads

#### Frontend (React + TypeScript)
- [ ] Criar componente `LeadList`
  - [ ] Tabela/listagem de leads
  - [ ] Colunas: nome, email, empresa, status, origem
  - [ ] Filtros: status, origem, convertido
  - [ ] Botão "Converter" para leads não convertidos

- [ ] Criar página `LeadsPage`
  - [ ] Integrar `LeadList`
  - [ ] Botão "Novo Lead"

#### Validação
- [ ] Teste: listagem de leads funciona
- [ ] Teste: filtros funcionam

---

### 10. Frontend — Formulário de Lead

#### Frontend (React + TypeScript)
- [ ] Criar componente `LeadForm`
  - [ ] Campos: firstName, lastName, email, phone, company, source, status
  - [ ] Validação de campos
  - [ ] Submit para criar/atualizar

- [ ] Criar página `LeadFormPage`
  - [ ] Integrar `LeadForm`
  - [ ] Modo criação ou edição

#### Validação
- [ ] Teste: criar lead funciona
- [ ] Teste: editar lead funciona

---

### 11. Frontend — Pipeline Visual

#### Frontend (React + TypeScript)
- [ ] Criar componente `PipelineView`
  - [ ] Visualização Kanban (drag-and-drop opcional na V1)
  - [ ] Colunas por estágio
  - [ ] Cards de oportunidades em cada estágio
  - [ ] Mostrar valor e data de fechamento

- [ ] Criar página `OpportunitiesPage`
  - [ ] Integrar `PipelineView`
  - [ ] Botão "Nova Oportunidade"
  - [ ] Alternar entre visualização Kanban e Lista

#### Validação
- [ ] Teste: pipeline visual funciona
- [ ] Teste: oportunidades aparecem nos estágios corretos

---

### 12. Frontend — Formulário de Oportunidade

#### Frontend (React + TypeScript)
- [ ] Criar componente `OpportunityForm`
  - [ ] Campos: name, value, currency, stage, status, closeDate, probability
  - [ ] Seleção de contato (lookup)
  - [ ] Seleção de empresa (lookup)
  - [ ] Validação de campos
  - [ ] Submit para criar/atualizar

- [ ] Criar página `OpportunityFormPage`
  - [ ] Integrar `OpportunityForm`
  - [ ] Modo criação ou edição

#### Validação
- [ ] Teste: criar oportunidade funciona
- [ ] Teste: editar oportunidade funciona

---

### 13. Frontend — Conversão de Lead

#### Frontend (React + TypeScript)
- [ ] Criar componente `ConvertLeadModal`
  - [ ] Checkbox "Criar Contato"
  - [ ] Checkbox "Criar Oportunidade"
  - [ ] Campos de oportunidade (se criar)
  - [ ] Botão "Converter"
  - [ ] Feedback de sucesso/erro

- [ ] Integrar modal na página de leads
  - [ ] Abrir modal ao clicar "Converter"

#### Validação
- [ ] Teste: conversão de lead funciona
- [ ] Teste: modal de conversão funciona

---

### 14. Testes

#### Backend (Testes)
- [ ] Testes unitários
  - [ ] Validação de valor
  - [ ] Validação de data
  - [ ] Conversão de lead

- [ ] Testes de integração
  - [ ] CRUD completo de leads
  - [ ] CRUD completo de oportunidades
  - [ ] Pipeline configurável
  - [ ] Conversão de lead

#### Validação
- [ ] Todos os testes passando
- [ ] Cobertura de testes > 70%

---

### 15. Documentação

#### Documentação Técnica
- [ ] Documentar endpoints de leads e oportunidades
- [ ] Documentar sistema de pipeline
- [ ] Documentar conversão de lead

---

## Critérios de Prontidão

Antes de avançar para a **Etapa 7 (Tarefas/Notas)**, verifique:

- [ ] CRUD de leads e oportunidades funcionando
- [ ] Pipeline configurável operacional
- [ ] Conversão de lead em oportunidade funcionando
- [ ] Valor e data de fechamento registrados
- [ ] Pipeline visualizável (mesmo que apenas em lista inicialmente)
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
