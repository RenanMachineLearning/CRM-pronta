# Templates de Importação

## Visão Geral

Templates de importação são arquivos modelo pré-configurados que facilitam a importação de dados para entidades específicas do CRM. Eles definem a estrutura esperada dos dados, incluindo os campos obrigatórios e seus tipos, ajudando os usuários a prepararem arquivos de importação corretamente.

---

## Endpoint de Templates

### GET /api/import/templates/:entityType

Retorna um template de importação para a entidade especificada. O template é fornecido como arquivo CSV ou Excel com os cabeçalhos dos campos da entidade.

#### Autenticação

Requerida. Enviar token JWT e tenant:

```
Authorization: Bearer <token>
X-Tenant-Id: <tenant-id>
```

#### Parâmetros de Rota

| Parâmetro    | Tipo   | Obrigatório | Descrição                                                      |
|--------------|--------|-------------|----------------------------------------------------------------|
| `entityType` | string | Sim         | Entidade para a qual gerar o template: `Contact`, `Company`, `Lead`, `Opportunity` |

#### Parâmetros de Query

| Parâmetro | Tipo   | Obrigatório | Descrição                                                     |
|-----------|--------|-------------|---------------------------------------------------------------|
| `format`  | string | Não         | Formato do template: `csv` (padrão) ou `excel` (xlsx)         |
| `includeRequiredOnly` | boolean | Não | Se verdadeiro, inclui apenas campos obrigatórios (padrão: false) |

#### Resposta 200 OK

Corpo é o **arquivo binário** (CSV ou XLSX) com os cabeçalhos dos campos da entidade. Headers:

