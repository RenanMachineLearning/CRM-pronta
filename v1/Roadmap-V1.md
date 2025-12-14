# Roadmap detalhado — Versão 1 (MVP Vendável)

> **Fonte única da verdade**: `Features/meu_projeto/Roadmap-versoes-CRM-SaaS.md`  
> Este documento detalha as fases de execução da V1, definindo ordem, decisões e entregas necessárias para um CRM SaaS multi-tenant vendável.

## Visão geral da V1

**Objetivo**: Entregar um CRM SaaS utilizável e vendável para operação básica de vendas, com autenticação, gestão de usuários e isolamento multi-tenant desde o início.

**Critérios de prontidão comercial**:
- Sistema multi-tenant operacional com isolamento de dados
- Autenticação e autorização funcionais
- CRUD completo de contatos, empresas, leads e oportunidades
- Pipeline de vendas configurável
- Busca e filtros operacionais
- Importação/exportação de dados básica
- Interface responsiva e utilizável

---

## Fase 1 – Preparação de ambiente e infraestrutura base

**Objetivo da fase**: Estabelecer ambiente de desenvolvimento, definir stack técnica, configurar repositórios e preparar infraestrutura mínima para suportar SaaS multi-tenant.

**O que deve ser definido ou preparado**:
- Stack tecnológica (frontend, backend, banco de dados, linguagens)
- Estrutura de repositórios (monorepo vs multi-repo)
- Ambiente de desenvolvimento local (Docker, docker-compose ou equivalente)
- Ambiente de staging e produção (provedor cloud, configuração inicial)
- CI/CD básico (pipelines de build, test, deploy)
- Estrutura de branches e fluxo de trabalho (Git Flow ou similar)
- Configuração de variáveis de ambiente e secrets management
- Logging e monitoramento básico (estrutura, não implementação completa)
- Documentação de setup para desenvolvedores

**Decisões técnicas ou de produto envolvidas**:
- Escolha de banco de dados (relacional vs NoSQL, considerando multi-tenant)
- Estratégia de deploy (containers, serverless, VMs)
- Estratégia de versionamento de API (se houver API na V1)
- Política de backup e disaster recovery mínima
- Escolha de provedor cloud e região(s) inicial(is)

**Resultado esperado ao final da fase**:
- Ambiente de desenvolvimento funcional para toda a equipe
- Pipeline de CI/CD básico rodando
- Infraestrutura de staging disponível
- Documentação de setup e processos iniciais

---

## Fase 2 – Estrutura SaaS e multi-tenant

**Objetivo da fase**: Implementar a arquitetura multi-tenant que garante isolamento de dados, contexto de tenant e suporta operação SaaS desde o início.

**O que deve ser definido ou preparado**:
- Modelo de isolamento de dados (schema por tenant, row-level security, ou banco separado)
- Estrutura de tabelas/coleções para tenants (tabela `tenants` ou equivalente)
- Middleware ou camada de contexto de tenant (identificação do tenant por subdomínio, header, ou path)
- Estratégia de roteamento de requisições por tenant
- Migrações de schema que respeitam multi-tenant (aplicação por tenant ou global)
- Políticas de isolamento em nível de banco de dados (constraints, índices, queries)
- Estrutura de dados para configurações por tenant (settings, customizações)
- Seed data inicial (tenant de exemplo, dados de demonstração)

**Decisões técnicas ou de produto envolvidas**:
- Escolha do modelo de isolamento (trade-off entre segurança, performance e complexidade)
- Estratégia de identificação de tenant (subdomínio, custom domain, header)
- Política de nomes de tenant (slug, UUID, subdomínio)
- Limites e quotas por tenant (se houver na V1)
- Estratégia de backup/restore por tenant (se aplicável)

**Resultado esperado ao final da fase**:
- Sistema capaz de criar e gerenciar múltiplos tenants
- Isolamento de dados garantido (testes de isolamento passando)
- Contexto de tenant disponível em todas as requisições
- Seed data e tenant de demonstração funcionais

---

