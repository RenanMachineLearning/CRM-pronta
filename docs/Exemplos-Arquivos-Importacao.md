# Exemplos de Arquivos de Importação

## Visão Geral

Esta documentação fornece exemplos práticos de arquivos de importação para diferentes entidades do CRM. Os exemplos demonstram a estrutura correta, formatos de dados aceitos e melhores práticas para preparação dos arquivos.

---

## Exemplos para Contatos

### Exemplo Básico de Contato (CSV)

```csv
firstName,lastName,email,phone
João,Silva,joao.silva@empresa.com,"(11) 99999-9999"
Maria,Santos,maria.santos@empresa.com,"(21) 98888-8888"
Carlos,Oliveira,carlos@cliente.net,"(31) 97777-7777"
Ana,Pereira,ana.pereira@outrocliente.org,"(41) 96666-6666"
Pedro,Lima,pedro.lima@empresa.com,"(51) 95555-5555"
```

### Exemplo Completo de Contato (CSV)

```csv
firstName,lastName,email,phone,company,jobTitle,address,city,state,country,zipCode,notes,status
João,Silva,joao.silva@empresa.com,(11) 99999-9999,Empresa ABC,Gerente de Vendas,Rua Principal, 123,São Paulo,SP,Brasil,01234-567,"Cliente desde 2022",active
Maria,Santos,maria.santos@empresa.com,(21) 98888-8888,XYZ Ltda,Diretora Financeira,Avenida Central, 456,Rio de Janeiro,RJ,Brasil,20000-000,"Excelente relacionamento",active
Carlos,Oliveira,carlos@cliente.net,(31) 97777-7777,Cliente SA,Coordenador de TI,Praça da Liberdade, 789,Belo Horizonte,MG,Brasil,30160-030,"Potencial para upsell",prospect
Ana,Pereira,ana.pereira@outrocliente.org,(41) 96666-6666,Nova Empresa LTDA,Analista de Marketing,Travessa das Flores, 101,Curitiba,PR,Brasil,80000-000,"Contato inicial",prospect
Pedro,Lima,pedro.lima@empresa.com,(51) 95555-5555,Indústria DEF,Engenheiro Eletricista,Acesso dos Pássaros, 202,Porto Alegre,RS,Brasil,90000-000,"Projeto em andamento",inactive
```

### Exemplo com Dados Especiais (CSV)

```csv
firstName,lastName,email,phone,notes,status
José,"Santos Jr.",jose.santos@empresa.com,(11) 94444-4444,"Cliente VIP
Com múltiplos contatos
Última reunião: 15/03/2024",active
Marcela,"dos Santos Oliveira",marcela@cliente.com,(21) 93333-3333,"""Importante para o negócio""
Reuniões semanais
Orçamento: R$ 50.000",active
```

---

## Exemplos para Empresas

### Exemplo Básico de Empresa (CSV)

```csv
name,website,industry,phone
Empresa ABC,https://empresaabc.com,Tecnologia,(11) 3333-3333
XYZ Ltda,https://xyz.com.br,Varejo,(21) 4444-4444
Cliente SA,https://cliente.com,Manufatura,(31) 5555-5555
Nova Empresa LTDA,https://novaempresa.com,Consultoria,(41) 6666-6666
Indústria DEF,https://industria.com,Industrial,(51) 7777-7777
```

### Exemplo Completo de Empresa (CSV)

```csv
name,website,industry,size,address,city,state,country,zipCode,phone,notes,status
Empresa ABC,https://empresaabc.com,Tecnologia,150,"Rua Principal, 123",São Paulo,SP,Brasil,01234-567,(11) 3333-3333,"Parceiro estratégico desde 2020",active
XYZ Ltda,https://xyz.com.br,Varejo,75,"Avenida Central, 456",Rio de Janeiro,RJ,Brasil,20000-000,(21) 4444-4444,"Excelente relacionamento",active
Cliente SA,https://cliente.com,Manufatura,200,"Praça da Liberdade, 789",Belo Horizonte,MG,Brasil,30160-030,(31) 5555-5555,"Potencial para expansão",prospect
Nova Empresa LTDA,https://novaempresa.com,Consultoria,25,"Travessa das Flores, 101",Curitiba,PR,Brasil,80000-000,(41) 6666-6666,"Startup promissora",prospect
Indústria DEF,https://industria.com,Industrial,500,"Acesso dos Pássaros, 202",Porto Alegre,RS,Brasil,90000-000,(51) 7777-7777,"Cliente de longa data",active
```

