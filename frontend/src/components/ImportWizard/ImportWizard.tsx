/**
 * ImportWizard — fluxo em 6 passos (Etapa 9 - Parte 10).
 * Upload → Entidade → Mapeamento → Opções → Processamento → Relatório.
 */

import { useCallback, useState, useEffect } from 'react';
import { Button } from '../Button';
import { UploadStep } from './steps/UploadStep';
import { EntitySelectionStep } from './steps/EntitySelectionStep';
import { FieldMappingStep } from './steps/FieldMappingStep';
import { ImportOptionsStep } from './steps/ImportOptionsStep';
import { ProcessingStep } from './steps/ProcessingStep';
import { ReportStep, downloadReportAsCsv } from './steps/ReportStep';
import {
  INITIAL_OPTIONS,
  type ImportWizardState,
  type FieldMappingRow,
} from './types';
import {
  uploadImportFile,
  mapImport,
  processImport,
  downloadImportTemplate,
  type ImportMappingItem,
} from '../../services/importService';

const STEP_LABELS = [
  'Upload',
  'Entidade',
  'Mapeamento',
  'Opções',
  'Processamento',
  'Relatório',
];

const initialState: ImportWizardState = {
  currentStep: 1,
  file: null,
  fileId: null,
  headers: [],
  previewRows: [],
  entityType: null,
  mappings: [],
  options: INITIAL_OPTIONS,
  processResult: null,
  error: null,
  loading: false,
};

export interface ImportWizardProps {
  onSuccess?: (result: import('../../services/importService').ProcessImportResult) => void;
  onError?: (error: Error) => void;
}

/** Constrói array de mapeamento para a API (columnIndex, fieldName, required). */
function toApiMappings(mappings: FieldMappingRow[]): ImportMappingItem[] {
  return mappings
    .filter((m) => m.fieldName)
    .map((m) => ({
      columnIndex: m.columnIndex,
      fieldName: m.fieldName,
      required: m.required,
    }));
}

/** Constrói fieldMapping (header -> fieldName) para POST /process. */
function toFieldMapping(headers: string[], mappings: FieldMappingRow[]): Record<string, string> {
  const out: Record<string, string> = {};
  mappings.forEach((m) => {
    if (m.fieldName && headers[m.columnIndex] !== undefined) {
      out[headers[m.columnIndex]] = m.fieldName;
    }
  });
  return out;
}

/** Preview client-side: primeiras linhas com chaves = fieldName (para passo 3). */
function buildClientMappedPreview(
  previewRows: unknown[],
  headers: string[],
  mappings: FieldMappingRow[]
): unknown[] {
  return previewRows.map((row) => {
    const obj = row as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    mappings.forEach((m) => {
      if (m.fieldName && headers[m.columnIndex] !== undefined) {
        const key = headers[m.columnIndex];
        out[m.fieldName] = obj[key];
      }
    });
    return out;
  });
}

