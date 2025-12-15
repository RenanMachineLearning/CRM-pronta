# Roadmap Funcional — Versão 1 (MVP Vendável)

> **Fonte**: `Features/meu_projeto/Roadmap-versoes-CRM-SaaS.md` (linhas 6-64)  
> Este roadmap organiza as funcionalidades da V1 em uma sequência lógica, respeitando dependências e evitando conflitos durante o desenvolvimento.

## Objetivo da Versão 1

Entregar um CRM SaaS **utilizável e vendável** para operação básica de vendas, com **autenticação**, **gestão de usuários** e **isolamento multi-tenant** desde o início.

**Justificativa do escopo**: Este conjunto fecha o "ciclo mínimo" de um CRM (cadastro → funil → acompanhamento → busca → importação/exportação) e já nasce como SaaS multi-tenant com governança básica (ACL, permissões e auditoria), viabilizando venda antecipada sem recursos enterprise avançados.

---

## Sequência Lógica de Implementação

### 🏗️ **FUNDAÇÃO — Infraestrutura e Isolamento**

#### Etapa 1: Multi-tenant (Isolamento por Tenant)
**Dependências**: Nenhuma (base do sistema)

**Funcionalidades**:
- Isolamento de dados por tenant
- Contexto de tenant
- Estrutura de tabelas para tenants

**Por que primeiro**: Tudo no sistema depende do isolamento multi-tenant. Sem isso, não há SaaS.

---

#### Etapa 2: Autenticação e Gestão de Sessão
**Dependências**: Etapa 1 (Multi-tenant)

**Funcionalidades**:
- Login/logout
- Tokens de autenticação
- Middleware de autenticação
- Gestão de sessão (armazenamento, expiração, renovação)
- Rate limiting / throttling
- Recuperação/reset de senha
- Alteração de senha

**Por que segundo**: Usuários precisam se autenticar antes de acessar qualquer funcionalidade. Rate limiting protege o sistema desde o início.

---

#### Etapa 3: Gestão de Usuários e Controle de Acesso (ACL)
**Dependências**: Etapa 2 (Autenticação)

**Funcionalidades**:
- Gestão de usuários
- Roles/funções e controle de acesso (ACL)
- Permissões por objeto e por campo
- Conta do usuário (perfil)
  - Informações pessoais (nome, email)
  - Edição de perfil
- Auditoria de alterações

**Por que terceiro**: Após autenticação, é necessário definir quem pode fazer o quê. ACL é fundamental para governança e segurança.

---

### 📊 **MODELO DE DADOS — Estrutura e Customização**

#### Etapa 4: Objetos/Entidades e Campos Personalizáveis
**Dependências**: Etapa 1 (Multi-tenant), Etapa 3 (ACL básico)

**Funcionalidades**:
- Objetos/entidades e campos personalizáveis
- Relacionamentos entre entidades
- Atributos customizados e validação de atributos únicos
- Lookup de entidades e opções de atributos
- Evolução do schema/workspace (migrações)

**Por que quarto**: Todas as entidades do CRM (Contatos, Empresas, Leads, etc.) dependem deste sistema de metadados. É a base para customização.

---

### 👥 **ENTIDADES CORE — Dados de Negócio**

#### Etapa 5: Contatos e Empresas
**Dependências**: Etapa 4 (Modelo de dados)

**Funcionalidades**:
- CRUD de contatos (pessoas)
- CRUD de organizações/empresas/contas
- Associação entre pessoas e organizações
- Endereços
- Múltiplos meios de contato (emails/telefones por tipo: Work, Home, Other)
- Metadados do contato (cargo/título profissional, gênero, background, status)
- Identificador único
- Tags para categorização (inclui cores quando aplicável)

**Por que quinto**: Contatos e empresas são a base do CRM. Leads e oportunidades dependem deles.

---

#### Etapa 6: Leads, Oportunidades e Pipeline
**Dependências**: Etapa 5 (Contatos e Empresas)

