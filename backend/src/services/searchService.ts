/**
 * Serviço de busca global
 *
 * Implementa busca em múltiplas entidades com:
 * - ILIKE com normalização de texto (V1)
 * - Ranking por relevância
 * - Snippet com highlight
 * - Isolamento multi-tenant
 * - Verificação de permissões por entidade
 * - Filtragem de campos por permissão
 * - Filtros por entidade
 * - Paginação por entidade
 */

import { prisma } from '../utils/prisma';
import {
  GlobalSearchParams,
  GlobalSearchResult,
  SearchResult,
  SearchableEntity,
  ContactData,
  CompanyData,
  LeadData,
  OpportunityData,
  SearchEntityConfig,
} from '../types/search.types';
import { normalizeText, extractSnippet, calculateRelevance, sanitizeQuery } from '../utils/searchHelpers';
import { checkPermission } from '../utils/permissions';
import { filterFieldsByPermission } from '../utils/fieldPermissions';
import { withQueryTimeout } from '../utils/queryTimeout';
import { getSelectionProfile } from '../utils/selectionProfiles';
import { cacheManager } from '../cache/cacheManager';
import { generateCacheKey } from '../cache/cacheKeys';
import { QUERY_LIMITS, QUERY_TIMEOUTS, CACHE_TTL } from '../config/constants';


/**
 * Configuração de busca por entidade
 */
const ENTITY_CONFIGS: Record<SearchableEntity, SearchEntityConfig> = {
  contact: {
    entity: 'contact',
    fields: ['firstName', 'lastName', 'title', 'notes'],
    relations: [
      { model: 'emails', fields: ['email'] },
      { model: 'phones', fields: ['phone'] },
    ],
  },
  company: {
    entity: 'company',
    fields: ['name', 'website', 'industry'],
  },
  lead: {
    entity: 'lead',
    fields: ['firstName', 'lastName', 'email', 'phone', 'company', 'source'],
  },
  opportunity: {
    entity: 'opportunity',
    fields: ['name'],
  },
};

/**
 * Classe de serviço de busca
 */
export class SearchService {
  /**
   * Busca global em múltiplas entidades
   *
   * @param params - Parâmetros de busca
   * @param tenantId - ID do tenant (isolamento)
   * @param userId - ID do usuário (para filtrar por permissão)
   * @returns Resultado agregado da busca
   */
  static async searchGlobal(
    params: GlobalSearchParams,
    tenantId: string,
    userId: string
  ): Promise<GlobalSearchResult> {
    // Gerar chave de cache
    const cacheKey = generateCacheKey('searchGlobal', { ...params, tenantId, userId }, tenantId);
    
    // Tentar obter do cache
    try {
      const cached = await cacheManager.get<GlobalSearchResult>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Falha no cache não deve quebrar a aplicação
      console.error('[Cache] Erro ao buscar do cache:', error);
    }

    const { query, entities, limit = 10 } = params;

    // Sanitizar e normalizar query
    const sanitizedQuery = sanitizeQuery(query);
    const normalizedQuery = normalizeText(sanitizedQuery);

    if (!normalizedQuery || normalizedQuery.trim().length === 0) {
      // Query vazia após normalização, retornar resultados vazios
      const emptyResult = {
        query: sanitizedQuery,
        timestamp: new Date().toISOString(),
        results: {
          contacts: [],
          companies: [],
          leads: [],
          opportunities: [],
        },
        totals: {
          contacts: 0,
          companies: 0,
          leads: 0,
          opportunities: 0,
        },
      };
      
      // Armazenar resultado vazio em cache (TTL menor)
      try {
        await cacheManager.set(cacheKey, emptyResult, CACHE_TTL.SEARCH / 2);
      } catch (error) {
        console.error('[Cache] Erro ao armazenar no cache:', error);
      }
      
      return emptyResult;
    }

    // Aplicar limite de 100 resultados por entidade
    const limitPerEntity = Math.min(limit, QUERY_LIMITS.MAX_RESULTS_PER_ENTITY);

    // Determinar quais entidades buscar
    const entitiesToSearch: SearchableEntity[] = entities?.length
      ? (entities as SearchableEntity[])
      : ['contact', 'company', 'lead', 'opportunity'];

    // Executar busca com timeout
    const result = await withQueryTimeout(
      this.performSearch(entitiesToSearch, normalizedQuery, sanitizedQuery, tenantId, userId, limitPerEntity),
      QUERY_TIMEOUTS.SEARCH,
      'searchGlobal'
    );

    // Armazenar em cache
    try {
      await cacheManager.set(cacheKey, result, CACHE_TTL.SEARCH);
    } catch (error) {
      // Falha no cache não deve quebrar a aplicação
      console.error('[Cache] Erro ao armazenar no cache:', error);
    }

    return result;
  }

