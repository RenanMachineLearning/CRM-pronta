/**
 * Tipos do ImportWizard (Etapa 9 - Parte 10).
 * Estado do wizard, mapeamento e resultado da importação.
 */

import type { ProcessImportResult } from '../../services/importService';
import type { EntityType } from './entityFields';

/** Um mapeamento: coluna do arquivo -> campo da entidade + obrigatório */
export interface FieldMappingRow {
  /** Cabeçalho/nome da coluna no arquivo (para exibição) */
  columnHeader: string;
  /** Índice da coluna (0-based) para a API */
  columnIndex: number;
  /** Campo da entidade (ex: firstName, email) */
  fieldName: string;
  /** Se o campo é obrigatório na importação */
  required: boolean;
}

/** Opções de importação (Passo 4) */
export interface ImportOptionsState {
  /** Atualizar registros existentes (quando aplicável no backend) */
  updateExisting: boolean;
  /** Ignorar erros e continuar importando */
  continueOnError: boolean;
}

/** Estado completo do wizard para controle dos passos e dados */
export interface ImportWizardState {
  /** Passo atual (1 a 6) */
  currentStep: number;
  /** Arquivo selecionado no Passo 1 */
  file: File | null;
  /** fileId retornado pelo upload (para chamar POST /:fileId/map) */
  fileId: string | null;
  /** Cabeçalhos do arquivo (para mapeamento) */
  headers: string[];
  /** Preview das primeiras linhas (array de objetos ou arrays) */
  previewRows: unknown[];
  /** Entidade selecionada no Passo 2 (Contact, Company, Lead, Opportunity) */
  entityType: EntityType | null;
  /** Mapeamento por coluna (Passo 3) */
  mappings: FieldMappingRow[];
  /** Opções de importação (Passo 4) */
  options: ImportOptionsState;
  /** Resultado do processamento (Passo 6) */
  processResult: ProcessImportResult | null;
  /** Erro global (upload, map ou process) */
  error: string | null;
  /** Carregando (upload, map ou process) */
  loading: boolean;
}

export const INITIAL_OPTIONS: ImportOptionsState = {
  updateExisting: false,
  continueOnError: true,
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_TYPES = ['.csv', '.xlsx', '.xls'];
