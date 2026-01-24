/**
 * Serviço para recuperação e gerenciamento de metadados de campos
 * 
 * Responsável por:
 * - Recuperar campos padrão e customizados de entidades
 * - Validar compatibilidade de tipos entre campos
 * - Gerar sugestões automáticas de mapeamento
 * - Gerenciar cache de metadados de campos
 */

import { prisma } from '../utils/prisma';
import { FieldDefinition, FieldType, SelectOption, RelationshipInfo, FieldMappingSuggestion } from '../types/mapping.types';
import { cacheManager } from '../cache/cacheManager';
import { generateCacheKey } from '../cache/cacheKeys';

// Mapeamento de tipos do Prisma para tipos de campo do sistema
const PRISMA_TO_FIELD_TYPE: Record<string, FieldType> = {
  String: 'text',
  Int: 'number',
  Float: 'number',
  Boolean: 'boolean',
  DateTime: 'datetime',
  Json: 'text',
  Decimal: 'number',
  BigInt: 'number',
};

// Campos padrão para cada entidade
const DEFAULT_FIELDS: Record<string, FieldDefinition[]> = {
  Contact: [
    { name: 'firstName', label: 'Primeiro Nome', type: 'text', required: true },
    { name: 'lastName', label: 'Último Nome', type: 'text', required: false },
    { name: 'email', label: 'Email', type: 'email', required: false, unique: true },
    { name: 'phone', label: 'Telefone', type: 'phone', required: false },
    { name: 'title', label: 'Cargo', type: 'text', required: false },
    { name: 'company', label: 'Empresa', type: 'text', required: false },
    { name: 'notes', label: 'Notas', type: 'textarea', required: false },
  ],
  Company: [
    { name: 'name', label: 'Nome', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: false },
    { name: 'phone', label: 'Telefone', type: 'phone', required: false },
    { name: 'website', label: 'Website', type: 'url', required: false },
    { name: 'industry', label: 'Indústria', type: 'text', required: false },
    { name: 'size', label: 'Porte', type: 'select', required: false, options: [
      { value: 'STARTUP', label: 'Startup' },
      { value: 'SMALL', label: 'Pequena' },
      { value: 'MEDIUM', label: 'Média' },
      { value: 'ENTERPRISE', label: 'Grande' }
    ]},
    { name: 'notes', label: 'Notas', type: 'textarea', required: false },
  ],
  Lead: [
    { name: 'firstName', label: 'Primeiro Nome', type: 'text', required: true },
    { name: 'lastName', label: 'Último Nome', type: 'text', required: false },
    { name: 'email', label: 'Email', type: 'email', required: false, unique: true },
    { name: 'phone', label: 'Telefone', type: 'phone', required: false },
    { name: 'company', label: 'Empresa', type: 'text', required: false },
    { name: 'status', label: 'Status', type: 'select', required: false, options: [
      { value: 'NEW', label: 'Novo' },
      { value: 'CONTACTED', label: 'Contatado' },
      { value: 'QUALIFIED', label: 'Qualificado' },
      { value: 'UNQUALIFIED', label: 'Não Qualificado' },
      { value: 'APPOINTMENT_SET', label: 'Agendado' },
      { value: 'DEMO_SCHEDULED', label: 'Demonstração Marcada' },
      { value: 'CLOSURE_SCHEDULED', label: 'Fechamento Marcado' },
      { value: 'CONVERTED', label: 'Convertido' },
      { value: 'LOST', label: 'Perdido' }
    ]},
    { name: 'source', label: 'Origem', type: 'select', required: false, options: [
      { value: 'WEBSITE', label: 'Website' },
      { value: 'REFERRAL', label: 'Referência' },
      { value: 'AD_CAMPAIGN', label: 'Campanha de Anúncio' },
      { value: 'SOCIAL_MEDIA', label: 'Rede Social' },
      { value: 'EVENT', label: 'Evento' },
      { value: 'OTHER', label: 'Outro' }
    ]},
    { name: 'notes', label: 'Notas', type: 'textarea', required: false },
  ],
  Opportunity: [
    { name: 'name', label: 'Nome', type: 'text', required: true },
    { name: 'value', label: 'Valor', type: 'currency', required: false },
    { name: 'probability', label: 'Probabilidade (%)', type: 'percentage', required: false },
    { name: 'closeDate', label: 'Data de Fechamento', type: 'date', required: false },
    { name: 'stageId', label: 'Estágio', type: 'relationship', required: true, relationship: { entity: 'PipelineStage', field: 'name', type: 'many-to-one' } },
    { name: 'status', label: 'Status', type: 'select', required: false, options: [
      { value: 'OPEN', label: 'Aberto' },
      { value: 'CLOSED_WON', label: 'Fechado - Ganho' },
      { value: 'CLOSED_LOST', label: 'Fechado - Perdido' }
    ]},
    { name: 'notes', label: 'Notas', type: 'textarea', required: false },
  ],
  Task: [
    { name: 'title', label: 'Título', type: 'text', required: true },
    { name: 'description', label: 'Descrição', type: 'textarea', required: false },
    { name: 'dueDate', label: 'Data de Vencimento', type: 'datetime', required: false },
    { name: 'priority', label: 'Prioridade', type: 'select', required: false, options: [
      { value: 'LOW', label: 'Baixa' },
      { value: 'MEDIUM', label: 'Média' },
      { value: 'HIGH', label: 'Alta' },
      { value: 'URGENT', label: 'Urgente' }
    ]},
    { name: 'status', label: 'Status', type: 'select', required: false, options: [
      { value: 'TODO', label: 'A Fazer' },
      { value: 'IN_PROGRESS', label: 'Em Progresso' },
      { value: 'COMPLETED', label: 'Concluído' },
      { value: 'CANCELLED', label: 'Cancelado' }
    ]},
    { name: 'relatedEntityType', label: 'Tipo de Entidade Relacionada', type: 'select', required: false, options: [
      { value: 'Contact', label: 'Contato' },
      { value: 'Company', label: 'Empresa' },
      { value: 'Lead', label: 'Lead' },
      { value: 'Opportunity', label: 'Oportunidade' }
    ]},
    { name: 'relatedEntityId', label: 'ID da Entidade Relacionada', type: 'text', required: false },
  ],
  Note: [
    { name: 'content', label: 'Conteúdo', type: 'textarea', required: true },
    { name: 'type', label: 'Tipo', type: 'select', required: false, options: [
      { value: 'COMMENT', label: 'Comentário' },
      { value: 'CALL', label: 'Ligação' },
      { value: 'MEETING', label: 'Reunião' },
      { value: 'EMAIL', label: 'Email' },
      { value: 'TASK', label: 'Tarefa' }
    ]},
    { name: 'relatedEntityType', label: 'Tipo de Entidade Relacionada', type: 'select', required: false, options: [
      { value: 'Contact', label: 'Contato' },
      { value: 'Company', label: 'Empresa' },
      { value: 'Lead', label: 'Lead' },
      { value: 'Opportunity', label: 'Oportunidade' },
      { value: 'Task', label: 'Tarefa' }
    ]},
    { name: 'relatedEntityId', label: 'ID da Entidade Relacionada', type: 'text', required: false },
  ]
};