  /**
   * Executa a busca em todas as entidades
   */
  private static async performSearch(
    entitiesToSearch: SearchableEntity[],
    normalizedQuery: string,
    sanitizedQuery: string,
    tenantId: string,
    userId: string,
    limitPerEntity: number
  ): Promise<GlobalSearchResult> {
    // Buscar em cada entidade em paralelo
    const searchPromises = entitiesToSearch.map(entity =>
      this.searchInEntity(entity, normalizedQuery, sanitizedQuery, tenantId, userId, limitPerEntity)
    );

    const results = await Promise.all(searchPromises);

    // Agregar resultados
    const contacts = results.find(r => r.entity === 'contact')?.results || [];
    const companies = results.find(r => r.entity === 'company')?.results || [];
    const leads = results.find(r => r.entity === 'lead')?.results || [];
    const opportunities = results.find(r => r.entity === 'opportunity')?.results || [];

    // Obter totais (sem limite) para cada entidade
    const totals = await this.countResults(entitiesToSearch, normalizedQuery, tenantId, userId);

    return {
      query: sanitizedQuery,
      timestamp: new Date().toISOString(),
      results: {
        contacts: contacts as SearchResult<ContactData>[],
        companies: companies as SearchResult<CompanyData>[],
        leads: leads as SearchResult<LeadData>[],
        opportunities: opportunities as SearchResult<OpportunityData>[],
      },
      totals: {
        contacts: totals.contacts,
        companies: totals.companies,
        leads: totals.leads,
        opportunities: totals.opportunities,
      },
    };
  }

  /**
   * Verifica se usuário tem permissão para buscar em uma entidade
   */
  private static async checkEntityPermission(
    userId: string,
    tenantId: string,
    entity: 'Contact' | 'Company' | 'Lead' | 'Opportunity'
  ): Promise<boolean> {
    try {
      return await checkPermission(userId, tenantId, entity, 'list');
    } catch (error) {
      console.error(`Erro ao verificar permissão para ${entity}:`, error);
      return false; // Em caso de erro, negar acesso (segurança)
    }
  }

