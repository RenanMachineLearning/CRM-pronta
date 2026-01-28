/**
 * Controller de exportação (Etapa 9 - Parte 8).
 *
 * GET /api/export/:entityType — exporta registros em CSV ou Excel
 * com filtros da Etapa 8 e seleção de campos.
 */

import { Request, Response } from 'express';
import { ContactService } from '../services/contactService';
import { CompanyService } from '../services/companyService';
import { LeadService } from '../services/leadService';
import { OpportunityService } from '../services/opportunityService';
import { generateCSV, generateExcel } from '../utils/exportHelpers';
import { EXPORT_CONFIG, type ExportEntityType, type ExportFormat } from '../config/exportConfig';
import type { Filter } from '../types/filter.types';
import { ContactStatus } from '@prisma/client';
import type { CompanySize } from '@prisma/client';
import type { LeadStatus } from '@prisma/client';
import type { OpportunityStatus } from '@prisma/client';

/** Obtém valor em objeto por path (ex.: "company.name") */
function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((o: unknown, k) => (o as Record<string, unknown>)?.[k], obj);
}

/** Converte array de entidade para objetos planos com apenas os campos pedidos */
function toExportRows(data: Record<string, unknown>[], fields: string[]): Record<string, unknown>[] {
  return data.map((row) => {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      const v = getByPath(row as Record<string, unknown>, f);
      out[f] = v === undefined || v === null ? '' : v;
    }
    return out;
  });
}

/**
 * Exporta registros da entidade em CSV ou Excel.
 * GET /api/export/:entityType?format=csv|excel&fields[]=id&fields[]=firstName&filters=[...]
 */
export async function exportData(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const entityType = (req.params.entityType || '').toString();
    const format = ((req.query.format as string) || 'csv').toLowerCase() as ExportFormat;
    const fieldsParam = req.query.fields ?? req.query['fields[]'];
    const filtersParam = req.query.filters as string | undefined;

    if (!EXPORT_CONFIG.ENTITY_TYPES.includes(entityType as ExportEntityType)) {
      res.status(400).json({
        error: 'entityType inválido',
        message: `Deve ser um de: ${EXPORT_CONFIG.ENTITY_TYPES.join(', ')}`
      });
      return;
    }

    if (!EXPORT_CONFIG.FORMATS.includes(format)) {
      res.status(400).json({
        error: 'format inválido',
        message: 'Deve ser csv ou excel'
      });
      return;
    }

    const fields = Array.isArray(fieldsParam)
      ? fieldsParam.map(String).filter(Boolean)
      : typeof fieldsParam === 'string'
        ? fieldsParam.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

    if (fields.length === 0) {
      res.status(400).json({
        error: 'fields obrigatório',
        message: 'Informe ao menos um campo em fields[]'
      });
      return;
    }

    let advancedFilters: Filter[] | undefined;
    if (filtersParam) {
      try {
        const parsed = JSON.parse(filtersParam);
        if (!Array.isArray(parsed)) {
          res.status(400).json({ error: 'filters inválido', message: 'filters deve ser um array JSON' });
          return;
        }
        advancedFilters = parsed as Filter[];
      } catch {
        res.status(400).json({ error: 'filters inválido', message: 'filters deve ser um JSON válido' });
        return;
      }
    }

    const limit = Math.min(EXPORT_CONFIG.LIMIT_EXPORT, 10_000);
    const pagination = { page: 1, limit };

    let data: Record<string, unknown>[];

    switch (entityType) {
      case 'Contact':
        {
          const result = await ContactService.listContacts(
            tenantId,
            {
              advancedFilters,
              q: (req.query.q as string) || undefined,
              status: (req.query.status as ContactStatus) || undefined,
              companyId: (req.query.companyId as string) || undefined,
              tagId: (req.query.tagId as string) || undefined,
            },
            pagination,
            userId
          );
          data = result.data as unknown as Record<string, unknown>[];
        }
        break;
      case 'Company':
        {
          const result = await CompanyService.listCompanies(
            tenantId,
            {
              advancedFilters,
              q: (req.query.q as string) || undefined,
              industry: (req.query.industry as string) || undefined,
              size: (req.query.size as CompanySize) || undefined,
            },
            pagination,
            userId
          );
          data = result.data as unknown as Record<string, unknown>[];
        }
        break;
      case 'Lead':
        {
          const result = await LeadService.listLeads(
            tenantId,
            {
              advancedFilters,
              q: (req.query.q as string) || undefined,
              status: (req.query.status as LeadStatus) || undefined,
              source: (req.query.source as string) || undefined,
              converted: req.query.converted === 'true' ? true : req.query.converted === 'false' ? false : undefined,
            },
            pagination,
            userId
          );
          data = result.data as unknown as Record<string, unknown>[];
        }
        break;
      case 'Opportunity':
        {
          const result = await OpportunityService.listOpportunities(
            tenantId,
            {
              advancedFilters,
              q: (req.query.q as string) || undefined,
              status: (req.query.status as OpportunityStatus) || undefined,
              stageId: (req.query.stageId as string) || undefined,
              contactId: (req.query.contactId as string) || undefined,
              companyId: (req.query.companyId as string) || undefined,
            },
            pagination,
            userId
          );
          data = result.data as unknown as Record<string, unknown>[];
        }
        break;
      default:
        res.status(400).json({ error: 'entityType inválido', message: 'Entidade não suportada' });
        return;
    }

    const rows = toExportRows(data, fields);
    const ext = format === 'excel' ? 'xlsx' : 'csv';
    const filename = `export-${entityType}-${Date.now()}.${ext}`;

    if (format === 'excel') {
      const buffer = generateExcel(rows, fields);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
      return;
    }

    const buffer = generateCSV(rows, fields);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(buffer);
  } catch (error) {
    console.error('Erro na exportação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao gerar exportação',
      details: (error as Error).message
    });
  }
}
