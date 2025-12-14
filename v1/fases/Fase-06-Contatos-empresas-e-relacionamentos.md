# Fase 6 – Contatos, empresas e relacionamentos

## Objetivo da Fase
Entregar o núcleo de cadastros do CRM no V1: contatos (pessoas) e empresas/contas, incluindo relacionamento pessoa↔empresa, múltiplos meios de contato, endereços, metadados e tags.

## Procedimentos
- Definir o conjunto de campos mínimos do V1 para:
  - Contato
  - Empresa/conta
- Definir o relacionamento entre pessoas e organizações:
  - Cardinalidade (1:N vs N:N)
  - Regras de ownership (se houver) e permissões (via ACL)
- Definir estrutura de endereços (campos e validações).
- Definir modelo de múltiplos meios de contato:
  - Emails/telefones por tipo (Work/Home/Other)
- Definir o identificador único (padrão do produto) e onde ele é exposto.
- Definir tags para categorização:
  - Escopo por tenant
  - Regras de cor (quando aplicável)
  - Reuso entre entidades (se permitido no V1)
- Definir validações mínimas de qualidade (formatos básicos e unicidade quando aplicável).

## Decisões Técnicas

### Decisão 1 — Cardinalidade pessoa ↔ empresa
- **O que está sendo decidido**: Se um contato pode pertencer a múltiplas empresas no V1.
- **Alternativas consideradas**:
  - (A) 1 contato → 1 empresa (1:N)
  - (B) 1 contato → N empresas (N:N)
- **Decisão tomada**: **N:N** como preferencial para CRM genérico.
- **Justificativa objetiva**: CRMs reais lidam com consultores, parceiros e múltiplas relações; limitar pode travar adoção.

### Decisão 2 — Modelo de emails/telefones por tipo
- **O que está sendo decidido**: Estrutura para múltiplos meios por contato.
- **Alternativas consideradas**:
  - (A) Campos fixos (email1, email2)
  - (B) Lista de meios com tipo (Work/Home/Other)
- **Decisão tomada**: **Lista com tipo**.
- **Justificativa objetiva**: Evita rigidez e atende diretamente ao escopo V1.

### Decisão 3 — Tags (escopo e governança)
- **O que está sendo decidido**: Como garantir consistência de tags em um tenant.
- **Alternativas consideradas**:
  - (A) Tags livres por registro (string solta)
  - (B) Catálogo de tags por tenant
- **Decisão tomada**: **Catálogo de tags por tenant**.
- **Justificativa objetiva**: Evita explosão de variações e melhora busca/filtros.

## Tecnologias Selecionadas
- **Persistência relacional**: integridade de relacionamento contato↔empresa e catálogo de tags por tenant.
- **Validações**: regras de formato e unicidade por tenant para evitar sujeira de dados.
- **Indexação**: índices por `tenant_id` + campos de listagem (nome, email, empresa).

## Pré-requisitos para Avançar
- [ ] Campos mínimos de Contato e Empresa definidos
- [ ] Cardinalidade pessoa↔empresa decidida e documentada
- [ ] Modelo de emails/telefones por tipo definido
- [ ] Estrutura de endereços definida
- [ ] Catálogo de tags por tenant definido (incluindo cores quando aplicável)
- [ ] Validações mínimas acordadas (formato e unicidade onde necessário)