---

## Exemplos para Leads

### Exemplo Básico de Lead (CSV)

```csv
firstName,lastName,email,company,source,status
Carlos,Oliveira,carlos@cliente.net,Cliente SA,Website,new
Ana,Pereira,ana@outrocliente.org,Nova Empresa LTDA,Indicação,contacted
Roberto,Souza,roberto@empresa.com,Empresa ABC,Redes Sociais,qualified
Fernanda,Lopes,fernanda@cliente.net,XYZ Ltda,Palestra,converted
Maurício,Rodrigues,mauricio@empresa.com,Indústria DEF,Feira de Negócios,lost
```

### Exemplo Completo de Lead (CSV)

```csv
firstName,lastName,email,phone,company,source,status,notes
Carlos,Oliveira,carlos@cliente.net,(31) 97777-7777,Cliente SA,Website,new,"Contato inicial via formulário"
Ana,Pereira,ana@outrocliente.org,(41) 96666-6666,Nova Empresa LTDA,Indicação,contacted,"Recebido via Maria Santos"
Roberto,Souza,roberto@empresa.com,(11) 95555-5555,Empresa ABC,Redes Sociais,qualified,"Interessado em solução premium"
Fernanda,Lopes,fernanda@cliente.net,(21) 94444-4444,XYZ Ltda,Palestra,converted,"Convertido em oportunidade #OPP-2024-001"
Maurício,Rodrigues,mauricio@empresa.com,(51) 93333-3333,Indústria DEF,Feira de Negócios,lost,"Orçamento acima do esperado"
```

---

## Exemplos para Oportunidades

### Exemplo Básico de Oportunidade (CSV)

```csv
name,value,currency,stage,status,probability
Projeto Website,15000.00,BRL,Proposta,won,100
Sistema ERP,75000.00,BRL,Negociação,open,75
Consultoria TI,25000.00,BRL,Qualificação,open,50
Manutenção Servers,5000.00,BRL,Fechamento,lost,0
Treinamento Equipe,12000.00,BRL,Proposta,open,80
```

### Exemplo Completo de Oportunidade (CSV)

```csv
name,value,currency,stage,status,closeDate,probability,contactId,companyId,notes
Projeto Website Redesign,15000.00,BRL,Proposta,won,2024-03-15,100,1,1,"Cliente satisfeito com entrega"
Sistema ERP Corporativo,75000.00,BRL,Negociação,open,2024-06-30,75,2,2,"Aguardando aprovação financeira"
Consultoria Estratégia Digital,25000.00,BRL,Qualificação,open,2024-04-20,50,3,3,"Reunião técnica agendada"
Manutenção Infraestrutura,5000.00,BRL,Fechamento,lost,2024-02-28,0,4,4,"Cliente optou por concorrente"
Treinamento Salesforce,12000.00,BRL,Proposta,open,2024-05-10,80,5,5,"Aguardando decisão do CTO"
```

---

## Formatos de Data Aceitos

### Exemplos de Formatos de Data Válidos

```csv
firstName,lastName,email,startDate,birthDate
João,Silva,joao@empresa.com,2024-01-15,1985-06-20
Maria,Santos,maria@empresa.com,15/01/2024,20/06/1985
Carlos,Oliveira,carlos@empresa.com,01/15/2024,06/20/1985
Ana,Pereira,ana@empresa.com,15-01-2024,20-06-1985
```

---

## Formatos de Números e Moeda

### Exemplos de Formatos Numéricos

```csv
firstName,lastName,salary,discountRate
João,Silva,5500.50,15.5
Maria,Santos,7250.75,12.0
Carlos,Oliveira,4800.00,18.75
Ana,Pereira,6300.25,10.25
```