/**
 * Serviço para gerenciamento de metadados de campos
 */
export class FieldMetadataService {
  private static readonly CACHE_TTL = 60 * 5; // 5 minutos
  private static readonly CACHE_PREFIX = 'field-metadata';

  /**
   * Recupera todos os campos disponíveis para uma entidade
   */
  static async getEntityFields(
    entityType: string,
    tenantId: string,
    userId?: string
  ): Promise<FieldDefinition[]> {
    const cacheKey = generateCacheKey(`${this.CACHE_PREFIX}:${entityType}`, { tenantId, userId }, tenantId);

    // Tenta obter do cache primeiro
    const cached = await cacheManager.get<FieldDefinition[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Combina campos padrão com campos customizados
    const defaultFields = [...(DEFAULT_FIELDS[entityType] || [])];
    const customFields = await this.getCustomFields(entityType, tenantId);

    const allFields = [...defaultFields, ...customFields];

    // Armazena em cache
    await cacheManager.set(cacheKey, allFields, this.CACHE_TTL);

    return allFields;
  }

  /**
   * Recupera campos customizados para uma entidade e tenant
   */
  private static async getCustomFields(entityType: string, tenantId: string): Promise<FieldDefinition[]> {
    try {
      // Recupera campos customizados do banco de dados
      const customFields = await prisma.field.findMany({
        where: {
          entity: {
            name: entityType,
            tenantId: tenantId
          },
          tenantId: tenantId
        },
        include: {
          options: true // Inclui opções para campos do tipo select
        }
      });

      return customFields.map(field => {
        const fieldDef: FieldDefinition = {
          name: field.name,
          label: field.label || field.name,
          type: this.prismaTypeToFieldType(field.type),
          required: field.required,
          unique: field.unique,
          defaultValue: field.defaultValue,
          description: field.description || undefined,
          custom: true,
          tenantId: field.tenantId
        };

        // Adiciona opções para campos do tipo select
        if (field.options && field.options.length > 0) {
          fieldDef.options = field.options.map(opt => ({
            value: opt.value,
            label: opt.label || opt.value,
            description: opt.description || undefined
          }));
        }

        // Adiciona informações de relacionamento se aplicável
        if (field.relationshipEntity) {
          fieldDef.relationship = {
            entity: field.relationshipEntity,
            field: field.relationshipField || 'id',
            type: field.relationshipType as 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many' || 'many-to-one'
          };
        }

        return fieldDef;
      });
    } catch (error) {
      console.error(`Erro ao recuperar campos customizados para ${entityType} no tenant ${tenantId}:`, error);
      return []; // Retorna array vazio em caso de erro
    }
  }

  /**
   * Converte tipo do Prisma para tipo de campo do sistema
   */
  private static prismaTypeToFieldType(prismaType: string): FieldType {
    return PRISMA_TO_FIELD_TYPE[prismaType] || 'text';
  }

  /**
   * Valida se um campo existe e é compatível com um tipo específico
   */
  static async validateFieldCompatibility(
    entityType: string,
    fieldName: string,
    fieldType: FieldType,
    tenantId: string
  ): Promise<{ isValid: boolean; error?: string; fieldDefinition?: FieldDefinition }> {
    const fields = await this.getEntityFields(entityType, tenantId);

    const field = fields.find(f => f.name === fieldName);
    if (!field) {
      return { isValid: false, error: `Campo '${fieldName}' não encontrado na entidade '${entityType}'` };
    }

    // Verifica compatibilidade de tipo
    if (!this.isTypeCompatible(field.type, fieldType)) {
      return {
        isValid: false,
        error: `Tipo incompatível: campo '${fieldName}' é do tipo '${field.type}', mas foi mapeado como '${fieldType}'`
      };
    }

    return { isValid: true, fieldDefinition: field };
  }

  /**
   * Verifica se dois tipos são compatíveis
   */
  private static isTypeCompatible(requiredType: FieldType, providedType: FieldType): boolean {
    // Tipos exatamente iguais são compatíveis
    if (requiredType === providedType) return true;

    // Agrupamentos de tipos compatíveis
    const textLikeTypes: FieldType[] = ['text', 'email', 'phone', 'url', 'textarea'];
    const numericTypes: FieldType[] = ['number', 'currency', 'percentage'];
    const dateTypes: FieldType[] = ['date', 'datetime'];

    // Verifica compatibilidade dentro dos grupos
    if (textLikeTypes.includes(requiredType) && textLikeTypes.includes(providedType)) return true;
    if (numericTypes.includes(requiredType) && numericTypes.includes(providedType)) return true;
    if (dateTypes.includes(requiredType) && dateTypes.includes(providedType)) return true;

    // Boolean pode vir de texto em alguns casos
    if ((requiredType === 'boolean') && (providedType === 'text')) return true;

    return false;
  }

  /**
   * Gera sugestões automáticas de mapeamento baseado nos nomes das colunas
   */
  static async generateFieldSuggestions(
    columnHeaders: string[],
    entityType: string,
    tenantId: string
  ): Promise<FieldMappingSuggestion[]> {
    const fields = await this.getEntityFields(entityType, tenantId);
    const suggestions: FieldMappingSuggestion[] = [];

    for (let i = 0; i < columnHeaders.length; i++) {
      const columnHeader = columnHeaders[i].toLowerCase().trim();
      
      // Encontra o campo com maior similaridade
      let bestMatch: FieldDefinition | null = null;
      let bestConfidence = 0;
      let bestReason = '';

      for (const field of fields) {
        const confidence = this.calculateFieldMatchConfidence(columnHeader, field);
        
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestMatch = field;
          
          // Define a razão da sugestão
          if (confidence >= 0.9) {
            bestReason = `Nome exato ou variação direta`;
          } else if (confidence >= 0.7) {
            bestReason = `Nome semelhante encontrado`;
          } else if (confidence >= 0.5) {
            bestReason = `Correspondência parcial encontrada`;
          } else {
            bestReason = `Possível correspondência baseada em sinônimos`;
          }
        }
      }

      if (bestMatch && bestConfidence > 0.3) { // Apenas sugere com confiança acima de 30%
        suggestions.push({
          columnIndex: i,
          fieldName: bestMatch.name,
          confidence: bestConfidence,
          reason: bestReason
        });
      }
    }

    return suggestions;
  }