  /**
   * Busca em uma entidade específica
   *
   * @param entity - Entidade a buscar
   * @param normalizedQuery - Query normalizada (para busca)
   * @param originalQuery - Query original (para snippet)
   * @param tenantId - ID do tenant
   * @param userId - ID do usuário (para permissões)
   * @param limit - Limite de resultados
   * @returns Resultados da busca
   */
  private static async searchInEntity(
    entity: SearchableEntity,
    normalizedQuery: string,
    originalQuery: string,
    tenantId: string,
    userId: string,
    limit: number
  ): Promise<{ entity: SearchableEntity; results: SearchResult[] }> {
    // Verificar permissão antes de buscar
    const entityName = entity.charAt(0).toUpperCase() + entity.slice(1) as 'Contact' | 'Company' | 'Lead' | 'Opportunity';
    const hasPermission = await this.checkEntityPermission(userId, tenantId, entityName);

    if (!hasPermission) {
      // Sem permissão, retornar array vazio (não expor que entidade existe)
      return { entity, results: [] };
    }

    const config = ENTITY_CONFIGS[entity];

    try {
      switch (entity) {
        case 'contact':
          return {
            entity,
            results: await this.searchContacts(config, normalizedQuery, originalQuery, tenantId, userId, limit),
          };

        case 'company':
          return {
            entity,
            results: await this.searchCompanies(config, normalizedQuery, originalQuery, tenantId, userId, limit),
          };

        case 'lead':
          return {
            entity,
            results: await this.searchLeads(config, normalizedQuery, originalQuery, tenantId, userId, limit),
          };

        case 'opportunity':
          return {
            entity,
            results: await this.searchOpportunities(config, normalizedQuery, originalQuery, tenantId, userId, limit),
          };

        default:
          return { entity, results: [] };
      }
    } catch (error) {
      // Se erro ao buscar uma entidade, retornar array vazio (não quebrar busca global)
      console.error(`Erro ao buscar ${entity}:`, error);
      return { entity, results: [] };
    }
  }

