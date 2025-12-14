# Checklist pré-início — V1

> **Quando usar**: Antes de iniciar a **Fase 1** do roadmap.  
> **Objetivo**: Validar que todas as condições necessárias para começar o desenvolvimento estão atendidas.

## Status do checklist

Marque cada item como concluído antes de iniciar a Fase 1. Itens não concluídos devem ser resolvidos ou ter plano de ação definido.

---

## 1. Decisões estratégicas e de produto

### Escopo e objetivos
- [x] Escopo da V1 validado e alinhado com stakeholders
- [ ] Objetivos comerciais da V1 definidos (o que torna o produto vendável)
- [x] Critérios de prontidão comercial da V1 acordados
- [x] Roadmap de versões (V1, V2, V3) revisado e aprovado

### Modelo de negócio
- [x] Modelo de pricing definido (se aplicável ao V1)
- [x] Estratégia de go-to-market inicial definida
- [x] Processo de onboarding de clientes definido (manual vs self-serve)

---

## 2. Decisões técnicas fundamentais

### Stack tecnológica
- [ ] **Frontend**: Tecnologia escolhida (React, Vue, Angular, etc.)
- [ ] **Backend**: Linguagem/framework escolhido (Node.js, Python, Go, etc.)
- [ ] **Banco de dados**: Tipo escolhido (PostgreSQL, MySQL, etc.) e versão
- [ ] **Runtime/Deploy**: Estratégia definida (containers, serverless, VMs)

### Infraestrutura
- [ ] **Provedor cloud**: Escolhido (AWS, GCP, Azure, etc.)
- [ ] **Região inicial**: Definida (considerando latência e compliance)
- [ ] **Ambientes**: Estratégia de ambientes definida (local, staging, produção)
- [ ] **CI/CD**: Plataforma escolhida (GitHub Actions, GitLab CI, Jenkins, etc.)

### Segurança e compliance
- [ ] **Gestão de segredos**: Solução escolhida (Secret Manager, Vault, etc.)
- [ ] **Política de backup**: Estratégia definida (frequência, retenção, restore)
- [ ] **Compliance**: Requisitos legais identificados (LGPD, GDPR, etc.) e plano de atendimento

---

## 3. Time e organização

### Estrutura do time
- [x] **Roles definidos**: Quem faz o quê (dev, arquiteto, product, ops)
- [x] **Responsabilidades**: Matriz de responsabilidades clara
- [x] **Disponibilidade**: Time alocado e disponibilidade confirmada

### Processos
- [x] **Fluxo de trabalho**: Git Flow ou similar definido
- [x] **Code review**: Processo de revisão definido
- [x] **Definition of Done**: Critérios de aceite definidos
- [x] **Comunicação**: Canais e frequência de sincronização definidos

---

## 4. Ambiente e ferramentas

### Repositório e versionamento
- [x] **Repositório criado**: Git repo inicializado
- [x] **Estrutura inicial**: Pastas e organização básica definidas
- [x] **Branches**: Estratégia de branches definida (main, develop, feature, etc.)
- [x] **Convenções**: Padrões de commit e nomenclatura definidos

### Ambiente local
- [ ] **Setup local**: Documentação de como configurar ambiente local
- [ ] **Docker/containers**: Configuração de desenvolvimento local (se aplicável)
- [ ] **Dependências**: Ferramentas necessárias instaladas (Node, Python, DB, etc.)

### Ferramentas de desenvolvimento
- [x] **IDE/Editor**: Ferramentas escolhidas e configuradas
- [ ] **Linting/Formatting**: Ferramentas e configurações definidas
- [ ] **Testes**: Estrutura de testes definida (framework, cobertura mínima)

---

## 5. Documentação e conhecimento

### Documentação técnica
- [x] **Roadmap V1**: Revisado e aprovado
- [x] **Fases detalhadas**: Todas as 12 fases revisadas
- [x] **Decisões arquiteturais**: Documentadas (ver `Decisoes-Arquiteturais-Consolidadas.md`)
- [ ] **Modelo de dados**: Conceitual definido (ver `Modelo-de-Dados-Conceitual.md`)

### Onboarding
- [x] **Guia de setup**: Documentação de como começar a desenvolver
- [x] **Glossário**: Termos técnicos e de domínio documentados (se aplicável)
- [ ] **Arquitetura**: Visão geral da arquitetura documentada

---

## 6. Acesso e permissões

### Infraestrutura
- [x] **Cloud**: Conta criada e acesso configurado
- [x] **Ambientes**: Acesso a staging e produção configurado (quando aplicável)
- [x] **Secrets**: Acesso a gestão de segredos configurado

### Serviços externos
- [ ] **Email transacional**: Conta/configuração para envio de emails (reset de senha, etc.)
- [ ] **Monitoramento**: Acesso a ferramentas de observabilidade configurado
- [ ] **CI/CD**: Acesso e permissões configuradas

---

## 7. Riscos e dependências

### Riscos identificados
- [ ] **Riscos técnicos**: Listados e mitigações definidas
- [ ] **Riscos de produto**: Listados e planos de contingência definidos
- [ ] **Riscos de time**: Identificados e tratados

### Dependências externas
- [ ] **APIs externas**: Identificadas e acesso configurado (se aplicável)
- [ ] **Bibliotecas críticas**: Licenças e compatibilidade verificadas
- [ ] **Serviços de terceiros**: Contratos/acordos estabelecidos (se aplicável)

---

## 8. Validação final

### Revisão geral
- [ ] **Checklist completo**: Todos os itens críticos marcados ou com plano de ação
- [x] **Alinhamento**: Time alinhado sobre escopo, stack e processos
- [x] **Pronto para Fase 1**: Validação final de que é possível iniciar

---

## Itens opcionais (podem ser feitos durante a Fase 1)

- [ ] Documentação de arquitetura detalhada
- [ ] Diagramas de arquitetura (se necessário para alinhamento)
- [ ] Plano de testes detalhado
- [ ] Estratégia de rollout para primeiros clientes
- [ ] Política de suporte inicial

---

## Próximos passos

Após completar este checklist:

1. **Iniciar Fase 1**: Preparação de ambiente e infraestrutura base
2. **Consultar durante execução**:
   - `Decisoes-Arquiteturais-Consolidadas.md` para referência rápida de decisões
   - `Modelo-de-Dados-Conceitual.md` para entender entidades e relacionamentos
   - `Roadmap-V1.md` para visão geral das fases

---

## Notas

- Itens marcados como concluídos devem ter evidência documentada (ex.: link para repositório, acesso configurado, etc.)
- Itens não concluídos devem ter **plano de ação** e **responsável** definidos antes de iniciar
- Este checklist pode ser revisado e atualizado conforme o projeto evolui

