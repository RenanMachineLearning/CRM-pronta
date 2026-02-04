/**
 * Configurações de exportação (Etapa 9 - Parte 8).
 *
 * Limite de registros por exportação e entidades suportadas.
 */

export const EXPORT_CONFIG = {
  /** Máximo de registros em uma única exportação (evitar sobrecarga e timeouts) */
  LIMIT_EXPORT: 10_000,

  /** Entidades permitidas para exportação */
  ENTITY_TYPES: ['Contact', 'Company', 'Lead', 'Opportunity'] as const,

  /** Formatos permitidos */
  FORMATS: ['csv', 'excel'] as const,
};

export type ExportEntityType = (typeof EXPORT_CONFIG.ENTITY_TYPES)[number];
export type ExportFormat = (typeof EXPORT_CONFIG.FORMATS)[number];
