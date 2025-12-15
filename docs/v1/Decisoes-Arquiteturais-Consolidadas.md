# Decisões arquiteturais consolidadas — V1

> **Quando usar**: Durante toda a execução do V1, como referência rápida para decisões técnicas já tomadas.  
> **Objetivo**: Centralizar todas as decisões arquiteturais em um único documento para consulta e rastreabilidade.

## Como usar este documento

- **Durante implementação**: Consulte antes de tomar decisões técnicas para evitar retrabalho
- **Em code reviews**: Use como referência para validar que decisões foram seguidas
- **Em discussões técnicas**: Use para alinhar time sobre decisões já tomadas
- **Ao evoluir o produto**: Revise decisões quando necessário ajustar arquitetura

---

## Índice de decisões por fase

- [Fase 1](#fase-1-preparacao-de-ambiente-e-infraestrutura-base)
- [Fase 2](#fase-2-estrutura-saas-e-multi-tenant)
- [Fase 3](#fase-3-autenticacao-e-gestao-de-sessao)
- [Fase 4](#fase-4-gestao-de-usuarios-e-controle-de-acesso-acl)
- [Fase 5](#fase-5-modelo-de-dados-e-entidades-personalizaveis)
- [Fase 6](#fase-6-contatos-empresas-e-relacionamentos)
- [Fase 7](#fase-7-leads-oportunidades-e-pipeline)
- [Fase 8](#fase-8-tarefas-notas-e-historico-de-atividades)

---

## Fase 1 — Preparação de ambiente e infraestrutura base

### Decisão 1.1: Stack tecnológica base
- **Decisão**: DB relacional como fonte primária, com backend que suporte governança e segurança de forma explícita
- **Justificativa**: Multi-tenant com isolamento lógico, permissões por objeto/campo e auditoria favorecem consistência transacional e modelagem relacional
- **Impacto**: Define escolha de banco de dados e arquitetura de backend
- **Referência**: Fase 1, Decisão 1

### Decisão 1.2: Modelo de entrega
- **Decisão**: Containers como padrão inicial
- **Justificativa**: Reduz diferença entre local/staging/prod e facilita replicabilidade e rollout incremental
- **Impacto**: Define estratégia de deploy e orquestração
- **Referência**: Fase 1, Decisão 2

### Decisão 1.3: CI/CD mínimo
- **Decisão**: Pipeline mínimo com etapas explícitas (build → checks → deploy staging → deploy produção)
- **Justificativa**: Evita "deploy manual" e reduz risco comercial no primeiro cliente
- **Impacto**: Define estrutura de pipeline e automação
- **Referência**: Fase 1, Decisão 3

### Decisão 1.4: Observabilidade mínima
- **Decisão**: Logs estruturados + métricas mínimas; tracing como opcional
- **Justificativa**: V1 precisa suportar suporte e diagnóstico sem elevar custo/complexidade além do necessário
- **Impacto**: Define ferramentas e estrutura de observabilidade
- **Referência**: Fase 1, Decisão 4

### Decisão 1.5: Backup e restore
- **Decisão**: Backup automatizado com teste de restore como requisito de prontidão comercial
- **Justificativa**: Produto vendável exige capacidade de recuperação comprovada
- **Impacto**: Define estratégia de backup e processo de validação
- **Referência**: Fase 1, Decisão 5

---

## Fase 2 — Estrutura SaaS e multi-tenant

### Decisão 2.1: Estratégia de multi-tenancy
- **Decisão**: Tabelas compartilhadas com `tenant_id` como padrão do V1
- **Justificativa**: Menor custo operacional e menor atrito de provisionamento no V1, mantendo isolamento lógico consistente quando combinado com controles na camada de acesso e/ou políticas do banco
- **Impacto**: Define modelo de isolamento de dados e estrutura de tabelas
- **Referência**: Fase 2, Decisão 1

### Decisão 2.2: Onde impor o isolamento
- **Decisão**: Aplicação como obrigatória, e banco como reforço quando viável
- **Justificativa**: A aplicação precisa ser correta por padrão; reforço no banco reduz risco de erro humano e amplia segurança
- **Impacto**: Define onde implementar filtros de tenant (aplicação + banco)
- **Referência**: Fase 2, Decisão 2

### Decisão 2.3: Resolução do contexto de tenant
- **Decisão**: Estratégia única e consistente no V1 (preferencialmente subdomínio quando o produto é vendido como SaaS)
- **Justificativa**: Simplifica UX e reduz risco de "usuário no tenant errado"
- **Impacto**: Define como identificar tenant em cada requisição
- **Referência**: Fase 2, Decisão 3

### Decisão 2.4: Modelo de provisionamento
- **Decisão**: Híbrido ou manual no V1, dependendo de capacidade de suporte e risco
- **Justificativa**: Produto vendado cedo costuma exigir controle maior de onboarding e configuração inicial
- **Impacto**: Define processo de criação de tenants
- **Referência**: Fase 2, Decisão 4

---

## Fase 3 — Autenticação e gestão de sessão

### Decisão 3.1: Modelo de autenticação
- **Decisão**: Híbrido (token de acesso com expiração curta + mecanismo de renovação/revogação compatível com SaaS)
- **Justificativa**: Permite segurança e controle de sessão sem depender de estado pesado em servidor
- **Impacto**: Define formato de tokens e estratégia de sessão
- **Referência**: Fase 3, Decisão 1

### Decisão 3.2: Identificador principal de usuário
- **Decisão**: Email único por tenant no V1 (ou global se o modelo comercial exigir "um usuário em múltiplos tenants" já no V1)
- **Justificativa**: Evita amarrar arquitetura a um cenário multi-tenant cross-org antes de haver necessidade real
- **Impacto**: Define unicidade de email e modelo de login
- **Referência**: Fase 3, Decisão 2

### Decisão 3.3: Rate limiting
- **Decisão**: Combinação por IP + tenant para endpoints sensíveis
- **Justificativa**: SaaS multi-tenant precisa conter abuso sem impactar desproporcionalmente um cliente
- **Impacto**: Define estratégia de rate limiting
- **Referência**: Fase 3, Decisão 3

### Decisão 3.4: Segurança de recuperação/reset de senha
- **Decisão**: Token single-use com expiração e trilha mínima de auditoria
- **Justificativa**: Reduz risco de sequestro de conta
- **Impacto**: Define fluxo de reset de senha
- **Referência**: Fase 3, Decisão 4

---

## Fase 4 — Gestão de usuários e controle de acesso (ACL)

> **Nota**: As decisões da Fase 4 serão adicionadas quando a fase for detalhada. Por enquanto, consulte o arquivo `Fase-04-Gestao-de-usuarios-e-controle-de-acesso-ACL.md` para decisões específicas.

---

## Fase 5 — Modelo de dados e entidades personalizáveis

### Decisão 5.1: Entidades core no V1
- **Decisão**: Contatos + Empresas + Leads + Oportunidades + Atividades (tarefas/notas)
- **Justificativa**: O V1 inclui explicitamente leads, pipeline e atividades; o modelo deve nascer coerente
- **Impacto**: Define escopo de entidades a implementar
- **Referência**: Fase 5, Decisão 1

### Decisão 5.2: Representação de campos personalizáveis
- **Decisão**: Estratégia semiestruturada (EAV ou JSON) com governança e limites no V1
- **Justificativa**: O V1 precisa customização sem exigir migração física por cliente; governança é mais importante do que flexibilidade total
- **Impacto**: Define como armazenar campos customizados
- **Referência**: Fase 5, Decisão 2

### Decisão 5.3: Tipos de campo suportados no V1
- **Decisão**: Texto, número, data, boolean, select, lookup
- **Justificativa**: Lookup é necessário para relacionamentos operacionais; tipos avançados podem esperar
- **Impacto**: Define escopo de tipos de campo
- **Referência**: Fase 5, Decisão 3

### Decisão 5.4: Validação de unicidade
- **Decisão**: Unicidade por tenant como padrão
- **Justificativa**: Evita colisões entre clientes e mantém coerência do modelo multi-tenant
- **Impacto**: Define regras de unicidade de campos
- **Referência**: Fase 5, Decisão 4

---

## Fase 6 — Contatos, empresas e relacionamentos

### Decisão 6.1: Cardinalidade pessoa ↔ empresa
- **Decisão**: N:N como preferencial para CRM genérico
- **Justificativa**: CRMs reais lidam com consultores, parceiros e múltiplas relações; limitar pode travar adoção
- **Impacto**: Define estrutura de relacionamento contato-empresa
- **Referência**: Fase 6, Decisão 1

### Decisão 6.2: Modelo de emails/telefones por tipo
- **Decisão**: Lista com tipo (Work/Home/Other)
- **Justificativa**: Evita rigidez e atende diretamente ao escopo V1
- **Impacto**: Define estrutura de múltiplos meios de contato
- **Referência**: Fase 6, Decisão 2

### Decisão 6.3: Tags (escopo e governança)
- **Decisão**: Catálogo de tags por tenant
- **Justificativa**: Evita explosão de variações e melhora busca/filtros
- **Impacto**: Define modelo de tags e governança
- **Referência**: Fase 6, Decisão 3

---

## Fase 7 — Leads, oportunidades e pipeline

### Decisão 7.1: Pipeline por tenant vs global
- **Decisão**: Configurável por tenant
- **Justificativa**: O escopo do V1 inclui estágios/status configuráveis; processos variam entre empresas
- **Impacto**: Define onde armazenar configuração de pipeline
- **Referência**: Fase 7, Decisão 1

### Decisão 7.2: Conversão de lead
- **Decisão**: Manter Lead como origem e criar/ligar registros derivados
- **Justificativa**: Mantém rastreabilidade e reduz perda de informação de origem
- **Impacto**: Define fluxo de conversão de lead
- **Referência**: Fase 7, Decisão 2

### Decisão 7.3: Status e regras de fechamento
- **Decisão**: Status simples (Open/Won/Lost) no V1
- **Justificativa**: Mantém MVP enxuto e vendável, evitando taxonomia extensa no início
- **Impacto**: Define modelo de status de oportunidades
- **Referência**: Fase 7, Decisão 3

---

## Fase 8 — Tarefas, notas e histórico de atividades

### Decisão 8.1: Formato de notas
- **Decisão**: Markdown ou texto simples no V1
- **Justificativa**: Mantém baixo custo e cobre a maior parte do uso; rich text aumenta complexidade e superfície de bugs
- **Impacto**: Define formato de conteúdo de notas
- **Referência**: Fase 8, Decisão 1

### Decisão 8.2: Timeline como agregação de eventos
- **Decisão**: Modelo de eventos materializados (mínimo) para consistência e performance
- **Justificativa**: A V1 já exige auditoria; eventos materializados simplificam timeline e suporte
- **Impacto**: Define como implementar timeline/histórico
- **Referência**: Fase 8, Decisão 2

### Decisão 8.3: Configuração de tipos/status de tarefas
- **Decisão**: Configuráveis por tenant com defaults
- **Justificativa**: O V1 explicita configurabilidade; limitar a defaults atrasa valor percebido
- **Impacto**: Define modelo de configuração de tarefas
- **Referência**: Fase 8, Decisão 3

---

## Dependências entre decisões

### Decisões que dependem de outras

1. **Fase 2 → Fase 3**: Isolamento multi-tenant (Fase 2) deve estar definido antes de autenticação (Fase 3)
2. **Fase 3 → Fase 4**: Autenticação (Fase 3) deve estar definida antes de ACL (Fase 4)
3. **Fase 5 → Fases 6, 7, 8**: Modelo de dados (Fase 5) deve estar definido antes de entidades específicas (Fases 6, 7, 8)
4. **Fase 1 → Todas**: Infraestrutura base (Fase 1) é pré-requisito para todas as outras

### Decisões que impactam múltiplas fases

- **Multi-tenant (Fase 2)**: Impacta todas as fases subsequentes (todos os dados devem considerar tenant)
- **Modelo de dados (Fase 5)**: Impacta Fases 6, 7, 8 (estrutura de entidades)
- **ACL (Fase 4)**: Impacta Fases 6, 7, 8 (permissões em todas as entidades)

---

## Decisões pendentes ou a revisar

> **Nota**: Esta seção deve ser atualizada conforme decisões são tomadas ou revisadas durante a execução.

- Nenhuma decisão pendente no momento (todas as decisões das fases 1-8 estão documentadas)

---

## Como atualizar este documento

1. **Ao tomar nova decisão**: Adicione na seção correspondente à fase
2. **Ao revisar decisão**: Marque como "revisada" e documente a nova decisão
3. **Ao identificar dependência**: Atualize a seção "Dependências entre decisões"
4. **Ao finalizar fase**: Revise se todas as decisões da fase foram documentadas

---

## Referências

- **Roadmap V1**: `Roadmap-V1.md`
- **Fases detalhadas**: `fases/Fase-XX-*.md`
- **Modelo de dados**: `Modelo-de-Dados-Conceitual.md`