export function ImportWizard({ onSuccess, onError }: ImportWizardProps) {
  const [state, setState] = useState<ImportWizardState>(initialState);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [mappedPreview, setMappedPreview] = useState<unknown[]>([]);

  const set = useCallback((patch: Partial<ImportWizardState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  useEffect(() => {
    if (state.previewRows && state.headers && state.mappings) {
      setMappedPreview(buildClientMappedPreview(state.previewRows, state.headers, state.mappings));
    }
  }, [state.previewRows, state.headers, state.mappings]);

  const goNext = useCallback(() => {
    set({ error: null });
    if (state.currentStep < 6) {
      set({ currentStep: state.currentStep + 1 });
    }
  }, [state.currentStep, set]);

  const goBack = useCallback(() => {
    set({ error: null });
    if (state.currentStep > 1) {
      set({ currentStep: state.currentStep - 1 });
    }
  }, [state.currentStep, set]);

  const handleFileAccepted = useCallback(
    (file: File, headers: string[], previewRows: unknown[]) => {
      const mappings: FieldMappingRow[] = headers.map((h, i) => ({
        columnHeader: h,
        columnIndex: i,
        fieldName: '',
        required: false,
      }));
      set({
        file,
        headers,
        previewRows,
        mappings,
        error: null,
      });
    },
    [set]
  );

  const handleUploadClear = useCallback(() => {
    set({
      file: null,
      fileId: null,
      headers: [],
      previewRows: [],
      mappings: [],
      entityType: null,
      error: null,
    });
    setMappedPreview([]);
  }, [set]);

  const handleNextFromStep1 = useCallback(async () => {
    if (!state.file) return;
    set({ loading: true, error: null });
    try {
      const res = await uploadImportFile(state.file);
      set({ fileId: res.fileId, loading: false });
      goNext();
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Erro no upload',
      });
    }
  }, [state.file, goNext, set]);

  const handleMappingChange = useCallback(
    (columnIndex: number, fieldName: string, required: boolean) => {
      setState((s) => {
        const next = [...s.mappings];
        const row = next[columnIndex];
        if (row) {
          next[columnIndex] = { ...row, fieldName, required };
        }
        return { ...s, mappings: next };
      });
    },
    []
  );

  const handleNextFromStep3 = useCallback(async () => {
    if (!state.fileId || !state.entityType) return;
    const apiMappings = toApiMappings(state.mappings);
    if (apiMappings.length === 0) return;
    set({ loading: true, error: null });
    try {
      await mapImport(state.fileId, state.entityType, apiMappings, 5);
      set({ loading: false });
      goNext();
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Erro ao obter preview',
      });
    }
  }, [state.fileId, state.entityType, state.mappings, set, goNext]);

  const handleStartProcess = useCallback(async () => {
    if (!state.file || !state.entityType) return;
    set({ loading: true, error: null, currentStep: 5 });
    const fieldMapping = toFieldMapping(state.headers, state.mappings);
    try {
      const result = await processImport(state.file, {
        entityType: state.entityType,
        fieldMapping,
        continueOnError: state.options.continueOnError,
        validateBeforeImport: true,
      });
      set({
        loading: false,
        processResult: result,
        currentStep: 6,
        error: null,
      });
      onSuccess?.(result);
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Erro na importação',
      });
      onError?.(e instanceof Error ? e : new Error('Erro na importação'));
    }
  }, [state.file, state.entityType, state.headers, state.mappings, state.options, set, onSuccess, onError]);

  const handleNewImport = useCallback(() => {
    setState(initialState);
    setTemplateError(null);
  }, []);

  const handleDownloadReport = useCallback(() => {
    if (state.processResult) {
      downloadReportAsCsv(state.processResult);
    }
  }, [state.processResult]);

  const step = state.currentStep;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Assistente de Importação</h2>

      {/* Indicador de passos */}
      <nav className="flex flex-wrap gap-2 mb-6 text-sm">
        {STEP_LABELS.map((label, i) => (
          <span
            key={i}
            className={`px-2 py-1 rounded ${
              i + 1 === step
                ? 'bg-blue-600 text-white'
                : i + 1 < step
                  ? 'bg-gray-200 text-gray-700'
                  : 'text-gray-400'
            }`}
          >
            {i + 1}. {label}
          </span>
        ))}
      </nav>

      {/* Conteúdo do passo atual */}
      {step === 1 && (
        <UploadStep
          file={state.file}
          previewRows={state.previewRows}
          error={state.error ?? null}
          loading={state.loading}
          onFileAccepted={handleFileAccepted}
          onClear={handleUploadClear}
          onParseError={(msg) => set({ error: msg })}
        />
      )}

      {step === 2 && (
        <EntitySelectionStep
          entityType={state.entityType}
          onEntityTypeChange={(v) => set({ entityType: v })}
          onTemplateDownload={(format) => {
            if (!state.entityType) return;
            downloadImportTemplate(state.entityType, format)
              .then(() => setTemplateError(null))
              .catch((e) => setTemplateError(e instanceof Error ? e.message : 'Erro'));
          }}
          templateDownloadError={templateError}
        />
      )}

      {step === 3 && (
        <FieldMappingStep
          headers={state.headers}
          mappings={state.mappings}
          entityType={state.entityType}
          mappedPreview={mappedPreview}
          onMappingChange={handleMappingChange}
        />
      )}

      {step === 4 && (
        <ImportOptionsStep
          options={state.options}
          onOptionsChange={(o) => set({ options: o })}
        />
      )}

      {step === 5 && (
        <ProcessingStep
          message="Processando importação..."
          progressPercent={state.loading ? undefined : 0}
        />
      )}

      {step === 6 && (
        <ReportStep
          result={state.processResult}
          error={state.error}
          onDownloadReport={handleDownloadReport}
          onNewImport={handleNewImport}
        />
      )}

      {/* Navegação: voltar / próximo */}
      {step <= 4 && (
        <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={goBack} disabled={step === 1}>
            Voltar
          </Button>
          {step === 1 && (
            <Button
              variant="primary"
              onClick={handleNextFromStep1}
              disabled={!state.file || state.loading}
            >
              Próximo
            </Button>
          )}
          {step === 2 && (
            <Button
              variant="primary"
              onClick={goNext}
              disabled={!state.entityType}
            >
              Próximo
            </Button>
          )}
          {step === 3 && (
            <Button
              variant="primary"
              onClick={handleNextFromStep3}
              disabled={state.mappings.every((m) => !m.fieldName) || state.loading}
            >
              Próximo
            </Button>
          )}
          {step === 4 && (
            <Button variant="primary" onClick={handleStartProcess} disabled={state.loading}>
              Iniciar importação
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