## Fase 3 – Autenticação e gestão de sessão

**Objetivo da fase**: Implementar autenticação segura, gestão de sessão e tokens, garantindo que usuários acessem apenas dados do seu tenant.

**O que deve ser definido ou preparado**:
- Modelo de dados de usuários (vinculado a tenant)
- Fluxo de login/logout
- Geração e validação de tokens de autenticação (JWT ou equivalente)
- Gestão de sessão (armazenamento, expiração, renovação)
- Middleware de autenticação (validação de token em todas as rotas protegidas)
- Integração de autenticação com contexto de tenant (usuário só acessa seu tenant)
- Rate limiting / throttling (proteção contra brute force e abuso)
- Recuperação/reset de senha (fluxo completo: solicitação, token, redefinição)
- Alteração de senha (requer senha atual)
- Política de senhas (complexidade mínima, se houver na V1)

**Decisões técnicas ou de produto envolvidas**:
- Estratégia de tokens (JWT stateless vs session tokens)
- Duração de sessão e política de refresh
- Estratégia de rate limiting (por IP, por usuário, por tenant)
- Fluxo de recuperação de senha (email obrigatório, SMS opcional)
- Política de bloqueio de conta após tentativas falhas (se houver na V1)

**Resultado esperado ao final da fase**:
- Usuários conseguem fazer login/logout
- Tokens de autenticação funcionais e seguros
- Sessões isoladas por tenant
- Recuperação de senha operacional
- Rate limiting ativo

---

## Fase 4 – Gestão de usuários e controle de acesso (ACL)

**Objetivo da fase**: Implementar gestão de usuários, roles/funções e controle de acesso granular (objeto e campo), garantindo governança básica.

**O que deve ser definido ou preparado**:
- Modelo de dados de usuários (perfil, informações pessoais, vinculação a tenant)
- CRUD de usuários (criação, edição, listagem, exclusão)
- Modelo de roles/funções (Admin, Vendedor, Visualizador, etc.)
- Sistema de permissões por objeto (ex.: usuário pode criar Contato, mas não deletar)
- Sistema de permissões por campo (ex.: usuário pode ver campo "Valor", mas não editar)
- Associação de usuários a roles
- Herança de permissões (se houver na V1)
- Conta do usuário / perfil (edição de perfil próprio)
- Middleware de autorização (validação de permissões em cada ação)
- Auditoria de alterações (registro de quem criou/editou/deletou cada registro)

**Decisões técnicas ou de produto envolvidas**:
- Conjunto de roles padrão na V1 (Admin, Vendedor, Visualizador, etc.)
- Permissões padrão por role
- Estratégia de herança de permissões (se houver)
- Granularidade de auditoria (todos os campos ou apenas mudanças significativas)
- Política de exclusão de usuários (soft delete vs hard delete)

**Resultado esperado ao final da fase**:
- Usuários podem ser criados, editados e gerenciados
- Roles e permissões funcionais
- Controle de acesso por objeto e campo operacional
- Auditoria de alterações registrando autoria
- Perfil do usuário editável

---

## Fase 5 – Modelo de dados e entidades personalizáveis

**Objetivo da fase**: Implementar sistema de objetos/entidades e campos personalizáveis que suporta evolução do schema e relacionamentos entre entidades.

**O que deve ser definido ou preparado**:
- Sistema de metadados de entidades (definição de objetos: Contato, Empresa, Lead, Oportunidade, etc.)
- Sistema de campos personalizáveis (tipos: texto, número, data, lookup, etc.)
- Relacionamentos entre entidades (1:N, N:N, se houver na V1)
- Validação de atributos únicos
- Lookup de entidades (seleção de registros relacionados)
- Opções de atributos (valores pré-definidos para campos)
- Evolução do schema/workspace (sistema de migrações que suporta customizações)
- Índices para otimizar busca (estratégia de indexação por campo/entidade)

