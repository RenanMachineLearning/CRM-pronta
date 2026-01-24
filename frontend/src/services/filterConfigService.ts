/**
 * Configurações de filtros por entidade
 * Baseadas em backend/src/types/filter.types.ts ENTITY_FILTER_CONFIGS
 * Com labels em português para UI
 */

import type { EntityFilterConfig, FieldMetadata, FilterOperator } from '../types/filter';
import { FilterOperator as Op } from '../types/filter';

/**
 * Configurações de filtros por entidade
 * Baseadas no backend com labels em português
 */
export const ENTITY_FILTER_CONFIGS: Record<string, EntityFilterConfig> = {
  contact: {
    entity: 'contact',
    fields: {
      firstName: { 
        name: 'firstName', 
        label: 'Primeiro Nome', 
        type: 'string' 
      },
      lastName: { 
        name: 'lastName', 
        label: 'Sobrenome', 
        type: 'string' 
      },
      title: {
        name: 'title',
        label: 'Cargo',
        type: 'string',
      },
      gender: {
        name: 'gender',
        label: 'Gênero',
        type: 'string',
      },
      notes: {
        name: 'notes',
        label: 'Notas',
        type: 'string',
      },
      status: {
        name: 'status',
        label: 'Status',
        type: 'enum',
        enumValues: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
        enumLabels: {
          'ACTIVE': 'Ativo',
          'INACTIVE': 'Inativo',
          'ARCHIVED': 'Arquivado',
        },
      },
      companyId: {
        name: 'companyId',
        label: 'ID da Empresa',
        type: 'string',
      },
      birthDate: {
        name: 'birthDate',
        label: 'Data de Nascimento',
        type: 'date',
      },
      createdAt: {
        name: 'createdAt',
        label: 'Data de Criação',
        type: 'date',
      },
      updatedAt: {
        name: 'updatedAt',
        label: 'Data de Atualização',
        type: 'date',
      },
      'tags.name': {
        name: 'tags.name',
        label: 'Tag',
        type: 'string',
        isRelation: true,
        relation: { model: 'tags', field: 'name' },
      },
      'emails.email': {
        name: 'emails.email',
        label: 'Email',
        type: 'string',
        isRelation: true,
        relation: { model: 'emails', field: 'email' },
      },
      'phones.phone': {
        name: 'phones.phone',
        label: 'Telefone',
        type: 'string',
        isRelation: true,
        relation: { model: 'phones', field: 'phone' },
      },
    },
    operatorsByFieldType: {
      string: [
        Op.CONTAINS,
        Op.NOT_CONTAINS,
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.IN,
        Op.NOT_IN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
      number: [
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.GREATER_THAN,
        Op.LESS_THAN,
        Op.GREATER_THAN_OR_EQUAL,
        Op.LESS_THAN_OR_EQUAL,
        Op.BETWEEN,
        Op.IN,
        Op.NOT_IN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
      date: [
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.GREATER_THAN,
        Op.LESS_THAN,
        Op.GREATER_THAN_OR_EQUAL,
        Op.LESS_THAN_OR_EQUAL,
        Op.BETWEEN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
      enum: [
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.IN,
        Op.NOT_IN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
      boolean: [
        Op.EQUALS,
        Op.NOT_EQUALS,
      ],
      decimal: [
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.GREATER_THAN,
        Op.LESS_THAN,
        Op.GREATER_THAN_OR_EQUAL,
        Op.LESS_THAN_OR_EQUAL,
        Op.BETWEEN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
    },
  },
  company: {
    entity: 'company',
    fields: {
      name: {
        name: 'name',
        label: 'Nome',
        type: 'string',
      },
      website: {
        name: 'website',
        label: 'Website',
        type: 'string',
      },
      industry: {
        name: 'industry',
        label: 'Indústria',
        type: 'string',
      },
      size: {
        name: 'size',
        label: 'Tamanho',
        type: 'enum',
        enumValues: ['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'],
        enumLabels: {
          'SMALL': 'Pequena',
          'MEDIUM': 'Média',
          'LARGE': 'Grande',
          'ENTERPRISE': 'Empresarial',
        },
      },
      status: {
        name: 'status',
        label: 'Status',
        type: 'enum',
        enumValues: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
        enumLabels: {
          'ACTIVE': 'Ativo',
          'INACTIVE': 'Inativo',
          'ARCHIVED': 'Arquivado',
        },
      },
      createdAt: {
        name: 'createdAt',
        label: 'Data de Criação',
        type: 'date',
      },
      updatedAt: {
        name: 'updatedAt',
        label: 'Data de Atualização',
        type: 'date',
      },
      'tags.name': {
        name: 'tags.name',
        label: 'Tag',
        type: 'string',
        isRelation: true,
        relation: { model: 'tags', field: 'name' },
      },
    },
    operatorsByFieldType: {
      string: [
        Op.CONTAINS,
        Op.NOT_CONTAINS,
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.IN,
        Op.NOT_IN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
      number: [
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.GREATER_THAN,
        Op.LESS_THAN,
        Op.GREATER_THAN_OR_EQUAL,
        Op.LESS_THAN_OR_EQUAL,
        Op.BETWEEN,
        Op.IN,
        Op.NOT_IN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
      date: [
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.GREATER_THAN,
        Op.LESS_THAN,
        Op.GREATER_THAN_OR_EQUAL,
        Op.LESS_THAN_OR_EQUAL,
        Op.BETWEEN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
      enum: [
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.IN,
        Op.NOT_IN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
      boolean: [
        Op.EQUALS,
        Op.NOT_EQUALS,
      ],
      decimal: [
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.GREATER_THAN,
        Op.LESS_THAN,
        Op.GREATER_THAN_OR_EQUAL,
        Op.LESS_THAN_OR_EQUAL,
        Op.BETWEEN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
    },
  },
  lead: {
    entity: 'lead',
    fields: {
      firstName: {
        name: 'firstName',
        label: 'Primeiro Nome',
        type: 'string',
      },
      lastName: {
        name: 'lastName',
        label: 'Sobrenome',
        type: 'string',
      },
      email: {
        name: 'email',
        label: 'Email',
        type: 'string',
      },
      phone: {
        name: 'phone',
        label: 'Telefone',
        type: 'string',
      },
      company: {
        name: 'company',
        label: 'Empresa',
        type: 'string',
      },
      source: {
        name: 'source',
        label: 'Origem',
        type: 'string',
      },
      status: {
        name: 'status',
        label: 'Status',
        type: 'enum',
        enumValues: ['NEW', 'QUALIFIED', 'CONVERTED', 'LOST'],
        enumLabels: {
          'NEW': 'Novo',
          'QUALIFIED': 'Qualificado',
          'CONVERTED': 'Convertido',
          'LOST': 'Perdido',
        },
      },
      converted: {
        name: 'converted',
        label: 'Convertido',
        type: 'boolean',
      },
      convertedAt: {
        name: 'convertedAt',
        label: 'Data de Conversão',
        type: 'date',
      },
      convertedToContactId: {
        name: 'convertedToContactId',
        label: 'ID do Contato Convertido',
        type: 'string',
      },
      convertedToOpportunityId: {
        name: 'convertedToOpportunityId',
        label: 'ID da Oportunidade Convertida',
        type: 'string',
      },
      createdAt: {
        name: 'createdAt',
        label: 'Data de Criação',
        type: 'date',
      },
      updatedAt: {
        name: 'updatedAt',
        label: 'Data de Atualização',
        type: 'date',
      },
      'tags.name': {
        name: 'tags.name',
        label: 'Tag',
        type: 'string',
        isRelation: true,
        relation: { model: 'tags', field: 'name' },
      },
    },
    operatorsByFieldType: {
      string: [
        Op.CONTAINS,
        Op.NOT_CONTAINS,
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.IN,
        Op.NOT_IN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
      number: [
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.GREATER_THAN,
        Op.LESS_THAN,
        Op.GREATER_THAN_OR_EQUAL,
        Op.LESS_THAN_OR_EQUAL,
        Op.BETWEEN,
        Op.IN,
        Op.NOT_IN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
      date: [
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.GREATER_THAN,
        Op.LESS_THAN,
        Op.GREATER_THAN_OR_EQUAL,
        Op.LESS_THAN_OR_EQUAL,
        Op.BETWEEN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
      enum: [
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.IN,
        Op.NOT_IN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
      boolean: [
        Op.EQUALS,
        Op.NOT_EQUALS,
      ],
      decimal: [
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.GREATER_THAN,
        Op.LESS_THAN,
        Op.GREATER_THAN_OR_EQUAL,
        Op.LESS_THAN_OR_EQUAL,
        Op.BETWEEN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
    },
  },
  opportunity: {
    entity: 'opportunity',
    fields: {
      name: {
        name: 'name',
        label: 'Nome',
        type: 'string',
      },
      value: {
        name: 'value',
        label: 'Valor',
        type: 'decimal',
      },
      currency: {
        name: 'currency',
        label: 'Moeda',
        type: 'string',
      },
      status: {
        name: 'status',
        label: 'Status',
        type: 'enum',
        enumValues: ['OPEN', 'WON', 'LOST', 'ARCHIVED'],
        enumLabels: {
          'OPEN': 'Aberta',
          'WON': 'Ganha',
          'LOST': 'Perdida',
          'ARCHIVED': 'Arquivada',
        },
      },
      stageId: {
        name: 'stageId',
        label: 'ID do Estágio',
        type: 'string',
      },
      closeDate: {
        name: 'closeDate',
        label: 'Data de Fechamento',
        type: 'date',
      },
      actualCloseDate: {
        name: 'actualCloseDate',
        label: 'Data de Fechamento Real',
        type: 'date',
      },
      probability: {
        name: 'probability',
        label: 'Probabilidade',
        type: 'number',
      },
      contactId: {
        name: 'contactId',
        label: 'ID do Contato',
        type: 'string',
      },
      companyId: {
        name: 'companyId',
        label: 'ID da Empresa',
        type: 'string',
      },
      leadId: {
        name: 'leadId',
        label: 'ID do Lead',
        type: 'string',
      },
      createdAt: {
        name: 'createdAt',
        label: 'Data de Criação',
        type: 'date',
      },
      updatedAt: {
        name: 'updatedAt',
        label: 'Data de Atualização',
        type: 'date',
      },
      'tags.name': {
        name: 'tags.name',
        label: 'Tag',
        type: 'string',
        isRelation: true,
        relation: { model: 'tags', field: 'name' },
      },
    },
    operatorsByFieldType: {
      string: [
        Op.CONTAINS,
        Op.NOT_CONTAINS,
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.IN,
        Op.NOT_IN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
      number: [
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.GREATER_THAN,
        Op.LESS_THAN,
        Op.GREATER_THAN_OR_EQUAL,
        Op.LESS_THAN_OR_EQUAL,
        Op.BETWEEN,
        Op.IN,
        Op.NOT_IN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
      date: [
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.GREATER_THAN,
        Op.LESS_THAN,
        Op.GREATER_THAN_OR_EQUAL,
        Op.LESS_THAN_OR_EQUAL,
        Op.BETWEEN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
      enum: [
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.IN,
        Op.NOT_IN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
      boolean: [
        Op.EQUALS,
        Op.NOT_EQUALS,
      ],
      decimal: [
        Op.EQUALS,
        Op.NOT_EQUALS,
        Op.GREATER_THAN,
        Op.LESS_THAN,
        Op.GREATER_THAN_OR_EQUAL,
        Op.LESS_THAN_OR_EQUAL,
        Op.BETWEEN,
        Op.IS_NULL,
        Op.IS_NOT_NULL,
      ],
    },
  },
};

/**
 * Obtém configuração de filtros para uma entidade
 */
export function getEntityFilterConfig(entity: string): EntityFilterConfig {
  const config = ENTITY_FILTER_CONFIGS[entity];
  if (!config) {
    throw new Error(`Configuração de filtros não encontrada para: ${entity}`);
  }
  return config;
}

/**
 * Obtém metadados de um campo específico
 */
export function getFieldMetadata(entity: string, fieldName: string): FieldMetadata | undefined {
  const config = getEntityFilterConfig(entity);
  return config.fields[fieldName];
}

/**
 * Obtém operadores disponíveis para um campo
 */
export function getAvailableOperators(entity: string, fieldName: string): FilterOperator[] {
  const fieldMeta = getFieldMetadata(entity, fieldName);
  if (!fieldMeta) return [];
  
  const config = getEntityFilterConfig(entity);
  return config.operatorsByFieldType[fieldMeta.type] || [];
}