| Header              | Valor                                                                 |
|---------------------|-----------------------------------------------------------------------|
| `Content-Disposition` | `attachment; filename="template-{entityType}.{format}"` |
| `Content-Type`      | `text/csv; charset=utf-8` ou `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

#### Erros

| Código | Condição |
|--------|----------|
| 400    | `entityType` inválido |
| 400    | `format` inválido |
| 401    | Token ausente ou inválido |
| 403    | Sem permissão para acessar templates ou tenant não autorizado |
| 500    | Erro interno ao gerar template |

---

## Tipos de Templates

### Template Básico

Contém apenas os campos mais comuns e obrigatórios da entidade:

**Exemplo para Contact:**
```
firstName,lastName,email,phone
,
```

### Template Completo

Contém todos os campos padrão da entidade (exceto campos de sistema como createdAt, updatedAt):

**Exemplo para Contact:**
```
id,firstName,lastName,email,phone,company,jobTitle,address,city,state,country,zipCode,notes,status,createdAt,updatedAt
,,,,,,,,,,,,,,,
```

### Template Personalizado

Além dos campos padrão, inclui campos personalizados definidos pelo tenant:

**Exemplo para Contact com campos personalizados:**
```
firstName,lastName,email,customField1,customField2
,,,,,
```

---

## Campos Disponíveis por Entidade

### Contact
- `id` (somente leitura, gerado automaticamente)
- `firstName` (texto, obrigatório)
- `lastName` (texto)
- `email` (email, único por tenant)
- `phone` (telefone)
- `company` (texto)
- `jobTitle` (texto)
- `address` (texto)
- `city` (texto)
- `state` (texto)
- `country` (texto)
- `zipCode` (texto)
- `notes` (texto longo)
- `status` (seleção: active, inactive, prospect)
- `createdAt` (somente leitura)
- `updatedAt` (somente leitura)

### Company
- `id` (somente leitura)
- `name` (texto, obrigatório)
- `website` (URL)
- `industry` (texto)
- `size` (número)
- `address` (texto)
- `city` (texto)
- `state` (texto)
- `country` (texto)
- `zipCode` (texto)
- `phone` (telefone)
- `notes` (texto longo)
- `status` (seleção: active, inactive, prospect)
- `createdAt` (somente leitura)
- `updatedAt` (somente leitura)

### Lead
- `id` (somente leitura)
- `firstName` (texto, obrigatório)
- `lastName` (texto)
- `email` (email)
- `phone` (telefone)
- `company` (texto)
- `source` (texto, origem do lead)
- `status` (seleção: new, contacted, qualified, converted, lost)
- `notes` (texto longo)
- `converted` (booleano, somente leitura após conversão)
- `convertedAt` (datetime, somente leitura após conversão)
- `convertedToContactId` (ID, somente leitura após conversão)
- `convertedToOpportunityId` (ID, somente leitura após conversão)
- `createdAt` (somente leitura)
- `updatedAt` (somente leitura)

### Opportunity
- `id` (somente leitura)
- `name` (texto, obrigatório)
- `value` (moeda)
- `currency` (texto, padrão: BRL)
- `stage` (seleção, baseado no pipeline do tenant)
- `status` (seleção: open, won, lost, archived)
- `closeDate` (data)
- `probability` (porcentagem, 0-100)
- `contactId` (ID de Contact existente)
- `companyId` (ID de Company existente)
- `leadId` (ID de Lead existente, se convertido de lead)
- `notes` (texto longo)
- `createdAt` (somente leitura)
- `updatedAt` (somente leitura)

---

## Geração de Templates

### Automática

O sistema gera automaticamente templates com base na definição da entidade e seus campos. Isso inclui:

- Campos padrão da entidade
- Campos personalizados definidos pelo tenant
- Tipos de dados apropriados
- Indicação de campos obrigatórios

### Personalizada

Administradores podem criar templates personalizados com campos específicos para necessidades especiais:

- Campos específicos de setor
- Campos condicionais
- Campos com valores padrão

---

## Boas Práticas para Templates

### Para Campos Obrigatórios

- Sempre inclua campos marcados como obrigatórios
- Forneça exemplos de valores válidos
- Inclua instruções sobre formato esperado

### Para Campos de Relacionamento

- Inclua campos que representam IDs de entidades relacionadas
- Forneça instruções sobre como obter IDs válidos
- Considere incluir campos de lookup alternativos (como nome de empresa em vez de companyId)

### Para Campos Personalizados

- Inclua todos os campos personalizados relevantes
- Forneça descrições claras do propósito de cada campo
- Inclua opções válidas para campos de seleção

### Para Campos de Sistema

- Não inclua campos como `id`, `createdAt`, `updatedAt` para edição
- Explique que esses campos são gerenciados automaticamente pelo sistema

---

## Exemplos de Templates

### Template de Contato Básico

```
firstName,lastName,email,phone
João,Silva,joao.silva@empresa.com,(11) 99999-9999
Maria,Santos,maria.santos@empresa.com,(21) 98888-8888
```

### Template de Empresa com Campos Opcionais

```
name,website,industry,size,phone
Empresa ABC,https://empresaabc.com,Tecnologia,50,(11) 3333-3333
XYZ Ltda,https://xyz.com.br,Varejo,25,(21) 4444-4444
```

### Template de Lead com Status

```
firstName,lastName,email,company,source,status
Carlos,Oliveira,carlos@cliente.com,Cliente SA,Website,new
Ana,Pereira,ana@outrocliente.com,Outro LTDA,Indicação,qualified
```

---

## Validação de Templates

### Validação de Estrutura

- Verificação de cabeçalhos válidos
- Confirmação de campos obrigatórios presentes
- Verificação de campos inexistentes

### Validação de Tipos

- Confirmação de tipos de dados apropriados
- Validação de formatos específicos (email, telefone, etc.)
- Verificação de valores permitidos para campos de seleção

### Validação de Relacionamentos

- Verificação de IDs de entidades relacionadas
- Confirmação de existência de registros referenciados
- Validação de integridade referencial

---

## Personalização de Templates

### Por Perfil de Usuário

Templates podem ser personalizados com base nas permissões do usuário:

- Campos visíveis baseados em permissões de leitura
- Campos editáveis baseados em permissões de escrita
- Campos ocultos para usuários sem permissão

### Por Departamento/Setor

Templates específicos podem ser criados para diferentes áreas:

- Vendas: Campos focados em oportunidades e leads
- Marketing: Campos focados em fontes e campanhas
- Atendimento: Campos focados em histórico e notas

### Por Integração

Templates podem ser adaptados para facilitar integrações com outros sistemas:

- Campos mapeados para campos de sistemas externos
- Formatos específicos para integrações
- Scripts de transformação incluídos

---

## Atualização de Templates

### Quando Atualizar

- Adição/remoção de campos personalizados
- Mudanças nas regras de negócio
- Atualizações na estrutura de entidades
- Feedback de usuários sobre dificuldades

### Processo de Atualização

- Notificação de usuários sobre mudanças
- Manutenção de versões anteriores por um período
- Testes de compatibilidade com dados existentes
- Atualização gradual para novos templates

---

## Segurança e Permissões

### Acesso a Templates

- Acesso restrito por tenant
- Permissões baseadas em papéis (roles)
- Registro de acesso e uso

### Conteúdo Sensível

- Campos sensíveis não incluídos em templates
- Ocultação de campos com base em ACL
- Validação de permissões antes da geração