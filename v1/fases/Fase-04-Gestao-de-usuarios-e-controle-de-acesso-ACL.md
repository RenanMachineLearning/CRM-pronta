# Fase 4 – Gestão de usuários e controle de acesso (ACL)

## Objetivo da Fase
Garantir governança mínima do CRM SaaS: gestão de usuários por tenant, roles e controle de acesso por objeto e por campo, alinhado às funcionalidades do V1.

## Procedimentos
- Definir o conjunto de **roles padrão** do V1 e suas responsabilidades.
- Definir o modelo de **permissões por objeto** (ex.: Contatos, Empresas, Leads, Oportunidades, Tarefas, Notas).
- Definir o modelo de **permissões por campo** (campos sensíveis, ex.: “Valor do negócio”).
- Definir o fluxo de **gestão de usuários**:
  - Criar usuário no tenant
  - Atribuir role
  - Desativar/remover acesso
  - Editar perfil (usuário e/ou admin)
- Definir políticas de **auditoria de alterações**:
  - Quais entidades são auditadas no V1
  - Quais eventos são registrados (criar/editar/deletar)
  - Como manter rastreabilidade por tenant e por usuário
- Definir como o ACL interage com multi-tenant:
  - Nenhum role deve quebrar isolamento de tenant
  - Admin de tenant não vira “admin global” automaticamente

## Decisões Técnicas

### Decisão 1 — Modelo de RBAC (role-based)
- **O que está sendo decidido**: Se as permissões serão atribuídas por roles fixas ou configuráveis.
- **Alternativas consideradas**:
  - (A) Roles fixas (Admin, Member, Viewer)
  - (B) Roles configuráveis por tenant
- **Decisão tomada**: **Roles fixas no V1**, com possibilidade de evolução.
- **Justificativa objetiva**: Reduz complexidade e acelera entrega; configurabilidade de roles costuma ser demanda pós-MVP.

### Decisão 2 — Granularidade de permissões por objeto
- **O que está sendo decidido**: Quais ações por entidade serão controladas.
- **Alternativas consideradas**:
  - (A) Apenas “read vs write”
  - (B) CRUD completo (create/read/update/delete) por entidade
- **Decisão tomada**: **CRUD por entidade** no V1.
- **Justificativa objetiva**: Produtos vendáveis exigem separação mínima de responsabilidades (ex.: quem pode deletar).

### Decisão 3 — Permissões por campo
- **O que está sendo decidido**: Se o V1 terá controle por campo e em quais campos.
- **Alternativas consideradas**:
  - (A) Sem permissões por campo no V1
  - (B) Permissões por campo apenas para campos “sensíveis”
- **Decisão tomada**: **Permissões por campo para campos sensíveis**.
- **Justificativa objetiva**: O próprio escopo do V1 inclui essa capacidade; limitar aos sensíveis reduz custo inicial.

### Decisão 4 — Auditoria de alterações (modelo mínimo)
- **O que está sendo decidido**: O nível de detalhe de auditoria no V1.
- **Alternativas consideradas**:
  - (A) Auditoria por evento (quem alterou e quando)
  - (B) Auditoria completa (diff de campos e valores)
- **Decisão tomada**: **Auditoria por evento** no V1 (com possibilidade de evoluir para diff).
- **Justificativa objetiva**: Suficiente para governança comercial inicial e reduz custo de armazenamento/complexidade.

## Tecnologias Selecionadas
- **RBAC (modelo conceitual)**: roles fixas com permissões mapeadas por entidade/ação.
- **Auditoria**: trilha de eventos com escopo de tenant e user.
- **Persistência**: DB relacional para garantir integridade (ex.: constraints por tenant).

## Pré-requisitos para Avançar
- [ ] Roles padrão do V1 definidas e documentadas
- [ ] Matriz de permissões por entidade (CRUD) definida
- [ ] Campos “sensíveis” definidos para permissões por campo
- [ ] Política de auditoria definida (eventos mínimos e retenção inicial)
- [ ] Regras de isolamento multi-tenant revisadas para ACL (sem exceções implícitas)