  /**
   * Calcula a confiança na correspondência entre um cabeçalho de coluna e um campo
   */
  private static calculateFieldMatchConfidence(columnHeader: string, field: FieldDefinition): number {
    // Normaliza o nome do campo
    const fieldName = field.name.toLowerCase();
    const fieldLabel = field.label.toLowerCase();

    // Verifica correspondência exata
    if (columnHeader === fieldName || columnHeader === fieldLabel) {
      return 1.0;
    }

    // Verifica variações comuns de nomes
    const commonVariations: Record<string, string[]> = {
      'firstName': ['nome', 'primeironome', 'firstname', 'first_name', 'fname'],
      'lastName': ['sobrenome', 'ultimonome', 'lastname', 'last_name', 'lname'],
      'email': ['email', 'e-mail', 'mail', 'correo', 'adressemail'],
      'phone': ['telefone', 'celular', 'phone', 'tel', 'mobile', 'whatsapp'],
      'company': ['empresa', 'companhia', 'company', 'org', 'organizacao'],
      'title': ['cargo', 'titulo', 'title', 'position', 'funcao'],
      'name': ['nome', 'name', 'titulo', 'descricao'],
      'notes': ['notas', 'observacoes', 'notes', 'obs', 'comentarios'],
      'status': ['status', 'situacao', 'estado', 'state'],
      'value': ['valor', 'value', 'valorfinanceiro', 'amount', 'total'],
      'probability': ['probabilidade', 'chance', 'porcentagem', 'probability', 'percent'],
      'closeDate': ['datadefechamento', 'datafechamento', 'closedate', 'fecha'],
      'dueDate': ['datadevencimento', 'duedate', 'datavencimento', 'vencimento'],
      'priority': ['prioridade', 'prioridade', 'urgencia', 'priority'],
    };

    // Verifica variações comuns
    for (const [canonicalName, variations] of Object.entries(commonVariations)) {
      if (canonicalName === field.name) {
        for (const variation of variations) {
          if (columnHeader.includes(variation) || variation.includes(columnHeader)) {
            return 0.85; // Alta confiança para variações conhecidas
          }
        }
      }
    }

    // Verifica se o nome do campo está contido no cabeçalho ou vice-versa
    if (columnHeader.includes(fieldName) || fieldName.includes(columnHeader)) {
      return 0.7; // Média-alta confiança
    }

    if (columnHeader.includes(fieldLabel) || fieldLabel.includes(columnHeader)) {
      return 0.65; // Média-alta confiança
    }

    // Verifica correspondência parcial (mais de 50% das palavras em comum)
    const columnWords = columnHeader.split(/[ _-]+/);
    const fieldWords = fieldName.split(/[ _-]+/);
    
    const commonWords = columnWords.filter(word => 
      fieldWords.some(fieldWord => 
        fieldWord.startsWith(word) || word.startsWith(fieldWord)
      )
    ).length;

    if (columnWords.length > 0 && commonWords / columnWords.length >= 0.5) {
      return 0.5; // Confiança média
    }

    return 0.0; // Sem correspondência significativa
  }

  /**
   * Limpa o cache de metadados de campos para um tenant
   */
  static async clearCache(tenantId: string): Promise<void> {
    // Como usamos o tenantId como parte da chave de cache, podemos invalidar por tag
    const tags = [`field-metadata-${tenantId}`];
    await cacheManager.invalidateByTags(tags);
  }

  /**
   * Obtém informações detalhadas sobre um campo específico
   */
  static async getFieldInfo(
    entityType: string,
    fieldName: string,
    tenantId: string
  ): Promise<FieldDefinition | null> {
    const fields = await this.getEntityFields(entityType, tenantId);
    return fields.find(f => f.name === fieldName) || null;
  }
}