**Decisões técnicas ou de produto envolvidas**:
- Conjunto de entidades core na V1 (Contato, Empresa, Lead, Oportunidade, Tarefa, Nota)
- Tipos de campo suportados na V1 (texto, número, data, boolean, lookup, select)
- Estratégia de armazenamento de campos customizados (colunas dinâmicas vs EAV vs JSON)
- Política de remoção de campos customizados (soft delete, migração de dados)
- Limites de customização (número máximo de campos por entidade, se houver)

**Resultado esperado ao final da fase**:
- Entidades core definidas e funcionais
- Campos personalizáveis operacionais
- Relacionamentos entre entidades funcionando
- Lookup de entidades funcionando
- Sistema de migrações suportando evolução do schema

---

## Fase 6 – Contatos, empresas e relacionamentos

**Objetivo da fase**: Implementar CRUD completo de contatos e empresas, com associações, múltiplos meios de contato e metadados.

**O que deve ser definido ou preparado**:
- CRUD de contatos (pessoas)
- CRUD de organizações/empresas/contas
- Associação entre pessoas e organizações (relacionamento N:N ou 1:N)
- Endereços (estrutura de dados, validação básica)
- Múltiplos meios de contato (emails/telefones por tipo: Work, Home, Other)
- Metadados do contato (cargo/título profissional, gênero, background, status)
- Identificador único (UUID ou equivalente)
- Tags para categorização (inclui cores quando aplicável)
- Validação de dados (emails válidos, telefones formatados, etc.)

**Decisões técnicas ou de produto envolvidas**:
- Estrutura de endereços (campos fixos vs flexível)
- Tipos de contato suportados (Work, Home, Other, Mobile, etc.)
- Metadados obrigatórios vs opcionais
- Estratégia de tags (globais por tenant vs por entidade)
- Política de duplicação (detecção básica na V1 ou apenas manual)

**Resultado esperado ao final da fase**:
- Contatos e empresas podem ser criados, editados, listados e deletados
- Associações entre pessoas e empresas funcionando
- Múltiplos emails/telefones por contato
- Tags operacionais
- Validações básicas funcionando

---

## Fase 7 – Leads, oportunidades e pipeline

**Objetivo da fase**: Implementar gestão de leads, conversão em oportunidades e pipeline de vendas configurável.

**O que deve ser definido ou preparado**:
- CRUD de leads
- CRUD de oportunidades/negócios (deals)
- Pipelines/estágios/categorias configuráveis (definição de estágios do funil)
- Status configuráveis (aberto, ganho, perdido, etc.)
- Valor do negócio (campo numérico, moeda)
- Data de fechamento esperada
- Conversão de lead em conta/contato/oportunidade (fluxo de conversão)
- Associação de leads/oportunidades a contatos/empresas
- Validações (valor positivo, data futura, etc.)

**Decisões técnicas ou de produto envolvidas**:
- Pipeline padrão na V1 (quantos estágios, nomes)
- Status padrão (aberto, ganho, perdido, arquivado)
- Estratégia de conversão (cria novos registros ou transforma lead?)
- Campos obrigatórios em lead vs oportunidade
- Política de histórico ao converter lead (manter lead original?)

**Resultado esperado ao final da fase**:
- Leads podem ser criados e gerenciados
- Oportunidades com pipeline configurável funcionando
- Conversão de lead em oportunidade operacional
- Valor e data de fechamento registrados
- Pipeline visualizável (mesmo que apenas em lista inicialmente)

---

## Fase 8 – Tarefas, notas e histórico de atividades

**Objetivo da fase**: Implementar sistema de atividades (tarefas, notas) vinculadas a registros e timeline/histórico.

**O que deve ser definido ou preparado**:
- CRUD de tarefas (com tipos/status configuráveis)
- CRUD de notas
- Editor de notas (formatação básica: texto rico ou markdown)
- Vinculação de notas a registros (contatos, negócios, leads)
- Vinculação de tarefas a registros
- Timeline/histórico de atividades por registro (agregação de tarefas, notas, mudanças)
- Status de tarefas configuráveis (pendente, em andamento, concluída, cancelada)
- Tipos de tarefas configuráveis (ligação, email, reunião, etc.)