  /**
   * Busca em contatos
   */
  private static async searchContacts(
    config: SearchEntityConfig,
    normalizedQuery: string,
    originalQuery: string,
    tenantId: string,
    userId: string,
    limit: number
  ): Promise<SearchResult<ContactData>[]> {
    // Aplicar limite máximo
    const limitedLimit = Math.min(limit, QUERY_LIMITS.MAX_RESULTS_PER_ENTITY);
    
    // Para busca, precisamos de mais campos que em listagem normal
    // Usar include com selects otimizados para relacionamentos
    const selectWithRelations = {
      id: true,
      tenantId: true,
      firstName: true,
      lastName: true,
      title: true,
      notes: true, // Necessário para busca
      status: true,
      companyId: true,
      createdAt: true,
      company: {
        select: { id: true, name: true },
      },
      emails: {
        take: 3, // Limitar emails para performance
        orderBy: { isPrimary: 'desc' },
        select: {
          id: true,
          email: true,
          type: true,
        },
      },
      phones: {
        take: 3, // Limitar phones para performance
        orderBy: { isPrimary: 'desc' },
        select: {
          id: true,
          phone: true,
          type: true,
        },
      },
    };

    const contacts = await withQueryTimeout(
      prisma.contact.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: this.buildContactSearchConditions(normalizedQuery, config),
        },
        take: limitedLimit,
        select: selectWithRelations,
      }),
      QUERY_TIMEOUTS.SEARCH,
      'searchContacts'
    );

    // Processar resultados e adicionar metadados
    const results: SearchResult<ContactData>[] = [];

    for (const contact of contacts) {
      const searchText = this.buildContactSearchText(contact);
      const score = calculateRelevance(searchText, originalQuery);

      // Construir dados do contato
      const contactData: ContactData = {
        id: contact.id,
        tenantId: contact.tenantId,
        firstName: contact.firstName,
        lastName: contact.lastName,
        title: contact.title,
        companyId: contact.companyId,
        company: contact.company,
        emails: contact.emails.map(e => ({
          id: e.id,
          email: e.email,
          type: e.type,
        })),
        phones: contact.phones.map(p => ({
          id: p.id,
          phone: p.phone,
          type: p.type,
        })),
        createdAt: contact.createdAt,
      };

      // Filtrar campos por permissão
      const filteredData = await filterFieldsByPermission(
        contactData,
        userId,
        tenantId,
        'Contact',
        'read'
      ) as ContactData;

      // Extrair snippet
      const snippet = this.extractBestSnippet(searchText, originalQuery, config.fields);

      results.push({
        id: contact.id,
        tenantId: contact.tenantId,
        type: 'contact',
        score,
        snippet,
        data: filteredData,
      });
    }

    // Ordenar por relevância (maior score primeiro)
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * Busca em empresas
   */
  private static async searchCompanies(
    config: SearchEntityConfig,
    normalizedQuery: string,
    originalQuery: string,
    tenantId: string,
    userId: string,
    limit: number
  ): Promise<SearchResult<CompanyData>[]> {
    // Aplicar limite máximo
    const limitedLimit = Math.min(limit, QUERY_LIMITS.MAX_RESULTS_PER_ENTITY);
    
    // Usar perfil de seleção otimizado para busca (list)
    const select = getSelectionProfile('company', 'list');

    const companies = await withQueryTimeout(
      prisma.company.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: this.buildCompanySearchConditions(normalizedQuery, config),
        },
        take: limitedLimit,
        select,
      }),
      QUERY_TIMEOUTS.SEARCH,
      'searchCompanies'
    );

    const results: SearchResult<CompanyData>[] = [];

    for (const company of companies) {
      const searchText = this.buildCompanySearchText(company);
      const score = calculateRelevance(searchText, originalQuery);

      const companyData: CompanyData = {
        id: company.id,
        tenantId: company.tenantId,
        name: company.name,
        website: company.website,
        industry: company.industry,
        size: company.size,
        createdAt: company.createdAt,
      };

      // Filtrar campos por permissão
      const filteredData = await filterFieldsByPermission(
        companyData,
        userId,
        tenantId,
        'Company',
        'read'
      ) as CompanyData;

      const snippet = this.extractBestSnippet(searchText, originalQuery, config.fields);

      results.push({
        id: company.id,
        tenantId: company.tenantId,
        type: 'company',
        score,
        snippet,
        data: filteredData,
      });
    }

    // Ordenar por relevância
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * Busca em leads
   */
  private static async searchLeads(
    config: SearchEntityConfig,
    normalizedQuery: string,
    originalQuery: string,
    tenantId: string,
    userId: string,
    limit: number
  ): Promise<SearchResult<LeadData>[]> {
    // Aplicar limite máximo
    const limitedLimit = Math.min(limit, QUERY_LIMITS.MAX_RESULTS_PER_ENTITY);
    
    // Usar perfil de seleção otimizado para busca (list)
    const select = getSelectionProfile('lead', 'list');

    const leads = await withQueryTimeout(
      prisma.lead.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: this.buildLeadSearchConditions(normalizedQuery, config),
        },
        take: limitedLimit,
        select,
      }),
      QUERY_TIMEOUTS.SEARCH,
      'searchLeads'
    );

    const results: SearchResult<LeadData>[] = [];

    for (const lead of leads) {
      const searchText = this.buildLeadSearchText(lead);
      const score = calculateRelevance(searchText, originalQuery);

      const leadData: LeadData = {
        id: lead.id,
        tenantId: lead.tenantId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        status: lead.status,
        source: lead.source,
        createdAt: lead.createdAt,
      };

      // Filtrar campos por permissão
      const filteredData = await filterFieldsByPermission(
        leadData,
        userId,
        tenantId,
        'Lead',
        'read'
      ) as LeadData;

      const snippet = this.extractBestSnippet(searchText, originalQuery, config.fields);

      results.push({
        id: lead.id,
        tenantId: lead.tenantId,
        type: 'lead',
        score,
        snippet,
        data: filteredData,
      });
    }

    // Ordenar por relevância
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * Busca em oportunidades
   */
  private static async searchOpportunities(
    config: SearchEntityConfig,
    normalizedQuery: string,
    originalQuery: string,
    tenantId: string,
    userId: string,
    limit: number
  ): Promise<SearchResult<OpportunityData>[]> {
    // Aplicar limite máximo
    const limitedLimit = Math.min(limit, QUERY_LIMITS.MAX_RESULTS_PER_ENTITY);
    
    // Para busca, precisamos de stage também
    const selectWithStage = {
      id: true,
      tenantId: true,
      name: true,
      value: true,
      currency: true,
      status: true,
      stageId: true,
      contactId: true,
      companyId: true,
      createdAt: true,
      stage: {
        select: { id: true, name: true },
      },
    } as any; // Usar 'as any' porque Prisma.SelectSubset pode não incluir todos os campos necessários

    const opportunities = await withQueryTimeout(
      prisma.opportunity.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: this.buildOpportunitySearchConditions(normalizedQuery, config),
        },
        take: limitedLimit,
        select: selectWithStage,
      }),
      QUERY_TIMEOUTS.SEARCH,
      'searchOpportunities'
    );

    const results: SearchResult<OpportunityData>[] = [];

    for (const opportunity of opportunities) {
      const searchText = opportunity.name;
      const score = calculateRelevance(searchText, originalQuery);

      const opportunityData: OpportunityData = {
        id: opportunity.id,
        tenantId: opportunity.tenantId,
        name: opportunity.name,
        value: opportunity.value.toNumber ? opportunity.value.toNumber() : Number(opportunity.value),
        currency: opportunity.currency,
        status: opportunity.status,
        stageId: opportunity.stageId,
        stage: opportunity.stage,
        contactId: opportunity.contactId,
        companyId: opportunity.companyId,
        createdAt: opportunity.createdAt,
      };

      // Filtrar campos por permissão
      const filteredData = await filterFieldsByPermission(
        opportunityData,
        userId,
        tenantId,
        'Opportunity',
        'read'
      ) as OpportunityData;

      const snippet = extractSnippet(searchText, originalQuery);

      results.push({
        id: opportunity.id,
        tenantId: opportunity.tenantId,
        type: 'opportunity',
        score,
        snippet: snippet ? {
          field: 'name',
          text: snippet,
          position: 0,
        } : undefined,
        data: filteredData,
      });
    }

    // Ordenar por relevância
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * Constrói condições de busca para contatos
   */
  private static buildContactSearchConditions(normalizedQuery: string, config: SearchEntityConfig): any[] {
    const conditions: any[] = [];

    // Busca em campos diretos
    config.fields.forEach(field => {
      conditions.push({
        [field]: {
          contains: normalizedQuery,
          mode: 'insensitive',
        },
      });
    });

    // Busca em emails (via join implícito)
    if (config.relations?.some(r => r.model === 'emails')) {
      conditions.push({
        emails: {
          some: {
            email: {
              contains: normalizedQuery,
              mode: 'insensitive',
            },
          },
        },
      });
    }

    // Busca em phones (via join implícito)
    if (config.relations?.some(r => r.model === 'phones')) {
      conditions.push({
        phones: {
          some: {
            phone: {
              contains: normalizedQuery,
              mode: 'insensitive',
            },
          },
        },
      });
    }

    return conditions;
  }

  /**
   * Constrói condições de busca para empresas
   */
  private static buildCompanySearchConditions(normalizedQuery: string, config: SearchEntityConfig): any[] {
    return config.fields.map(field => ({
      [field]: {
        contains: normalizedQuery,
        mode: 'insensitive',
      },
    }));
  }

  /**
   * Constrói condições de busca para leads
   */
  private static buildLeadSearchConditions(normalizedQuery: string, config: SearchEntityConfig): any[] {
    return config.fields.map(field => ({
      [field]: {
        contains: normalizedQuery,
        mode: 'insensitive',
      },
    }));
  }

  /**
   * Constrói condições de busca para oportunidades
   */
  private static buildOpportunitySearchConditions(normalizedQuery: string, config: SearchEntityConfig): any[] {
    return config.fields.map(field => ({
      [field]: {
        contains: normalizedQuery,
        mode: 'insensitive',
      },
    }));
  }

  /**
   * Constrói texto de busca para um contato
   */
  private static buildContactSearchText(contact: any): string {
    const parts = [
      contact.firstName,
      contact.lastName,
      contact.title,
      contact.notes,
      contact.emails?.map((e: any) => e.email).join(' '),
      contact.phones?.map((p: any) => p.phone).join(' '),
    ];

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Constrói texto de busca para uma empresa
   */
  private static buildCompanySearchText(company: any): string {
    const parts = [
      company.name,
      company.website,
      company.industry,
      company.size,
    ];

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Constrói texto de busca para um lead
   */
  private static buildLeadSearchText(lead: any): string {
    const parts = [
      lead.firstName,
      lead.lastName,
      lead.email,
      lead.phone,
      lead.company,
      lead.source,
    ];

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Extrai o melhor snippet de um texto
   */
  private static extractBestSnippet(
    text: string,
    query: string,
    fields: string[]
  ): { field: string; text: string; position: number } | undefined {
    const snippet = extractSnippet(text, query);
    if (!snippet) return undefined;

    // Tentar identificar em qual campo o termo foi encontrado
    // Por enquanto, retornar primeiro campo como padrão
    return {
      field: fields[0] || 'text',
      text: snippet,
      position: 0,
    };
  }

  /**
   * Conta total de resultados por entidade (sem limite)
   * Nota: Permissões já foram verificadas em searchInEntity, então apenas contamos
   */
  private static async countResults(
    entities: SearchableEntity[],
    normalizedQuery: string,
    tenantId: string,
    userId: string
  ): Promise<{
    contacts: number;
    companies: number;
    leads: number;
    opportunities: number;
  }> {
    // Verificar permissões uma vez para todas as entidades
    const [hasContactPermission, hasCompanyPermission, hasLeadPermission, hasOpportunityPermission] = await Promise.all([
      this.checkEntityPermission(userId, tenantId, 'Contact'),
      this.checkEntityPermission(userId, tenantId, 'Company'),
      this.checkEntityPermission(userId, tenantId, 'Lead'),
      this.checkEntityPermission(userId, tenantId, 'Opportunity'),
    ]);

    const counts = await Promise.all([
      entities.includes('contact') && hasContactPermission
        ? this.countContacts(normalizedQuery, tenantId)
        : Promise.resolve(0),
      entities.includes('company') && hasCompanyPermission
        ? this.countCompanies(normalizedQuery, tenantId)
        : Promise.resolve(0),
      entities.includes('lead') && hasLeadPermission
        ? this.countLeads(normalizedQuery, tenantId)
        : Promise.resolve(0),
      entities.includes('opportunity') && hasOpportunityPermission
        ? this.countOpportunities(normalizedQuery, tenantId)
        : Promise.resolve(0),
    ]);

    return {
      contacts: counts[0],
      companies: counts[1],
      leads: counts[2],
      opportunities: counts[3],
    };
  }

  /**
   * Conta contatos
   */
  private static async countContacts(normalizedQuery: string, tenantId: string): Promise<number> {
    const config = ENTITY_CONFIGS.contact;
    const where = {
      tenantId,
      deletedAt: null,
      OR: this.buildContactSearchConditions(normalizedQuery, config),
    };

    return prisma.contact.count({ where });
  }

  /**
   * Conta empresas
   */
  private static async countCompanies(normalizedQuery: string, tenantId: string): Promise<number> {
    const config = ENTITY_CONFIGS.company;
    const where = {
      tenantId,
      deletedAt: null,
      OR: this.buildCompanySearchConditions(normalizedQuery, config),
    };

    return prisma.company.count({ where });
  }

  /**
   * Conta leads
   */
  private static async countLeads(normalizedQuery: string, tenantId: string): Promise<number> {
    const config = ENTITY_CONFIGS.lead;
    const where = {
      tenantId,
      deletedAt: null,
      OR: this.buildLeadSearchConditions(normalizedQuery, config),
    };

    return prisma.lead.count({ where });
  }

  /**
   * Conta oportunidades
   */
  private static async countOpportunities(normalizedQuery: string, tenantId: string): Promise<number> {
    const config = ENTITY_CONFIGS.opportunity;
    const where = {
      tenantId,
      deletedAt: null,
      OR: this.buildOpportunitySearchConditions(normalizedQuery, config),
    };
    return prisma.opportunity.count({ where });
  }
}
