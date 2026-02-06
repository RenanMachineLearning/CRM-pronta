# Índice de Documentação - CRM

Bem-vindo à central de documentação do CRM SaaS. Aqui você encontra todos os guias, referências e tutoriais organizados por categoria.

---

## 📚 Documentação por Perfil

### 👥 Para Usuários Finais

Documentação focada em como usar o sistema, com exemplos visuais e passo a passo.

| Documento | Descrição | Link |
|-----------|-----------|------|
| **Guia do Usuário** | Guia completo em formato visual Storybook | [Acessar](./GUIA-USUARIO.html) |
| Guia de Importação | Como importar dados de planilhas | [Acessar](./Guia-Importacao.md) |
| Guia de Exportação | Como exportar dados do sistema | [Acessar](./Guia-Exportacao.md) |
| Templates de Importação | Modelos de arquivos para importação | [Acessar](./Templates-Importacao.md) |

### 💻 Para Desenvolvedores

Documentação técnica, APIs, componentes e padrões de desenvolvimento.

#### Frontend

| Documento | Descrição | Link |
|-----------|-----------|------|
| **Componentes** | Guia completo dos componentes React | [Acessar](./COMPONENTES.md) |
| **Sistema de Design** | Cores, tipografia, tokens e padrões visuais | [Acessar](./DESIGN-SYSTEM.md) |
| **Breakpoints** | Guia de responsividade e mobile-first | [Acessar](./BREAKPOINTS.md) |
| **Acessibilidade** | Padrões de contraste e acessibilidade | [Acessar](./ACESSIBILIDADE_CONTRASTE.md) |

#### Backend & APIs

| Documento | Descrição | Link |
|-----------|-----------|------|
| API - Autenticação | Login, tokens, sessões | [Acessar](./API-Autenticacao.md) |
| API - ACL | Permissões e controle de acesso | [Acessar](./API-ACL.md) |
| API - Contatos & Empresas | CRUD de contatos e empresas | [Acessar](./API-Contatos-Empresas.md) |
| API - Leads & Oportunidades | Gestão de pipeline | [Acessar](./API-Leads-Oportunidades.md) |
| API - Tarefas & Notas | Atividades e acompanhamento | [Acessar](./API-Tarefas-Notas.md) |
| API - Metadados | Campos customizados | [Acessar](./API-Metadados.md) |
| API - Busca & Filtros | Pesquisa avançada | [Acessar](./API-Busca-Filtros.md) |
| API - Importação | Endpoint de importação | [Acessar](./API-Import.md) |
| API - Exportação | Endpoint de exportação | [Acessar](./API-Export.md) |
| API - Relatórios de Importação | Status e logs de importação | [Acessar](./API-Import-Report.md) |

#### Arquitetura & Setup

| Documento | Descrição | Link |
|-----------|-----------|------|
| Setup do Projeto | Como configurar o ambiente | [Acessar](./SETUP.md) |
| Multi-tenant | Arquitetura multi-tenant | [Acessar](./MULTI-TENANT.md) |

---

## 🎯 Comece Aqui

### Novo no projeto?

1. **[Setup do Projeto](./SETUP.md)** - Configure seu ambiente de desenvolvimento
2. **[Componentes](./COMPONENTES.md)** - Conheça a biblioteca de componentes
3. **[Sistema de Design](./DESIGN-SYSTEM.md)** - Entenda os padrões visuais

### Usuário do sistema?

1. **[Guia do Usuário](./GUIA-USUARIO.html)** - Interface visual com exemplos
2. **[Guia de Importação](./Guia-Importacao.md)** - Importe seus dados

### Desenvolvedor Frontend?

1. **[Componentes](./COMPONENTES.md)** - API e uso dos componentes
2. **[Sistema de Design](./DESIGN-SYSTEM.md)** - Tokens e padrões
3. **[Breakpoints](./BREAKPOINTS.md)** - Responsividade
4. **[Acessibilidade](./ACESSIBILIDADE_CONTRASTE.md)** - Padrões WCAG