**Decisões técnicas ou de produto envolvidas**:
- Tipos de tarefa padrão na V1
- Status de tarefa padrão
- Formato de notas (texto simples, markdown, ou rich text básico)
- Estratégia de timeline (ordenação, filtros, paginação)
- Política de exclusão de atividades (soft delete ou hard delete)

**Resultado esperado ao final da fase**:
- Tarefas podem ser criadas e gerenciadas
- Notas podem ser criadas e vinculadas a registros
- Timeline exibindo histórico de atividades por registro
- Status e tipos de tarefas configuráveis

---

## Fase 9 – Busca, filtros e visualizações

**Objetivo da fase**: Implementar busca global, filtros avançados, ordenação e visualizações básicas (lista, tabela).

**O que deve ser definido ou preparado**:
- Busca global (busca em múltiplas entidades simultaneamente)
- Busca e filtros avançados (filtros por campo, operadores: igual, contém, maior que, etc.)
- Ordenação (por campo, ascendente/descendente)
- Paginação (limite, offset, contagem total)
- Visualizações: lista e tabela (grid básico)
- Filtros por entidade (filtros específicos para Contato, Lead, Oportunidade, etc.)
- Busca tolerante a diacríticos (normalização de texto para busca)

**Decisões técnicas ou de produto envolvidas**:
- Estratégia de busca (full-text search vs busca por campo)
- Campos pesquisáveis por entidade
- Operadores de filtro suportados na V1 (igual, diferente, contém, maior, menor, entre)
- Limite de resultados por página
- Estratégia de performance (índices, cache de queries frequentes)

**Resultado esperado ao final da fase**:
- Busca global funcionando
- Filtros avançados operacionais
- Ordenação e paginação funcionando
- Visualizações de lista e tabela funcionais
- Performance aceitável com volume moderado de dados

---

## Fase 10 – Importação e exportação de dados

**Objetivo da fase**: Implementar importação de dados (CSV/Excel) e exportação (CSV), com validação e mapeamento de campos.

**O que deve ser definido ou preparado**:
- Importação de dados (CSV/Excel e/ou templates)
- Mapeamento de campos (associação de colunas do arquivo com campos do sistema)
- Processamento em lote (importação assíncrona ou síncrona com feedback)
- Validação de dados (tipos, obrigatórios, formatos)
- Relatórios de erro e estatísticas de importação (quantos sucessos, quantos erros, detalhes)
- Exportação de dados (CSV e outros formatos)
- Seleção de campos para exportação
- Filtros aplicados na exportação (exportar apenas registros filtrados)

**Decisões técnicas ou de produto envolvidas**:
- Formatos suportados na V1 (CSV, Excel XLSX, ou ambos)
- Tamanho máximo de arquivo de importação
- Estratégia de processamento (síncrono vs assíncrono com notificação)
- Política de tratamento de erros (parar na primeira falha vs continuar e reportar)
- Estratégia de deduplicação na importação (detectar duplicatas ou apenas avisar)

**Resultado esperado ao final da fase**:
- Importação de CSV/Excel funcionando
- Mapeamento de campos operacional
- Validação e relatórios de erro funcionando
- Exportação de dados em CSV funcionando
- Processo de importação/exportação documentado

---

## Fase 11 – Interface responsiva e tratamento de estados

**Objetivo da fase**: Implementar interface web responsiva, tratamento de estados (loading, erro) e modo mobile básico.

**O que deve ser definido ou preparado**:
- Interface responsiva (adaptação a diferentes tamanhos de tela)
- Modo mobile (layout otimizado para telas pequenas)
- Tratamento de estados (loading, erro, sucesso, vazio)
- Loading states e skeletons (indicadores visuais durante carregamento)
- Mensagens de erro amigáveis
- Navegação e estrutura de menus
- Formulários responsivos
- Tabelas/listas responsivas (scroll horizontal ou adaptação em mobile)