**Funcionalidades**:
- Gestão de leads (captura, CRUD e acompanhamento)
- Conversão de lead em conta/contato/oportunidade
- Oportunidades/negócios (deals)
- Pipelines/estágios/categorias e status configuráveis
- Valor do negócio
- Data de fechamento esperada

**Por que sexto**: Pipeline de vendas é o coração do CRM. Depende de contatos/empresas para associações.

---

#### Etapa 7: Tarefas, Notas e Histórico de Atividades
**Dependências**: Etapa 5 (Contatos), Etapa 6 (Leads/Oportunidades)

**Funcionalidades**:
- Tarefas (com tipos/status configuráveis)
- Notas vinculadas a registros (contatos, negócios, leads etc.)
- Editor de notas
- Timeline/histórico de atividades por registro

**Por que sétimo**: Atividades (tarefas e notas) precisam ser vinculadas a registros existentes. Timeline agrega histórico.

---

### 🔍 **DESCOBERTA E NAVEGAÇÃO**

#### Etapa 8: Busca e Filtros
**Dependências**: Etapas 5, 6, 7 (Todas as entidades core)

**Funcionalidades**:
- Busca global
- Busca e filtros avançados
- Ordenação e paginação

**Por que oitavo**: Busca e filtros precisam funcionar sobre todas as entidades já criadas. Sem dados, não há o que buscar.

---

### 📥 **IMPORT/EXPORT — Integração de Dados**

#### Etapa 9: Importação e Exportação de Dados
**Dependências**: Etapas 5, 6, 7 (Entidades core), Etapa 8 (Filtros para exportação filtrada)

**Funcionalidades**:
- Importação de dados (CSV/Excel e/ou templates)
- Mapeamento de campos e processamento em lote
- Validação, relatórios de erro e estatísticas de importação
- Exportação de dados (CSV e outros formatos)

**Por que nono**: Importação precisa mapear para campos já existentes. Exportação pode usar filtros da Etapa 8.

---

### 🎨 **INTERFACE E EXPERIÊNCIA**

#### Etapa 10: Interface Responsiva e Tratamento de Estados
**Dependências**: Todas as etapas anteriores (funcionalidades core)

**Funcionalidades**:
- Tratamento de estados (loading/erro)
- Interface responsiva e modo mobile

**Por que décimo**: Interface precisa refletir todas as funcionalidades implementadas. Estados de loading/erro melhoram UX.

---

## Mapa de Dependências

```
Etapa 1 (Multi-tenant)
    ↓
Etapa 2 (Autenticação)
    ↓
Etapa 3 (ACL)
    ↓
Etapa 4 (Modelo de Dados)
    ↓
    ├─→ Etapa 5 (Contatos/Empresas)
    │       ↓
    │       ├─→ Etapa 6 (Leads/Oportunidades)
    │       │       ↓
    │       └─→ Etapa 7 (Tarefas/Notas)
    │               ↓
    └─→ Etapa 8 (Busca/Filtros) ←─┘
            ↓
    Etapa 9 (Import/Export)
            ↓
    Etapa 10 (Interface/UX)
```

---

## Critérios de Prontidão por Etapa

### Etapa 1 — Multi-tenant
- [ ] Sistema cria e gerencia múltiplos tenants
- [ ] Isolamento de dados garantido (testes de isolamento passando)
- [ ] Contexto de tenant disponível em todas as requisições

### Etapa 2 — Autenticação
- [ ] Login/logout funcionando
- [ ] Tokens JWT válidos e seguros
- [ ] Rate limiting ativo
- [ ] Recuperação de senha operacional

### Etapa 3 — ACL
- [ ] Roles e permissões funcionais
- [ ] Permissões por objeto e campo operacionais
- [ ] Auditoria registrando alterações
- [ ] Perfil do usuário editável

