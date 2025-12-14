# Fase 12 – Validação, testes e prontidão comercial

## Objetivo da Fase
Validar o V1 de ponta a ponta e estabelecer critérios de prontidão comercial: isolamento multi-tenant, segurança básica, desempenho aceitável, documentação mínima e operação (monitoramento e backup) apta a suportar os primeiros clientes pagantes.

## Procedimentos
- Definir e executar validação de **multi-tenant**:
  - Cenários de “cross-tenant” (tentativas de acesso indevido)
  - Verificação de isolamento em consultas e mutações
  - Verificação de isolamento em importação/exportação
- Definir e executar validação de **autenticação e autorização**:
  - Login/logout
  - Reset/alteração de senha
  - ACL por objeto e por campo
  - Rate limiting em endpoints sensíveis
- Definir e executar validação funcional (E2E) do CRM:
  - CRUD de Contatos/Empresas
  - Leads → conversão → Oportunidades
  - Pipeline configurável
  - Tarefas/Notas e Timeline por registro
  - Busca global e filtros avançados
  - Importação e exportação
- Definir e executar validação de performance mínima:
  - Listagens com volume moderado
  - Aplicação de filtros
  - Importações em tamanho típico
- Preparar documentação mínima para venda:
  - Guia rápido do usuário (fluxos principais)
  - Orientações de importação/exportação
  - FAQ de problemas comuns
- Preparar documentação técnica mínima (para governança interna):
  - Arquitetura multi-tenant (decisão e garantias)
  - Matriz de permissões (roles/ACL)
  - Plano de backup/restore e teste de restore
- Preparar operação:
  - Monitoramento de erros críticos
  - Logs com escopo de tenant/user
  - Health checks
  - Processo de deploy (staging → produção)
  - Runbook mínimo de incidentes
- Definir checklist de “go/no-go” comercial e executar revisão final.

## Decisões Técnicas

### Decisão 1 — Estratégia de testes no V1 (níveis e prioridade)
- **O que está sendo decidido**: Quais tipos de teste são obrigatórios para vender com segurança.
- **Alternativas consideradas**:
  - (A) Predominantemente manual
  - (B) Automatização balanceada (smoke + E2E críticos)
  - (C) Cobertura extensiva automatizada
- **Decisão tomada**: **(B)**.
- **Justificativa objetiva**: V1 vendável precisa reduzir risco; cobertura “extensiva” costuma ser inviável no prazo do MVP.

### Decisão 2 — Critérios mínimos de performance
- **O que está sendo decidido**: Quais metas mínimas devem ser cumpridas para vender.
- **Alternativas consideradas**:
  - (A) Sem metas explícitas no V1
  - (B) Metas simples por fluxo (listagem, filtro, importação)
- **Decisão tomada**: **(B)**.
- **Justificativa objetiva**: Sem metas, suporte vira gargalo e a venda inicial sofre com percepção de qualidade.

### Decisão 3 — Operação e incidentes (runbook e alertas)
- **O que está sendo decidido**: O que precisa existir para operar o produto com clientes pagantes.
- **Alternativas consideradas**:
  - (A) Operação reativa sem runbook
  - (B) Runbook mínimo + alertas críticos
- **Decisão tomada**: **(B)**.
- **Justificativa objetiva**: Venda exige confiabilidade e capacidade de resposta.

### Decisão 4 — Backup e restore como requisito de venda
- **O que está sendo decidido**: Se o restore deve ser testado antes de vender.
- **Alternativas consideradas**:
  - (A) Backups “configurados”, sem teste
  - (B) Backups + teste de restore (obrigatório)
- **Decisão tomada**: **(B)**.
- **Justificativa objetiva**: Sem teste de restore não há garantia real de recuperação; risco comercial alto.

## Tecnologias Selecionadas
- **Automação de testes (categoria)**:
  - Suite de testes de API/integrados
  - Suite de testes E2E para fluxos críticos
- **Observabilidade**:
  - Logs estruturados com `tenant_id`, `user_id`, `request_id`
  - Métricas e alertas para erros críticos e disponibilidade
- **Monitoramento/Health checks**: endpoints e checks para ambiente produtivo.
- **Backup automatizado**: solução do provedor ou mecanismo dedicado, com retenção definida.

## Pré-requisitos para Avançar
> Esta é a fase final do V1. O “avançar” aqui significa **autorizar comercialização**.

- [ ] Testes de isolamento multi-tenant aprovados (sem vazamento)
- [ ] Autenticação, ACL por objeto/campo e rate limiting validados
- [ ] Fluxos E2E do CRM aprovados (cadastros, funil, atividades, busca, import/export)
- [ ] Metas mínimas de performance atingidas (conforme definidas)
- [ ] Documentação mínima de usuário pronta (guia + import/export)
- [ ] Documentação técnica mínima pronta (arquitetura + permissões + backup)
- [ ] Monitoramento e alertas críticos ativos
- [ ] Backup configurado e restore testado
- [ ] Processo de deploy e runbook mínimo definidos
- [ ] Checklist de go/no-go aprovado por produto e engenharia