**Decisões técnicas ou de produto envolvidas**:
- Breakpoints de responsividade (mobile, tablet, desktop)
- Estratégia de loading (skeletons vs spinners)
- Política de mensagens de erro (técnicas vs amigáveis)
- Estrutura de navegação (menu lateral, topo, ou ambos)
- Priorização de funcionalidades em mobile (quais features são essenciais)

**Resultado esperado ao final da fase**:
- Interface funcionando bem em desktop, tablet e mobile
- Estados de loading e erro tratados adequadamente
- Navegação clara e intuitiva
- Formulários e listas responsivos

---

## Fase 12 – Validação, testes e preparação para comercialização

**Objetivo da fase**: Validar todas as funcionalidades, executar testes end-to-end, preparar documentação e definir critérios de prontidão comercial.

**O que deve ser definido ou preparado**:
- Testes end-to-end das funcionalidades core
- Testes de isolamento multi-tenant (garantir que dados não vazam entre tenants)
- Testes de segurança básicos (autenticação, autorização, rate limiting)
- Testes de performance (tempo de resposta, carga básica)
- Documentação de usuário (guia rápido, FAQ básico)
- Documentação técnica (arquitetura, APIs, se houver)
- Processo de onboarding de novos tenants (criação, configuração inicial)
- Política de suporte inicial (canais, SLA básico)
- Monitoramento e alertas básicos (health checks, erros críticos)
- Backup e restore testados

**Decisões técnicas ou de produto envolvidas**:
- Critérios de aceitação para cada funcionalidade
- Níveis de teste (unitário, integração, E2E)
- Estratégia de monitoramento (logs, métricas, alertas)
- Política de backup (frequência, retenção)
- Processo de deploy em produção (rollout gradual ou big bang)

**Resultado esperado ao final da fase**:
- Todas as funcionalidades validadas e funcionando
- Testes de isolamento e segurança passando
- Documentação básica disponível
- Processo de onboarding de tenants definido
- Sistema pronto para receber primeiros clientes pagantes

---

## Checklist de prontidão comercial da V1

### Infraestrutura e segurança
- [ ] Multi-tenant operacional com isolamento garantido
- [ ] Autenticação e autorização funcionais
- [ ] Rate limiting ativo
- [ ] Backup e restore testados
- [ ] Monitoramento básico configurado

### Funcionalidades core
- [ ] CRUD de contatos e empresas funcionando
- [ ] CRUD de leads e oportunidades funcionando
- [ ] Pipeline configurável operacional
- [ ] Tarefas e notas funcionando
- [ ] Busca e filtros operacionais
- [ ] Importação/exportação funcionando

### Interface e experiência
- [ ] Interface responsiva (desktop, tablet, mobile)
- [ ] Estados de loading/erro tratados
- [ ] Navegação clara e intuitiva

### Qualidade e documentação
- [ ] Testes de isolamento multi-tenant passando
- [ ] Testes de segurança básicos passando
- [ ] Documentação de usuário disponível
- [ ] Processo de onboarding de tenants definido

### Operação
- [ ] Processo de deploy em produção definido
- [ ] Health checks funcionando
- [ ] Logs e monitoramento básicos ativos
- [ ] Política de suporte inicial definida

---

## Notas finais

**Dependências críticas entre fases**:
- Fase 2 (multi-tenant) deve ser concluída antes de qualquer funcionalidade de negócio
- Fase 3 (autenticação) deve ser concluída antes da Fase 4 (ACL)
- Fase 5 (modelo de dados) deve ser concluída antes das Fases 6, 7 e 8
- Fase 9 (busca) pode ser desenvolvida em paralelo com Fase 10 (importação/exportação)

**Riscos e mitigações**:
- **Isolamento multi-tenant**: Testes rigorosos de isolamento desde o início
- **Performance com volume**: Índices e otimizações de query desde a Fase 5
- **Complexidade de customização**: Limitar escopo de customização na V1, evoluir depois

**Próximos passos após V1**:
- Revisar feedback dos primeiros clientes
- Priorizar funcionalidades da V2 baseado em demanda real
- Considerar ajustes na arquitetura se necessário para escalar