### Etapa 4 — Modelo de Dados
- [ ] Entidades core definidas (Contato, Empresa, Lead, Oportunidade, Tarefa, Nota)
- [ ] Campos personalizáveis operacionais
- [ ] Relacionamentos entre entidades funcionando
- [ ] Sistema de migrações suportando evolução do schema

### Etapa 5 — Contatos/Empresas
- [ ] CRUD completo de contatos e empresas
- [ ] Associações entre pessoas e organizações funcionando
- [ ] Múltiplos emails/telefones por contato
- [ ] Tags operacionais

### Etapa 6 — Leads/Oportunidades
- [ ] CRUD de leads e oportunidades funcionando
- [ ] Pipeline configurável operacional
- [ ] Conversão de lead em oportunidade funcionando
- [ ] Valor e data de fechamento registrados

### Etapa 7 — Tarefas/Notas
- [ ] Tarefas podem ser criadas e gerenciadas
- [ ] Notas podem ser criadas e vinculadas a registros
- [ ] Timeline exibindo histórico de atividades
- [ ] Status e tipos de tarefas configuráveis

### Etapa 8 — Busca/Filtros
- [ ] Busca global funcionando
- [ ] Filtros avançados operacionais
- [ ] Ordenação e paginação funcionando
- [ ] Performance aceitável (< 500ms)

### Etapa 9 — Import/Export
- [ ] Importação de CSV/Excel funcionando
- [ ] Mapeamento de campos operacional
- [ ] Validação e relatórios de erro funcionando
- [ ] Exportação de dados em CSV funcionando

### Etapa 10 — Interface/UX
- [ ] Interface funcionando bem em desktop, tablet e mobile
- [ ] Estados de loading e erro tratados adequadamente
- [ ] Navegação clara e intuitiva
- [ ] Formulários e listas responsivos

---

## Riscos e Mitigações

### Risco 1: Isolamento Multi-tenant
- **Mitigação**: Testes rigorosos de isolamento desde o início. Nenhuma query sem `tenant_id`.

### Risco 2: Performance com Volume
- **Mitigação**: Índices e otimizações de query desde a Etapa 4 (Modelo de Dados). Paginação obrigatória.

### Risco 3: Complexidade de Customização
- **Mitigação**: Limitar escopo de customização na V1. Campos customizados com tipos básicos inicialmente.

### Risco 4: Dependências entre Etapas
- **Mitigação**: Respeitar ordem sequencial. Não pular etapas. Testar integrações entre etapas.

---

## Notas de Implementação

### Paralelização Possível
- **Etapa 8 (Busca)** e **Etapa 9 (Import/Export)** podem ser desenvolvidas parcialmente em paralelo, mas ambas dependem das entidades core.

### Validação Contínua
- Após cada etapa, validar:
  - Isolamento multi-tenant ainda funcionando
  - Autenticação e ACL respeitados
  - Performance aceitável
  - Dados consistentes

### Testes por Etapa
- Cada etapa deve ter:
  - Testes unitários das funcionalidades
  - Testes de integração com etapas anteriores
  - Testes de isolamento multi-tenant (quando aplicável)

---

## Próximos Passos Após V1

1. Revisar feedback dos primeiros clientes
2. Priorizar funcionalidades da V2 baseado em demanda real
3. Considerar ajustes na arquitetura se necessário para escalar
4. Avaliar funcionalidades avançadas (dashboards, automações, integrações)

---

## Referências

- **Roadmap por Versões**: `Features/meu_projeto/Roadmap-versoes-CRM-SaaS.md`
- **Roadmap Detalhado V1**: `Features/meu_projeto/v1/Roadmap-V1.md`
- **Decisões de Stack**: `Features/meu_projeto/v1/Decisao-Stack-V1.md`
- **Fase 1 (Infraestrutura)**: `Features/meu_projeto/v1/fases/Fase-01-Preparacao-de-ambiente-e-infraestrutura-base.md`