---

## Exemplo com Campos Personalizados

### Contato com Campos Personalizados

```csv
firstName,lastName,email,segmento,tipo_cliente,vendedor_responsavel,nivel_interesse
João,Silva,joao@empresa.com,Tecnologia,Strategic Account,Carlos Silva,Alto
Maria,Santos,maria@empresa.com,Varejo,Regular Customer,Ana Costa,Médio
Carlos,Oliveira,carlos@cliente.net,Manufatura,New Prospect,Roberto Souza,Baixo
Ana,Pereira,ana@outrocliente.org,Consultoria,Strategic Account,Fernanda Alves,Alto
```

---

## Exemplos de Arquivos Excel (XLSX)

Para arquivos Excel, a estrutura é a mesma, mas com as seguintes considerações:

1. **Primeira linha**: Sempre deve conter os cabeçalhos
2. **Formatação**: Será ignorada durante a importação
3. **Fórmulas**: Serão resolvidas e os valores resultantes importados
4. **Múltiplas planilhas**: Apenas a primeira será processada

### Estrutura Básica de Planilha Excel

| firstName | lastName | email | phone |
|-----------|----------|-------|-------|
| João | Silva | joao@empresa.com | (11) 99999-9999 |
| Maria | Santos | maria@empresa.com | (21) 88888-8888 |
| Carlos | Oliveira | carlos@cliente.net | (31) 77777-7777 |

---

## Melhores Práticas para Preparação de Arquivos

### 1. Estruturação Adequada

- Sempre inclua uma linha de cabeçalhos
- Use nomes de colunas claros e consistentes
- Evite espaços e caracteres especiais nos cabeçalhos
- Prefira underscores (_) em vez de espaços

### 2. Formatação de Dados

- Use UTF-8 como codificação para arquivos CSV
- Padronize formatos de data e número
- Use aspas duplas para campos com vírgulas ou quebras de linha
- Evite fórmulas em arquivos Excel (use valores calculados)

### 3. Limpeza de Dados

- Remova linhas em branco
- Padronize maiúsculas/minúsculas onde apropriado
- Verifique ortografia em campos textuais
- Remova caracteres invisíveis ou especiais

### 4. Validação Prévia

- Verifique se todos os campos obrigatórios estão presentes
- Confirme que os formatos de dados estão corretos
- Teste com uma amostra pequena antes da importação completa
- Verifique duplicatas potenciais

---

## Exemplo de Arquivo de Erros e Soluções

### Arquivo com Problemas Comuns

```csv
firstName,lastName,email,phone,company
João,Silva,joao@empresa,1199999999,"Empresa ABC, LTDA"
Maria,Santos,invalid-email,2188888888,XYZ Ltda
Carlos,Oliveira,carlos@cliente.net,3177777777,
Ana,Pereira,ana@outrocliente.org,4166666666,"Cliente ""VIP"""
```

### Problemas Identificados:

1. **Email inválido**: `joao@empresa` (falta domínio)
2. **Formato de email inválido**: `invalid-email`
3. **Campo obrigatório vazio**: `company` para Carlos Oliveira
4. **Caracteres especiais**: vírgula em "Empresa ABC, LTDA" e aspas em "Cliente "VIP""

### Arquivo Corrigido

```csv
firstName,lastName,email,phone,company
João,Silva,joao@empresa.com,1199999999,"""Empresa ABC, LTDA"""
Maria,Santos,maria@empresa.com,2188888888,XYZ Ltda
Carlos,Oliveira,carlos@cliente.net,3177777777,Cliente Padrão
Ana,Pereira,ana@outrocliente.org,4166666666,"Cliente ""VIP"""
```

---

## Considerações Finais

- Sempre teste com uma pequena quantidade de dados primeiro
- Use os templates fornecidos pelo sistema como base
- Verifique os logs de erro após a importação
- Mantenha cópias dos arquivos originais para referência
- Considere a privacidade e segurança dos dados durante o processo