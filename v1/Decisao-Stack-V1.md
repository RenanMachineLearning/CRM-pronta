# Decisão de Stack — V1 (MVP Vendável)

> Referências: `Features/meu_projeto/v1/Roadmap-V1.md` e `Features/meu_projeto/v1/Checklist-Pre-Inicio.md` (linhas 27–33).

## Decisão (recomendada) para começar o projeto

### Frontend
- **Escolha**: **React + TypeScript** (aplicação web responsiva)
- **Por quê (objetivo e direto)**:
  - A V1 exige muitas telas de CRUD (Contatos, Empresas, Leads, Oportunidades, Tarefas, Notas), tabelas/listas e formulários; React + TS entrega produtividade e consistência.
  - TypeScript reduz ambiguidade em modelos de dados e contratos (import/export, filtros e paginação), o que diminui retrabalho.

### Backend
- **Escolha**: **Node.js + TypeScript** (API HTTP em estilo REST)
- **Por quê (objetivo e direto)**:
  - A V1 precisa de **multi-tenant**, **ACL/permissões por objeto/campo**, **auditoria**, **importação em lote** e **busca/filtros**. Um backend tipado ajuda a manter governança e regras consistentes.
  - É uma stack prática para evoluir incrementalmente (fases 1–12) com ciclos curtos e menor atrito de produtividade.

### Banco de dados
- **Escolha**: **PostgreSQL**
- **Por quê (objetivo e direto)**:
  - O roadmap da V1 depende de integridade e consistência (multi-tenant com `tenant_id`, relacionamentos, unicidade por tenant, auditoria e migrações).
  - PostgreSQL é forte em modelagem relacional, índices e consultas necessárias para busca/filtros/ordenação/paginação e import/export.

### Runtime/Deploy
- **Escolha**: **Docker** (local) + **containers** (staging/produção depois)
- **Como usar no seu plano**:
  - Até os estágios finais do V1: **ambiente local com Docker** para reduzir diferença entre máquinas e acelerar onboarding.
  - Nos últimos estágios da V1 (preparação para comercialização): subir **staging** e depois **produção** em nuvem com a mesma unidade de deploy (container), para reduzir risco operacional.

---

## Como preencher o `Checklist-Pre-Inicio.md` (linhas 27–33)

Marque assim:
- **Frontend**: React + TypeScript
- **Backend**: Node.js + TypeScript (API HTTP/REST)
- **Banco de dados**: PostgreSQL (definir versão quando escolher o ambiente)
- **Runtime/Deploy**: Docker (local) + containers para staging/produção posteriormente

---

## Validações mínimas antes de “fechar” a decisão (sem travar o início)

Para evitar atrito mais tarde, valide rapidamente:
- **Multi-tenant**: o modelo escolhido precisa suportar isolamento por `tenant_id` de forma consistente (o stack acima suporta).
- **Migrações**: confirmar que o time vai usar uma estratégia de migrações no DB desde o início (coerente com o roadmap).
- **Observabilidade mínima**: logs estruturados com `tenant_id`, `user_id` e `request_id` (já previsto no seu material).

Se você concordar com essa stack, o próximo passo natural é iniciar a **Fase 1** do `Roadmap-V1.md` já com essas escolhas registradas.