### Desenvolvedor Backend?

1. **[APIs](#backend--apis)** - Todas as APIs documentadas
2. **[Multi-tenant](./MULTI-TENANT.md)** - Arquitetura do sistema

---

## 📋 Documentação por Funcionalidade

### Importação & Exportação
- [Guia de Importação](./Guia-Importacao.md)
- [Guia de Exportação](./Guia-Exportacao.md)
- [Templates de Importação](./Templates-Importacao.md)
- [Exemplos de Arquivos](./Exemplos-Arquivos-Importacao.md)
- [Formatação Import/Export](./Formatacao-Import-Export.md)
- [Limites e Restrições](./Limites-Restricoes-Import-Export.md)
- [API Import](./API-Import.md)
- [API Export](./API-Export.md)

### Gestão de Dados
- [Contatos & Empresas](./API-Contatos-Empresas.md)
- [Leads & Oportunidades](./API-Leads-Oportunidades.md)
- [Tarefas & Notas](./API-Tarefas-Notas.md)
- [Metadados & Campos Customizados](./API-Metadados.md)

### Segurança & Acesso
- [Autenticação](./API-Autenticacao.md)
- [ACL & Permissões](./API-ACL.md)

### Busca & Filtros
- [Busca Avançada](./API-Busca-Filtros.md)

---

## 🎨 Design System

### Cores
- **Primária:** Azul (#2563EB) - Ações, links, destaque
- **Sucesso:** Verde (#16A34A) - Confirmações, ativo
- **Erro:** Vermelho (#DC2626) - Erros, exclusões
- **Aviso:** Amarelo (#D97706) - Alertas, pendências
- **Info:** Azul (#2563EB) - Informações

Veja a paleta completa em: [Sistema de Design](./DESIGN-SYSTEM.md)

### Tipografia
- **Fonte:** System font stack
- **Escala:** 12px (xs) → 36px (4xl)
- **Body:** 16px (base)
- **Títulos:** 20px (xl) → 30px (3xl)

### Breakpoints
- **sm:** 640px (mobile grande)
- **md:** 768px (tablet)
- **lg:** 1024px (desktop)
- **xl:** 1280px (desktop grande)

Veja mais em: [Breakpoints](./BREAKPOINTS.md)

---

## 🔧 Comandos Úteis

### Desenvolvimento
```bash
# Iniciar frontend
cd frontend && npm run dev

# Iniciar backend
cd backend && npm run dev

# Rodar testes
cd frontend && npm test
cd backend && npm test

# Build de produção
cd frontend && npm run build
cd backend && npm run build
```

### Docker
```bash
# Iniciar todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

---

## 📖 Como Contribuir com a Documentação

1. **Markdown para documentação técnica** - Use `.md` para guias de API e desenvolvimento
2. **HTML para guias de usuário** - Use `.html` com estilo Storybook para documentação visual
3. **Mantenha atualizado** - Atualize os docs quando alterar funcionalidades
4. **Exemplos práticos** - Sempre inclua exemplos de código ou uso
5. **Imagens** - Guarde screenshots em `docs/screenshots/`

---

## 📞 Suporte

- **Issues:** [GitHub Issues](../../issues)
- **Email:** suporte@exemplo.com
- **Wiki:** Consulte este índice regularmente

---

## 📝 Changelog da Documentação

### 2026-02-05
- ✅ Criado Índice de Documentação
- ✅ Criado Guia de Componentes (dev)
- ✅ Criado Sistema de Design (dev)
- ✅ Criado documentação de Breakpoints (dev)
- ✅ Criado Guia do Usuário em HTML (Storybook style)
- ✅ Atualizado documentação de Acessibilidade

---

**Dica:** Adicione este arquivo aos seus favoritos para acesso rápido à toda documentação!

---

<div align="center">

**[⬆ Voltar ao topo](#índice-de-documentação---crm)**

</div>
